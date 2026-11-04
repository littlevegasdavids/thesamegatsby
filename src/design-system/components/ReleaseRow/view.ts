import { formatLength, formatTime } from "../../format.ts";
import { releaseCategory } from "../../release-filter.ts";
import type { Release } from "../../types.ts";
import { trackRowLook, trackRowLabel, type TrackRowState } from "../TrackRow/states.ts";

// What a ReleaseRow shows, kept out of the .tsx so tests/release-row.test.ts
// can check it. A single is one track, so its row plays. An EP or album
// opens to show its tracks, and the one playing takes playState.

export type PlayState = Exclude<TrackRowState, "idle">;

export type ReleaseRowPlayback = {
  expanded?: boolean;
  /** The track playing anywhere on the page, or none. */
  playingTrackId?: string | null;
  playState?: PlayState;
  elapsed?: number;
};

type Common = { label: string; tag: string | null };

export type ReleaseRowView =
  | (Common & {
      kind: "single";
      meta: string;
      length: string;
      lit: boolean;
      running: boolean;
      playing: boolean;
    })
  | (Common & { kind: "group"; meta: string; toggleText: string; trackStates: TrackRowState[] });

const META: Record<PlayState, (elapsed: number) => string> = {
  loading: () => "LOADING",
  playing: (elapsed) => `PLAYING ${formatTime(elapsed)}`,
  played: () => "PLAYED",
};

// Words are written in capitals rather than set with text-transform, so the
// text a browser exposes is the text it shows (DS-11, DS-12).
export function releaseRowView(release: Release, playback: ReleaseRowPlayback): ReleaseRowView {
  const { expanded = false, playingTrackId = null, playState = "playing", elapsed = 0 } = playback;
  const stateOf = (id: string): TrackRowState => (id === playingTrackId ? playState : "idle");

  if (release.type === "single") {
    const lead = release.tracks.find(({ id }) => id === release.leadTrackId) ?? release.tracks[0];
    const state = lead ? stateOf(lead.id) : "idle";
    const { lit, running } = trackRowLook(state);
    return {
      kind: "single",
      label: trackRowLabel(release.title, state),
      tag: releaseCategory(release) === "remix" && lead ? lead.kind.toUpperCase() : null,
      meta: state === "idle" ? "SINGLE" : META[state](elapsed),
      length: formatLength(lead?.duration ?? Number.NaN),
      lit,
      running,
      playing: state === "playing",
    };
  }

  const count = release.tracks.length;
  return {
    kind: "group",
    label: `${expanded ? "Hide" : "Show"} ${release.title} tracks`,
    tag: null,
    meta: `${release.type === "ep" ? "EP" : "ALBUM"} · ${count} ${count === 1 ? "TRACK" : "TRACKS"}`,
    toggleText: expanded ? "Hide tracks" : "Show tracks",
    trackStates: release.tracks.map(({ id }) => stateOf(id)),
  };
}
