const assert=require('assert');const L=require('../logic.js');const {BUILTIN}=require('../data.js');
const ex=id=>BUILTIN.find(e=>e.id===id);
const mk=(id,sets)=>[{date:'2026-01-01',entries:[{exId:id,sets:sets.map(([w,r])=>({w,r,done:true}))}]}];
let s=L.suggest([],ex('bench'),8,12,3); assert.equal(s.sets.length,3); assert(!s.nudge);
s=L.suggest(mk('bench',[[60,12],[60,12],[60,12]]),ex('bench'),8,12,3); assert(s.nudge); assert.equal(s.sets[0].w,62.5); assert.equal(s.sets[0].r,8);
s=L.suggest(mk('dbcurl',[[14,12],[14,12],[14,12]]),ex('dbcurl'),8,12,3); assert.equal(s.sets[0].w,16);
s=L.suggest(mk('legpress',[[100,12],[100,12],[100,12]]),ex('legpress'),8,12,3); assert.equal(s.sets[0].w,105);
s=L.suggest(mk('bench',[[60,12],[60,10],[60,9]]),ex('bench'),8,12,3); assert(!s.nudge); assert.equal(s.sets[1].w,60); assert.equal(s.sets[1].r,10);
s=L.suggest(mk('bench',[[60,12],[60,12]]),ex('bench'),8,12,3); assert(!s.nudge,'fewer sets than target: no nudge');
assert.equal(L.e1rm(100,5),116.67);
assert(L.validateImport({}) && L.validateImport(null) && !L.validateImport({app:'lifts',profiles:{a:{logs:[],routines:{}}}}));
console.log('unit ok');
{const D=require('../data.js').DEFAULT_ROUTINES;
 assert.equal(L.sanitizeState(null,D),null);assert.equal(L.sanitizeState({profiles:5},D),null);assert.equal(L.sanitizeState([],D),null);
 const s=L.sanitizeState({active:'zzz',profiles:{a:{name:5,routines:null,logs:[null,{entries:[{exId:'bench',sets:[{w:'x',r:1},{w:50,r:8}]}],date:'2026-02-01'}],draft:12}}},D);
 assert.equal(s.active,'a');assert.equal(s.profiles.a.logs.length,1);assert.equal(s.profiles.a.logs[0].entries[0].sets.length,1);
 assert(Object.keys(s.profiles.a.routines).length===4);assert.equal(s.profiles.a.draft,null);assert.equal(s.profiles.a.name,'Person 1');
 console.log('sanitize ok');}
{const ex=id=>BUILTIN.find(e=>e.id===id);
 const mk2=(id,date,sets)=>[{date,entries:[{exId:id,sets:sets.map(([w,r])=>({w,r,done:true}))}]}];
 let s=L.suggest(mk2('bench','2026-10-01',[[100,12],[100,12],[100,12]]),ex('bench'),8,12,3,'2026-11-25');assert(!s.nudge,'no nudge after 8 weeks');assert.equal(s.sets[0].w,100);
 s=L.suggest(mk2('bench','2026-11-18',[[100,12],[100,12],[100,12]]),ex('bench'),8,12,3,'2026-11-25');assert(s.nudge,'nudge within a week');
 s=L.suggest(mk2('plank','2026-11-18',[[0,45],[0,45],[0,45]]),ex('plank'),8,12,3,'2026-11-25');assert(!s.nudge,'never nudge a plank');assert.equal(s.sets[0].r,45);
 assert.equal(L.daysBetween('2026-11-18','2026-11-25'),7);console.log('gap/timed ok');}
