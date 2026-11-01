-- Migration 050: Consultation billing reconciliation (H-4)
-- debit_consultation_minute now maintains a running total_amount on the
-- consultation row so end_consultation can reconcile to the actually-billed
-- amount instead of wall-time duration. Adds consultation_billing columns
-- needed for the running total.

ALTER TABLE public.consultation_billing
  ADD COLUMN IF NOT EXISTS running_total NUMERIC(12,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS billed_minutes INT NOT NULL DEFAULT 0;

DROP FUNCTION IF EXISTS public.debit_consultation_minute(UUID, INTEGER, TEXT);
CREATE OR REPLACE FUNCTION public.debit_consultation_minute(
  p_consultation_id UUID,
  p_billing_minute  INT,
  p_source          TEXT DEFAULT 'consultation'
) RETURNS TABLE(
  success BOOLEAN,
  message TEXT,
  new_balance NUMERIC,
  already_processed BOOLEAN,
  transaction_id UUID,
  billed_total NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller CONSTANT UUID := auth.uid();
  v_con RECORD;
  v_price NUMERIC(12,2);
  v_tx JSONB;
  v_running_total NUMERIC(12,2);
  v_new_balance NUMERIC;
  v_tx_id UUID;
  v_existing_total NUMERIC(12,2);
BEGIN
  IF v_caller IS NULL THEN
    success := false; message := 'Unauthorized'; new_balance := NULL;
    already_processed := false; transaction_id := NULL; billed_total := NULL;
    RETURN NEXT; RETURN;
  END IF;

  SELECT id, user_id, astrologer_id, price, status, start_time, duration_minutes
    INTO v_con
    FROM public.consultations
    WHERE id = p_consultation_id
    FOR UPDATE;
  IF v_con.id IS NULL THEN
    success := false; message := 'Consultation not found'; new_balance := NULL;
    already_processed := false; transaction_id := NULL; billed_total := NULL;
    RETURN NEXT; RETURN;
  END IF;
  IF v_con.user_id <> v_caller AND NOT public.is_admin(v_caller) THEN
    success := false; message := 'Forbidden'; new_balance := NULL;
    already_processed := false; transaction_id := NULL; billed_total := NULL;
    RETURN NEXT; RETURN;
  END IF;

  SELECT running_total INTO v_existing_total
    FROM public.consultation_billing
    WHERE consultation_id = p_consultation_id
      AND billing_minute = p_billing_minute;
  IF v_existing_total IS NOT NULL THEN
    SELECT COALESCE(MAX(running_total), 0) INTO v_running_total
      FROM public.consultation_billing
      WHERE consultation_id = p_consultation_id;
    success := true; message := 'Already billed'; new_balance := NULL;
    already_processed := true; transaction_id := NULL; billed_total := v_running_total;
    RETURN NEXT; RETURN;
  END IF;

  v_price := COALESCE(v_con.price, 0);
  IF v_price <= 0 THEN
    success := false; message := 'Consultation has no price'; new_balance := NULL;
    already_processed := false; transaction_id := NULL; billed_total := NULL;
    RETURN NEXT; RETURN;
  END IF;

  SELECT COALESCE(MAX(running_total), 0) INTO v_running_total
    FROM public.consultation_billing
    WHERE consultation_id = p_consultation_id;
  v_running_total := v_running_total + v_price;

  INSERT INTO public.consultation_billing
    (consultation_id, billing_minute, amount, running_total, billed_minutes)
    VALUES (
      p_consultation_id,
      p_billing_minute,
      v_price,
      v_running_total,
      (SELECT COUNT(*) FROM public.consultation_billing WHERE consultation_id = p_consultation_id) + 1
    );

  SELECT d.success, d.new_balance, d.transaction_id, d.error
    INTO v_tx
    FROM public.debit_wallet(
      p_user_id := v_con.user_id,
      p_amount  := v_price,
      p_reason  := 'consultation_minute_' || p_billing_minute::TEXT,
      p_reference_id := p_consultation_id::TEXT,
      p_reference_type := 'consultation_minute'
    ) AS d(success, new_balance, transaction_id, error);

  IF (v_tx->>'success')::BOOLEAN IS DISTINCT FROM TRUE THEN
    DELETE FROM public.consultation_billing
      WHERE consultation_id = p_consultation_id AND billing_minute = p_billing_minute;
    success := false; message := COALESCE(v_tx->>'error','debit_failed');
    new_balance := NULL; already_processed := false;
    transaction_id := NULL; billed_total := NULL;
    RETURN NEXT; RETURN;
  END IF;

  v_new_balance := (v_tx->>'new_balance')::NUMERIC;
  v_tx_id       := (v_tx->>'transaction_id')::UUID;

  UPDATE public.consultations
    SET total_amount = v_running_total,
        updated_at = now()
    WHERE id = p_consultation_id;

  success := true; message := 'Billed';
  new_balance := v_new_balance; already_processed := false;
  transaction_id := v_tx_id; billed_total := v_running_total;
  RETURN NEXT;
END;
$$;