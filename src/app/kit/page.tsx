import type { Metadata } from "next";
import { catalogue } from "../../catalogue";
import { Kit } from "./Kit";
import { kitTracks } from "./artwork";

// SPEC-release-kit.md: post and story PNGs for a release. Nothing links to it,
// it isn't indexed, and / loads none of its code.
export const metadata: Metadata = {
  title: "Release kit · Déjà Gatsby",
  robots: { index: false },
};

export default function KitPage() {
  return <Kit tracks={kitTracks(catalogue)} />;
}
