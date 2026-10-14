export function pageGames(games, filter = 'all', requestedPage = 0, pageSize = 12) {
  const size = Math.max(1, Math.floor(pageSize) || 12);
  const matches = games.map((game, index) => ({ game, index }))
    .filter(({ game }) => filter === 'all' || game.time_class === filter);
  const pages = Math.max(1, Math.ceil(matches.length / size));
  const page = Math.max(0, Math.min(pages - 1, Math.floor(requestedPage) || 0));
  const start = page * size;
  return { entries: matches.slice(start, start + size), total: matches.length, pages, page, start };
}
