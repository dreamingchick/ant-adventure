export const ENDINGS = {
  ordinary: { title: '평범한 부부', caption: '두 곤충은 나란히 신혼집 문턱을 넘었다.', art: 'assets/endings/ordinary.webp', alt: '웨딩드레스를 입은 개미와 턱시도를 입은 베짱이가 손을 잡고 나란히 걷는다.' },
  collar: { title: '베짱이 멱살을 잡고 들어가는 개미', caption: '베짱이가 발버둥쳤지만, 개미는 옷깃을 놓지 않았다.', art: 'assets/endings/collar-v2.webp', alt: '턱시도 옷깃을 잡힌 베짱이가 몸을 비틀며 발버둥친다.' },
  drag: { title: '베짱이 다리를 잡고 끌고 들어가는 개미', caption: '도망치려던 베짱이는 개미에게 뒷다리를 붙잡혔다.', art: 'assets/endings/drag-v2.webp', alt: '뒷다리를 잡힌 베짱이가 반대 방향으로 몸을 뻗으며 도망치려 한다.' },
  carry: { title: '개미를 업고 들어가는 베짱이', caption: '베짱이는 이를 악물고 지친 개미를 업은 채 문턱을 넘었다.', art: 'assets/endings/carry-v2.webp', alt: '개미를 업은 베짱이가 고통스러운 표정으로 몸을 숙여 걷는다.' },
  perfect: { title: '현모양처 개미', caption: '개미는 베짱이의 옷매무새를 다듬고 두 손을 맞잡았다.', art: 'assets/endings/perfect.webp', alt: '황금빛 문 앞에서 개미가 베짱이의 나비넥타이를 매만진다.' },
};

const count = value => Number.isSafeInteger(value) && value >= 0 ? value : 0;

export function newJourney() {
  return { tracked: true, next: 1, hits: 0, deaths: 0, ending: null };
}

export function unlockedEndings(profile) {
  const saved = Array.isArray(profile.endings) ? profile.endings : [];
  return [...new Set([...saved, profile.journey?.ending].filter(id => Object.hasOwn(ENDINGS, id)))];
}

export function restoreJourney(raw, profile) {
  const journey = raw?.journey;
  if (journey && Number.isInteger(journey.next) && journey.next >= 1 && journey.next <= 4) {
    const ending = Object.hasOwn(ENDINGS, journey.ending) ? journey.ending : null;
    return {
      tracked: journey.tracked === true && count(journey.hits) === journey.hits && count(journey.deaths) === journey.deaths,
      next: journey.next, hits: count(journey.hits), deaths: count(journey.deaths), ending,
    };
  }
  if (profile.chapter2?.cleared || profile.cleared || profile.run) {
    return { ...newJourney(), tracked: false, next: profile.chapter2?.cleared ? 3 : profile.cleared ? 2 : 1 };
  }
  return null;
}

export function recordDamage(journey, chapter, died) {
  if (!journey || journey.next !== chapter || journey.ending) return;
  journey.hits++;
  if (died) journey.deaths++;
}

export function endingFor(journey, spouseWon) {
  if (!journey?.tracked || journey.next !== 3) return null;
  if (spouseWon) return journey.deaths === 0 ? 'perfect' : 'ordinary';
  if (journey.deaths >= 3) return 'carry';
  if (journey.deaths > 0) return 'drag';
  return 'collar';
}

export function advanceJourney(profile, chapter, ending) {
  const journey = profile.journey;
  if (!journey || journey.next !== chapter) return;
  if (chapter === 3 && Object.hasOwn(ENDINGS, ending)) {
    journey.ending = ending;
    profile.endings = [...new Set([...(profile.endings ?? []), ending])];
  }
  journey.next++;
}
