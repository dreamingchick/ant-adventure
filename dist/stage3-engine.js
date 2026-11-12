import { Game, makeEnemy, FLOOR, WIDTH } from './engine.js?v=1.0.2';
import { endingFor } from './journey.js?v=1.0.2';

export const WINDS = [
  { from: 730, to: 1160, safe: [875, 985], force: -145 },
  { from: 3320, to: 3910, safe: [3635, 3760], force: -160 },
];
export const windPhase = time => time % 3.5;
const MOTHER_HP = 12;
const DUEL_SETTLE_SPEED = 6;
const CHEER_WINDOW = [1.05,1.83];
const ARENA_LEFT = 4290;
const ARENA_RIGHT = 5360;
export const DUEL_DECK_Y = 260;
const GATE_X = 3040;
const checkpoints = [
  { x:105,y:FLOOR,name:'부엌 뒤 문턱' },
  { x:1680,y:FLOOR,name:'걸레받이 쉼터' },
  { x:3140,y:FLOOR,name:'바깥문 쉼터' },
];
const platform = (x,y,w,h,type='stone') => ({x,y,w,h,type});
const makeWorld = () => ({
  solids: [
    platform(0,FLOOR,3450,180,'floor'),platform(3600,FLOOR,1820,180,'floor'),
    platform(420,538,115,52),platform(1515,460,125,26,'wood'),
    platform(1960,448,610,24,'wood'),platform(1900,517,100,23,'wood'),
    platform(3695,500,115,26,'wood'),
    platform(4460,500,112,22,'wood'),platform(5060,500,112,22,'wood'),
    platform(ARENA_LEFT,DUEL_DECK_Y,ARENA_RIGHT-ARENA_LEFT,18,'wood'),
  ],
  paths: [{id:'shelf',points:[{x:1170,y:548},{x:1170,y:410},{x:1530,y:410}],slip:false}],
  crate: {x:-600,y:580,w:1,h:1},
  rope: {x:-600,y:0,length:1,angle:0,velocity:0},
  heal: [{id:'porch-heal',x:3970,y:558}],sugar:[],
});
const makeMother=()=>({...makeEnemy('mother','boss',4760,2),hp:MOTHER_HP,max:MOTHER_HP,w:115,h:145});
const stage = {
  chapter:3,width:5420,checkpoints,makeWorld,
  areas:[
    {x:0,title:'부엌 뒤 문턱',hint:'천과 종잇조각이 먼저 흔들리면 곧 바람이 불어요'},
    {x:710,title:'걸레받이 틈',hint:'가림막 뒤에서 기다리거나 선반에 붙어 건너세요'},
    {x:1700,title:'빨랫바구니 아래',hint:'순찰 중인 베짱이 위로 우회할 수 있어요'},
    {x:2660,title:'바깥문 앞',hint:'문 앞의 쐐기를 밀면 베짱이가 문을 받쳐 줍니다'},
    {x:3130,title:'바깥문 쉼터',hint:'손을 잡고 건너거나 바람이 잦아들 때 직접 점프하세요'},
    {x:3920,title:'흙길 입구',hint:'베짱이와 함께 개미굴 입구로 가세요'},
    {x:4320,title:'개미굴 입구',hint:'엄마 개미와 대결하세요. 위쪽 대결은 베짱이가 맡습니다.'},
  ],
  bossHp:MOTHER_HP,bossReward:0,bossTrigger:4350,arenaLeft:ARENA_LEFT,arenaRight:ARENA_RIGHT,
  bossMin:4340,bossMax:5330,crateMin:-600,crateMax:-600,ropeRest:0,
  enemies:()=>[
    makeEnemy('patrol','normal',2120,1),makeMother(),
  ],
  sugar:[[180,545,5,36],[1190,405,8,37],[1750,549,4,38],[2050,402,8,43],[2630,550,6,40],[3130,547,4,39],[3680,451,4,39],[4000,549,5,43]],
  respawnX:()=>3280,
};

const count = v => Number.isSafeInteger(v)&&v>0?v:0;
const range = (x,a,b) => x>=a && x<=b;
const toward = (a,b,speed) => a+Math.sign(b-a)*Math.min(Math.abs(b-a),speed);
const duelPairs = { player:'mother',mother:'player',spouse:'father',father:'spouse' };
export const canDuelHit = (source,target) => Object.hasOwn(duelPairs,source)&&duelPairs[source]===target;
const nextDuelAttacker = duel => (duel.round+1)%3===0?'spouse':'father';

export function cleanStage3(raw) {
  const state = {cleared:raw?.cleared===true,best:Number.isFinite(raw?.best)&&raw.best>0?raw.best:null,bestLevels:raw?.bestLevels??null,bossReward:false,run:null};
  const run=raw?.run;
  if(!run||!Number.isInteger(run.cp)||!checkpoints[run.cp])return state;
  const ids=Array.isArray(run.collected)?[...new Set(run.collected.filter(v=>typeof v==='string'&&/^s\d+$/.test(v)))]:[];
  const bossHp=Number.isFinite(run.bossHp)?Math.max(1,Math.min(MOTHER_HP,Math.floor(run.bossHp))):MOTHER_HP;
  state.run={cp:run.cp,bossHp,collected:ids,dead:Array.isArray(run.dead)&&run.dead.includes('patrol')?['patrol']:[],
    activated:Array.isArray(run.activated)?[...new Set(run.activated.filter(v=>Number.isInteger(v)&&checkpoints[v]))]:[],
    elapsed:Number.isFinite(run.elapsed)&&run.elapsed>0?run.elapsed:0,attemptSugar:count(run.attemptSugar)};
  return state;
}

export class ThresholdGame extends Game {
  constructor(profile,emit) {
    super(profile,emit,stage);
    profile.chapter3=cleanStage3(profile.chapter3);
  }

  get progress(){return this.profile.chapter3;}
  get wind(){return windPhase(this.time);}
  get mother(){return this.enemies.find(enemy=>enemy.id==='mother');}
  get companionPose(){
    if(!this.companion)return null;
    const {x,y,dir}=this.companion;
    return {x,y,flip:dir>0};
  }

  setup(){
    super.setup();
    this.gateOpen=this.progress.run.cp>=2;
    this.metSpouse=this.gateOpen;
    this.companion=this.metSpouse?{x:3325,y:FLOOR,dir:-1,following:true}:null;
    this.rejoined=false;
    this.crossing=null;
    this.duel=null;
    if(!this.gateOpen)this.world.solids.push(platform(GATE_X,100,30,490,'gate'));
  }

  getInteraction(){
    if(this.bossActive){
      const duel=this.duel;
      if(!duel||duel.aiDone||duel.playerDone||!duel.cheersLeft)return null;
      return {kind:'cheer',label:this.canCheer?'응원!':'응원',disabled:!this.canCheer};
    }
    if(this.crossing)return null;
    const x=this.p.x+this.p.w/2;
    if(!this.gateOpen&&range(x,2910,GATE_X))return {kind:'wedge',label:'쐐기 밀기'};
    if(this.gateOpen&&range(x,3180,3390)&&this.p.ground)return {kind:'hand',label:'손 잡기'};
    return super.getInteraction();
  }

  interact(){
    if(this.mode!=='playing')return;
    const choice=this.getInteraction()?.kind;
    if(choice==='cheer'){
      if(!this.canCheer)return;
      this.duel.cheersLeft--;
      this.duel.cheered=true;
      this.notify('베짱이가 아빠 개미의 돌진에 반격합니다.');
    }else if(choice==='wedge'){
      this.gateOpen=true;
      this.world.solids=this.world.solids.filter(s=>s.type!=='gate');
      this.notify('베짱이가 문을 받쳤어요.');
    }else if(choice==='hand'){
      this.crossing={x:this.p.x,t:0};
      this.notify('베짱이: 손 잡아. 이번엔 내가 당겨 줄게.');
    }else super.interact();
  }

  moveSpeed(dir,p){
    const speed=super.moveSpeed(dir,p);
    const x=p.x+p.w/2;
    const zone=WINDS.find(w=>range(x,w.from,w.to)&&!range(x,...w.safe));
    return speed+(zone&&this.wind>=.8&&this.wind<2?zone.force:0);
  }

  jump(){if(!this.crossing&&!this.duel?.playerDone)super.jump();}
  attack(){return !this.crossing&&(!this.duel||!this.duel.playerDone)&&super.attack();}
  onBossDefeated(){
    if(!this.duel||this.duel.playerDone)return;
    this.duel.playerDone=true;
    Object.assign(this.input,{left:false,right:false,jump:false});
    Object.assign(this.p,{vx:0,vy:0,firePose:0,inv:0});
    this.shots=[];
    this.notify('엄마 개미에게 승리했어요!');
  }

  hurt(amount=1){
    if(this.duel&&this.duel.playerDone)return;
    super.hurt(amount);
  }

  onPlayerDefeat(){
    if(!this.duel){super.onPlayerDefeat();return;}
    this.rememberBoss();
    this.spawn();
    this.p.x=stage.bossTrigger+8;
    this.p.dir=1;
    this.camera=Math.min(stage.width-WIDTH,this.p.x-370);
    Object.assign(this.mother,makeMother(),{hp:this.progress.run.bossHp});
    this.shots=[];
    this.save();
    this.notify('다시 도전! 엄마 개미는 '+this.mother.hp+'회 더 맞히면 돼요.');
  }

  updateCompanion(dt){
    if(!this.metSpouse||this.duel)return;
    const p=this.p;
    const center=p.x+p.w/2;
    const companion=this.companion??={x:2580,y:FLOOR,dir:-1,following:false};
    if(Math.abs(center-companion.x)<85)companion.following=true;
    const target=this.crossing?center+46:companion.following?center-p.dir*82:2580;
    companion.x=toward(companion.x,target,(this.crossing?750:360)*dt);
    const feet=p.y+p.h;
    companion.y=toward(companion.y,companion.following?Math.min(FLOOR,feet):FLOOR,420*dt);
    if(Math.abs(center-companion.x)>8)companion.dir=Math.sign(center-companion.x);
  }

  updateBoss(mother,dt,dx){
    if(this.duel?.playerDone)return;
    mother.timer-=dt;
    switch(mother.state){
      case 'walk':
        mother.x=toward(mother.x,this.p.x+this.p.w/2,68*dt);
        if(mother.cool<=0){mother.state='warn';mother.timer=.75;mother.dir=Math.sign(dx)||-1;}
        break;
      case 'warn':
        if(mother.timer<=0){mother.state='charge';mother.timer=.62;this.sound('boss');}
        break;
      case 'charge':
        mother.x+=mother.dir*390*dt;
        if(mother.timer<=0){mother.state='rest';mother.timer=1.1;}
        break;
      case 'rest':
        if(mother.timer<=0){mother.state='walk';mother.cool=.6;}
        break;
    }
    mother.x=Math.max(stage.bossMin,Math.min(stage.bossMax-mother.w,mother.x));
  }

  startDuel(){
    this.duel={playerDone:false,spouse:5,father:6,aiDone:false,
      timer:0,round:0,spouseX:4590,fatherX:4980,strike:0,
      cheersLeft:3,cheered:false};
  }

  get canCheer(){
    const duel=this.duel;
    return Boolean(duel&&!duel.aiDone&&!duel.playerDone&&duel.cheersLeft>0&&!duel.cheered
      &&nextDuelAttacker(duel)==='father'&&range(duel.timer,...CHEER_WINDOW));
  }

  aiHit(source,target){
    const duel=this.duel;
    if(!duel||duel.aiDone||!canDuelHit(source,target)||!['spouse','father'].includes(target))return false;
    duel[target]=Math.max(0,duel[target]-1);
    if(duel[target]===0)duel.aiDone=true;
    return true;
  }

  updateDuel(dt){
    const duel=this.duel;
    if(!duel)return;
    duel.strike=Math.max(0,duel.strike-dt);
    if(!duel.aiDone){
      const pace=duel.playerDone?DUEL_SETTLE_SPEED:1;
      duel.timer+=dt*pace;
      const charging=duel.timer>1.1;
      duel.spouseX=toward(duel.spouseX,charging?4770:4550,dt*230*Math.sqrt(pace));
      duel.fatherX=toward(duel.fatherX,charging?4870:5050,dt*210*Math.sqrt(pace));
      if(duel.timer>=1.9){
        duel.attacker=duel.cheered?'spouse':nextDuelAttacker(duel);
        duel.round++;
        duel.cheered=false;
        this.aiHit(duel.attacker,duelPairs[duel.attacker]);
        duel.timer-=1.9;
        duel.strike=.28;
      }
    }
    if(duel.playerDone&&duel.aiDone)this.finish();
  }

  updateHazards(dt){if(this.mode==='playing')this.updateDuel(dt);}

  update(dt){
    if(this.mode!=='playing')return;
    if(this.crossing){
      const crossing=this.crossing;
      crossing.t=Math.min(1,crossing.t+dt/1.2);
      this.elapsed+=dt;this.time+=dt;
      this.p.x=crossing.x+(3850-crossing.x)*crossing.t;
      this.p.y=FLOOR-this.p.h-60*Math.sin(Math.PI*crossing.t);
      this.p.dir=1;
      this.camera=Math.max(0,this.p.x-380);
      this.updateCompanion(dt);
      if(crossing.t===1){this.crossing=null;this.p.vy=0;}
      return;
    }
    if(this.duel?.playerDone){
      this.elapsed+=dt;this.time+=dt;
      this.updateDuel(dt);
      return;
    }
    super.update(dt);
    if(this.mode==='playing'&&!this.metSpouse&&range(this.p.x,2440,GATE_X)){
      this.metSpouse=true;
      this.updateCompanion(dt);
      this.emit({type:'meet'});
    }
    if(!this.rejoined&&this.p.x>=3920){
      this.rejoined=true;
      this.notify('베짱이: 저 흙길 끝까지 같이 가자.');
    }
    if(this.bossActive&&!this.duel)this.startDuel();
    if(this.bossActive)this.p.x=Math.min(this.p.x,stage.arenaRight-this.p.w);
    this.updateCompanion(dt);
  }

  finish(){
    if(this.mode!=='playing'||!this.mother?.dead||!this.duel?.playerDone||!this.duel.aiDone)return;
    const ending=endingFor(this.profile.journey,this.duel.father===0);
    this.endingResult={
      id:ending,tracked:this.profile.journey?.tracked===true&&this.profile.journey.next===3,
      hits:this.profile.journey?.hits??0,deaths:this.profile.journey?.deaths??0,
    };
    super.finish(ending);
  }
}
