import {build} from 'esbuild';
import {minify as minifyHTML} from 'html-minifier-terser';
import CleanCSS from 'clean-css';
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
  'index.html',
  'generate.html',
  'view.html',
  'faq.html'
];

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
    const srcPath = path.join('', relPath);
    const destPath = path.join('docs', relPath);

    if (!fs.existsSync(srcPath)) {
      console.warn(`${srcPath} is not found`);
      continue;
    }

    const destDir = path.dirname(destPath);
    ensureDir(destDir);

    fs.copyFileSync(srcPath, destPath);
  }
}

async function minifyHTMLFilesInlineCSS() {
  console.log('Minify HTML');

  for (const file of htmlFiles) {
    const srcPath = path.join('', file);
    const destPath = path.join('docs', file);

    if (!fs.existsSync(srcPath)) {
      console.warn(`${srcPath} not found`);
      continue;
    }

    let html = fs.readFileSync(srcPath, 'utf8');

    const cssLinkRegex = /<link\b[^>]*?\bhref=["']([^"']+)["'][^>]*?\brel=["']stylesheet["'][^>]*?>/gi;

    let match;
    let inlinedCSS = '';

    while ((match = cssLinkRegex.exec(html)) !== null) {
      const cssFile = match[1].replace(/^\//, '');
      const cssPath = path.join('', cssFile);

      if (!fs.existsSync(cssPath)) {
        console.warn(`CSS not found: ${cssPath}`);
        continue;
      }

      const rawCSS = fs.readFileSync(cssPath, 'utf8');
      const minifiedCSS = new CleanCSS().minify(rawCSS).styles;
      inlinedCSS += `\n${minifiedCSS}`;
    }

    html = html.replace(cssLinkRegex, '');
    if (inlinedCSS.trim()) {
      html = html.replace(/<\/head>/i, `  <style>${inlinedCSS}</style>\n</head>`);
    }

    html = html.replace(/<script\s+type=["']application\/ld\+json["']>([\s\S]*?)<\/script>/gi, (match, jsonText) => {
        try {
          const parsed = JSON.parse(jsonText);
          const minifiedJSON = JSON.stringify(parsed);
          return `<script type="application/ld+json">${minifiedJSON}</script>`;
        } catch (e) {
          console.warn('JSON-LD parsing error. Left unchanged...');
          return match;
        }
      }
    );

    const minifiedHTML = await minifyHTML(html, {
      collapseWhitespace: true,
      removeComments: true,
      removeRedundantAttributes: true,
      removeEmptyAttributes: true,
      minifyCSS: false,
      minifyJS: true,
      sortAttributes: true,
      sortClassName: true
    });

    fs.writeFileSync(destPath, minifiedHTML, 'utf8');
  }
}

async function minifyJSFiles() {
  console.log('Minifying JS...');

  const inputDir = 'js';
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
  await minifyHTMLFilesInlineCSS();
  await minifyJSFiles();
})();