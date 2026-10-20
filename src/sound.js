import {Chess} from 'chess.js';
export const SOUND_KINDS=['move','capture','castle','check','promotion','complete','incorrect'];
const KEY='roqvyn-audio-v1';
const volumeValue=value=>Math.max(0,Math.min(1,Number.isFinite(value)?value:.45));
export function moveSoundKind(move,{completion=false}={}){
  if(move.promotion||/p/.test(move.flags||''))return 'promotion';
  if(completion||move.san?.endsWith('#'))return 'complete';
  if(move.san?.includes('+'))return 'check';
  if(move.captured||/[ce]/.test(move.flags||''))return 'capture';
  if(/[kq]/.test(move.flags||''))return 'castle';
  return 'move';
}
// Soft, damped wood/felt fallback. Normal playback uses bundled Kenney CC0 recordings.
export function woodenSamples(sampleRate,kind='move'){
  if(typeof kind==='boolean')kind=kind?'capture':'move';
  const duration=kind==='complete'?.4:kind==='promotion'?.34:kind==='incorrect'?.15:.25;
  const samples=new Float32Array(Math.ceil(sampleRate*duration));let seed=17389,low=0;
  const hits=kind==='castle'?[[0,.45],[.065,.3]]:kind==='promotion'?[[0,.4],[.075,.23],[.145,.2]]:kind==='complete'?[[0,.36],[.14,.24]]:kind==='check'?[[0,.5],[.085,.14]]:[[0,kind==='capture'?.58:kind==='incorrect'?.22:.46]];
  for(let i=0;i<samples.length;i++){
    const t=i/sampleRate;seed=(seed*16807)%2147483647;low=.76*low+.24*(seed/1073741823.5-1);
    for(const [start,gain] of hits){const time=t-start;if(time<0)continue;
      const attack=Math.min(1,time/.0015),pitch=kind==='capture'?350:kind==='incorrect'?240:470;
      samples[i]+=gain*attack*(.35*Math.sin(2*Math.PI*pitch*time)*Math.exp(-60*time)+.18*Math.sin(2*Math.PI*1260*time)*Math.exp(-95*time)+low*Math.exp(-100*time));
    }
    samples[i]*=Math.min(1,(duration-t)/.025);
  }
  return samples;
}
export function navigationSoundMove(moves,previous,next){return previous===next?null:moves[(next<previous?previous:next)-1]||null;}
export class MoveSounds{
  constructor({enabled=true,volume=.45,storage=null,createContext=null,fetcher=globalThis.fetch,onState=()=>{},onPlay=()=>{}}={}){
    this.enabled=enabled;this.volume=volumeValue(volume);this.storage=storage;this.fetcher=fetcher;
    this.context=null;this.master=null;this.unlocked=false;this.buffers=new Map();this.bytes=new Map();this.voices=new Set();this.events=new Set();this.moves=new WeakSet();this.onState=onState;this.onPlay=onPlay;
    try{const saved=JSON.parse(storage?.getItem(KEY)||'null');if(saved&&typeof saved.enabled==='boolean'){this.enabled=saved.enabled;this.volume=volumeValue(saved.volume);}else if(storage?.getItem('knightlab-sound')==='off')this.enabled=false;}catch{}
    this.createContext=createContext||(()=>{const Audio=globalThis.AudioContext||globalThis.webkitAudioContext;return Audio?new Audio({latencyHint:'interactive'}):null;});
  }
  persist(){try{this.storage?.setItem(KEY,JSON.stringify({enabled:this.enabled,volume:this.volume}));this.storage?.setItem('knightlab-sound',this.enabled?'on':'off');}catch{}}
  setEnabled(enabled){this.enabled=Boolean(enabled);this.persist();if(!this.enabled)this.stop();}
  setVolume(value){this.volume=volumeValue(value);this.persist();if(this.master)this.master.gain.value=this.volume**1.4;if(!this.volume)this.stop();}
  preload(){
    if(this.loading)return this.loading;
    this.loading=Promise.allSettled(SOUND_KINDS.map(async kind=>{
      const response=await this.fetcher?.(`/assets/audio/${kind}.wav`);if(!response?.ok)throw Error('Sample unavailable');
      const bytes=await response.arrayBuffer();this.bytes.set(kind,bytes);await this.decode(kind,bytes);
    }));return this.loading;
  }
  async decode(kind,bytes){
    const context=this.context;if(!context?.decodeAudioData)return;
    try{const buffer=await context.decodeAudioData(bytes.slice(0));if(this.context===context)this.buffers.set(kind,buffer);}catch{/* Keep procedural fallback. */}
  }
  // Only trusted pointer/keyboard gestures call unlock, never engine updates.
  unlock(){
    try{
      if(!this.context){
        this.context=this.createContext();if(!this.context){this.onState('unavailable');return false;}
        this.master=this.context.createGain();this.master.gain.value=this.volume**1.4;this.master.connect(this.context.destination);
        this.context.onstatechange=()=>this.onState(this.context?.state||'closed');
        for(const [kind,bytes] of this.bytes)this.decode(kind,bytes);
      }
      this.unlocked=true;
      if(['suspended','interrupted'].includes(this.context.state))Promise.resolve(this.context.resume()).catch(()=>this.onState('blocked'));
      return true;
    }catch{this.onState('unavailable');return false;}
  }
  play(move,options={}){
    if(!move||typeof move!=='object'||!move.before||!move.after||!move.from||!move.to)return false;
    if(options.eventId?this.events.has(options.eventId):this.moves.has(move))return false;
    const original=move;let chess;
    try{chess=new Chess(move.before);const accepted=chess.move({from:move.from,to:move.to,promotion:move.promotion});if(!accepted||chess.fen()!==move.after)return false;move={...move,san:accepted.san,flags:accepted.flags,promotion:accepted.promotion,captured:accepted.captured};}catch{return false;}
    const completed=chess.isGameOver()&&!new Chess(move.before).isGameOver();
    const played=this.emit(moveSoundKind(move,{completion:options.completion||completed}));
    if(played){if(options.eventId)this.remember(options.eventId);else this.moves.add(original);}return played;
  }
  remember(id){this.events.add(id);if(this.events.size>256)this.events.delete(this.events.values().next().value);}
  feedback(kind='incorrect',options={}){
    if(!['incorrect','complete'].includes(kind)||options.eventId&&this.events.has(options.eventId))return false;
    const played=this.emit(kind);if(played&&options.eventId)this.remember(options.eventId);return played;
  }
  emit(kind){
    if(!this.enabled||!this.volume||!this.unlocked||!this.context||this.context.state!=='running')return false;
    try{
      if(!this.buffers.has(kind)){const samples=woodenSamples(this.context.sampleRate,kind),buffer=this.context.createBuffer(1,samples.length,this.context.sampleRate);buffer.copyToChannel(samples,0);this.buffers.set(kind,buffer);}
      const source=this.context.createBufferSource();source.buffer=this.buffers.get(kind);source.connect(this.master);
      source.onended=()=>{source.disconnect();this.voices.delete(source);};
      if(this.voices.size>=3)this.voices.values().next().value.stop();
      this.voices.add(source);source.start();this.onPlay(kind);return true;
    }catch{this.onState('unavailable');return false;}
  }
  stop(){for(const source of this.voices){try{source.stop();}catch{}}this.voices.clear();}
  destroy(){this.stop();if(this.context){this.context.onstatechange=null;Promise.resolve(this.context.close()).catch(()=>{});}this.context=null;this.master=null;this.unlocked=false;this.buffers.clear();}
}
