export const qualityLabels = {
  Best: 'Best move',
  Great: 'Great move',
  Good: 'Good move',
  Inaccuracy: 'Inaccuracy',
  Mistake: 'Mistake',
  Blunder: 'Blunder',
};

export const qualitySymbols = { Best: '★', Great: '!', Good: '✓', Inaccuracy: '?!', Mistake: '?', Blunder: '??' };
export const qualityColors = { Best: 'var(--lime)', Great: 'var(--violet)', Good: 'var(--lime)', Inaccuracy: 'var(--gold)', Mistake: 'var(--orange)', Blunder: 'var(--red)' };

export function qualityGlyph(label) {
  const question = x => `<path d="M${x} 7.4c0-3.8 6.2-3.8 6.2-.3 0 2.1-3.1 2.3-3.1 4.8"/><circle cx="${x + 3.1}" cy="17.6" r="1.1" fill="currentColor" stroke="none"/>`;
  const shapes = {
    Best: '<path d="m12 2.8 2.8 5.7 6.3.9-4.6 4.4 1.1 6.3-5.6-3-5.6 3 1.1-6.3L2.9 9.4l6.3-.9Z" fill="currentColor" stroke="none"/>',
    Great: '<path d="M12 4v9"/><circle cx="12" cy="18" r="1.3" fill="currentColor" stroke="none"/>',
    Good: '<path d="m5 12 4.5 4.5L19 7"/>',
    Inaccuracy: question(4) + '<path d="M18.2 4v8"/><circle cx="18.2" cy="17.6" r="1.1" fill="currentColor" stroke="none"/>',
    Mistake: question(8.9),
    Blunder: question(3.1) + question(14.7),
  };
  return `<svg class="rating-glyph" viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${shapes[label] || shapes.Good}</svg>`;
}

export function selectedMoveVerdict(move, classification) {
  if (!move) return { label: 'Starting position', symbol: '◇', tone: 'neutral', move: '—', detail: 'Select a move to see its rating.' };
  const notation = `${Number(move.before.split(' ')[5])}${move.color === 'w' ? '.' : '...'} ${move.san}`;
  if (!classification) return { label: 'Not analyzed yet', symbol: '…', tone: 'pending', move: notation, detail: 'This move’s rating appears after analysis.' };
  const details = {
    Best: 'Matches the engine’s first choice.',
    Great: 'The engine’s top choice, clearly ahead of the alternative.',
    Good: 'Keeps the position close to the best continuation.',
    Inaccuracy: 'A small loss of advantage. A stronger move was available.',
    Mistake: 'Gives up a meaningful advantage.',
    Blunder: 'A major evaluation loss. Review the engine’s alternative.',
  };
  return { label: qualityLabels[classification.label], symbol: qualitySymbols[classification.label], tone: classification.label.toLowerCase(), move: notation, detail: details[classification.label] };
}

export function pieceMoveVerdict(move, classification) {
  if (!move || !classification) return null;
  return { ...selectedMoveVerdict(move, classification), square: move.to };
}
