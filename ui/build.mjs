import {build} from 'esbuild';
import {readFile, readdir, writeFile} from 'node:fs/promises';
import path from 'node:path';

const result = await build({
  entryPoints: ['ui/handbook.jsx'],
  outfile: 'assets/handbook-ui.js',
  bundle: true,
  minify: true,
  format: 'iife',
  globalName: 'BookUI',
  metafile: true,
});

// Distribute the notices alongside the offline bundle.
const packages = new Set(['node_modules/tailwindcss']);
for (const file of Object.keys(result.metafile.inputs)) {
  const match = file.match(/^(.*node_modules\/(?:@[^/]+\/)?[^/]+)\//);
  if (match) packages.add(match[1]);
}
const notices = new Map();
for (const dir of [...packages].sort()) {
  const metadata = JSON.parse(await readFile(path.join(dir,'package.json'),'utf8'));
  for (const file of (await readdir(dir)).filter(name=>/^(licen[cs]e|notice)(\.(txt|md))?$/i.test(name))) {
    const content = (await readFile(path.join(dir,file),'utf8')).replace(/\r\n/g,'\n').trim();
    const names = notices.get(content) || [];
    names.push(metadata.name+' '+metadata.version);
    notices.set(content,names);
  }
}
await writeFile('assets/third-party-notices.txt',[...notices].map(([license,names])=>names.join(', ')+'\n\n'+license).join('\n\n------------\n\n')+'\n');
