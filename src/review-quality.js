export const PRECISION_DEPTH = 18;

export function evaluationReady(score, mode) {
  return Boolean(score && Number.isFinite(score.cp) &&
    (mode !== 'precise' || score.terminal || score.depth >= PRECISION_DEPTH));
}

export function reviewSearch(mode, previous) {
  if (mode !== 'precise') return mode === 'deep' ? 650 : 140;
  // Retry only unfinished searches, giving slow devices more time.
  return { depth: PRECISION_DEPTH, milliseconds: Math.min(80000, (previous?.searchTime || 10000) * 2), clearHash: true };
}
