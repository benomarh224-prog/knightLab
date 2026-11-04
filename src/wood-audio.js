// Original, short dry chess taps. No recordings, sampled instruments or beeps.
export function woodenSamples(sampleRate,kind='move'){
  if(typeof kind==='boolean')kind=kind?'capture':'move';
  const duration={move:.085,capture:.11,castle:.16,check:.14,promotion:.2,complete:.24,incorrect:.09}[kind]||.085;
  const result=new Float32Array(Math.ceil(sampleRate*duration));
  const hits=kind==='castle'?[[0,.8],[.065,.55]]:kind==='promotion'?[[0,.65],[.09,.4]]:kind==='complete'?[[0,.6],[.13,.42]]:kind==='check'?[[0,.85],[.07,.18]]:[[0,kind==='incorrect'?.35:kind==='capture'?1:.8]];
  for(const [start,gain] of hits){
    let seed=32941,low=0,slow=0;const full=kind==='capture'||kind==='check',f=kind==='incorrect'?370:full?570:740;
    for(let i=Math.floor(start*sampleRate);i<result.length;i++){
      const t=i/sampleRate-start;seed=(seed*16807)%2147483647;
      low=.58*low+.42*(seed/1073741823.5-1);slow=.92*slow+.08*low;
      const attack=Math.min(1,t/.0006),body=Math.sin(2*Math.PI*f*t)*Math.exp(-(full?105:135)*t);
      result[i]+=gain*attack*(.62*(low-slow)*Math.exp(-145*t)+.28*body+.11*Math.sin(2*Math.PI*f*.46*t)*Math.exp(-100*t));
    }
  }
  let peak=0;for(const value of result)peak=Math.max(peak,Math.abs(value));
  const target=kind==='incorrect'?.22:kind==='capture'?.57:.48;
  for(let i=0;i<result.length;i++)result[i]=result[i]/(peak||1)*target*Math.min(1,(result.length-i-1)/(sampleRate*.008));
  return result;
}
