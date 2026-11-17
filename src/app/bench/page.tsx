import type { Metadata } from "next";
import { preconnect } from "react-dom";
import { tracksFrom } from "../../audio/tracks";
import { catalogue } from "../../catalogue";
import { MEDIA_ORIGIN } from "../../catalogue/media";
import { Bench } from "./Bench";

// SPEC-audio-engine.md's bench: the engine on plain buttons, timing each tap
// to "playing", so the 300 ms target can be measured before site exists.
// Nothing links to it, it isn't indexed, and site deletes it.
export const metadata: Metadata = {
  title: "Bench · Déjà Gatsby",
  robots: { index: false },
};

export default function BenchPage() {
  // No crossOrigin: the element fetches without CORS, so the preconnect must
  // open that same kind of connection or the first tap can't use it.
  preconnect(MEDIA_ORIGIN);
  // The hero's release: the featured one, or else the newest.
  const hero = catalogue.releases.find((release) => release.featured) ?? catalogue.releases[0];
  return <Bench tracks={tracksFrom(catalogue)} leadTrackId={hero.leadTrackId} />;
}
