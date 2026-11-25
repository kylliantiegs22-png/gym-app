"""WORKED EXAMPLE from a finance PWA: copy to your app and adapt the selectors, flows and paths.
It is not run from this folder (it reads ../content and ./personas.json relative to the app).
"""
"""Play the whole of Unit 1 as a persona, from cleared storage, on a faked clock.

  python3 .claude/skills/webapp-testing/scripts/with_server.py \
      --server "npm run preview" --port 4173 -- \
      python3 scripts/persona-playtest.py --round 1 [--persona emma ...]

Per persona it writes (all under docs/persona-evidence/round-N/):
  <id>.json   facts: console problems, timings, ics check, final state
  <id>-*.png  screenshots at key moments
and persona-transcripts/<id>.md : a transcript of every screen's text (not committed).
"""
import argparse, json, os, re, statistics, sys, time
from datetime import datetime, timedelta
from pathlib import Path
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parent.parent
URL = os.environ.get('URL', 'http://localhost:4173/')
CHROME = os.environ.get('CHROMIUM_PATH', '/opt/pw-browsers/chromium')
PERSONAS = json.loads((ROOT / 'scripts' / 'personas.json').read_text())
COURSE = json.loads((ROOT / 'content' / 'course.json').read_text())
LESSONS = [l['id'] for l in COURSE['units'][0]['lessons']]

Q = {}
for f in (ROOT / 'content').glob('unit*/*.json'):
    j = json.loads(f.read_text())
    for q in j.get('questions', []) + j.get('reviewBank', []) + [s['q'] for s in j.get('screens', []) if s['kind'] == 'question']:
        Q[q['id']] = q

START = datetime(2026, 11, 24, 7, 30)  # a Tuesday


class Run:
    def __init__(self, pid, rnd, page, ctx, ev):
        self.pid, self.p, self.rnd, self.page, self.ctx, self.ev = pid, PERSONAS[pid], rnd, page, ctx, ev
        self.t = []            # transcript lines
        self.problems = []     # console/page errors
        self.latency = []      # ms from tap to next screen
        self.qn = 0            # questions answered so far
        self.err_scale = 1     # >1 means fewer mistakes (learner got better)
        self.shots = {}
        self.facts = {'wrong_answers': 0, 'confusions': []}
        self.where = 'start'
        page.on('console', lambda m: self.note(f'console.{m.type}', m.text) if m.type in ('error', 'warning') else None)
        page.on('pageerror', lambda e: self.note('pageerror', str(e)))
        # A reload cancels the previous page's in-flight favicon request; that is harness noise, not an app fault.
        page.on('requestfailed', lambda r: None if ('favicon' in r.url and 'ERR_ABORTED' in str(r.failure)) else self.note('requestfailed', f'{r.url} {r.failure}'))

    def note(self, kind, text):
        self.problems.append(f'[{self.where}] {kind}: {text}')

    def say(self, s=''):
        self.t.append(s)

    def shot(self, name):
        path = self.ev / f'{self.pid}-{name}.png'
        self.page.screenshot(path=str(path))
        self.shots[name] = path.name

    def text(self, sel):
        loc = self.page.locator(sel)
        return loc.first.inner_text().strip() if loc.count() else ''

    # ---- answering -------------------------------------------------------
    def answer(self, q, wrong):
        pg, t = self.page, q['qtype']
        if t in ('mcq', 'blank'):
            pg.click(f'[data-opt="{(q["answer"] + 1) % len(q["options"]) if wrong else q["answer"]}"]')
        elif t == 'truefalse':
            pg.click(f'[data-opt="{str((not q["answer"]) if wrong else q["answer"]).lower()}"]')
        elif t == 'numeric':
            pg.fill('[data-testid="numeric-input"]', str(q['answer'] + (1000 if wrong else 0)))
        elif t == 'slider':
            lo, hi = q['min'], q['max']
            v = (lo if q['answer'] - lo > hi - q['answer'] else hi) if wrong else q['answer']
            pg.fill('[data-testid="slider-input"]', str(v))
        elif t == 'match':
            n = len(q['pairs'])
            for i in range(n):
                pg.click(f'[data-left="{i}"]')
                pg.click(f'[data-right="{(i + 1) % n if wrong else i}"]')
        elif t == 'order':
            idx = list(range(len(q['items'])))
            for i in (reversed(idx) if wrong else idx):
                pg.click(f'[data-item="{i}"]')
        elif t == 'sort':
            for i, it in enumerate(q['items']):
                pg.click(f'[data-sort="{i}-{(1 - it["bucket"]) if wrong and i == 0 else it["bucket"]}"]')
        elif t == 'tap':
            pg.click(f'[data-row="{(q["answer"] + 1) % len(q["visual"]["rows"]) if wrong else q["answer"]}"]')

    def is_wrong_now(self, forced):
        if forced:
            return True
        p = self.p
        return self.qn % (p['err_every'] * self.err_scale) == p['err_offset'] % (p['err_every'] * self.err_scale)

    def timed_click(self, sel):
        t0 = time.perf_counter()
        self.page.click(sel)
        self.page.wait_for_function('document.fonts.status === "loaded"')
        self.page.evaluate('new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)))')
        self.latency.append((time.perf_counter() - t0) * 1000)

    def play(self, label, forced_wrong=0, leave_after=None, shot_names=None):
        """Play the session on screen to its end. Returns number of screens seen."""
        pg = self.page
        screens = 0
        forced = forced_wrong
        for i in range(90):
            sess = pg.locator('[data-testid="session"]')
            if not sess.is_visible():
                return screens
            if leave_after is not None and screens >= leave_after:
                self.say(f'\n> {self.p["name"]} is interrupted and closes the lesson.\n')
                pg.click('[aria-label="Close"]')
                self.say('DIALOG: ' + self.text('[role="dialog"]').replace('\n', ' / '))
                self.shot('leave-dialog')
                pg.click('[data-testid="leave"]')
                return screens
            kind = sess.get_attribute('data-kind')
            step = self.text('.step-label')
            screens += 1
            self.where = f'{label} #{screens}'
            pg.wait_for_timeout(120)
            if kind != 'question':
                self.say(f'\n### [{step}] screen {screens}\n{self.text(".session-body").split(chr(10), 1)[-1] if False else self.text(".session-body")}')
                if kind == 'apply':
                    if self.p['plan_missions']:
                        pg.click('.mission')
                        self.say('(taps the real-money move to plan it)')
                    self.shot('apply-' + label.replace(' ', '-'))
                self.timed_click('[data-testid="continue"]')
                continue
            qid = pg.get_attribute('[data-qid]', 'data-qid')
            q = Q[qid]
            wrong = self.is_wrong_now(forced > 0)
            if forced > 0:
                forced -= 1
            self.qn += 1
            self.say(f'\n### [{step}] screen {screens}: QUESTION ({q["qtype"]}, concept {q["concept"]})\n{self.text(".session-body")}')
            hint = pg.locator('.hint button')
            if hint.count() and wrong:
                hint.click()
                self.say('(opens the hint) ' + self.text('.hint-text'))
            self.answer(q, wrong)
            sure = (self.p['sure_on_numeric'] or q['qtype'] != 'numeric') and not (wrong and self.p['err_every'] <= 5 and q['qtype'] in ('match', 'order'))
            pg.click('[data-testid="check-sure"]' if sure else '[data-testid="check-guess"]')
            pg.wait_for_selector('[data-testid="feedback"]')
            pg.wait_for_timeout(350)
            fb = self.text('[data-testid="feedback"]').replace('\n', ' / ')
            self.say(f'ANSWERED {"WRONG" if wrong else "right"} ({"sure" if sure else "guess"}) -> FEEDBACK: {fb}')
            if wrong:
                self.facts['wrong_answers'] += 1
                if 'wrong_fb' not in self.shots:
                    self.shot('feedback-wrong')
            elif 'right_fb' not in self.shots:
                self.shot('feedback-right')
            self.timed_click('[data-testid="feedback"] [data-testid="continue"]')
        raise RuntimeError(f'{label} did not finish')

    def complete(self, label):
        pg = self.page
        pg.wait_for_selector('[data-testid="complete"]')
        pg.wait_for_timeout(1500)
        self.say(f'\n### RECAP ({label})\n{self.text("[data-testid=complete]")}')
        if 'recap' not in self.shots:
            self.shot('recap')
        pg.click('[data-testid="complete-continue"]')
        pg.wait_for_selector('[data-testid="path"], .tabbar')

    def node(self, nid):
        pg = self.page
        pg.click('[data-tab="Learn"]')
        loc = pg.locator(f'[data-node="{nid}"]')
        loc.scroll_into_view_if_needed()
        state = loc.get_attribute('data-state')
        if state != 'current':
            self.facts['confusions'].append(f'node {nid} state {state} when expected current')
        loc.click()
        self.say(f'\nNODE CARD: {self.text(".node-card").replace(chr(10), " / ")}')
        pg.click('[data-testid="node-start"]')
        pg.wait_for_selector('[data-testid="session"]')

    # ---- scenes ----------------------------------------------------------
    def set_day(self, offset, hour=None):
        d = START + timedelta(days=offset)
        if hour is not None:
            d = d.replace(hour=hour, minute=0)
        self.page.clock.set_system_time(d)
        self.page.reload()
        self.page.wait_for_load_state('networkidle')
        self.page.wait_for_selector('.tabbar, [data-testid="onboarding"]')
        self.page.wait_for_timeout(300)
        self.say(f'\n\n## DAY {offset + 1} ({d:%a %d %b})')
        if self.page.locator('.tabbar').count():
            self.page.click('[data-tab="Learn"]')
            self.say('HOME: ' + self.text('.home').replace('\n', ' / ')[:900])

    def onboarding(self):
        p, pg = self.p, self.page
        self.where = 'onboarding'
        self.say('# Onboarding')
        self.say('WELCOME: ' + self.text('[data-testid="onboarding"]').replace('\n', ' / '))
        self.shot('welcome')
        pg.click('[data-testid="ob-start"]')
        self.say('FIRST QUESTION: ' + self.text('.onboard-body').replace('\n', ' / '))
        pg.click('[data-opt="1"]' if p['first_question_correct'] else '[data-opt="0"]')
        pg.click('[data-testid="ob-check"]')
        self.say('FIRST FEEDBACK: ' + self.text('.inline-fb'))
        pg.click('[data-testid="ob-next"]')
        self.say('GOAL: ' + self.text('.onboard-body').replace('\n', ' / '))
        pg.click(f'[data-goal="{p["goal"]}"]')
        pg.click('[data-testid="ob-next"]')
        self.say('LEVEL: ' + self.text('.onboard-body').replace('\n', ' / '))
        pg.click(f'[data-level="{p["level"]}"]')
        pg.get_by_role('button', name=re.compile('^' + re.escape(p['daily']))).click()
        pg.click('[data-testid="ob-next"]')
        self.say('HABIT: ' + self.text('.onboard-body').replace('\n', ' / '))
        pg.fill('[data-testid="habit-cue"]', p['cue'])
        pg.fill('[data-testid="habit-time"]', p['time'])
        self.shot('habit')
        if p['download_ics']:
            with pg.expect_download() as d:
                pg.click('[data-testid="ob-ics"]')
            path = ROOT / 'persona-transcripts' / f'{self.pid}.ics'
            path.parent.mkdir(parents=True, exist_ok=True)
            d.value.save_as(str(path))
            ics = path.read_text()
            hh, mm = p['time'].split(':')
            self.facts['ics'] = {
                'repeats_daily': 'RRULE:FREQ=DAILY' in ics,
                'time_ok': f'T{hh}{mm}00' in ics.split('DTSTART:')[1].split('\r')[0],
                'cue_ok': p['cue'] in ics,
                'summary': re.search(r'SUMMARY:(.*)', ics).group(1).strip(),
            }
        pg.click('[data-testid="ob-next"]')
        self.say('PROMISE: ' + self.text('.onboard-body').replace('\n', ' / '))
        pg.click('[data-testid="ob-finish"]')
        pg.wait_for_selector('[data-testid="path"]')
        self.shot('home-day1')

    def review_if_due(self):
        pg = self.page
        pg.click('[data-tab="Review"]')
        self.say('REVIEW TAB: ' + self.text('.page').replace('\n', ' / ')[:500])
        if pg.locator('[data-testid="start-review"]').count():
            if 'review-tab' not in self.shots:
                self.shot('review-tab')
            pg.click('[data-testid="start-review"]')
            self.play('review')
            self.complete('review')
            return True
        return False

    def finish_state(self):
        pg = self.page
        pg.click('[data-tab="Progress"]')
        pg.wait_for_timeout(300)
        self.say('PROGRESS TAB: ' + self.text('.page').replace('\n', ' / ')[:1500])
        self.shot('progress')
        pg.click('[data-tab="Learn"]')
        pg.wait_for_timeout(300)
        self.facts['unit2_unlocked'] = pg.locator('[data-testid="unit-2"]').get_attribute('data-unlocked')
        self.facts['unit2_text'] = self.text('[data-testid="unit-2"]').replace('\n', ' / ')
        self.facts['today_card'] = self.text('.today-card').replace('\n', ' / ')
        self.say('HOME END: ' + self.text('.home').replace('\n', ' / ')[:1200])
        self.facts['xp'] = pg.get_by_test_id('xp').first.inner_text()
        self.facts['streak'] = pg.get_by_test_id('streak').first.inner_text()
        self.facts['freezes'] = pg.get_by_test_id('freezes').first.inner_text()


def run_persona(pw, pid, rnd):
    p = PERSONAS[pid]
    ev = ROOT / 'docs' / 'persona-evidence' / f'round-{rnd}'
    ev.mkdir(parents=True, exist_ok=True)
    browser = pw.chromium.launch(headless=True, executable_path=CHROME)
    ctx = browser.new_context(viewport={'width': 390, 'height': 844}, device_scale_factor=1, is_mobile=True, has_touch=True,
                              accept_downloads=True, color_scheme='dark' if p['theme'] == 'dark' else 'light')
    page = ctx.new_page()
    cdp = ctx.new_cdp_session(page)
    cdp.send('Emulation.setCPUThrottlingRate', {'rate': 4})  # a mid-range phone
    cdp.send('Network.enable')
    cdp.send('Network.emulateNetworkConditions', {'offline': False, 'latency': 150, 'downloadThroughput': 1.6e6 / 8, 'uploadThroughput': 750e3 / 8})  # slow 4G
    r = Run(pid, rnd, page, ctx, ev)
    page.clock.install(time=START)

    # Record what storage held when the page started (before the app writes its default state).
    page.add_init_script("if (window.__lsAtStart === undefined) { window.__lsAtStart = localStorage.length }")
    t0 = time.perf_counter()
    page.goto(URL)
    page.wait_for_selector('[data-testid="onboarding"]')
    r.facts['cold_first_screen_ms'] = round((time.perf_counter() - t0) * 1000)
    r.facts['nav'] = page.evaluate('(() => { const n = performance.getEntriesByType("navigation")[0]; return n ? {dcl: Math.round(n.domContentLoadedEventEnd), load: Math.round(n.loadEventEnd)} : null })()')
    r.facts['fresh_storage'] = page.evaluate('window.__lsAtStart') == 0

    r.onboarding()
    lessons_left = list(LESSONS)
    ordinal = 0
    last_off = 0
    for day_i, off in enumerate(p['days']):
        last_off = off
        if day_i > 0:
            r.set_day(off, hour=int(p['time'].split(':')[0]))
        else:
            r.say(f'\n\n## DAY 1 ({START:%a %d %b})')
        if p['offline_day'] == off:
            page.evaluate('navigator.serviceWorker.ready')
            page.reload(); page.wait_for_load_state('networkidle')
            ctx.set_offline(True)
            page.reload()
            page.wait_for_selector('[data-testid="path"]')
            r.say('(OFFLINE reload) HOME: ' + r.text('.home').replace('\n', ' / ')[:300])
            r.shot('offline')
        if day_i > 0:
            r.review_if_due()
        for k in range(p['per_day']):
            if not lessons_left:
                break
            nid = lessons_left.pop(0)
            r.node(nid)
            if p['mid_lesson_leave'] and ordinal == 2:
                r.play(f'lesson {nid} (interrupted)', leave_after=5)
                r.say('(returns later and starts the same lesson again)')
                r.node(nid)
            r.play(f'lesson {nid}')
            r.complete(f'lesson {nid}')
            ordinal += 1
        if p['offline_day'] == off:
            ctx.set_offline(False)
        # reload mid-journey: progress must persist
        xp_before = page.get_by_test_id('xp').first.inner_text()
        page.reload(); page.wait_for_load_state('networkidle'); page.wait_for_selector('[data-testid="path"]')
        if page.get_by_test_id('xp').first.inner_text() != xp_before:
            r.facts['confusions'].append('XP changed across reload')
        if not lessons_left:
            break
    # remaining lessons on extra days if the schedule was too short
    extra = last_off
    while lessons_left:
        extra += 1
        last_off = extra
        r.set_day(extra, hour=int(p['time'].split(':')[0]))
        r.review_if_due()
        for _ in range(p['per_day']):
            if lessons_left:
                nid = lessons_left.pop(0)
                r.node(nid); r.play(f'lesson {nid}'); r.complete(f'lesson {nid}')

    # unit review + unit check (fail, then pass) on the next day after the last one used
    r.set_day(last_off + 1, hour=int(p['time'].split(':')[0]))
    r.review_if_due()
    r.node('1.review'); r.play('unit review'); r.complete('unit review')
    r.node('1.check')
    attempt = 1
    r.play('unit check (attempt 1)', forced_wrong=4)
    while True:
        r.where = 'check result'
        page.wait_for_timeout(700)
        result = r.text('[data-testid="check-retry"]') or r.text('[data-testid="unit-win"]')
        r.say(f'\n### UNIT CHECK RESULT (attempt {attempt})\n' + result)
        if page.locator('[data-testid="check-retry"]').count() == 0:
            break
        if attempt == 1:
            r.shot('check-retry')
        attempt += 1
        r.err_scale = 2 * (attempt - 1)
        if attempt > 4:
            raise RuntimeError('unit check not passed in 4 attempts')
        page.click('[data-testid="check-again"]')
        r.play(f'unit check (attempt {attempt})')
    r.facts['check_attempts'] = attempt
    page.wait_for_selector('[data-testid="unit-win"]')
    page.wait_for_timeout(1400)
    r.say('\n### UNIT WIN\n' + r.text('[data-testid="unit-win"]'))
    r.shot('unit-win')
    page.click('[data-testid="win-continue"]')
    page.reload(); page.wait_for_load_state('networkidle'); page.wait_for_selector('[data-testid="path"]')
    r.finish_state()
    r.facts['screen_change_ms_median'] = round(statistics.median(r.latency)) if r.latency else None
    r.facts['screen_change_ms_p95'] = round(sorted(r.latency)[int(len(r.latency) * .95) - 1]) if r.latency else None
    r.facts['console_problems'] = r.problems
    r.facts['screens_timed'] = len(r.latency)
    r.facts['shots'] = r.shots
    r.facts['backups'] = page.evaluate("Object.keys(localStorage).filter(k => k.startsWith('tally.backup.')).length")
    (ev / f'{pid}.json').write_text(json.dumps(r.facts, indent=2))
    out = ROOT / 'persona-transcripts'
    out.mkdir(parents=True, exist_ok=True)
    (out / f'{pid}.md').write_text('\n'.join(r.t))
    browser.close()
    return r.facts


if __name__ == '__main__':
    ap = argparse.ArgumentParser()
    ap.add_argument('--round', type=int, required=True)
    ap.add_argument('--persona', nargs='*', default=list(PERSONAS))
    a = ap.parse_args()
    bad = 0
    with sync_playwright() as pw:
        for pid in a.persona:
            f = run_persona(pw, pid, a.round)
            print(f'{pid}: xp {f["xp"]} streak {f["streak"]} unit2 {f["unit2_unlocked"]} cold {f["cold_first_screen_ms"]}ms '
                  f'screen median {f["screen_change_ms_median"]}ms problems {len(f["console_problems"])} confusions {f["confusions"]}')
            bad += len(f['console_problems'])
    sys.exit(1 if bad else 0)
