import artwork from './chessnut-artwork.json' with {type:'json'};
// Chessnut artwork by Alexis Luengas, Apache-2.0. Drawing paths and colors are
// unchanged; only accessibility and board styling attributes are added.
// Inline vectors paint synchronously when any board is selected or updated.
export function pieceSvg(piece) {
  if (!piece || !['w','b'].includes(piece.color) || typeof piece.type !== 'string' || !/^[prnbqk]$/.test(piece.type)) return '';
  const id=piece.color+piece.type.toUpperCase();
  return artwork[id].replace('<svg ',`<svg class="piece chessnut-piece ${piece.color === 'w' ? 'white-piece' : 'black-piece'}" aria-hidden="true" focusable="false" draggable="false" `);
}
