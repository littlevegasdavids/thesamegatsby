import { songs } from "../../songs";

// A bare placeholder until `site` builds the homepage. Production is served
// from `main`, so nothing public changes while `redesign` looks like this.
export default function Home() {
  return (
    <main>
      <h1>Déjà Gatsby</h1>
      <ul>
        {songs.map((song) => (
          <li key={song.id}>{song.title}</li>
        ))}
      </ul>
    </main>
  );
}
