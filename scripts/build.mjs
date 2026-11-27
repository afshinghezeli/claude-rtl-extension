#!/usr/bin/env node
/**
 * Builds the extension into dist/ (load it via chrome://extensions → "Load unpacked").
 *
 *   node scripts/build.mjs           production build
 *   node scripts/build.mjs --watch   rebuild on change (development)
 *   node scripts/build.mjs --zip     production build + release/claude-rtl-<version>.zip
 */
import {
  cpSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  rmSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import { dirname, join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { crc32, deflateRawSync } from 'node:zlib';
import * as esbuild from 'esbuild';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const SRC = join(ROOT, 'src');
const DIST = join(ROOT, 'dist');
const RELEASE = join(ROOT, 'release');

const args = new Set(process.argv.slice(2));
const watch = args.has('--watch');
const zip = args.has('--zip');

const pkg = JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf8'));

/** Files copied verbatim, relative to src/. */
const STATIC = [
  '_locales',
  'icons',
  'fonts',
  'content/content.css',
  'popup/popup.html',
  'popup/popup.css',
];

/** @type {esbuild.BuildOptions} */
const common = {
  bundle: true,
  target: 'chrome116',
  logLevel: 'info',
  legalComments: 'none',
  minify: !watch,
  sourcemap: watch ? 'inline' : false,
};

const entries = [
  { in: 'content/index.js', out: 'content.js', format: 'iife' },
  { in: 'background/service-worker.js', out: 'background.js', format: 'esm' },
  { in: 'popup/popup.js', out: 'popup/popup.js', format: 'esm' },
];

function copyStatic() {
  for (const item of STATIC) {
    const target = item === 'content/content.css' ? 'content.css' : item;
    cpSync(join(SRC, item), join(DIST, target), { recursive: true });
  }
  const manifest = JSON.parse(readFileSync(join(SRC, 'manifest.json'), 'utf8'));
  manifest.version = pkg.version;
  writeFileSync(join(DIST, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`);
}

async function build() {
  rmSync(DIST, { recursive: true, force: true });
  mkdirSync(DIST, { recursive: true });
  copyStatic();

  const contexts = await Promise.all(
    entries.map((entry) =>
      esbuild.context({
        ...common,
        entryPoints: [join(SRC, entry.in)],
        outfile: join(DIST, entry.out),
        format: /** @type {esbuild.Format} */ (entry.format),
      }),
    ),
  );

  if (watch) {
    await Promise.all(contexts.map((ctx) => ctx.watch()));
    // Static assets: cheap enough to re-copy whenever anything in src/ changes.
    const { watch: fsWatch } = await import('node:fs');
    fsWatch(SRC, { recursive: true }, () => copyStatic());
    console.log(`\nWatching src/ → dist/ (v${pkg.version}). Press Ctrl+C to stop.`);
    return;
  }

  await Promise.all(contexts.map((ctx) => ctx.rebuild().then(() => ctx.dispose())));
  console.log(`Built v${pkg.version} → dist/`);

  if (zip) {
    mkdirSync(RELEASE, { recursive: true });
    const file = join(RELEASE, `claude-rtl-${pkg.version}.zip`);
    writeFileSync(file, createZip(DIST));
    console.log(`Packaged → ${relative(ROOT, file)}`);
  }
}

/* ------------------------------------------------------------------ */
/* Minimal, dependency-free ZIP writer (deflate, no zip64).            */
/* ------------------------------------------------------------------ */

function listFiles(dir) {
  return readdirSync(dir).flatMap((name) => {
    const full = join(dir, name);
    return statSync(full).isDirectory() ? listFiles(full) : [full];
  });
}

const DOS_DATE = (0 << 9) | (1 << 5) | 1;

function createZip(dir) {
  const local = [];
  const central = [];
  let offset = 0;

  for (const file of listFiles(dir).sort()) {
    const name = Buffer.from(relative(dir, file).split(sep).join('/'));
    const data = readFileSync(file);
    const compressed = deflateRawSync(data, { level: 9 });
    const crc = crc32(data);

    const header = Buffer.alloc(30);
    header.writeUInt32LE(0x04034b50, 0);
    header.writeUInt16LE(20, 4); // version needed
    header.writeUInt16LE(0x0800, 6); // UTF-8 names
    header.writeUInt16LE(8, 8); // deflate
    header.writeUInt16LE(0, 10); // time 00:00 — fixed for reproducible builds
    header.writeUInt16LE(DOS_DATE, 12); // 1980-01-01
    header.writeUInt32LE(crc, 14);
    header.writeUInt32LE(compressed.length, 18);
    header.writeUInt32LE(data.length, 22);
    header.writeUInt16LE(name.length, 26);
    local.push(header, name, compressed);

    const entry = Buffer.alloc(46);
    entry.writeUInt32LE(0x02014b50, 0);
    entry.writeUInt16LE(20, 4);
    entry.writeUInt16LE(20, 6);
    entry.writeUInt16LE(0x0800, 8);
    entry.writeUInt16LE(8, 10);
    entry.writeUInt16LE(0, 12);
    entry.writeUInt16LE(DOS_DATE, 14);
    entry.writeUInt32LE(crc, 16);
    entry.writeUInt32LE(compressed.length, 20);
    entry.writeUInt32LE(data.length, 24);
    entry.writeUInt16LE(name.length, 28);
    entry.writeUInt32LE(offset, 42);
    central.push(entry, name);

    offset += header.length + name.length + compressed.length;
  }

  const centralSize = central.reduce((sum, b) => sum + b.length, 0);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(central.length / 2, 8);
  end.writeUInt16LE(central.length / 2, 10);
  end.writeUInt32LE(centralSize, 12);
  end.writeUInt32LE(offset, 16);

  return Buffer.concat([...local, ...central, end]);
}

build().catch((error) => {
  console.error(error);
  process.exit(1);
});
