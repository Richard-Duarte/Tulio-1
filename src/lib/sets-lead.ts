/** Blank line after the first sentence when CMS copy is a single paragraph. */
export function formatSetsLead(description: string): string {
  const t = description.trim();
  if (t.includes("\n")) return t;
  const m = t.match(/^(.+?\.)\s+(.+)$/s);
  if (!m) return t;
  return `${m[1]}\n\n${m[2]}`;
}