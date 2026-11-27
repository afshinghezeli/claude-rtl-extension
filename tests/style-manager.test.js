import { beforeEach, describe, expect, it, vi } from 'vitest';
import { CLASSES, StyleManager } from '../src/content/style-manager.js';
import { DEFAULT_SETTINGS } from '../src/shared/settings.js';

describe('StyleManager', () => {
  const root = document.documentElement;
  let manager;

  beforeEach(() => {
    root.className = '';
    root.removeAttribute('style');
    // Font loading is not under test here; make fetch fail fast and quietly.
    globalThis.fetch = vi.fn().mockResolvedValue({ ok: false, status: 404 });
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    manager = new StyleManager({ document, resolveUrl: (p) => `ext://${p}` });
  });

  it('applies classes and variables for the default settings', () => {
    manager.apply(DEFAULT_SETTINGS);
    expect(root.classList.contains(CLASSES.on)).toBe(true);
    expect(root.classList.contains(CLASSES.input)).toBe(true);
    expect(root.classList.contains(CLASSES.fontMessages)).toBe(true);
    expect(root.classList.contains(CLASSES.forceRtl)).toBe(false);
    expect(root.style.getPropertyValue('--crtl-font-family')).toContain('CRTL Vazirmatn');
    expect(globalThis.fetch).toHaveBeenCalledWith('ext://fonts/vazirmatn/Vazirmatn-Variable.woff2');
  });

  it('handles scale, line height, scope and forced RTL', () => {
    manager.apply({
      ...DEFAULT_SETTINGS,
      direction: 'rtl',
      fontScope: 'all',
      fontScale: 120,
      lineHeight: 2,
    });
    expect(root.classList.contains(CLASSES.forceRtl)).toBe(true);
    expect(root.classList.contains(CLASSES.fontAll)).toBe(true);
    expect(root.classList.contains(CLASSES.fontMessages)).toBe(false);
    expect(root.style.getPropertyValue('--crtl-font-scale')).toBe('1.2');
    expect(root.style.getPropertyValue('--crtl-line-height')).toBe('2');
  });

  it('does not override the font when "default" is selected', () => {
    manager.apply({ ...DEFAULT_SETTINGS, fontFamily: 'default' });
    expect(root.classList.contains(CLASSES.fontMessages)).toBe(false);
    expect(root.style.getPropertyValue('--crtl-font-family')).toBe('');
  });

  it('cleans up completely when disabled', () => {
    manager.apply({ ...DEFAULT_SETTINGS, fontScale: 120, lineHeight: 2 });
    manager.apply({ ...DEFAULT_SETTINGS, enabled: false });
    expect(root.className).toBe('');
    expect(root.getAttribute('style') ?? '').toBe('');
  });
});
