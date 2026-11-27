import { describe, expect, it } from 'vitest';
import { containsRtl, detectDirection } from '../src/shared/direction.js';

describe('detectDirection', () => {
  it.each([
    ['سلام، حالت چطوره؟', 'rtl'],
    ['مرحبا بك في Claude', 'rtl'],
    ['שלום עולם', 'rtl'],
    ['یہ اردو ہے', 'rtl'],
    ['Hello world', 'ltr'],
    ['Bonjour à tous', 'ltr'],
  ])('%s → %s', (text, expected) => {
    expect(detectDirection(text)).toBe(expected);
  });

  it('treats Persian sentences that start with an English word as RTL', () => {
    expect(detectDirection('Claude یک دستیار هوش مصنوعی است که توسط Anthropic ساخته شده')).toBe(
      'rtl',
    );
  });

  it('keeps English sentences with a single Persian word LTR', () => {
    expect(detectDirection('The Persian word for hello is سلام and it is very common')).toBe('ltr');
  });

  it('returns null for text without letters', () => {
    expect(detectDirection('')).toBeNull();
    expect(detectDirection(null)).toBeNull();
    expect(detectDirection('123 + 456 = 579 🎉')).toBeNull();
  });

  it('respects a custom threshold', () => {
    const text = 'abc abc abc سل'; // 2 of 11 letters are RTL
    expect(detectDirection(text, { threshold: 0.1 })).toBe('rtl');
    expect(detectDirection(text, { threshold: 0.5 })).toBe('ltr');
  });
});

describe('containsRtl', () => {
  it('detects any RTL character', () => {
    expect(containsRtl('abc ب')).toBe(true);
    expect(containsRtl('abc')).toBe(false);
    expect(containsRtl('')).toBe(false);
  });
});
