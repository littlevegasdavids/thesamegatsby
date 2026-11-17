// media.ts and the types, never ../catalogue/index.ts: its validation would
// ship to the browser with anything that imported it.
import { coverUrl, snippetUrl } from "../catalogue/media.ts";
import type { Catalogue } from "../catalogue/types.ts";

// Lock screens draw the cover small. 1080 would only cost a phone more data.
export const ARTWORK_WIDTHS = [192, 384, 768] as const;

// The shape of Media Session's MediaImage, kept as plain data so a server
// component can pass it to the client as props.
export type Artwork = { src: string; sizes: string; type: string };

export type EngineTrack = {
  id: string;
  src: string;
  title: string;
  album: string;
  artwork: readonly Artwork[];
  duration: number;
};

export function tracksFrom(catalogue: Catalogue): EngineTrack[] {
  return catalogue.releases.flatMap((release) => {
    const artwork = release.cover.formats.includes("webp")
      ? ARTWORK_WIDTHS.filter((width) => release.cover.widths.includes(width)).map((width) => ({
          src: coverUrl(release.cover, width, "webp"),
          sizes: `${width}x${width}`,
          type: "image/webp",
        }))
      : [];
    return release.tracks.map((track) => ({
      id: track.id,
      src: snippetUrl(track.snippet),
      title: track.title,
      album: release.title,
      artwork,
      duration: track.snippet.duration,
    }));
  });
}
