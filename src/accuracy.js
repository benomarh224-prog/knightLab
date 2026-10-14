// Knightlab's independent estimate, not Chess.com's Accuracy algorithm.
// Engine scores are White-normalized. The logistic is an evaluation proxy,
// not a calibrated prediction of the player's real-world winning chances.
const valid = score => score && Number.isFinite(score.cp);
const expectedScore = score => 1 / (1 + Math.exp(-Math.max(-10000, Math.min(10000, score.cp)) / 250));

export function moveAccuracy(move, before, after) {
  if (!valid(before) || !valid(after)) return null;
  if (before.best === move.from + move.to + (move.promotion || '')) return 100;
  const drop = Math.max(0, (expectedScore(before) - expectedScore(after)) * (move.color === 'w' ? 1 : -1));
  return Math.max(0, Math.min(100, 100 * Math.exp(-4 * drop)));
}

export function gameAccuracy(parsed, evaluations) {
  const players = { w: { total: 0, reviewed: 0, sum: 0 }, b: { total: 0, reviewed: 0, sum: 0 } };
  parsed.moves.forEach((move, index) => {
    const player = players[move.color]; player.total++;
    const accuracy = moveAccuracy(move, evaluations[index], evaluations[index + 1]);
    if (accuracy !== null) { player.reviewed++; player.sum += accuracy; }
  });
  for (const player of Object.values(players)) {
    player.score = player.reviewed ? player.sum / player.reviewed : null;
    player.complete = player.reviewed === player.total;
    delete player.sum;
  }
  return players;
}
