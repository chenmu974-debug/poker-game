import { Card, Rank, HandResult } from './types';

const RANK_VALUES: Record<Rank, number> = {
  '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, '8': 8,
  '9': 9, '10': 10, 'J': 11, 'Q': 12, 'K': 13, 'A': 14,
};

export const HAND_RANKS = {
  HIGH_CARD: 0,
  ONE_PAIR: 1,
  TWO_PAIR: 2,
  THREE_OF_A_KIND: 3,
  STRAIGHT: 4,
  FLUSH: 5,
  FULL_HOUSE: 6,
  FOUR_OF_A_KIND: 7,
  STRAIGHT_FLUSH: 8,
  ROYAL_FLUSH: 9,
} as const;

export const HAND_NAMES: Record<number, string> = {
  0: '高牌',
  1: '一对',
  2: '两对',
  3: '三条',
  4: '顺子',
  5: '同花',
  6: '葫芦',
  7: '四条',
  8: '同花顺',
  9: '皇家同花顺',
};

function getCombinations<T>(arr: T[], k: number): T[][] {
  if (k === 0) return [[]];
  if (arr.length < k) return [];
  const [first, ...rest] = arr;
  return [
    ...getCombinations(rest, k - 1).map((c) => [first, ...c]),
    ...getCombinations(rest, k),
  ];
}

function checkStraight(vals: number[]): { is: boolean; high: number } {
  const unique = [...new Set(vals)].sort((a, b) => b - a);
  for (let i = 0; i <= unique.length - 5; i++) {
    let consec = true;
    for (let j = 0; j < 4; j++) {
      if (unique[i + j] - unique[i + j + 1] !== 1) { consec = false; break; }
    }
    if (consec) return { is: true, high: unique[i] };
  }
  // Wheel: A-2-3-4-5
  if (
    unique.includes(14) && unique.includes(2) && unique.includes(3) &&
    unique.includes(4) && unique.includes(5)
  ) return { is: true, high: 5 };
  return { is: false, high: 0 };
}

function evaluate5(cards: Card[]): HandResult {
  const vals = cards.map((c) => RANK_VALUES[c.rank]);
  const suits = cards.map((c) => c.suit);
  const sorted = [...vals].sort((a, b) => b - a);
  const isFlush = suits.every((s) => s === suits[0]);
  const straight = checkStraight(vals);

  const counts = new Map<number, number>();
  for (const v of vals) counts.set(v, (counts.get(v) ?? 0) + 1);
  const groups = [...counts.entries()].sort((a, b) => b[1] - a[1] || b[0] - a[0]);
  const c = groups.map((g) => g[1]);
  const r = groups.map((g) => g[0]);

  if (isFlush && straight.is) {
    if (straight.high === 14)
      return { rank: HAND_RANKS.ROYAL_FLUSH, name: '皇家同花顺', cards, tiebreakers: [14] };
    return { rank: HAND_RANKS.STRAIGHT_FLUSH, name: '同花顺', cards, tiebreakers: [straight.high] };
  }
  if (c[0] === 4)
    return { rank: HAND_RANKS.FOUR_OF_A_KIND, name: '四条', cards, tiebreakers: [r[0], r[1]] };
  if (c[0] === 3 && c[1] === 2)
    return { rank: HAND_RANKS.FULL_HOUSE, name: '葫芦', cards, tiebreakers: [r[0], r[1]] };
  if (isFlush)
    return { rank: HAND_RANKS.FLUSH, name: '同花', cards, tiebreakers: sorted };
  if (straight.is)
    return { rank: HAND_RANKS.STRAIGHT, name: '顺子', cards, tiebreakers: [straight.high] };
  if (c[0] === 3)
    return { rank: HAND_RANKS.THREE_OF_A_KIND, name: '三条', cards, tiebreakers: [r[0], r[1], r[2]] };
  if (c[0] === 2 && c[1] === 2) {
    const pairs = [r[0], r[1]].sort((a, b) => b - a);
    return { rank: HAND_RANKS.TWO_PAIR, name: '两对', cards, tiebreakers: [...pairs, r[2]] };
  }
  if (c[0] === 2)
    return { rank: HAND_RANKS.ONE_PAIR, name: '一对', cards, tiebreakers: [r[0], r[1], r[2], r[3]] };
  return { rank: HAND_RANKS.HIGH_CARD, name: '高牌', cards, tiebreakers: sorted };
}

export function compareHands(a: HandResult, b: HandResult): number {
  if (a.rank !== b.rank) return a.rank - b.rank;
  for (let i = 0; i < Math.max(a.tiebreakers.length, b.tiebreakers.length); i++) {
    const diff = (a.tiebreakers[i] ?? 0) - (b.tiebreakers[i] ?? 0);
    if (diff !== 0) return diff;
  }
  return 0;
}

export function evaluateBestHand(holeCards: Card[], communityCards: Card[]): HandResult {
  const all = [...holeCards, ...communityCards];
  if (all.length < 5) {
    return { rank: -1, name: 'Unknown', cards: all, tiebreakers: [] };
  }
  const combos = getCombinations(all, 5);
  let best: HandResult | null = null;
  for (const combo of combos) {
    const h = evaluate5(combo);
    if (!best || compareHands(h, best) > 0) best = h;
  }
  return best!;
}
