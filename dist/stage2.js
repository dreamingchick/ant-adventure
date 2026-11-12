import {KitchenGame,W,H,FLOOR,LEVEL_END,PLATFORMS,HAZARDS,CHECKS} from './stage2-engine.js';
const $=s=>document.querySelector(s),canvas=$('#canvas'),ctx=canvas.getContext('2d');
const KEY='ant-adventure-stage2-v1',PARENT='ant-adventure-save-v1',HUB='https://garu-arcade-hub.snugbrink3.chatgpt.site/';
let unlocked=false;try{unlocked=JSON.parse(localStorage.getItem(PARENT))?.cleared===true;}catch{}
let saved={};try{saved=JSON.parse(localStorage.getItem(KEY))||{};}catch{}
const ant=new Image(),grass=new Image();ant.src='assets/ant-original.webp';grass.src='assets/grasshoppers.webp';
let toastTimeout=0,last=0,mode='intro';
const g=new KitchenGame(saved,e=>{if(e.type==='save')try{localStorage.setItem(KEY,JSON.stringify(e.data));}catch{}if(e.type==='checkpoint')toast('쉼터 도착 · 진행 저장');if(e.type==='defeat')toast('다시 도전! 체크포인트에서 시작합니다.');if(e.type==='complete')show('complete');});
function toast(t){$('#toast').textContent=t;$('#toast').classList.add('show');clearTimeout(toastTimeout);toastTimeout=setTimeout(()=>$('#toast').classList.remove('show'),2000);}
const format=t=>String(Math.floor(t/60)).padStart(2,'0')+':'+String(Math.floor(t%60)).padStart(2,'0');
function fit(){const v=window.visualViewport,width=v?.width||innerWidth,height=v?.height||innerHeight;const rotate=height>width;const scale=Math.min((rotate?height:width)/W,(rotate?width:height)/H);const stage=$('#stage');stage.style.transform='rotate('+(rotate?90:0)+'deg) scale('+scale+')';stage.style.visibility='visible';}
for(const ev of ['resize','orientationchange','pageshow'])addEventListener(ev,fit);window.visualViewport?.addEventListener('resize',fit);fit();
const buttons=[...document.querySelectorAll('[data-key]')];
function clear(){g.input.left=false;g.input.right=false;g.input.jump=false;for(const b of buttons)b.classList.remove('held');}
function input(k,down){if(mode!=='play')return;if(k==='left'||k==='right')g.input[k]=down;if(k==='jump'){g.input.jump=down;if(down)g.jump();}if(k==='attack'&&down)g.attack();}
for(const b of buttons){b.addEventListener('pointerdown',e=>{e.preventDefault();b.setPointerCapture(e.pointerId);b.classList.add('held');input(b.dataset.key,true);});for(const type of ['pointerup','pointercancel','lostpointercapture'])b.addEventListener(type,e=>{e.preventDefault();b.classList.remove('held');input(b.dataset.key,false);});}
const mappings={ArrowLeft:'left',ArrowRight:'right',KeyA:'left',KeyD:'right',Space:'jump',KeyZ:'attack'};
addEventListener('keydown',e=>{const k=mappings[e.code];if(k){e.preventDefault();if(!e.repeat)input(k,true);}else if(e.code==='Escape'){e.preventDefault();if(mode==='play')show('pause');else if(mode==='pause')resume();}});
addEventListener('keyup',e=>{const k=mappings[e.code];if(k){e.preventDefault();input(k,false);}});
addEventListener('blur',clear);
document.addEventListener('visibilitychange',()=>{if(document.hidden&&mode==='play')show('pause');});
function action(name,fn){const b=document.createElement('button');b.textContent=name;b.onclick=fn;$('#actions').append(b);}
function show(type){mode=type;clear();g.mode=type==='play'?'playing':type==='complete'?'complete':'paused';$('#modal').hidden=false;$('#actions').replaceChildren();const heading=$('#heading'),desc=$('#description');
 if(type==='locked'){heading.textContent='제1장을 먼저 완료해 주세요';desc.textContent='거실의 베짱이 대장을 물리친 뒤 부엌으로 향할 수 있습니다.';action('거실로 돌아가기',()=>location.assign('./index.html'));return;}
 if(type==='intro'){heading.textContent='제2장 · 부엌으로 가는 길';desc.textContent='거실 밖은 부엌의 문턱. 흩어진 과자 부스러기와 베짱이 정찰대 사이를 지나 개미굴로 향하세요. 세 번째 쉼터 뒤에는 길목 경비가 기다립니다.';action('제2장 출발',resume);action('거실로 돌아가기',()=>location.assign('./index.html'));return;}
 if(type==='pause'){heading.textContent='잠시 쉬어갑니다';desc.textContent='체크포인트에 도착하면 진행 위치와 쓰러뜨린 베짱이가 저장됩니다.';action('계속하기',resume);action('체크포인트 재시작',()=>{g.reset();resume();});action('거실로 돌아가기',()=>location.assign('./index.html'));return;}
 if(type==='complete'){heading.textContent='제2장 완료!';desc.textContent='부엌의 경비를 통과했습니다. 기록 '+format(g.elapsed)+' · 제3장은 추후 개방됩니다.';action('다시 도전',()=>{g.data.checkpoint=90;g.data.dead=[];g.data.elapsed=0;g.reset();resume();});action('거실로 돌아가기',()=>location.assign('./index.html'));action('가루 오락실 대문',()=>location.assign(HUB));}
}
function resume(){mode='play';g.mode='playing';$('#modal').hidden=true;clear();}
$('#pause').onclick=()=>{if(mode==='play')show('pause');else if(mode==='pause')resume();};
if(!unlocked)show('locked');else if(g.data.cleared)show('complete');else show('intro');
function cell(img,col,row,cols,rows,x,y,w,h,flip=false){if(!img.complete||!img.naturalWidth)return;ctx.save();ctx.translate(x+w/2,y+h/2);ctx.scale(flip?-1:1,1);ctx.drawImage(img,col*img.naturalWidth/cols,row*img.naturalHeight/rows,img.naturalWidth/cols,img.naturalHeight/rows,-w/2,-h/2,w,h);ctx.restore();}
function draw(){const t=g.elapsed;ctx.clearRect(0,0,W,H);const sky=ctx.createLinearGradient(0,0,0,H);sky.addColorStop(0,'#b5d3c4');sky.addColorStop(1,'#f7dbaf');ctx.fillStyle=sky;ctx.fillRect(0,0,W,H);
 // Kitchen silhouettes, parallax cabinets and an oversized counter.
 ctx.save();ctx.translate(-g.camera*.2,0);for(let i=0;i<14;i++){const x=i*450-220;ctx.fillStyle=i%2?'#829d83':'#96a990';ctx.fillRect(x,-40,390,295);ctx.fillStyle='#e7ddbd';ctx.fillRect(x+18,12,356,202);ctx.fillStyle='#bcaa88';ctx.fillRect(x+22,210,348,14);ctx.fillStyle='#647c6c';ctx.fillRect(x+185,85,10,110);ctx.fillStyle='#e2b87b';ctx.fillRect(x+105,85,75,14);}ctx.restore();
 ctx.save();ctx.translate(-g.camera,0);
 for(const s of PLATFORMS){ctx.fillStyle=s.y===FLOOR?'#b88d67':'#9b6b49';ctx.fillRect(s.x,s.y,s.w,s.h);ctx.fillStyle=s.y===FLOOR?'#efcf9b':'#dcba81';ctx.fillRect(s.x,s.y,s.w,13);}
 for(const h of HAZARDS){ctx.fillStyle='#7d4938';for(let x=h.x;x<h.x+h.w;x+=18){ctx.beginPath();ctx.moveTo(x,FLOOR);ctx.lineTo(x+9,FLOOR-23);ctx.lineTo(x+18,FLOOR);ctx.fill();}}
 for(const cp of CHECKS.slice(1)){ctx.fillStyle=cp<=g.data.checkpoint?'#5b9d67':'#b5a273';ctx.fillRect(cp,FLOOR-100,7,100);ctx.beginPath();ctx.moveTo(cp+7,FLOOR-100);ctx.lineTo(cp+67,FLOOR-85);ctx.lineTo(cp+7,FLOOR-70);ctx.fill();}
 ctx.fillStyle='#435f45';ctx.fillRect(LEVEL_END-105,FLOOR-180,65,180);ctx.fillStyle='#fff2bd';ctx.font='bold 18px system-ui';ctx.fillText('출구',LEVEL_END-110,FLOOR-200);
 for(const e of g.enemies){if(e.dead)continue;const row=e.kind==='thin'?0:e.kind==='fat'?0:1,col=e.kind==='thin'?1:0;cell(grass,col,row,2,2,e.x-15,FLOOR-e.h-30,e.w+30,e.h+36,e.direction>0);ctx.fillStyle='#40543f';ctx.fillRect(e.x,FLOOR-e.h-13,e.w,7);ctx.fillStyle='#cce98d';ctx.fillRect(e.x,FLOOR-e.h-13,e.w*e.hp/e.maxHp,7);}
 for(const s of g.shots){ctx.fillStyle='#e7fff0';ctx.beginPath();ctx.ellipse(s.x,s.y,9,6,0,0,Math.PI*2);ctx.fill();}
 const p=g.p;if(p.inv>0&&Math.floor(p.inv*12)%2)ctx.globalAlpha=.45;cell(ant,p.shotCooldown>.26?1:0,Math.abs(p.vx)>10?Math.floor(t*10)%2:0,2,2,p.x-28,p.y-30,94,98,p.dir<0);ctx.globalAlpha=1;ctx.restore();
 $('#hearts').textContent='♥'.repeat(Math.max(0,p.hp))+'♡'.repeat(Math.max(0,3-p.hp));$('#clock').textContent=format(g.elapsed);
}
function loop(now){const dt=last?Math.min(.05,(now-last)/1000):.016;last=now;g.tick(dt);draw();requestAnimationFrame(loop);}requestAnimationFrame(loop);
