import type { Release } from "./types.ts";

export type ReleaseCategory = "single" | "ep" | "album" | "remix";

export type FilterKey = "all" | ReleaseCategory;

export type FilterOption = { key: FilterKey; label: string; count: number };

const LABELS: Record<FilterKey, string> = {
  all: "All",
  single: "Singles",
  ep: "EPs",
  album: "Albums",
  remix: "Remixes & edits",
};

const ORDER: readonly ReleaseCategory[] = ["single", "ep", "album", "remix"];

// Each release counts under exactly one type (G6). A single takes its lead
// track's kind, so a remix or edit single sits under Remixes & edits. An EP
// or album keeps its own type, even when it holds a remix.
export function releaseCategory(release: Release): ReleaseCategory {
  if (release.type !== "single") return release.type;
  const lead = release.tracks.find(({ id }) => id === release.leadTrackId) ?? release.tracks[0];
  return lead && lead.kind !== "original" ? "remix" : "single";
}

// All comes first and counts everything. A type with no releases is left
// out, so the filter never offers an empty list.
export function releaseFilterOptions(releases: readonly Release[]): FilterOption[] {
  const counts = new Map<ReleaseCategory, number>();
  for (const release of releases) {
    const category = releaseCategory(release);
    counts.set(category, (counts.get(category) ?? 0) + 1);
  }

  return [
    { key: "all", label: LABELS.all, count: releases.length },
    ...ORDER.filter((key) => counts.has(key)).map((key) => ({ key, label: LABELS[key], count: counts.get(key) ?? 0 })),
  ];
}
