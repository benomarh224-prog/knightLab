import test from 'node:test';
import assert from 'node:assert/strict';
import { pageGames } from '../src/library.js';

const games = Array.from({ length: 31 }, (_, index) => ({ pgn: `game-${index}`, time_class: index % 2 ? 'blitz' : 'rapid' }));

test('pages show twelve games without skipping or duplicating a match', () => {
  const pages = [0, 1, 2].map(page => pageGames(games, 'all', page));
  assert.deepEqual(pages.map(page => page.entries.length), [12, 12, 7]);
  assert.deepEqual(pages.flatMap(page => page.entries.map(entry => entry.game)), games);
  assert.equal(pages[2].start, 24);
});

test('filtered pages retain the original indices used to open the correct game', () => {
  const result = pageGames(games, 'rapid', 1);
  assert.equal(result.total, 16);
  assert.equal(result.pages, 2);
  assert.deepEqual(result.entries.map(entry => entry.index), [24, 26, 28, 30]);
  for (const entry of result.entries) assert.equal(entry.game, games[entry.index]);
});

test('changing to a smaller collection clamps the page without hiding results', () => {
  assert.equal(pageGames(games, 'blitz', 100).page, 1);
  assert.equal(pageGames(games, 'all', -2).page, 0);
  assert.equal(pageGames([games[0]], 'all', 2).page, 0);
});

test('an empty filter has no entries and a stable first page', () => {
  assert.deepEqual(pageGames(games, 'bullet', 5), { entries: [], total: 0, pages: 1, page: 0, start: 0 });
  assert.equal(pageGames([], 'all').total, 0);
});
