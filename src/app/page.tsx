import { preconnect } from "react-dom";
import { tracksFrom } from "../audio/tracks";
import { catalogue } from "../catalogue";
import { MEDIA_ORIGIN } from "../catalogue/media";
import { Footer } from "./home/Footer";
import { Home } from "./home/Home";
import { heroRelease, homeReleases, SOCIALS } from "./home/releases";

// The server half of the homepage: the catalogue is read and validated here,
// at build, and the client gets plain view data and the engine's tracks.
export default function HomePage() {
  // No crossOrigin: the element fetches without CORS, so the preconnect must
  // open that same kind of connection or the first tap can't use it.
  preconnect(MEDIA_ORIGIN);
  return (
    <Home
      releases={homeReleases(catalogue)}
      heroId={heroRelease(catalogue).id}
      tracks={tracksFrom(catalogue)}
      socials={SOCIALS}
      // The year of the build, which a static page keeps until the next one.
      footer={<Footer socials={SOCIALS} year={new Date().getFullYear()} />}
    />
  );
}
