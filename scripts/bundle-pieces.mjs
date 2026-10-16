import { readFile, writeFile } from 'node:fs/promises';
// Bundle the original vectors into the app so a board repaint never waits for
// image requests or SVG image decoding (which can flash blank on mobile Safari).
const artwork={};
for(const color of ['w','b'])for(const type of ['K','Q','R','B','N','P']){
 const id=color+type;
 artwork[id]=await readFile(new URL(`../src/assets/pieces/chessnut/pieces/${id}.svg`,import.meta.url),'utf8');
}
await writeFile(new URL('../src/chessnut-artwork.json',import.meta.url),JSON.stringify(artwork,null,2)+'\n');
