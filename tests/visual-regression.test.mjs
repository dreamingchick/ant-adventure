import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { freshProfile, makeWorld } from '../dist/engine.js';
import { KitchenGame, HAZARDS, KITCHEN_CHECKPOINTS } from '../dist/stage2-engine.js';
const source = f => readFile(new URL('../dist/' + f, import.meta.url), 'utf8');

test('the ant stays upright and every climb path receives visible solid rails', async () => {
  const app = await source('app.js');
  assert.match(app, /imageCell\(images\.ant,[^;]+p\.dir<0\);/);
  assert.doesNotMatch(app, /p\.climb[^\n]*rotation/);
  assert.match(app, /for\(const path of g\.world\.paths\)drawClimbSupport\(path\)/);
  assert.match(app, /lineWidth=45;ctx\.stroke\(\)/);
  assert.deepEqual(makeWorld().paths.map(path => path.id), ['table','slip']);
});

test('both chapters share one HUD, one control layout and one viewport manager', async () => {
  const [index, app, legacy] = await Promise.all(['index.html','app.js','stage2.html'].map(source));
  for (const token of ['class="vitals"', 'class="chapter"', 'id="spit-fill"', 'id="interact"', 'data-action="jump"'])
    assert.ok(index.includes(token), token);
  assert.match(app, /kitchenChapter\?KitchenGame:Game/);
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
