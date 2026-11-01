/**
 * Support contact configuration.
 *
 * The screens previously hardcoded obviously fake contact details
 * (+91 1234567890, toll-free numbers, WhatsApp numbers) that users could
 * actually dial. Real values must come from the environment; when unset, the
 * UI hides the action instead of offering a dead/fake one.
 *
 * Set in .env / EAS:
 *   EXPO_PUBLIC_SUPPORT_EMAIL=support@yourdomain.com
 *   EXPO_PUBLIC_SUPPORT_PHONE=+918000000000   (E.164, tel: link)
 *   EXPO_PUBLIC_SUPPORT_WHATSAPP=+918000000000
 */
export const SUPPORT_EMAIL = process.env.EXPO_PUBLIC_SUPPORT_EMAIL?.trim() || '';
export const SUPPORT_PHONE = process.env.EXPO_PUBLIC_SUPPORT_PHONE?.trim() || '';
export const SUPPORT_WHATSAPP = process.env.EXPO_PUBLIC_SUPPORT_WHATSAPP?.trim() || '';

export function supportTelHref(): string | null {
  return SUPPORT_PHONE ? `tel:${SUPPORT_PHONE}` : null;
}

export function supportWhatsAppHref(text = 'Hello! I need help with AstroNemi.'): string | null {
  return SUPPORT_WHATSAPP
    ? `https://wa.me/${SUPPORT_WHATSAPP.replace(/[^\d]/g, '')}?text=${encodeURIComponent(text)}`
    : null;
}

export function supportMailHref(subject = 'AstroNemi support'): string | null {
  return SUPPORT_EMAIL ? `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(subject)}` : null;
}
