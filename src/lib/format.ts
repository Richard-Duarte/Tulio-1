/** "2026-07-18" -> "18.07.2026". Deterministic (no Intl), so SSR and hydration always match. */
export function formatSetDate(date: string | null | undefined) {
  const m = date?.match(/^(\d{4})-(\d{2})-(\d{2})/);
  return m ? `${m[3]}.${m[2]}.${m[1]}` : null;
}

/** 3760 -> "1:02:40", 338 -> "5:38". */
export function formatDuration(seconds: number | null | undefined) {
  if (!seconds || seconds <= 0) return null;
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  const mm = h ? String(m).padStart(2, "0") : String(m);
  return `${h ? `${h}:` : ""}${mm}:${String(s).padStart(2, "0")}`;
}
