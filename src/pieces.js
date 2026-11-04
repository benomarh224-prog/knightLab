import artwork from './classic-artwork.json' with {type:'json'};
// Cburnett classic artwork by Colin M. L. Burnett, GPL-2.0-or-later.
// Original drawing paths and colors remain unchanged; the viewport frames them tightly.
// Inline vectors paint synchronously when any board is selected or updated.
export function pieceSvg(piece) {
  if (!piece || !['w','b'].includes(piece.color) || typeof piece.type !== 'string' || !/^[prnbqk]$/.test(piece.type)) return '';
  const id=piece.color+piece.type.toUpperCase();
  return artwork[id].replace('viewBox="0 0 45 45"','viewBox="2 2 41 41"').replace('<svg ',`<svg class="piece classic-piece ${piece.color === 'w' ? 'white-piece' : 'black-piece'}" data-piece="${piece.type}" aria-hidden="true" focusable="false" draggable="false" `);
}
