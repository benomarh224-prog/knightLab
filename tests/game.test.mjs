import test from 'node:test';
import assert from 'node:assert/strict';
import { Chess } from 'chess.js';
import { DEMO_PGN, parseGame, scoreFromInfo, terminalEvaluation, classifyMove, summarize, uciToSan, formatEvaluation, resultFor, timeControl } from '../src/game.js';
import { normalizeUsername, loadPlayer, loadArchive } from '../src/api.js';

test('PGN replay preserves positions, castling, sacrifices, and final checkmate', () => {
  const game = parseGame(DEMO_PGN);
  assert.equal(game.moves.length, 33);
  assert.equal(game.fens.length, 34);
  assert.equal(game.moves.at(-1).san, 'Rd8#');
  assert.equal(new Chess(game.fens.at(-1)).isCheckmate(), true);
  assert.equal(game.moves.find(move => move.san === 'O-O-O').flags, 'q');
});
test('PGN from a custom FEN preserves the original starting position', () => {
  const game = parseGame('[SetUp "1"]\n[FEN "4k3/8/8/8/8/8/4P3/4K3 w - - 0 27"]\n\n27. e4 Kd7 *');
  assert.equal(game.fens[0].split(' ')[5], '27');
  assert.equal(game.moves[0].san, 'e4');
});
test('malformed, empty, and oversized PGNs are rejected', () => {
  assert.throws(() => parseGame('1. e4 e5 2. Qz9'));
  assert.throws(() => parseGame('[White "Empty"]'));
  assert.throws(() => parseGame('x'.repeat(250001)));
});
test('engine scores are normalized to White, including mate and bounds', () => {
  assert.equal(scoreFromInfo('info depth 15 score cp 234 pv e2e4', 'w').cp, 234);
  assert.equal(scoreFromInfo('info depth 15 score cp 234 pv e7e5', 'b').cp, -234);
  assert.equal(scoreFromInfo('info depth 15 score mate 3 pv d8h4', 'b').mate, -3);
  assert.equal(scoreFromInfo('info depth 15 score cp 234 lowerbound pv e2e4', 'w'), null);
  assert.equal(scoreFromInfo('info depth 15 multipv 2 score cp 234 pv e7e5', 'b').multipv, 2);
});
test('checkmate and drawn terminal positions use correct perspective', () => {
  const opera = parseGame(DEMO_PGN);
  assert.equal(terminalEvaluation(opera.fens.at(-1)).cp, 10000);
  const fools = parseGame('1. f3 e5 2. g4 Qh4# 0-1');
  assert.equal(terminalEvaluation(fools.fens.at(-1)).cp, -10000);
  assert.equal(terminalEvaluation('4k3/8/8/8/8/8/8/4K3 w - - 0 1').cp, 0);
  assert.equal(terminalEvaluation(new Chess().fen()), null);
});
test('move loss uses the mover’s perspective and identifies first-choice moves', () => {
  const game = parseGame('1. e4 e5 *');
  const white = game.moves[0], black = game.moves[1];
  assert.equal(classifyMove(white, {cp:40,best:'d2d4'}, {cp:-200}).label, 'Blunder');
  assert.equal(classifyMove(black, {cp:-40,best:'c7c5'}, {cp:70}).label, 'Mistake');
  assert.equal(classifyMove(white, {cp:40,best:'e2e4'}, {cp:20}).label, 'Best');
  assert.equal(classifyMove(black, {cp:40,best:'c7c5'}, {cp:-40}).loss, 0);
  assert.equal(classifyMove(white, undefined, {cp:20}), null);
});
test('connected account summaries count only the player’s analyzed moves', () => {
  const game = parseGame('1. e4 e5 *');
  const scores = [{cp:30,best:'e2e4'},{cp:20,best:'c7c5'},{cp:130,best:'g1f3'}];
  assert.equal(summarize(game,scores,'w').counts.Best,1);
  assert.equal(summarize(game,scores,'w').count,1);
  assert.equal(summarize(game,scores,'b').counts.Mistake,1);
  assert.equal(summarize(game,scores,null).count,2);
});

test('great moves require a clear same-depth advantage from either color’s perspective', () => {
  const game = parseGame('1. e4 e5 *');
  const white = classifyMove(game.moves[0], {cp:150,best:'e2e4',depth:12,alternative:{cp:30,depth:12}}, {cp:145});
  const black = classifyMove(game.moves[1], {cp:-150,best:'e7e5',depth:12,alternative:{cp:-30,depth:12}}, {cp:-145});
  assert.equal(white.label,'Great');
  assert.equal(black.label,'Great');
  const summary = summarize(game, [{cp:150,best:'e2e4',depth:12,alternative:{cp:30,depth:12}},{cp:145,best:'c7c5'},{cp:160}], 'w');
  assert.equal(summary.counts.Great,1);
  assert.equal(summary.count,1);
});

test('close alternatives, low depth, incomplete comparisons, and large losses stay best', () => {
  const move = parseGame('1. e4 *').moves[0];
  const before = {cp:150,best:'e2e4',depth:12,alternative:{cp:30,depth:12}};
  assert.equal(classifyMove(move,{...before,alternative:{cp:80,depth:12}},{cp:145}).label,'Best');
  assert.equal(classifyMove(move,{...before,depth:7,alternative:{cp:30,depth:7}},{cp:145}).label,'Best');
  assert.equal(classifyMove(move,{...before,alternative:{cp:30,depth:11}},{cp:145}).label,'Best');
  assert.equal(classifyMove(move,before,{cp:100}).label,'Best');
  assert.equal(classifyMove(move,{...before,best:'d2d4'},{cp:145}).label,'Good');
});
test('coordinate best moves convert to human-readable SAN and handle malformed moves', () => {
  assert.equal(uciToSan(new Chess().fen(),'e2e4'),'e4');
  assert.equal(uciToSan(new Chess().fen(),'(none)'),'—');
  assert.equal(uciToSan(new Chess().fen(),'e2e8'),'—');
});
test('evaluation labels and time controls are readable', () => {
  assert.equal(formatEvaluation({cp:-45,mate:null}),'-0.45');
  assert.equal(formatEvaluation({cp:10000,mate:3}),'+M3');
  assert.equal(formatEvaluation({cp:10000,mate:0,terminal:true}),'1–0');
  assert.equal(timeControl('180+2'),'3 | 2');
  assert.equal(timeControl('600'),'10 min');
  assert.equal(timeControl('1/259200'),'Daily');
});
test('game outcome is relative to the account, with documented draw results', () => {
  const game = {white:{username:'User',result:'resigned'},black:{username:'Other',result:'win'}};
  assert.equal(resultFor(game,'USER'),'loss');
  assert.equal(resultFor(game,'other'),'win');
  game.white.result = 'timevsinsufficient';
  assert.equal(resultFor(game,'user'),'draw');
});
test('username normalization validates user input before URL construction', () => {
  assert.equal(normalizeUsername('  HiKaRu  '),'hikaru');
  assert.throws(() => normalizeUsername('../test'));
  assert.throws(() => normalizeUsername(''));
});
test('API requests are sequential and standard games are sorted newest first', async () => {
  const original = globalThis.fetch;
  const calls = [];
  globalThis.fetch = async url => {
    calls.push(url);
    const body = url.endsWith('/archives') ? {archives:['https://api.chess.com/pub/player/hikaru/games/2026/09']} : url.endsWith('/09') ? {games:[{rules:'chess',pgn:'1. e4 e5 *',white:{username:'hikaru'},black:{username:'other'},end_time:1},{rules:'chess960',pgn:'x'},{rules:'chess',pgn:'1. d4 d5 *',white:{username:'other'},black:{username:'hikaru'},end_time:2}]} : {username:'hikaru'};
    return new Response(JSON.stringify(body),{status:200});
  };
  try {
    const controller = new AbortController();
    const player = await loadPlayer('hikaru',controller.signal);
    const games = await loadArchive(player.archives[0],controller.signal);
    assert.equal(calls.length,3);
    assert.equal(games.length,2);
    assert.equal(games[0].end_time,2);
    await assert.rejects(loadArchive('https://evil.example/games/2026/09',controller.signal),/Invalid game archive/);
    assert.equal(calls.length,3);
  } finally { globalThis.fetch = original; }
});
test('API errors give useful missing-user and rate-limit feedback', async () => {
  const original = globalThis.fetch;
  try {
    globalThis.fetch = async () => new Response('{}',{status:404});
    await assert.rejects(loadPlayer('missing',new AbortController().signal),/not found/);
    globalThis.fetch = async () => new Response('{}',{status:429});
    await assert.rejects(loadPlayer('test',new AbortController().signal),/too many requests/);
  } finally { globalThis.fetch = original; }
});
