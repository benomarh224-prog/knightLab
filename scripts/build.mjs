import './bundle-pieces.mjs';
import { build } from 'esbuild';
import { mkdir, copyFile, readdir, readFile, writeFile,cp } from 'node:fs/promises';
import { PAGE_PATHS } from '../src/routes.js';
await mkdir('dist/engine', { recursive: true });
await build({
  entryPoints: ['src/app.js'],
  bundle: true,
  splitting: true,
  minify: true,
  sourcemap: true,
  outdir: 'dist',
  chunkNames: 'chunks/[name]-[hash]',
  format: 'esm',
  target: ['es2022'],
  external: ['/account-neon.js'],
});
const authBuild=await build({entryPoints:['src/account-neon.js'],bundle:true,minify:true,outfile:'dist/account-neon.js',format:'esm',target:['es2022'],metafile:true});
const licenseRoots=new Set(Object.keys(authBuild.metafile.inputs).flatMap(path=>{const marker=path.lastIndexOf('node_modules/');if(marker<0)return [];const parts=path.slice(marker+13).split('/');return [path.slice(0,marker+13)+parts.slice(0,parts[0].startsWith('@')?2:1).join('/')];}));
const authLicenses=[];
for(const root of [...licenseRoots].sort()){
  const pkg=JSON.parse(await readFile(`${root}/package.json`,'utf8'));
  const files=(await readdir(root)).filter(file=>/^(license|copying|notice)(\..*)?$/i.test(file));
  authLicenses.push(`${pkg.name} ${pkg.version} (${pkg.license||'see source'})\n${(await Promise.all(files.map(file=>readFile(`${root}/${file}`,'utf8')))).join('\n')}`);
}
await writeFile('dist/ACCOUNT-SDK-LICENSES.txt',authLicenses.join('\n\n----------------------------------------\n\n'));
await build({entryPoints:['src/theme-init.js'],bundle:true,minify:true,outfile:'dist/theme-init.js',format:'iife',target:['es2022']});
await Promise.all(['index.html', 'style.css', 'pages.css', 'home.css', 'home-refresh.css', 'studio.css', 'play-workspace.css', 'lesson.css', 'academy.css', 'navigation.css', 'analysis.css', 'simple.css', 'board-surface.css', 'usability.css', 'calm-theme.css', 'dark-theme.css', 'lesson-workspace.css', 'favicon.svg'].map(file => copyFile(`src/${file}`, `dist/${file}`)));
await cp('src/assets','dist/assets',{recursive:true});
await copyFile('src/daily-training.css','dist/daily-training.css');
await copyFile('src/board-lab.css','dist/board-lab.css');
const html=await readFile('src/index.html','utf8'),styles=[...html.matchAll(/<link rel="stylesheet" href="\/([^"]+)"\s*\/>/g)].map(match=>match[1]);
await build({stdin:{contents:styles.map(file=>`@import "./src/${file}";`).join('\n'),resolveDir:process.cwd(),loader:'css'},bundle:true,minify:true,outfile:'dist/app.css',external:['/assets/*'],legalComments:'none'});
const entryHtml=html.replace(/\s*<link rel="stylesheet" href="\/[^\"]+"\s*\/>/g,'').replace('</head>','  <link rel="stylesheet" href="/app.css"/>\n</head>');
await writeFile('dist/index.html',entryHtml);
for(const route of Object.values(PAGE_PATHS).filter(path=>path!=='/')){
  await mkdir(`dist${route}`,{recursive:true});
  await writeFile(`dist${route}index.html`,entryHtml);
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
