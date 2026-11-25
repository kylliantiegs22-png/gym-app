// Layout-clash matrix: every screen x 4 viewport sizes, with worst-case text. node tests/matrix.js (server on :8080)
const {chromium}=require('playwright');const clashes=require('./clash.js');
const URL='http://localhost:8080/';
const LONG='WWWWWWWWWWWWWWWWWWWW', RN='Chest Shoulders & Tri';
const sets=(w,r,d)=>[0,1,2].map(()=>({w,r,done:d}));
const mk=(draft,warnTxt)=>{
  const routines={push:{name:'Push',ex:['bench','dbinc','ohp','latraise','pushdown','ohext']},long:{name:RN,ex:['ohext','dbohp','neutrallatpull','bulgarian','dbrdl','cablelat']},pull:{name:'Pull',ex:['deadlift','latpull']},legs:{name:'Legs',ex:['squat']},full:{name:'Full Body',ex:['squat','bench']}};
  const logs=[1,2,3,4,5].map(i=>({id:'l'+i,date:'2026-11-0'+i,routineId:i%2?'push':'long',name:i%2?'Push':RN,entries:[{exId:'ohext',sets:sets(24,12,true)},{exId:'bench',sets:sets(100+i,10,true)},{exId:'neutrallatpull',sets:sets(45,9,true)}]}));
  const p=name=>({name,routines,customEx:[{id:'c1',name:'Single-Arm Landmine Rotational Press',equip:'barbell',muscle:'Core'},{id:'c2',name:'W'.repeat(40),equip:'machine',muscle:'Legs'}],logs,draft:draft?{routineId:'long',date:'2026-11-25',entries:routines.long.ex.map((id,i)=>({exId:id,nudge:i<2,sets:sets(i<2?62.5:'',i<2?8:'',i===0)}))}:null});
  return JSON.stringify({app:'lifts',v:1,active:'p1',profiles:{p1:p(LONG),p2:p('Partner')}});
};
const ROUTES=[['home','#/'],['exercises','#/exercises'],['exercise-long','#/exercise/ohext'],['exercise-custom','#/exercise/c1'],['exercise-unbroken','#/exercise/c2'],['routines','#/routines'],['editor','#/editor/long'],['progress','#/progress'],['data','#/data']];
const VPS=[[320,568],[390,844],[768,1024],[1280,800]];
let bad=0,checked=0;
(async()=>{const b=await chromium.launch();
for(const [w,h] of VPS){
  for(const [mode,seed] of [['plain',mk(false)],['draft',mk(true)],['unreadable','{"app":"lifts","prof']]){
    const c=await b.newContext({viewport:{width:w,height:h}});const pg=await c.newPage();pg.on('dialog',d=>d.accept());
    await pg.addInitScript(({s})=>{if(!sessionStorage.getItem('__s')){sessionStorage.setItem('__s','1');localStorage.setItem('lifts.v1',s);}},{s:seed});
    const routes=mode==='draft'?[['home-draft','#/'],['workout','#/workout']]:mode==='unreadable'?[['home-warning','#/']]:ROUTES;
    for(const [name,hash] of routes){
      await pg.goto(URL+hash);await pg.reload();await pg.waitForSelector('h1');await pg.waitForTimeout(120);
      if(name==='workout'){await pg.click('[data-e="1"] [data-act=chk][data-j="0"]');await pg.waitForSelector('#rest:not([hidden])');}
      const bw=await pg.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1);
      const r=await clashes(pg);checked++;
      const msgs=[...(bw?['horizontal scroll']:[]),...r];
      if(msgs.length){bad++;console.log(`✗ ${w}x${h} ${name}\n    ${msgs.join('\n    ')}`);}
      if(w<900&&name==='home'){await pg.click('#menu');await pg.waitForTimeout(350);const rr=await clashes(pg);checked++;if(rr.length){bad++;console.log(`✗ ${w}x${h} drawer\n    ${rr.join('\n    ')}`);}await pg.keyboard.press('Escape');}
    }
    await c.close();}
}
await b.close();console.log(bad?`${bad} of ${checked} screens have clashes`:`clash-free: ${checked} screen/size combinations`);process.exit(bad?1:0);})();
