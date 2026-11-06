import {readFile,writeFile} from 'node:fs/promises';import {createHash} from 'node:crypto';
const root=new URL('../src/assets/audio/',import.meta.url),taps={},sources=[];
for(const name of ['chess-tap','wood-landing']){
 const wav=await readFile(new URL('recordings/'+name+'.wav',root)),source=JSON.parse(await readFile(new URL('recordings/'+name+'.json',root),'utf8'));
 if(createHash('sha256').update(wav).digest('hex')!==source.sha256)throw Error('Changed recording '+name);
 if(wav.readUInt16LE(22)!==1||wav.readUInt32LE(24)!==24000||wav.readUInt16LE(34)!==16)throw Error('Unsupported source PCM');
 taps[name]=wav.subarray(44).toString('base64');sources.push(source);
}
await writeFile(new URL('../src/chess-tap-data.js',import.meta.url),'// Derived CC0 recordings; see assets/audio/NOTICE.txt. 24 kHz, mono PCM16.\nexport const RECORDED_TAPS='+JSON.stringify(taps)+';\n');
const {woodenSamples}=await import('../src/wood-audio.js'),rate=24000,files=[];
for(const kind of ['move','capture','castle','check','promotion','complete','incorrect']){
 const samples=woodenSamples(rate,kind),buffer=Buffer.alloc(44+samples.length*2);
 buffer.write('RIFF');buffer.writeUInt32LE(buffer.length-8,4);buffer.write('WAVEfmt ',8);buffer.writeUInt32LE(16,16);buffer.writeUInt16LE(1,20);buffer.writeUInt16LE(1,22);buffer.writeUInt32LE(rate,24);buffer.writeUInt32LE(rate*2,28);buffer.writeUInt16LE(2,32);buffer.writeUInt16LE(16,34);buffer.write('data',36);buffer.writeUInt32LE(samples.length*2,40);
 samples.forEach((v,i)=>buffer.writeInt16LE(Math.round(v*32767),44+i*2));await writeFile(new URL(kind+'.wav',root),buffer);
 files.push({kind,duration:samples.length/rate,sha256:createHash('sha256').update(buffer).digest('hex')});
}
await writeFile(new URL('NOTICE.txt',root),'Recorded chess-piece sounds (CC0 1.0), edited for ROQVYN.\n\nchess_move_on_alabaster.wav by mh2o\nhttps://freesound.org/people/mh2o/sounds/351518/\nChess piece setting 1 (queen on a wooden board) by Alnotreally\nhttps://freesound.org/people/Alnotreally/sounds/801349/\n\nPublic HQ previews were excerpted, converted to mono, filtered, normalized,\nfaded and resampled to 24 kHz. Event sounds mix these two recordings; no\noscillators, harsh beeps, pitch shifts or Chess.com/Chessigma audio are used.\nCC0 permits modification and redistribution, including commercial use.\nhttps://creativecommons.org/publicdomain/zero/1.0/\nSee SOURCES.json and recordings/ for hashes, excerpts and source provenance.\n');
await writeFile(new URL('LICENSE.txt',root),'The source recordings by mh2o and Alnotreally are available under CC0 1.0.\nROQVYN dedicates its edits, mixes and derived WAV clips to CC0 1.0 as well.\nhttps://creativecommons.org/publicdomain/zero/1.0/\n');
await writeFile(new URL('SOURCES.json',root),JSON.stringify({version:'foley-3',license:'CC0-1.0',sources,files,preparation:'node scripts/prepare-foley-audio.mjs',method:'Real chess impacts with restrained event-specific mixes. No synthesized tones.'},null,2)+'\n');
console.log(JSON.stringify({version:'foley-3',files}));
