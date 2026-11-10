// Stream a small, filtered subset of the official CC0 export. No whole-database download.
import{Readable,Transform}from'node:stream';import{createZstdDecompress,constants}from'node:zlib';import{createInterface}from'node:readline';import{mkdir,writeFile}from'node:fs/promises';import{Chess}from'chess.js';
export const THEMES={
 deflection:['deflection','attraction'],defenders:['capturingDefender','interference','clearance'],quiet:['quietMove','zugzwang'],
 forks:['fork','discoveredAttack'],pins:['pin','skewer','xRayAttack'],sacrifice:['sacrifice'],mate:['mateIn3','mateIn4','mateIn5'],
 promotion:['promotion','underPromotion','advancedPawn'],endgame:['endgame'],defense:['defensiveMove','equality'],
};
const url='https://database.lichess.org/lichess_db_puzzle.csv.zst',cap=8,slots=new Map(),records=[],seen=new Set(),games=new Set();
for(const theme of Object.keys(THEMES))for(const level of['challenging','advanced','expert'])for(const side of['w','b'])slots.set(`${theme}:${level}:${side}`,0);
function csv(line){const values=[];let value='',quoted=false;for(let i=0;i<line.length;i++){const c=line[i];if(c==='"'){if(quoted&&line[i+1]==='"'){value+='"';i++;}else quoted=!quoted;}else if(c===','&&!quoted){values.push(value);value='';}else value+=c;}values.push(value);return values;}
const controller=new AbortController(),response=await fetch(url,{signal:controller.signal});if(!response.ok)throw Error('Export download failed: '+response.status);
// Node's decoder ends on the leading skippable metadata frame. Strip that
// frame before handing the ordinary Zstandard data frame to the decoder.
let prefix=Buffer.alloc(0),started=false;
const header=new Transform({transform(chunk,_encoding,done){if(started){done(null,chunk);return;}prefix=Buffer.concat([prefix,chunk]);if(prefix.length<8){done();return;}const magic=prefix.readUInt32LE(0),skip=(magic&0xfffffff0)===0x184d2a50?8+prefix.readUInt32LE(4):0;if(prefix.length<skip){done();return;}started=true;done(null,prefix.subarray(skip));}});
const compressed=Readable.fromWeb(response.body),decompressed=compressed.pipe(header).pipe(createZstdDecompress({params:{[constants.ZSTD_d_windowLogMax]:31}}));
compressed.on('error',()=>{});decompressed.on('error',error=>console.error('Decompression:',error.message));const lines=createInterface({input:decompressed,crlfDelay:Infinity});let scanned=0,bytes=0;compressed.on('data',chunk=>bytes+=chunk.length);
try{for await(const line of lines){
 if(!scanned++&&line.startsWith('PuzzleId,'))continue;if(scanned>600000)break;
 const[id,before,moves,ratingRaw,deviation,popularity,plays,tags,game,opening]=csv(line),rating=+ratingRaw,uci=moves?.split(' '),themes=tags?.split(' ');
 if(rating<1900||rating>2699||+deviation>90||+popularity<80||+plays<100||!uci||uci.length<6||uci.length>12||themes.includes('mateIn1')||themes.includes('mateIn2'))continue;
 const level=rating<2100?'challenging':rating<2300?'advanced':'expert',gameId=game?.match(/lichess\.org\/(?:game\/)?([\w]{8})/)?.[1];if(!gameId||games.has(gameId))continue;
 let board;try{board=new Chess(before);const setup=uci[0];board.move({from:setup.slice(0,2),to:setup.slice(2,4),promotion:setup[4]});}catch{continue;}
 const fen=board.fen(),side=board.turn(),pieces=board.board().flat().filter(Boolean).length,eligible=Object.keys(THEMES).filter(t=>THEMES[t].some(tag=>themes.includes(tag))&&(pieces>=(['endgame','promotion'].includes(t)?6:12))&&slots.get(`${t}:${level}:${side}`)<cap);
 if(!eligible.length||seen.has(fen.split(' ').slice(0,4).join(' '))||board.isGameOver()||board.moves().some(m=>m.endsWith('#')))continue;
 const primary=eligible.sort((a,b)=>slots.get(`${a}:${level}:${side}`)-slots.get(`${b}:${level}:${side}`))[0];
 const selected=uci.slice(1);if(selected.length%2===0)continue;let san=[];try{for(const move of selected)san.push(board.move({from:move.slice(0,2),to:move.slice(2,4),promotion:move[4]}).san);}catch{continue;}
 const slot=`${primary}:${level}:${side}`;slots.set(slot,slots.get(slot)+1);seen.add(fen.split(' ').slice(0,4).join(' '));games.add(gameId);
 records.push({id:'calc-'+id,puzzleId:id,group:primary,level,fen,uci:selected,moves:san,rating,ratingDeviation:+deviation,popularity:+popularity,plays:+plays,themes,sourceFen:before,setup:uci[0],gameUrl:game,openingTags:opening||'',pieces});
 if(records.length%60===0)console.log(JSON.stringify({candidates:records.length,scanned,compressedMB:Math.round(bytes/1048576),minimumSlot:Math.min(...slots.values())}));
 if([...slots.values()].every(n=>n>=cap))break;
}}finally{lines.close();compressed.destroy();decompressed.destroy();controller.abort();}
if(!scanned)throw Error('No CSV records decoded');
await mkdir('.sites-local',{recursive:true});await writeFile('.sites-local/calculation-candidates.json',JSON.stringify(records,null,2)+'\n');
await writeFile('.sites-local/calculation-source.json',JSON.stringify({source:url,license:'CC0-1.0',downloadedOn:'2026-11-10',scanned,compressedBytes:bytes,candidates:records.length,slots:Object.fromEntries(slots)},null,2)+'\n');
console.log(JSON.stringify({candidates:records.length,scanned,minimumSlot:Math.min(...slots.values()),shortSlots:[...slots].filter(([,n])=>n<4)}));
