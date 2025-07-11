import { build } from 'esbuild';
import { execSync } from 'child_process';
import fs from 'fs';

const cssGroups = {
  gen: [
    'src/css/styles.css',
    'src/css/disclaimer.css',
    'src/css/tabs.css',
    'src/css/form.css'
  ],
  view: [
    'src/css/styles.css',
    'src/css/disclaimer.css',
    'src/css/tabs.css',
    'src/css/form.css',
    'src/css/view.css',
  ]
};

async function buildJS() {
  console.log('Building JS...');

  await build({
    entryPoints: ['src/js/forge.gen.js'],
    bundle: true,
    minify: true,
    outfile: 'build/forge.gen.min.js'
  });

  await build({
    entryPoints: ['src/js/forge.view.js'],
    bundle: true,
    minify: true,
    outfile: 'build/forge.view.min.js'
  });
}

function buildCSS() {
  console.log('Minifying CSS...');

  for (const [name, files] of Object.entries(cssGroups)) {
    const concatenated = files
      .map(path => fs.readFileSync(path, 'utf8'))
      .join('\n');

    fs.writeFileSync(`styles.${name}.css`, concatenated);

    execSync(`npx cleancss -o styles.${name}.min.css styles.${name}.css`);

    fs.unlinkSync(`styles.${name}.css`);
  }
}

(async () => {
  buildCSS();
  //await buildJS();
})();