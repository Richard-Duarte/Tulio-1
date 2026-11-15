import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { test } from "node:test";
import {
  groupPresskitByParty,
  isPresskitCatalogItem,
  isPresskitStudioItem,
  PRESSKIT_STUDIO_PARTY_ID,
  sortMediaNewest,
  sortPresskitMediaNewest,
} from "./gallery-groups.ts";

const src = join(dirname(fileURLToPath(import.meta.url)), "..");
const read = (path: string) => readFileSync(join(src, path), "utf8");

test("presskit loads tulio_media rows flagged presskit_enabled", () => {
  const body = read("lib/presskit.functions.ts");
  assert.match(body, /\.eq\("presskit_enabled", true\)/);
  assert.match(body, /isPresskitCatalogItem/);
  assert.doesNotMatch(body, /STUDIO_PHOTOS/);
});

test("presskit catalog ignores galeria-only and stale studio flags", () => {
  assert.equal(isPresskitCatalogItem({ presskit_enabled: true }), true);
  assert.equal(isPresskitCatalogItem({ presskit_enabled: false }), false);
  assert.equal(isPresskitCatalogItem({ presskit_enabled: null }), false);
  assert.equal(isPresskitStudioItem({ presskit_enabled: false, presskit_studio_enabled: true }), false);
  assert.equal(isPresskitStudioItem({ presskit_enabled: true, presskit_studio_enabled: true }), true);
});

test("Estúdio section is first and sorted newest first", () => {
  const parties = [{ id: "festa", name: "Festa", happened_at: "2025-01-01" }];
  const items = [
    { id: "a", party_id: "festa", captured_at: "2024-06-01", presskit_enabled: true, presskit_studio_enabled: false },
    { id: "b", party_id: "festa", captured_at: "2025-06-01", presskit_enabled: true, presskit_studio_enabled: true },
    { id: "c", party_id: "festa", captured_at: "2025-01-01", presskit_enabled: true, presskit_studio_enabled: true },
    { id: "gal", party_id: "festa", captured_at: "2099-01-01", presskit_enabled: false, presskit_studio_enabled: true },
  ];
  const groups = groupPresskitByParty(parties, items, "Estúdio", "Outros");
  assert.equal(groups[0]!.party.id, PRESSKIT_STUDIO_PARTY_ID);
  assert.deepEqual(
    groups[0]!.photos.map((p) => p.id),
    ["b", "c"],
  );
  assert.equal(groups[1]!.photos[0]!.id, "a");
  assert.equal(groups[1]!.photos.some((p) => p.id === "gal"), false);
});

test("sortPresskitMediaNewest uses festa date when comparing different festas", () => {
  const parties = [
    { id: "nova", name: "Nova", happened_at: "2025-08-01" },
    { id: "velha", name: "Velha", happened_at: "2020-01-01" },
  ];
  const sorted = sortPresskitMediaNewest(parties, [
    { id: "velha-shot", party_id: "velha", captured_at: "2099-01-01" },
    { id: "nova-shot", party_id: "nova", captured_at: "2010-01-01" },
  ]);
  assert.deepEqual(sorted.map((x) => x.id), ["nova-shot", "velha-shot"]);
});

test("sortPresskitMediaNewest breaks ties on the same festa with captured_at", () => {
  const parties = [{ id: "festa", name: "Festa", happened_at: "2025-08-01" }];
  const sorted = sortPresskitMediaNewest(parties, [
    { id: "old-shot", party_id: "festa", captured_at: "2020-01-01" },
    { id: "new-shot", party_id: "festa", captured_at: "2025-07-01" },
  ]);
  assert.deepEqual(sorted.map((x) => x.id), ["new-shot", "old-shot"]);
});

test("sortMediaNewest orders by captured_at", () => {
  const sorted = sortMediaNewest([
    { id: "1", captured_at: "2020-01-01" },
    { id: "2", captured_at: "2025-01-01" },
  ]);
  assert.deepEqual(sorted.map((x) => x.id), ["2", "1"]);
});

test("admin always shows Presskit and Estúdio toggles on media cards", () => {
  const library = read("components/jula/admin/MediaLibrary.tsx");
  assert.match(library, /presskit_studio_enabled/);
  assert.match(library, /Estúdio/);
  assert.doesNotMatch(library, /item\.presskit_enabled \? \(/);
});

test("admin has dedicated Presskit tab", () => {
  const admin = read("routes/_authenticated/admin.tsx");
  assert.match(admin, /TabsTrigger value="presskit"/);
  assert.match(admin, /PresskitAdminPanel/);
  assert.doesNotMatch(admin, /TabsTrigger value="tracks"/);
});

test("presskit page release title matches rider size", () => {
  const page = read("routes/presskit.tsx");
  assert.match(page, /t\("release"\)/);
  assert.match(page, /downloadLogo/);
  assert.match(page, /downloadPresskitLogosZip/);
  assert.match(page, /Bookings ·/);
  const releaseIdx = page.indexOf("release_body");
  const bookingsIdx = page.indexOf("Bookings ·");
  const riderIdx = page.indexOf('t("technicalRider")');
  assert.ok(releaseIdx >= 0 && bookingsIdx > releaseIdx && riderIdx > bookingsIdx);
});

test("presskit admin edits booking email above rider", () => {
  const panel = read("components/jula/admin/PresskitAdminPanel.tsx");
  assert.match(panel, /Bookings/);
  assert.match(panel, /booking_email/);
  const bookingsIdx = panel.indexOf("Bookings");
  const riderIdx = panel.indexOf("Rider técnico");
  assert.ok(bookingsIdx >= 0 && riderIdx > bookingsIdx);
  assert.match(panel, /multiple/);
});

test("MediaGrid filters to presskit-flagged items when grouping is presskit", () => {
  const grid = read("components/jula/MediaGrid.tsx");
  assert.match(grid, /isPresskitCatalogItem/);
});