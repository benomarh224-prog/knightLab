// Original Staunton-inspired sculptures with instance-local SVG paints.
let instance = 0;
const palettes = {
  w: { body: ['#fffdf5','#f3ecdc','#d5c8af','#a59a85','#e8ddc7'], rim: ['#fffef8','#ded0b5','#918572'], sphere: ['#fffef8','#eee5d3','#b4a68f'], outline: '#756c5d', shine: '#ffffff', recess: '#8b7b64', eye: '#4c453b' },
  b: { body: ['#a0a8b7','#555e70','#242c3a','#0b101a','#424c60'], rim: ['#a2acbc','#303b4e','#0a101b'], sphere: ['#a8b0c0','#3c4659','#0e1522'], outline: '#090f19', shine: '#d9e2f0', recess: '#070c14', eye: '#cbd9ec' },
};

function sculpture(type, paint, palette) {
  const body = `fill="url(#${paint}-body)"`, rim = `fill="url(#${paint}-rim)"`, sphere = `fill="url(#${paint}-sphere)"`;
  const glint = `fill="none" stroke="${palette.shine}" stroke-width="1.7" opacity=".58"`;
  const collar = `<path d="M36 61Q50 57 64 61L65 66Q50 71 35 66Z" ${rim}/><path d="M38 62Q48 59 59 62" ${glint}/>`;
  const stem = `<path d="M43 45C45 55 42 63 36 72Q50 77 64 72C58 63 55 55 57 45Z" ${body}/><path d="M45 49Q45 63 40 70" ${glint}/>`;
  const base = `<path d="M34 72Q50 68 66 72L70 78Q50 85 30 78Z" ${rim}/><path d="M30 78Q50 74 70 78L74 85Q50 94 26 85Z" ${body}/><ellipse cx="50" cy="85" rx="24" ry="5" ${rim}/><path d="M31 82Q43 78 63 81" ${glint}/><path d="M30 87Q50 92 70 87" fill="none" stroke="${palette.recess}" opacity=".65"/>`;
  const heads = {
    p: `${stem}<path d="M40 39Q50 36 60 39L61 44Q50 49 39 44Z" ${rim}/><circle cx="50" cy="27" r="13" ${sphere}/><path d="M41 23Q43 17 50 17" ${glint}/>`,
    r: `<path d="M35 34H65L61 70Q50 75 39 70Z" ${body}/><path d="M39 39 42 66" ${glint}/><path d="M28 18H38V27H45V18H55V27H62V18H72V39Q50 48 28 39Z" ${body}/><path d="M62 19H72V39L63 41V28Z" fill="${palette.recess}" opacity=".43"/><path d="M28 35Q50 42 72 35V40Q50 48 28 40Z" ${rim}/><path d="M31 20H36M47 20H53M64 20H69M31 37Q47 42 65 38" ${glint}/><path d="M34 64Q50 69 66 64L67 69Q50 76 33 69Z" ${rim}/>`,
    n: `<path d="M31 73C32 62 37 55 46 46L33 50 23 43 25 33 40 20 43 10 51 17C64 20 74 33 75 48L69 73Q50 80 31 73Z" ${body}/><path d="M53 20C66 25 73 39 72 51L68 70 61 72C62 52 66 44 54 31Z" fill="${palette.recess}" opacity=".6"/><path d="M45 16 44 24M38 27 29 36 28 41M47 51C40 59 37 66 37 71" ${glint}/><path d="M29 41 35 43 46 39" fill="none" stroke="${palette.recess}" stroke-width="2"/><path d="M48 27 57 34" fill="none" stroke="${palette.recess}" stroke-width="2"/><ellipse cx="43" cy="31" rx="2.3" ry="2.6" fill="${palette.eye}" stroke="none"/><circle cx="29" cy="38" r="1.4" fill="${palette.recess}" stroke="none"/><path d="M59 26 66 31M63 34 70 39M65 43 71 47" fill="none" stroke="${palette.shine}" opacity=".24"/>`,
    b: `${stem}${collar}<path d="M50 15C36 25 32 34 35 42Q39 51 50 52Q62 50 65 42C68 32 61 22 50 15Z" ${sphere}/><path d="m49 22 11 13" fill="none" stroke="${palette.recess}" stroke-width="4"/><path d="M40 30Q38 35 39 40" ${glint}/><circle cx="50" cy="12" r="4" ${sphere}/><path d="M38 49Q50 45 62 49L63 53Q50 59 37 53Z" ${rim}/>`,
    q: `${stem}${collar}<path d="M25 27 34 55Q50 62 66 55L75 27 62 39 63 20 54 35 50 16 46 35 37 20 38 39Z" ${body}/><path d="m29 32 8 20M45 37l5-16" ${glint}/><path d="M34 54Q50 50 66 54L67 59Q50 65 33 59Z" ${rim}/>${[[25,24],[37,17],[50,12],[63,17],[75,24]].map(([x,y])=>`<circle cx="${x}" cy="${y}" r="4" ${sphere}/>`).join('')}`,
    k: `${stem}${collar}<path d="M50 32C37 20 26 25 29 37L37 51Q50 57 63 51L71 37C74 25 63 20 50 32Z" ${body}/><path d="M33 31Q31 36 41 46" ${glint}/><path d="M47 8H53V15H60V21H53V29H47V21H40V15H47Z" ${rim}/><path d="M49 10V17H43" ${glint}/><path d="M37 49Q50 45 63 49L64 54Q50 61 36 54Z" ${rim}/>`
  };
  return `${heads[type]}${base}`;
}

export function pieceSvg(piece) {
  if (!piece || !palettes[piece.color] || typeof piece.type !== 'string' || !'prnbqk'.includes(piece.type) || piece.type.length !== 1) return '';
  const palette = palettes[piece.color], id = `knightlab-piece-${++instance}`;
  const stops = (colors, positions) => colors.map((color, i) => `<stop offset="${positions[i]}" stop-color="${color}"/>`).join('');
  return `<svg class="piece sculpted-piece ${piece.color === 'w' ? 'white-piece' : 'black-piece'}" viewBox="0 0 100 100" aria-hidden="true" focusable="false"><defs><linearGradient id="${id}-body" x1="0" y1="0" x2="1" y2=".16">${stops(palette.body, ['0%','24%','53%','83%','100%'])}</linearGradient><linearGradient id="${id}-rim" x1="0" y1="0" x2=".18" y2="1">${stops(palette.rim, ['0%','46%','100%'])}</linearGradient><radialGradient id="${id}-sphere" cx=".3" cy=".24" r=".8">${stops(palette.sphere, ['0%','45%','100%'])}</radialGradient><radialGradient id="${id}-shadow"><stop stop-color="#08101e" stop-opacity=".48"/><stop offset="1" stop-color="#08101e" stop-opacity="0"/></radialGradient></defs><ellipse cx="52" cy="90" rx="30" ry="7" fill="url(#${id}-shadow)"/><g stroke="${palette.outline}" stroke-width="1.65" stroke-linejoin="round" stroke-linecap="round">${sculpture(piece.type, id, palette)}</g></svg>`;
}
