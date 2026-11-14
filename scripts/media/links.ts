import { PLATFORM_IDS } from "../../src/catalogue/types.ts";
import type { PlatformId } from "../../src/catalogue/types.ts";

const isTracking = (param: string) => param === "si" || param.startsWith("utm_");

// Strips the tracking parameters share buttons add. A YouTube video link
// keeps only its video id: list and index tie it to whichever playlist it was
// shared from. The query is filtered as written rather than re-encoded, so
// SoundCloud's in=artist/sets/x keeps its slashes.
export function cleanLink(raw: string): string {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw new Error(`"${raw}" isn't a URL`);
  }
  const youtubeVideo = url.hostname === "www.youtube.com" && url.pathname === "/watch";
  const keep = (pair: string) => {
    const name = decodeURIComponent(pair.split("=")[0]);
    return youtubeVideo ? name === "v" : !isTracking(name);
  };
  const query = url.search.slice(1).split("&").filter((pair) => pair !== "" && keep(pair)).join("&");
  return `${url.origin}${url.pathname}${query ? `?${query}` : ""}${url.hash}`;
}

// --spotify, --apple-music and so on name their platform directly.
export function platformFromFlag(flag: string): PlatformId | undefined {
  const name = flag.startsWith("--") ? flag.slice(2) : undefined;
  return PLATFORM_IDS.find((id) => id === name);
}
