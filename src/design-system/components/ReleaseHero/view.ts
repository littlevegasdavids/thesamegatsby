import type { Release } from "../../types.ts";
import type { PlayState } from "../ReleaseRow/view.ts";
import { trackRowLook, type TrackRowState } from "../TrackRow/states.ts";

// What a ReleaseHero shows, kept out of the .tsx so tests/release-hero.test.ts
// can check it. A single's main button plays its snippet. An EP or album's
// plays its lead track, notes the lead's title beside it, and lists the
// tracks, an album's past five behind "Show all".

/** An album shows this many tracks before "Show all". */
export const HERO_TRACK_LIMIT = 5;

export type ReleaseHeroPlayback = {
  /** The track playing anywhere on the page, or none. */
  playingTrackId?: string | null;
  playState?: PlayState;
  elapsed?: number;
};

export type HeroTrack = {
  id: string;
  title: string;
  duration: number;
  /** The track's place on its release, from 1. */
  index: number;
  lead: boolean;
  state: TrackRowState;
  /** Seconds played, passed only to the track that's playing. */
  elapsed: number;
};

export type ReleaseHeroView = {
  kind: "single" | "group";
  label: string;
  play: { label: string; icon: "play" | "stop"; pressed: boolean };
  leadTrackId: string;
  leadNote: string | null;
  listLabel: string | null;
  streamHeading: string;
  tracks: HeroTrack[];
  /** How many tracks show before "Show all". */
  shown: number;
  showAll: string | null;
};

const NAMES = { ep: "EP", album: "album" } as const;

const count = (n: number) => `${n} ${n === 1 ? "track" : "tracks"}`;

// "Show fewer tracks" is DS-23's proposal: the canvas draws only the closed
// toggle. It reads as StreamLinks' "Less" does, with the chevron flipped.
export function showAllLabel(open: boolean, total: number): string {
  return open ? "Show fewer tracks" : `Show all ${count(total)}`;
}

export function releaseHeroView(release: Release, playback: ReleaseHeroPlayback): ReleaseHeroView {
  const { playingTrackId = null, playState = "playing", elapsed = 0 } = playback;
  const lead = release.tracks.find(({ id }) => id === release.leadTrackId) ?? release.tracks[0];
  const leadTrackId = lead?.id ?? release.leadTrackId;
  const stateOf = (id: string): TrackRowState => (id === playingTrackId ? playState : "idle");
  const { running } = trackRowLook(stateOf(leadTrackId));
  const idleLabel = release.type === "single" ? "Play snippet" : "Play lead track";
  const play = running
    ? { label: "Stop snippet", icon: "stop" as const, pressed: true }
    : { label: idleLabel, icon: "play" as const, pressed: false };

  if (release.type === "single") {
    return {
      kind: "single",
      label: "New single",
      play,
      leadTrackId,
      leadNote: null,
      listLabel: null,
      streamHeading: "Stream it on",
      tracks: [],
      shown: 0,
      showAll: null,
    };
  }

  const total = release.tracks.length;
  const shown = release.type === "album" ? Math.min(total, HERO_TRACK_LIMIT) : total;
  return {
    kind: "group",
    label: `New ${NAMES[release.type]} · ${count(total)}`,
    play,
    leadTrackId,
    // Written in capitals, as the readouts are, so the text a browser exposes
    // is the text it shows.
    leadNote: lead ? lead.title.toUpperCase() : null,
    listLabel: `On this ${NAMES[release.type]}`,
    streamHeading: `Stream the ${NAMES[release.type]}`,
    tracks: release.tracks.map(({ id, title, duration }, i) => {
      const state = stateOf(id);
      return { id, title, duration, index: i + 1, lead: id === leadTrackId, state, elapsed: state === "idle" ? 0 : elapsed };
    }),
    shown,
    showAll: shown < total ? showAllLabel(false, total) : null,
  };
}
