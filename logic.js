// Pure logic, shared by app and tests.
function stepFor(ex){ return (typeof EQUIP_STEP!=='undefined'?EQUIP_STEP:require('./data.js').EQUIP_STEP)[ex.equip] || 2.5; }
function lastSession(logs, exId){
  for (let i=logs.length-1;i>=0;i--){
    const e = logs[i].entries.find(x=>x.exId===exId);
    if (e){ const sets=e.sets.filter(s=>s.done && s.w!=='' && s.r!==''); if(sets.length) return {date:logs[i].date,sets}; }
  }
  return null;
}
// Suggest starting sets for an exercise. Carry weight/reps down from last time;
// nudge heavier if every set hit the top of the rep range.
function daysBetween(a,b){ return Math.round((Date.parse(b+'T00:00:00Z')-Date.parse(a+'T00:00:00Z'))/864e5); }
function suggest(logs, ex, repMin, repMax, nSets, todayISO){
  const last = lastSession(logs, ex.id);
  if(!last) return {nudge:false, sets:Array.from({length:nSets},()=>({w:'',r:'',done:false}))};
  const gapDays = todayISO ? daysBetween(last.date, todayISO) : 0;
  // never push the weight up for timed holds, or after a long break (ease back in)
  const allTop = !ex.timed && gapDays<=28 && last.sets.length>=nSets && last.sets.every(s=>+s.r>=repMax);
  const step = stepFor(ex);
  const base = last.sets.map(s=>+s.w);
  const top = Math.max(...base);
  let sets = [];
  for(let i=0;i<nSets;i++){
    const prev = last.sets[Math.min(i,last.sets.length-1)];
    sets.push({w: allTop ? round(+prev.w+step) : +prev.w, r: allTop ? repMin : +prev.r, done:false});
  }
  return {nudge:allTop, step, sets, last, gapDays};
}
function round(n){ return Math.round(n*100)/100; }
function e1rm(w,r){ return r<=0?0:round(w*(1+r/30)); }
function volume(entry){ return entry.sets.filter(s=>s.done).reduce((a,s)=>a+(+s.w||0)*(+s.r||0),0); }
function bestByDate(logs, exId){
  const out=[];
  for(const l of logs){
    const e=l.entries.find(x=>x.exId===exId); if(!e) continue;
    const sets=e.sets.filter(s=>s.done&&+s.w>0&&+s.r>0); if(!sets.length) continue;
    out.push({date:l.date, top:Math.max(...sets.map(s=>+s.w)), e1:Math.max(...sets.map(s=>e1rm(+s.w,+s.r)))});
  }
  return out;
}
function validateImport(obj){
  if(!obj||typeof obj!=='object') return 'Not a Lifts backup file.';
  if(obj.app!=='lifts') return 'Not a Lifts backup file.';
  if(!obj.profiles||typeof obj.profiles!=='object'||!Object.keys(obj.profiles).length) return 'Backup has no profiles.';
  for(const p of Object.values(obj.profiles)){
    if(!p||!Array.isArray(p.logs)||!p.routines) return 'Backup is damaged.';
  }
  return null;
}
// ---- defensive loading: keep whatever is valid, drop the rest ----
const _isObj=o=>o&&typeof o==='object'&&!Array.isArray(o);
const _str=(s,d,n)=>typeof s==='string'&&s.trim()?s.slice(0,n||40):d;
const _num=v=>typeof v==='number'&&isFinite(v)&&v>=0&&v<100000;
const _EQ=['barbell','dumbbell','machine','cable','bodyweight'];
function sanitizeProfile(p,fallbackName,defaults){
  p=_isObj(p)?p:{};
  const routines={};
  if(_isObj(p.routines)) for(const [id,r] of Object.entries(p.routines)){ if(!_isObj(r)||!Array.isArray(r.ex)) continue; routines[id]={name:_str(r.name,'Routine',24),ex:r.ex.filter(x=>typeof x==='string')}; }
  if(!Object.keys(routines).length) Object.assign(routines,JSON.parse(JSON.stringify(defaults)));
  const customEx=(Array.isArray(p.customEx)?p.customEx:[]).filter(e=>_isObj(e)&&typeof e.id==='string'&&typeof e.name==='string'&&e.name).map(e=>({id:e.id,name:e.name.slice(0,40),equip:_EQ.includes(e.equip)?e.equip:'barbell',muscle:_str(e.muscle,'Custom',20)}));
  const logs=[];
  (Array.isArray(p.logs)?p.logs:[]).forEach((l,i)=>{
    if(!_isObj(l)||!Array.isArray(l.entries)) return;
    const entries=l.entries.filter(e=>_isObj(e)&&typeof e.exId==='string'&&Array.isArray(e.sets)).map(e=>({exId:e.exId,sets:e.sets.filter(s=>_isObj(s)&&_num(+s.w)&&_num(+s.r)&&s.w!==''&&s.r!==''&&s.w!==null&&s.r!==null).map(s=>({w:+s.w,r:+s.r,done:true}))})).filter(e=>e.sets.length);
    if(!entries.length) return;
    logs.push({id:typeof l.id==='string'?l.id:'x'+i,date:/^\d{4}-\d{2}-\d{2}$/.test(l.date)?l.date:'1970-01-01',routineId:typeof l.routineId==='string'?l.routineId:'',name:typeof l.name==='string'?l.name.slice(0,24):undefined,entries});
  });
  let draft=null;
  if(_isObj(p.draft)&&typeof p.draft.routineId==='string'&&Array.isArray(p.draft.entries)){
    const entries=p.draft.entries.filter(e=>_isObj(e)&&typeof e.exId==='string'&&Array.isArray(e.sets)&&e.sets.length).map(e=>({exId:e.exId,nudge:!!e.nudge,sets:e.sets.filter(_isObj).map(s=>({w:_num(s.w)?s.w:'',r:_num(s.r)?s.r:'',done:!!s.done,t:!!s.t}))})).filter(e=>e.sets.length);
    if(entries.length) draft={editId:typeof p.draft.editId==='string'?p.draft.editId:undefined,routineId:p.draft.routineId,date:/^\d{4}-\d{2}-\d{2}$/.test(p.draft.date)?p.draft.date:'1970-01-01',entries};
  }
  return {name:_str(p.name,fallbackName,20),routines,customEx,logs,draft};
}
// returns a clean state, or null when nothing usable is in o
function sanitizeState(o,defaults){
  if(!_isObj(o)||!_isObj(o.profiles)) return null;
  const profiles={};let n=0;
  for(const [id,p] of Object.entries(o.profiles)){ if(!_isObj(p)) continue; profiles[id]=sanitizeProfile(p,'Person '+(++n),defaults); }
  const ids=Object.keys(profiles); if(!ids.length) return null;
  return {app:'lifts',v:typeof o.v==='number'?o.v:1,active:ids.includes(o.active)?o.active:ids[0],profiles};
}
if (typeof module!=='undefined') module.exports={daysBetween,sanitizeState,suggest,lastSession,e1rm,volume,bestByDate,validateImport,stepFor,round};
