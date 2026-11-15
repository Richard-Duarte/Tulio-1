export type GalleryParty = { id: string; name: string; happened_at: string | null };
type PartyPhoto = { party_id?: string | null; captured_at?: string | null };

export const OTHER_PARTY_ID = "__other";
/** Presskit section for items flagged Estúdio (not a row in `parties`). */
export const PRESSKIT_STUDIO_PARTY_ID = "__presskit_studio__";

type DatedMedia = { captured_at?: string | null; sort_order?: number };

export type PresskitFlags = {
  presskit_enabled?: boolean | null;
  presskit_studio_enabled?: boolean | null;
};

/** Public presskit and admin: only rows explicitly flagged for presskit. */
export function isPresskitCatalogItem(item: PresskitFlags): boolean {
  return item.presskit_enabled === true;
}

/** Estúdio block: presskit on and studio flag on (stale studio flags without presskit are ignored). */
export function isPresskitStudioItem(item: PresskitFlags): boolean {
  return isPresskitCatalogItem(item) && item.presskit_studio_enabled === true;
}

function compareDateDesc(da: string, db: string) {
  if (da !== db) {
    if (!da) return 1;
    if (!db) return -1;
    return da < db ? 1 : -1;
  }
  return 0;
}

/** Newest capture date first; ties break on sort_order. */
export function sortMediaNewest<P extends DatedMedia>(items: P[]): P[] {
  return [...items].sort((a, b) => {
    const byDate = compareDateDesc(a.captured_at ?? "", b.captured_at ?? "");
    if (byDate !== 0) return byDate;
    return (b.sort_order ?? 0) - (a.sort_order ?? 0);
  });
}

/**
 * Presskit ordering: when the item has a festa, use that party's date (saved `happened_at` or newest
 * capture in the group); otherwise use `captured_at`.
 */
export function sortPresskitMediaNewest<P extends PartyPhoto & DatedMedia>(
  parties: GalleryParty[],
  items: P[],
): P[] {
  const { parties: linked, partyIdOf } = linkParties(parties, items);
  const happenedAt = new Map(linked.map((party) => [party.id, party.happened_at]));
  const sortKey = (item: P) => {
    const partyId = partyIdOf(item.party_id);
    if (partyId) {
      const festaDate = happenedAt.get(partyId);
      if (festaDate) return festaDate;
    }
    return item.captured_at ?? "";
  };
  return [...items].sort((a, b) => {
    const byDate = compareDateDesc(sortKey(a), sortKey(b));
    if (byDate !== 0) return byDate;
    const byCapture = compareDateDesc(a.captured_at ?? "", b.captured_at ?? "");
    if (byCapture !== 0) return byCapture;
    return (b.sort_order ?? 0) - (a.sort_order ?? 0);
  });
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Parties created in the panel live in the `parties` table and have uuid ids. */
export function isSavedPartyId(id: string) {
  return UUID.test(id);
}

export function partySlug(name: string) {
  return name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

/** How older panel builds slugged a typed party name (accented letters were dropped, not folded). */
function legacySlug(name: string) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function nameFromSlug(slug: string) {
  return slug
    .split("-")
    .filter(Boolean)
    .map((word) => word[0]!.toUpperCase() + word.slice(1))
    .join(" ");
}

/**
 * Every party that has photos or was saved, newest first. A photo whose party_id is a slug of a
 * saved party's name belongs to that party; any other slug becomes its own party named after it.
 * A party without a date takes the newest date among its photos.
 */
export function linkParties<P extends PartyPhoto>(parties: GalleryParty[], photos: P[]) {
  const byId = new Map(parties.map((party) => [party.id, party]));
  const bySlug = new Map<string, string>();
  for (const party of parties) {
    for (const slug of [partySlug(party.name), legacySlug(party.name)]) {
      if (slug && !bySlug.has(slug)) bySlug.set(slug, party.id);
    }
  }
  const partyIdOf = (id: string | null | undefined): string | null => {
    if (!id) return null;
    if (byId.has(id)) return id;
    const linked = bySlug.get(id);
    if (linked) return linked;
    // A deleted saved party: its photos have no party any more.
    return isSavedPartyId(id) ? null : id;
  };

  const list = [...parties];
  const newest = new Map<string, string>();
  for (const photo of photos) {
    const id = partyIdOf(photo.party_id);
    if (!id) continue;
    if (!byId.has(id)) {
      const party = { id, name: nameFromSlug(id), happened_at: null };
      byId.set(id, party);
      list.push(party);
    }
    const date = photo.captured_at;
    if (date && date > (newest.get(id) ?? "")) newest.set(id, date);
  }

  const dated = list.map((party) => ({
    ...party,
    happened_at: party.happened_at || newest.get(party.id) || null,
  }));
  dated.sort((a, b) => {
    if (a.happened_at === b.happened_at) return 0;
    if (!a.happened_at) return 1;
    if (!b.happened_at) return -1;
    return a.happened_at < b.happened_at ? 1 : -1;
  });
  return { parties: dated, partyIdOf };
}

/** Festas tab: saved rows plus slug groups that still have photos (one list, newest first). */
export function partiesListedInAdmin(
  linked: GalleryParty[],
  savedIds: ReadonlySet<string>,
  photoCount: (partyId: string) => number,
) {
  return linked.filter((p) => savedIds.has(p.id) || photoCount(p.id) > 0);
}

/** Gallery sections: one per party (newest first), then the photos with no party. */
export function groupPhotosByParty<P extends PartyPhoto>(
  parties: GalleryParty[],
  photos: P[],
  otherName: string,
) {
  const { parties: list, partyIdOf } = linkParties(parties, photos);
  const groups = list
    .map((party) => ({ party, photos: photos.filter((p) => partyIdOf(p.party_id) === party.id) }))
    .filter((group) => group.photos.length > 0);
  const loose = photos.filter((p) => !partyIdOf(p.party_id));
  if (loose.length > 0) {
    groups.push({
      party: { id: OTHER_PARTY_ID, name: otherName, happened_at: null },
      photos: loose,
    });
  }
  return groups;
}

/** Presskit: Estúdio block first, then festa groups (newest first). Studio items never duplicate under a festa. */
export function groupPresskitByParty<
  P extends PartyPhoto & PresskitFlags & { sort_order?: number },
>(parties: GalleryParty[], items: P[], studioTitle: string, otherName: string) {
  const catalog = items.filter(isPresskitCatalogItem);
  const studioItems = sortPresskitMediaNewest(
    parties,
    catalog.filter(isPresskitStudioItem),
  );
  const rest = catalog.filter((i) => !isPresskitStudioItem(i));
  const groups: { party: GalleryParty; photos: P[] }[] = [];
  if (studioItems.length > 0) {
    groups.push({
      party: { id: PRESSKIT_STUDIO_PARTY_ID, name: studioTitle, happened_at: null },
      photos: studioItems,
    });
  }
  for (const group of groupPhotosByParty(parties, rest, otherName)) {
    groups.push({ party: group.party, photos: sortPresskitMediaNewest(parties, group.photos) });
  }
  return groups;
}
