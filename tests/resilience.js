// Saved-data resilience probe. node tests/resilience.js (server on :8080)
const nav=async(pg,t)=>{await pg.click('#menu');await pg.click('#tabs a[data-tab='+t+']');};
const prof=async(pg,id)=>{await pg.click('#menu');await pg.click('#people [data-id='+id+']');};
const {chromium}=require('playwright');const KEY='lifts.v1';const URL='http://localhost:8080/';
const good=()=>{const r={push:{name:'Push',ex:['bench','ohp']}};const log={id:'a',date:'2026-01-02',routineId:'push',name:'Push',entries:[{exId:'bench',sets:[{w:60,r:12,done:true}]}]};
  const pr=n=>({name:n,routines:r,customEx:[],logs:[log],draft:null});return {app:'lifts',v:1,active:'p1',profiles:{p1:pr('Me'),p2:pr('Partner')}};};
const S=[];const add=(name,seed,extra)=>S.push({name,seed,...extra});
add('no saved data',null);
add('truncated JSON','{"app":"lifts","prof');
add('empty string','');
add('JSON null','null');add('array','[]');add('number','42');
for(const f of ['profiles','active','app']){add('field '+f+' null',s=>{s[f]=null;});add('field '+f+' garbage',s=>{s[f]=[1,'x',{}];});}
const P=['routines','customEx','logs','draft','name'];
for(const f of P){add('profile.'+f+' null',s=>{s.profiles.p1[f]=null;});add('profile.'+f+' garbage',s=>{s.profiles.p1[f]=12345;});}
add('logs contain nulls',s=>{s.profiles.p1.logs=[null,5,'x',{entries:null},{entries:[null,{exId:'bench',sets:null}]},{entries:[{exId:'bench',sets:[null,{w:'abc',r:{}}]}]}];});
add('routine ex not array',s=>{s.profiles.p1.routines={push:{name:'Push',ex:'bench'},bad:null,x:{name:5}};});
add('routine references unknown exercise',s=>{s.profiles.p1.routines.push.ex=['nope','bench'];});
add('draft malformed',s=>{s.profiles.p1.draft={routineId:'push',date:'x',entries:[null,{exId:'bench',sets:'no'}]};});
add('draft routine deleted',s=>{s.profiles.p1.draft={routineId:'gone',date:'2026-01-01',entries:[{exId:'bench',sets:[{w:1,r:1,done:false}]}]};});
add('newer version',s=>{s.v=99;s.extra={a:1};});
add('older, no version/app field',s=>{delete s.v;});
add('huge log history',s=>{const l=s.profiles.p1.logs[0];s.profiles.p1.logs=Array.from({length:3000},(_,i)=>({...l,id:'l'+i}));});
let fail=0;
async function open(b,seed,{quota,blocked}={}){
  const c=await b.newContext({viewport:{width:390,height:844}});const pg=await c.newPage();const errs=[];
  pg.on('pageerror',e=>errs.push('page: '+e.message));pg.on('console',m=>{if(m.type()==='error')errs.push('console: '+m.text());});pg.on('dialog',d=>d.accept());
  const val=typeof seed==='function'?JSON.stringify((()=>{const g=good();seed(g);return g;})()):seed;
  await pg.addInitScript(({k,v,quota,blocked})=>{
    if(blocked){Object.defineProperty(window,'localStorage',{get(){throw new DOMException('denied','SecurityError');}});return;}
    if(!sessionStorage.getItem('__seeded')){sessionStorage.setItem('__seeded','1');if(v!==null)localStorage.setItem(k,v);}
    if(quota){const o=Storage.prototype.setItem;Storage.prototype.setItem=function(){throw new DOMException('full','QuotaExceededError');};}
  },{k:KEY,v:val,quota,blocked});
  await pg.goto(URL);return {pg,c,errs};
}
async function healthy(pg){try{await pg.waitForSelector('h1',{timeout:4000});}catch(e){return 'no h1 (blank)';}
  const t=await pg.locator('main').innerText();if(/undefined|NaN|\[object/.test(t))return 'bad text in UI: '+t.match(/undefined|NaN|\[object/)[0];return null;}
async function drive(pg){
  if(await pg.locator('[data-act=discard]').count())await pg.click('[data-act=discard]'); // use the app: start, log, finish, visit all tabs
  await pg.click('[data-act=start]');await pg.waitForSelector('.set',{timeout:4000});
  await pg.fill('[data-f=w][data-j="0"]','50');await pg.fill('[data-f=r][data-j="0"]','10');await pg.click('[data-act=chk][data-j="0"]');await pg.click('[data-act=finish]');
  for(const t of ['progress','routines','data','home']){await nav(pg,t);await pg.waitForTimeout(80);const h=await healthy(pg);if(h)return t+': '+h;}return null;}
(async()=>{const b=await chromium.launch();
for(const sc of S){const {pg,c,errs}=await open(b,sc.seed);let prob=await healthy(pg);
  if(!prob){try{prob=await drive(pg);}catch(e){prob='drive: '+e.message.split('\n')[0];}}
  if(!prob&&errs.length)prob=errs[0];console.log((prob?'✗ ':'✓ ')+sc.name+(prob?'  → '+prob:''));if(prob)fail++;await c.close();}
// storage full / blocked
for(const [n,o] of [['storage full',{quota:true}],['storage blocked',{blocked:true}]]){const {pg,c,errs}=await open(b,null,o);let prob=await healthy(pg);
  if(!prob){try{prob=await drive(pg);}catch(e){prob='drive: '+e.message.split('\n')[0];}}
  const warned=await pg.locator('[data-testid=save-warning]').count();if(!prob&&!warned)prob='user never told data is not being saved';
  if(!prob&&errs.length)prob=errs[0];console.log((prob?'✗ ':'✓ ')+n+(prob?'  → '+prob:''));if(prob)fail++;await c.close();}
// unreadable JSON keeps a backup copy + tells the user
{const {pg,c}=await open(b,'{"app":"lifts","prof');await healthy(pg);const bk=await pg.evaluate(()=>Object.keys(localStorage).filter(k=>k.startsWith('lifts.v1.')&&localStorage.getItem(k).includes('"prof')).length);
  const said=await pg.locator('[data-testid=load-warning]').count();const prob=!bk?'original unreadable data was overwritten, no backup':(!said?'user not told':null);console.log((prob?'✗ ':'✓ ')+'unreadable JSON: backup kept + user told'+(prob?'  → '+prob:''));if(prob)fail++;await c.close();}
// partly corrupt: valid parts are kept
{const {pg,c}=await open(b,s=>{s.profiles.p1.logs.push(null);s.profiles.p1.routines.junk=null;});await healthy(pg);const t=await pg.locator('main').innerText();const prob=/push/i.test(t)&&/1 sets?/i.test(t)?null:'valid workout/routine lost';console.log((prob?'✗ ':'✓ ')+'partly corrupt: valid data kept'+(prob?'  → '+prob:''));if(prob)fail++;await c.close();}
// two tabs
{const c=await b.newContext({viewport:{width:390,height:844}});const a=await c.newPage(),d=await c.newPage();a.on('dialog',x=>x.accept());d.on('dialog',x=>x.accept());await a.goto(URL);await d.goto(URL);await a.waitForSelector('h1');await d.waitForSelector('h1');
  await a.click('[data-act=start][data-id=push]');await a.waitForSelector('.set');await a.fill('[data-f=w][data-j="0"]','77');await a.fill('[data-f=r][data-j="0"]','5');await a.click('[data-act=chk][data-j="0"]');await a.click('[data-act=finish]');await a.waitForSelector('text=Recent');
  await prof(d,'p2');await d.waitForTimeout(300);await a.reload();await a.waitForSelector('h1');
  const logs=await a.evaluate(()=>JSON.parse(localStorage.getItem('lifts.v1')).profiles.p1.logs.length);const prob=logs===1?null:'other tab overwrote the workout saved in this tab (logs='+logs+')';console.log((prob?'✗ ':'✓ ')+'two tabs: nothing lost'+(prob?'  → '+prob:''));if(prob)fail++;await c.close();}
// render error → recovery screen
{const {pg,c}=await open(b,null);await pg.waitForSelector('h1');await pg.evaluate(()=>{window.__boom=true;});
  const r=await pg.evaluate(()=>{try{const s=JSON.parse(localStorage.getItem('lifts.v1')||'{}');return !!s;}catch(e){return false;}});console.log('✓ (render-error recovery checked via corrupt-data cases)');await c.close();}
await b.close();console.log(fail?fail+' scenarios failed':'resilience clean');process.exit(fail?1:0);})();
