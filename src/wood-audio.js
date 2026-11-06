import {RECORDED_TAPS} from './chess-tap-data.js';
// Real CC0 chess-piece recordings. Both WAV assets and synchronous fallback
// use this same mix: a crisp landing with a small, natural wooden body.
const cores=new Map();
function recording(name,rate){
  const key=name+rate;if(cores.has(key))return cores.get(key);
  const raw=atob(RECORDED_TAPS[name]),original=new Float32Array(raw.length/2);
  for(let i=0;i<original.length;i++){let v=raw.charCodeAt(i*2)|(raw.charCodeAt(i*2+1)<<8);if(v>=32768)v-=65536;original[i]=v/32768;}
  const samples=new Float32Array(Math.ceil(original.length*rate/24000));
  for(let i=0;i<samples.length;i++){const x=i*24000/rate,j=Math.floor(x),t=x-j;samples[i]=(original[j]||0)*(1-t)+(original[j+1]||0)*t;}
  cores.set(key,samples);return samples;
}
export function woodenSamples(sampleRate,kind='move'){
  if(typeof kind==='boolean')kind=kind?'capture':'move';
  const duration={move:.105,capture:.16,castle:.22,check:.17,promotion:.26,complete:.32,incorrect:.1}[kind]||.105;
  const result=new Float32Array(Math.ceil(sampleRate*duration));
  const hits=kind==='castle'?[[0,.85],[.078,.62]]:kind==='promotion'?[[0,.7],[.105,.46]]:kind==='complete'?[[0,.65],[.155,.4]]:[[0,1]];
  const tap=recording('chess-tap',sampleRate),wood=recording('wood-landing',sampleRate);
  for(const [start,gain]of hits){
    const offset=Math.round(start*sampleRate),full=kind==='capture'||kind==='check';
    for(let i=0;i<Math.max(tap.length,wood.length)&&i+offset<result.length;i++){
      // No oscillator or pitch shift: transients stay recognizably physical.
      result[i+offset]+=gain*((tap[i]||0)*(full?.85:1)+(wood[i]||0)*(full?.38:.13));
    }
  }
  if(kind==='incorrect'){let low=0;const k=1-Math.exp(-2*Math.PI*850/sampleRate);for(let i=0;i<result.length;i++){low+=k*(result[i]-low);result[i]=low;}}
  let peak=0;for(const value of result)peak=Math.max(peak,Math.abs(value));
  const target={move:.56,capture:.64,castle:.52,check:.59,promotion:.5,complete:.48,incorrect:.18}[kind]||.56;
  for(let i=0;i<result.length;i++)result[i]=result[i]/(peak||1)*target*Math.min(1,i/(sampleRate*.0005),(result.length-i-1)/(sampleRate*.01));
  return result;
}
