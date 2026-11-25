// Exercise library: [id, name, equipment, muscle]
// equipment: barbell | dumbbell | machine | cable | bodyweight
const EX_RAW = [
 ['bench','Barbell Bench Press','barbell','Chest'],['incbench','Incline Barbell Press','barbell','Chest'],
 ['dbbench','Dumbbell Bench Press','dumbbell','Chest'],['dbinc','Incline Dumbbell Press','dumbbell','Chest'],
 ['dbfly','Dumbbell Fly','dumbbell','Chest'],['pecdeck','Pec Deck','machine','Chest'],
 ['chestpress','Machine Chest Press','machine','Chest'],['cablefly','Cable Fly','cable','Chest'],
 ['pushup','Push-Up','bodyweight','Chest'],['dip','Dip','bodyweight','Chest'],
 ['ohp','Overhead Press','barbell','Shoulders'],['dbohp','Dumbbell Shoulder Press','dumbbell','Shoulders'],
 ['machohp','Machine Shoulder Press','machine','Shoulders'],['latraise','Lateral Raise','dumbbell','Shoulders'],
 ['cablelat','Cable Lateral Raise','cable','Shoulders'],['rearfly','Rear Delt Fly','dumbbell','Shoulders'],
 ['revpec','Reverse Pec Deck','machine','Shoulders'],['facepull','Face Pull','cable','Shoulders'],
 ['frontraise','Front Raise','dumbbell','Shoulders'],['arnold','Arnold Press','dumbbell','Shoulders'],
 ['pushdown','Triceps Pushdown','cable','Triceps'],['skull','Skull Crusher','barbell','Triceps'],
 ['ohext','Overhead Triceps Extension','dumbbell','Triceps'],['cgbench','Close-Grip Bench Press','barbell','Triceps'],
 ['tricmach','Triceps Dip Machine','machine','Triceps'],['kickback','Triceps Kickback','dumbbell','Triceps'],
 ['deadlift','Deadlift','barbell','Back'],['row','Barbell Row','barbell','Back'],
 ['dbrow','One-Arm Dumbbell Row','dumbbell','Back'],['cablerow','Seated Cable Row','cable','Back'],
 ['latpull','Lat Pulldown','cable','Back'],['machrow','Machine Row','machine','Back'],
 ['pullup','Pull-Up','bodyweight','Back'],['chinup','Chin-Up','bodyweight','Back'],
 ['tbar','T-Bar Row','barbell','Back'],['straightarm','Straight-Arm Pulldown','cable','Back'],
 ['shrug','Dumbbell Shrug','dumbbell','Back'],['hyper','Back Extension','bodyweight','Back'],
 ['curl','Barbell Curl','barbell','Biceps'],['dbcurl','Dumbbell Curl','dumbbell','Biceps'],
 ['hammer','Hammer Curl','dumbbell','Biceps'],['inccurl','Incline Dumbbell Curl','dumbbell','Biceps'],
 ['cablecurl','Cable Curl','cable','Biceps'],['preacher','Preacher Curl','machine','Biceps'],
 ['concentration','Concentration Curl','dumbbell','Biceps'],['spider','Spider Curl','dumbbell','Biceps'],
 ['squat','Back Squat','barbell','Legs'],['frontsquat','Front Squat','barbell','Legs'],
 ['legpress','Leg Press','machine','Legs'],['hack','Hack Squat','machine','Legs'],
 ['goblet','Goblet Squat','dumbbell','Legs'],['bulgarian','Bulgarian Split Squat','dumbbell','Legs'],
 ['lunge','Walking Lunge','dumbbell','Legs'],['legext','Leg Extension','machine','Legs'],
 ['legcurl','Seated Leg Curl','machine','Legs'],['lyingcurl','Lying Leg Curl','machine','Legs'],
 ['rdl','Romanian Deadlift','barbell','Legs'],['dbrdl','Dumbbell Romanian Deadlift','dumbbell','Legs'],
 ['hipthrust','Hip Thrust','barbell','Legs'],['abduct','Hip Abduction','machine','Legs'],
 ['adduct','Hip Adduction','machine','Legs'],['stepup','Step-Up','dumbbell','Legs'],
 ['calf','Standing Calf Raise','machine','Calves'],['seatedcalf','Seated Calf Raise','machine','Calves'],
 ['legpresscalf','Leg Press Calf Raise','machine','Calves'],['dbcalf','Dumbbell Calf Raise','dumbbell','Calves'],
 ['plank','Plank','bodyweight','Core'],['crunch','Cable Crunch','cable','Core'],
 ['hangleg','Hanging Leg Raise','bodyweight','Core'],['abwheel','Ab Wheel','bodyweight','Core'],
 ['russian','Russian Twist','dumbbell','Core'],['woodchop','Cable Woodchop','cable','Core'],
 ['absmach','Ab Crunch Machine','machine','Core'],['farmer','Farmer Carry','dumbbell','Core'],
 ['pullover','Dumbbell Pullover','dumbbell','Chest'],['thruster','Dumbbell Thruster','dumbbell','Full body'],['kbswing','Kettlebell Swing','dumbbell','Full body'],
];
const EQUIP_STEP = { barbell:2.5, dumbbell:2, machine:5, cable:5, bodyweight:1 };
const STEP_LABEL = { barbell:'2.5 kg', dumbbell:'2 kg', machine:'5 kg', cable:'5 kg', bodyweight:'1 kg' };
const TIMED = ['plank','farmer']; // logged in seconds, not reps
const BUILTIN = EX_RAW.map(([id,name,equip,muscle]) => ({id,name,equip,muscle,timed:TIMED.includes(id)}));
const DEFAULT_ROUTINES = {
 push:{name:'Push',ex:['bench','dbinc','ohp','latraise','pushdown','ohext']},
 pull:{name:'Pull',ex:['deadlift','latpull','cablerow','facepull','curl','hammer']},
 legs:{name:'Legs',ex:['squat','rdl','legpress','legcurl','legext','calf']},
 full:{name:'Full Body',ex:['squat','bench','row','ohp','dbcurl','pushdown']},
};
const REP_MIN = 8, REP_MAX = 12, DEFAULT_SETS = 3;
if (typeof module !== 'undefined') module.exports = { BUILTIN, EQUIP_STEP, DEFAULT_ROUTINES };
