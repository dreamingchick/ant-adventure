export const ENDINGS = {
  ordinary: { title: '평범한 부부', caption: '두 곤충은 나란히 신혼집 문턱을 넘었다.', art: 'assets/endings/ordinary.webp', alt: '웨딩드레스를 입은 개미와 턱시도를 입은 베짱이가 손을 잡고 나란히 걷는다.' },
  collar: { title: '베짱이 멱살을 잡고 들어가는 개미', caption: '“자, 들어가자.” 개미는 베짱이의 옷깃부터 잡았다.', art: 'assets/endings/collar.webp', alt: '개미가 베짱이의 턱시도 옷깃을 잡아당기며 열린 문으로 향한다.' },
  drag: { title: '베짱이 다리를 잡고 끌고 들어가는 개미', caption: '머뭇거리던 베짱이는 개미에게 다리를 잡힌 채 들어갔다.', art: 'assets/endings/drag.webp', alt: '개미가 길에 주저앉은 베짱이의 뒷다리를 잡고 문 쪽으로 끈다.' },
  carry: { title: '개미를 업고 들어가는 베짱이', caption: '베짱이는 지친 개미를 업고 마지막 문턱을 넘었다.', art: 'assets/endings/carry.webp', alt: '턱시도를 입은 베짱이가 베일을 쓴 개미를 등에 업고 걷는다.' },
  perfect: { title: '현모양처 개미', caption: '개미는 베짱이의 옷매무새를 다듬고 두 손을 맞잡았다.', art: 'assets/endings/perfect.webp', alt: '황금빛 문 앞에서 개미가 베짱이의 나비넥타이를 매만진다.' },
};

const count = value => Number.isSafeInteger(value) && value >= 0 ? value : 0;

export function newJourney() {
  return { tracked: true, next: 1, hits: 0, deaths: 0, ending: null };
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

export function endingFor(journey) {
  if (!journey?.tracked || journey.next !== 3) return 'ordinary';
  if (journey.deaths >= 3) return 'carry';
  if (journey.deaths > 0) return 'drag';
  if (journey.hits >= 6) return 'collar';
  return journey.hits > 0 ? 'ordinary' : 'perfect';
}

export function advanceJourney(profile, chapter) {
  const journey = profile.journey;
  if (!journey || journey.next !== chapter) return;
  if (chapter === 3) {
    journey.ending = endingFor(journey);
    profile.endings = [...new Set([...(profile.endings ?? []), journey.ending])];
  }
  journey.next++;
}
