/**
 * The player always opens on the most recently uploaded set: the row with the newest
 * `created_at` (set by the database when the set is added in the admin; editing a set never
 * changes it). That set goes first and the rest keep the order they came in.
 */
export function latestUploadFirst<T extends { id: string; created_at: string }>(rows: T[]): T[] {
  if (rows.length < 2) return rows.slice();
  let latest = 0;
  for (let i = 1; i < rows.length; i++) {
    const a = Date.parse(rows[i]!.created_at);
    const b = Date.parse(rows[latest]!.created_at);
    if (a > b || (a === b && rows[i]!.id > rows[latest]!.id)) latest = i;
  }
  return [rows[latest]!, ...rows.slice(0, latest), ...rows.slice(latest + 1)];
}

/**
 * Next track after `index`. With shuffle on, a random OTHER track; the first track is still
 * the latest upload (shuffle only applies to what follows it).
 */
export function nextIndex(index: number, length: number, shuffle: boolean, random = Math.random) {
  if (length <= 1) return 0;
  return shuffle
    ? (index + 1 + Math.floor(random() * (length - 1))) % length
    : (index + 1) % length;
}
