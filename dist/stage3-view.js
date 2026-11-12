import { FLOOR } from './engine.js?v=0.4.5';
import { WINDS } from './stage3-engine.js?v=0.4.5';

function garment(ctx,fill,stroke,trace){
  ctx.beginPath();
  trace(ctx);
  ctx.closePath();
  ctx.fillStyle=fill;
  ctx.fill();
  if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=1;ctx.stroke();}
}

export function drawBridalDress(ctx,col,row){
  ctx.save();
  const bodiceX=row&&col?51:50;
  const shoulder=row?62:63;
  const hem=row?84:85;
  const satin=ctx.createLinearGradient(18,shoulder,60,hem);
  satin.addColorStop(0,'#fffaf1');
  satin.addColorStop(.55,'#fffdf9');
  satin.addColorStop(1,'#d8b8af');
  // A sheer veil falls behind the face, under the tiara.
  garment(ctx,'#fffaf0c9','#fffdf6',p=>{
    p.moveTo(44,24);p.quadraticCurveTo(34,28,32,42);
    p.quadraticCurveTo(29,53,18,56);p.quadraticCurveTo(22,62,34,60);
    p.quadraticCurveTo(40,53,40,43);p.quadraticCurveTo(39,33,47,27);
  });
  garment(ctx,'#ffedba','#c29a53',p=>{
    p.moveTo(40,29);p.lineTo(42,22);p.lineTo(46,25);
    p.lineTo(50,20);p.lineTo(54,26);p.lineTo(58,24);p.lineTo(57,31);
  });
  // Fitted bodice and flared satin skirt leave the running feet visible.
  garment(ctx,satin,'#ae8f80',p=>{
    p.moveTo(bodiceX-9,shoulder);p.quadraticCurveTo(bodiceX-2,shoulder+3,bodiceX+5,shoulder);
    p.quadraticCurveTo(bodiceX+10,shoulder+5,bodiceX+5,shoulder+10);
    p.quadraticCurveTo(bodiceX+7,hem-6,bodiceX+12,hem-4);
    p.quadraticCurveTo(38,hem+9,14,hem-1);
    p.quadraticCurveTo(23,hem-6,27,hem-14);
    p.quadraticCurveTo(31,hem-21,bodiceX-10,shoulder+7);
  });
  ctx.beginPath();ctx.moveTo(46,shoulder+9);ctx.quadraticCurveTo(36,hem-7,32,hem+2);
  ctx.moveTo(49,shoulder+10);ctx.quadraticCurveTo(48,hem-4,46,hem+2);
  ctx.strokeStyle='#c3a39c';ctx.lineWidth=.9;ctx.stroke();
  garment(ctx,'#e6b6ad',null,p=>{
    p.moveTo(bodiceX-10,shoulder+6);p.quadraticCurveTo(bodiceX-1,shoulder+10,bodiceX+6,shoulder+6);
    p.lineTo(bodiceX+5,shoulder+9);p.quadraticCurveTo(bodiceX-2,shoulder+13,bodiceX-11,shoulder+9);
  });
  ctx.restore();
}

export function drawTuxedo(ctx){
  ctx.save();
  const wool=ctx.createLinearGradient(45,53,68,77);
  wool.addColorStop(0,'#4d525b');wool.addColorStop(1,'#192028');
  garment(ctx,wool,'#191b22',p=>{
    p.moveTo(43,53);p.quadraticCurveTo(51,55,57,52);
    p.quadraticCurveTo(61,58,68,66);p.lineTo(76,75);p.lineTo(69,82);
    p.lineTo(59,75);p.quadraticCurveTo(50,77,42,70);
    p.quadraticCurveTo(39,63,43,53);
  });
  garment(ctx,'#fff9ed','#b9b3a5',p=>{
    p.moveTo(43,54);p.quadraticCurveTo(49,57,54,55);p.lineTo(49,70);p.lineTo(43,63);
  });
  garment(ctx,'#68717c',null,p=>{
    p.moveTo(54,55);p.lineTo(58,59);p.lineTo(54,63);p.lineTo(56,65);p.lineTo(49,72);
  });
  garment(ctx,'#29323b','#171921',p=>{
    p.moveTo(42,56);p.lineTo(47,58);p.lineTo(52,56);p.lineTo(52,62);
    p.lineTo(47,60);p.lineTo(42,62);
  });
  ctx.fillStyle='#fff3d4';ctx.fillRect(46.4,58,1.3,2);
  ctx.restore();
}

export function drawThresholdBackdrop(ctx,image,camera,width,height){
  const sky=ctx.createLinearGradient(0,0,0,height);
  sky.addColorStop(0,'#b7c7a4');sky.addColorStop(1,'#e6c28b');
  ctx.fillStyle=sky;ctx.fillRect(0,0,width,height);
  if(image.complete&&image.naturalWidth){
    const offset=-camera*.19;
    const tile=1680;
    for(let i=Math.floor(-offset/tile);offset+i*tile<width;i++){
      ctx.save();
      ctx.translate(offset+i*tile+(i%2?tile:0),0);
      if(i%2)ctx.scale(-1,1);
      ctx.drawImage(image,0,-50,tile,900);
      ctx.restore();
    }
  }
  if(camera>2700){
    const fade=ctx.createLinearGradient(0,0,width,0);
    fade.addColorStop(0,'#68674e11');fade.addColorStop(1,'#718257a0');
    ctx.fillStyle=fade;ctx.fillRect(0,0,width,height);
  }
}

export function drawThresholdDetails(ctx,g,{rr,ellipse,text,doorway,imageCell,images}){
  doorway(25,'부엌에서');
  doorway(4190,'개미굴 입구');
  for(const zone of WINDS){
    const warning=g.wind<.8;
    const active=!warning&&g.wind<2;
    const [from,to]=zone.safe;
    rr(from,522,to-from,14,5,'#b8956f','#745e40');
    text('바람을 피하는 홈',(from+to)/2,508,13,'#514b34','center');
    const fabricX=zone.from+45;
    const bend=warning?12+Math.sin(g.time*20)*10:active?36:0;
    ctx.beginPath();ctx.moveTo(fabricX,406);ctx.quadraticCurveTo(fabricX-8-bend,455,fabricX-bend,487);
    ctx.lineTo(fabricX+38-bend,489);ctx.lineTo(fabricX+40,406);ctx.closePath();
    ctx.fillStyle='#d0a373';ctx.fill();
    if(warning||active){
      ctx.save();ctx.globalAlpha=active?.8:.4;
      for(let i=0;i<11;i++){
        const x=zone.to-((i*63+g.time*(active?310:75))%(zone.to-zone.from));
        const y=475+(i*33)%99;
        if(x>=from&&x<=to)continue;
        rr(x,y,active?34:14,2,1,'#fff3d4');
        if(i%3===0)rr(x,y-5,8,5,1,'#d7a572');
      }
      ctx.restore();
      text(warning?'바람 예고':'← 횡풍',(zone.from+zone.to)/2,445,16,'#704c34','center');
    }
  }

  rr(3012,345,72,245,12,'#71563b','#473a2d');
  rr(3022,354,48,228,8,g.gateOpen?'#71916e':'#aa8760','#d8bf8b');
  if(!g.gateOpen){
    ctx.beginPath();ctx.moveTo(2930,590);ctx.lineTo(2997,563);ctx.lineTo(3010,590);ctx.closePath();
    ctx.fillStyle='#bf8057';ctx.fill();ctx.strokeStyle='#714d36';ctx.stroke();
  }else text('열린 바깥문',3048,329,16,'#413829','center');

  if(!g.duel&&(g.companionPose||g.p.x>2390)){
    const {x,y,flip}=g.companionPose??{x:2580,y:FLOOR,flip:false};
    imageCell(images.grass,0,1,2,2,x-52,y-117,104,119,flip,0,g.metSpouse?drawTuxedo:undefined);
    text('베짱이',x,y-125,14,'#405d37','center');
  }
  if(!g.duel)return;
  const duel=g.duel;
  rr(4490,343,650,18,7,'#9a7448','#533e31');
  text('베짱이 ↔ 아빠 개미',4815,211,20,'#3e3526','center');
  imageCell(images.grass,0,1,2,2,duel.spouseX-52,239,104,104,duel.fatherX>duel.spouseX,0,drawTuxedo);
  imageCell(images.ant,0,0,2,2,duel.fatherX-60,220-(duel.timer>1.15?Math.sin(Math.min(1,(duel.timer-1.15)/.75)*Math.PI)*30:0),126,124,true);
  rr(duel.fatherX-9,252,29,7,3,'#384b50');
  rr(duel.spouseX-43,224,89,6,3,'#45372b');
  rr(duel.spouseX-43,224,89*duel.spouse/5,6,3,'#94bd6f');
  rr(duel.fatherX-43,208,89,6,3,'#45372b');
  rr(duel.fatherX-43,208,89*duel.father/6,6,3,'#e29d71');
  if(duel.strike>0){
    ellipse((duel.spouseX+duel.fatherX)/2,330,50,8,'#d68b4a91');
    text(duel.attacker==='father'?'쿵!':'퉷!',(duel.spouseX+duel.fatherX)/2,299,21,'#965138','center');
  }
  if(duel.aiDone)text(duel.father===0?'베짱이 승리':'아빠 개미 승리',4815,244,17,'#4d603d','center');
  const mother=g.mother;
  if(!mother.dead){
    imageCell(images.ant,0,0,2,2,mother.x-17,mother.y-155,151,154,mother.dir<0);
    rr(mother.x+34,mother.y-101,30,9,4,'#b94f67');
    if(mother.state==='warn')text('돌진!',mother.x+58,mother.y-157,22,'#a54836','center');
  }
}
