// Shared helpers. Resolves Playwright (and axe) from the APP's node_modules, so the skill works in any project.
import { createRequire } from 'node:module';
import { existsSync } from 'node:fs';
import path from 'node:path';

const req = createRequire(path.join(process.cwd(), 'package.json'));

export function loadPlaywright() {
  for (const name of ['playwright', '@playwright/test', 'playwright-core']) {
    try {
      return req(name);
    } catch {
      /* try next */
    }
  }
  console.error('Playwright not found in this project. Run: npm i -D playwright @axe-core/playwright');
  process.exit(2);
}

export function loadAxe() {
  try {
    return req('@axe-core/playwright');
  } catch {
    return null;
  }
}

export async function launch(pw) {
  const exe = process.env.CHROMIUM_PATH || (existsSync('/opt/pw-browsers/chromium') ? '/opt/pw-browsers/chromium' : undefined);
  return pw.chromium.launch(exe ? { executablePath: exe } : {});
}

export function args(argv = process.argv.slice(2)) {
  const out = { _: [] };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith('--')) {
      const [k, v] = a.slice(2).split('=');
      out[k] = v ?? (argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[++i] : true);
    } else out._.push(a);
  }
  return out;
}

/** Noise that is not an app fault: a reload cancels the previous page's in-flight favicon/asset request. */
export const isNoise = (url, failure) => /favicon/.test(url) && /ERR_ABORTED/.test(failure || '');
