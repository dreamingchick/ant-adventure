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
    tick(game,60*30);
    assert.equal(game.mode,'result');
    assert.equal(game.progress.cleared,true);
  }
});

test('duels are isolated and both player defeat and AI defeat allow the ending',()=>{
  for(const [source,target] of [['player','father'],['father','player'],['spouse','mother'],['mother','spouse']])
    assert.equal(canDuelHit(source,target),false);
  const game=atFinale({...newJourney(),next:3});
  assert.equal(game.aiHit('spouse','mother'),false);
  assert.equal(game.aiHit('father','player'),false);
  game.p.hp=1;game.p.inv=0;game.hurt();
  assert.equal(game.duel.playerDone,true);
  assert.equal(game.profile.journey.hits,1);
  assert.equal(game.profile.journey.deaths,1);
  assert.equal(game.progress.cleared,false);
  for(let i=0;i<5;i++)game.aiHit('father','spouse');
  tick(game);
  assert.equal(game.profile.journey.ending,'drag');
  assert.equal(game.progress.cleared,true);
  const bank=game.profile.bank;
  tick(game,120);
  assert.equal(game.profile.bank,bank);
  assert.deepEqual(game.profile.endings,['drag']);
});

test('a clean timed finish counts as perfect regardless of the AI duel result',()=>{
  for(const winner of ['father','spouse']){
    const game=atFinale({...newJourney(),next:3});
    const target=winner==='father'?'spouse':'father';
    while(!game.duel.aiDone)game.aiHit(winner,target);
    game.duel.elapsed=28;
    game.updateDuel(1/60);
    assert.equal(game.profile.journey.ending,'perfect');
  }
});

test('an early defeat while touching the mother settles both duels and opens the ending within three seconds',()=>{
  for(const advantage of ['father','spouse']){
    const game=atFinale({...newJourney(),next:3});
    const events=[];
    game.emit=event=>events.push(event);
    game.duel.advantage=advantage;
    game.p.x=game.mother.x+20;
    game.p.hp=1;
    game.p.inv=0;
    tick(game);
    assert.equal(game.p.hp,0);
    assert.equal(game.duel.playerDone,true);
    tick(game,30);
    assert.ok(game.mother.x>=game.p.x+game.p.w);
    tick(game,150);
    assert.equal(game.mode,'result');
    assert.equal(game.profile.journey.deaths,1);
    assert.equal(game.duel[advantage==='father'?'spouse':'father'],0);
    assert.equal(events.filter(event=>event.type==='result').length,1);
  }
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
  assert.equal(endingFor(raw.journey),'drag');
});

test('ending boundaries and untracked legacy saves do not grant a perfect result',()=>{
  const base={...newJourney(),next:3};
  for(const [hits,deaths,id] of [[0,0,'perfect'],[1,0,'ordinary'],[5,0,'ordinary'],[6,0,'collar'],[4,1,'drag'],[8,2,'drag'],[9,3,'carry']])
    assert.equal(endingFor({...base,hits,deaths}),id);
  const old={...freshProfile(),cleared:true,chapter2:{cleared:true}};
  const legacy=restoreJourney(old,old);
  assert.equal(legacy.next,3);
  assert.equal(endingFor(legacy),'ordinary');
  assert.equal(cleanStage3({run:{cp:2,bossHp:1}}).run.bossHp,12);
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
