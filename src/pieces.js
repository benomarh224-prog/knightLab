// Chessnut artwork by Alexis Luengas, Apache-2.0. Original SVGs are unchanged.
// Keep the shared .piece hook for board interaction and movement animations.
export function pieceSvg(piece) {
  if (!piece || !['w','b'].includes(piece.color) || typeof piece.type !== 'string' || !/^[prnbqk]$/.test(piece.type)) return '';
  return `<img class="piece chessnut-piece ${piece.color === 'w' ? 'white-piece' : 'black-piece'}" src="/assets/pieces/chessnut/pieces/${piece.color}${piece.type.toUpperCase()}.svg" width="800" height="800" alt="" aria-hidden="true" draggable="false">`;
}
