// A unified-style line diff, so a dry run shows what it would change in
// songs.json. The catalogue is a few hundred lines, so a plain LCS table is
// plenty.
export function lineDiff(before: string, after: string, context = 2): string {
  const a = before.split("\n");
  const b = after.split("\n");
  const lcs = Array.from({ length: a.length + 1 }, () => new Uint32Array(b.length + 1));
  for (let i = a.length - 1; i >= 0; i--) {
    for (let j = b.length - 1; j >= 0; j--) lcs[i][j] = a[i] === b[j] ? lcs[i + 1][j + 1] + 1 : Math.max(lcs[i + 1][j], lcs[i][j + 1]);
  }

  const lines: { mark: " " | "-" | "+"; text: string }[] = [];
  let i = 0;
  let j = 0;
  while (i < a.length || j < b.length) {
    if (i < a.length && j < b.length && a[i] === b[j]) {
      lines.push({ mark: " ", text: a[i++] });
      j++;
    }
    // Removals before additions, as diffs usually read.
    else if (i < a.length && (j === b.length || lcs[i + 1][j] >= lcs[i][j + 1])) lines.push({ mark: "-", text: a[i++] });
    else lines.push({ mark: "+", text: b[j++] });
  }

  if (lines.every((line) => line.mark === " ")) return "";
  // Keep changed lines and `context` lines either side, with "…" for gaps.
  const keep = lines.map((line, n) => lines.slice(Math.max(0, n - context), n + context + 1).some((l) => l.mark !== " "));
  const out: string[] = [];
  lines.forEach((line, n) => {
    if (keep[n]) out.push(`${line.mark} ${line.text}`);
    else if (n === 0 || keep[n - 1]) out.push("…");
  });
  return out.join("\n");
}
