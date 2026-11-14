import { PLATFORM_IDS } from "../../src/catalogue/types.ts";
import type { Catalogue, CatalogueLink, CatalogueRelease, CatalogueTrack, Cover, Snippet } from "../../src/catalogue/types.ts";
import { parseCatalogue } from "../../src/catalogue/validate.ts";
import type { AddSongArgs } from "./args.ts";
import { releaseId as makeReleaseId, trackId as makeTrackId } from "./ids.ts";

export type MergePlan = {
  trackId: string;
  releaseId: string;
  newRelease: boolean;
  replacing: boolean; // re-cutting a track that's already there
  buildCover: boolean;
};

const fail = (message: string): never => {
  throw new Error(`add-song: ${message}`);
};

function findTrack(catalogue: Catalogue, id: string) {
  for (const release of catalogue.releases) {
    const index = release.tracks.findIndex((t) => t.id === id);
    if (index !== -1) return { release, index };
  }
  return undefined;
}

// What a run will do to the catalogue, worked out before anything is built,
// so a clash or a missing flag stops it before any audio or image work.
export function planMerge(catalogue: Catalogue, args: AddSongArgs): MergePlan {
  const trackId = args.id ?? makeTrackId(args.title);
  const found = findTrack(catalogue, trackId);
  const { cover, replace } = args;

  if (found && !replace) {
    fail(`${trackId} is already a track on ${found.release.id}: pass --replace to re-cut it, or --id to add it under another id`);
  }

  if (args.release) {
    const release = catalogue.releases.find((r) => r.id === args.release);
    if (!release) return fail(`--release ${args.release}: there's no release with that id in songs.json`);
    if (release.type === "single") fail(`--release ${args.release} is a single, which holds one track: an EP or album can take more`);
    if (found && found.release.id !== release.id) fail(`${trackId} is a track on ${found.release.id}, not ${release.id}`);
    if (replace && !found) fail(`--replace: ${trackId} isn't on ${release.id}, so there's nothing to replace`);
    if (cover && !replace) fail(`--cover would replace ${release.id}'s cover: pass --replace to do that`);
    return { trackId, releaseId: release.id, newRelease: false, replacing: !!found, buildCover: !!cover };
  }

  if (found) {
    for (const [name, value] of [["date", args.date], ["type", args.type], ["release-title", args.releaseTitle], ["release-id", args.releaseId]] as const) {
      if (value !== undefined) fail(`--${name} only sets up a new release, and ${found.release.id} exists: edit songs.json to change it`);
    }
    return { trackId, releaseId: found.release.id, newRelease: false, replacing: true, buildCover: !!cover };
  }
  if (replace) fail(`--replace: ${trackId} isn't in songs.json, so there's nothing to replace`);

  const type = args.type ?? "single";
  const releaseId = type === "single" ? trackId : (args.releaseId ?? makeReleaseId(args.releaseTitle!, type));
  if (catalogue.releases.some((r) => r.id === releaseId)) {
    fail(`${releaseId} is already a release: pass --release ${releaseId} to add a track to it`);
  }
  if (!cover) fail(`a new release needs --cover`);
  if (!args.date) fail(`a new release needs --date, the day it came out`);
  return { trackId, releaseId, newRelease: true, replacing: false, buildCover: true };
}

// Fields in a fixed order, so songs.json reads the same whatever built it.
function canonical(r: CatalogueRelease): CatalogueRelease {
  return {
    id: r.id,
    type: r.type,
    title: r.title,
    date: r.date,
    cover: { key: r.cover.key, widths: [...r.cover.widths], formats: [...r.cover.formats] },
    tracks: r.tracks.map((t) => ({
      id: t.id,
      title: t.title,
      kind: t.kind,
      snippet: { key: t.snippet.key, duration: t.snippet.duration, bytes: t.snippet.bytes, start: t.snippet.start, fadeIn: t.snippet.fadeIn, fadeOut: t.snippet.fadeOut },
    })),
    leadTrackId: r.leadTrackId,
    ...(r.featured ? { featured: true as const } : {}),
    links: [...r.links].sort((a, b) => PLATFORM_IDS.indexOf(a.platform) - PLATFORM_IDS.indexOf(b.platform)).map((l) => ({ platform: l.platform, url: l.url })),
  };
}

// The catalogue with this run's track in it, as a new copy. It's validated
// with add-song's allowance for an EP or album that's still one track short.
export function applyMerge(catalogue: Catalogue, args: AddSongArgs, built: { snippet: Snippet; cover?: Cover }): Catalogue {
  const plan = planMerge(catalogue, args);
  if (plan.buildCover && !built.cover) fail("this run needs a cover, and none was built");

  const releases: CatalogueRelease[] = catalogue.releases.map(canonical);
  const existingTrack = findTrack({ releases }, plan.trackId);
  const track: CatalogueTrack = {
    id: plan.trackId,
    title: args.title,
    kind: args.kind ?? existingTrack?.release.tracks[existingTrack.index].kind ?? "original",
    snippet: built.snippet,
  };

  let release: CatalogueRelease;
  if (plan.newRelease) {
    const type = args.type ?? "single";
    release = {
      id: plan.releaseId,
      type,
      title: type === "single" ? args.title : args.releaseTitle!,
      date: args.date!,
      cover: built.cover!,
      tracks: [track],
      leadTrackId: track.id,
      links: [],
    };
    releases.unshift(release);
  } else {
    const index = releases.findIndex((r) => r.id === plan.releaseId);
    const current = releases[index];
    const tracks = plan.replacing ? current.tracks.map((t) => (t.id === track.id ? track : t)) : [...current.tracks, track];
    release = {
      ...current,
      title: current.type === "single" ? args.title : current.title,
      tracks,
      cover: built.cover ?? current.cover,
    };
    releases[index] = release;
  }

  if (args.lead) release.leadTrackId = track.id;
  if (args.links.length > 0) {
    const byPlatform = new Map<string, CatalogueLink>(release.links.map((l) => [l.platform, l]));
    for (const link of args.links) byPlatform.set(link.platform, link);
    release.links = [...byPlatform.values()];
  }
  if (args.featured) {
    for (const r of releases) delete r.featured;
    release.featured = true;
  }

  // Newest first. The sort is stable, so releases on the same day keep their
  // order, and a new one goes before them.
  const sorted = releases.map(canonical).sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));
  return parseCatalogue({ releases: sorted }, { allowShortReleases: true });
}

export const catalogueText = (catalogue: Catalogue) => `${JSON.stringify(catalogue, null, 2)}\n`;
