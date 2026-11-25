#!/usr/bin/env node
// Screenshot every screen at phone size in light and dark, and run automatic quality checks on each.
//   node .claude/skills/build-quality-app/scripts/visual-sweep.mjs --config sweep.config.json
// Exit code 1 if any hard check fails. Reads the screenshots yourself afterwards: automatic checks catch
// objective faults, not taste.
import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { args, isNoise, launch, loadAxe, loadPlaywright } from './lib.mjs';

const a = args();
const cfgPath = a.config || a._[0];
if (!cfgPath) {
  console.error('usage: visual-sweep.mjs --config sweep.config.json');
  process.exit(2);
}
const cfg = JSON.parse(readFileSync(cfgPath, 'utf8'));
const viewport = cfg.viewport || { width: 390, height: 844 };
const themes = cfg.themes || ['light', 'dark'];
const outDir = a.out || cfg.outDir || 'screenshots/sweep';
const minTarget = cfg.minTarget ?? 44;
const minFont = cfg.minFont ?? 12;
const settle = cfg.settleMs ?? 600;
const emojiMode = cfg.emoji ?? 'fail'; // 'fail' | 'warn' | 'off'
mkdirSync(outDir, { recursive: true });

const pw = loadPlaywright();
const axeMod = loadAxe();
const AxeBuilder = axeMod && (axeMod.default || axeMod.AxeBuilder || axeMod);
const browser = await launch(pw);

/** Runs in the page: objective layout / type / target checks. */
function inPage({ minTarget, minFont, ignoreTargets }) {
  const vis = (el) => {
    const r = el.getBoundingClientRect();
    const cs = getComputedStyle(el);
    return r.width > 0 && r.height > 0 && cs.visibility !== 'hidden' && cs.display !== 'none' && cs.opacity !== '0';
  };
  const label = (el) => `${el.tagName.toLowerCase()}${el.id ? '#' + el.id : ''}${el.className && typeof el.className === 'string' ? '.' + el.className.trim().split(/\s+/).slice(0, 2).join('.') : ''} "${(el.getAttribute('aria-label') || el.textContent || '').trim().slice(0, 28)}"`;
  const out = { overflow: [], smallTargets: [], smallText: [], fonts: [], emoji: [], imgNoAlt: [] };

  const sw = document.documentElement.scrollWidth;
  if (sw > innerWidth + 1) {
    out.overflow.push(`page scrolls sideways: scrollWidth ${sw} > viewport ${innerWidth}`);
    for (const el of document.querySelectorAll('body *')) {
      const r = el.getBoundingClientRect();
      if (vis(el) && r.right > innerWidth + 1 && out.overflow.length < 6) out.overflow.push(`${label(el)} right edge ${Math.round(r.right)}`);
    }
  }
  for (const el of document.querySelectorAll('a[href],button,input:not([type=hidden]),select,textarea,[role=button],[role=link],[role=switch],[role=tab],[role=checkbox]')) {
    if (!vis(el) || (ignoreTargets.length && el.matches(ignoreTargets.join(',')))) continue;
    const t = el.getAttribute('type');
    if (t === 'file') continue;
    let r = el.getBoundingClientRect();
    const lab = el.closest('label');
    if (lab && (t === 'checkbox' || t === 'radio')) r = lab.getBoundingClientRect();
    // inline text links inside a sentence are exempt (WCAG 2.5.8 inline exception)
    if (getComputedStyle(el).display === 'inline' && el.closest('p,li,td,span,h1,h2,h3')) continue;
    if (r.width < minTarget - 0.5 || r.height < minTarget - 0.5) out.smallTargets.push(`${label(el)} ${Math.round(r.width)}x${Math.round(r.height)}`);
  }
  const seenFonts = new Set();
  const emojiRe = /\p{Extended_Pictographic}/u;
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  for (let n = walker.nextNode(); n; n = walker.nextNode()) {
    const el = n.parentElement;
    const txt = n.textContent.trim();
    if (!txt || !el || !vis(el) || ['SCRIPT', 'STYLE', 'NOSCRIPT'].includes(el.tagName)) continue;
    const cs = getComputedStyle(el);
    if (parseFloat(cs.fontSize) < minFont) out.smallText.push(`${label(el)} ${cs.fontSize}`);
    const fam = cs.fontFamily.split(',')[0].trim().replace(/["']/g, '');
    if (!seenFonts.has(fam)) {
      seenFonts.add(fam);
      const generic = /^(serif|sans-serif|monospace|system-ui|ui-[a-z-]+|cursive|fantasy|-apple-system|BlinkMacSystemFont)$/i.test(fam);
      if (generic) out.fonts.push(`falls back to a default font: ${fam} (e.g. ${label(el)})`);
      else if (!document.fonts.check(`${cs.fontWeight} 16px "${fam}"`)) out.fonts.push(`"${fam}" is not loaded (weight ${cs.fontWeight})`);
    }
    if (emojiRe.test(txt)) out.emoji.push(`${label(el)} has emoji: ${txt.slice(0, 20)}`);
  }
  for (const img of document.querySelectorAll('img')) if (vis(img) && !img.hasAttribute('alt')) out.imgNoAlt.push(label(img));
  for (const k of Object.keys(out)) out[k] = [...new Set(out[k])].slice(0, 8);
  return out;
}

const results = [];
for (const theme of themes) {
  const ctx = await browser.newContext({
    viewport,
    deviceScaleFactor: 1,
    isMobile: true,
    hasTouch: true,
    colorScheme: theme,
    reducedMotion: cfg.reducedMotion ? 'reduce' : 'no-preference',
  });
  for (const s of cfg.screens) {
    const page = await ctx.newPage();
    const problems = [];
    page.on('console', (m) => m.type() === 'error' && problems.push(`console.error: ${m.text().slice(0, 160)}`));
    page.on('pageerror', (e) => problems.push(`pageerror: ${String(e).slice(0, 160)}`));
    page.on('requestfailed', (r) => !isNoise(r.url(), r.failure()?.errorText) && problems.push(`requestfailed: ${r.url()} ${r.failure()?.errorText}`));
    if (s.seed || cfg.seed) {
      const seed = { ...(cfg.seed || {}), ...(s.seed || {}) };
      await page.addInitScript(([seed]) => {
        if (sessionStorage.getItem('__seeded')) return;
        sessionStorage.setItem('__seeded', '1');
        for (const [k, v] of Object.entries(seed)) localStorage.setItem(k, typeof v === 'string' ? v : JSON.stringify(v));
      }, [seed]);
    }
    const base = (cfg.baseURL || 'http://localhost:4173').replace(/\/$/, '');
    await page.goto(base + (s.path || '/'), { waitUntil: 'load' });
    if (s.waitFor) await page.waitForSelector(s.waitFor, { timeout: 10000 });
    for (const act of s.actions || []) {
      if (act.click) await page.click(act.click);
      else if (act.fill) await page.fill(act.fill[0], String(act.fill[1]));
      else if (act.press) await page.keyboard.press(act.press);
      else if (act.hash) await page.evaluate((h) => (location.hash = h), act.hash);
      else if (act.wait) await page.waitForTimeout(act.wait);
      else if (act.waitFor) await page.waitForSelector(act.waitFor, { timeout: 10000 });
      else if (act.scrollTo) await page.locator(act.scrollTo).scrollIntoViewIfNeeded();
    }
    await page.waitForTimeout(settle);
    const file = path.join(outDir, `${s.name}-${theme}.png`);
    await page.screenshot({ path: file, fullPage: !!s.fullPage });
    const found = await page.evaluate(inPage, { minTarget, minFont, ignoreTargets: [...(cfg.ignoreTargets || []), ...(s.ignoreTargets || [])] });
    const fails = [];
    const warns = [];
    if (found.overflow.length) fails.push(['overflow', found.overflow]);
    if (found.smallTargets.length) fails.push([`tap targets under ${minTarget}px`, found.smallTargets]);
    if (found.smallText.length) warns.push([`text under ${minFont}px`, found.smallText]);
    if (found.fonts.length) fails.push(['fonts', found.fonts]);
    if (found.imgNoAlt.length) fails.push(['images without alt', found.imgNoAlt]);
    if (found.emoji.length && emojiMode !== 'off') (emojiMode === 'fail' ? fails : warns).push(['emoji in the UI (use one icon family)', found.emoji]);
    if (problems.length) fails.push(['console / network', [...new Set(problems)].slice(0, 6)]);
    if (AxeBuilder) {
      const ax = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']).analyze();
      const v = ax.violations.map((x) => `${x.id} (${x.impact}): ${x.nodes.slice(0, 3).map((n) => n.target.join(' ')).join(' | ')}`);
      if (v.length) fails.push(['axe WCAG A/AA', v]);
    } else warns.push(['axe', ['@axe-core/playwright not installed: contrast and ARIA not checked']]);
    results.push({ screen: s.name, theme, file, fails, warns });
    await page.close();
  }
  await ctx.close();
}
await browser.close();

const lines = [`# Visual sweep`, ``, `${viewport.width}x${viewport.height}, themes: ${themes.join(', ')}, ${results.length} screen renders`, ``, `| Screen | Theme | Result | Screenshot |`, `| --- | --- | --- | --- |`];
for (const r of results) lines.push(`| ${r.screen} | ${r.theme} | ${r.fails.length ? 'FAIL (' + r.fails.length + ')' : r.warns.length ? 'pass, warnings' : 'pass'} | ${r.file} |`);
for (const r of results.filter((x) => x.fails.length || x.warns.length)) {
  lines.push(``, `## ${r.screen} (${r.theme})`);
  for (const [k, v] of r.fails) lines.push(`- **FAIL ${k}**`, ...v.map((x) => `  - ${x}`));
  for (const [k, v] of r.warns) lines.push(`- warn ${k}`, ...v.map((x) => `  - ${x}`));
}
const report = lines.join('\n') + '\n';
writeFileSync(path.join(outDir, 'report.md'), report);
writeFileSync(path.join(outDir, 'report.json'), JSON.stringify(results, null, 2));
console.log(report);
const failed = results.filter((r) => r.fails.length).length;
console.log(failed ? `${failed} of ${results.length} renders FAILED. Report: ${outDir}/report.md` : `All ${results.length} renders passed. Report: ${outDir}/report.md`);
process.exit(failed ? 1 : 0);
