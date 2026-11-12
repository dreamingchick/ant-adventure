import test from 'node:test';
import assert from 'node:assert/strict';
import {Game,freshProfile} from '../dist/engine.js';
import {KitchenGame} from '../dist/stage2-engine.js';
import {ThresholdGame,cleanStage3,canDuelHit} from '../dist/stage3-engine.js';
import {newJourney,restoreJourney,endingFor} from '../dist/journey.js';

const tick=(game,n=1)=>{for(let i=0;i<n;i++)game.update(1/60);};
const atFinale=journey=>{
  const game=new ThresholdGame({...freshProfile(),journey});
  game.start();
  game.checkpoint(2);
  game.p.x=game.stage.bossTrigger+8;
  tick(game);
  return game;
};
const defeatMother=game=>{
  game.mother.hp=1;
  game.shots.push({x:game.mother.x+30,y:game.mother.y-45,vx:660,left:100});
  tick(game);
};

test('chapter 3 confirms sugar and permits upgrades only before the finale',()=>{
  const profile={...freshProfile(),bank:39,journey:{...newJourney(),next:3}};
  const game=new ThresholdGame(profile,event=>{
    if(event.type==='boss-intro')game.prepareFinale();
  });
  game.start();
  game.checkpoint(2);
  game.pending.add('s0');
  game.pending.add('s1');
  game.p.hp=2;
  game.p.spit=50;
  game.p.regenWait=1;
  assert.equal(game.upgrade('health'),false);
  game.p.x=game.stage.bossTrigger+8;
  tick(game);
  assert.equal(game.mode,'preparation');
  assert.equal(profile.bank,41);
  assert.deepEqual(game.progress.run.collected,['s0','s1']);
  assert.equal(game.progress.run.attemptSugar,2);
  const clock=game.elapsed;
  tick(game,120);
  assert.equal(game.elapsed,clock);
  assert.equal(game.duel.timer,0);
  assert.equal(game.upgrade('health'),true);
  assert.equal(game.upgrade('spit'),true);
  assert.equal(game.p.hp,3);
  assert.equal(game.p.spit,75);
  assert.equal(profile.bank,1);
  assert.equal(game.upgrade('regen'),false);

  game.mode='playing';
  defeatMother(game);
  tick(game,180);
  assert.equal(game.mode,'result');
  profile.bank=100;
  assert.equal(game.upgrade('regen'),false);
});

test('chapter 3 route reaches both shelters, opens the gate and finishes by either crossing',()=>{
  for(const takeHand of [true,false]){
    const game=new ThresholdGame({...freshProfile(),journey:{...newJourney(),next:3}});
    game.start();
    const move=target=>{
      game.input.right=true;
      for(let i=0;i<2300&&game.p.x<target;i++){
        if(game.p.ground&&game.world.solids.some(s=>s.type!=='floor'&&s.type!=='gate'&&s.x>game.p.x&&s.x-game.p.x<100&&s.y<game.p.y+game.p.h&&s.y>game.p.y-150)){
          game.input.jump=true;game.jump();
        }
        tick(game);
      }
      game.input.right=false;
      assert.ok(game.p.x>=target,'reach '+target);
    };
    move(2960);
    assert.equal(game.cp,1);
    assert.equal(game.metSpouse,true);
    assert.equal(game.getInteraction().kind,'wedge');
    game.interact();
    assert.equal(game.gateOpen,true);
    move(3280);
    assert.equal(game.cp,2);
    if(takeHand){game.interact();tick(game,75);}
    else {
      move(3385);
      game.time=2.1;game.input.jump=true;game.input.right=true;
      game.jump();tick(game,65);
      assert.ok(game.p.x>3600);
    }
    move(4380);
    assert.ok(game.duel);
    defeatMother(game);
    tick(game,60*3);
    assert.equal(game.mode,'result');
    assert.equal(game.progress.cleared,true);
  }
});

test('a player defeat retries the mother and keeps the father duel outcome',()=>{
  for(const [source,target] of [['player','father'],['father','player'],['spouse','mother'],['mother','spouse']])
    assert.equal(canDuelHit(source,target),false);
  const game=atFinale({...newJourney(),next:3});
  assert.equal(game.aiHit('spouse','mother'),false);
  assert.equal(game.aiHit('father','player'),false);
  while(!game.duel.aiDone)game.aiHit('spouse','father');
  game.mother.hp=5;
  game.shots.push({x:game.mother.x+30,y:game.mother.y-45,vx:660,left:100});
  tick(game);
  assert.equal(game.progress.run.bossHp,4);
  game.p.x=game.mother.x+20;
  game.p.hp=1;game.p.inv=0;
  tick(game);
  assert.equal(game.p.hp,game.maxHp);
  assert.equal(game.mother.hp,4);
  const reloaded=new ThresholdGame(JSON.parse(JSON.stringify(game.profile)));
  reloaded.start(true);
  assert.equal(reloaded.mother.hp,4);
  assert.equal(reloaded.mother.max,12);
  assert.equal(game.duel.playerDone,false);
  assert.equal(game.duel.father,0);
  assert.equal(game.profile.journey.hits,1);
  assert.equal(game.profile.journey.deaths,1);
  assert.equal(game.progress.cleared,false);
  assert.equal(game.mode,'playing');
  defeatMother(game);
  assert.equal(game.profile.journey.ending,'ordinary');
  assert.equal(game.progress.cleared,true);
  const bank=game.profile.bank;
  tick(game,120);
  assert.equal(game.profile.bank,bank);
  assert.deepEqual(game.profile.endings,['ordinary']);
});

test('the grasshopper needs all three timed cheers to win without cross-lane damage',()=>{
  for(let target=0;target<=3;target++){
    const game=atFinale({...newJourney(),next:3});
    game.p.inv=100;
    const motherHp=game.mother.hp;
    assert.equal(game.getInteraction().disabled,true);
    game.interact();
    assert.equal(game.duel.cheersLeft,3);
    for(let i=0;i<1800&&!game.duel.aiDone;i++){
      if(game.canCheer&&3-game.duel.cheersLeft<target){
        const previous=game.duel.cheersLeft;
        game.interact();
        game.interact();
        assert.equal(game.duel.cheersLeft,previous-1);
      }
      tick(game);
    }
    assert.equal(game.duel.cheersLeft,3-target);
    assert.equal(game.duel.father===0,target===3);
    assert.equal(game.duel.spouse===0,target<3);
    assert.equal(game.mother.hp,motherHp);
    assert.equal(game.p.hp,game.maxHp);
    defeatMother(game);
    assert.equal(game.profile.journey.ending,target===3?'perfect':'collar');
  }
});

test('elapsed time cannot award an ending while the mother is undefeated',()=>{
  const game=atFinale({...newJourney(),next:3});
  game.p.inv=100;
  tick(game,60*30);
  assert.equal(game.duel.spouse,0);
  assert.equal(game.duel.playerDone,false);
  assert.equal(game.mode,'playing');
  assert.equal(game.progress.cleared,false);
  defeatMother(game);
  assert.equal(game.profile.journey.ending,'collar');
});

test('a mother victory lets the upper duel settle within three seconds',()=>{
  const game=atFinale({...newJourney(),next:3,hits:9});
  defeatMother(game);
  assert.equal(game.duel.playerDone,true);
  assert.equal(game.mode,'playing');
  tick(game,180);
  assert.equal(game.mode,'result');
  assert.equal(game.profile.journey.ending,'collar');
  assert.deepEqual(game.profile.endings,['collar']);
});

test('the dressed companion follows the ant and faces it from either side after the crossing',()=>{
  const game=new ThresholdGame(freshProfile());
  game.start();
  assert.equal(game.metSpouse,false);
  game.p.x=2440;
  tick(game);
  assert.equal(game.metSpouse,true);
  assert.equal(game.companionPose.flip,false);
  game.p.x=2550;
  tick(game);
  game.p.x=3970;
  game.p.dir=1;
  tick(game,300);
  assert.ok(game.companionPose.x<game.p.x);
  assert.equal(game.companionPose.flip,true);
  game.input.left=true;
  tick(game,28);
  assert.ok(game.companionPose.x>game.p.x+game.p.w/2);
  assert.equal(game.companionPose.flip,false);

  game.start(true);
  assert.equal(game.metSpouse,true);
  assert.equal(game.companionPose.flip,false);
});

test('journey counts carry between chapters, ignore invulnerability and survive restart',()=>{
  const profile=freshProfile();
  const living=new Game(profile);
  living.start();living.p.inv=0;living.hurt();living.hurt();
  assert.equal(profile.journey.hits,1);
  living.restart();
  assert.equal(profile.journey.hits,1);
  living.finish();
  const kitchen=new KitchenGame(profile);
  kitchen.start();
  kitchen.p.hp=1;kitchen.p.inv=0;kitchen.hurt();
  assert.equal(profile.journey.hits,2);
  assert.equal(profile.journey.deaths,1);
  kitchen.finish();
  const raw=JSON.parse(JSON.stringify(profile));
  assert.deepEqual(restoreJourney(raw,profile),{tracked:true,next:3,hits:2,deaths:1,ending:null});
  assert.equal(endingFor(raw.journey,false),'drag');
});

test('ending boundaries use the spouse result and cumulative deaths, and legacy records cannot earn an ending',()=>{
  const base={...newJourney(),next:3,hits:12};
  for(const [spouseWon,deaths,id] of [[true,0,'perfect'],[true,1,'ordinary'],[true,3,'ordinary'],[false,0,'collar'],[false,1,'drag'],[false,2,'drag'],[false,3,'carry']])
    assert.equal(endingFor({...base,deaths},spouseWon),id);
  const old={...freshProfile(),cleared:true,chapter2:{cleared:true}};
  const legacy=restoreJourney(old,old);
  assert.equal(legacy.next,3);
  assert.equal(endingFor(legacy,true),null);
  const game=atFinale(legacy);
  while(!game.duel.aiDone)game.aiHit('spouse','father');
  defeatMother(game);
  assert.equal(game.mode,'result');
  assert.equal(game.endingResult.id,null);
  assert.equal(game.profile.journey.ending,null);
  assert.equal(cleanStage3({run:{cp:2,bossHp:1}}).run.bossHp,1);
  assert.equal(cleanStage3({run:{cp:2}}).run.bossHp,12);
});

test('rendering the spouse at the laundry basket keeps the stage drawable', async () => {
  const {drawThresholdDetails}=await import('../dist/stage3-view.js');
  const game=new ThresholdGame(freshProfile());
  game.start();
  game.p.x=2391;
  const noop=()=>{};
  const ctx={save:noop,restore:noop,beginPath:noop,moveTo:noop,quadraticCurveTo:noop,lineTo:noop,closePath:noop,fill:noop,stroke:noop};
  const sprite={};
  const drawn=[];
  const view={rr:noop,ellipse:noop,text:noop,doorway:noop,images:{grass:sprite},
    imageCell:(image,...args)=>drawn.push({image,y:args[5]})};
  drawThresholdDetails(ctx,game,view);
  assert.equal(drawn.length,1);
  assert.equal(drawn[0].image,sprite);
  assert.equal(drawn[0].y,473);
});
