import { Chess } from 'chess.js';
import { mkdir, writeFile } from 'node:fs/promises';

// Refresh explicitly; normal builds use the checked-in snapshot and need no network.
const repository = 'lichess-org/chess-openings';
async function download(url) {
  const response = await fetch(url, { signal: AbortSignal.timeout(30000) });
  if (!response.ok) throw new Error(`Opening data download failed: ${response.status}`);
  return response.text();
}
const commit = JSON.parse(await download(`https://api.github.com/repos/${repository}/commits/master`)).sha;
if (!/^[a-f0-9]{40}$/.test(commit)) throw new Error('Invalid source revision');
const root = `https://raw.githubusercontent.com/${repository}/${commit}/`;
const positions = new Map();
for (const volume of ['a', 'b', 'c', 'd', 'e']) {
  const lines = (await download(root + volume + '.tsv')).trim().split(/\r?\n/);
  const columns = lines.shift().split('\t');
  for (const line of lines) {
    const values = line.split('\t');
    const row = Object.fromEntries(columns.map((key, index) => [key, values[index]]));
    const chess = new Chess(); chess.loadPgn(row.pgn);
    const key = chess.fen().split(' ').slice(0, 4).join(' ');
    if (!positions.has(key)) positions.set(key, [key, row.eco, row.name, row.pgn]);
  }
}
await mkdir('src/data', { recursive: true });
await writeFile('src/data/openings.json', JSON.stringify([...positions.values()]) + '\n');
await writeFile('src/data/openings-source.json', JSON.stringify({ repository: `https://github.com/${repository}`, commit, license: 'CC0-1.0', positions: positions.size }, null, 2) + '\n');
await writeFile('src/OPENINGS-LICENSE.txt', await download(root + 'COPYING.txt'));
console.log(`Saved ${positions.size} opening positions from ${commit}.`);
