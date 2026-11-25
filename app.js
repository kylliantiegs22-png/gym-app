(function(){
const KEY='lifts.v1';
const $app=document.getElementById('app');
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const MON=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const shortDate=iso=>{const m=/^(\d{4})-(\d{2})-(\d{2})$/.exec(iso||'');return m?(+m[3])+' '+MON[+m[2]-1]:String(iso||'');};
const uid=()=>Math.random().toString(36).slice(2,9)+Date.now().toString(36).slice(-4);
const today=()=>{const d=new Date();return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');};

function freshProfile(name){return {name,routines:JSON.parse(JSON.stringify(DEFAULT_ROUTINES)),customEx:[],logs:[],draft:null};}
function fresh(){return {app:'lifts',v:1,active:'p1',profiles:{p1:freshProfile('Me'),p2:freshProfile('Partner')}};}
let S,loadWarning='',saveFailed=false;
function readStore(keepCorrupt){
  let raw=null;
  try{raw=localStorage.getItem(KEY);}catch(e){saveFailed=true;return fresh();}
  if(raw===null) return fresh();
  let o=null;try{o=JSON.parse(raw);}catch(e){}
  const clean=sanitizeState(o,DEFAULT_ROUTINES);
  if(clean) return clean;
  if(keepCorrupt){ // never silently overwrite data we could not read: keep a copy
    try{localStorage.setItem(KEY+'.unreadable-'+Date.now(),raw);}catch(e){}
    loadWarning='Your saved data could not be read, so the app started fresh. A copy of the old data was kept on this phone.';
  }
  return fresh();
}
function banner(){
  const el=document.getElementById('banner'); if(!el) return;
  const m=[]; if(loadWarning) m.push(`<div class="warn" data-testid="load-warning">${esc(loadWarning)} <button class="small" data-act="hidewarn">Hide</button></div>`);
  if(saveFailed) m.push(`<div class="warn" data-testid="save-warning">This phone is not letting the app save right now, so new workouts may be lost when you close it. Free up space or leave private browsing, and export a backup from Data. <button class="small" data-act="hidesave">Hide</button></div>`);
  el.innerHTML=m.join('');
}
function save(){ try{localStorage.setItem(KEY,JSON.stringify(S)); if(saveFailed&&!blockedAtStart){saveFailed=false;banner();}}catch(e){if(!saveFailed){saveFailed=true;}banner();} }
let blockedAtStart=false;
S=readStore(true); blockedAtStart=saveFailed;
const P=()=>S.profiles[S.active];
const allEx=()=>BUILTIN.concat(P().customEx);
const exById=id=>allEx().find(e=>e.id===id)||{id,name:'(removed exercise)',equip:'barbell',muscle:'?'};

let toastT;
function toast(m){const t=document.getElementById('toast');t.textContent=m;t.classList.add('show');clearTimeout(toastT);toastT=setTimeout(()=>t.classList.remove('show'),2200);}

// ---------- routing ----------
function route(){
  try{ draw(); }
  catch(e){
    $app.innerHTML=`<div class="band"><h1>Something went wrong</h1></div><p class="mute">Your workouts are safe. Export a copy, then reload.</p><div class="row"><button class="primary" data-act="rawexport">Export raw data</button><button data-act="reload">Reload</button></div>`;
  }
  closeMenu(); drawer(); banner(); updateRest(); wake();
}
function closeMenu(){ document.body.classList.remove('open'); const m=document.getElementById('menu'); if(m) m.setAttribute('aria-expanded','false'); }
function drawer(){
  const p=P();
  document.getElementById('people').innerHTML=Object.entries(S.profiles).map(([id,pr])=>`<button data-act="profile" data-id="${id}" class="${id===S.active?'on':''}" aria-pressed="${id===S.active}">${esc(pr.name)}</button>`).join('');
  document.getElementById('who').textContent=p.name;
  document.getElementById('side-status').innerHTML=p.draft?`Workout in progress. <a href="#/workout">Resume</a>`:'Stored on this phone only.';
}
function draw(){
  const h=(location.hash||'#/').slice(2); const [page,arg]=h.split('/');
  document.querySelectorAll('#tabs a').forEach(a=>a.classList.toggle('on',a.dataset.tab===(page||'home')||(page==='workout'&&a.dataset.tab==='home')||(page==='editor'&&a.dataset.tab==='routines')||(page==='exercise'&&a.dataset.tab==='exercises')));
  ({'':home,home,workout,routines:routinesPage,editor,progress,data:dataPage,exercises,exercise}[page]||home)(arg);
  window.scrollTo(0,0);
}
window.addEventListener('hashchange',route);

// ---------- home ----------
function home(){
  const p=P();
  const recent=p.logs.slice(-5).reverse();
  $app.innerHTML=`<div class="band"><div class="kicker">${esc(p.name)} · ${today()}</div><h1>Train</h1></div>
  ${p.draft?`<div class="block"><b>Workout in progress</b><div class="mute">${esc(p.routines[p.draft.routineId]?.name||'Workout')} · ${p.draft.date}</div><div class="row" style="margin-top:12px"><button class="primary grow" data-act="goto" data-to="#/workout">Resume</button><button class="danger" data-act="discard">Discard</button></div></div>`:''}
  <h2>Pick a session</h2>
  <div class="rows">${Object.entries(p.routines).map(([id,r],i)=>{const last=[...p.logs].reverse().find(l=>l.routineId===id);return `<div class="rrow"><span class="idx"><b>${String(i+1).padStart(2,'0')}</b></span><div class="grow"><b class="rname">${esc(r.name)}</b><div class="mute">${r.ex.length} exercises${last?' · last '+shortDate(last.date):''}</div></div><button class="primary" data-act="start" data-id="${id}" ${p.draft?'disabled':''}>Start</button></div>`}).join('')}</div>
  <h2>Your name</h2><div class="row"><input id="pname" value="${esc(p.name)}" maxlength="20" aria-label="Your name"><button data-act="rename">Save</button></div>
  <section class="diag"><h2>Recent</h2>
  ${recent.length?recent.map(l=>`<div class="logrow"><div><b>${esc(p.routines[l.routineId]?.name||l.name||'Workout')}</b><div class="mute">${shortDate(l.date)} · ${l.entries.reduce((a,e)=>a+e.sets.filter(s=>s.done).length,0)} sets · ${Math.round(l.entries.reduce((a,e)=>a+volume(e),0))} kg volume</div></div><div class="row"><button class="small" data-act="editlog" data-id="${l.id}">Edit</button><button class="small danger" data-act="dellog" data-id="${l.id}">Delete</button></div></div>`).join(''):'<p class="mute">No workouts yet.</p>'}</section>`;
}

// ---------- workout ----------
function startWorkout(id){
  const p=P(); const r=p.routines[id]; if(!r||p.draft) return;
  const entries=r.ex.map(exId=>{const ex=exById(exId);const s=suggest(p.logs,ex,REP_MIN,REP_MAX,DEFAULT_SETS,today());return {exId,nudge:s.nudge,sets:s.sets};});
  p.draft={routineId:id,date:today(),entries}; save(); location.hash='#/workout';
}
let wkPick=null,wkQuery='',restStart=0;
const fmtSet=(s,ex)=>ex.timed?(+s.w?'+'+s.w+'kg ':'')+s.r+'s':(ex.equip==='bodyweight'&&!+s.w)?'BW×'+s.r:s.w+'×'+s.r;
const weeksAgo=date=>{const d=daysBetween(date,today());return d>=14?' · '+Math.round(d/7)+' wks ago':'';};
function workout(){
  const p=P(),d=p.draft;
  if(!d){$app.innerHTML='<div class="band"><h1>Workout</h1></div><p class="mute">No workout in progress.</p><button class="primary" data-act="goto" data-to="#/">Back home</button>';return;}
  const gaps=d.editId?[]:d.entries.map(e=>lastSession(p.logs,e.exId)).filter(Boolean).map(l=>daysBetween(l.date,today()));
  const gap=gaps.length?Math.max(...gaps):0;
  const q=wkQuery.toLowerCase(),inUse=d.entries.map(e=>e.exId);
  const matches=wkPick?allEx().filter(e=>!inUse.includes(e.id)&&(!q||e.name.toLowerCase().includes(q)||e.muscle.toLowerCase().includes(q))).slice(0,30):[];
  $app.innerHTML=`<div class="band"><h1>${esc(p.routines[d.routineId]?.name||'Workout')}</h1><div class="mute"><b>${esc(p.name)}</b> · ${d.date}${d.editId?' · editing a past workout':' · target '+REP_MIN+'–'+REP_MAX+' reps'}</div></div>
  ${gap>28?`<div class="note"><b>Welcome back</b><div class="mute">It has been ${Math.round(gap/7)} weeks since a lift here. Last weights are shown, with no “go heavier”. Ease in.</div></div>`:''}
  ${d.entries.map((e,i)=>{const ex=exById(e.exId);const last=lastSession(p.logs,e.exId);const wph=ex.equip==='bodyweight'||ex.timed?'+kg':'kg';return `<div class="card" data-e="${i}">
   <div class="row between"><div class="grow"><span class="exname">${esc(ex.name)}</span> ${e.nudge?`<span class="nudge">Go heavier +${STEP_LABEL[ex.equip]}</span>`:''}<div class="mute">${last?'Last: '+last.sets.map(s=>fmtSet(s,ex)).join(', ')+weeksAgo(last.date):'First time — pick a comfortable weight'}</div></div>${d.editId?'':`<button class="small" data-act="swapwk" data-i="${i}">Swap</button>`}</div>
   ${e.sets.map((s,j)=>`<div class="set ${s.done?'done':''}"><span class="n">${j+1}</span>
    <input type="text" inputmode="decimal" autocomplete="off" placeholder="${wph}" aria-label="Set ${j+1} weight" value="${esc(s.w)}" data-f="w" data-i="${i}" data-j="${j}">
    <input type="text" inputmode="${ex.timed?'numeric':'numeric'}" autocomplete="off" placeholder="${ex.timed?'sec':'reps'}" aria-label="Set ${j+1} ${ex.timed?'seconds':'reps'}" value="${esc(s.r)}" data-f="r" data-i="${i}" data-j="${j}">
    <button class="chk ${s.done?'on':''}" aria-label="Set ${j+1} done" aria-pressed="${!!s.done}" data-act="chk" data-i="${i}" data-j="${j}">✓</button></div>`).join('')}
   <div class="row setctl"><button class="small" data-act="addset" data-i="${i}">+ Set</button><button class="small" data-act="rmset" data-i="${i}" ${e.sets.length<=1?'disabled':''}>− Set</button></div></div>`}).join('')}
  ${wkPick?`<h2>${wkPick.mode==='swap'?'Swap with…':'Add exercise'}</h2><input id="wkq" placeholder="Search name or muscle" value="${esc(wkQuery)}" aria-label="Search exercises"><div class="list">${matches.map(e=>`<button data-act="wkpick" data-ex="${e.id}">${esc(e.name)} <span class="tag">${esc(e.muscle)}</span></button>`).join('')||'<p class="mute">No matches.</p>'}</div><button data-act="wkcancel">Cancel</button>`
   :d.editId?'':`<button data-act="addwk">+ Add exercise</button>`}
  <div class="row" style="margin-top:12px"><button class="primary grow" data-act="finish">${d.editId?'Save changes':'Finish workout'}</button><button class="danger" data-act="discard">${d.editId?'Cancel':'Discard'}</button></div>`;
}
function startEdit(id){
  const p=P(); if(p.draft){toast('Finish or discard your current workout first');return;}
  const l=p.logs.find(x=>x.id===id); if(!l) return;
  p.draft={editId:l.id,routineId:l.routineId,date:l.date,entries:l.entries.map(e=>({exId:e.exId,nudge:false,sets:e.sets.map(s=>({w:s.w,r:s.r,done:true,t:false}))}))};
  save(); location.hash='#/workout';
}
function finish(){
  const p=P(),d=p.draft; if(!d) return;
  const valid=s=>s.w!==''&&s.r!==''&&+s.r>0;
  const loose=d.entries.reduce((a,e)=>a+e.sets.filter(s=>!s.done&&s.t&&valid(s)).length,0);
  const include=loose>0&&confirm(loose+' set'+(loose>1?'s have':' has')+' numbers but '+(loose>1?'aren\'t':'isn\'t')+' ticked. Save '+(loose>1?'them':'it')+' too?');
  const entries=d.entries.map(e=>({exId:e.exId,sets:e.sets.filter(s=>valid(s)&&(s.done||(include&&s.t))).map(s=>({w:+s.w,r:+s.r,done:true}))})).filter(e=>e.sets.length);
  if(!entries.length){ if(!confirm('No completed sets. Discard this workout?')) return; p.draft=null; restStart=0; save(); location.hash='#/'; return; }
  const prs=[];
  if(!d.editId) entries.forEach(e=>{const ex=exById(e.exId); if(ex.timed) return; const prev=bestByDate(p.logs,e.exId); const now=Math.max(...e.sets.map(s=>e1rm(s.w,s.r))); if(prev.length&&now>Math.max(...prev.map(x=>x.e1))) prs.push(ex.name);});
  const idx=d.editId?p.logs.findIndex(l=>l.id===d.editId):-1;
  if(idx>=0) p.logs[idx]={...p.logs[idx],entries}; else p.logs.push({id:uid(),date:d.date,routineId:d.routineId,name:p.routines[d.routineId]?.name,entries});
  p.draft=null; restStart=0; wkPick=null; wkQuery=''; save();
  toast(d.editId?'Changes saved':'Workout saved'+(prs.length?' · New PR: '+prs.slice(0,2).join(', ')+(prs.length>2?' +'+(prs.length-2):''):'')); location.hash='#/';
}

// ---------- routines / editor ----------
function routinesPage(){
  const p=P(); edSwap=null; edQuery='';
  $app.innerHTML=`<div class="band"><h1>Routines</h1></div>${Object.entries(p.routines).map(([id,r])=>`<div class="card row between"><div><b>${esc(r.name)}</b><div class="mute">${r.ex.length} exercises</div></div><button data-act="goto" data-to="#/editor/${id}">Edit</button></div>`).join('')}
  <button data-act="newroutine">+ New routine</button>
  <h2>Custom exercise</h2><div class="card"><input id="cxname" placeholder="Name" maxlength="40" aria-label="Exercise name">
  <div class="row" style="margin-top:10px"><select id="cxequip" aria-label="Equipment">${Object.keys(EQUIP_STEP).map(k=>`<option>${k}</option>`).join('')}</select><select id="cxgroup" aria-label="Muscle group">${GROUPS.map(g=>`<option>${g}</option>`).join('')}</select></div><div style="margin-top:10px"><button data-act="addcustom">Add exercise</button></div></div>`;
}
let edQuery='',edSwap=null;
function editor(id){
  const p=P(),r=p.routines[id]; if(!r){location.hash='#/routines';return;}
  const q=edQuery.toLowerCase();
  const matches=allEx().filter(e=>!q||e.name.toLowerCase().includes(q)||e.muscle.toLowerCase().includes(q)).slice(0,30);
  $app.innerHTML=`<div class="band"><h1>Edit routine</h1></div><div class="row"><input id="rname" value="${esc(r.name)}" maxlength="24" aria-label="Routine name"><button data-act="rrename" data-id="${id}">Save</button></div>
  ${r.ex.map((x,i)=>{const ex=exById(x);return `<div class="card"><div><b>${esc(ex.name)}</b><div class="mute">${esc(ex.muscle)} · ${ex.equip}</div></div><div class="row end" style="margin-top:8px">
   <button class="small" aria-label="Move up" data-act="up" data-id="${id}" data-i="${i}" ${i===0?'disabled':''}>↑</button><button class="small" aria-label="Move down" data-act="down" data-id="${id}" data-i="${i}" ${i===r.ex.length-1?'disabled':''}>↓</button>
   <button class="small" data-act="swap" data-id="${id}" data-i="${i}">${edSwap===i?'Cancel':'Swap'}</button><button class="small danger" aria-label="Remove" data-act="rm" data-id="${id}" data-i="${i}">✕</button></div></div>`}).join('')}
  <h2>${edSwap!==null?'Swap with…':'Add exercise'}</h2><input id="edq" placeholder="Search name or muscle" value="${esc(edQuery)}" aria-label="Search exercises">
  <div class="list">${matches.map(e=>`<button data-act="pick" data-id="${id}" data-ex="${e.id}">${esc(e.name)} <span class="tag">${esc(e.muscle)}</span></button>`).join('')||'<p class="mute">No matches.</p>'}</div>
  <div class="row" style="margin-top:16px"><button class="danger" data-act="delroutine" data-id="${id}">Delete routine</button><button class="grow" data-act="goto" data-to="#/routines">Done</button></div>`;
}

// ---------- exercise library ----------
const GROUPS=['Chest','Back','Shoulders','Biceps','Triceps','Forearms','Legs','Calves','Core','Full body'];
let exQ='',exG='All',exE='all';
function exMatches(){
  const q=exQ.trim().toLowerCase();
  return allEx().filter(e=>(exG==='All'||e.muscle===exG)&&(exE==='all'||e.equip===exE)&&(!q||e.name.toLowerCase().includes(q)||e.muscle.toLowerCase().includes(q)||muscleNames(musclesOf(e).primary.concat(musclesOf(e).secondary)).toLowerCase().includes(q)));
}
function exListHTML(){
  const list=exMatches();
  return (list.map(e=>`<a class="exrow" href="#/exercise/${esc(e.id)}"><span class="mini">${figure(e,{mini:true})}</span><span class="grow"><span class="exname">${esc(e.name)}</span><span class="mute sub">${esc(e.muscle)} · ${e.equip}</span></span><span class="chev" aria-hidden="true">›</span></a>`).join('')||'<p class="mute">No matches. Try another word or filter.</p>')+`<div class="mute count">${list.length} of ${allEx().length}</div>`;
}
function exercises(){
  $app.innerHTML=`<div class="band"><div class="kicker">Library</div><h1>Exercises</h1></div>
  <input id="exq" type="search" placeholder="Search name or muscle" value="${esc(exQ)}" aria-label="Search exercises" autocomplete="off">
  <div class="chips" role="group" aria-label="Muscle group">${['All',...GROUPS].map(g=>`<button class="chip ${g===exG?'on':''}" data-act="exgroup" data-g="${g}" aria-pressed="${g===exG}">${g}</button>`).join('')}</div>
  <select id="exequip" aria-label="Equipment"><option value="all">All equipment</option>${Object.keys(EQUIP_STEP).map(k=>`<option value="${k}" ${k===exE?'selected':''}>${k}</option>`).join('')}</select>
  <div id="exlist">${exListHTML()}</div>
  <div style="margin-top:22px"><button data-act="goto" data-to="#/routines">+ Custom exercise</button></div>`;
}
function exercise(id){
  const ex=allEx().find(e=>e.id===id); if(!ex){location.hash='#/exercises';return;}
  const m=musclesOf(ex),p=P();
  const hist=bestByDate(p.logs,ex.id),best=hist.length?Math.max(...hist.map(x=>x.top)):0;
  const load=ex.timed?'Logged in seconds. Add weight only if you use some.':ex.equip==='bodyweight'?'Bodyweight. Enter a weight only when you add some.':'Goes up in '+STEP_LABEL[ex.equip]+' steps.';
  $app.innerHTML=`<div class="band"><a class="back" href="#/exercises">‹ Exercises</a><div class="kicker">${esc(ex.muscle)} · ${ex.equip}</div><h1>${esc(ex.name)}</h1></div>
  <div class="fig">${figure(ex,{labels:true})}</div>
  <div class="legend"><span><i class="sw p"></i>Primary</span><span><i class="sw s"></i>Secondary</span></div>
  <h2>Muscles worked</h2>
  <p class="line"><b>Primary</b> ${esc(muscleNames(m.primary)||'Not listed')}</p>
  <p class="line"><b>Secondary</b> ${esc(muscleNames(m.secondary)||'None')}</p>
  ${ex.cue?`<h2>How</h2><p class="line">${esc(ex.cue)}</p>`:''}
  <h2>Loading</h2><p class="line">${esc(load)}</p>${best?`<p class="line"><b>Your best</b> ${best} kg</p>`:''}
  <h2>Add to a routine</h2><div class="row"><select id="addr" aria-label="Routine">${Object.entries(p.routines).map(([rid,r])=>`<option value="${esc(rid)}">${esc(r.name)}</option>`).join('')}</select><button class="primary" data-act="addtoroutine" data-ex="${esc(ex.id)}">Add</button></div>`;
}

// ---------- progress ----------
let prEx=null;
function progress(){
  const p=P();
  const done=[...new Set(p.logs.flatMap(l=>l.entries.map(e=>e.exId)))];
  if(!done.length){$app.innerHTML='<div class="band"><h1>Progress</h1></div><p class="mute">Log a workout to see progress.</p>';return;}
  if(!done.includes(prEx)) prEx=done[0];
  const pts=bestByDate(p.logs,prEx);
  $app.innerHTML=`<div class="band"><h1>Progress</h1></div><select id="prsel" aria-label="Exercise">${done.map(id=>`<option value="${id}" ${id===prEx?'selected':''}>${esc(exById(id).name)}</option>`).join('')}</select>
  <div class="card">${chart(pts)}</div>
  ${pts.length?`<div class="card"><b>Best</b><div class="mute">Top weight ${Math.max(...pts.map(x=>x.top))} kg · est. 1RM ${Math.max(...pts.map(x=>x.e1))} kg · ${pts.length} session${pts.length>1?'s':''}</div></div>`:''}
  ${pts.slice().reverse().map(x=>`<div class="row between mute"><span>${x.date}</span><span>${x.top} kg top · e1RM ${x.e1}</span></div>`).join('')}`;
}
function chart(pts){
  if(!pts.length) return '<p class="mute">No data.</p>';
  if(pts.length===1) return `<div style="padding:18px 0 10px"><div class="big">${pts[0].top}<span style="font-size:24px"> kg</span></div><div class="mute">Top weight on ${shortDate(pts[0].date)}. Log this lift again to see your trend.</div></div>`;
  const W=320,H=160,pad=24; const ys=pts.map(x=>x.top); let lo=Math.min(...ys),hi=Math.max(...ys); if(lo===hi){lo-=1;hi+=1;}
  const X=i=>pts.length===1?W/2:pad+i*(W-2*pad)/(pts.length-1), Y=v=>H-pad-(v-lo)/(hi-lo)*(H-2*pad);
  return `<svg class="chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="Top weight over time"><polyline fill="none" stroke="var(--accent)" stroke-width="2.5" points="${pts.map((x,i)=>X(i)+','+Y(x.top)).join(' ')}"/>${pts.map((x,i)=>`<circle cx="${X(i)}" cy="${Y(x.top)}" r="4" fill="var(--accent)"/>`).join('')}<text x="4" y="14" font-size="12" fill="var(--mute)">${hi} kg</text><text x="4" y="${H-6}" font-size="12" fill="var(--mute)">${lo} kg</text></svg>`;
}

// ---------- data ----------
function dataPage(){
  $app.innerHTML=`<div class="band"><h1>Data</h1></div><p class="mute">Everything is stored on this phone only. Export a backup now and then, and use it to move data to a new phone.</p>
  <div class="card"><b>Back up</b><div class="mute">Saves both people's data.</div><div style="margin-top:8px"><button class="primary" data-act="export">Export backup</button></div></div>
  <div class="card"><b>Restore</b><div class="mute">Replaces everything on this phone with the backup.</div><div style="margin-top:8px"><input type="file" id="imp" accept="application/json,.json" aria-label="Backup file"></div></div>
  <div class="card"><b>Erase all</b><div style="margin-top:8px"><button class="danger" data-act="erase">Erase everything</button></div></div>`;
}
function doExport(){
  const blob=new Blob([JSON.stringify(S,null,2)],{type:'application/json'});
  const a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download='lifts-backup-'+today()+'.json'; document.body.appendChild(a); a.click(); a.remove(); setTimeout(()=>URL.revokeObjectURL(a.href),1000);
}
function doImport(file){
  const fr=new FileReader();
  fr.onload=()=>{let o;try{o=JSON.parse(fr.result);}catch(e){toast('Not a valid backup file');return;}
    const err=validateImport(o); if(err){toast(err);return;}
    if(!confirm('Replace everything on this phone with this backup?')) return;
    S=sanitizeState(o,DEFAULT_ROUTINES); save(); toast('Restored'); location.hash='#/'; route();};
  fr.readAsText(file);
}

// ---------- events ----------
document.addEventListener('click',ev=>{
  if(ev.target.closest('#tabs a')) setTimeout(closeMenu,0);
  const b=ev.target.closest('[data-act]'); if(!b) return; const a=b.dataset.act,p=P(),id=b.dataset.id,i=+b.dataset.i,j=+b.dataset.j;
  switch(a){
    case 'goto': location.hash=b.dataset.to; break;
    case 'menu': {const o=document.body.classList.toggle('open'); b.setAttribute('aria-expanded',String(o)); if(o) setTimeout(()=>{const f=document.querySelector('#people button.on')||document.querySelector('#tabs a'); f&&f.focus();},60); break;}
    case 'closemenu': closeMenu(); break;
    case 'hidewarn': loadWarning=''; banner(); break;
    case 'hidesave': saveFailed=false; banner(); break;
    case 'reload': location.reload(); break;
    case 'rawexport': {let raw='';try{raw=localStorage.getItem(KEY)||JSON.stringify(S);}catch(e){raw=JSON.stringify(S);} const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([raw],{type:'application/json'}));a.download='lifts-raw-'+today()+'.json';document.body.appendChild(a);a.click();a.remove();break;}
    case 'profile': S.active=id; save(); route(); break;
    case 'rename': {const v=document.getElementById('pname').value.trim(); if(v){p.name=v.slice(0,20); save(); route(); toast('Saved');} break;}
    case 'start': startWorkout(id); break;
    case 'discard': if(confirm('Discard this workout?')){p.draft=null; restStart=0; wkPick=null; save(); location.hash='#/'; route();} break;
    case 'dellog': if(confirm('Delete this workout?')){p.logs=p.logs.filter(l=>l.id!==id); save(); route();} break;
    case 'chk': {const e=p.draft.entries[i],s=e.sets[j],ex=exById(e.exId);
      if(!s.done){
        if(s.r===''||!(+s.r>0)){toast(ex.timed?'Enter the seconds first':'Enter the reps first');break;}
        if(s.w===''){ if(ex.equip==='bodyweight'||ex.timed) s.w=0; else {toast('Enter the weight first');break;} }
        restStart=Date.now();
      }
      s.done=!s.done; save(); workout(); updateRest(); break;}
    case 'editlog': startEdit(id); break;
    case 'swapwk': wkPick={mode:'swap',i}; wkQuery=''; workout(); break;
    case 'addwk': wkPick={mode:'add'}; wkQuery=''; workout(); break;
    case 'wkcancel': wkPick=null; wkQuery=''; workout(); break;
    case 'wkpick': {const d=p.draft,ex=exById(b.dataset.ex),s=suggest(p.logs,ex,REP_MIN,REP_MAX,DEFAULT_SETS,today()),ne={exId:ex.id,nudge:s.nudge,sets:s.sets};
      if(wkPick&&wkPick.mode==='swap'){const old=d.entries[wkPick.i]; if(old&&old.sets.some(x=>x.done)&&!confirm('This exercise has ticked sets. Replace it and lose them?')) break; d.entries[wkPick.i]=ne;} else d.entries.push(ne);
      wkPick=null; wkQuery=''; save(); workout(); break;}
    case 'exgroup': exG=b.dataset.g; exercises(); break;
    case 'addtoroutine': {const rid=document.getElementById('addr').value,r=p.routines[rid]; if(!r) break; if(r.ex.includes(b.dataset.ex)){toast('Already in '+r.name);break;} r.ex.push(b.dataset.ex); save(); toast('Added to '+r.name); break;}
    case 'restclear': restStart=0; updateRest(); break;
    case 'addset': {const e=p.draft.entries[i]; const l=e.sets[e.sets.length-1]; e.sets.push({w:l?l.w:'',r:l?l.r:'',done:false}); save(); workout(); break;}
    case 'rmset': {const e=p.draft.entries[i]; if(e.sets.length>1){e.sets.pop(); save(); workout();} break;}
    case 'finish': finish(); break;
    case 'newroutine': {const nid='r'+uid(); p.routines[nid]={name:'New routine',ex:[]}; save(); location.hash='#/editor/'+nid; break;}
    case 'rrename': {const v=document.getElementById('rname').value.trim(); if(v){p.routines[id].name=v.slice(0,24); save(); toast('Saved');} break;}
    case 'up': case 'down': {const r=p.routines[id].ex,k=a==='up'?i-1:i+1; if(k>=0&&k<r.length){[r[i],r[k]]=[r[k],r[i]]; save(); editor(id);} break;}
    case 'rm': p.routines[id].ex.splice(i,1); edSwap=null; save(); editor(id); break;
    case 'swap': edSwap=edSwap===i?null:i; editor(id); break;
    case 'pick': {const r=p.routines[id].ex; if(edSwap!==null){r[edSwap]=b.dataset.ex; edSwap=null;} else if(!r.includes(b.dataset.ex)) r.push(b.dataset.ex); else {toast('Already in routine');break;} save(); editor(id); break;}
    case 'delroutine': if(Object.keys(p.routines).length<=1){toast('Keep at least one routine');break;} if(confirm('Delete this routine? Past workouts are kept.')){delete p.routines[id]; save(); location.hash='#/routines';} break;
    case 'addcustom': {const n=document.getElementById('cxname').value.trim(); if(!n){toast('Enter a name');break;} const eq=document.getElementById('cxequip').value; p.customEx.push({id:'c'+uid(),name:n.slice(0,40),equip:eq,muscle:(document.getElementById('cxgroup')||{}).value||'Custom'}); save(); toast('Added — find it in the editor'); document.getElementById('cxname').value=''; break;}
    case 'export': doExport(); break;
    case 'erase': if(confirm('Erase ALL data on this phone?')&&confirm('This cannot be undone. Really erase?')){S=fresh(); save(); location.hash='#/'; route();} break;
  }
});
document.addEventListener('keydown',ev=>{ if(ev.key==='Escape') closeMenu(); });
document.addEventListener('input',ev=>{
  const t=ev.target;
  if(t.dataset&&t.dataset.f){const s=P().draft.entries[+t.dataset.i].sets[+t.dataset.j];
    const clean=t.value.replace(/[^0-9.,]/g,''); if(clean!==t.value) t.value=clean;
    const n=Number(clean.replace(',','.')); s[t.dataset.f]=clean===''||!isFinite(n)?'':n; s.t=true; save();}
  else if(t.id==='exq'){exQ=t.value; document.getElementById('exlist').innerHTML=exListHTML();}
  else if(t.id==='wkq'){wkQuery=t.value; const pos=t.selectionStart; workout(); const n=document.getElementById('wkq'); n.focus(); n.setSelectionRange(pos,pos);}
  else if(t.id==='edq'){edQuery=t.value; const pos=t.selectionStart; editor(location.hash.split('/')[2]); const n=document.getElementById('edq'); n.focus(); n.setSelectionRange(pos,pos);}
});
document.addEventListener('change',ev=>{
  if(ev.target.id==='exequip'){exE=ev.target.value; exercises();}
  if(ev.target.id==='prsel'){prEx=ev.target.value; progress();}
  if(ev.target.id==='imp'&&ev.target.files[0]) doImport(ev.target.files[0]);
});
// Tapping a number box selects it all, so the new value replaces the old one (the browser's own caret placement runs after focus, hence the re-select on pointer/touch end).
['focusin','pointerup','touchend','click'].forEach(n=>document.addEventListener(n,ev=>{const t=ev.target; if(t.dataset&&t.dataset.f&&document.activeElement===t) setTimeout(()=>{try{t.select();}catch(e){}},0);}));
let wl=null;
async function wake(){ try{ if(!('wakeLock' in navigator)) return; const need=!!P().draft&&(location.hash||'').startsWith('#/workout');
  if(need&&!wl){ wl=await navigator.wakeLock.request('screen'); wl.addEventListener('release',()=>{wl=null;}); } else if(!need&&wl){ await wl.release(); wl=null; } }catch(e){} }
document.addEventListener('visibilitychange',()=>{ if(document.visibilityState==='visible') wake(); });
function updateRest(){ const el=document.getElementById('rest'); if(!el) return; const on=restStart&&P().draft&&(location.hash||'').startsWith('#/workout');
  if(!on){el.hidden=true;return;} const s=Math.floor((Date.now()-restStart)/1000); el.hidden=false; el.querySelector('span').textContent='Rest '+Math.floor(s/60)+':'+String(s%60).padStart(2,'0'); }
setInterval(updateRest,1000);
window.addEventListener('storage',ev=>{ if(ev.key===KEY&&ev.newValue){ const prev=S; const n=readStore(false); if(n&&n!==prev){S=n; route();} } });
if('serviceWorker' in navigator && location.protocol!=='file:') navigator.serviceWorker.register('sw.js').catch(()=>{});
route();
})();
