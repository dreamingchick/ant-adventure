import { Game, makeEnemy, FLOOR } from './engine.js?v=1.0.0';

export const KITCHEN_WIDTH = 6450;
export const KITCHEN_CHECKPOINTS = [
  { x: 105, y: FLOOR, name: '거실 문턱' },
  { x: 1840, y: FLOOR, name: '수납장 너머 쉼터' },
  { x: 5100, y: FLOOR, name: '경비 앞 쉼터' },
];
const areas = [
  { x: 0, title: '거실 문턱', hint: '거실에서 부엌으로 · 낮은 턱을 넘어가세요' },
  { x: 850, title: '수납장 밑', hint: '붙기(X) → 오른쪽 이동 → 끝에서 점프' },
  { x: 1950, title: '싱크대 아래', hint: '물방울이 떨어진 뒤, 마른 받침을 건너세요' },
  { x: 2880, title: '식탁보 끝', hint: '병뚜껑을 끝까지 밀고 올라가 실밥을 잡으세요' },
  { x: 3930, title: '식탁보 너머', hint: '오른쪽으로 흔들다가 점프로 실밥을 놓으세요' },
  { x: 4500, title: '베짱이 순찰길', hint: '베짱이를 피하거나 침으로 길을 열어 보세요' },
  { x: 5050, title: '마지막 문턱', hint: '경비를 제압하면 부엌 출구가 열립니다' },
];
export const HAZARDS = [{ x: 1005, w: 94 }, { x: 1720, w: 54 }];
export const DRIPS = [{ x: 2180, reach: 54 }, { x: 2585, reach: 53 }];
export const dripPhase = time => time % 3;
export const dripHeight = phase => phase < .9 ? 283 : 286 + Math.min(1,(phase-.9)/.22)*288;
const GUARD_HP = 15;
const PREVIOUS_GUARD_HP = 6;
const GUARD_BALANCE = 3;
const WAVE_DURATION = .78;
const segment = (x, y, w, h, type = 'stone') => ({ x, y, w, h, type });
const createWorld = () => ({
  solids: [
    segment(0,FLOOR,1320,180,'floor'), segment(1630,FLOOR,1840,180,'floor'),
    segment(3930,FLOOR,2520,180,'floor'), segment(405,552,115,38),
    segment(630,491,145,99), segment(1690,477,155,30,'wood'),
    segment(2030,525,95,65), segment(2300,505,115,85), segment(2700,520,112,70),
    segment(3360,380,110,210,'wood'), segment(4035,395,180,28,'wood'),
    segment(4315,497,126,26), segment(4940,504,97,86),
  ],
  paths: [
    { id: 'cabinet', points: [{x:1213,y:552},{x:1213,y:357},{x:1665,y:357}], slip: false },
    { id: 'wet', points: [{x:2330,y:480},{x:2330,y:333},{x:2495,y:333}], slip: true },
  ],
  crate: { x: 3090, y: 515, w: 82, h: 75, start: 3090 },
  rope: { x: 3675, y: 165, length: 325, angle: -.62, velocity: 0 },
  heal: [{ id:'k1',x:2860,y:558,zone:1 }, { id:'k2',x:4860,y:558,zone:1 }],
  sugar: [],
});

const kitchen = {
  chapter: 2,
  width: KITCHEN_WIDTH, checkpoints: KITCHEN_CHECKPOINTS, areas, makeWorld: createWorld,
  bossHp: GUARD_HP, bossReward: 0, bossTrigger: 5350, arenaLeft: 5270, arenaRight: 6180,
  bossMin: 5420, bossMax: 6100, crateMin: 3030, crateMax: 3278, ropeRest: -.62,
  ropeReach: 100, exitRequired: 6270,
  sugar: [
    [215,545,5,41],[660,447,3,43],[1020,507,3,35],[1290,340,7,44],
    [1700,428,3,45],[2055,474,2,40],[2355,454,2,36],[2730,473,2,41],
    [3000,545,3,41],[3375,332,2,40],[4055,345,4,44],[4345,447,2,45],
    [4600,550,3,40],[4990,458,2,40],[6200,548,4,43],
  ],
  enemies: () => [
    makeEnemy('k-normal','normal',4560,1), makeEnemy('k-thin','thin',4840,1),
    { ...makeEnemy('k-guard','boss',5780,2,true), hp: GUARD_HP, max: GUARD_HP },
  ],
  respawnX: x => x < 1600 ? 1180 : 3005,
};

const finiteTime = value => Number.isFinite(value) && value > 0 ? value : 0;
export function cleanStage2(raw) {
  const best = finiteTime(raw?.best) || null;
  const clean = { balance: GUARD_BALANCE, cleared: raw?.cleared === true, bossReward: raw?.bossReward === true, best, bestLevels: raw?.bestLevels ?? null, run: null };
  const run = raw?.run;
  if (!run || !Number.isInteger(run.cp) || !KITCHEN_CHECKPOINTS[run.cp]) return clean;
  // Keep the number of hits already landed in a pre-balance run. A defeated guard stays defeated.
  const priorMax = raw.balance === GUARD_BALANCE ? GUARD_HP : raw.balance === 2 ? 18 : PREVIOUS_GUARD_HP;
  const priorHp = Number.isInteger(run.bossHp) ? Math.max(0, Math.min(priorMax, run.bossHp)) : priorMax;
  const bossHp = priorHp === 0 ? 0 : Math.max(0, GUARD_HP - (priorMax - priorHp));
  const ids = value => Array.isArray(value) ? [...new Set(value.filter(id => typeof id === 'string'))] : [];
  clean.run = {
    cp: run.cp, bossHp,
    collected: ids(run.collected).filter(id => /^s\d+$/.test(id)),
    dead: ids(run.dead).filter(id => id === 'k-normal' || id === 'k-thin'),
    activated: Array.isArray(run.activated) ? run.activated.filter(i => Number.isInteger(i) && KITCHEN_CHECKPOINTS[i]) : [],
    elapsed: finiteTime(run.elapsed), attemptSugar: Math.floor(finiteTime(run.attemptSugar)),
  };
  return clean;
}

export class KitchenGame extends Game {
  constructor(profile, emit) {
    super(profile, emit, kitchen);
    profile.chapter2 = cleanStage2(profile.chapter2);
    this.dripClocks = [];
    this.guardWaves = [];
  }

  get progress() { return this.profile.chapter2; }

  setup() {
    super.setup();
    this.dripClocks = DRIPS.map(() => 0);
    this.guardWaves = [];
  }

  updateBoss(guard, dt, dx) {
    const faster = guard.hp <= guard.max / 2;
    const { bossMin, bossMax } = this.stage;
    const bound = x => Math.max(bossMin, Math.min(bossMax - guard.w, x));
    switch (guard.state) {
      case 'walk':
        if (guard.cool > 0) {
          guard.x = bound(guard.x + Math.sign(dx) * 63 * dt);
          break;
        }
        guard.state = 'warn';
        guard.timer = faster ? .72 : .84;
        guard.dir = Math.sign(dx) || guard.dir;
        guard.pattern = (guard.pattern || 0) + 1;
        guard.landing = bound(this.p.x + (this.p.w - guard.w) / 2);
        break;
      case 'warn':
        guard.timer -= dt;
        if (guard.timer > 0) break;
        guard.state = guard.pattern % 2 === 1 ? 'charge' : 'slam';
        guard.duration = guard.state === 'charge' ? .94 : faster ? .65 : .75;
        guard.timer = guard.duration;
        guard.launchX = guard.x;
        this.sound('boss');
        break;
      case 'charge':
        guard.x = bound(guard.x + guard.dir * (faster ? 510 : 450) * dt);
        guard.timer -= dt;
        if (guard.timer <= 0) this.restGuard(guard, faster);
        break;
      case 'slam': {
        guard.timer -= dt;
        const progress = Math.min(1, 1 - guard.timer / guard.duration);
        guard.x = guard.launchX + (guard.landing - guard.launchX) * progress;
        guard.y = FLOOR - Math.sin(progress * Math.PI) * 153;
        if (guard.timer <= 0) {
          guard.y = FLOOR;
          const center = guard.x + guard.w / 2;
          this.guardWaves = [-1, 1].map(dir => ({ x: center, dir, ttl: WAVE_DURATION }));
          this.restGuard(guard, faster);
        }
        break;
      }
      case 'rest':
        guard.timer -= dt;
        if (guard.timer <= 0) {
          guard.state = 'walk';
          guard.cool = faster ? .4 : .55;
        }
        break;
    }
  }

  restGuard(guard, faster) {
    guard.state = 'rest';
    guard.timer = faster ? .85 : 1.05;
  }

  updateGuardWaves(dt) {
    if (!this.bossActive) {
      this.guardWaves = [];
      return;
    }
    const player = this.p;
    for (const wave of this.guardWaves) {
      wave.x += wave.dir * 335 * dt;
      wave.ttl -= dt;
      if (wave.ttl > 0 && Math.abs(player.x + player.w / 2 - wave.x) < 30 &&
          player.y + player.h > FLOOR - 23 && player.inv <= 0) {
        wave.ttl = 0;
        this.hurt();
      }
    }
    this.guardWaves = this.guardWaves.filter(wave =>
      wave.ttl > 0 && wave.x > this.stage.arenaLeft && wave.x < this.stage.arenaRight);
  }

  updateHazards(dt) {
    if (this.mode !== 'playing') return;
    this.updateGuardWaves(dt);
    const p = this.p;
    const center = p.x + p.w / 2;
    if (p.ground && HAZARDS.some(h => p.x + p.w > h.x && p.x < h.x + h.w && p.y + p.h > FLOOR - 14)) {
      this.hurt();
    }
    for (const [index, drip] of DRIPS.entries()) {
      if (Math.abs(center - drip.x) < 580) this.dripClocks[index] += dt;
      const phase = dripPhase(this.dripClocks[index]);
      const y = dripHeight(phase);
      if (phase < .9 || phase >= 1.2 || Math.abs(center - drip.x) >= drip.reach ||
          p.inv > 0 || y + 21 < p.y || y - 21 > p.y + p.h) continue;
      const lethal = p.hp <= 1;
      this.hurt();
      if (!lethal) {
        p.x = drip.x - drip.reach - 90;
        p.y = FLOOR - p.h;
        p.vx = 0;
        p.vy = 0;
      }
      break;
    }
  }
}
