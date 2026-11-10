export const MAX_ACCOUNT_VALUE=2100000;
export function accountKey(key){
  if(typeof key!=='string'||key.length>240)return false;
  if(/^knightlab-[a-z0-9-]+-course-v1(?::(?:lesson-player-v1|square-practice-v1):[a-z0-9-]+(?::legacy:[a-z0-9]+)?)?$/.test(key))return true;
  if(/^roqvyn-daily-training-v1:draft:\d{4}-\d{2}-\d{2}:practice-[a-z0-9-]+$/.test(key))return true;
  if(/^roqvyn-board-lab-v1:(memory|route):(beginner|intermediate|advanced|expert)$/.test(key))return true;
  return ['knightlab-review-memory-v1','knightlab-review-evidence-v1','knightlab-learning-memory-v1','roqvyn-daily-training-v1','roqvyn-adaptive-training-v1','roqvyn-board-lab-preferences-v1'].includes(key);
}
export function validAccountValue(value){return typeof value==='string'&&new TextEncoder().encode(value).length<=MAX_ACCOUNT_VALUE;}
