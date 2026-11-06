import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {pieceSvg} from '../src/pieces.js';
import artwork from '../src/maestro-artwork.json' with {type:'json'};

test('all twelve attributed Maestro BW vectors retain the pinned originals and paint without an image request',async()=>{
 const sources=JSON.parse(await readFile('src/assets/pieces/maestro-bw/SOURCES.json','utf8'));
 assert.equal(sources.upstreamLicense,'CC-BY-NC-SA-4.0');assert.equal(sources.adaptationLicense,'CC-BY-4.0');
 assert.equal(Object.keys(artwork).length,12);
 for(const item of sources.assets){
  const file=item.file.split('/').at(-1),id=file.slice(0,-4),original=await readFile(`src/assets/pieces/maestro-bw/${file}`,'utf8');
  assert.equal(createHash('sha256').update(original).digest('hex'),item.sha256,file);
  assert.equal(artwork[id],original);
  const rendered=pieceSvg({color:id[0],type:id[1].toLowerCase()});
  assert.match(rendered,/^<svg class="piece maestro-piece/);assert.match(rendered,/aria-hidden="true" focusable="false" draggable="false"/);
  assert.equal(rendered.replace(/^<svg [^]*? draggable="false" /,'<svg ').replace(/maestro-\d+-/g,'').replace(/viewBox="[^"]*"/,'viewBox="0 0 50 50"'),original,file);
  assert.doesNotMatch(rendered,/<img\b|<image\b|<script\b|<foreignObject\b|(?:src|href)="(?:https?:|data:)/i,file);
  const ids=new Set([...rendered.matchAll(/\bid="([^"]+)"/g)].map(m=>m[1]));
  for(const ref of rendered.matchAll(/(?:url\(#|href="#)([^)"]+)/g))assert.ok(ids.has(ref[1]),file+' has an unresolved gradient');
 }
});

test('repeated pieces isolate their gradient IDs while retaining the same drawing and animation hooks',()=>{
 for(const color of ['w','b'])for(const type of ['p','r','n','b','q','k']){
  const piece={color,type},first=pieceSvg(piece),second=pieceSvg(piece);
  assert.equal(first.replace(/maestro-\d+-/g,''),second.replace(/maestro-\d+-/g,''));
  const ids=new Set([...first.matchAll(/\bid="([^"]+)"/g)].map(m=>m[1]));
  for(const m of second.matchAll(/\bid="([^"]+)"/g))assert.equal(ids.has(m[1]),false);
  assert.ok(pieceSvg(piece).includes(`${color==='w'?'white':'black'}-piece`));
 }
 for(const value of [null,undefined,{}, {color:'x',type:'p'},{color:'w',type:''},{color:'b',type:'king'},{color:'w',type:'<img>'}])assert.equal(pieceSvg(value),'');
});
