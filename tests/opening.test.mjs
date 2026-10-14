import test from 'node:test';
import assert from 'node:assert/strict';
import { parseGame, DEMO_PGN } from '../src/game.js';
import { identifyOpening } from '../src/opening.js';

test('the demo identifies Philidor Defense from its actual opening moves', () => {
  const opening = identifyOpening(parseGame(DEMO_PGN));
  assert.equal(opening.name, 'Philidor Defense');
  assert.equal(opening.eco, 'C41');
  assert.equal(opening.ply, 5);
  assert.equal(opening.source, 'database');
});

test('the deepest named position identifies a specific variation', () => {
  const opening = identifyOpening(parseGame('1. e4 c5 2. Nf3 d6 3. d4 cxd4 4. Nxd4 Nf6 5. Nc3 a6 *'));
  assert.equal(opening.name, 'Sicilian Defense: Najdorf Variation');
  assert.equal(opening.eco, 'B90');
  assert.equal(opening.ply, 10);
  assert.match(opening.line, /5\. Nc3 a6$/);
});

test('transposed move orders identify the same opening position', () => {
  const first = identifyOpening(parseGame('1. d4 Nf6 2. c4 e6 3. Nc3 d5 *'));
  const second = identifyOpening(parseGame('1. d4 d5 2. c4 e6 3. Nc3 Nf6 *'));
  assert.equal(first.name, second.name);
  assert.equal(first.eco, 'D35');
  assert.notEqual(first.line, second.line);
});

test('switching games returns the new name and never retains a previous opening', () => {
  assert.match(identifyOpening(parseGame('1. e4 c5 *')).name, /Sicilian/);
  assert.equal(identifyOpening(parseGame('1. e4 e5 2. Nf3 Nc6 3. Bb5 *')).name, 'Ruy Lopez');
});

const custom = '[SetUp "1"]\n[FEN "4k3/8/8/8/8/8/8/R3K3 w Q - 0 1"]\n\n1. Ra2 *';

test('custom starting positions do not invent an opening from an incomplete game', () => {
  const opening = identifyOpening(parseGame(custom));
  assert.equal(opening.name, null);
  assert.equal(opening.customStart, true);
  assert.equal(opening.ply, null);
  assert.equal(opening.line, '');
});

test('explicit PGN opening and variation metadata is preserved', () => {
  const opening = identifyOpening(parseGame('[Opening "Imported opening"]\n[Variation "Recorded variation"]\n[ECO "B12"]\n' + custom));
  assert.equal(opening.name, 'Imported opening: Recorded variation');
  assert.equal(opening.eco, 'B12');
  assert.equal(opening.source, 'pgn');
});

test('Chess.com opening URLs provide a conservative fallback without trailing move notation', () => {
  const parsed = parseGame(custom);
  const opening = identifyOpening(parsed, { eco: 'https://www.chess.com/openings/Caro-Kann-Defense-Advance-Variation-3.e5' });
  assert.equal(opening.name, 'Caro Kann Defense Advance Variation');
  assert.equal(opening.source, 'chesscom');
  assert.equal(opening.ply, null);
  for (const eco of ['javascript:alert(1)', 'https://evil.example/openings/Invented', 'https://chess.com.evil.example/openings/Invented']) assert.equal(identifyOpening(parsed, { eco }).name, null);
});
