// Gym-goer persona playtests. node tests/persona.js <round>   (server on :8080)
// Each persona starts from cleared storage, on a faked clock across several days, CPU 4x throttled + slow 4G.
const {chromium}=require('playwright');const fs=require('fs');
const ROUND=process.argv[2]||'1';const EV=`${__dirname}/../docs/persona-evidence/round-${ROUND}`;fs.mkdirSync(EV,{recursive:true});
const URL='http://localhost:8080/';
const results={};
async function newPersona(b,name,{offline=false}={}){
  const ctx=await b.newContext({viewport:{width:390,height:844},deviceScaleFactor:2,hasTouch:true,isMobile:true,serviceWorkers:'allow'});
  const pg=await ctx.newPage();const cdp=await ctx.newCDPSession(pg);
  await cdp.send('Emulation.setCPUThrottlingRate',{rate:4});
  await cdp.send('Network.emulateNetworkConditions',{offline:false,latency:150,downloadThroughput:1.6e6/8,uploadThroughput:750e3/8});
  const P={name,pg,ctx,errs:[],log:[],taps:0,facts:{},findings:[],t:Date.now()};
  pg.on('pageerror',e=>P.errs.push('page: '+e.message));pg.on('console',m=>{if(m.type()==='error')P.errs.push('console: '+m.text());});pg.on('dialog',d=>d.accept());
  P.say=s=>{P.log.push(s);};P.find=(sev,s)=>{P.findings.push(sev+': '+s);P.log.push('  ⚑ '+sev+': '+s);};
  P.day=async(iso)=>{await pg.clock.setFixedTime(new Date(iso+'T18:00:00'));};
  P.shot=async n=>{await pg.waitForTimeout(250);await pg.screenshot({path:`${EV}/${name}-${n}.png`});};
  P.nav=async t=>{await P.tap('#menu');await P.tap('#tabs a[data-tab='+t+']');};
  P.prof=async id=>{await P.tap('#menu');await P.tap('#people [data-id='+id+']');};
  P.tap=async(sel)=>{P.taps++;await pg.click(sel);};
  P.type=async(sel,v)=>{P.taps++;await pg.fill(sel,''+v);};
  P.screen=async(label)=>{const t=(await pg.locator('main').innerText()).replace(/\n+/g,' | ').slice(0,260);P.say(`[${label}] ${t}`);};
  P.set=async(ei,j,w,r)=>{ // type weight+reps then check
    if(w!==null)await P.type(`[data-e="${ei}"] [data-f=w][data-j="${j}"]`,w);
    if(r!==null)await P.type(`[data-e="${ei}"] [data-f=r][data-j="${j}"]`,r);
    await P.tap(`[data-e="${ei}"] [data-act=chk][data-j="${j}"]`);};
  P.read=async(ei,j)=>({w:await pg.inputValue(`[data-e="${ei}"] [data-f=w][data-j="${j}"]`),r:await pg.inputValue(`[data-e="${ei}"] [data-f=r][data-j="${j}"]`)});
  P.store=()=>pg.evaluate(()=>JSON.parse(localStorage.getItem('lifts.v1')));
  P.open=async()=>{await pg.goto(URL);await pg.waitForSelector('h1');};
  return P;
}
const done=async P=>{P.facts.taps=P.taps;P.facts.appErrors=P.errs.length;P.facts.errors=P.errs.slice(0,3);fs.writeFileSync(`${EV}/${P.name}.json`,JSON.stringify({facts:P.facts,findings:P.findings},null,2));fs.writeFileSync(`${EV}/${P.name}.md`,P.log.join('\n'));results[P.name]=P;await P.ctx.close();};

// ---------- Bea, 19: first week in a gym ----------
async function bea(b){const P=await newPersona(b,'bea');const {pg}=P;
  await P.day('2026-11-26');const t0=Date.now();await P.open();P.facts.firstScreenMs=Date.now()-t0;await P.screen('home');
  P.say('She edits Full Body: swaps Barbell Row for Push-Up and Triceps Pushdown for Plank (nothing heavy yet).');
  await P.nav('routines');await P.tap('[data-act=goto][data-to="#/editor/full"]');
  await P.tap('[data-act=swap][data-i="2"]');await P.type('#edq','Push-Up');await P.tap('[data-act=pick]');
  await P.tap('[data-act=swap][data-i="5"]');await P.type('#edq','Plank');await P.tap('[data-act=pick]');
  await P.nav('home');await P.tap('[data-act=start][data-id=full]');await pg.waitForSelector('.set');await P.shot('workout');
  P.say('Squat: empty bar 20 kg x10, x10, x8.');for(const [j,r] of [[0,10],[1,10],[2,8]])await P.set(0,j,20,r);
  P.say('Bench: bar only 20 kg x8, x8, then taps the tick on set 3 by accident (nothing typed).');
  await P.set(1,0,20,8);await P.set(1,1,20,8);await P.tap('[data-e="1"] [data-act=chk][data-j="2"]');
  P.facts.accidentalTickBlocked=!(await pg.locator('[data-e="1"] [data-act=chk][data-j="2"].on').count());P.say('Accidental empty tick '+(P.facts.accidentalTickBlocked?'was blocked with: "'+await pg.locator('#toast').innerText()+'"':'was accepted'));
  P.say('Her phone locks; she reopens and the app reloads.');await pg.reload();await pg.waitForSelector('.set');
  const kept=await P.read(0,0);P.facts.draftKeptAfterLock=kept.w==='20'&&kept.r==='10';
  P.say('Push-Up: no weight (bodyweight). She types reps only: 6, 5, 5 and ticks each set.');
  for(const [j,r] of [[0,6],[1,5],[2,5]])await P.set(2,j,null,r);
  P.say('Plank: she types seconds in the reps box: 30, 30, 25.');for(const [j,r] of [[0,30],[1,30],[2,25]])await P.set(5,j,null,r);
  const checked=await pg.locator('.chk.on').count();await P.tap('[data-act=finish]');await pg.waitForSelector('text=Recent');
  const st=await P.store();const saved=st.profiles.p1.logs[0].entries.reduce((a,e)=>a+e.sets.length,0);
  P.facts.setsTicked=checked;P.facts.setsSaved=saved;P.say(`She ticked ${checked} sets; the log kept ${saved}.`);
  if(saved<checked)P.find('major',`${checked-saved} ticked set(s) vanished at Finish with no warning (a bodyweight set with no weight, or a tick with nothing typed). Push-Up and Plank were never recorded.`);
  await P.shot('after-first');
  P.say('Day 3: second workout. She expects Push-Up and Plank to have remembered numbers.');await P.day('2026-11-28');await pg.reload();await pg.waitForSelector('h1');
  await P.tap('[data-act=start][data-id=full]');await pg.waitForSelector('.set');
  const pu=await P.read(2,0),pl=await P.read(5,0);P.say(`Push-Up first set shows w="${pu.w}" r="${pu.r}"; Plank shows w="${pl.w}" r="${pl.r}".`);
  if(!pu.r)P.find('major','Push-Up shows no previous reps on day 3, so she cannot see what to beat.');
  P.say('Push-Up last-time line: '+(await pg.locator('[data-e="2"] .mute').first().innerText()));P.say('Plank last-time line: '+(await pg.locator('[data-e="5"] .mute').first().innerText()));
  const nudges=await pg.locator('.nudge').allInnerTexts();P.say('Nudges: '+(nudges.join('; ')||'none'));
  P.facts.nudges=nudges;
  await P.screen('workout day 3');await P.shot('day3');
  const ph=await pg.locator('[data-e="5"] input[data-f=w]').first().getAttribute('placeholder');P.facts.plankWeightPlaceholder=ph;
  await done(P);}

// ---------- Marcus, 31: experienced, push/pull/legs ----------
async function marcus(b){const P=await newPersona(b,'marcus');const {pg}=P;
  await P.day('2026-11-24');await P.open();
  P.say('Day 1 Push. Bench 100 x12 x3, Incline DB 32 x12 x3, OHP 60 x10, 10, 9 (no isolation work today, he skips the rest).');
  await P.tap('[data-act=start][data-id=push]');await pg.waitForSelector('.set');
  const t0=P.taps;
  for(let j=0;j<3;j++)await P.set(0,j,100,12);for(let j=0;j<3;j++)await P.set(1,j,32,12);
  await P.set(2,0,60,10);await P.set(2,1,60,10);await P.set(2,2,60,9);
  P.say('Bench is busy next time, so he wants to swap exercise 4 (Lateral Raise) for Cable Lateral Raise mid-workout.');
  const swapInWorkout=await pg.locator('[data-act=swapwk], [data-act=swap]').count();P.facts.canSwapDuringWorkout=swapInWorkout>0;
  if(!swapInWorkout)P.find('major','No way to swap or add an exercise during a workout (machine taken). He must leave, edit the routine permanently, and come back.');
  if(swapInWorkout){await P.tap('[data-e="3"] [data-act=swapwk]');await P.type('#wkq','Cable Lateral');await P.tap('[data-act=wkpick]');await P.set(3,0,7,12);P.say('He swaps to '+(await pg.locator('[data-e="3"] .exname').first().innerText())+' and logs 7 kg x12.');P.facts.swapWorked=/cable lateral/i.test(await pg.locator('[data-e="3"] .exname').first().innerText());}
  await P.tap('[data-act=finish]');await pg.waitForSelector('text=Recent');
  const toast1=await pg.locator('#toast').innerText();P.say('Toast on finish: "'+toast1+'"');P.facts.finishToast=toast1;
  P.facts.tapsDay1=P.taps-t0;
  P.say('Day 4, Pull: Deadlift 140 x5 x3 (5 reps is the plan), 142.5 top set x3 as a 4th set using +Set.');
  await P.day('2026-11-27');await pg.reload();await pg.waitForSelector('h1');
  await P.tap('[data-act=start][data-id=pull]');await pg.waitForSelector('.set');
  for(let j=0;j<3;j++)await P.set(0,j,140,5);await P.tap('[data-e="0"] [data-act=addset]');await P.set(0,3,142.5,3);
  await P.tap('[data-act=finish]');await pg.waitForSelector('text=Recent');
  P.say('Day 8, Push again: he expects the heavier bench the app promised.');
  await P.day('2026-12-01');await pg.reload();await pg.waitForSelector('h1');await P.tap('[data-act=start][data-id=push]');await pg.waitForSelector('.set');
  const bb=await P.read(0,0),db=await P.read(1,0),oh=await P.read(2,0),oh3=await P.read(2,2);
  P.say(`Bench opens at ${bb.w}x${bb.r}; Incline DB ${db.w}x${db.r}; OHP set1 ${oh.w}x${oh.r}, set3 ${oh3.w}x${oh3.r}.`);
  P.facts.benchSuggestion=bb.w+'x'+bb.r;P.facts.dbSuggestion=db.w+'x'+db.r;P.facts.ohpSuggestion=oh.w+'x'+oh.r+' / '+oh3.w+'x'+oh3.r;
  if(bb.w!=='102.5')P.find('major','Bench did not go to 102.5 after 12,12,12 at 100.');
  await P.screen('push day 8');await P.shot('push-day8');
  P.say('He tries to nudge himself: taps the weight box on the bench to replace 102.5 with 105.');
  await pg.locator('[data-e="0"] [data-f=w][data-j="0"]').tap();await pg.waitForTimeout(150);
  const selected=await pg.evaluate(()=>{const a=document.activeElement;return a&&a.selectionStart===0&&a.selectionEnd===a.value.length;});
  P.facts.weightSelectedOnFocus=selected;if(!selected)P.find('minor','Tapping a weight box puts the caret at the end: he has to delete digits before typing a new weight (gloves/sweat make this fiddly).');
  P.say('He does bench 105 x12 on set 1 (a PR), types set 2 as 105 x10 but forgets to tick it, and finishes.');
  await P.set(0,0,105,12);await P.type('[data-e="0"] [data-f=w][data-j="1"]',105);await P.type('[data-e="0"] [data-f=r][data-j="1"]',10);
  await P.tap('[data-act=finish]');await pg.waitForSelector('text=Recent');const t2=await pg.locator('#toast').innerText();P.facts.prToast=t2;P.say('Toast: "'+t2+'"');
  if(!/PR/.test(t2))P.find('minor','No acknowledgement of a personal record when he lifts a PR.');
  const st8=await P.store();const lastLog=st8.profiles.p1.logs[st8.profiles.p1.logs.length-1];P.facts.untickedSetKept=lastLog.entries[0].sets.length===2;
  if(!P.facts.untickedSetKept)P.find('major','A set he typed but forgot to tick was silently dropped at Finish.');
  await P.nav('progress');await pg.waitForSelector('#prsel');await P.shot('progress');
  const body=await pg.locator('main').innerText();P.say('Progress: '+body.replace(/\n+/g,' | ').slice(0,200));
  await done(P);}

// ---------- Priya & Sam: one phone, two people ----------
async function couple(b){const P=await newPersona(b,'priya-sam');const {pg}=P;
  await P.day('2026-11-25');await P.open();
  await P.type('#pname','Priya');await P.tap('[data-act=rename]');await P.prof('p2');await P.type('#pname','Sam');await P.tap('[data-act=rename]');await P.prof('p1');
  P.say('Priya starts Full Body, logs squat 40x10 x3, then hands the phone to Sam at the rack.');
  await P.tap('[data-act=start][data-id=full]');await pg.waitForSelector('.set');
  const hdr=await pg.locator('h1').innerText();const mainTxt=await pg.locator('main').innerText();P.facts.workoutShowsWhoseIsIt=/Priya/.test(mainTxt);
  if(!P.facts.workoutShowsWhoseIsIt)P.find('major','The workout screen never says whose workout it is. If the phone is passed around, sets can be logged into the wrong person.');
  for(let j=0;j<3;j++)await P.set(0,j,40,10);
  await P.nav('home');await P.prof('p2');
  P.say('Sam starts Full Body: squat 80x8 x3.');await P.tap('[data-act=start][data-id=full]');await pg.waitForSelector('.set');
  const sam=await P.read(0,0);P.facts.samSeesPriyaNumbers=sam.w==='40';if(sam.w==='40')P.find('blocker','Sam sees Priya\'s weights.');
  for(let j=0;j<3;j++)await P.set(0,j,80,8);await P.tap('[data-act=finish]');await pg.waitForSelector('text=Recent');
  await P.prof('p1');await P.screen('Priya home');
  const resume=await pg.locator('text=Workout in progress').count();P.facts.priyaDraftWaiting=resume===1;
  await P.tap('[data-act=goto][data-to="#/workout"]');await pg.waitForSelector('.set');const pr=await P.read(0,2);P.facts.priyaValuesIntact=pr.w==='40'&&pr.r==='10';
  const st=await P.store();P.facts.logsPriya=st.profiles.p1.logs.length;P.facts.logsSam=st.profiles.p2.logs.length;
  await P.tap('[data-act=finish]');await pg.waitForSelector('text=Recent');
  await P.day('2026-11-27');await pg.reload();await pg.waitForSelector('h1');
  await P.tap('[data-act=start][data-id=full]');await pg.waitForSelector('.set');const p2=await P.read(0,0);P.facts.priyaNext=p2.w+'x'+p2.r;
  await P.shot('priya-day2');await done(P);}

// ---------- Dev, 45: back after six weeks, bad knee, typo ----------
async function dev(b){const P=await newPersona(b,'dev');const {pg}=P;
  await P.day('2026-10-06');await P.open();await P.tap('[data-act=start][data-id=legs]');await pg.waitForSelector('.set');
  P.say('Six weeks ago, last session: squat 100x12 x3. In his hurry he typed the second leg press set as 1000 instead of 100.');
  for(let j=0;j<3;j++)await P.set(0,j,100,12);await P.set(2,0,200,12);await P.set(2,1,1000,12);await P.set(2,2,200,12);await P.tap('[data-act=finish]');await pg.waitForSelector('text=Recent');
  P.say('Today (25 Nov) he comes back. He expects a deload, but the app suggests a heavier squat.');
  await P.day('2026-11-25');await pg.reload();await pg.waitForSelector('h1');
  await P.tap('[data-act=start][data-id=legs]');await pg.waitForSelector('.set');
  const sq=await P.read(0,0);P.facts.squatAfterBreak=sq.w+'x'+sq.r;const nud=await pg.locator('.nudge').count();P.facts.nudgesAfterBreak=nud;
  const days=await pg.locator('main').innerText();P.facts.mentionsGap=/Welcome back|weeks/.test(days);P.say('Workout screen says: '+days.replace(/\n+/g,' | ').slice(0,170));
  if(nud&&!P.facts.mentionsGap)P.find('major',`After a 7-week gap the app says "Go heavier" on ${nud} lift(s) and never mentions the gap. A returning lifter could injure themselves following it.`);
  P.say('He lowers squat to 70x10, and he removes Leg Extension from his routine because of his knee (the routine editor).');
  await P.tap('[data-act=discard]');await P.nav('routines');await P.tap('[data-act=goto][data-to="#/editor/legs"]');
  await pg.locator('[data-e], .card:has-text("Leg Extension") [data-act=rm]').first().click().catch(()=>{});
  await P.nav('progress');await pg.waitForSelector('#prsel');
  await pg.selectOption('#prsel','legpress');const txt=await pg.locator('main').innerText();P.say('Progress for Leg Press: '+txt.replace(/\n+/g,' | ').slice(0,200));
  P.facts.bestShown=(txt.match(/Top weight (\d+)/)||[])[1];
  P.say('He notices the 1000 kg typo from six weeks ago and wants to fix it.');
  await P.nav('home');await pg.waitForSelector('text=Recent');const edit=await pg.locator('[data-act=editlog]').count();P.facts.canEditPastWorkout=edit>0;
  if(!edit)P.find('major','A mistyped weight in a past workout cannot be corrected. The only option is Delete, losing the whole session, and the 1000 kg ruins his Progress chart and best.');
  if(edit){await P.tap('[data-act=editlog]');await pg.waitForSelector('.set');P.say('He taps Edit on the old session and corrects the leg press set.');
    const li=await pg.locator('[data-e]').evaluateAll(els=>els.map((e,i)=>[i,e.querySelector('.exname').textContent]));const lp=li.find(x=>/Leg Press/.test(x[1]))[0];
    await P.type(`[data-e="${lp}"] [data-f=w][data-j="1"]`,200);await P.tap('[data-act=finish]');await pg.waitForSelector('text=Recent');
    await P.nav('progress');await pg.waitForSelector('#prsel');await pg.selectOption('#prsel','legpress');
    P.facts.bestAfterFix=((await pg.locator('main').innerText()).match(/Top weight (\d+)/)||[])[1];P.say('Leg Press best after the fix: '+P.facts.bestAfterFix+' kg.');}
  await P.shot('home-history');await done(P);}

// ---------- Zoe: basement gym, no signal, one-handed, sweaty ----------
async function zoe(b){const P=await newPersona(b,'zoe');const {pg,ctx}=P;
  await P.day('2026-11-25');await P.open();await pg.evaluate(()=>navigator.serviceWorker.ready);await pg.reload();await pg.waitForSelector('h1');
  await ctx.setOffline(true);P.say('She walks into the basement gym: no signal at all. She opens the app cold from the home screen.');
  const t0=Date.now();await pg.reload();await pg.waitForSelector('h1');P.facts.offlineColdOpenMs=Date.now()-t0;
  await P.tap('[data-act=start][data-id=pull]');await pg.waitForSelector('.set');
  P.say('One-handed, thumb only. She checks tap sizes of the controls she uses between sets.');
  const sizes=await pg.evaluate(()=>[...document.querySelectorAll('[data-act=chk],[data-act=addset],input[data-f]')].slice(0,12).map(e=>{const r=e.getBoundingClientRect();return Math.round(r.width)+'x'+Math.round(r.height)}));P.facts.tapSizes=[...new Set(sizes)];
  P.say('She does deadlift 60x8 x3 and lat pulldown 40x10 x3, with a minute between sets.');
  for(let j=0;j<3;j++)await P.set(0,j,60,8);
  const rest=await pg.locator('#rest').isVisible()?1:0;if(rest)P.say('Rest timer shows: '+await pg.locator('#rest').innerText());P.facts.hasRestTimer=rest>0;
  if(!rest)P.find('major','No rest timer. She is counting rest on the phone clock, switching away from the app between sets.');
  await P.shot('between-sets');
  const wl=await pg.evaluate(()=>/wakeLock/.test(document.querySelector('script[src="app.js"]')?'':'')||null);
  const src=require('fs').readFileSync(__dirname+'/../app.js','utf8');P.facts.usesWakeLock=/wakeLock/.test(src);
  if(!P.facts.usesWakeLock)P.find('major','Screen is not kept awake during a workout: the phone locks between sets, and she has to unlock with a wet thumb every time.');
  for(let j=0;j<3;j++)await P.set(1,j,40,10);
  await P.tap('[data-act=finish]');await pg.waitForSelector('text=Recent');
  await P.nav('data');const [dl]=await Promise.all([pg.waitForEvent('download'),P.tap('[data-act=export]')]);P.facts.offlineExport=!!(await dl.path());
  await P.screen('data');await P.shot('offline-data');
  await ctx.setOffline(false);await done(P);}

(async()=>{const b=await chromium.launch();
  for(const f of [bea,marcus,couple,dev,zoe]){try{await f(b);}catch(e){console.log('HARNESS ERROR in '+f.name+': '+e.message.split('\n')[0]);}}
  await b.close();
  for(const [n,P] of Object.entries(results)){console.log('\n=== '+n+' ===\n'+P.log.join('\n'));console.log('FACTS',JSON.stringify(P.facts));}
})();
