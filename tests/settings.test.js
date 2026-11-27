import { describe, expect, it } from 'vitest';
import { resolveFontStack, sanitizeFontName } from '../src/shared/fonts.js';
import { DEFAULT_SETTINGS, sanitizeSettings } from '../src/shared/settings.js';

describe('sanitizeSettings', () => {
  it('returns defaults for empty or invalid input', () => {
    expect(sanitizeSettings(undefined)).toEqual(DEFAULT_SETTINGS);
    expect(sanitizeSettings('nope')).toEqual(DEFAULT_SETTINGS);
    expect(sanitizeSettings({})).toEqual(DEFAULT_SETTINGS);
  });

  it('keeps valid values', () => {
    const input = {
      enabled: false,
      direction: 'rtl',
      rtlInput: false,
      fontFamily: 'sahel',
      customFont: '',
      fontScope: 'all',
      fontScale: 120,
      lineHeight: 1.8,
    };
    expect(sanitizeSettings(input)).toEqual(input);
  });

  it('rejects unknown enum values', () => {
    const result = sanitizeSettings({ direction: 'up', fontScope: 'x', fontFamily: 'comic' });
    expect(result.direction).toBe(DEFAULT_SETTINGS.direction);
    expect(result.fontScope).toBe(DEFAULT_SETTINGS.fontScope);
    expect(result.fontFamily).toBe(DEFAULT_SETTINGS.fontFamily);
  });

  it('clamps numeric ranges', () => {
    expect(sanitizeSettings({ fontScale: 999 }).fontScale).toBe(150);
    expect(sanitizeSettings({ fontScale: 1 }).fontScale).toBe(80);
    expect(sanitizeSettings({ lineHeight: 9 }).lineHeight).toBe(2.4);
    expect(sanitizeSettings({ lineHeight: 0.5 }).lineHeight).toBe(1.2);
    expect(sanitizeSettings({ lineHeight: 0 }).lineHeight).toBe(0);
    expect(sanitizeSettings({ lineHeight: 'abc' }).lineHeight).toBe(0);
  });

  it('ignores unknown keys', () => {
    expect(sanitizeSettings({ evil: true })).not.toHaveProperty('evil');
  });
});

describe('fonts', () => {
  it('strips characters that could break out of a CSS value', () => {
    expect(sanitizeFontName('Arial"; } body { display:none')).toBe('Arial body displaynone');
    expect(sanitizeFontName('  IRAN  Sans  ')).toBe('IRAN Sans');
    expect(sanitizeFontName('وزیر')).toBe('وزیر');
    expect(sanitizeFontName(42)).toBe('');
  });

  it('resolves font stacks', () => {
    expect(resolveFontStack({ fontFamily: 'default', customFont: '' })).toBeNull();
    expect(resolveFontStack({ fontFamily: 'vazirmatn', customFont: '' })).toMatch(
      /^"CRTL Vazirmatn",/,
    );
    expect(resolveFontStack({ fontFamily: 'custom', customFont: '' })).toBeNull();
    expect(resolveFontStack({ fontFamily: 'custom', customFont: 'B Nazanin' })).toMatch(
      /^"B Nazanin",/,
    );
    expect(resolveFontStack({ fontFamily: 'tahoma', customFont: '' })).toMatch(/^Tahoma/);
  });
});
