import { DRIPS, HAZARDS, dripPhase, dripHeight } from './stage2-engine.js?v=0.4.6';

export function drawKitchenBackdrop(ctx, image, camera, width, height) {
  const light = ctx.createLinearGradient(0,0,0,height);
  light.addColorStop(0,'#a0ab91');
  light.addColorStop(.66,'#e3d1a5');
  light.addColorStop(1,'#b9966e');
  ctx.fillStyle=light;
  ctx.fillRect(0,0,width,height);
  if (!image.complete || !image.naturalWidth) return;
  const tileWidth=1680;
  const offset=-camera*.19;
  const first=Math.floor(-offset/tileWidth);
  for (let i=first;offset+i*tileWidth<width;i++) {
    const x=offset+i*tileWidth;
    ctx.save();
    ctx.translate(x+(i%2===0?tileWidth:0),0);
    if(i%2===0)ctx.scale(-1,1);
    ctx.drawImage(image,0,-27,tileWidth,925);
    ctx.restore();
  }
  ctx.fillStyle='#ddd4ad33';
  ctx.fillRect(0,0,width,height);
}

export function drawKitchenDetails(ctx, game, { rr, ellipse, text, doorway }) {
  doorway(20, '거실에서');
  doorway(6270, '개미굴 방향');

  rr(2000,236,780,33,10,'#adbdb2','#546c68');
  rr(2014,240,752,9,4,'#dbe9d8');
  for (const [index, drip] of DRIPS.entries()) {
    const phase=dripPhase(game.dripClocks[index]||0);
    rr(drip.x-14,255,28,26,5,'#6e8a86','#405b57');
    if (phase<1.2) {
      const x=drip.x;
      const warning=phase<.9;
      const y=dripHeight(phase);
      ellipse(x,584,drip.reach,8,warning?'#37688176':'#2c5e78a5');
      ctx.save();ctx.strokeStyle='#d6f0df';ctx.setLineDash([6,6]);ctx.lineWidth=2;
      ctx.strokeRect(x-drip.reach,579,2*drip.reach,9);ctx.restore();
      ellipse(x,y,warning?5+phase*6:10,warning?7+phase*7:21,'#559ab0');
      ellipse(x-2,y-3,3,5,'#e5fff0');
    }
  }

  rr(3260,107,780,43,14,'#a9754d','#72563b');
  rr(3420,124,482,45,8,'#c97e65','#864d3e');
  for(let x=3427;x<3880;x+=48) rr(x,126,16,37,3,'#e8b89b');
  for(const h of HAZARDS) {
    for(let x=h.x;x<h.x+h.w-3;x+=14) {
      ctx.beginPath();ctx.moveTo(x,590);ctx.lineTo(x+6,568);ctx.lineTo(Math.min(x+13,h.x+h.w),590);
      ctx.closePath();ctx.fillStyle='#874d31';ctx.fill();
      ctx.strokeStyle='#eed298';ctx.lineWidth=2;ctx.stroke();
    }
  }
  const c=game.world.crate;
  rr(c.x,c.y,c.w,c.h,12,'#a75e43','#683c2d');
  rr(c.x+4,c.y+4,c.w-8,18,6,'#e9a57b');
  for(let x=c.x+8;x<c.x+c.w-3;x+=11) rr(x,c.y+25,4,c.h-33,2,'#d68a60');
  text('뚜껑',c.x+c.w/2,c.y+46,14,'#fff1cc','center');
  ctx.save();ctx.strokeStyle='#f4d6a2';ctx.setLineDash([7,5]);ctx.lineWidth=3;
  ctx.strokeRect(game.stage.crateMax,516,c.w,73);ctx.restore();
}
