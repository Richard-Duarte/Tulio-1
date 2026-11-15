type OrderableSet = {
  id: string;
  played_at?: string | null;
  set_date?: string | null;
  created_at?: string;
};

function playedAtMs(row: OrderableSet, dateKey: "played_at" | "set_date"): number {
  const raw = dateKey === "played_at" ? row.played_at : row.set_date;
  if (!raw?.trim()) return 0;
  const iso = /^\d{4}-\d{2}-\d{2}$/.test(raw.trim()) ? `${raw.trim()}T12:00:00Z` : raw.trim();
  const t = Date.parse(iso);
  return Number.isFinite(t) ? t : 0;
}

/** Newest set date first (null dates last), then newest upload. */
export function sortSetsNewestFirst<T extends OrderableSet>(
  rows: T[],
  dateKey: "played_at" | "set_date" = "played_at",
): T[] {
  return rows.slice().sort((a, b) => {
    const da = playedAtMs(a, dateKey);
    const db = playedAtMs(b, dateKey);
    const aDated = da > 0;
    const bDated = db > 0;
    if (aDated && !bDated) return -1;
    if (!aDated && bDated) return 1;
    if (db !== da) return db - da;
    const ca = Date.parse(a.created_at ?? "") || 0;
    const cb = Date.parse(b.created_at ?? "") || 0;
    if (cb !== ca) return cb - ca;
    return b.id.localeCompare(a.id);
  });
}

/** Index in the current queue/list of the set with the newest `played_at` (ties: newest upload). */
export function indexOfNewestSet<T extends OrderableSet>(
  rows: T[],
  dateKey: "played_at" | "set_date" = "played_at",
): number {
  if (rows.length === 0) return 0;
  const newestId = sortSetsNewestFirst(rows, dateKey)[0]!.id;
  const idx = rows.findIndex((r) => r.id === newestId);
  return idx >= 0 ? idx : 0;
}

export function sortOrderForNewSet<T extends OrderableSet>(
  items: T[],
  date: string | null,
  dateKey: "played_at" | "set_date" = "played_at",
): number {
  const probe = { id: "__new__", created_at: new Date().toISOString(), [dateKey]: date } as T;
  const merged = [...items, probe];
  const sorted = sortSetsNewestFirst(merged, dateKey);
  return sorted.findIndex((r) => r.id === "__new__");
}

export function indexOfNewestPlayerTrack(
  tracks: { id: string; playedAt: string | null }[],
): number {
  return indexOfNewestSet(
    tracks.map((t) => ({ id: t.id, played_at: t.playedAt })),
    "played_at",
  );
}