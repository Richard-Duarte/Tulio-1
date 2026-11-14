import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { test } from "node:test";
import {
  groupPhotosByParty,
  isSavedPartyId,
  linkParties,
  partiesListedInAdmin,
  partySlug,
} from "./gallery-groups.ts";

const src = join(dirname(fileURLToPath(import.meta.url)), "..");
const read = (path: string) => readFileSync(join(src, path), "utf8");

const staticParties = [
  { id: "tulio-2026", name: "Tulio", happened_at: "2026-07-19" },
  { id: "n26", name: "n26", happened_at: "2022-07-06" },
  { id: "syncro", name: "Tulio Syncro", happened_at: "2024-01-05" },
];
const saved = {
  id: "0b8a3f4e-8c1d-4f7a-9e2b-1c3d5e7f9a0b",
  name: "Universo Paralello 2024 - Pista Sinkrö",
  happened_at: "2024-12-30",
};

test("groups go newest first, whatever order the parties were added in", () => {
  const photos = [
    { id: "a", party_id: "n26", captured_at: "2022-07-06" },
    { id: "b", party_id: "syncro", captured_at: "2024-01-05" },
    { id: "c", party_id: "tulio-2026", captured_at: "2026-07-19" },
    { id: "d", party_id: saved.id, captured_at: null },
  ];
  const groups = groupPhotosByParty([...staticParties, saved], photos, "Outros registros");
  assert.deepEqual(
    groups.map((g) => g.party.id),
    ["tulio-2026", saved.id, "syncro", "n26"],
  );
});

test("a photo uploaded under a typed party name joins that saved party, not Outros registros", () => {
  // Older panel builds stored a slug of the typed name instead of creating the party.
  const photos = [
    { id: "x", party_id: "universo-paralello-2024-pista-sinkro", captured_at: null },
    { id: "y", party_id: "universo-paralello-2024-pista-sinkr", captured_at: null },
  ];
  const groups = groupPhotosByParty([...staticParties, saved], photos, "Outros registros");
  assert.equal(groups.length, 1);
  assert.equal(groups[0]!.party.id, saved.id);
  assert.equal(groups[0]!.party.happened_at, "2024-12-30");
  assert.deepEqual(
    groups[0]!.photos.map((p) => p.id),
    ["x", "y"],
  );
});

test("an unknown slug gets its own named group dated by its newest photo", () => {
  const photos = [
    { id: "o", party_id: "syncro", captured_at: "2024-01-05" },
    { id: "n1", party_id: "festa-nova", captured_at: "2025-03-01" },
    { id: "n2", party_id: "festa-nova", captured_at: "2025-03-02" },
  ];
  const groups = groupPhotosByParty(staticParties, photos, "Outros registros");
  assert.deepEqual(
    groups.map((g) => g.party.name),
    ["Festa Nova", "Tulio Syncro"],
  );
  assert.equal(groups[0]!.party.happened_at, "2025-03-02");
});

test("only photos without a party land in Outros registros, and it comes last", () => {
  const photos = [
    { id: "loose", party_id: null, captured_at: "2030-01-01" },
    { id: "gone", party_id: "9d3c1b2a-0000-4000-8000-000000000000", captured_at: null },
    { id: "kept", party_id: "n26", captured_at: null },
  ];
  const groups = groupPhotosByParty(staticParties, photos, "Outros registros");
  assert.deepEqual(
    groups.map((g) => g.party.id),
    ["n26", "__other"],
  );
  assert.deepEqual(
    groups[1]!.photos.map((p) => p.id),
    ["loose", "gone"],
  );
});

test("a party without a date takes the newest date of its photos", () => {
  const undated = {
    id: "1f2e3d4c-5b6a-4978-8a9b-0c1d2e3f4a5b",
    name: "Sem data",
    happened_at: null,
  };
  const { parties } = linkParties(
    [undated],
    [
      { party_id: undated.id, captured_at: "2025-05-01" },
      { party_id: undated.id, captured_at: "2025-05-03" },
    ],
  );
  assert.equal(parties[0]!.happened_at, "2025-05-03");
});

test("slugs drop accents; only uuid ids are saved parties", () => {
  assert.equal(partySlug("Pista Sinkrö"), "pista-sinkro");
  assert.equal(isSavedPartyId(saved.id), true);
  assert.equal(isSavedPartyId("syncro"), false);
});

test("admin Festas lists saved parties and slug groups with photos together", () => {
  const { parties: linked } = linkParties(
    [saved],
    [
      { party_id: saved.id, captured_at: "2025-01-01" },
      { party_id: "syncro", captured_at: "2024-01-01" },
    ],
  );
  const savedIds = new Set([saved.id]);
  const count = (id: string) => (id === saved.id ? 1 : id === "syncro" ? 2 : 0);
  const listed = partiesListedInAdmin(linked, savedIds, count);
  assert.equal(listed.length, 2);
  assert.equal(listed.some((p) => p.id === "syncro"), true);
  const admin = read("routes/_authenticated/admin.tsx");
  assert.doesNotMatch(admin, /Grupos do acervo/);
  assert.doesNotMatch(admin, /id \{p\.id\}/);
});

test("presskit page groups with Estúdio first", () => {
  const grid = read("components/jula/MediaGrid.tsx");
  assert.match(grid, /groupPresskitByParty/);
  const page = read("routes/presskit.tsx");
  assert.match(page, /grouping="presskit"/);
});

test("gallery videos tab groups by party like photos", () => {
  const grid = read("components/jula/MediaGrid.tsx");
  assert.match(grid, /const videoGroups = groupFor\(videos\)/);
  assert.match(grid, /<VideoWall groups=\{videoGroups\}/);
  assert.doesNotMatch(grid, /<VideoWall videos=/);
});

test("media Festa select lists the same parties as the Festas tab", () => {
  const library = read("components/jula/admin/MediaLibrary.tsx");
  assert.match(library, /partiesListedInAdmin/);
  assert.match(library, /partyOptions\.map/);
});

test("the Tulio panel saves a new party instead of only slugging the name", () => {
  const library = read("components/jula/admin/MediaLibrary.tsx");
  assert.doesNotMatch(library, /partyName\.toLowerCase\(\)\.replace/);
  assert.match(library, /table: "parties"/);
  assert.match(read("components/jula/MediaGrid.tsx"), /groupPhotosByParty\(/);
  assert.match(read("lib/public.functions.ts"), /from\("parties"\)/);
});
