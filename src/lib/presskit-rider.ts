export const DEFAULT_PRESSKIT_RIDER: string[][] = [
  ["03 CDJ 3000", "CDJ 2000 NEXUS 2"],
  ["01 XONE 92", "DJ MIXER DJM V10", "DJM A9", "DJM 900 NEXUS 2"],
];

export function parsePresskitRider(raw: unknown): string[][] {
  if (!Array.isArray(raw)) return DEFAULT_PRESSKIT_RIDER;
  const rows = raw
    .map((line) => (Array.isArray(line) ? line.map(String).map((s) => s.trim()).filter(Boolean) : []))
    .filter((line) => line.length > 0);
  return rows.length > 0 ? rows : DEFAULT_PRESSKIT_RIDER;
}

/** One line per equipment row; separate interchangeable options with ` | `. */
export function riderLinesFromText(text: string): string[][] {
  return text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => line.split("|").map((part) => part.trim()).filter(Boolean))
    .filter((row) => row.length > 0);
}

export function riderTextFromLines(lines: string[][]): string {
  return lines.map((row) => row.join(" | ")).join("\n");
}