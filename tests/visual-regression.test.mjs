import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { Game, freshProfile, makeWorld } from '../dist/engine.js';
import { KitchenGame, HAZARDS, KITCHEN_CHECKPOINTS } from '../dist/stage2-engine.js';
const source = f => readFile(new URL('../dist/' + f, import.meta.url), 'utf8');

test('the ant faces up and down on the wall and stays upright in either ceiling direction', async () => {
  const app = await source('app.js');
  assert.match(app, /imageCell\(images\.ant,[^;]+pose\.flip,pose\.rotation\);/);
  assert.match(app, /for\(const path of g\.world\.paths\)drawClimbSupport\(path\)/);
  assert.match(app, /lineWidth=45;ctx\.stroke\(\)/);
  assert.deepEqual(makeWorld().paths.map(path => path.id), ['table','slip']);
  for (const game of [new Game(), new KitchenGame(freshProfile())]) {
    const path = game.world.paths[0];
    const corner = Math.abs(path.points[1].y - path.points[0].y);
    game.p.climb = path;
    game.p.pathT = 30;
    assert.deepEqual(game.antPose(), {rotation:-Math.PI/2,flip:false});
    game.p.dir = -1;
    assert.deepEqual(game.antPose(), {rotation:-Math.PI/2,flip:true});
    game.p.pathT = corner + 50;
    assert.deepEqual(game.antPose(), {rotation:0,flip:true});
    game.p.dir = 1;
    assert.deepEqual(game.antPose(), {rotation:0,flip:false});
    game.p.climb = null;
    game.p.rope = true;
    game.world.rope.velocity = -.4;
    assert.deepEqual(game.antPose(), {rotation:0,flip:true});
    game.p.rope = false;
    assert.deepEqual(game.antPose(), {rotation:0,flip:false});
  }
});

test('both chapters share one HUD, one control layout and one viewport manager', async () => {
  const [index, app, legacy] = await Promise.all(['index.html','app.js','stage2.html'].map(source));
  for (const token of ['class="vitals"', 'class="chapter"', 'id="spit-fill"', 'id="boss-health"', 'id="interact"', 'data-action="jump"'])
    assert.ok(index.includes(token), token);
  assert.match(app, /thresholdChapter\?ThresholdGame:kitchenChapter\?KitchenGame:Game/);
  assert.match(app, /mountViewport\(/);
  assert.match(legacy, /\.\/\?chapter=2/);
});

test('kitchen spikes have actual floor support and leave shelters clear', () => {
  const game = new KitchenGame(freshProfile());
  const floors = game.world.solids.filter(s => s.type === 'floor');
  for (const h of HAZARDS) {
    assert.ok(h.x > 850);
    assert.ok(floors.some(f => h.x >= f.x && h.x + h.w <= f.x + f.w));
    assert.ok(KITCHEN_CHECKPOINTS.every(c => c.x < h.x - 42 || c.x > h.x + h.w + 42));
  }
});
