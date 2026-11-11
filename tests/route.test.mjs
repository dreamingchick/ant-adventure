import test from 'node:test';import assert from 'node:assert/strict';import {Game}from '../dist/engine.js';
test('complete living room with normal movement, interactions and attacks at base stats',()=>{
const g=new Game(undefined,e=>{if(e.type==='boss-intro')g.mode='playing';});g.start();let max=0,stuck=0,prev=0,lastJump=-10;for(let f=0;f<60*240;f++){const p=g.p;g.input.right=true;g.input.left=false;g.input.jump=true;const inter=g.getInteraction();if(p.climb){if(p.pathT>g.pathLength(p.climb)-12)g.jump();}else if(p.rope){if(g.world.rope.angle>.38)g.jump();}else if(inter?.kind==='path'&&p.x<1100){g.interact();}else if(inter?.kind==='rope'&&p.x<3400){g.interact();}else{const obstacle=[...g.world.solids,g.world.crate].some(s=>s.type!=='floor'&&s.x>p.x&&s.x<p.x+100&&s.y<p.y+p.h&&s.y>p.y-230);const gap=p.x>3080&&p.x<3220;if(p.ground&&(obstacle||gap||p.x>6420)&&f/60-lastJump>.45){g.jump();lastJump=f/60;}if(inter?.kind==='crate'&&!p.push&&p.x<2790)g.interact();if(p.push&&g.world.crate.x>=2825)g.interact();}
if(p.x>5500&&p.x<6420){const e=g.enemies.find(e=>e.required&&!e.boss&&!e.dead);if(e){g.input.right=p.x<e.x-140;g.input.left=p.x>e.x-110;p.dir=e.x>p.x?1:-1;}}
if(p.x>6420){const b=g.enemies.find(e=>e.boss);g.input.right=p.x<b.x-130;g.input.left=p.x>b.x-90;p.dir=b.x>p.x?1:-1;}
g.attack();g.update(1/60);max=Math.max(max,p.x);if(g.mode==='result'){break;}}

assert.equal(g.mode,'result');assert.equal(g.profile.cleared,true);assert.ok(g.profile.bank>=45);assert.ok(g.cp===3);assert.equal(g.profile.levels.health,0);
});
