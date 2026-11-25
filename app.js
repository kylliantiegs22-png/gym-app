(function(){
const KEY='lifts.v1';
const $app=document.getElementById('app');
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const uid=()=>Math.random().toString(36).slice(2,9)+Date.now().toString(36).slice(-4);
const today=()=>{const d=new Date();return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');};

function freshProfile(name){return {name,routines:JSON.parse(JSON.stringify(DEFAULT_ROUTINES)),customEx:[],logs:[],draft:null};}
function fresh(){return {app:'lifts',v:1,active:'p1',profiles:{p1:freshProfile('Me'),p2:freshProfile('Partner')}};}
let S;
function load(){
  try{const raw=localStorage.getItem(KEY); if(raw){const o=JSON.parse(raw); if(!validateImport(o)) return o;}}catch(e){}
  return fresh();
}
function save(){ try{localStorage.setItem(KEY,JSON.stringify(S));}catch(e){toast('Could not save: storage full');} }
S=load();
const P=()=>S.profiles[S.active];
const allEx=()=>BUILTIN.concat(P().customEx);
const exById=id=>allEx().find(e=>e.id===id)||{id,name:'(removed exercise)',equip:'barbell',muscle:'?'};

let toastT;
function toast(m){const t=document.getElementById('toast');t.textContent=m;t.classList.add('show');clearTimeout(toastT);toastT=setTimeout(()=>t.classList.remove('show'),2200);}

// ---------- routing ----------
function route(){
  const h=(location.hash||'#/').slice(2); const [page,arg]=h.split('/');
  document.querySelectorAll('#tabs a').forEach(a=>a.classList.toggle('on',a.dataset.tab===(page||'home')||(page==='workout'&&a.dataset.tab==='home')||(page==='editor'&&a.dataset.tab==='routines')));
  ({'':home,home,workout,routines:routinesPage,editor,progress,data:dataPage}[page]||home)(arg);
  window.scrollTo(0,0);
}
window.addEventListener('hashchange',route);

// ---------- home ----------
function home(){
  const p=P();
  const recent=p.logs.slice(-5).reverse();
  $app.innerHTML=`<h1>Lifts</h1>
  <div class="seg" role="group" aria-label="Person">${Object.entries(S.profiles).map(([id,pr])=>`<button data-act="profile" data-id="${id}" class="${id===S.active?'on':''}">${esc(pr.name)}</button>`).join('')}</div>
  ${p.draft?`<div class="card"><b>Workout in progress</b><div class="mute">${esc(p.routines[p.draft.routineId]?.name||'Workout')} · ${p.draft.date}</div><div class="row" style="margin-top:8px"><button class="primary grow" data-act="goto" data-to="#/workout">Resume</button><button class="danger" data-act="discard">Discard</button></div></div>`:''}
  <h2>Start a workout</h2>
  ${Object.entries(p.routines).map(([id,r])=>{const last=[...p.logs].reverse().find(l=>l.routineId===id);return `<div class="card row between"><div><b>${esc(r.name)}</b><div class="mute">${r.ex.length} exercises${last?' · last '+last.date:''}</div></div><button class="primary" data-act="start" data-id="${id}" ${p.draft?'disabled':''}>Start</button></div>`}).join('')}
  <h2>Recent</h2>
  ${recent.length?recent.map(l=>`<div class="card row between"><div><b>${esc(p.routines[l.routineId]?.name||l.name||'Workout')}</b><div class="mute">${l.date} · ${l.entries.reduce((a,e)=>a+e.sets.filter(s=>s.done).length,0)} sets · ${Math.round(l.entries.reduce((a,e)=>a+volume(e),0))} kg volume</div></div><button class="small danger" data-act="dellog" data-id="${l.id}">Delete</button></div>`).join(''):'<p class="mute">No workouts yet.</p>'}
  <h2>Names</h2><div class="row"><input id="pname" value="${esc(p.name)}" maxlength="20" aria-label="Your name"><button data-act="rename">Save</button></div>`;
}

// ---------- workout ----------
function startWorkout(id){
  const p=P(); const r=p.routines[id]; if(!r||p.draft) return;
  const entries=r.ex.map(exId=>{const ex=exById(exId);const s=suggest(p.logs,ex,REP_MIN,REP_MAX,DEFAULT_SETS);return {exId,nudge:s.nudge,sets:s.sets};});
  p.draft={routineId:id,date:today(),entries}; save(); location.hash='#/workout';
}
function workout(){
  const p=P(),d=p.draft;
  if(!d){$app.innerHTML='<h1>Workout</h1><p class="mute">No workout in progress.</p><button class="primary" data-act="goto" data-to="#/">Back home</button>';return;}
  $app.innerHTML=`<h1>${esc(p.routines[d.routineId]?.name||'Workout')}</h1><div class="mute">${d.date} · target ${REP_MIN}–${REP_MAX} reps</div>
  ${d.entries.map((e,i)=>{const ex=exById(e.exId);const last=lastSession(p.logs,e.exId);return `<div class="card" data-e="${i}">
   <div class="row between"><div><b>${esc(ex.name)}</b> ${e.nudge?`<span class="nudge">Go heavier +${STEP_LABEL[ex.equip]}</span>`:''}<div class="mute">${last?'Last: '+last.sets.map(s=>s.w+'×'+s.r).join(', '):'First time — pick a comfortable weight'}</div></div></div>
   ${e.sets.map((s,j)=>`<div class="set ${s.done?'done':''}"><span class="n">${j+1}</span>
    <input type="number" inputmode="decimal" step="0.5" min="0" placeholder="kg" aria-label="Set ${j+1} weight" value="${esc(s.w)}" data-f="w" data-i="${i}" data-j="${j}">
    <input type="number" inputmode="numeric" step="1" min="0" placeholder="reps" aria-label="Set ${j+1} reps" value="${esc(s.r)}" data-f="r" data-i="${i}" data-j="${j}">
    <button class="chk ${s.done?'on':''}" aria-label="Set ${j+1} done" aria-pressed="${!!s.done}" data-act="chk" data-i="${i}" data-j="${j}">✓</button></div>`).join('')}
   <div class="row"><button class="small" data-act="addset" data-i="${i}">+ Set</button><button class="small" data-act="rmset" data-i="${i}" ${e.sets.length<=1?'disabled':''}>− Set</button></div></div>`}).join('')}
  <div class="row"><button class="primary grow" data-act="finish">Finish workout</button><button class="danger" data-act="discard">Discard</button></div>`;
}
function finish(){
  const p=P(),d=p.draft; if(!d) return;
  const entries=d.entries.map(e=>({exId:e.exId,sets:e.sets.filter(s=>s.done&&s.w!==''&&s.r!=='').map(s=>({w:+s.w,r:+s.r,done:true}))})).filter(e=>e.sets.length);
  if(!entries.length){ if(!confirm('No completed sets. Discard this workout?')) return; p.draft=null; save(); location.hash='#/'; return; }
  p.logs.push({id:uid(),date:d.date,routineId:d.routineId,name:p.routines[d.routineId]?.name,entries});
  p.draft=null; save(); toast('Workout saved'); location.hash='#/';
}

// ---------- routines / editor ----------
function routinesPage(){
  const p=P(); edSwap=null; edQuery='';
  $app.innerHTML=`<h1>Routines</h1>${Object.entries(p.routines).map(([id,r])=>`<div class="card row between"><div><b>${esc(r.name)}</b><div class="mute">${r.ex.length} exercises</div></div><button data-act="goto" data-to="#/editor/${id}">Edit</button></div>`).join('')}
  <button data-act="newroutine">+ New routine</button>
  <h2>Custom exercise</h2><div class="card"><input id="cxname" placeholder="Name" maxlength="40" aria-label="Exercise name">
  <div class="row" style="margin-top:8px"><select id="cxequip" aria-label="Equipment">${Object.keys(EQUIP_STEP).map(k=>`<option>${k}</option>`).join('')}</select><button data-act="addcustom">Add</button></div></div>`;
}
let edQuery='',edSwap=null;
function editor(id){
  const p=P(),r=p.routines[id]; if(!r){location.hash='#/routines';return;}
  const q=edQuery.toLowerCase();
  const matches=allEx().filter(e=>!q||e.name.toLowerCase().includes(q)||e.muscle.toLowerCase().includes(q)).slice(0,30);
  $app.innerHTML=`<h1>Edit routine</h1><div class="row"><input id="rname" value="${esc(r.name)}" maxlength="24" aria-label="Routine name"><button data-act="rrename" data-id="${id}">Save</button></div>
  ${r.ex.map((x,i)=>{const ex=exById(x);return `<div class="card row"><div class="grow"><b>${esc(ex.name)}</b><div class="mute">${esc(ex.muscle)} · ${ex.equip}</div></div>
   <button class="small" aria-label="Move up" data-act="up" data-id="${id}" data-i="${i}" ${i===0?'disabled':''}>↑</button><button class="small" aria-label="Move down" data-act="down" data-id="${id}" data-i="${i}" ${i===r.ex.length-1?'disabled':''}>↓</button>
   <button class="small" data-act="swap" data-id="${id}" data-i="${i}">${edSwap===i?'Cancel':'Swap'}</button><button class="small danger" aria-label="Remove" data-act="rm" data-id="${id}" data-i="${i}">✕</button></div>`}).join('')}
  <h2>${edSwap!==null?'Swap with…':'Add exercise'}</h2><input id="edq" placeholder="Search name or muscle" value="${esc(edQuery)}" aria-label="Search exercises">
  <div class="list">${matches.map(e=>`<button data-act="pick" data-id="${id}" data-ex="${e.id}">${esc(e.name)} <span class="tag">${esc(e.muscle)}</span></button>`).join('')||'<p class="mute">No matches.</p>'}</div>
  <div class="row" style="margin-top:16px"><button class="danger" data-act="delroutine" data-id="${id}">Delete routine</button><button class="grow" data-act="goto" data-to="#/routines">Done</button></div>`;
}

// ---------- progress ----------
let prEx=null;
function progress(){
  const p=P();
  const done=[...new Set(p.logs.flatMap(l=>l.entries.map(e=>e.exId)))];
  if(!done.length){$app.innerHTML='<h1>Progress</h1><p class="mute">Log a workout to see progress.</p>';return;}
  if(!done.includes(prEx)) prEx=done[0];
  const pts=bestByDate(p.logs,prEx);
  $app.innerHTML=`<h1>Progress</h1><select id="prsel" aria-label="Exercise">${done.map(id=>`<option value="${id}" ${id===prEx?'selected':''}>${esc(exById(id).name)}</option>`).join('')}</select>
  <div class="card">${chart(pts)}</div>
  ${pts.length?`<div class="card"><b>Best</b><div class="mute">Top weight ${Math.max(...pts.map(x=>x.top))} kg · est. 1RM ${Math.max(...pts.map(x=>x.e1))} kg · ${pts.length} session${pts.length>1?'s':''}</div></div>`:''}
  ${pts.slice().reverse().map(x=>`<div class="row between mute"><span>${x.date}</span><span>${x.top} kg top · e1RM ${x.e1}</span></div>`).join('')}`;
}
function chart(pts){
  if(!pts.length) return '<p class="mute">No data.</p>';
  const W=320,H=160,pad=24; const ys=pts.map(x=>x.top); let lo=Math.min(...ys),hi=Math.max(...ys); if(lo===hi){lo-=1;hi+=1;}
  const X=i=>pts.length===1?W/2:pad+i*(W-2*pad)/(pts.length-1), Y=v=>H-pad-(v-lo)/(hi-lo)*(H-2*pad);
  return `<svg class="chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="Top weight over time"><polyline fill="none" stroke="var(--accent)" stroke-width="2.5" points="${pts.map((x,i)=>X(i)+','+Y(x.top)).join(' ')}"/>${pts.map((x,i)=>`<circle cx="${X(i)}" cy="${Y(x.top)}" r="4" fill="var(--accent)"/>`).join('')}<text x="4" y="14" font-size="11" fill="var(--mute)">${hi} kg</text><text x="4" y="${H-6}" font-size="11" fill="var(--mute)">${lo} kg</text></svg>`;
}

// ---------- data ----------
function dataPage(){
  $app.innerHTML=`<h1>Data</h1><p class="mute">Everything is stored on this phone only. Export a backup now and then, and use it to move data to a new phone.</p>
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
    S=o; if(!S.profiles[S.active]) S.active=Object.keys(S.profiles)[0]; save(); toast('Restored'); location.hash='#/'; route();};
  fr.readAsText(file);
}

// ---------- events ----------
document.addEventListener('click',ev=>{
  const b=ev.target.closest('[data-act]'); if(!b) return; const a=b.dataset.act,p=P(),id=b.dataset.id,i=+b.dataset.i,j=+b.dataset.j;
  switch(a){
    case 'goto': location.hash=b.dataset.to; break;
    case 'profile': S.active=id; save(); route(); break;
    case 'rename': {const v=document.getElementById('pname').value.trim(); if(v){p.name=v.slice(0,20); save(); route(); toast('Saved');} break;}
    case 'start': startWorkout(id); break;
    case 'discard': if(confirm('Discard this workout?')){p.draft=null; save(); location.hash='#/'; route();} break;
    case 'dellog': if(confirm('Delete this workout?')){p.logs=p.logs.filter(l=>l.id!==id); save(); route();} break;
    case 'chk': {const s=p.draft.entries[i].sets[j]; s.done=!s.done; save(); workout(); break;}
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
    case 'addcustom': {const n=document.getElementById('cxname').value.trim(); if(!n){toast('Enter a name');break;} const eq=document.getElementById('cxequip').value; p.customEx.push({id:'c'+uid(),name:n.slice(0,40),equip:eq,muscle:'Custom'}); save(); toast('Added — find it in the editor'); document.getElementById('cxname').value=''; break;}
    case 'export': doExport(); break;
    case 'erase': if(confirm('Erase ALL data on this phone?')&&confirm('This cannot be undone. Really erase?')){S=fresh(); save(); location.hash='#/'; route();} break;
  }
});
document.addEventListener('input',ev=>{
  const t=ev.target;
  if(t.dataset&&t.dataset.f){const s=P().draft.entries[+t.dataset.i].sets[+t.dataset.j]; s[t.dataset.f]=t.value===''?'':+t.value; save();}
  else if(t.id==='edq'){edQuery=t.value; const pos=t.selectionStart; editor(location.hash.split('/')[2]); const n=document.getElementById('edq'); n.focus(); n.setSelectionRange(pos,pos);}
});
document.addEventListener('change',ev=>{
  if(ev.target.id==='prsel'){prEx=ev.target.value; progress();}
  if(ev.target.id==='imp'&&ev.target.files[0]) doImport(ev.target.files[0]);
});
if('serviceWorker' in navigator && location.protocol!=='file:') navigator.serviceWorker.register('sw.js').catch(()=>{});
route();
})();
