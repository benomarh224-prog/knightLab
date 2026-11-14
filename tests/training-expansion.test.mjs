import test from 'node:test';
import assert from 'node:assert/strict';
import { Chess } from 'chess.js';
import { ENDGAMES, endgameExample, endgameStatus } from '../src/endgame-lab.js';
import { PlaySession } from '../src/play.js';
import { PracticeSession } from '../src/training.js';
import { practiceTheme, relatedPractice } from '../src/practice-themes.js';
import { createDailyTraining } from '../src/daily-training.js';
import { weeklyTraining, weeklyRecommendation } from '../src/weekly-training.js';
import { COURSES } from '../src/courses.js';
import { pageFromPath } from '../src/routes.js';

function play(position, moves) {
  const session = new PlaySession(position.fen,{color:position.color,mode:'engine'});
  for (const san of moves) {
    const move = new Chess(session.fen).move(san);
    assert.equal(session.engineMove(move.lan,session.snapshot()).status,'played');
  }
  return session;
}

test('Endgame Lab demonstrations and independent positions have legal and distinct boards',()=>{
  const [rook,pawn,draw] = ENDGAMES;
  for (const technique of ENDGAMES) {
    const frames = endgameExample(technique), practice = new Chess(technique.fen);
    assert.equal(practice.turn(),technique.color);
    assert.equal(practice.isGameOver(),false);
    assert.notEqual(frames[0].fen,practice.fen());
    assert.equal(practice.attackers(practice.board().flat().find(piece=>piece?.type==='k'&&piece.color!==practice.turn()).square,practice.turn()).length,0);
    assert.match(frames.at(-1).move.san,/Ra1#|e8=Q|Kxc3/);
  }
  assert.equal(endgameStatus(rook,play(rook,['Kg6','Kg8','Ra8#'])),'complete');
  const stalemate={fen:'7k/5K2/6Q1/8/8/8/8/8 w - - 0 1',color:'w'};
  const stuck=play(stalemate,['Qf5']);
  assert.equal(stuck.ending,'Stalemate');
  assert.equal(endgameStatus(rook,stuck),'retry');
  const promotionLine = ['Kd7','Kg6','e6','Kf5','Kd6','Kg6','e7','Kf7','Kd7','Kf6','e8=Q'];
  assert.equal(endgameStatus(pawn,play(pawn,promotionLine)),'playing');
  assert.equal(endgameStatus(pawn,play(pawn,[...promotionLine,'Kf5'])),'complete');
  assert.equal(endgameStatus(draw,play(draw,['Ke4','Kg2','Kd4','Kf3','Kc3','Ke3','Kxc2'])),'complete');
});

test('related exercises validate concrete motifs, exclude the original board and accept the objective',()=>{
  const mate = relatedPractice('mate');
  assert.equal(practiceTheme(mate.fen,mate.solution),'mate');
  assert.notEqual(relatedPractice('mate',mate.fen).fen,mate.fen);
  assert.equal(relatedPractice('discovered-check'),null);
  assert.equal(practiceTheme(mate.fen,'a2h8'),null);
  assert.equal(practiceTheme(new Chess().fen(),'e2e4'),null);
  const fork = relatedPractice('fork');
  assert.equal(practiceTheme(fork.fen,fork.solution),'fork');
  assert.equal(new PracticeSession([fork]).submit('d4','f5').status,'correct');
  assert.equal(new PracticeSession([{...mate,solution:'a2a3'}]).submit('a2','a1').status,'correct');
  assert.equal(new PracticeSession([{...mate,source:'review',solution:'a2a3'}]).submit('a2','a1').status,'retry');
});

test('weekly report excludes stale events, measures distinct solves and links the most supported skill',()=>{
  const data = new Map(), store = {getItem:key=>data.get(key),setItem:(key,value)=>data.set(key,value)};
  let date=new Date(2026,10,7,23);
  const make=()=>createDailyTraining({storage:store,courses:COURSES,now:()=>date});
  const daily = make(), fork = relatedPractice('fork');
  daily.recordEndgame(ENDGAMES[0],{hints:2});
  date = new Date(2026,10,8);
  daily.recordEndgame(ENDGAMES[0],{});
  date = new Date(2026,10,13);
  daily.helpReview(fork);
  daily.recordReview(fork,{});
  daily.recordReview(fork,{});
  date = new Date(2026,10,14);
  daily.recordReview(fork,{alternatives:1});
  daily.recordEndgame(ENDGAMES[1],{hints:1});
  const restored = make();
  const report = weeklyTraining(restored.weeklyEvidence(),'2026-11-14',{
    nextFor:event=>weeklyRecommendation(event,COURSES,restored.practiceMeta),
  });
  assert.deepEqual(report.totals,{independent:1,supported:3,unknown:0});
  assert.equal(report.days.length,7);
  assert.equal(report.days[0].date,'2026-11-08');
  assert.equal(report.focus.sample.name,'Checking knight fork');
  assert.equal(report.focus.count,2);
  assert.notEqual(report.next.exercise.fen,fork.fen);
  assert.equal(restored.today().tasks.length,3);
  assert.ok(restored.today().tasks.every(task=>task.kind!=='endgame'&&task.exercise?.source!=='followup'));
  assert.equal(pageFromPath('/train/weekly/'),'weekly');
  assert.equal(pageFromPath('/train/endgames/?technique=save-the-draw'),'endgames');
});
