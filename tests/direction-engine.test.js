import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { DirectionEngine } from '../src/content/direction-engine.js';

/** Flush MutationObserver callbacks (microtasks) and then the engine's queue. */
const settle = async (engine) => {
  await Promise.resolve();
  engine.flush();
};

describe('DirectionEngine', () => {
  /** @type {DirectionEngine} */
  let engine;

  beforeEach(() => {
    document.body.innerHTML = '';
    engine = new DirectionEngine({ document, schedule: () => {} });
  });

  afterEach(() => engine.stop());

  it('marks RTL paragraphs and leaves LTR ones untouched', () => {
    document.body.innerHTML = `
      <p id="fa">سلام دنیا</p>
      <p id="en">Hello world</p>`;
    engine.start('auto');

    expect(document.getElementById('fa').getAttribute('dir')).toBe('rtl');
    expect(document.getElementById('fa').hasAttribute('data-crtl')).toBe(true);
    expect(document.getElementById('en').hasAttribute('dir')).toBe(false);
  });

  it('gives LTR blocks inside RTL containers an explicit direction', () => {
    document.body.innerHTML = `
      <blockquote id="quote">
        <p>این یک نقل قول طولانی به زبان فارسی است</p>
        <p id="en">English line</p>
      </blockquote>`;
    engine.start('auto');

    expect(document.getElementById('quote').getAttribute('dir')).toBe('rtl');
    expect(document.getElementById('en').getAttribute('dir')).toBe('ltr');
  });

  it('keeps LTR items of an RTL list on the list side and flags them', () => {
    document.body.innerHTML = `
      <ul id="list">
        <li id="fa"><strong>Worklet:</strong> تابع‌های کوتاه جاوااسکریپتی که می‌تونن روی UI thread اجرا بشن.</li>
        <li>مورد دوم</li>
        <li id="en">English item</li>
      </ul>`;
    engine.start('auto');

    const fa = document.getElementById('fa');
    const en = document.getElementById('en');
    expect(document.getElementById('list').getAttribute('dir')).toBe('rtl');
    // Persian item starting with an English word: RTL, not flagged
    // (the flag's `unicode-bidi: plaintext` would reorder it LTR).
    expect(fa.getAttribute('dir')).toBe('rtl');
    expect(fa.hasAttribute('data-crtl-ltr-item')).toBe(false);
    // English item: bullet stays on the list side, flagged for LTR text order.
    expect(en.getAttribute('dir')).toBe('rtl');
    expect(en.hasAttribute('data-crtl-ltr-item')).toBe(true);

    engine.stop();
    expect(en.hasAttribute('dir')).toBe(false);
    expect(en.hasAttribute('data-crtl-ltr-item')).toBe(false);
  });

  it('never touches code, the composer, or elements the page owns', () => {
    document.body.innerHTML = `
      <pre><code><p id="code">سلام</p></code></pre>
      <div class="ProseMirror" contenteditable="true"><p id="input">سلام</p></div>
      <p id="owned" dir="ltr">سلام</p>`;
    engine.start('auto');

    expect(document.getElementById('code').hasAttribute('dir')).toBe(false);
    expect(document.getElementById('input').hasAttribute('dir')).toBe(false);
    expect(document.getElementById('owned').getAttribute('dir')).toBe('ltr');
    expect(document.getElementById('owned').hasAttribute('data-crtl')).toBe(false);
  });

  it('processes nodes added after start (new messages)', async () => {
    engine.start('auto');
    const p = document.createElement('p');
    p.textContent = 'این یک پیام جدید است';
    document.body.append(p);

    await settle(engine);
    expect(p.getAttribute('dir')).toBe('rtl');
  });

  it('follows streaming text changes', async () => {
    document.body.innerHTML = '<p id="p">Sure</p>';
    engine.start('auto');
    const p = document.getElementById('p');
    expect(p.hasAttribute('dir')).toBe(false);

    p.firstChild.appendData(', بله حتماً، این پاسخ به زبان فارسی ادامه پیدا می‌کند');
    await settle(engine);
    expect(p.getAttribute('dir')).toBe('rtl');
  });

  it('forces RTL in "rtl" mode and switches back in "auto" mode', () => {
    document.body.innerHTML = '<p id="p">Hello world</p>';
    engine.start('rtl');
    expect(document.getElementById('p').getAttribute('dir')).toBe('rtl');

    engine.setMode('auto');
    expect(document.getElementById('p').hasAttribute('dir')).toBe(false);
  });

  it('overrides the page\'s dir="auto" (first-strong rule) and restores it on stop', () => {
    document.body.innerHTML = `
      <p id="fa" dir="auto">react-native-reanimated یک کتابخونه‌ی انیمیشن برای React Native هست</p>
      <p id="en" dir="auto">سلام is how you say hello in Persian, a very common greeting</p>
      <p id="num" dir="auto">123</p>`;
    engine.start('auto');

    expect(document.getElementById('fa').getAttribute('dir')).toBe('rtl');
    expect(document.getElementById('en').getAttribute('dir')).toBe('ltr');
    expect(document.getElementById('num').getAttribute('dir')).toBe('auto');

    engine.stop();
    for (const id of ['fa', 'en', 'num']) {
      expect(document.getElementById(id).getAttribute('dir')).toBe('auto');
      expect(document.getElementById(id).hasAttribute('data-crtl')).toBe(false);
    }
  });

  it("overrides claude.ai's own first-strong dir inside messages and restores it on stop", () => {
    // Real markup from claude.ai: Claude marks this Persian paragraph LTR.
    document.body.innerHTML = `
      <div class="standard-markdown">
        <p id="p" dir="ltr"><strong>react-native-reanimated</strong> یک کتابخونه‌ی انیمیشن برای React Native هست که شرکت Software Mansion می‌سازدش.</p>
      </div>`;
    engine.start('auto');
    const p = document.getElementById('p');
    expect(p.getAttribute('dir')).toBe('rtl');

    engine.stop();
    expect(p.getAttribute('dir')).toBe('ltr');
    expect(p.hasAttribute('data-crtl')).toBe(false);
  });

  it('re-applies when the page rewrites dir (e.g. a React re-render while streaming)', async () => {
    document.body.innerHTML = `
      <div class="standard-markdown"><p id="p" dir="ltr">Claude یک دستیار هوش مصنوعی است</p></div>`;
    engine.start('auto');
    const p = document.getElementById('p');
    expect(p.getAttribute('dir')).toBe('rtl');

    p.setAttribute('dir', 'ltr');
    await settle(engine);
    expect(p.getAttribute('dir')).toBe('rtl');
  });

  it('removes everything it added on stop', () => {
    document.body.innerHTML = '<p>سلام</p><ul><li>سلام</li><li>Hello</li></ul>';
    engine.start('auto');
    expect(document.querySelectorAll('[data-crtl]').length).toBeGreaterThan(0);

    engine.stop();
    expect(document.querySelectorAll('[data-crtl], [dir]').length).toBe(0);
  });
});
