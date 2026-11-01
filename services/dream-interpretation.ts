/**
 * Dream interpretation — calls the `interpret-dream` Supabase Edge
 * Function (which holds the OpenAI key server-side) and returns a
 * structured reading. Falls back to an offline keyword heuristic when
 * the edge function isn't reachable so the feature still works without
 * connectivity (clearly marked `source: 'offline'`).
 *
 * Every interpretation is persisted to `public.dream_entries` for the
 * user's private dream journal.
 */

import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { Logger } from './logger';
import { isAIFeaturesEnabled } from '@/config/ai-features';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface DreamSymbol {
  symbol: string;
  meaning: string;
}

export interface DreamInterpretation {
  symbols: DreamSymbol[];
  mood: string;
  overallMeaning: string;
  guidance: string;
  warning?: string | null;
  opportunity?: string | null;
  source: 'ai' | 'offline';
}

export interface DreamEntry {
  id: string;
  description: string;
  interpretation: DreamInterpretation | null;
  mood: string | null;
  createdAt: string;
}

// ─── Runtime validation ─────────────────────────────────────────────────────

function isString(value: unknown, maxLen = 10_000): value is string {
  return typeof value === 'string' && value.length > 0 && value.length <= maxLen;
}

function coerceInterpretation(raw: unknown): DreamInterpretation | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Record<string, unknown>;

  const symbolsRaw = Array.isArray(r.symbols) ? (r.symbols as unknown[]) : [];
  const symbols: DreamSymbol[] = symbolsRaw
    .map(s => {
      if (!s || typeof s !== 'object') return null;
      const obj = s as Record<string, unknown>;
      if (!isString(obj.symbol, 80) || !isString(obj.meaning, 400)) return null;
      return { symbol: obj.symbol, meaning: obj.meaning };
    })
    .filter((s): s is DreamSymbol => s != null)
    .slice(0, 6);

  if (symbols.length === 0) return null;
  if (!isString(r.mood, 60)) return null;
  if (!isString(r.overallMeaning, 1200)) return null;
  if (!isString(r.guidance, 1000)) return null;

  return {
    symbols,
    mood: r.mood,
    overallMeaning: r.overallMeaning,
    guidance: r.guidance,
    warning: isString(r.warning, 600) ? r.warning : null,
    opportunity: isString(r.opportunity, 600) ? r.opportunity : null,
    source: 'ai',
  };
}

export async function interpretDream(description: string): Promise<DreamInterpretation> {
  const trimmed = description.trim();
  if (!trimmed) throw new Error('Please describe your dream first.');

  // v1: dream journal stays available, but it never calls OpenAI.
  if (!isAIFeaturesEnabled()) {
    return offlineFallback(trimmed);
  }

  if (isSupabaseConfigured()) {
    try {
      const { data, error } = await supabase.functions.invoke('interpret-dream', {
        body: { description: trimmed },
      });
      if (error) throw error;
      const parsed = coerceInterpretation(data);
      if (parsed) return parsed;
      Logger.warn('interpret-dream returned an unexpected shape, falling back to offline');
    } catch (err) {
      Logger.warn('AI dream interpretation failed, using offline fallback', err);
    }
  }

  return offlineFallback(trimmed);
}

// ─── Offline fallback ────────────────────────────────────────────────────────
// Not a real AI, but better than a 500. Keyword-driven.

const KEYWORDS: Record<string, { meaning: string; mood?: string; warning?: string; opportunity?: string }> = {
  water: { meaning: 'Emotions, purification, subconscious mind. Clear water hints at peace; murky water at unresolved feelings.', mood: 'Reflective' },
  snake: { meaning: 'Transformation and hidden fears. Context matters: a calm snake signals healing, an aggressive one a looming conflict.', warning: 'Watch for interpersonal tension that has been brewing in the background.' },
  flying: { meaning: 'Freedom, ambition, and readiness to rise above a current limitation.', mood: 'Expansive', opportunity: 'A new responsibility or stage that raises your public profile is within reach.' },
  teeth: { meaning: 'Anxiety about appearance, communication, or change.', mood: 'Uneasy' },
  death: { meaning: 'The ending of a phase, not a literal prediction. Something is making way for a new chapter.', mood: 'Transitional' },
  money: { meaning: 'Self-worth and approaching opportunity. Losing money signals fear of change rather than actual loss.', opportunity: 'A professional or financial door is about to open; be ready to state your value.' },
  house: { meaning: 'The self; different rooms correspond to different areas of your life and psyche.', mood: 'Introspective' },
  baby: { meaning: 'New beginnings, vulnerability, and the parts of yourself that need nurturing.', mood: 'Tender' },
  fire: { meaning: 'Passion and rapid change. Controlled fire creates, uncontrolled fire consumes.', warning: 'Guard against anger or impulsive decisions in the next few days.' },
  bird: { meaning: 'Freedom and spiritual messages. Notice the species and its behaviour for more detail.', mood: 'Hopeful' },
  mountain: { meaning: 'A meaningful goal or obstacle. Climbing suggests active progress.', mood: 'Determined' },
  falling: { meaning: 'A loss of control or trust. Often triggered by upcoming change.', warning: 'Identify what feels unstable right now and address it directly.' },
};

function offlineFallback(description: string): DreamInterpretation {
  const text = description.toLowerCase();
  const matches = Object.entries(KEYWORDS).filter(([key]) => text.includes(key));
  const chosen = matches.length > 0
    ? matches
    : ([['dream', { meaning: 'A private message from your subconscious asking for attention.' }]] as const);

  const symbols: DreamSymbol[] = chosen.map(([symbol, meta]) => ({
    symbol: symbol.charAt(0).toUpperCase() + symbol.slice(1),
    meaning: meta.meaning,
  }));

  const firstMeta = chosen[0]?.[1] as { mood?: string; warning?: string; opportunity?: string } | undefined;
  const warnings = chosen.map(([, meta]) => (meta as { warning?: string }).warning).filter(Boolean);
  const opportunities = chosen.map(([, meta]) => (meta as { opportunity?: string }).opportunity).filter(Boolean);

  return {
    symbols,
    mood: firstMeta?.mood ?? 'Reflective',
    overallMeaning:
      symbols.length > 1
        ? `Your dream weaves together ${symbols.map(s => s.symbol.toLowerCase()).join(', ')} — themes that are asking to be acknowledged.`
        : 'Your dream points to an inner theme that is asking for a little attention.',
    guidance:
      'Note how you felt during the dream — the emotion is often more revealing than the imagery. Journaling for a few days helps the pattern emerge.',
    warning: warnings.length ? (warnings[0] as string) : null,
    opportunity: opportunities.length ? (opportunities[0] as string) : null,
    source: 'offline',
  };
}

// ─── Persistence ─────────────────────────────────────────────────────────────

export async function saveDreamEntry(
  userId: string,
  description: string,
  interpretation: DreamInterpretation | null,
): Promise<DreamEntry | null> {
  if (!isSupabaseConfigured()) return null;
  try {
    const { data, error } = await supabase
      .from('dream_entries')
      .insert({
        user_id: userId,
        description: description.trim(),
        interpretation,
        mood: interpretation?.mood ?? null,
      })
      .select('*')
      .single();
    if (error) throw error;
    const row = data as {
      id: string;
      description: string;
      interpretation: DreamInterpretation | null;
      mood: string | null;
      created_at: string;
    };
    return {
      id: row.id,
      description: row.description,
      interpretation: row.interpretation,
      mood: row.mood,
      createdAt: row.created_at,
    };
  } catch (err) {
    Logger.error('Failed to save dream entry', err);
    return null;
  }
}

export async function listDreamEntries(userId: string, limit = 20): Promise<DreamEntry[]> {
  if (!isSupabaseConfigured() || !userId) return [];
  try {
    const { data, error } = await supabase
      .from('dream_entries')
      .select('id, description, interpretation, mood, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit);
    if (error) throw error;
    return (data ?? []).map(row => {
      const r = row as {
        id: string;
        description: string;
        interpretation: DreamInterpretation | null;
        mood: string | null;
        created_at: string;
      };
      return {
        id: r.id,
        description: r.description,
        interpretation: r.interpretation,
        mood: r.mood,
        createdAt: r.created_at,
      };
    });
  } catch (err) {
    Logger.error('Failed to list dream entries', err);
    return [];
  }
}
