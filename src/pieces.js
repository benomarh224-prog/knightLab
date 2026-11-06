import artwork from './maestro-artwork.json' with {type:'json'};
// Maestro by sadsnake1 (CC BY-NC-SA 4.0), BW adaptation by Kadagaden
// (CC BY 4.0). See assets/pieces/maestro-bw/NOTICE.txt. Inline vectors
// paint synchronously; per-instance IDs isolate gradients across every board.
let instance=0;
export function pieceSvg(piece) {
  if (!piece || !['w','b'].includes(piece.color) || typeof piece.type !== 'string' || !/^[prnbqk]$/.test(piece.type)) return '';
  const id=piece.color+piece.type.toUpperCase();
  const prefix=`maestro-${++instance}-`;
  return artwork[id].replace(/\bid="([^"]+)"/g,(_,value)=>`id="${prefix}${value}"`)
    .replace(/url\(#([^)]+)\)/g,(_,value)=>`url(#${prefix}${value})`)
    .replace(/(xlink:href|href)="#([^"]+)"/g,(_,attr,value)=>`${attr}="#${prefix}${value}"`)
    .replace('viewBox="0 0 50 50"','viewBox="2 2 46 46"')
    .replace('<svg ',`<svg class="piece maestro-piece ${piece.color === 'w' ? 'white-piece' : 'black-piece'}" data-piece="${piece.type}" aria-hidden="true" focusable="false" draggable="false" `);
}
