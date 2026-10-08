// DEV-ONLY sample data (clearly fake) for local visual testing, enabled with
// UPCOMING_DATES_MOCK=1 in `vite dev`. Never used in production builds.
import type { UpcomingDate } from "@/lib/upcoming-dates.functions";

function addDays(isoDate: string, days: number) {
  const d = new Date(`${isoDate}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export function mockUpcomingDates(today: string): UpcomingDate[] {
  const img = (seed: string) => `https://picsum.photos/seed/${seed}/760/880`;
  return [
    ["Exemplo Fictício — Club Night", 6, "23:00", "Clube Exemplo", "São Paulo", img("jula-a")],
    ["Teste Open Air (fake)", 13, "16:00", null, "Rio de Janeiro", img("jula-b")],
    ["Sample Festival — Placeholder", 27, null, "Palco Teste", "Belo Horizonte", null],
    ["Demo Warehouse Session", 41, "22:00", "Galpão Demo", "Porto Alegre", img("jula-c")],
    ["Evento Mock Sunset", 58, "17:30", null, null, img("jula-d")],
  ].map(([name, offset, time, venue, city, image], i) => ({
    id: `00000000-0000-4000-8000-00000000000${i}`,
    name: name as string,
    event_date: addDays(today, offset as number),
    event_time: time as string | null,
    venue: venue as string | null,
    city: city as string | null,
    ticket_url: "https://example.com/ingressos",
    description: null,
    image: image as string | null,
  }));
}
