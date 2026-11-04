import type { PlatformId, StreamLink } from "./types.ts";

// Five main platforms with equal weight, in a fixed order, and three one tap
// away under "More" (SPEC.md). Five fit a 360 px bar at about 62 px each;
// eight wouldn't.
export const MAIN_PLATFORMS = [
  "spotify",
  "apple-music",
  "youtube-music",
  "soundcloud",
  "bandcamp",
] as const satisfies readonly PlatformId[];

export const MORE_PLATFORMS = ["amazon-music", "deezer", "tidal"] as const satisfies readonly PlatformId[];

// short is what the 360 px bar can fit under an icon, as the canvas
// shortens them.
export const PLATFORMS: Record<PlatformId, { label: string; short: string }> = {
  spotify: { label: "Spotify", short: "Spotify" },
  "apple-music": { label: "Apple Music", short: "Apple Music" },
  "youtube-music": { label: "YouTube Music", short: "YouTube" },
  soundcloud: { label: "SoundCloud", short: "SoundCloud" },
  bandcamp: { label: "Bandcamp", short: "Bandcamp" },
  "amazon-music": { label: "Amazon Music", short: "Amazon" },
  deezer: { label: "Deezer", short: "Deezer" },
  tidal: { label: "Tidal", short: "Tidal" },
};

// A release's links in the fixed order, split into the main five and the
// extras. A platform the release isn't on is left out rather than shown
// disabled. If one is listed twice, the first link wins.
export function splitLinks(links: readonly StreamLink[]): { main: StreamLink[]; more: StreamLink[] } {
  const byPlatform = new Map<PlatformId, StreamLink>();
  for (const link of links) if (!byPlatform.has(link.platform)) byPlatform.set(link.platform, link);

  const pick = (ids: readonly PlatformId[]) => ids.flatMap((id) => byPlatform.get(id) ?? []);
  return { main: pick(MAIN_PLATFORMS), more: pick(MORE_PLATFORMS) };
}
