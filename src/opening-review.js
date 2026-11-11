import { openingPositionKey, relatedOpeningPosition } from './opening-training.js';
import { localTrainingDate, trainingDateAfter } from './training-calendar.js';

export const OPENING_REVIEW_KEY = 'roqvyn-opening-review-v1';
const intervals = [1, 3, 7, 14, 30];
const datePattern = /^\d{4}-\d{2}-\d{2}$/;
const dueOn = row => trainingDateAfter(row.date, intervals[row.streak]);

// Retain unrelated positions on sync. On the same day a miss takes precedence
// over a correct repeat, and a completed transfer must not become due again.
export function mergeOpeningReviews(local, remote) {
  const records = {...remote.records, ...local.records};
  for (const [position, left] of Object.entries(local.records || {})) {
    const right = remote.records?.[position];
    if (!left || !right) continue;
    const latest = left.date !== right.date ? (left.date > right.date ? left : right)
      : left.matched !== right.matched ? (left.matched ? right : left)
      : left.streak >= right.streak ? left : right;
    const transfer = [left.transfer, right.transfer].filter(Boolean).sort((a,b) =>
      Number(Boolean(b.done)) - Number(Boolean(a.done)) || a.due.localeCompare(b.due) || a.position.localeCompare(b.position))[0];
    records[position] = {...latest, transfer};
  }
  return {version:1, records};
}

export function createOpeningReview({training, storage, now = () => new Date()}) {
  let records = {};
  function read() {
    try {
      const raw = JSON.parse(storage?.getItem(OPENING_REVIEW_KEY) || 'null');
      if (raw?.version !== 1) return;
      records = Object.fromEntries(Object.entries(raw.records || {}).filter(([,row]) => row &&
        datePattern.test(row.date) && typeof row.matched === 'boolean' && Number.isInteger(row.streak) && row.streak >= 0 && row.streak < intervals.length
      ).map(([position,row]) => {
        const {transfer} = row;
        return [position,{date:row.date, matched:row.matched, streak:row.streak,
          transfer:transfer && typeof transfer.position === 'string' && transfer.position !== position && datePattern.test(transfer.due)
            ? {position:transfer.position, due:transfer.due, done:transfer.done === true} : undefined}];
      }));
    } catch { /* Keep the in-memory review queue when storage is blocked. */ }
  }
  function save() {
    try { storage?.setItem(OPENING_REVIEW_KEY, JSON.stringify({version:1,records})); } catch {}
  }
  const bank = () => new Map(training.completedPositions(storage).map(question => [openingPositionKey(question.fen),question]));

  return {
    question: position => bank().get(position) || null,
    due(date = localTrainingDate(now())) {
      read();
      const pending = Object.entries(records).flatMap(([position,row]) => {
        const result = [{position, due:dueOn(row), source:null}];
        if (row.transfer && !row.transfer.done && !Object.hasOwn(records,row.transfer.position)) {
          result.push({position:row.transfer.position, due:row.transfer.due, source:position});
        }
        return result;
      }).filter(item => item.due <= date);
      if (!pending.length) return null;
      const questions = bank();
      return pending.filter(item => questions.has(item.position) && (!item.source || questions.has(item.source)))
        .sort((a,b) => a.due.localeCompare(b.due) || Number(Boolean(b.source)) - Number(Boolean(a.source)) || a.position.localeCompare(b.position))[0] || null;
    },
    record(question, result, {source = null} = {}) {
      read();
      const position = openingPositionKey(question.fen), date = localTrainingDate(now());
      if (source && records[source]?.transfer?.position === position) {
        records[source].transfer.done = true;
        save();
      }
      const previous = Object.hasOwn(records,position) ? records[position] : null;
      if (previous?.date > date || (result.matched && (!previous || dueOn(previous) > date))) return null;
      if (previous?.date === date && !previous.matched) return {due:dueOn(previous), related:false};
      const streak = result.matched ? Math.min(previous.streak + 1, intervals.length - 1) : 0;
      const row = {date, matched:result.matched, streak, transfer:previous?.transfer};
      let related = false;
      if (streak >= 2 && !row.transfer) {
        const reserved = new Set(Object.values(records).map(item => item.transfer?.position));
        const candidate = relatedOpeningPosition(question, [...bank()].filter(([key]) => !Object.hasOwn(records,key) && !reserved.has(key)).map(([,entry]) => entry));
        if (candidate) {
          row.transfer = {position:openingPositionKey(candidate.fen), due:trainingDateAfter(date,1), done:false};
          related = true;
        }
      }
      records[position] = row;
      save();
      return {due:dueOn(row), related};
    }
  };
}
