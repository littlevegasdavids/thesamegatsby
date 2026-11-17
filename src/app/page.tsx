import { catalogue } from "../catalogue";

// A bare placeholder until `site` builds the homepage. Nothing public serves
// it yet: the `redesign` preview does, and `www` is routed here at launch (CF-5).
export default function Home() {
  return (
    <main>
      <h1>Déjà Gatsby</h1>
      <ul>
        {catalogue.releases.map((release) => (
          <li key={release.id}>{release.title}</li>
        ))}
      </ul>
    </main>
  );
}
