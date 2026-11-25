// Visual sweep: every screen, light+dark, 390x844. node tests/sweep.js  (server on :8080, axe-core path via AXE env)
const nav=async(pg,t)=>{await pg.click('#menu');await pg.click('#tabs a[data-tab='+t+']');};
const prof=async(pg,id)=>{await pg.click('#menu');await pg.click('#people [data-id='+id+']');};
const {chromium}=require('playwright');const fs=require('fs');
const AXE=fs.readFileSync(process.env.AXE||'/tmp/axe/node_modules/axe-core/axe.min.js','utf8');
const OUT=process.env.OUT||'/tmp/sweep';fs.mkdirSync(OUT,{recursive:true});
let hard=0;
async function checks(pg,label){
  const r=await pg.evaluate(()=>{const o={overflow:document.documentElement.scrollWidth>innerWidth+1,small:[],tiny:[],emoji:[]};
    document.querySelectorAll('button,a,input,select,[role=button]').forEach(e=>{const b=e.getBoundingClientRect();if(!b.width)return;if(b.height<44-.5||b.width<44-.5){ if(!(e.type==='file')) o.small.push((e.dataset.act||e.tagName)+' '+Math.round(b.width)+'x'+Math.round(b.height)+' '+(e.textContent||'').trim().slice(0,12));}});
    document.querySelectorAll('body *').forEach(e=>{if(e.children.length)return;const t=e.textContent.trim();if(!t)return;const fs=parseFloat(getComputedStyle(e).fontSize);if(fs<12)o.tiny.push(t.slice(0,15)+' '+fs);if(/\p{Extended_Pictographic}/u.test(t)&&!/^[✓↑↓✕−]$/.test(t))o.emoji.push(t.slice(0,10));});
    return o;});
  await pg.evaluate(AXE);const ax=await pg.evaluate(()=>axe.run(document,{runOnly:['wcag2a','wcag2aa','wcag21aa','wcag22aa']}));
  const msgs=[];if(r.overflow)msgs.push('horizontal overflow');if(r.small.length)msgs.push('tap<44: '+[...new Set(r.small)].join('; '));if(r.tiny.length)msgs.push('tiny text: '+r.tiny.join('; '));if(r.emoji.length)msgs.push('emoji: '+r.emoji.join(','));
  ax.violations.forEach(v=>msgs.push('axe '+v.id+' ('+v.impact+'): '+v.nodes.slice(0,3).map(n=>n.target.join(' ')).join(' | ')));
  console.log((msgs.length?'✗ ':'✓ ')+label+(msgs.length?'\n    '+msgs.join('\n    '):''));if(msgs.length)hard++;
}
(async()=>{const b=await chromium.launch();
for(const scheme of ['light','dark']){
  const c=await b.newContext({viewport:{width:390,height:844},colorScheme:scheme,deviceScaleFactor:1});const pg=await c.newPage();pg.on('dialog',d=>d.accept());
  const errs=[];pg.on('pageerror',e=>errs.push(e.message));pg.on('console',m=>{if(m.type()==='error')errs.push(m.text());});pg.on('requestfailed',r=>errs.push('reqfail '+r.url()));
  const shot=async n=>{await pg.waitForTimeout(150);await pg.screenshot({path:`${OUT}/${scheme}-${n}.png`,fullPage:true});await checks(pg,scheme+' '+n);};
  await pg.goto('http://localhost:8080/');await pg.waitForSelector('h1');await shot('home-empty');await pg.click('#menu');await pg.waitForTimeout(400);await shot('drawer-open');await pg.keyboard.press('Escape');
  await pg.click('[data-act=start][data-id=push]');await pg.waitForSelector('.set');await shot('workout-empty');
  for(const [i,w] of [[0,60],[1,20]])for(let j=0;j<3;j++){await pg.fill(`[data-e="${i}"] [data-f=w][data-j="${j}"]`,''+w);await pg.fill(`[data-e="${i}"] [data-f=r][data-j="${j}"]`,'12');await pg.click(`[data-e="${i}"] [data-act=chk][data-j="${j}"]`);}
  await shot('workout-filled');await pg.click('[data-act=finish]');await pg.waitForSelector('text=Recent');await shot('home-with-log');
  await pg.click('[data-act=start][data-id=push]');await pg.waitForSelector('.set');await shot('workout-nudge');await pg.click('[data-act=discard]');
  await nav(pg,'progress');await pg.waitForSelector('#prsel');await shot('progress');
  await nav(pg,'routines');await shot('routines');
  await pg.click('[data-act=goto][data-to="#/editor/push"]');await shot('editor');
  await nav(pg,'exercises');await pg.waitForSelector('.exrow');await shot('exercises');
  await pg.click('.exrow');await pg.waitForSelector('svg.figure');await shot('exercise-detail');
  await nav(pg,'data');await shot('data');
  await nav(pg,'progress');await pg.evaluate(()=>{localStorage.clear()});await pg.reload();await shot('progress-empty');
  console.log(scheme,'console/page errors:',errs.length?errs:'none');if(errs.length)hard++;
}
await b.close();console.log(hard?`${hard} screens with problems`:'sweep clean');process.exit(hard?1:0);})();
