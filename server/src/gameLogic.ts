import { GameState, Player, Card, Rank, Suit, RoundResult, GamePhase } from './types';
import { evaluateBestHand, compareHands } from './handEvaluator';

const RANKS: Rank[] = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];
const SUITS: Suit[] = ['spades', 'hearts', 'diamonds', 'clubs'];

export function createDeck(): Card[] {
  return SUITS.flatMap((suit) => RANKS.map((rank) => ({ suit, rank })));
}

export function shuffleDeck(deck: Card[]): Card[] {
  const d = [...deck];
  for (let i = d.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [d[i], d[j]] = [d[j], d[i]];
  }
  return d;
}

// Returns ordered list of active (non-eliminated) player indices starting from afterIdx+1
function activeIndicesFrom(players: Player[], afterIdx: number): number[] {
  const n = players.length;
  const result: number[] = [];
  for (let step = 1; step <= n; step++) {
    const i = (afterIdx + step) % n;
    if (players[i].status !== 'eliminated') result.push(i);
  }
  return result;
}

export function initHand(gameState: GameState, smallBlind: number): GameState {
  const bigBlind = smallBlind * 2;
  const players: Player[] = gameState.players.map((p) => ({
    ...p,
    bet: 0,
    totalBet: 0,
    holeCards: [],
    status: p.status === 'eliminated' ? 'eliminated' : 'active',
    isDealer: false,
    isSmallBlind: false,
    isBigBlind: false,
    isCurrentTurn: false,
  }));

  const eligible = players.map((p, i) => ({ p, i })).filter(({ p }) => p.status !== 'eliminated');
  if (eligible.length < 2) return gameState;

  // Rotate dealer
  const prevDealerEligPos = eligible.findIndex(({ i }) => i === gameState.dealerIndex);
  const dealerEligPos = (prevDealerEligPos + 1) % eligible.length;
  const dealerIdx = eligible[dealerEligPos].i;

  let sbEligPos: number, bbEligPos: number;
  if (eligible.length === 2) {
    // Heads-up: dealer = SB
    sbEligPos = dealerEligPos;
    bbEligPos = (dealerEligPos + 1) % 2;
  } else {
    sbEligPos = (dealerEligPos + 1) % eligible.length;
    bbEligPos = (dealerEligPos + 2) % eligible.length;
  }
  const sbIdx = eligible[sbEligPos].i;
  const bbIdx = eligible[bbEligPos].i;

  players[dealerIdx].isDealer = true;
  players[sbIdx].isSmallBlind = true;
  players[bbIdx].isBigBlind = true;

  // Deal hole cards clockwise starting from player after dealer
  const deck = shuffleDeck(createDeck());
  let deckCursor = 0;
  for (let round = 0; round < 2; round++) {
    for (let step = 1; step <= players.length; step++) {
      const idx = (dealerIdx + step) % players.length;
      if (players[idx].status !== 'eliminated') {
        players[idx].holeCards.push(deck[deckCursor++]);
      }
    }
  }

  // Post blinds
  let pot = 0;
  const sbAmt = Math.min(smallBlind, players[sbIdx].chips);
  players[sbIdx].chips -= sbAmt;
  players[sbIdx].bet = sbAmt;
  players[sbIdx].totalBet = sbAmt;
  if (players[sbIdx].chips === 0) players[sbIdx].status = 'all-in';
  pot += sbAmt;

  const bbAmt = Math.min(bigBlind, players[bbIdx].chips);
  players[bbIdx].chips -= bbAmt;
  players[bbIdx].bet = bbAmt;
  players[bbIdx].totalBet = bbAmt;
  if (players[bbIdx].chips === 0) players[bbIdx].status = 'all-in';
  pot += bbAmt;

  // Pre-flop betting order: UTG→...→SB→BB (BB has option)
  const playersToAct: string[] = [];
  for (let step = 0; step < eligible.length; step++) {
    const eligPos = (bbEligPos + 1 + step) % eligible.length;
    const idx = eligible[eligPos].i;
    if (players[idx].status === 'active') {
      playersToAct.push(players[idx].sessionId);
    }
  }

  let currentPlayerIndex = -1;
  if (playersToAct.length > 0) {
    currentPlayerIndex = players.findIndex((p) => p.sessionId === playersToAct[0]);
    if (currentPlayerIndex >= 0) players[currentPlayerIndex].isCurrentTurn = true;
  }

  return {
    ...gameState,
    phase: 'pre-flop',
    players,
    communityCards: [],
    pot,
    sidePots: [],
    currentPlayerIndex,
    dealerIndex: dealerIdx,
    smallBlindIndex: sbIdx,
    bigBlindIndex: bbIdx,
    currentBet: bigBlind,
    lastRaiseAmount: bigBlind,
    deck: deck.slice(deckCursor),
    playersToAct,
    handNumber: gameState.handNumber + 1,
  };
}

export function processAction(
  gs: GameState,
  sessionId: string,
  action: 'fold' | 'check' | 'call' | 'raise' | 'all_in',
  amount?: number,
): GameState {
  const playerIdx = gs.players.findIndex((p) => p.sessionId === sessionId);
  if (playerIdx === -1) return gs;

  const players = gs.players.map((p) => ({ ...p }));
  const player = players[playerIdx];
  let pot = gs.pot;
  let currentBet = gs.currentBet;
  let lastRaiseAmount = gs.lastRaiseAmount;
  let didRaise = false;

  switch (action) {
    case 'fold':
      player.status = 'folded';
      break;

    case 'check':
      // nothing changes
      break;

    case 'call': {
      const toCall = Math.min(currentBet - player.bet, player.chips);
      pot += toCall;
      player.chips -= toCall;
      player.bet += toCall;
      player.totalBet += toCall;
      if (player.chips === 0) player.status = 'all-in';
      break;
    }

    case 'raise': {
      const raiseTotal = Math.min(amount ?? currentBet * 2, player.chips + player.bet);
      const additional = raiseTotal - player.bet;
      if (additional <= 0) break;
      pot += additional;
      player.chips -= additional;
      player.bet = raiseTotal;
      player.totalBet += additional;
      lastRaiseAmount = raiseTotal - currentBet;
      currentBet = raiseTotal;
      if (player.chips === 0) player.status = 'all-in';
      didRaise = true;
      break;
    }

    case 'all_in': {
      const allInTotal = player.chips + player.bet;
      const additional = player.chips;
      pot += additional;
      player.totalBet += additional;
      player.bet = allInTotal;
      player.chips = 0;
      player.status = 'all-in';
      if (allInTotal > currentBet) {
        lastRaiseAmount = allInTotal - currentBet;
        currentBet = allInTotal;
        didRaise = true;
      }
      break;
    }
  }

  player.isCurrentTurn = false;

  // Update playersToAct
  let playersToAct = gs.playersToAct.filter((id) => id !== sessionId);

  if (didRaise) {
    // Rebuild: all active players after raiser, clockwise
    const n = players.length;
    playersToAct = [];
    for (let step = 1; step < n; step++) {
      const idx = (playerIdx + step) % n;
      if (players[idx].status === 'active') {
        playersToAct.push(players[idx].sessionId);
      }
    }
  }

  // Advance to next player
  let currentPlayerIndex = gs.currentPlayerIndex;
  if (playersToAct.length > 0) {
    const nextId = playersToAct[0];
    const nextIdx = players.findIndex((p) => p.sessionId === nextId);
    if (nextIdx >= 0) {
      players[nextIdx].isCurrentTurn = true;
      currentPlayerIndex = nextIdx;
    }
  }

  return { ...gs, players, pot, currentBet, lastRaiseAmount, playersToAct, currentPlayerIndex };
}

export function isBettingRoundComplete(gs: GameState): boolean {
  return gs.playersToAct.length === 0;
}

export function activeNonFoldedCount(gs: GameState): number {
  return gs.players.filter((p) => p.status === 'active' || p.status === 'all-in').length;
}

export function advancePhase(gs: GameState): GameState {
  const deck = [...gs.deck];

  const phaseOrder: GamePhase[] = ['pre-flop', 'flop', 'turn', 'river', 'showdown'];
  const nextPhaseMap: Partial<Record<GamePhase, GamePhase>> = {
    'pre-flop': 'flop',
    flop: 'turn',
    turn: 'river',
    river: 'showdown',
  };

  const newPhase = nextPhaseMap[gs.phase] ?? 'showdown';
  let communityCards = [...gs.communityCards];

  if (newPhase === 'flop') {
    deck.shift(); // burn
    communityCards = [deck.shift()!, deck.shift()!, deck.shift()!];
  } else if (newPhase === 'turn' || newPhase === 'river') {
    deck.shift(); // burn
    communityCards.push(deck.shift()!);
  }

  if (newPhase === 'showdown') {
    return { ...gs, phase: 'showdown', communityCards, deck };
  }

  // Reset bets for new round
  const players = gs.players.map((p) => ({ ...p, bet: 0, isCurrentTurn: false }));

  // Build playersToAct: left of dealer, all active players
  const playersToAct: string[] = [];
  const n = players.length;
  for (let step = 1; step <= n; step++) {
    const idx = (gs.dealerIndex + step) % n;
    if (players[idx].status === 'active') {
      playersToAct.push(players[idx].sessionId);
    }
  }

  let currentPlayerIndex = gs.currentPlayerIndex;
  if (playersToAct.length > 0) {
    const firstId = playersToAct[0];
    const firstIdx = players.findIndex((p) => p.sessionId === firstId);
    if (firstIdx >= 0) {
      players[firstIdx].isCurrentTurn = true;
      currentPlayerIndex = firstIdx;
    }
  }

  return {
    ...gs,
    phase: newPhase,
    communityCards,
    deck,
    players,
    currentBet: 0,
    lastRaiseAmount: 0,
    playersToAct,
    currentPlayerIndex,
  };
}

export function resolveShowdown(gs: GameState): RoundResult {
  const { players, communityCards } = gs;
  const nonFolded = players.filter((p) => p.status === 'active' || p.status === 'all-in');

  const allPlayerHands = players.map((p) => ({
    playerId: p.sessionId,
    playerName: p.name,
    holeCards: p.holeCards,
    hand: p.status !== 'folded' && p.status !== 'eliminated'
      ? evaluateBestHand(p.holeCards, communityCards)
      : null,
    status: p.status,
  }));

  const winnerMap = new Map<string, number>(); // sessionId → amount won

  if (nonFolded.length === 1) {
    const w = nonFolded[0];
    const total = players.reduce((s, p) => s + p.totalBet, 0);
    winnerMap.set(w.sessionId, total);
  } else {
    // Calculate pots using all-in levels
    const allInLevels = [...new Set(
      players.filter((p) => p.status === 'all-in').map((p) => p.totalBet)
    )].sort((a, b) => a - b);

    const levels = [...allInLevels];
    // Add a final level for the max totalBet
    const maxTotalBet = Math.max(...players.map((p) => p.totalBet));
    if (!levels.includes(maxTotalBet)) levels.push(maxTotalBet);

    let prevLevel = 0;
    for (const level of levels) {
      if (level <= prevLevel) continue;

      // Calculate pot for this level
      let potSlice = 0;
      const eligible: string[] = [];
      for (const p of players) {
        const contrib = Math.min(p.totalBet, level) - Math.min(p.totalBet, prevLevel);
        potSlice += contrib;
        if (
          (p.status === 'active' || p.status === 'all-in') &&
          p.totalBet >= level
        ) {
          eligible.push(p.sessionId);
        }
      }

      if (potSlice === 0 || eligible.length === 0) { prevLevel = level; continue; }

      // Find winner(s) among eligible
      const eligibleHands = allPlayerHands
        .filter((ph) => eligible.includes(ph.playerId) && ph.hand && ph.hand.rank >= 0)
        .sort((a, b) => compareHands(b.hand!, a.hand!));

      if (eligibleHands.length === 0) { prevLevel = level; continue; }

      const bestHand = eligibleHands[0].hand!;
      const potWinners = eligibleHands.filter(
        (ph) => compareHands(ph.hand!, bestHand) === 0
      );

      const perWinner = Math.floor(potSlice / potWinners.length);
      const remainder = potSlice - perWinner * potWinners.length;
      potWinners.forEach((pw, idx) => {
        const amt = perWinner + (idx === 0 ? remainder : 0);
        winnerMap.set(pw.playerId, (winnerMap.get(pw.playerId) ?? 0) + amt);
      });

      prevLevel = level;
    }
  }

  const winners = [...winnerMap.entries()].map(([sessionId, amount]) => {
    const p = players.find((pl) => pl.sessionId === sessionId)!;
    const hand = allPlayerHands.find((ph) => ph.playerId === sessionId)?.hand;
    return {
      playerId: sessionId,
      playerName: p.name,
      amount,
      hand: hand ?? { rank: -1, name: 'Unknown', cards: [], tiebreakers: [] },
      holeCards: p.holeCards,
    };
  });

  return { winners, allPlayerHands };
}

export function applyRoundResult(gs: GameState, result: RoundResult): GameState {
  const players = gs.players.map((p) => {
    const won = result.winners.find((w) => w.playerId === p.sessionId);
    const newChips = p.chips + (won?.amount ?? 0);
    return {
      ...p,
      chips: newChips,
      status: newChips === 0 ? ('eliminated' as const) : ('active' as const),
      bet: 0,
      totalBet: 0,
      holeCards: p.holeCards,
      isCurrentTurn: false,
    };
  });
  return { ...gs, players, pot: 0, sidePots: [], communityCards: gs.communityCards };
}
