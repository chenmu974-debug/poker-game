export type Suit = 'spades' | 'hearts' | 'diamonds' | 'clubs';
export type Rank = '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '10' | 'J' | 'Q' | 'K' | 'A';

export interface Card {
  suit: Suit;
  rank: Rank;
}

export type PlayerStatus = 'active' | 'folded' | 'all-in' | 'eliminated';
export type GamePhase = 'waiting' | 'pre-flop' | 'flop' | 'turn' | 'river' | 'showdown';

export interface Player {
  id: string;           // current socket ID
  sessionId: string;    // stable UUID for reconnection
  name: string;
  avatar: number;
  chips: number;
  bet: number;          // current betting round bet
  totalBet: number;     // total bet this hand
  holeCards: Card[];
  status: PlayerStatus;
  isDealer: boolean;
  isSmallBlind: boolean;
  isBigBlind: boolean;
  isCurrentTurn: boolean;
  isReady: boolean;
  isConnected: boolean;
  disconnectedAt?: number;
  seatIndex: number;
}

export interface SidePot {
  amount: number;
  eligiblePlayerIds: string[];
}

export interface RoomSettings {
  startingChips: number;
  smallBlind: number;
  maxPlayers: number;
}

export interface Room {
  code: string;
  hostSessionId: string;
  settings: RoomSettings;
  players: Player[];
  spectators: { socketId: string; name: string }[];
  gameState: GameState | null;
  isGameStarted: boolean;
}

export interface GameState {
  roomCode: string;
  phase: GamePhase;
  players: Player[];
  communityCards: Card[];
  pot: number;
  sidePots: SidePot[];
  currentPlayerIndex: number;
  dealerIndex: number;
  smallBlindIndex: number;
  bigBlindIndex: number;
  currentBet: number;
  lastRaiseAmount: number;
  deck: Card[];
  playersToAct: string[];  // session IDs of players who still need to act
  handNumber: number;
}

export interface HandResult {
  rank: number;
  name: string;
  cards: Card[];
  tiebreakers: number[];
}

export interface RoundResult {
  winners: {
    playerId: string;     // session ID
    playerName: string;
    amount: number;
    hand: HandResult;
    holeCards: Card[];
  }[];
  allPlayerHands: {
    playerId: string;
    playerName: string;
    holeCards: Card[];
    hand: HandResult | null;
    status: PlayerStatus;
  }[];
}

export interface PersonalizedGameState {
  roomCode: string;
  phase: GamePhase;
  players: PersonalizedPlayer[];
  communityCards: Card[];
  pot: number;
  sidePots: SidePot[];
  currentPlayerIndex: number;
  dealerIndex: number;
  smallBlindIndex: number;
  bigBlindIndex: number;
  currentBet: number;
  lastRaiseAmount: number;
  handNumber: number;
  mySessionId: string;
  isMyTurn: boolean;
  minRaise: number;
  maxRaise: number;
}

export interface PersonalizedPlayer {
  id: string;
  sessionId: string;
  name: string;
  avatar: number;
  chips: number;
  bet: number;
  totalBet: number;
  holeCards: Card[];     // actual cards for self, empty array for others
  isHoleCardsVisible: boolean;
  status: PlayerStatus;
  isDealer: boolean;
  isSmallBlind: boolean;
  isBigBlind: boolean;
  isCurrentTurn: boolean;
  isConnected: boolean;
  seatIndex: number;
}
