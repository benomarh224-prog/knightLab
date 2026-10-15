import { build } from 'esbuild';
import { mkdir, copyFile, readdir, readFile, cp } from 'node:fs/promises';
import { PAGE_PATHS } from '../src/routes.js';
await mkdir('dist/engine', { recursive: true });
await build({ entryPoints: ['src/app.js'], bundle: true, minify: true, sourcemap: true, outfile: 'dist/app.js', format: 'esm', target: ['es2022'] });
await Promise.all(['index.html', 'style.css', 'pages.css', 'home.css', 'lesson.css', 'academy.css', 'favicon.svg'].map(file => copyFile(`src/${file}`, `dist/${file}`)));
await cp('src/assets','dist/assets',{recursive:true});
for(const route of Object.values(PAGE_PATHS).filter(path=>path!=='/')){
  await mkdir(`dist${route}`,{recursive:true});
  await copyFile('src/index.html',`dist${route}index.html`);
}
const files = await readdir('node_modules/stockfish/bin');
const engine = files.find(file => /lite-single\.js$/.test(file));
if (!engine) throw new Error('Stockfish lite single-threaded engine is missing.');
await copyFile(`node_modules/stockfish/bin/${engine}`, `dist/engine/${engine}`);
await copyFile(`node_modules/stockfish/bin/${engine.replace('.js', '.wasm')}`, `dist/engine/${engine.replace('.js', '.wasm')}`);
await copyFile('node_modules/chess.js/LICENSE', 'dist/CHESS-JS-LICENSE.txt');
const license = (await readdir('node_modules/stockfish')).find(file => /^(copying|license)(\.txt|\.md)?$/i.test(file));
if (license) await copyFile(`node_modules/stockfish/${license}`, 'dist/STOCKFISH-LICENSE.txt');
else await copyFile('src/STOCKFISH-LICENSE.txt', 'dist/STOCKFISH-LICENSE.txt');
await copyFile('src/THIRD-PARTY-NOTICES.txt', 'dist/THIRD-PARTY-NOTICES.txt');
await copyFile('src/OPENINGS-LICENSE.txt', 'dist/OPENINGS-LICENSE.txt');
console.log(`Built Knightlab with ${engine}.`);
