import catalog from "./site-photos.json";
import videoCatalog from "./site-videos.json";

export type SiteParty = {
  id: string;
  name: string;
  happened_at: string;
  sort_order: number;
};

export type SitePhoto = {
  id: string;
  kind: "image";
  title: string;
  public_url: string;
  poster_url: null;
  alt_text: string;
  downloadable: boolean;
  presskit_enabled: boolean;
  party_id: string;
  sort_order: number;
  captured_at: string;
  homepage: boolean;
  homepage_order: number;
};

const data = catalog as {
  parties: SiteParty[];
  photos: SitePhoto[];
};

/** Photos from the Drive sets (n26, Tulio Syncro, 19.07.2026). The gallery and section 2 read this list. */
export const siteParties: SiteParty[] = data.parties;
export const sitePhotos: SitePhoto[] = data.photos;

export type SiteVideo = {
  id: string;
  kind: "video";
  title: string;
  public_url: string;
  poster_url: string;
  alt_text: string;
  downloadable: boolean;
  presskit_enabled: boolean;
  party_id: string | null;
  sort_order: number;
};

/** Vertical clips for the gallery videos tab and the section 2 triangle. */
export const siteVideos: SiteVideo[] = (videoCatalog as { videos: SiteVideo[] }).videos;

/** Section 2 triangle: a mix of the gallery, capped so the carousel does not load every file at once. */
export function carouselPhotos() {
  return sitePhotos
    .filter((photo) => photo.homepage)
    .sort((a, b) => a.homepage_order - b.homepage_order);
}
