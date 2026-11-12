import { advanceJourney, newJourney, recordDamage } from './journey.js?v=0.4.3';
export const WIDTH=1280,HEIGHT=720,WORLD=7900,FLOOR=590;
export const LEVELS={health:[3,4,5,6],spit:[100,125,150,175],regen:[25,30,35,40]};
export const COSTS=[20,40,60];
export const CHECKPOINTS=[{x:110,y:590,name:'첫 발자국'},{x:1920,y:590,name:'탁자 아래 쉼터'},{x:3790,y:590,name:'실밥 너머 쉼터'},{x:6280,y:590,name:'대장 앞 쉼터'}];
export const AREAS=[{x:0,title:'소파 아래',hint:'← → 로 이동 · 점프를 길게 눌러 높은 곳으로!'},{x:950,title:'탁자 다리',hint:'발자국 벽 근처에서 X · 오른쪽으로 기어오르세요'},{x:1580,title:'베짱이 길목',hint:'Z 또는 퉷! · 침을 맞히거나 점프로 피해 가세요'},{x:2500,title:'생활용품 사이',hint:'블록 근처에서 X → 밀기 · X로 놓기'},{x:3100,title:'흔들리는 실밥',hint:'점프한 뒤 X로 실밥 잡기 · 흔들고 점프로 이탈!'},{x:4050,title:'챠챠의 낮잠',hint:'그림자가 짙어지면 앞발 주의! 안전한 틈에 이동하세요'},{x:4900,title:'출구 앞 소동',hint:'똑똑한 베짱이의 씨앗을 피하세요 · 길목 전투는 필수!'},{x:6250,title:'대장의 길목',hint:'돌진과 내려찍기를 피하고, 숨 고를 때 반격!'},{x:7600,title:'거실 밖으로',hint:'작은 발걸음이 새로운 길을 열었습니다.'}];
export function freshProfile(){return {schema:1,name:'개미',bank:0,levels:{health:0,spit:0,regen:0},cleared:false,bossReward:false,best:null,bestLevels:null,run:null,muted:false};}
function normalizeBossHp(value){return typeof value==='number'&&Number.isFinite(value)?Math.max(1,Math.min(14,Math.floor(value))):14;}
export function sanitize(raw){const p=freshProfile();if(!raw||raw.schema!==1)return p; p.name=typeof raw.name==='string'?raw.name.slice(0,12)||'개미':'개미';p.bank=Math.max(0,Math.floor(Number(raw.bank)||0));for(const k of Object.keys(p.levels))p.levels[k]=Math.max(0,Math.min(3,Math.floor(Number(raw.levels?.[k])||0)));p.cleared=!!raw.cleared;p.bossReward=!!raw.bossReward;p.best=Number(raw.best)>0?Number(raw.best):null;p.bestLevels=raw.bestLevels||null;p.muted=!!raw.muted;if(raw.run&&Number.isInteger(raw.run.cp)&&raw.run.cp>=0&&raw.run.cp<CHECKPOINTS.length){p.run={bossHp:normalizeBossHp(raw.run.bossHp),cp:raw.run.cp,collected:Array.isArray(raw.run.collected)?raw.run.collected.filter(x=>typeof x==='string'):[],dead:Array.isArray(raw.run.dead)?raw.run.dead.filter(x=>typeof x==='string'):[],activated:Array.isArray(raw.run.activated)?raw.run.activated.filter(x=>Number.isInteger(x)&&x>=0&&x<4):[],elapsed:Math.max(0,Number(raw.run.elapsed)||0),attemptSugar:Math.max(0,Number(raw.run.attemptSugar)||0)};}return p;}
export const overlap=(a,b)=>a.x<b.x+b.w&&a.x+a.w>b.x&&a.y<b.y+b.h&&a.y+a.h>b.y;
const seg=(x,y,w,h,type='book')=>({x,y,w,h,type});
export function makeWorld(){return {
solids:[seg(0,590,1150,180,'floor'),seg(1470,590,1730,180,'floor'),seg(3480,590,4420,180,'floor'),seg(440,530,115,60),seg(670,465,150,125),seg(1095,350,45,240,'wood'),seg(1140,350,385,30,'wood'),seg(1525,430,160,30),seg(2190,495,150,95),seg(2900,375,145,215,'block'),seg(3045,485,155,105),seg(3500,465,180,30),seg(3900,520,90,70),seg(4830,500,105,90),seg(5240,450,170,140),seg(5950,500,100,90),seg(6550,440,110,25,'wood'),seg(7330,440,110,25,'wood')],
paths:[{id:'table',points:[{x:1070,y:551},{x:1070,y:315},{x:1550,y:315}],slip:false},{id:'slip',points:[{x:2230,y:440},{x:2230,y:290},{x:2480,y:290}],slip:true}],
crate:{x:2730,y:535,w:74,h:55,start:2730},rope:{x:3330,y:175,length:285,angle:-.48,velocity:0},
heal:[{id:'h0',x:2450,y:563,zone:1},{id:'h1',x:6110,y:563,zone:2}],
sugar:[],enemies:[]};}
export function makeEnemy(id,type,x,zone,required=false){return {id,type,x,y:FLOOR,w:type==='fat'?78:type==='boss'?150:56,h:type==='fat'?92:type==='boss'?185:93,home:x,zone,required,hp:type==='boss'?14:type==='fat'?3:2,max:type==='boss'?14:type==='fat'?3:2,dir:-1,state:'walk',timer:0,stun:0,cool:1.2,dead:false,vy:0,boss:type==='boss'};}
const livingRoom = {
  chapter: 1,
  width: WORLD, checkpoints: CHECKPOINTS, areas: AREAS, makeWorld, bossHp: 14,
  bossReward: 45, bossTrigger: 6420, arenaLeft: 6390, arenaRight: 7580,
  bossMin: 6480, bossMax: 7440, crateMin: 2590, crateMax: 2826,
  requiredGate: 6150,
  sugar: [[220,490,7,46],[675,415,4,35],[1160,300,8,43],[1640,545,5,48],[2200,445,4,35],[2400,255,5,28],[2810,485,3,36],[2935,325,3,34],[3510,415,4,40],[3950,470,3,34],[4490,545,5,42],[5260,400,4,34],[5770,545,5,35],[6010,450,3,35]],
  enemies: () => [
    makeEnemy('normal0','normal',1740,0),makeEnemy('fat0','fat',2120,1),
    makeEnemy('thin0','thin',3910,2),makeEnemy('smart0','smart',5090,2),
    makeEnemy('thin1','thin',5640,2,true),makeEnemy('normal1','normal',5790,2,true),
    makeEnemy('boss','boss',7100,3,true),
  ],
  respawnX: x => x < 1450 ? 1040 : 3100,
};
export class Game{
constructor(profile=freshProfile(),emit=()=>{},stage=livingRoom){this.stage=stage;this.profile=profile;this.emit=emit;this.mode='menu';this.input={left:false,right:false,jump:false};this.world=this.stage.makeWorld();this.time=0;this.elapsed=0;this.pending=new Set();this.collected=new Set();this.enemies=[];this.shots=[];this.seeds=[];this.particles=[];this.cp=0;this.camera=0;this.bossIntro=false;this.bossActive=false;this.arena=false;this.tipSeen=new Set();this.p={x:110,y:530,w:42,h:60,vx:0,vy:0,dir:1,ground:false,hp:3,spit:100,shotTimer:0,regenWait:0,inv:0,climb:null,pathT:0,climbTime:0,rope:false,push:false,firePose:0,coyote:0,jumpBuffer:0};}
get progress(){return this.profile;}
bossHp(value){return typeof value==='number'&&Number.isFinite(value)?Math.max(this.stage.exitRequired?0:1,Math.min(this.stage.bossHp,Math.floor(value))):this.stage.bossHp;}
get maxHp(){return LEVELS.health[this.profile.levels.health];}get maxSpit(){return LEVELS.spit[this.profile.levels.spit];}get regen(){return LEVELS.regen[this.profile.levels.regen];}
notify(text){this.emit({type:'toast',text});}sound(name){this.emit({type:'sound',name});}
setup(){this.world=this.stage.makeWorld();let n=0;for(const [x,y,count,space]of this.stage.sugar)for(let i=0;i<count;i++)this.world.sugar.push({id:'s'+n++,x:x+i*space,y,value:1});this.enemies=this.stage.enemies();this.shots=[];this.seeds=[];this.healTaken=new Set();this.collected=new Set(this.progress.run?.collected||[]);this.pending.clear();for(const e of this.enemies){e.dead=(this.progress.run?.dead||[]).includes(e.id);if(e.boss){e.hp=this.bossHp(this.progress.run?.bossHp);e.dead=e.hp===0;}}this.bossActive=false;this.bossIntro=false;this.arena=false;}
start(resume=false){if(!this.profile.journey&&this.stage.chapter===1)this.profile.journey=newJourney();this.rememberBoss();if(!resume||!this.progress.run){const prior=this.progress.run;this.progress.run={bossHp:this.bossHp(prior?.bossHp),cp:0,collected:prior?.collected||[],dead:[],activated:[],elapsed:0,attemptSugar:prior?.attemptSugar||0};}this.setup();this.cp=this.progress.run.cp;this.elapsed=this.progress.run.elapsed;this.spawn();this.mode='playing';this.save();}
spawn(){const p=this.p,cp=this.stage.checkpoints[this.cp];Object.assign(p,{x:cp.x,y:cp.y-p.h,vx:0,vy:0,hp:this.maxHp,spit:this.maxSpit,ground:true,climb:null,rope:false,push:false,shotTimer:0,regenWait:0,inv:1,firePose:0,jumpBuffer:0});this.camera=Math.max(0,Math.min(this.stage.width-WIDTH,p.x-370));this.input={left:false,right:false,jump:false};}
save(){this.emit({type:'save'});}
commit(){this.profile.bank+=this.pending.size;this.progress.run.attemptSugar+=this.pending.size;for(const id of this.pending)this.collected.add(id);this.pending.clear();this.progress.run.collected=[...this.collected];}
checkpoint(index){if(index<=this.cp)return;this.commit();this.cp=index;this.progress.run.cp=index;this.progress.run.dead=this.enemies.filter(e=>e.dead).map(e=>e.id);this.progress.run.elapsed=this.elapsed;if(!this.progress.run.activated.includes(index)){this.progress.run.activated.push(index);this.p.hp=this.maxHp;this.p.spit=this.maxSpit;}this.save();this.notify('쉼터 도착 · 설탕 확정 · 체력 회복');this.sound('checkpoint');}
rememberBoss(){if(!this.progress.run)return;const boss=this.enemies.find(e=>e.boss);if(boss&&!boss.dead)this.progress.run.bossHp=Math.min(this.bossHp(this.progress.run.bossHp),this.bossHp(boss.hp));}
retry(){if(!this.progress.run)return;this.rememberBoss();this.save();const elapsed=this.elapsed;this.setup();this.elapsed=elapsed;this.spawn();this.mode='playing';this.notify(this.progress.run.bossHp===0?'경비가 쓰러진 상태예요. 오른쪽 출구로 가세요.':this.progress.run.bossHp<this.stage.bossHp?'다시 도전! 보스는 '+this.progress.run.bossHp+'회 더 맞히면 돼요.':'다시 한 걸음! 미확정 설탕은 원래 자리로 돌아갔어요.');}
restart(){this.start(false);this.notify('처음부터 출발! 확정한 설탕은 중복 배치되지 않아요.');}
jump(){const p=this.p;if(this.mode!=='playing')return;if(p.climb||p.rope){p.climb=null;p.rope=false;p.vy=-620;p.vx=p.dir*250;p.ground=false;p.coyote=0;p.jumpBuffer=0;this.sound('jump');return;}p.jumpBuffer=.12;this.tryJump();}
tryJump(){const p=this.p;if((p.ground||p.coyote>0)&&p.jumpBuffer>0){p.vy=-700;p.ground=false;p.coyote=0;p.jumpBuffer=0;p.push=false;this.sound('jump');}}
attack(){const p=this.p;if(this.mode!=='playing'||p.climb||p.rope||p.shotTimer>0||p.spit<25)return false;p.spit-=25;p.shotTimer=.4;p.regenWait=1;p.firePose=.25;this.shots.push({x:p.x+p.w/2+p.dir*35,y:p.y+23,vx:p.dir*660,left:240,r:7});this.sound('spit');return true;}
pathLength(path){let sum=0;for(let i=1;i<path.points.length;i++)sum+=Math.hypot(path.points[i].x-path.points[i-1].x,path.points[i].y-path.points[i-1].y);return sum;}
pointOn(path,t){let left=Math.max(0,Math.min(this.pathLength(path),t));for(let i=1;i<path.points.length;i++){const a=path.points[i-1],b=path.points[i],len=Math.hypot(b.x-a.x,b.y-a.y);if(left<=len)return {x:a.x+(b.x-a.x)*left/len,y:a.y+(b.y-a.y)*left/len,angle:Math.atan2(b.y-a.y,b.x-a.x)};left-=len;}return path.points.at(-1);}
antPose(){
  const {climb, pathT, dir, rope}=this.p;
  if(climb){
    // Use the tangent on the side of the corner the ant is moving into.
    const {angle}=this.pointOn(climb,pathT+dir*.001);
    return {rotation:angle??0,flip:dir<0};
  }
  const swing=rope?this.world.rope.velocity:0;
  return {rotation:0,flip:Math.abs(swing)>.02?swing<0:dir<0};
}
ropeTip(){const r=this.world.rope;return {x:r.x+Math.sin(r.angle)*r.length,y:r.y+Math.cos(r.angle)*r.length};}
getInteraction(){const p=this.p;if(p.rope)return {kind:'rope',label:'점프로 놓기'};if(p.push)return {kind:'crate',label:'놓기'};if(p.climb)return null;const c=this.world.crate;if(Math.abs(p.x+p.w/2-(c.x+c.w/2))<105&&Math.abs(p.y+p.h-(c.y+c.h))<45)return {kind:'crate',label:'밀기'};const tip=this.ropeTip();if(Math.hypot(p.x+p.w/2-tip.x,p.y+p.h/2-tip.y)<(this.stage.ropeReach??135))return {kind:'rope',label:'실밥 잡기'};for(const path of this.world.paths){if(this.detachLock>0&&path.slip)continue;for(let t=0;t<=this.pathLength(path);t+=12){const q=this.pointOn(path,t);if(Math.hypot(p.x+p.w/2-q.x,p.y+p.h/2-q.y)<62)return {kind:'path',label:path.slip?'미끄러운 벽':'붙기',path,t};}}return null;}
interact(){if(this.mode!=='playing')return;const p=this.p,i=this.getInteraction();if(!i)return;if(i.kind==='crate'){p.push=!p.push;this.notify(p.push?'← → 로 블록을 밀고 X로 놓으세요':'블록을 놓았어요');}if(i.kind==='rope'&&!p.rope){p.rope=true;p.ground=false;p.climb=null;this.sound('attach');}if(i.kind==='path'){p.climb=i.path;p.pathT=i.t;p.climbTime=0;p.ground=false;p.push=false;this.sound('attach');}}
hurt(amount=1){
  const p=this.p;
  if(p.inv>0||p.hp<=0||this.mode!=='playing')return;
  p.hp=Math.max(0,p.hp-amount);p.inv=1.3;p.climb=null;p.rope=false;p.push=false;p.vy=-260;p.vx=-p.dir*120;
  recordDamage(this.profile.journey,this.stage.chapter,p.hp===0);
  this.sound('hurt');
  if(p.hp===0){this.emit({type:'death'});this.onPlayerDefeat();}
  else this.save();
}
onPlayerDefeat(){this.retry();}
moveSpeed(dir,p){return dir*(p.push?110:245);}
recordBossHit(enemy){this.progress.run.bossHp=enemy.hp;this.save();}
onBossDefeated(){
  if(!this.stage.exitRequired){this.finish();return;}
  this.bossActive=false;this.arena=false;this.progress.run.bossHp=0;this.save();
  this.notify('경비가 길을 비켰어요. 오른쪽 문턱으로 가세요.');
}
finish(){if(this.mode!=='playing')return;this.commit();let bonus=0;if(!this.progress.bossReward){bonus=this.stage.bossReward;this.profile.bank+=bonus;this.progress.bossReward=bonus>0;}const gathered=this.progress.run.attemptSugar+bonus;this.progress.cleared=true;if(!this.progress.best||this.elapsed<this.progress.best){this.progress.best=this.elapsed;this.progress.bestLevels={...this.profile.levels};}this.progress.run=null;this.mode='result';this.bossActive=false;advanceJourney(this.profile,this.stage.chapter);this.save();this.sound('win');this.emit({type:'result',elapsed:this.elapsed,sugar:gathered,bonus});}
upgrade(key){if(this.mode!=='result'||!this.progress.cleared||!(key in this.profile.levels))return false;const level=this.profile.levels[key];if(level>=3||this.profile.bank<COSTS[level])return false;this.profile.bank-=COSTS[level];this.profile.levels[key]++;this.save();this.sound('checkpoint');return true;}
update(dt){if(this.mode!=='playing')return;dt=Math.min(.033,dt);this.time+=dt;this.elapsed+=dt;const p=this.p;this.detachLock=Math.max(0,(this.detachLock||0)-dt);p.inv=Math.max(0,p.inv-dt);p.shotTimer=Math.max(0,p.shotTimer-dt);p.firePose=Math.max(0,p.firePose-dt);p.regenWait=Math.max(0,p.regenWait-dt);p.jumpBuffer=Math.max(0,p.jumpBuffer-dt);if(!p.regenWait)p.spit=Math.min(this.maxSpit,p.spit+this.regen*dt);const dir=(this.input.right?1:0)-(this.input.left?1:0);if(dir)p.dir=dir;
const r=this.world.rope;if(!p.rope&&this.stage.ropeRest!==undefined){r.angle=this.stage.ropeRest;r.velocity=0;}else{r.velocity+=(-Math.sin(r.angle)*2+(p.rope?dir*2.8:0))*dt;r.velocity*=Math.exp(-.25*dt);r.angle+=r.velocity*dt;r.angle=Math.max(-.85,Math.min(.85,r.angle));if(Math.abs(r.angle)>=.85)r.velocity*=-.6;}
if(p.climb){p.climbTime+=dt;p.pathT=Math.max(0,Math.min(this.pathLength(p.climb),p.pathT+dir*145*dt));const q=this.pointOn(p.climb,p.pathT);p.x=q.x-p.w/2;p.y=q.y-p.h/2;p.vx=0;p.vy=0;if(p.climb.slip&&p.climbTime>2.6){p.climb=null;this.detachLock=1.5;p.vy=100;this.notify('미끄러워! 점프로 빠져나가세요.');}}
else if(p.rope){const q=this.ropeTip();p.x=q.x-p.w/2;p.y=q.y-p.h/2;p.vx=0;p.vy=0;}
else{p.coyote=p.ground?.1:Math.max(0,p.coyote-dt);this.tryJump();p.vx=this.moveSpeed(dir,p);const c=this.world.crate;if(p.push){if(Math.abs(p.x+p.w/2-c.x-c.w/2)>125)p.push=false;else c.x=Math.max(this.stage.crateMin,Math.min(this.stage.crateMax,c.x+p.vx*dt));}const solids=[...this.world.solids,c];if(this.enemies.some(e=>e.required&&!e.boss&&!e.dead)&&p.x>this.stage.requiredGate-750)solids.push({x:this.stage.requiredGate,y:240,w:24,h:350});if(this.arena){solids.push({x:this.stage.arenaLeft,y:100,w:20,h:490});if(!this.enemies.find(e=>e.boss).dead)solids.push({x:this.stage.arenaRight,y:100,w:20,h:490});}p.x+=p.vx*dt;for(const s of solids)if(overlap(p,s)){if(p.vx>0)p.x=s.x-p.w;else if(p.vx<0)p.x=s.x+s.w;}p.x=Math.max(0,Math.min(this.stage.width-p.w,p.x));if(!this.input.jump&&p.vy< -200)p.vy+=1700*dt;p.vy+=1400*dt;const oldY=p.y;p.y+=p.vy*dt;p.ground=false;for(const s of solids)if(overlap(p,s)){if(p.vy>=0&&oldY+p.h<=s.y+8){p.y=s.y-p.h;p.vy=0;p.ground=true;}else if(p.vy<0&&oldY>=s.y+s.h-8){p.y=s.y+s.h;p.vy=0;}}if(p.y>820){const lethal=p.hp<=1&&p.inv<=0;this.hurt();if(!lethal){p.x=this.stage.respawnX(p.x);p.y=FLOOR-p.h;p.vy=0;p.inv=1.3;}}}
for(const item of this.world.sugar)if(!this.collected.has(item.id)&&!this.pending.has(item.id)&&Math.hypot(p.x+p.w/2-item.x,p.y+p.h/2-item.y)<46){this.pending.add(item.id);this.sound('sugar');this.emit({type:'spark',x:item.x,y:item.y});}
for(const item of this.world.heal)if(!this.healTaken.has(item.id)&&p.hp<this.maxHp&&Math.hypot(p.x+p.w/2-item.x,p.y+p.h/2-item.y)<45){p.hp++;this.healTaken.add(item.id);this.sound('heal');this.notify('꿀방울 · 하트 +1');}
for(let i=1;i<this.stage.checkpoints.length;i++)if(i>this.cp&&p.x>=this.stage.checkpoints[i].x&&p.ground)this.checkpoint(i);
if(p.x>this.stage.bossTrigger&&!this.bossIntro&&!this.enemies.find(e=>e.boss).dead){this.bossIntro=true;this.arena=true;this.bossActive=true;this.emit({type:'boss-intro'});}
this.updateEnemies(dt);this.updateProjectiles(dt);this.updateHazards(dt);
if(this.stage.exitRequired&&p.x>=this.stage.exitRequired&&this.enemies.find(e=>e.boss).dead)this.finish();
this.camera+=(Math.max(0,Math.min(this.stage.width-WIDTH,p.x-380))-this.camera)*Math.min(1,dt*6);
}
updateHazards(){const p=this.p;if(p.x>4240&&p.x<4700){const phase=this.time%4.4;if(phase>2.25&&phase<2.6&&p.ground)this.hurt();}}
updateBoss(e,dt,dx){let speed=0;const fast=e.hp<=e.max/2?1.15:1;if(e.state==='walk'&&e.cool<=0){e.state='warn';e.timer=.85;e.dir=dx>0?1:-1;e.pattern=(e.pattern||0)+1;}if(e.state==='warn'){e.timer-=dt;if(e.timer<=0){e.state=e.pattern%2?'charge':'slam';e.timer=e.state==='charge'?1.1:.8;this.sound('boss');}}else if(e.state==='charge'){speed=e.dir*370*fast;e.timer-=dt;if(e.timer<=0){e.state='rest';e.timer=1.5;}}else if(e.state==='slam'){e.timer-=dt;e.y=FLOOR-Math.sin(Math.max(0,e.timer/.8)*Math.PI)*140;if(e.timer<=0){e.y=FLOOR;e.state='rest';e.timer=1.5;}}else if(e.state==='rest'){e.timer-=dt;if(e.timer<=0){e.state='walk';e.cool=.65;}}else if(e.state==='walk')speed=Math.sign(dx)*45;e.x=Math.max(this.stage.bossMin,Math.min(this.stage.bossMax-e.w,e.x+speed*dt));}
updateEnemies(dt){const p=this.p;for(const e of this.enemies){if(e.dead||Math.abs(e.x-p.x)>1000||e.boss&&!this.bossActive)continue;e.stun=Math.max(0,e.stun-dt);e.cool-=dt;if(e.stun>0)continue;const dx=p.x-e.x;let speed=0;if(e.boss){this.updateBoss(e,dt,dx);}
else if(e.type==='smart'){if(e.cool<=0&&Math.abs(dx)<550){if(e.state!=='aim'){e.state='aim';e.timer=.85;e.dir=Math.sign(dx)||-1;}else{e.timer-=dt;if(e.timer<=0){this.seeds.push({x:e.x+e.w/2,y:e.y-55,vx:e.dir*290,vy:0,left:700});e.cool=2.5;e.state='walk';}}}}
else if(e.type==='fat'){if(e.state==='charge'){speed=e.dir*230;e.timer-=dt;if(e.timer<=0){e.state='rest';e.cool=1.2;}}else if(e.state==='warn'){e.timer-=dt;if(e.timer<=0){e.state='charge';e.timer=.6;}}else if(Math.abs(dx)<330&&e.cool<=0){e.dir=Math.sign(dx)||-1;e.state='warn';e.timer=.8;}else{speed=Math.sign(dx)*23;if(e.cool<=0)e.state='walk';}}
else{const range=e.type==='thin'?240:130;e.dir=e.x>e.home+range?-1:e.x<e.home-range?1:e.dir;speed=e.dir*(e.type==='thin'?115:48);}if(!e.boss)e.x+=speed*dt;
if(overlap(p,{x:e.x+8,y:e.y-e.h+28,w:e.w-16,h:e.h-28}))this.hurt();}}
updateProjectiles(dt){for(const shot of this.shots){const d=Math.abs(shot.vx*dt);shot.x+=shot.vx*dt;shot.left-=d;for(const e of this.enemies)if(!e.dead&&(!e.boss||this.bossActive)&&shot.x>e.x&&shot.x<e.x+e.w&&shot.y>e.y-e.h+15&&shot.y<e.y){e.hp--;if(e.boss&&e.hp>0)this.recordBossHit(e);if(!e.boss)e.stun=.3;shot.left=0;this.sound('hit');this.emit({type:'spark',x:shot.x,y:shot.y});if(e.hp<=0){e.dead=true;this.sound('defeat');if(e.boss){this.onBossDefeated();if(this.mode!=='playing')return;}}break;}for(const s of [...this.world.solids,this.world.crate])if(shot.x>s.x&&shot.x<s.x+s.w&&shot.y>s.y&&shot.y<s.y+s.h)shot.left=0;}this.shots=this.shots.filter(s=>s.left>0);for(const s of this.seeds){s.x+=s.vx*dt;s.left-=Math.abs(s.vx*dt);for(const block of [...this.world.solids,this.world.crate])if(s.x>block.x&&s.x<block.x+block.w&&s.y>block.y&&s.y<block.y+block.h)s.left=0;if(s.left>0&&overlap(this.p,{x:s.x-7,y:s.y-7,w:14,h:14})){this.hurt();s.left=0;}}this.seeds=this.seeds.filter(s=>s.left>0);}
}
