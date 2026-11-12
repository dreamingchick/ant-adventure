// Chapter 02 is intentionally isolated from the Chapter 01 save schema.
export const W=960,H=540,FLOOR=445,LEVEL_END=5400;
export const CHECKS=[90,1880,3700];
export const PLATFORMS=[
{x:0,y:FLOOR,w:950,h:95},{x:1110,y:FLOOR,w:1280,h:95},{x:2510,y:FLOOR,w:1150,h:95},{x:3830,y:FLOOR,w:1570,h:95},
{x:420,y:364,w:195,h:24},{x:690,y:320,w:115,h:24},{x:1400,y:350,w:215,h:24},{x:2050,y:360,w:160,h:24},
{x:2790,y:357,w:195,h:24},{x:3270,y:330,w:175,h:24},{x:4040,y:344,w:170,h:24},{x:4520,y:350,w:190,h:24}];
export const HAZARDS=[{x:790,w:110},{x:2250,w:110},{x:3520,w:120},{x:4730,w:105}];
const ENEMY_SEEDS=[{id:'crumb',x:1550,hp:2,kind:'normal'},{id:'scout',x:3100,hp:2,kind:'thin'},{id:'guard',x:4700,hp:6,kind:'fat'}];
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const hit=(a,b)=>a.x<b.x+b.w&&a.x+a.w>b.x&&a.y<b.y+b.h&&a.y+a.h>b.y;
export function cleanStage2(data){const d=data&&typeof data==='object'?data:{};return {cleared:!!d.cleared,best:Number.isFinite(d.best)&&d.best>0?d.best:null,checkpoint:CHECKS.includes(d.checkpoint)?d.checkpoint:90,dead:Array.isArray(d.dead)?d.dead.filter(v=>ENEMY_SEEDS.some(e=>e.id===v)):[],elapsed:Math.max(0,Math.min(86400,Number(d.elapsed)||0))};}
export class KitchenGame{
 constructor(data={},emit=()=>{}){this.data=cleanStage2(data);this.emit=emit;this.mode='ready';this.input={left:false,right:false,jump:false};this.enemies=[];this.shots=[];this.elapsed=0;this.camera=0;this.p={x:90,y:FLOOR-42,w:34,h:42,vx:0,vy:0,hp:3,dir:1,ground:true,inv:0,shotCooldown:0};this.reset();}
 reset(){this.enemies=ENEMY_SEEDS.map(e=>({...e,start:e.x,top:FLOOR-60,w:e.kind==='fat'?76:48,h:e.kind==='fat'?74:60,maxHp:e.hp,dead:this.data.dead.includes(e.id),direction:-1,attackClock:1.5}));this.shots=[];this.p.x=this.data.checkpoint;this.p.y=FLOOR-this.p.h;this.p.vx=0;this.p.vy=0;this.p.hp=3;this.p.ground=true;this.p.inv=1;this.p.shotCooldown=0;this.camera=clamp(this.p.x-270,0,LEVEL_END-W);this.elapsed=this.data.elapsed;this.mode='playing';this.emit({type:'save',data:this.data});}
 jump(){if(this.mode!=='playing'||!this.p.ground)return false;this.p.vy=-570;this.p.ground=false;return true;}
 attack(){if(this.mode!=='playing'||this.p.shotCooldown>0)return false;this.p.shotCooldown=.48;this.shots.push({x:this.p.x+this.p.w/2+this.p.dir*25,y:this.p.y+21,vx:this.p.dir*660,life:.42});return true;}
 damage(){if(this.p.inv>0||this.mode!=='playing')return;this.p.hp--;this.p.inv=1.2;this.p.vy=-230;if(this.p.hp<=0){this.emit({type:'defeat'});this.reset();}}
 tick(dt){if(this.mode!=='playing')return;dt=Math.min(.034,Math.max(0,dt));this.elapsed+=dt;const p=this.p;p.inv=Math.max(0,p.inv-dt);p.shotCooldown=Math.max(0,p.shotCooldown-dt);let axis=(this.input.right?1:0)-(this.input.left?1:0);if(axis)p.dir=axis;p.vx=axis*240;
 const oldBottom=p.y+p.h;p.x=clamp(p.x+p.vx*dt,0,LEVEL_END-p.w);p.vy+=1350*dt;p.y+=p.vy*dt;p.ground=false;
 if(p.vy>=0)for(const s of PLATFORMS)if(p.x+p.w>s.x&&p.x<s.x+s.w&&oldBottom<=s.y+7&&p.y+p.h>=s.y&&p.y<s.y){p.y=s.y-p.h;p.vy=0;p.ground=true;break;}
 for(const h of HAZARDS)if(p.ground&&p.x+p.w>h.x&&p.x<h.x+h.w)this.damage();
 if(p.y>H+130){this.emit({type:'defeat'});this.reset();return;}
 for(const s of this.shots){s.x+=s.vx*dt;s.life-=dt;for(const e of this.enemies){if(e.dead)continue;if(hit({x:s.x-4,y:s.y-4,w:8,h:8},{x:e.x,y:FLOOR-e.h,w:e.w,h:e.h})){e.hp--;s.life=0;if(e.hp<=0){e.dead=true;this.data.dead.push(e.id);this.emit({type:'save',data:this.data});}break;}}}
 this.shots=this.shots.filter(s=>s.life>0&&s.x>=0&&s.x<=LEVEL_END);
 for(const e of this.enemies){if(e.dead)continue;const dx=p.x-e.x;if(Math.abs(dx)>570)continue;if(e.kind==='thin')e.x=clamp(e.x+(Math.sign(dx)||e.direction)*90*dt,e.start-100,e.start+100);if(e.kind==='normal')e.x=e.start+Math.sin(this.elapsed*1.6)*75;
 if(hit(p,{x:e.x+4,y:FLOOR-e.h,w:e.w-8,h:e.h}))this.damage();}
 for(const cp of CHECKS)if(cp>this.data.checkpoint&&p.x>=cp){this.data.checkpoint=cp;this.data.dead=this.enemies.filter(e=>e.dead).map(e=>e.id);this.data.elapsed=this.elapsed;this.emit({type:'checkpoint',data:this.data});this.emit({type:'save',data:this.data});}
 if(p.x>=LEVEL_END-120&&this.enemies.find(e=>e.id==='guard').dead){this.mode='complete';this.data.cleared=true;this.data.best=Math.min(this.data.best||Infinity,this.elapsed);this.data.elapsed=0;this.emit({type:'complete',data:this.data});this.emit({type:'save',data:this.data});}
 this.camera+=(clamp(p.x-270,0,LEVEL_END-W)-this.camera)*Math.min(1,dt*7);
 }
}
