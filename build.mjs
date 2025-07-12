import {build} from 'esbuild';
import {minify as minifyHTML} from 'html-minifier-terser';
import {execSync} from 'child_process';
import fs from 'fs';
import path from 'path';

const staticFiles = [
  'CNAME',
  'robots.txt',
  'sitemap.xml',
  'img/cert.svg',
  'favicon.svg'
];

const htmlFiles = [
  {file: 'index.html', css: 'css/styles.index.min.css'},
  {file: 'generate.html', css: 'css/styles.generate.min.css'},
  {file: 'view.html', css: 'css/styles.view.min.css'},
  {file: 'faq.html', css: 'css/styles.faq.min.css'}
];

const cssGroups = {
  index: [
    'src/css/styles.css'
  ],
  generate: [
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
  ],
  faq: [
    'src/css/styles.css',
  ]
};

function clearDir(dir) {
  if (!fs.existsSync(dir)) {
    return;
  }
  for (const file of fs.readdirSync(dir)) {
    const fullPath = path.join(dir, file);
    fs.rmSync(fullPath, {recursive: true, force: true});
  }
}

function ensureDir(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, {recursive: true});
  }
}

function copyStaticFiles() {
  console.log('Copy static files');

  for (const relPath of staticFiles) {
    const srcPath = path.join('src', relPath);
    const destPath = path.join('docs', relPath);

    if (!fs.existsSync(srcPath)) {
      console.warn(`${filename} is not found`);
      continue;
    }

    const destDir = path.dirname(destPath);
    ensureDir(destDir);

    fs.copyFileSync(srcPath, destPath);
  }
}

async function minifyHTMLFiles() {
  console.log('Minifying HTML');

  for (const {file, css} of htmlFiles) {
    const srcPath = path.join('src', file);
    const destPath = path.join('docs', file);

    if (!fs.existsSync(srcPath)) {
      console.warn(`${file} is not found`);
      continue;
    }

    let html = fs.readFileSync(srcPath, 'utf8');
    html = html.replace(/<link\s+[^>]*rel=["']stylesheet["'][^>]*>/gi, '');

    const cssTag = `<link rel="stylesheet" href="${css}">`;
    html = html.replace(/<\/head>/i, `  ${cssTag}\n</head>`);

    const minified = await minifyHTML(html, {
      collapseWhitespace: true,
      removeComments: true,
      removeRedundantAttributes: true,
      removeEmptyAttributes: true,
      minifyCSS: true,
      minifyJS: true,
      sortAttributes: true,
      sortClassName: true
    });

    fs.writeFileSync(destPath, minified, 'utf8');
  }
}

function mergeAndMinifyCSSFiles() {
  console.log('Minifying CSS...');

  for (const [name, files] of Object.entries(cssGroups)) {
    const concatenated = files
      .map(path => fs.readFileSync(path, 'utf8'))
      .join('\n');

    fs.writeFileSync(`docs/styles.${name}.css`, concatenated);
    execSync(`npx cleancss -o docs/css/styles.${name}.min.css docs/styles.${name}.css`);
    fs.unlinkSync(`docs/styles.${name}.css`);
  }
}

async function minifyJSFiles() {
  console.log('Minifying JS...');

  const inputDir = 'src/js';
  const outputDir = 'docs/js';

  ensureDir(outputDir);

  const files = fs.readdirSync(inputDir)
    .filter(f => f.endsWith('.js'));

  for (const file of files) {
    const inputPath = path.join(inputDir, file);
    const outputPath = path.join(outputDir, file);

    await build({
      entryPoints: [inputPath],
      bundle: true,
      minify: true,
      outfile: outputPath
    });
  }
}

(async () => {
  clearDir('docs');
  ensureDir('docs');

  copyStaticFiles();
  mergeAndMinifyCSSFiles();
  await minifyJSFiles();
  await minifyHTMLFiles();
})();