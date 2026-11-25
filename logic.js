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
function suggest(logs, ex, repMin, repMax, nSets){
  const last = lastSession(logs, ex.id);
  if(!last) return {nudge:false, sets:Array.from({length:nSets},()=>({w:'',r:'',done:false}))};
  const allTop = last.sets.length>=nSets && last.sets.every(s=>+s.r>=repMax);
  const step = stepFor(ex);
  const base = last.sets.map(s=>+s.w);
  const top = Math.max(...base);
  let sets = [];
  for(let i=0;i<nSets;i++){
    const prev = last.sets[Math.min(i,last.sets.length-1)];
    sets.push({w: allTop ? round(+prev.w+step) : +prev.w, r: allTop ? repMin : +prev.r, done:false});
  }
  return {nudge:allTop, step, sets, last};
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
if (typeof module!=='undefined') module.exports={suggest,lastSession,e1rm,volume,bestByDate,validateImport,stepFor,round};
