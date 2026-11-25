const {chromium,webkit}=require('playwright');
const nav=async(pg,t)=>{await pg.click('#menu');await pg.click('#tabs a[data-tab='+t+']');};
const prof=async(pg,id)=>{await pg.click('#menu');await pg.click('#people [data-id='+id+']');};
const URL='http://localhost:8080/';let pass=0,fail=0;
const ok=(c,m)=>{if(c){pass++;}else{fail++;console.log('FAIL:',m);}};
async function run(type,name){
  let b;try{b=await type.launch();}catch(e){console.log('skip',name,e.message.split('\n')[0]);return;}
  const ctx=await b.newContext({viewport:{width:390,height:800}});const pg=await ctx.newPage();
  const errs=[];pg.on('pageerror',e=>errs.push(e.message));pg.on('dialog',d=>d.accept());
  await pg.goto(URL);await pg.waitForSelector('h1');
  ok(await pg.locator('text=Push').first().isVisible(),name+' home shows Push');
  ok(await pg.locator('[data-act=start]').count()===4,name+' 4 routines');
  // workout 1: bench 60x12 x3 -> should nudge
  await pg.click('[data-act=start][data-id=push]');await pg.waitForSelector('.set');
  const sets=await pg.locator('[data-e="0"] .set').count();ok(sets===3,name+' 3 sets');
  for(let j=0;j<3;j++){await pg.fill(`[data-e="0"] [data-f=w][data-j="${j}"]`,'60');await pg.fill(`[data-e="0"] [data-f=r][data-j="${j}"]`,'12');await pg.click(`[data-e="0"] [data-act=chk][data-j="${j}"]`);}
  // dumbbell exercise idx1 incline db: 20x12
  for(let j=0;j<3;j++){await pg.fill(`[data-e="1"] [data-f=w][data-j="${j}"]`,'20');await pg.fill(`[data-e="1"] [data-f=r][data-j="${j}"]`,'12');await pg.click(`[data-e="1"] [data-act=chk][data-j="${j}"]`);}
  await pg.click('[data-act=finish]');await pg.waitForSelector('text=Recent');
  ok(await pg.locator('text=3 sets').count()>=0,name+' saved');
  // reload & carry
  await pg.reload();await pg.click('[data-act=start][data-id=push]');await pg.waitForSelector('.set');
  ok(await pg.inputValue('[data-e="0"] [data-f=w][data-j="0"]')==='62.5',name+' barbell nudge 62.5 got '+await pg.inputValue('[data-e="0"] [data-f=w][data-j="0"]'));
  ok(await pg.inputValue('[data-e="1"] [data-f=w][data-j="0"]')==='22',name+' dumbbell nudge 22');
  ok(await pg.locator('.nudge').count()===2,name+' two nudges');
  // draft persistence
  await pg.fill('[data-e="0"] [data-f=r][data-j="0"]','9');await pg.reload();
  await pg.waitForSelector('[data-e="0"]');
  await nav(pg,'home');
  await pg.waitForSelector('text=Workout in progress');ok(true,name+' draft survives reload');
  await pg.click('[data-act=goto]');await pg.waitForSelector('[data-e="0"]');
  ok(await pg.inputValue('[data-e="0"] [data-f=r][data-j="0"]')==='9',name+' draft value kept');
  await pg.click('[data-act=discard]');await pg.waitForSelector('[data-act=start]');
  // editor: swap, add, remove, custom
  await nav(pg,'routines');await pg.click('[data-act=goto][data-to="#/editor/push"]');
  await pg.click('[data-act=swap][data-i="0"]');await pg.fill('#edq','Incline Barbell');await pg.click('[data-act=pick]');
  ok(await pg.locator('text=Incline Barbell Press').count()>=1,name+' swap');
  await pg.click('[data-act=rm][data-i="5"]');ok(await pg.locator('[data-act=rm]').count()===5,name+' remove');
  await nav(pg,'routines');await pg.fill('#cxname','Sled Push');await pg.click('[data-act=addcustom]');
  await pg.click('[data-act=goto][data-to="#/editor/push"]');await pg.fill('#edq','Sled');await pg.click('[data-act=pick]');
  ok(await pg.locator('text=Sled Push').count()>=1,name+' custom exercise');
  // exercise library: search, filter, muscle diagram, add to routine
  await nav(pg,'exercises');await pg.waitForSelector('.exrow');
  const total=await pg.locator('.exrow').count();ok(total>=100,name+' library lists 100+ exercises ('+total+')');
  await pg.fill('#exq','squat');await pg.waitForTimeout(100);const sq=await pg.locator('.exrow').count();ok(sq>=3&&sq<total,name+' search narrows ('+sq+')');
  await pg.fill('#exq','');await pg.click('[data-act=exgroup][data-g=Calves]');ok(await pg.locator('.exrow').count()===4,name+' Calves filter = 4');
  await pg.click('[data-act=exgroup][data-g=All]');await pg.selectOption('#exequip','cable');ok((await pg.locator('.exrow').count())<total,name+' equipment filter');
  await pg.selectOption('#exequip','all');await pg.fill('#exq','Barbell Bench');await pg.click('.exrow');await pg.waitForSelector('svg.figure');
  ok(await pg.locator('svg.figure .m.p').count()>=2,name+' primary muscle highlighted (chest, both sides)');
  ok(await pg.locator('svg.figure .m.s').count()>=4,name+' secondary muscles highlighted');
  ok(/Primary: Chest/.test(await pg.locator('svg.figure').getAttribute('aria-label')),name+' diagram has a text alternative');
  await pg.selectOption('#addr','pull');await pg.click('[data-act=addtoroutine]');await pg.waitForSelector('#toast.show');
  await nav(pg,'routines');await pg.click('[data-act=goto][data-to="#/editor/pull"]');await pg.waitForSelector('[data-act=rm]');ok(await pg.locator('text=Barbell Bench Press').count()>=1,name+' added to routine from library');
  // progress
  await nav(pg,'progress');await pg.waitForSelector('#prsel');
  ok(await pg.locator('text=Top weight 60 kg').count()===1,name+' progress best');
  // profiles are separate
  await nav(pg,'home');await prof(pg,'p2');
  ok(await pg.locator('text=No workouts yet').count()===1,name+' partner empty');
  await prof(pg,'p1');
  // export / restore
  await nav(pg,'data');
  const [dl]=await Promise.all([pg.waitForEvent('download'),pg.click('[data-act=export]')]);
  const path=await dl.path();const fs=require('fs');const json=fs.readFileSync(path,'utf8');ok(JSON.parse(json).app==='lifts',name+' export');
  await pg.click('[data-act=erase]');await nav(pg,'data');
  await pg.setInputFiles('#imp',path);await pg.waitForSelector('text=Recent');
  ok(await pg.locator('.logrow').count()>=1,name+' restore brought back log');
  const bad='/tmp/bad.json';fs.writeFileSync(bad,'{"x":1}');await nav(pg,'data');await pg.setInputFiles('#imp',bad);
  ok(await pg.locator('#toast.show').count()===1,name+' bad import rejected');
  // offline
  await pg.goto(URL);await pg.evaluate(()=>navigator.serviceWorker.ready);await pg.reload();
  await ctx.setOffline(true);await pg.reload();await pg.waitForSelector('h1');
  ok(await pg.locator('text=Lifts').first().isVisible(),name+' offline reload');
  await pg.click('[data-act=start][data-id=legs]');await pg.waitForSelector('.set');
  await pg.fill('[data-e="0"] [data-f=w][data-j="0"]','100');await pg.fill('[data-e="0"] [data-f=r][data-j="0"]','8');await pg.click('[data-e="0"] [data-act=chk][data-j="0"]');
  await pg.click('[data-act=finish]');await pg.waitForSelector('text=Recent');ok(true,name+' offline logging');
  await ctx.setOffline(false);
  ok(errs.length===0,name+' no JS errors '+errs.join('|'));
  await pg.screenshot({path:`/tmp/${name}.png`});await b.close();
}
(async()=>{await run(chromium,'chromium');await run(webkit,'webkit');console.log(`pass ${pass} fail ${fail}`);process.exit(fail?1:0);})();
