// The catalogue as design-system's view props, built in the server page so
// the client gets plain data. Imports media.ts and the types, never
// ../../catalogue/index.ts, so nothing here can pull the validation along.
import { coverUrl } from "../../catalogue/media.ts";
import type { Catalogue, CatalogueRelease } from "../../catalogue/types.ts";
import type { Release, SocialLink } from "../../design-system/types.ts";

// The cover file the components are given: the largest, which the image
// loader swaps for the smallest that fills each box (image-loader.ts). Not
// the 768: the hero asks for 768, and next/image warns in dev when a
// loader's URL comes back unchanged, taking it for one that ignores width.
const COVER_WIDTH = 1080;

function cover(release: CatalogueRelease): string {
  const { widths, formats } = release.cover;
  if (!widths.includes(COVER_WIDTH) || !formats.includes("webp")) {
    throw new Error(`${release.id}: its cover has no ${COVER_WIDTH} px WebP for the homepage`);
  }
  return coverUrl(release.cover, COVER_WIDTH, "webp");
}

export function homeReleases(catalogue: Catalogue): Release[] {
  return catalogue.releases.map((release) => ({
    id: release.id,
    type: release.type,
    title: release.title,
    cover: cover(release),
    tracks: release.tracks.map((track) => ({
      id: track.id,
      title: track.title,
      kind: track.kind,
      duration: track.snippet.duration,
    })),
    leadTrackId: release.leadTrackId,
    links: release.links,
  }));
}

// The featured release, or else the newest (SPEC.md). The catalogue runs
// newest first, but the dates decide, so a reordered file can't move it.
export function heroRelease(catalogue: Catalogue): CatalogueRelease {
  const featured = catalogue.releases.find((release) => release.featured);
  if (featured) return featured;
  const newest = catalogue.releases.reduce<CatalogueRelease | undefined>(
    (best, release) => (!best || release.date > best.date ? release : best),
    undefined,
  );
  if (!newest) throw new Error("The catalogue has no releases to put in the hero");
  return newest;
}

export const SOCIALS: readonly SocialLink[] = [
  { network: "instagram", handle: "thesamegatsby", url: "https://www.instagram.com/thesamegatsby" },
  { network: "tiktok", handle: "thesamegatsby", url: "https://www.tiktok.com/@thesamegatsby" },
];
