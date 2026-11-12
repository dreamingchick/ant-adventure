import test from 'node:test';
import assert from 'node:assert/strict';
import { Game, FLOOR, freshProfile, sanitize } from '../dist/engine.js';
import { KitchenGame, cleanStage2, KITCHEN_CHECKPOINTS, DRIPS } from '../dist/stage2-engine.js';
import { createProfileStore } from '../dist/profile-store.js';

const tick = (game, seconds = 1 / 60) => {
  for (let i = 0; i < seconds * 60; i++) game.update(1 / 60);
};
const create = (profile = freshProfile(), emit) => {
  const game = new KitchenGame(profile, emit);
  game.start(Boolean(game.progress.run));
  return game;
};

test('chapter 2 uses the current profile upgrades and keeps chapter 1 progress independent', () => {
  const old = freshProfile();
  Object.assign(old, { name: '검수개미', cleared: true, bossReward: true, bank: 80, best: 87 });
  old.levels = { health: 1, spit: 2, regen: 3 };
  const profile = sanitize(JSON.parse(JSON.stringify(old)));
  const game = create(profile);
  assert.equal(game.p.hp, 4);
  assert.equal(game.p.spit, 150);
  assert.equal(game.regen, 40);
  assert.equal(profile.best, 87);
  assert.equal(profile.name, '검수개미');
  assert.equal(profile.run, null);
  assert.equal(game.progress.run.bossHp, 18);
  const livingRoom = new Game(profile);
  livingRoom.start();
  assert.equal(livingRoom.progress.run.bossHp, 14);
  assert.equal(game.progress.run.bossHp, 18);
});

test('chapter 2 checkpoint confirms sugar once and retries restore only current progress', () => {
  const game = create();
  game.pending.add('s0');
  game.p.hp = 1;
  game.p.spit = 7;
  game.checkpoint(1);
  assert.equal(game.profile.bank, 1);
  assert.equal(game.p.hp, 3);
  assert.equal(game.p.spit, 100);
  game.p.hp = 2;
  game.checkpoint(1);
  assert.equal(game.p.hp, 2);
  game.pending.add('s1');
  game.retry();
  assert.equal(game.p.x, KITCHEN_CHECKPOINTS[1].x);
  assert.equal(game.p.hp, 3);
  assert.equal(game.pending.size, 0);
  assert.deepEqual([...game.collected], ['s0']);
  game.restart();
  assert.equal(game.profile.bank, 1);
  assert.ok(game.collected.has('s0'));
});

test('a water drop telegraphs before hurting and returns the player to a safe spot', () => {
  const game = create();
  game.checkpoint(1);
  game.p.x = DRIPS[0].x - 20;
  game.p.inv = 0;
  game.pending.add('s0');
  tick(game, .92);
  assert.equal(game.p.hp, 3);
  tick(game, .31);
  assert.equal(game.p.hp, 2);
  assert.ok(game.p.x < DRIPS[0].x - DRIPS[0].reach);
  assert.ok(game.pending.has('s0'));
});

test('guard health survives reload and a defeated guard opens the exit until the chapter is cleared', () => {
  const game = create();
  game.checkpoint(2);
  game.p.x = 5400;
  tick(game);
  assert.ok(game.bossActive);
  const guard = game.enemies.find(enemy => enemy.boss);
  const hit = () => {
    game.shots.push({ x: guard.x + 30, y: FLOOR - 40, left: 20, vx: 0 });
    game.updateProjectiles(1 / 60);
  };
  hit();
  assert.equal(game.progress.run.bossHp, 17);
  const resumed = create(JSON.parse(JSON.stringify(game.profile)));
  assert.equal(resumed.enemies.find(enemy => enemy.boss).hp, 17);
  for (let i = 0; i < 17; i++) hit();
  assert.equal(game.mode, 'playing');
  assert.equal(game.progress.run.bossHp, 0);
  assert.equal(game.arena, false);
  game.retry();
  assert.equal(game.enemies.find(enemy => enemy.boss).dead, true);
  game.p.x = game.stage.exitRequired;
  tick(game);
  assert.equal(game.mode, 'result');
  assert.equal(game.progress.cleared, true);
  assert.equal(game.progress.run, null);
  game.start();
  assert.equal(game.enemies.find(enemy => enemy.boss).hp, 18);
});

test('stale concurrent saves cannot overwrite a confirmed balance under the shared lock', async () => {
  const entries = new Map();
  const storage = {
    getItem: key => entries.get(key) ?? null,
    setItem: (key, value) => entries.set(key, value),
  };
  let locked = Promise.resolve();
  const locks = { request: (_key, write) => locked = locked.then(write) };
  const first = createProfileStore(storage, 'profile', locks);
  const second = createProfileStore(storage, 'profile', locks);
  assert.deepEqual(await Promise.all([first.save({bank: 1}), second.save({bank: 2})]), [true, false]);
  assert.deepEqual(JSON.parse(storage.getItem('profile')), {bank: 1});
});

test('old draft progress and malformed new checkpoint records do not enter the new layout', () => {
  assert.equal(cleanStage2({ checkpoint: 3700, elapsed: 32 }).run, null);
  assert.equal(cleanStage2({ run: { cp: 999 } }).run, null);
  assert.equal(cleanStage2({ run: { cp: 2, bossHp: 0 } }).run.bossHp, 0);
});

test('balance update preserves already landed hits, defeated guards and clear records', () => {
  const before = { cleared: true, best: 46, run: { cp: 2, bossHp: 4 } };
  const after = cleanStage2(before);
  assert.equal(after.run.bossHp, 16);
  assert.equal(after.cleared, true);
  assert.equal(after.best, 46);
  assert.equal(cleanStage2(after).run.bossHp, 16);
  assert.equal(cleanStage2({ run: { cp: 2, bossHp: 0 } }).run.bossHp, 0);
});

test('kitchen guard targets a fixed landing and the ground wave can be jumped', () => {
  const game = create();
  const guard = game.enemies.find(enemy => enemy.boss);
  game.bossActive = true;
  game.p.x = 5530;
  guard.cool = 0;
  guard.pattern = 1;
  game.updateBoss(guard, 1 / 60, game.p.x - guard.x);
  const landing = guard.landing;
  assert.equal(guard.state, 'warn');
  assert.ok(landing < guard.x);
  game.p.x = 5970;
  for (let i = 0; i < 110 && guard.state !== 'rest'; i++) game.updateBoss(guard, 1 / 60, game.p.x - guard.x);
  assert.equal(guard.x, landing);
  assert.deepEqual(game.guardWaves.map(wave => wave.dir), [-1,1]);

  const wave = game.guardWaves[1];
  game.p.x = wave.x + 5 - game.p.w / 2;
  game.p.y = FLOOR - game.p.h - 75;
  game.p.inv = 0;
  game.updateGuardWaves(1 / 60);
  assert.equal(game.p.hp, 3);
  game.p.y = FLOOR - game.p.h;
  game.updateGuardWaves(1 / 60);
  assert.equal(game.p.hp, 2);
  game.retry();
  assert.deepEqual(game.guardWaves, []);
});

test('complete the kitchen through cabinet, sink, cap, rope and guard using base controls', () => {
  const game = create();
  const move = (target, frames = 1200) => {
    for (let i = 0; i < frames && game.p.x < target; i++) {
      const p = game.p;
      game.input.right = game.input.jump = true;
      const obstacle = game.world.solids.some(s =>
        s.type !== 'floor' && s.x >= p.x + p.w && s.x < p.x + 115 && s.y < p.y + p.h && s.y > p.y - 165);
      if (p.ground && obstacle) game.jump();
      tick(game);
    }
    game.input.right = false;
    assert.ok(game.p.x >= target, 'reach x=' + target);
  };
  move(1160);
  tick(game, .25);
  game.interact();
  assert.equal(game.p.climb?.id, 'cabinet');
  game.input.right = true;
  tick(game, 4.6);
  game.jump();
  tick(game, .85);
  move(3030);
  assert.equal(game.cp, 1);
  tick(game, .25);
  game.interact();
  game.input.right = true;
  tick(game, 2.3);
  assert.equal(game.world.crate.x, game.stage.crateMax);
  game.input.right = false;
  game.interact();
  game.input.jump = game.input.right = true;
  game.jump();
  tick(game, .92);
  assert.ok(game.p.ground);
  game.jump();
  move(3440);
  tick(game, .43);
  game.interact();
  assert.ok(game.p.rope);
  game.input.right = true;
  tick(game, 1.1);
  game.jump();
  tick(game, 1.5);
  move(5150);
  assert.equal(game.cp, 2);
  for (let frame = 0; frame < 7200 && game.mode === 'playing'; frame++) {
    const player = game.p;
    const guard = game.enemies.find(enemy => enemy.boss);
    game.input.jump = true;
    game.input.right = guard.dead || player.x < guard.x - 130;
    game.input.left = !guard.dead && player.x > guard.x - 90;
    if (player.ground && (guard.state === 'charge' || guard.state === 'slam') &&
        Math.abs(guard.x - player.x) < 220) game.jump();
    if (!guard.dead) {
      player.dir = guard.x > player.x ? 1 : -1;
      game.attack();
    }
    tick(game);
  }
  assert.equal(game.mode, 'result');
  assert.equal(game.progress.cleared, true);
  assert.ok(game.profile.bank > 0);
  assert.equal(game.profile.levels.health, 0);
});
