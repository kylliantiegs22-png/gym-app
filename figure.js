// Muscle diagram: stylised front and back figures as flat geometric SVG. Pure string output (testable in Node).
const MUSCLE_NAME={chest:'Chest',shoulders:'Shoulders',biceps:'Biceps',triceps:'Triceps',forearms:'Forearms',core:'Core',quads:'Quads',hamstrings:'Hamstrings',glutes:'Glutes',calves:'Calves',traps:'Traps',lats:'Lats',lowerback:'Lower back',adductors:'Inner thigh'};
const GROUP_PRIMARY={Chest:['chest'],Back:['lats','traps'],Shoulders:['shoulders'],Biceps:['biceps'],Triceps:['triceps'],Forearms:['forearms'],Legs:['quads','glutes','hamstrings'],Calves:['calves'],Core:['core'],'Full body':['quads','glutes','chest','lats','shoulders']};
// Left half of the body (x < 60); the right half is the mirror image.
const SHAPES={
  front:{
    shoulders:['40,38 31,41 25,52 27,64 36,63 37,52 43,44'],
    chest:['58,40 43,45 37,54 38,62 46,67 58,66'],
    biceps:['27,66 36,65 37,92 29,93'],
    forearms:['28,96 36,95 34,128 26,127'],
    core:['58,68 46,69 47,106 58,108','45,70 38,66 38,98 46,104'],
    quads:['41,118 58,118 58,172 47,172 41,150'],
    adductors:['52,124 58,124 58,162 52,164'],
    calves:['43,178 56,178 54,226 45,226'],
  },
  back:{
    traps:['58,34 49,38 38,43 45,54 58,62'],
    shoulders:['40,38 31,41 25,52 27,64 36,63 37,52 43,44'],
    lats:['58,64 45,58 37,63 38,88 47,98 58,98'],
    triceps:['27,66 36,65 37,92 29,93'],
    forearms:['28,96 36,95 34,128 26,127'],
    lowerback:['58,100 47,100 46,112 58,114'],
    glutes:['58,116 58,142 42,142 41,120'],
    hamstrings:['41,145 58,145 58,176 47,176 41,160'],
    calves:['43,180 56,180 54,226 45,226'],
  },
};
function musclesOf(ex){
  if(ex&&ex.primary&&ex.primary.length) return {primary:ex.primary,secondary:ex.secondary||[]};
  return {primary:GROUP_PRIMARY[ex&&ex.muscle]||[],secondary:[]};
}
const muscleNames=list=>list.map(k=>MUSCLE_NAME[k]||k).join(', ');
function figure(ex,opts){
  opts=opts||{};
  const m=musclesOf(ex), st=k=>m.primary.includes(k)?'p':(m.secondary.includes(k)?'s':'');
  const half=v=>{
    let o='<polygon class="base" points="47,108 58,110 58,116 42,116"/><polygon class="base" points="26,129 34,129 33,139 27,139"/><polygon class="base" points="45,228 55,228 55,235 43,235"/>';
    for(const [k,polys] of Object.entries(SHAPES[v])) for(const pts of polys) o+=`<polygon class="m ${st(k)}" points="${pts}"/>`;
    return o;
  };
  const one=(v,x)=>`<g transform="translate(${x} 0)"><circle class="base" cx="60" cy="16" r="11"/><rect class="base" x="54" y="27" width="12" height="8"/><g>${half(v)}</g><g transform="translate(120 0) scale(-1 1)">${half(v)}</g></g>`;
  const label=opts.labels?'<text x="60" y="256" text-anchor="middle" class="figlabel">FRONT</text><text x="190" y="256" text-anchor="middle" class="figlabel">BACK</text>':'';
  const desc='Muscles worked. Primary: '+(muscleNames(m.primary)||'none listed')+'. Secondary: '+(muscleNames(m.secondary)||'none')+'.';
  const a=opts.mini?'aria-hidden="true"':`role="img" aria-label="${desc}"`;
  return `<svg class="figure${opts.mini?' mini-fig':''}" viewBox="0 0 250 ${opts.labels?262:240}" ${a}>${one('front',0)}${one('back',130)}${label}</svg>`;
}
if(typeof module!=='undefined') module.exports={MUSCLE_NAME,GROUP_PRIMARY,SHAPES,musclesOf,muscleNames,figure};
