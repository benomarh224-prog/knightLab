export function compactCoachText(text,limit=96) {
  const normalized=String(text||'').replace(/\s+/g,' ').trim();
  if(normalized.length<=limit)return normalized;
  const fragment=normalized.slice(0,limit-1);
  const boundary=fragment.lastIndexOf(' ');
  return fragment.slice(0,boundary>limit/2?boundary:fragment.length).trimEnd()+'…';
}

export function compactMoveText(move) {
  return move?.san||'Start';
}
