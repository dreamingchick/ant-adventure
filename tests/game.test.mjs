import test from 'node:test';import assert from 'node:assert/strict';import {Game,freshProfile,sanitize,COSTS}from'../dist/engine.js';
import {KitchenGame} from '../dist/stage2-engine.js';
const run=()=>{const g=new Game();g.start();return g;};const tick=(g,n=60)=>{for(let i=0;i<n;i++)g.update(1/60);};

for (const [chapter,GameType] of [[1,Game],[2,KitchenGame]]) {
  for (const side of ['left','right']) {
    test(`chapter ${chapter} boss charge can hit a player against the ${side} wall`,()=>{
      const game=new GameType(freshProfile());
      game.start();
      const boss=game.enemies.find(enemy=>enemy.boss);
      for(const enemy of game.enemies)if(!enemy.boss)enemy.dead=true;
      game.bossActive=game.bossIntro=game.arena=true;
      game.p.x=side==='left'?game.stage.arenaLeft+20:game.stage.arenaRight-game.p.w;
      game.p.inv=0;
      boss.x=game.p.x+(side==='left'?225:-225);
      boss.cool=0;
      tick(game,132);
      assert.equal(game.p.hp,game.maxHp-1);
      assert.ok(boss.x>=game.stage.arenaLeft+20);
      assert.ok(boss.x+boss.w<=game.stage.arenaRight);
    });
  }
}
test('variable jump and grounded collision',()=>{let g=run();g.input.jump=true;g.jump();let high=g.p.y;for(let i=0;i<40;i++){g.update(1/60);high=Math.min(high,g.p.y);}g=run();g.jump();let low=g.p.y;for(let i=0;i<40;i++){g.update(1/60);low=Math.min(low,g.p.y);}assert.ok(high<low-35);tick(g);assert.equal(g.p.y+g.p.h,590);});
test('spit spends gauge, cannot repeat while cooling down, recovers after delay',()=>{const g=run();assert.equal(g.attack(),true);assert.equal(g.p.spit,75);assert.equal(g.attack(),false);tick(g,30);assert.equal(g.p.spit,75);tick(g,60);assert.ok(g.p.spit>75);g.p.climb=g.world.paths[0];assert.equal(g.attack(),false);g.p.climb=null;g.p.rope=true;assert.equal(g.attack(),false);g.p.rope=false;g.p.ground=false;g.p.shotTimer=0;assert.equal(g.attack(),true);});
test('checkpoint commits sugar; failure only rolls back uncommitted collection and current enemies',()=>{const g=run();g.pending.add('s0');g.enemies[0].dead=true;g.checkpoint(1);assert.equal(g.profile.bank,1);assert.ok(g.collected.has('s0'));g.pending.add('s9');g.enemies[1].dead=true;g.retry();assert.equal(g.pending.size,0);assert.equal(g.profile.bank,1);assert.equal(g.enemies[0].dead,true);assert.equal(g.enemies[1].dead,false);assert.equal(g.p.hp,g.maxHp);assert.equal(g.cp,1);});
test('restarting before clear preserves confirmed collectibles, clear resets the next run',()=>{const g=run();g.pending.add('s0');g.checkpoint(1);g.restart();assert.ok(g.collected.has('s0'));g.finish();g.start();assert.equal(g.collected.size,0);});
test('first boss reward and best record are idempotent; upgrades restricted to result screen',()=>{const g=run();g.profile.bank=30;assert.equal(g.upgrade('health'),false);g.elapsed=90;g.finish();assert.equal(g.profile.bank,75);assert.equal(g.profile.bossReward,true);assert.equal(g.profile.best,90);assert.equal(g.upgrade('health'),true);assert.equal(g.profile.levels.health,1);assert.equal(g.profile.bank,55);assert.equal(g.upgrade('spit'),true);assert.equal(g.profile.bank,35);assert.equal(g.upgrade('health'),false);g.start();g.elapsed=100;g.finish();assert.equal(g.profile.bank,35);assert.equal(g.profile.best,90);});
test('save round trip preserves upgrades, run checkpoint and confirmed sugar',()=>{const g=run();g.profile.name='퉤퉤';g.pending.add('s1');g.checkpoint(2);const copy=sanitize(JSON.parse(JSON.stringify(g.profile)));const resumed=new Game(copy);resumed.start(true);assert.equal(resumed.cp,2);assert.equal(resumed.p.x,3790);assert.ok(resumed.collected.has('s1'));assert.equal(copy.name,'퉤퉤');});
test('wall attachment, path travel and jump release do not consume a climbing gauge',()=>{const g=run();g.p.x=1035;g.p.y=510;assert.equal(g.getInteraction().kind,'path');g.interact();g.input.right=true;tick(g,120);assert.ok(g.p.y<330);assert.ok(g.p.climb);g.jump();assert.equal(g.p.climb,null);assert.ok(g.p.vy<0);assert.equal(g.attack(),true);});
test('boss accepts damage while charging and does not stagger; retry retains damage',()=>{const g=run();g.bossActive=true;const b=g.enemies.find(e=>e.boss);b.state='charge';b.hp=14;g.shots=[{x:b.x-5,y:520,vx:660,left:240}];g.updateProjectiles(1/60);assert.equal(b.hp,13);assert.equal(b.state,'charge');assert.equal(b.stun,0);g.cp=3;g.profile.run.cp=3;g.retry();assert.equal(g.enemies.find(e=>e.boss).hp,13);});
test('normal enemy yields no sugar; projectile damage and stun work',()=>{const g=run(),e=g.enemies[0];g.shots=[{x:e.x-5,y:540,vx:660,left:240}];g.updateProjectiles(1/60);assert.equal(e.hp,1);assert.equal(e.stun,.3);g.shots=[{x:e.x-5,y:540,vx:660,left:240}];g.updateProjectiles(1/60);assert.ok(e.dead);assert.equal(g.profile.bank,0);assert.equal(g.pending.size,0);});
test('upgrade caps and independent costs',()=>{const g=run();g.profile.bank=1000;g.finish();for(let i=0;i<3;i++)assert.ok(g.upgrade('health'));assert.equal(g.profile.levels.health,3);assert.equal(g.upgrade('health'),false);const before=g.profile.bank;assert.ok(g.upgrade('regen'));assert.equal(before-g.profile.bank,COSTS[0]);});

function hitBoss(g,n){g.bossActive=true;const b=g.enemies.find(e=>e.boss);for(let i=0;i<n;i++){g.shots=[{x:b.x-5,y:520,vx:660,left:240}];g.updateProjectiles(1/60);}return b;}
test('death and repeated checkpoint retries retain boss HP and restore player HP',()=>{const g=run();g.cp=3;g.profile.run.cp=3;hitBoss(g,5);assert.equal(g.profile.run.bossHp,9);g.p.hp=1;g.p.inv=0;g.hurt();assert.equal(g.p.hp,g.maxHp);assert.equal(g.enemies.find(e=>e.boss).hp,9);g.retry();assert.equal(g.enemies.find(e=>e.boss).hp,9);});
test('boss damage survives save/reload and restarting the uncleared stage',()=>{const g=run();g.cp=3;g.profile.run.cp=3;hitBoss(g,10);const saved=sanitize(JSON.parse(JSON.stringify(g.profile)));const resumed=new Game(saved);resumed.start(true);assert.equal(resumed.enemies.find(e=>e.boss).hp,4);resumed.restart();assert.equal(resumed.enemies.find(e=>e.boss).hp,4);assert.equal(resumed.cp,0);});
test('cumulative hits across retries clear the boss once and a new cleared run starts fresh',()=>{const g=run();hitBoss(g,8);g.retry();assert.equal(g.enemies.find(e=>e.boss).hp,6);hitBoss(g,6);assert.equal(g.mode,'result');assert.equal(g.profile.bossReward,true);const bank=g.profile.bank;g.start();assert.equal(g.enemies.find(e=>e.boss).hp,14);assert.equal(g.profile.bank,bank);assert.equal(g.profile.run.bossHp,14);});
test('legacy saves with no boss HP start at full health and new saves sanitize HP',()=>{const g=run();delete g.profile.run.bossHp;const restored=sanitize(JSON.parse(JSON.stringify(g.profile)));assert.equal(restored.run.bossHp,14);restored.run.bossHp=999;assert.equal(sanitize(restored).run.bossHp,14);restored.run.bossHp=-3;assert.equal(sanitize(restored).run.bossHp,1);});
