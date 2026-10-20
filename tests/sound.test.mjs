import test from 'node:test';
import assert from 'node:assert/strict';
import { MoveSounds, navigationSoundMove, woodenSamples,moveSoundKind,SOUND_KINDS } from '../src/sound.js';
import { parseGame } from '../src/game.js';
import {Chess} from 'chess.js';
import {readFile} from 'node:fs/promises';

test('move and capture clips are finite, distinct, audible, and fade to silence without clipping', () => {
  const move = woodenSamples(48000), capture = woodenSamples(48000, true);
  assert.notDeepEqual(move, capture);
  for (const samples of [move, capture]) {
    assert.ok(samples.every(Number.isFinite));
    assert.ok(Math.max(...samples.map(Math.abs)) < 1);
    const rms = segment => Math.sqrt(segment.reduce((sum, value) => sum + value * value, 0) / segment.length);
    assert.ok(rms(samples.slice(0, 2400)) > .04);
    assert.ok(rms(samples.slice(-480)) < .002);
    assert.equal(samples[0], 0);
  }
});

test('playback sounds match the actual move for forward, backward, and jump navigation', () => {
  const { moves } = parseGame('1. e4 d5 2. exd5 *');
  assert.equal(navigationSoundMove(moves, 0, 1), moves[0]);
  assert.equal(navigationSoundMove(moves, 2, 3).captured, 'p');
  assert.equal(navigationSoundMove(moves, 3, 2), moves[2]);
  assert.equal(navigationSoundMove(moves, 2, 0), moves[1]);
  assert.equal(navigationSoundMove(moves, 0, 3), moves[2]);
  assert.equal(navigationSoundMove(moves, 2, 2), null);
});

function audioContext() {
  const audio = { state: 'suspended', sampleRate: 48000, destination: {}, sources: [], resumes: 0, buffers: 0,
    resume() { this.state = 'running'; this.resumes++; return Promise.resolve(); },
    close() { this.state = 'closed'; return Promise.resolve(); },
    createBuffer() { this.buffers++; return { copyToChannel() {} }; },
    createGain() { return { gain: { value: 0 }, connect() {}, disconnect() {} }; },
    createBufferSource() { const source = { connect() {}, disconnect() {}, start() { this.started = true; }, stop() { this.stopped = true; this.onended?.(); } }; this.sources.push(source); return source; },
  };
  return audio;
}

test('audio is lazy, resumes for a user move, caches clips, and mutes existing playback', () => {
  const audio = audioContext(); let creates = 0;
  const player = new MoveSounds({ enabled: false, createContext: () => { creates++; return audio; } });
  assert.equal(player.play({ flags: 'n' }), false);
  assert.equal(creates, 0);
  player.setEnabled(true);
  const {moves}=parseGame('1. e4 d5 2. exd5 *');
  assert.equal(player.play(moves[0]),false); // no AudioContext before a gesture
  player.unlock();
  assert.equal(player.play(moves[0]), true);
  assert.equal(creates, 1);
  assert.equal(audio.resumes, 1);
  player.play(moves[1]);
  assert.equal(audio.buffers, 1);
  player.play(moves[2]);
  assert.equal(audio.buffers, 2);
  player.setEnabled(false);
  assert.ok(audio.sources.every(source => source.stopped));
  assert.equal(player.play({ flags: 'n' }), false);
  player.destroy();
  assert.equal(audio.state, 'closed');
});

test('unsupported audio and audio errors do not break board navigation', () => {
  const states = [];
  const missing = new MoveSounds({ createContext: () => null, onState: state => states.push(state) });
  missing.unlock();
  assert.equal(missing.play({ flags: 'n' }), false);
  const broken = new MoveSounds({ createContext: () => { throw new Error('Audio blocked'); }, onState: state => states.push(state) });
  broken.unlock();
  assert.equal(broken.play({ flags: 'n' }), false);
  assert.deepEqual(states, ['unavailable', 'unavailable']);
});

const move=(fen,san)=>new Chess(fen).move(san);
test('one accepted move chooses one primary sound: promotion, finish, check, capture, castle, move',()=>{
 const examples=[
  [new Chess().move('e4'),'move'],
  [parseGame('1. e4 d5 2. exd5 *').moves[2],'capture'],
  [move('r3k2r/8/8/8/8/8/8/R3K2R w KQkq - 0 1','O-O'),'castle'],
  [move('5k2/8/8/8/8/8/8/4K2R w K - 0 1','O-O+'),'check'],
  [move('7k/7p/8/7Q/8/8/8/K7 w - - 0 1','Qxh7+'),'check'],
  [move('k6r/6P1/8/8/8/8/8/K7 w - - 0 1','gxh8=Q+'),'promotion'],
  [parseGame('1. f3 e5 2. g4 Qh4# 0-1').moves[3],'complete'],
 ];
 const kinds=[],player=new MoveSounds({createContext:audioContext,onPlay:kind=>kinds.push(kind)});player.unlock();
 for(const [accepted,kind] of examples){assert.equal(moveSoundKind(accepted),kind);assert.equal(player.play(accepted),true);assert.equal(kinds.at(-1),kind);}
 assert.equal(kinds.length,examples.length);
});
test('illegal, stale and duplicated callbacks never produce a move sound; intentional revisits can',()=>{
 const played=[],player=new MoveSounds({createContext:audioContext,onPlay:kind=>played.push(kind)});player.unlock();
 const accepted=new Chess().move('e4');
 assert.equal(player.play({...accepted,to:'e5'}),false);assert.equal(player.play({...accepted,after:accepted.before}),false);
 assert.equal(player.play(accepted,{eventId:'accepted-1'}),true);assert.equal(player.play({...accepted},{eventId:'accepted-1'}),false);
 assert.equal(player.play(accepted,{eventId:'navigation-2'}),true);
 assert.equal(player.play(accepted),true);assert.equal(player.play(accepted),false);
 player.feedback('incorrect',{eventId:'attempt-1'});player.feedback('incorrect',{eventId:'attempt-1'});
 assert.deepEqual(played,['move','move','move','incorrect']);
});
test('volume and mute persist across every board, including the legacy mute preference',()=>{
 const values=new Map([['knightlab-sound','off']]),storage={getItem:key=>values.get(key),setItem:(key,value)=>values.set(key,value)};
 const audio=audioContext(),first=new MoveSounds({storage,createContext:()=>audio});assert.equal(first.enabled,false);assert.equal(first.volume,.45);
 first.setEnabled(true);first.setVolume(.27);first.unlock();first.play(new Chess().move('e4'));
 const second=new MoveSounds({storage});assert.equal(second.enabled,true);assert.equal(second.volume,.27);
 first.setVolume(0);assert.ok(audio.sources.every(s=>s.stopped));assert.equal(first.play(new Chess().move('d4')),false);
 first.setVolume(.6);first.setEnabled(false);assert.equal(new MoveSounds({storage}).enabled,false);
});
test('preloading never initializes audio or queues sounds; blocked autoplay and missing samples stay harmless',async()=>{
 let creates=0;const audio=audioContext(),states=[],player=new MoveSounds({createContext:()=>{creates++;return audio;},fetcher:async()=>({ok:false}),onState:state=>states.push(state)});
 await player.preload();assert.equal(creates,0);assert.equal(player.play(new Chess().move('e4')),false);
 player.unlock();assert.equal(player.play(new Chess().move('e4')),true);assert.equal(creates,1);
 const blocked=audioContext();blocked.resume=()=>Promise.reject(Error('NotAllowedError'));
 const mutedByBrowser=new MoveSounds({createContext:()=>blocked,onState:state=>states.push(state)});mutedByBrowser.unlock();await Promise.resolve();
 assert.equal(mutedByBrowser.play(new Chess().move('e4')),false);assert.equal(blocked.sources.length,0);assert.ok(states.includes('blocked'));
});
test('insufficient-material study positions do not announce game completion on every king move',()=>{
 const kinds=[],player=new MoveSounds({createContext:audioContext,onPlay:kind=>kinds.push(kind)});player.unlock();
 player.play(move('7k/8/8/8/8/8/8/K7 w - - 0 1','Kb1'));assert.deepEqual(kinds,['move']);
});
test('all licensed WAV samples are small, distinct, restrained mono PCM with silent tails',async()=>{
 const files=[];
 for(const kind of SOUND_KINDS){
  const bytes=await readFile(`src/assets/audio/${kind}.wav`);files.push(bytes.toString('base64'));
  assert.equal(bytes.toString('ascii',0,4),'RIFF');assert.equal(bytes.readUInt16LE(22),1);assert.equal(bytes.readUInt32LE(24),24000);assert.ok(bytes.length<21000);
  let peak=0;for(let i=44;i<bytes.length;i+=2)peak=Math.max(peak,Math.abs(bytes.readInt16LE(i))/32768);
  assert.ok(peak>.1&&peak<.7);assert.ok(Math.abs(bytes.readInt16LE(bytes.length-2))<4);
 }
 assert.equal(new Set(files).size,SOUND_KINDS.length);assert.match(await readFile('src/assets/audio/NOTICE.txt','utf8'),/Kenney.*CC0/);
});
