import {build} from 'esbuild';
import {minify as minifyHTML} from 'html-minifier-terser';
import CleanCSS from 'clean-css';
import {optimize as optimizeSVG} from 'svgo';
import * as cheerio from 'cheerio';
import fs from 'fs';
import path from 'path';

const staticFiles = [
  'CNAME',
  'robots.txt',
  'sitemap.xml',
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
  console.log('Copying static files');

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
  console.log('Minifying HTML');

  for (const file of htmlFiles) {
    const srcPath = path.join('', file);
    const destPath = path.join('docs', file);

    if (!fs.existsSync(srcPath)) {
      console.warn(`${srcPath} not found`);
      continue;
    }

    const rawHTML = fs.readFileSync(srcPath, 'utf8');
    const $ = cheerio.load(rawHTML);

    let combinedCSS = '';
    $('link[rel="stylesheet"]').each((_, el) => {
      const href = $(el).attr('href');
      if (!href) return;

      const cssPath = path.join('', href.replace(/^\//, ''));
      if (!fs.existsSync(cssPath)) {
        console.warn(`${cssPath} is not found`);
        return;
      }

      const rawCSS = fs.readFileSync(cssPath, 'utf8');
      const minifiedCSS = new CleanCSS().minify(rawCSS).styles;
      combinedCSS += minifiedCSS;
      $(el).remove();
    });

    if (combinedCSS.trim()) {
      $('head').append(`<style>${combinedCSS}</style>`);
    }

    $('script[type="application/ld+json"]').each((_, el) => {
      const rawJson = $(el).html();
      try {
        const parsed = JSON.parse(rawJson);
        const minifiedJson = JSON.stringify(parsed);
        $(el).text(minifiedJson);
      } catch (e) {
        console.warn(`JSON-LD parsing error in ${file}. Left unchanged...`);
      }
    });

    const finalHTML = await minifyHTML($.html(), {
      collapseWhitespace: true,
      removeComments: true,
      removeRedundantAttributes: true,
      removeEmptyAttributes: true,
      minifyCSS: false,
      minifyJS: true,
      sortAttributes: true,
      sortClassName: true
    });

    fs.writeFileSync(destPath, finalHTML, 'utf8');
  }
}

async function minifySVGs() {
  console.log('Minifying SVGs...');

  const srcDir = path.join('', 'img');
  const destDir = path.join('docs', 'img');

  if (!fs.existsSync(srcDir)) {
    console.warn(`${srcDir} is not found`);
    return;
  }

  fs.mkdirSync(destDir, {recursive: true});

  const files = fs.readdirSync(srcDir).filter(f => f.endsWith('.svg'));

  for (const file of files) {
    const inputPath = path.join(srcDir, file);
    const outputPath = path.join(destDir, file);

    const rawSVG = fs.readFileSync(inputPath, 'utf8');
    const result = optimizeSVG(rawSVG, {
      path: inputPath,
      multipass: true
    });

    fs.writeFileSync(outputPath, result.data, 'utf8');
  }
}

async function minifyFavicon() {
  console.log('Minifying Favicon...');

  const faviconSVGPath = path.join('', 'favicon.svg');
  const faviconSVGDest = path.join('docs', 'favicon.svg');

  if (!fs.existsSync(faviconSVGPath)) {
    console.warn(`${faviconSVGPath} is not found`);
    return;
  }

  const rawFaviconSVG = fs.readFileSync(faviconSVGPath, 'utf8');
  const optimizedFavicon = optimizeSVG(rawFaviconSVG, {path: faviconSVGPath, multipass: true});
  fs.writeFileSync(faviconSVGDest, optimizedFavicon.data, 'utf8');
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
  await minifySVGs();
  await minifyFavicon();
  await minifyHTMLFilesInlineCSS();
  await minifyJSFiles();
})();