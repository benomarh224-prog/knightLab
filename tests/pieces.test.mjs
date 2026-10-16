import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {pieceSvg} from '../src/pieces.js';
import artwork from '../src/chessnut-artwork.json' with {type:'json'};

test('all twelve Chessnut pieces paint inline with the original drawing and no image loading dependency',async()=>{
 const sources=JSON.parse(await readFile('src/assets/pieces/chessnut/SOURCES.json','utf8'));
 assert.equal(Object.keys(artwork).length,12);
 for(const item of sources.assets){
  const file=item.file.split('/').at(-1),id=file.slice(0,-4),original=await readFile(`src/assets/pieces/chessnut/pieces/${file}`,'utf8');
  assert.equal(createHash('sha256').update(original).digest('hex'),item.sha256,file);
  assert.equal(artwork[id],original);
  const rendered=pieceSvg({color:id[0],type:id[1].toLowerCase()});
  assert.match(rendered,/^<svg class="piece chessnut-piece/);assert.match(rendered,/aria-hidden="true" focusable="false" draggable="false"/);
  assert.equal(rendered.replace(/^<svg [^]*? draggable="false" /,'<svg '),original,file);
  assert.doesNotMatch(rendered,/<img\b|<image\b|(?:src|href)=|\bid=|url\(/i,file);
 }
});

test('repeated piece rendering is deterministic and preserves square hit testing and animation hooks',()=>{
 for(const color of ['w','b'])for(const type of ['p','r','n','b','q','k']){
  const piece={color,type};assert.equal(pieceSvg(piece),pieceSvg(piece));
  assert.ok(pieceSvg(piece).includes(`${color==='w'?'white':'black'}-piece`));
 }
 for(const value of [null,undefined,{}, {color:'x',type:'p'},{color:'w',type:''},{color:'b',type:'king'},{color:'w',type:'<img>'}])assert.equal(pieceSvg(value),'');
});
