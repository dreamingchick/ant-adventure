import {initPwa} from './pwa.js';
import {mountNameKeyboard} from './name-keyboard.js';
import {mountViewport} from './viewport.js';
import {Game,freshProfile,sanitize,WIDTH,HEIGHT,FLOOR,COSTS,LEVELS} from './engine.js?v=0.3.2';
import {KitchenGame,cleanStage2} from './stage2-engine.js?v=0.3.2';
import {drawKitchenBackdrop,drawKitchenDetails} from './stage2-view.js?v=0.3.2';
import {createProfileStore} from './profile-store.js';
const $=s=>document.querySelector(s),canvas=$('#game'),ctx=canvas.getContext('2d');
const params=new URLSearchParams(location.search);
const reviewHost=['ant-adventure-chapter-review.snugbrink3.chatgpt.site','localhost','127.0.0.1'].includes(location.hostname);
const review=reviewHost&&['climb','wet','kitchen','boss1','boss2','chapter1'].includes(params.get('review')) ? params.get('review') : null;
const kitchenChapter=params.get('chapter')==='2'||review==='kitchen'||review==='boss2';
const SAVE_KEY=review ? 'ant-adventure-review-v1-'+review : 'ant-adventure-save-v1';
let profile,store;
try{
  store=createProfileStore(localStorage,SAVE_KEY,navigator.locks);
  const raw=JSON.parse(store.initial);
  profile=sanitize(raw);
  if(raw?.chapter2)profile.chapter2=cleanStage2(raw.chapter2);
}catch{profile=freshProfile();}
if(review==='kitchen'||review==='boss2')profile.cleared=true;
let toastTimer,dialogDone=()=>{},lines=[],lineIndex=0,helpReturn='menu',last=0,frame=0,particles=[],audio=null,musicTimer=0,note=0,saveWarning=false;
const images={};for(const [key,path]of Object.entries({ant:'ant-original.webp',room:'living-room.webp',kitchen:'kitchen.webp',grass:'grasshoppers.webp'})){const im=new Image();im.src='assets/'+path;images[key]=im;}
async function persist(){
  const saved=await store?.save(profile);
  if(!saved&&!saveWarning){
    toast('저장할 수 없어요. 다른 탭을 닫고 새로고침하거나 저장 설정을 확인해 주세요.');
    saveWarning=true;
  }
  return saved;
}
async function navigate(path){
  if(!store||await store.flush())location.assign(path);
}
function toast(text){$('#toast').textContent=text;$('#toast').classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('#toast').classList.remove('show'),2900);}
function unlockAudio(){if(!audio)try{audio=new(window.AudioContext||window.webkitAudioContext)();}catch{}if(audio?.state==='suspended')audio.resume().catch(()=>{});}
function tone(freq,duration=.12,type='sine',volume=.06,slide=0){if(!audio||profile.muted)return;const o=audio.createOscillator(),gain=audio.createGain();o.type=type;o.frequency.setValueAtTime(freq,audio.currentTime);if(slide)o.frequency.exponentialRampToValueAtTime(Math.max(20,slide),audio.currentTime+duration);gain.gain.setValueAtTime(volume,audio.currentTime);gain.gain.exponentialRampToValueAtTime(.001,audio.currentTime+duration);o.connect(gain).connect(audio.destination);o.start();o.stop(audio.currentTime+duration);}
function sound(name){const sounds={jump:[380,.16,'sine',.05,720],spit:[320,.09,'triangle',.12,110],hit:[560,.09,'triangle',.05,210],sugar:[1050,.1,'sine',.025,1500],hurt:[210,.24,'sawtooth',.04,70],defeat:[200,.18,'triangle',.05,80],boss:[95,.3,'triangle',.06,65],attach:[490,.08,'sine',.04,680],heal:[660,.28,'sine',.05,1320],checkpoint:[660,.4,'sine',.05,990],win:[523,.6,'sine',.07,1046]};tone(...(sounds[name]||sounds.sugar));}
const GameType=kitchenChapter?KitchenGame:Game;
const game=new GameType(profile,event=>{if(event.type==='save')persist();if(event.type==='toast')toast(event.text);if(event.type==='sound')sound(event.name);if(event.type==='spark')for(let i=0;i<8;i++)particles.push({x:event.x,y:event.y,vx:(Math.random()-.5)*150,vy:-Math.random()*130,life:.5,color:'#fff1b5'});if(event.type==='death')for(let i=0;i<10;i++)particles.push({x:game.p.x,y:game.p.y,vx:(Math.random()-.5)*180,vy:-Math.random()*170,life:.7,color:'#f5ad91'});if(event.type==='boss-intro')dialog(kitchenChapter?[
  ['길목 경비','거실 문을 통과했다고? 여기서 한 번 더 멈춰!'],
  [profile.name,'난 개미굴로 가는 길을 찾고 있다고!'],
  ['안내','침을 '+game.stage.bossHp+'번 맞히세요. 착지 표시에서 벗어나고 바닥 충격파는 점프로 넘으세요.'],
]:[['베짱이 대장','네가 우리 애들한테 침 뱉고 다닌다는 그 개미냐?'],[profile.name,'다닌다니. 나도 지금 길을 잃었거든.'],['베짱이 대장','이 문을 지나려면, 나부터 넘어 봐라!'],['안내','침 공격을 14번 명중시키면 승리합니다. 재도전해도 대장이 받은 피해는 유지됩니다.']],()=>{game.mode='playing';});if(event.type==='result'){
  if(kitchenChapter){
    clearInputs();
    $('#controls').hidden=true;
    $('#hint').hidden=true;
    $('#boss-hud').hidden=true;
    dialog([['길목 경비','개미굴 찾는 거면, 문턱 아래 바람 나는 쪽으로 가.'],[profile.name,'길을 묻는 게 이렇게 힘들 줄이야.']],()=>{
      game.mode='result';result(event);
    });
  }else result(event);
}});
const viewport=mountViewport({host:$('#viewport'),stage:$('#stage'),onResize:clearInputs});
function clearInputs(){game.input.left=false;game.input.right=false;game.input.jump=false;for(const b of document.querySelectorAll('[data-action]'))b.classList.remove('down');}
function press(action){unlockAudio();if(game.mode!=='playing')return;if(action==='left'||action==='right')game.input[action]=true;if(action==='jump'){game.input.jump=true;game.jump();}if(action==='attack')game.attack();if(action==='interact')game.interact();}
function release(action){if(action==='left'||action==='right'||action==='jump')game.input[action]=false;}
for(const b of document.querySelectorAll('[data-action]')){b.addEventListener('pointerdown',e=>{e.preventDefault();b.setPointerCapture(e.pointerId);b.classList.add('down');press(b.dataset.action);});for(const ev of ['pointerup','pointercancel','lostpointercapture'])b.addEventListener(ev,e=>{e.preventDefault();b.classList.remove('down');release(b.dataset.action);});}
const keys={ArrowLeft:'left',ArrowRight:'right',Space:'jump',KeyZ:'attack',KeyX:'interact',KeyA:'left',KeyD:'right'};
addEventListener('keydown',e=>{if(e.target instanceof HTMLInputElement)return;if(e.code==='Escape'){e.preventDefault();if(game.mode==='playing')pause();else if(game.mode==='paused')resume();return;}if(game.mode==='dialog'&&(e.code==='Space'||e.code==='Enter')){e.preventDefault();if(!e.repeat)nextDialog();return;}if(keys[e.code]){e.preventDefault();if(!e.repeat)press(keys[e.code]);}});addEventListener('keyup',e=>{if(keys[e.code]){release(keys[e.code]);if(!(e.target instanceof HTMLInputElement))e.preventDefault();}});
function showPlay(){for(const id of ['menu','pause-menu','result','help'])$('#'+id).hidden=true;$('#hud').hidden=false;$('#controls').hidden=false;$('#hint').hidden=false;clearInputs();}
function start(resumeRun=false){
  document.activeElement?.blur();unlockAudio();
  profile.name=$('#ant-name').value.trim().slice(0,12)||profile.name||'개미';
  showPlay();game.start(resumeRun);
  if(resumeRun)return;
  if(kitchenChapter)dialog([[profile.name,'문은 열렸고…… 저 실밥은 어디로 이어지지?']],()=>{game.mode='playing';});
  else if(!profile.cleared)dialog([[profile.name,'퉷! 챠챠, 여기까지 따라와 보시…… 어?'],[profile.name,'러그가 움직였잖아! ……우리 집이 어느 쪽이더라?'],[profile.name,'일단 오른쪽으로 가 보자. 작은 몸이라고 못 갈 곳은 없지!']],()=>{game.mode='playing';});
}
function dialog(items,done){game.mode='dialog';clearInputs();lines=items;lineIndex=0;dialogDone=done;$('#dialog').hidden=false;renderDialog();}
function renderDialog(){$('#speaker').textContent=lines[lineIndex][0];$('#dialog-text').textContent=lines[lineIndex][1];$('#dialog-next').textContent=lineIndex===lines.length-1?(kitchenChapter&&game.progress.cleared&&!game.progress.run?'결과 보기 →':'출발! →'):'계속 →';}
function nextDialog(){lineIndex++;if(lineIndex>=lines.length){$('#dialog').hidden=true;clearInputs();dialogDone();}else renderDialog();}
function pause(){if(game.mode!=='playing')return;game.mode='paused';clearInputs();$('#pause-name').value=profile.name;$('#sound').textContent=profile.muted?'소리 꺼짐 ♫':'소리 켜짐 ♪';$('#pause-menu').hidden=false;}
function resume(){$('#pause-menu').hidden=true;game.mode='playing';clearInputs();}
function home(){clearInputs();game.mode='menu';for(const id of ['pause-menu','result','dialog','help','hud','controls','hint','boss-hud'])$('#'+id).hidden=true;$('#menu').hidden=false;$('#review-chapters').hidden=!reviewHost;$('#ant-name').value=profile.name;$('#continue').hidden=!profile.run;$('#chapter-02-menu').hidden=!profile.cleared;$('#start').textContent=profile.run?'처음부터 모험하기 →':'모험 시작 →';$('#best-label').textContent=profile.best?'최고 기록 '+time(profile.best):'첫 발자국을 남겨 보세요';}
const enterKitchen=()=>navigate('./?chapter=2');
for(const button of document.querySelectorAll('[data-review-chapter]')){
  button.onclick=()=>navigate('./?review='+button.dataset.reviewChapter);
}
$('#chapter-02').onclick=enterKitchen;$('#chapter-02-menu').onclick=enterKitchen;$('#start').onclick=()=>{if(profile.run){if(!confirm('미확정 진행을 포기하고 처음부터 출발할까요? 확정 설탕과 강화는 유지됩니다.'))return;}start(false);};$('#continue').onclick=()=>start(true);$('#pause').onclick=pause;$('#resume').onclick=resume;$('#dialog-next').onclick=nextDialog;$('#dialog-skip').onclick=()=>{$('#dialog').hidden=true;clearInputs();dialogDone();};$('#checkpoint-retry').onclick=()=>{$('#pause-menu').hidden=true;game.retry();};$('#restart').onclick=()=>{if(confirm('현재 구간의 미확정 설탕을 되돌리고 처음부터 출발할까요?')){$('#pause-menu').hidden=true;game.restart();}};const returnHome=()=>kitchenChapter||review?navigate('./'):home();$('#home').onclick=returnHome;$('#result-home').onclick=returnHome;$('#replay').onclick=()=>{showPlay();game.start(false);};$('#help-open').onclick=()=>{helpReturn=game.mode;$('#help').hidden=false;};$('#help-close').onclick=()=>{$('#help').hidden=true;game.mode=helpReturn;};$('#sound').onclick=()=>{profile.muted=!profile.muted;persist();$('#sound').textContent=profile.muted?'소리 꺼짐 ♫':'소리 켜짐 ♪';};function rename(input){profile.name=$(input).value.trim().slice(0,12)||'개미';$(input).blur();$('#ant-name').value=profile.name;persist();toast('이름을 '+profile.name+'(으)로 바꿨어요.');}$('#rename').onclick=()=>rename('#ant-name');$('#pause-rename').onclick=()=>rename('#pause-name');
mountNameKeyboard({inputs:document.querySelectorAll('#ant-name,#pause-name'),host:$('#viewport'),refresh:viewport.refresh,onSave:input=>rename('#'+input.id)});
for(const input of document.querySelectorAll('#ant-name,#pause-name'))input.addEventListener('keydown',event=>{if(event.key==='Enter'&&!event.isComposing){event.preventDefault();rename('#'+input.id);}});
function result(event){clearInputs();$('#result').hidden=false;$('#controls').hidden=true;$('#hint').hidden=true;$('#boss-hud').hidden=true;$('#result-time').textContent=time(event.elapsed);$('#result-sugar').textContent=event.sugar+'개';$('#result-best').textContent=time(game.progress.best||event.elapsed);$('#upgrade-message').textContent=kitchenChapter?'쉼터와 출구에서 확정한 설탕으로 강화할 수 있어요.':event.bonus?'대장 최초 처치 보상 +'+event.bonus+'개':'최초 보상은 이미 받았어요. 일반 설탕은 다시 수집할 수 있어요.';renderUpgrades();}
function renderUpgrades(){const names={health:'튼튼한 몸',spit:'넉넉한 침',regen:'빠른 침 회복'};$('#upgrades').replaceChildren();for(const k of Object.keys(names)){const l=profile.levels[k],row=document.createElement('div');row.className='upgrade-row';const desc=document.createElement('div'),title=document.createElement('strong'),sub=document.createElement('small'),b=document.createElement('button');title.textContent=names[k]+' '+l+'/3';const current=LEVELS[k][l];sub.textContent=k==='health'?'최대 하트 '+current+'개':k==='spit'?'침 게이지 '+current:'초당 '+current+' 회복';desc.append(title,sub);b.textContent=l===3?'강화 완료':'◇ '+COSTS[l]+' 강화';b.disabled=l===3||profile.bank<COSTS[l];b.onclick=()=>{if(game.upgrade(k)){$('#upgrade-message').textContent=names[k]+' 강화 완료 · 보유 설탕 '+profile.bank+'개';renderUpgrades();}};row.append(desc,b);$('#upgrades').append(row);}}
function time(value){const sec=Math.floor(value);return String(Math.floor(sec/60)).padStart(2,'0')+':'+String(sec%60).padStart(2,'0');}
function rr(x,y,w,h,r,fill,stroke){ctx.beginPath();ctx.roundRect(x,y,w,h,r);if(fill){ctx.fillStyle=fill;ctx.fill();}if(stroke){ctx.strokeStyle=stroke;ctx.stroke();}}
function text(t,x,y,size=16,color='#fff',align='left'){ctx.fillStyle=color;ctx.font=`700 ${size}px system-ui,sans-serif`;ctx.textAlign=align;ctx.fillText(t,x,y);ctx.textAlign='left';}
function ellipse(x,y,rx,ry,color){ctx.beginPath();ctx.ellipse(x,y,rx,ry,0,0,Math.PI*2);ctx.fillStyle=color;ctx.fill();}
function imageCell(im,col,row,cols,rows,x,y,w,h,flip=false,rotation=0){if(!im.complete||!im.naturalWidth)return;ctx.save();ctx.translate(x+w/2,y+h/2);ctx.rotate(rotation);ctx.scale(flip?-1:1,1);ctx.drawImage(im,col*im.naturalWidth/cols,row*im.naturalHeight/rows,im.naturalWidth/cols,im.naturalHeight/rows,-w/2,-h/2,w,h);ctx.restore();}
function drawBook(s,index){const palettes=[['#7c9382','#b9c6a1'],['#b57865','#deb58a'],['#8e9aa4','#d1d6c5'],['#b3a16d','#e2d3a4']];const [dark,light]=palettes[index%4];ctx.save();ctx.shadowColor='#35362850';ctx.shadowBlur=10;ctx.shadowOffsetY=5;rr(s.x,s.y,s.w,s.h,6,dark,'#4c543f');ctx.shadowBlur=0;ctx.shadowOffsetY=0;rr(s.x+4,s.y+6,s.w-8,12,3,light);if(s.h>40){rr(s.x+5,s.y+25,s.w-10,Math.min(s.h-32,26),2,'#fff1');for(let y=s.y+25;y<s.y+s.h-4;y+=8){ctx.strokeStyle='#fff2';ctx.beginPath();ctx.moveTo(s.x+9,y);ctx.lineTo(s.x+s.w-7,y);ctx.stroke();}}text(index%2?'GARDEN':'LITTLE HOME',s.x+s.w/2,s.y+39,10,'#f0e6c7','center');ctx.restore();}
function doorway(x,label){
  rr(x,380,130,210,60,'#48543b','#c9b886');
  rr(x+16,402,99,188,45,'#263d2d');
  text(label,x+64,367,18,'#5b5c3d','center');
}
function drawClimbSupport(path){
  const trace=(x,y)=>{
    ctx.beginPath();
    path.points.forEach((q,i)=>i?ctx.lineTo(q.x+x,q.y+y):ctx.moveTo(q.x+x,q.y+y));
  };
  ctx.save();
  ctx.lineJoin='round';ctx.lineCap='round';
  // Fasten the track to the scenery at every joint and end.
  for(const q of path.points){
    rr(q.x+2,q.y+6,48,38,8,path.slip?'#637b68':'#6d5138','#4b3c2b');
    ellipse(q.x+36,q.y+32,4,4,'#e4c799');
  }
  trace(15,24);
  ctx.strokeStyle='#4b3c2b';ctx.lineWidth=45;ctx.stroke();
  ctx.strokeStyle=path.slip?'#91a998':'#ad8051';ctx.lineWidth=37;ctx.stroke();
  trace(13,16);
  ctx.strokeStyle=path.slip?'#d9e2c0':'#e0bd83';ctx.lineWidth=8;ctx.stroke();
  trace(6,4);
  ctx.setLineDash([3,18]);ctx.lineWidth=6;ctx.strokeStyle='#fff0be';ctx.stroke();
  ctx.restore();
  const top=path.points.at(-1);
  text(path.slip?'미끄러운 표면':'가구 밑 연결 턱',top.x-35,top.y-37,14,'#3b5339','center');
}
function render(){const g=game,p=g.p,t=g.time;ctx.clearRect(0,0,WIDTH,HEIGHT);if(kitchenChapter)drawKitchenBackdrop(ctx,images.kitchen,g.camera,WIDTH,HEIGHT);
else {
ctx.fillStyle='#e9d8ad';ctx.fillRect(0,0,WIDTH,HEIGHT);
const bg=images.room;if(bg.complete&&bg.naturalWidth){const w=1770,offset=-g.camera*.18;for(let x=offset-w;x<WIDTH;x+=w)ctx.drawImage(bg,x,-65,w,655);}
const fog=ctx.createLinearGradient(0,200,0,590);fog.addColorStop(0,'#f5e7cc15');fog.addColorStop(1,'#d6c09344');ctx.fillStyle=fog;ctx.fillRect(0,0,WIDTH,HEIGHT);
}
ctx.save();ctx.translate(-g.camera,0);
// A miniature world made of books, table legs and wooden toys.
for(const s of g.world.solids){if(s.x+s.w<g.camera-50||s.x>g.camera+WIDTH+50)continue;if(s.type==='floor'){rr(s.x,s.y,s.w,s.h,0,'#a78253');rr(s.x,s.y,s.w,13,2,'#dac398','#6f774a');ctx.fillStyle='#d6b485';ctx.fillRect(s.x,s.y+14,s.w,6);for(let x=s.x+25;x<s.x+s.w;x+=120){ctx.strokeStyle='#82644166';ctx.beginPath();ctx.moveTo(x,s.y+22);ctx.lineTo(x-20,s.y+130);ctx.stroke();}for(let y=s.y+40;y<720;y+=38){ctx.strokeStyle='#d9be8c66';ctx.beginPath();ctx.moveTo(s.x,y);ctx.lineTo(s.x+s.w,y);ctx.stroke();}}
else if(s.type==='wood'){const grad=ctx.createLinearGradient(s.x,0,s.x+s.w,0);grad.addColorStop(0,'#76573d');grad.addColorStop(.5,'#b58b54');grad.addColorStop(1,'#80623f');rr(s.x,s.y,s.w,s.h,8,grad,'#56472e');rr(s.x+6,s.y+4,s.w-12,7,3,'#d4b77e');}
else if(kitchenChapter){
  rr(s.x,s.y,s.w,s.h,8,'#a79472','#675844');
  rr(s.x+5,s.y+4,s.w-10,9,3,'#e4c89b');
}else drawBook(s,g.world.solids.indexOf(s));}
// Water gaps.
for(const [x,w]of kitchenChapter?[[1320,310],[3470,460]]:[[1150,320],[3200,280]]){const water=ctx.createLinearGradient(0,585,0,720);water.addColorStop(0,'#8dc2c3b0');water.addColorStop(1,'#386e7470');rr(x,640,w,80,20,water);for(let k=0;k<4;k++){ellipse(x+w/2+Math.sin(t+k)*30,650+k*13,w*.35-k*8,3,'#d7f1dd55');}text('물웅덩이',x+w/2,699,12,'#e9f2d9','center');}
for(const path of g.world.paths)drawClimbSupport(path);
if(kitchenChapter)drawKitchenDetails(ctx,g,{rr,ellipse,text,doorway});
else {
const c=g.world.crate;ctx.save();ctx.shadowColor='#49382955';ctx.shadowBlur=9;rr(c.x,c.y,c.w,c.h,6,'#ba8358','#694c36');rr(c.x+6,c.y+5,c.w-12,c.h-10,4,'#d4aa72','#eed8aa');text('A',c.x+c.w/2,c.y+39,32,'#7f5a3c','center');ctx.restore();
}
const r=g.world.rope,tip=g.ropeTip();ctx.beginPath();ctx.moveTo(r.x,r.y);ctx.lineTo(tip.x,tip.y);ctx.lineWidth=7;ctx.strokeStyle='#8b7350';ctx.stroke();ctx.beginPath();ctx.moveTo(r.x-1,r.y);ctx.lineTo(tip.x-1,tip.y);ctx.lineWidth=2;ctx.strokeStyle='#e5d3a9';ctx.setLineDash([4,5]);ctx.stroke();ctx.setLineDash([]);ellipse(tip.x,tip.y,9,10,'#ad8c58');rr(r.x-90,r.y-16,180,20,6,'#8d704a');
for(let i=1;i<g.stage.checkpoints.length;i++){const cp=g.stage.checkpoints[i];if(Math.abs(cp.x-g.camera-WIDTH/2)>800)continue;ellipse(cp.x+20,586,43,8,'#586f3b30');ctx.strokeStyle='#765938';ctx.lineWidth=6;ctx.beginPath();ctx.moveTo(cp.x+22,590);ctx.lineTo(cp.x+22,483);ctx.stroke();ctx.beginPath();ctx.moveTo(cp.x+22,483);ctx.quadraticCurveTo(cp.x+68,465,cp.x+67,510);ctx.quadraticCurveTo(cp.x+40,520,cp.x+22,499);ctx.fillStyle=i<=g.cp?'#6c975d':'#b0b487';ctx.fill();text('쉼터',cp.x+20,470,12,'#476239','center');if(i<=g.cp){ctx.shadowColor='#ffe9a4';ctx.shadowBlur=18;ellipse(cp.x+22,482,5,6,'#ffe0a0');ctx.shadowBlur=0;}}
for(const item of g.world.sugar){if(g.collected.has(item.id)||g.pending.has(item.id)||item.x<g.camera-40||item.x>g.camera+WIDTH+40)continue;const y=item.y+Math.sin(t*2+item.x)*3;ctx.save();ctx.translate(item.x,y);ctx.rotate(Math.PI/4);ctx.shadowColor='#fff6ba';ctx.shadowBlur=14;rr(-8,-8,16,16,3,'#fff8d1','#e0b35d');ctx.shadowBlur=0;rr(-5,-5,5,4,1,'#fff');ctx.restore();}
for(const h of g.world.heal){if(g.healTaken?.has(h.id))continue;ctx.save();ctx.translate(h.x,h.y);ctx.shadowColor='#ffc55d';ctx.shadowBlur=12;ctx.beginPath();ctx.moveTo(0,-22);ctx.bezierCurveTo(-27,4,-14,22,0,19);ctx.bezierCurveTo(20,20,26,3,0,-22);ctx.fillStyle='#efba55';ctx.fill();ctx.shadowBlur=0;text('+',0,9,22,'#fff4cc','center');ctx.restore();}
// Chacha's paw: silhouette signals the landing, then a soft oversized paw stamps down.
if(!kitchenChapter){const phase=t%4.4,warning=phase>1.25&&phase<2.6;ctx.save();ctx.translate(4450,0);ellipse(0,586,150,20,warning?'#3c312c66':'#6d563523');if(p.x>3950&&p.x<4860){text(warning?'챠챠가 뒤척인다!':'쉿… 챠챠가 자고 있어요',0,310,16,'#63523a','center');const lift=phase<2.25?-190:phase<2.6?0:-190;ctx.save();ctx.translate(0,lift);rr(-100,300,200,260,80,'#b7773f','#82512e');ellipse(0,545,125,58,'#cc9758');for(let j=0;j<4;j++)ellipse(-75+j*50,565,31,27,'#dab076');ellipse(0,533,49,32,'#966239');ctx.restore();}ctx.restore();
// Required encounter barrier.
const gate=g.enemies.some(e=>e.required&&!e.boss&&!e.dead);if(gate){rr(6150,380,24,210,5,'#8e7454','#f2d3a4');text('길목 전투',6162,355,14,'#74583c','center');ctx.strokeStyle='#d4b68a';ctx.lineWidth=6;ctx.beginPath();ctx.moveTo(6158,395);ctx.lineTo(6190,570);ctx.stroke();}
doorway(7630,'거실 밖');
} else if(g.arena) {
  for(const x of [g.stage.arenaLeft,g.stage.arenaRight]){
    rr(x,297,20,293,5,'#93664b','#563e32');
    for(let y=314;y<570;y+=36)rr(x+3,y,14,9,3,'#dec18a');
  }
}
for(const e of g.enemies){if(e.dead||e.x+e.w<g.camera-100||e.x>g.camera+WIDTH+100)continue;const walk=e.state==='walk'?Math.sin(t*(e.type==='thin'?16:8))*2:0;ellipse(e.x+e.w/2,e.y+3,e.w*.55,7,'#34492330');const cell=e.type==='fat'||e.boss?[0,0]:e.type==='thin'?[1,0]:e.type==='smart'?[1,1]:[0,1];const w=e.boss?235:e.type==='fat'?118:94,h=e.boss?225:120;ctx.save();if(e.stun>0)ctx.globalAlpha=.65;imageCell(images.grass,...cell,2,2,e.x+e.w/2-w/2,e.y-h+walk,w,h,e.dir>0);ctx.restore();if(e.boss){text('♛',e.x+e.w/2,e.y-h-3,30,'#bb813c','center');}else{const names={normal:'평범한 베짱이',fat:'뚱뚱한 베짱이',thin:'마른 베짱이',smart:'똑똑한 베짱이'};text(names[e.type],e.x+e.w/2,e.y-h-8,11,'#485936','center');rr(e.x+e.w/2-20,e.y-h,40,4,2,'#526b3d33');rr(e.x+e.w/2-20,e.y-h,40*e.hp/e.max,4,2,'#71975a');}if(kitchenChapter&&e.boss&&e.state==='warn'){
  const charge=e.pattern%2===1;
  if(!charge){
    const landing=e.landing+e.w/2;
    ellipse(landing,FLOOR-4,82,11,'#a1483699');
    text('착지 지점',landing,FLOOR-19,16,'#853e31','center');
  }
  text(charge?'돌진':'내려찍기',e.x+e.w/2,e.y-h-58,18,'#9a3d2d','center');
}if(e.state==='warn'||e.state==='aim'){text(e.state==='aim'?'⌖':'!',e.x+e.w/2,e.y-h-30,30,'#b75037','center');if(e.state==='aim'){ctx.save();ctx.strokeStyle='#be5e4b88';ctx.setLineDash([4,9]);ctx.beginPath();ctx.moveTo(e.x+e.w/2,e.y-55);ctx.lineTo(e.x+e.w/2+e.dir*400,e.y-55);ctx.stroke();ctx.restore();}}if(e.boss&&e.state==='rest')text('헉… 헉…',e.x+e.w/2,e.y-h-30,17,'#715842','center');}
for(const wave of g.guardWaves??[]){
  ellipse(wave.x,FLOOR-2,31,6,'#a95030a0');
  ctx.save();ctx.translate(wave.x,FLOOR);ctx.scale(wave.dir,1);
  ctx.beginPath();ctx.moveTo(-25,-2);ctx.quadraticCurveTo(0,-8,14,-27);
  ctx.quadraticCurveTo(16,-10,27,-2);ctx.closePath();ctx.fillStyle='#b8502f';ctx.fill();
  ctx.lineWidth=3;ctx.strokeStyle='#fff1c1';ctx.stroke();ctx.restore();
}
for(const s of g.shots){ellipse(s.x-s.vx*.008,s.y,13,4,'#ebfbef99');ellipse(s.x,s.y,8,7,'#bfe7d9');ellipse(s.x-2,s.y-2,3,2,'#fff');}for(const s of g.seeds){ellipse(s.x,s.y,9,5,'#83613c');}
// Exact original ant sprite sheet from Chacha, let's wash.
ctx.save();if(p.inv>0&&Math.floor(p.inv*12)%2)ctx.globalAlpha=.55;ellipse(p.x+p.w/2,p.y+p.h+2,34,7,'#4d443333');let col=0,row=0;if(p.firePose>0)col=1;else if(Math.abs(p.vx)>20||p.climb&&((g.input.left||g.input.right))){row=1;col=Math.floor(t*9)%2;}const pose=g.antPose();imageCell(images.ant,col,row,2,2,p.x+p.w/2-49,p.y-34,98,101,pose.flip,pose.rotation);if(p.firePose>0)text('퉷!',p.x+p.w/2+p.dir*47,p.y-10,18,'#fff8dd','center');ctx.restore();
for(const a of particles)ellipse(a.x,a.y,3*a.life,3*a.life,a.color);ctx.restore();
// Foreground warmth and a fine vignette frame the miniature stage.
const shade=ctx.createLinearGradient(0,620,0,720);shade.addColorStop(0,'#382d1800');shade.addColorStop(1,'#3a341655');ctx.fillStyle=shade;ctx.fillRect(0,620,1280,100);
if(game.mode!=='menu'){const area=[...g.stage.areas].reverse().find(a=>p.x>=a.x)||g.stage.areas[0];$('#area-name').textContent=area.title;$('#hint').textContent=area.hint;$('#hearts').textContent='♥'.repeat(Math.max(0,p.hp))+'♡'.repeat(Math.max(0,game.maxHp-p.hp));$('#spit-fill').style.width=(p.spit/game.maxSpit*100)+'%';$('#sugar-count').textContent=profile.bank;$('#pending').textContent=game.pending.size?' +'+game.pending.size+' 미확정':'';$('#clock').textContent=time(game.elapsed);$('#route-fill').style.width=Math.min(100,p.x/g.stage.width*100)+'%';const interaction=game.getInteraction(),ib=$('#interact');ib.hidden=!interaction;if(interaction)ib.innerHTML=interaction.label+'<small>X</small>';const ab=$('[data-action="attack"]');ab.disabled=!!p.climb||p.rope||p.spit<25;renderBossHud(g);}
}
function renderBossHud(g){
  const active=g.bossActive&&(g.mode==='playing'||g.mode==='dialog');
  const panel=$('#boss-hud');
  panel.hidden=!active;
  if(!active){
    if(g.mode==='playing')$('#hint').hidden=false;
    return;
  }
  $('#hint').hidden=true;
  const boss=g.enemies.find(enemy=>enemy.boss);
  const bar=$('#boss-health');
  if(bar.max!==boss.max)bar.max=boss.max;
  if(bar.value!==boss.hp)bar.value=boss.hp;
  const label='남은 명중 '+boss.hp+'회 / '+boss.max+'회';
  if($('#boss-remaining').textContent!==label)$('#boss-remaining').textContent=label;
}
function loop(timestamp){const dt=last?Math.min(.25,(timestamp-last)/1000):.016;last=timestamp;let remaining=dt;while(remaining>0){const step=Math.min(1/60,remaining);game.update(step);remaining-=step;}for(const a of particles){a.x+=a.vx*dt;a.y+=a.vy*dt;a.vy+=100*dt;a.life-=dt;}particles=particles.filter(a=>a.life>0);if(game.mode==='playing'&&!profile.muted){musicTimer-=dt;if(musicTimer<=0){musicTimer=game.bossActive?.3:.43;const melody=game.bossActive?[146.8,174.6,220,196,146.8,164.8,196,220]:[261.6,329.6,392,440,392,329.6,293.7,329.6,261.6,220,261.6,293.7];tone(melody[note++%melody.length],.24,'sine',.018);}}render();frame=requestAnimationFrame(loop);}
addEventListener('blur',()=>{clearInputs();});document.addEventListener('visibilitychange',()=>{if(document.hidden&&game.mode==='playing')pause();});
function beginBossReview(){
  showPlay();
  game.start(Boolean(game.progress.run));
  game.checkpoint(game.stage.checkpoints.length-1);
  game.p.x=game.stage.bossTrigger+8;
  game.camera=Math.max(0,Math.min(game.stage.width-WIDTH,game.p.x-380));
}
home();
if(kitchenChapter){
  document.title='개미의 모험 — 부엌으로 가는 길';
  $('#hud .chapter small').textContent='CHAPTER 02';
  $('#game').setAttribute('aria-label','부엌에서 개미를 조작해 출구로 이동하세요');
  $('#boss-hud > span').textContent='부엌의 문지기 · 길목 경비';
  $('#result .result-panel > small').textContent='CHAPTER 02 COMPLETE';
  $('#result h2').textContent='부엌 너머, 바람이 부는 길.';
  $('#result .result-panel > p').textContent='경비가 비켜 준 문턱 너머로 개미굴에서 불어오는 바람이 느껴집니다.';
  $('#chapter-02').hidden=true;
  if(review==='boss2')beginBossReview();
  else if(profile.cleared)start(Boolean(game.progress.run));
  else {
    $('#menu').hidden=true;
    dialog([['챕터 2','거실의 베짱이 대장을 쓰러뜨리면 부엌으로 가는 길이 열립니다.']],()=>navigate('./'));
  }
}else if(review==='boss1')beginBossReview();
else if(review==='chapter1')start(Boolean(game.progress.run));
else if(review){
  showPlay();game.start(false);
  game.p.x=review==='wet'?2125:1016;
  game.camera=game.p.x-380;
  toast('검수 시작 위치 · 오른쪽으로 이동하고 붙기 버튼을 눌러 보세요.');
}
initPwa();requestAnimationFrame(loop);
