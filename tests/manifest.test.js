import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { FONTS } from '../src/shared/fonts.js';

const SRC = join(import.meta.dirname, '..', 'src');
const readJson = (path) => JSON.parse(readFileSync(join(SRC, path), 'utf8'));

const manifest = readJson('manifest.json');
const en = readJson('_locales/en/messages.json');
const fa = readJson('_locales/fa/messages.json');

describe('manifest.json', () => {
  it('is Manifest V3 with minimal permissions', () => {
    expect(manifest.manifest_version).toBe(3);
    expect(manifest.permissions).toEqual(['storage']);
    expect(manifest.host_permissions).toBeUndefined();
  });

  it('references files that exist', () => {
    const paths = [
      ...Object.values(manifest.icons),
      ...Object.values(manifest.action.default_icon),
      manifest.action.default_popup,
    ];
    for (const path of paths) expect(existsSync(join(SRC, path)), path).toBe(true);
  });

  it('uses only defined locale messages', () => {
    const used = JSON.stringify(manifest).match(/__MSG_(\w+)__/g) ?? [];
    for (const token of used) expect(en, token).toHaveProperty(token.slice(6, -2));
  });

  it('respects Chrome Web Store length limits', () => {
    for (const locale of [en, fa]) {
      expect(locale.extName.message.length).toBeLessThanOrEqual(75);
      expect(locale.extDescription.message.length).toBeLessThanOrEqual(132);
    }
  });
});

describe('locales', () => {
  it('every locale defines exactly the same keys as English', () => {
    expect(Object.keys(fa).sort()).toEqual(Object.keys(en).sort());
  });

  it('every font has a localized label', () => {
    for (const font of FONTS) expect(en, font.id).toHaveProperty(`font_${font.id}`);
  });

  it('every bundled font file and license exists', () => {
    for (const font of FONTS.filter((f) => f.source === 'bundled')) {
      for (const file of font.files) expect(existsSync(join(SRC, file.path)), file.path).toBe(true);
      const dir = font.files[0].path.split('/').slice(0, -1).join('/');
      expect(existsSync(join(SRC, dir, 'OFL.txt')), `${dir}/OFL.txt`).toBe(true);
    }
  });
});
