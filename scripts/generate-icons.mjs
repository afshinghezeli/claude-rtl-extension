#!/usr/bin/env node
/**
 * Renders the extension icon (src/icons/icon-*.png) without any image tooling:
 * a rounded terracotta square with right-aligned "text lines" and an arrow.
 * Shapes are rasterised with 4×4 supersampling and encoded as PNG via zlib.
 *
 * Usage: npm run icons
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { crc32, deflateSync } from 'node:zlib';

const OUT_DIR = join(dirname(fileURLToPath(import.meta.url)), '..', 'src', 'icons');
const SIZES = [16, 32, 48, 128];
const SS = 4; // supersampling factor

const TOP = [0xe0, 0x82, 0x60];
const BOTTOM = [0xc1, 0x5f, 0x3c];
const WHITE = [0xff, 0xff, 0xff];

// Geometry in a 0..1 unit square.
const RADIUS = 0.22;
const LINES = [
  { y: 0.3, x0: 0.24, x1: 0.78 },
  { y: 0.47, x0: 0.4, x1: 0.78 },
  { y: 0.64, x0: 0.3, x1: 0.78 },
];
const LINE_HALF = 0.055;

function insideRoundedSquare(x, y) {
  const cx = Math.min(Math.max(x, RADIUS), 1 - RADIUS);
  const cy = Math.min(Math.max(y, RADIUS), 1 - RADIUS);
  return (x - cx) ** 2 + (y - cy) ** 2 <= RADIUS ** 2;
}

function insideCapsule(x, y, { y: ly, x0, x1 }) {
  const cx = Math.min(Math.max(x, x0), x1);
  return (x - cx) ** 2 + (y - ly) ** 2 <= LINE_HALF ** 2;
}

/** Left-pointing arrow (the RTL reading direction) under the lines. */
function insideArrow(x, y) {
  const ay = 0.8;
  const shaft = x >= 0.32 && x <= 0.6 && Math.abs(y - ay) <= 0.03;
  const head = x >= 0.22 && x <= 0.36 && Math.abs(y - ay) <= (x - 0.22) * 0.75;
  return shaft || head;
}

function shade(x, y) {
  if (!insideRoundedSquare(x, y)) return null;
  if (LINES.some((line) => insideCapsule(x, y, line)) || insideArrow(x, y)) return WHITE;
  return TOP.map((c, i) => Math.round(c + (BOTTOM[i] - c) * y));
}

function render(size) {
  const rgba = Buffer.alloc(size * size * 4);
  for (let py = 0; py < size; py += 1) {
    for (let px = 0; px < size; px += 1) {
      let r = 0;
      let g = 0;
      let b = 0;
      let a = 0;
      for (let sy = 0; sy < SS; sy += 1) {
        for (let sx = 0; sx < SS; sx += 1) {
          const color = shade((px + (sx + 0.5) / SS) / size, (py + (sy + 0.5) / SS) / size);
          if (!color) continue;
          r += color[0];
          g += color[1];
          b += color[2];
          a += 1;
        }
      }
      const i = (py * size + px) * 4;
      if (a > 0) {
        rgba[i] = Math.round(r / a);
        rgba[i + 1] = Math.round(g / a);
        rgba[i + 2] = Math.round(b / a);
        rgba[i + 3] = Math.round((a / (SS * SS)) * 255);
      }
    }
  }
  return encodePng(size, size, rgba);
}

function chunk(type, data) {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([length, body, crc]);
}

function encodePng(width, height, rgba) {
  const header = Buffer.alloc(13);
  header.writeUInt32BE(width, 0);
  header.writeUInt32BE(height, 4);
  header[8] = 8; // bit depth
  header[9] = 6; // RGBA
  const raw = Buffer.alloc((width * 4 + 1) * height);
  for (let y = 0; y < height; y += 1) {
    raw[y * (width * 4 + 1)] = 0; // filter: none
    rgba.copy(raw, y * (width * 4 + 1) + 1, y * width * 4, (y + 1) * width * 4);
  }
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', header),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

mkdirSync(OUT_DIR, { recursive: true });
for (const size of SIZES) {
  writeFileSync(join(OUT_DIR, `icon-${size}.png`), render(size));
  console.log(`icon-${size}.png`);
}
