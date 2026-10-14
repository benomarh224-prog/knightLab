import openings from './data/openings.json' with { type: 'json' };

const positions = new Map(openings.map(([fen, eco, name]) => [fen, { eco, name }]));
const standardStart = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq -';
const key = fen => fen.split(' ').slice(0, 4).join(' ');
const clean = value => typeof value === 'string' ? value.trim().replace(/\s+/g, ' ').slice(0, 220) : '';

function chessComName(value) {
  try {
    const url = new URL(value);
    if (url.protocol !== 'https:' || !['chess.com', 'www.chess.com'].includes(url.hostname)) return '';
    const slug = url.pathname.match(/^\/openings\/([^/]+)\/?$/)?.[1];
    return slug ? clean(decodeURIComponent(slug).replace(/-\d+\..*$/, '').replaceAll('-', ' ')) : '';
  } catch { return ''; }
}

export function identifyOpening(parsed, game = {}) {
  const headers = parsed.headers || {};
  const customStart = key(parsed.fens[0]) !== standardStart;
  let matched = null;
  // Position matching recognizes move-order transpositions, not just a SAN prefix.
  if (!customStart) {
    for (let ply = parsed.fens.length - 1; ply > 0; ply--) {
      const entry = positions.get(key(parsed.fens[ply]));
      if (entry) { matched = { ...entry, ply }; break; }
    }
  }
  const headerName = clean(headers.Opening);
  const variation = clean(headers.Variation);
  const urlName = chessComName(headers.ECOUrl || game.eco);
  const headerEco = /^[A-E]\d{2}$/.test(headers.ECO || '') ? headers.ECO : '';
  const name = headerName ? headerName + (variation ? `: ${variation}` : '') : matched?.name || urlName || null;
  return {
    name,
    eco: headerName || !matched ? headerEco : matched.eco,
    source: headerName ? 'pgn' : matched ? 'database' : urlName ? 'chesscom' : null,
    ply: matched?.ply ?? null,
    customStart,
    line: matched ? formatOpeningLine(parsed.moves.slice(0, matched.ply)) : '',
  };
}

function formatOpeningLine(moves) {
  return moves.map((move, index) => {
    const number = move.before.split(' ')[5];
    return `${move.color === 'w' ? `${number}. ` : index === 0 ? `${number}... ` : ''}${move.san}`;
  }).join(' ');
}
