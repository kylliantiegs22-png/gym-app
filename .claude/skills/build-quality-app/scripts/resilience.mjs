#!/usr/bin/env node
// Throw every awkward saved-data / browser condition at the app and check it still renders and never errors.
//   node .claude/skills/build-quality-app/scripts/resilience.mjs --url http://localhost:4173 \
//     --key app.v1 --seed saved-state.json --ready "[data-testid=home],[data-testid=onboarding]" [--version-field v]
// PASS for a scenario = a --ready selector becomes visible AND there is no uncaught page error or console error.
// This proves "no blank screen, no crash". It does NOT prove progress was kept: add an app-specific e2e test for that.
import { readFileSync } from 'node:fs';
import { args, isNoise, launch, loadPlaywright } from './lib.mjs';

const a = args();
const url = (a.url || 'http://localhost:4173').replace(/\/$/, '') + (a.path || '/');
const key = a.key;
const ready = a.ready;
if (!key || !ready) {
  console.error('usage: resilience.mjs --url URL --key STORAGE_KEY --ready "sel1,sel2" [--seed saved.json] [--version-field v]');
  process.exit(2);
}
const seed = a.seed ? JSON.parse(readFileSync(a.seed, 'utf8')) : null;
const vf = a['version-field'];
const readySel = ready.split(',').map((s) => s.trim());

const put = (v) => `localStorage.setItem(${JSON.stringify(key)}, ${JSON.stringify(typeof v === 'string' ? v : JSON.stringify(v))});`;
const scenarios = [{ name: 'missing (first visit)', init: '' }];
scenarios.push({ name: 'unreadable JSON (cut off)', init: put('{"v":1,"xp":24') });
for (const [n, raw] of [['an array', '[]'], ['null', 'null'], ['a string', '"hello"'], ['a number', '123'], ['empty string', '']]) scenarios.push({ name: `saved value is ${n}`, init: put(raw) });
if (seed) {
  scenarios.push({ name: 'valid saved state (control)', init: put(seed) });
  for (const k of Object.keys(seed)) {
    scenarios.push({ name: `field "${k}" = null`, init: put({ ...seed, [k]: null }) });
    scenarios.push({ name: `field "${k}" = wrong type`, init: put({ ...seed, [k]: typeof seed[k] === 'string' ? 12345 : 'garbage' }) });
  }
  if (vf) {
    const { [vf]: _drop, ...old } = seed;
    scenarios.push({ name: 'older save (no version field)', init: put(old) });
    scenarios.push({ name: 'newer save (version 999)', init: put({ ...seed, [vf]: 999 }) });
  }
  scenarios.push({
    name: 'storage full (every write throws QuotaExceededError)',
    init: `${put(seed)} Storage.prototype.setItem = function () { throw new DOMException('full', 'QuotaExceededError'); };`,
  });
}
scenarios.push({
  name: 'storage blocked (private mode: touching localStorage throws)',
  init: `Object.defineProperty(window, 'localStorage', { configurable: true, get() { throw new DOMException('denied', 'SecurityError'); } });`,
});
scenarios.push({ name: 'offline reload (needs a service worker)', init: put(seed ?? ''), offline: true });

const pw = loadPlaywright();
const browser = await launch(pw);
const rows = [];
for (const sc of scenarios) {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  const page = await ctx.newPage();
  const problems = [];
  page.on('pageerror', (e) => problems.push(`pageerror: ${String(e).slice(0, 140)}`));
  page.on('console', (m) => m.type() === 'error' && problems.push(`console.error: ${m.text().slice(0, 140)}`));
  page.on('requestfailed', (r) => !isNoise(r.url(), r.failure()?.errorText) && !sc.offline && problems.push(`requestfailed: ${r.url()}`));
  if (sc.init) await page.addInitScript(`if (!sessionStorage.getItem('__r')) { sessionStorage.setItem('__r','1'); try { ${sc.init} } catch (e) {} }`);
  let note = '';
  try {
    await page.goto(url, { waitUntil: 'load' });
    await page.locator(readySel.join(',')).first().waitFor({ state: 'visible', timeout: 8000 });
    if (sc.offline) {
      const sw = await page.evaluate(async () => {
        if (!('serviceWorker' in navigator)) return 'none';
        await Promise.race([navigator.serviceWorker.ready, new Promise((r) => setTimeout(r, 6000))]);
        return navigator.serviceWorker.controller ? 'controlled' : 'registered';
      });
      if (sw === 'none') note = 'SKIPPED: app has no service worker';
      else {
        await page.reload({ waitUntil: 'load' });
        await page.waitForLoadState('networkidle');
        await ctx.setOffline(true);
        await page.reload({ waitUntil: 'load' });
        await page.locator(readySel.join(',')).first().waitFor({ state: 'visible', timeout: 8000 });
        await ctx.setOffline(false);
      }
    }
  } catch (e) {
    problems.push(`app never became ready: ${String(e.message).split('\n')[0]}`);
  }
  rows.push({ name: sc.name, ok: problems.length === 0, problems, note });
  await ctx.close();
}
await browser.close();

console.log(`# Resilience: ${url}  (key ${key})\n`);
for (const r of rows) console.log(`${r.ok ? 'PASS' : 'FAIL'}  ${r.name}${r.note ? '  [' + r.note + ']' : ''}${r.problems.length ? '\n      ' + r.problems.join('\n      ') : ''}`);
const bad = rows.filter((r) => !r.ok).length;
console.log(`\n${rows.length - bad}/${rows.length} scenarios passed.`);
process.exit(bad ? 1 : 0);
