const BASE = 'https://api.chess.com/pub/player/';
export function normalizeUsername(value) {
  const username = value.trim().toLowerCase();
  if (!/^[a-z0-9_-]{1,50}$/.test(username)) throw new Error('Enter a Chess.com username using letters, numbers, hyphens, or underscores.');
  return username;
}
async function request(url, signal) {
  let response;
  try { response = await fetch(url, { signal: AbortSignal.any([signal, AbortSignal.timeout(20000)]) }); }
  catch (error) {
    if (signal.aborted) throw error;
    throw new Error('Chess.com could not be reached. Please try again, or import a PGN file.');
  }
  if (!response.ok) console.warn(`Chess.com public API returned ${response.status} for ${url}`);
  if (response.status === 404) {
    const error = new Error(url.includes('/games/') ? 'Chess.com has no data for this game archive. Please try again later or import a PGN.' : 'This Chess.com username was not found. Check the spelling and try again.');
    error.status = 404;
    throw error;
  }
  if (response.status === 429) throw new Error('Chess.com is receiving too many requests. Please wait a moment and try again.');
  if (!response.ok) throw new Error('Chess.com is temporarily unavailable. Please try again later or import a PGN.');
  return response.json();
}
export async function loadPlayer(username, signal) {
  const name = normalizeUsername(username);
  const profile = await request(BASE + name, signal);
  const archiveResponse = await request(BASE + name + '/games/archives', signal);
  const archives = (archiveResponse.archives || []).filter(url => typeof url === 'string' && url.startsWith(BASE + name + '/games/')).reverse();
  return { profile, archives };
}
export async function loadArchive(url, signal) {
  const parsed = new URL(url);
  if (parsed.origin !== 'https://api.chess.com' || !/^\/pub\/player\/[a-z0-9_-]+\/games\/\d{4}\/\d{2}$/.test(parsed.pathname)) throw new Error('Invalid game archive.');
  let data;
  try { data = await request(url, signal); }
  catch (error) { if (error.status === 404) return []; throw error; }
  return (data.games || []).filter(game => game.rules === 'chess' && game.pgn && game.white?.username && game.black?.username).sort((a, b) => b.end_time - a.end_time);
}
