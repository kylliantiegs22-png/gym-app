// Muscle diagram: stylised front and back figures as flat geometric SVG. Pure string output (testable in Node).
const MUSCLE_NAME={chest:'Chest',shoulders:'Shoulders',biceps:'Biceps',triceps:'Triceps',forearms:'Forearms',core:'Core',quads:'Quads',hamstrings:'Hamstrings',glutes:'Glutes',calves:'Calves',traps:'Traps',lats:'Lats',lowerback:'Lower back',adductors:'Inner thigh'};
const GROUP_PRIMARY={Chest:['chest'],Back:['lats','traps'],Shoulders:['shoulders'],Biceps:['biceps'],Triceps:['triceps'],Forearms:['forearms'],Legs:['quads','glutes','hamstrings'],Calves:['calves'],Core:['core'],'Full body':['quads','glutes','chest','lats','shoulders']};
// Which app muscle each piece of the artwork (body-art.js) belongs to. Pieces not listed (head, neck, knees) are drawn as plain body.
const ART_KEY={chest:'chest','front-deltoids':'shoulders','back-deltoids':'shoulders',biceps:'biceps',triceps:'triceps',forearm:'forearms',abs:'core',obliques:'core',quadriceps:'quads',abductors:'adductors',abductor:'adductors',hamstring:'hamstrings',gluteal:'glutes',calves:'calves','left-soleus':'calves','right-soleus':'calves',trapezius:'traps','upper-back':'lats','lower-back':'lowerback'};
function musclesOf(ex){
  if(ex&&ex.primary&&ex.primary.length) return {primary:ex.primary,secondary:ex.secondary||[]};
  return {primary:GROUP_PRIMARY[ex&&ex.muscle]||[],secondary:[]};
}
const muscleNames=list=>list.map(k=>MUSCLE_NAME[k]||k).join(', ');
function figure(ex,opts){
  opts=opts||{};
  const m=musclesOf(ex), st=k=>m.primary.includes(k)?'p':(m.secondary.includes(k)?'s':'');
  const art=typeof BODY_ART!=='undefined'?BODY_ART:require('./body-art.js').BODY_ART;
  const view=(v,x)=>`<g transform="translate(${x} 0)">`+art[v].map(([name,polys])=>{const k=ART_KEY[name];return polys.map(pts=>`<polygon class="${k?'m '+st(k):'base'}" points="${pts}"/>`).join('');}).join('')+'</g>';
  const label=opts.labels?'<text x="50" y="216" text-anchor="middle" class="figlabel">FRONT</text><text x="170" y="216" text-anchor="middle" class="figlabel">BACK</text>':'';
  const desc='Muscles worked. Primary: '+(muscleNames(m.primary)||'none listed')+'. Secondary: '+(muscleNames(m.secondary)||'none')+'.';
  const a=opts.mini?'aria-hidden="true"':`role="img" aria-label="${desc}"`;
  return `<svg class="figure${opts.mini?' mini-fig':''}" viewBox="0 0 220 ${opts.labels?222:200}" ${a}>${view('front',0)}${view('back',120)}${label}</svg>`;
}
if(typeof module!=='undefined') module.exports={MUSCLE_NAME,GROUP_PRIMARY,ART_KEY,musclesOf,muscleNames,figure};
