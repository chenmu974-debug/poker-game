import { create } from 'zustand';

export type Suit = 'spades' | 'hearts' | 'diamonds' | 'clubs';
export type Rank = '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '10' | 'J' | 'Q' | 'K' | 'A';
export type PlayerStatus = 'active' | 'folded' | 'all-in' | 'eliminated';
export type GamePhase = 'waiting' | 'pre-flop' | 'flop' | 'turn' | 'river' | 'showdown';

export interface Card {
  suit: Suit;
  rank: Rank;
}

export interface PersonalizedPlayer {
  id: string;
  sessionId: string;
  name: string;
  avatar: number;
  chips: number;
  bet: number;
  totalBet: number;
  holeCards: Card[];
  isHoleCardsVisible: boolean;
  status: PlayerStatus;
  isDealer: boolean;
  isSmallBlind: boolean;
  isBigBlind: boolean;
  isCurrentTurn: boolean;
  isConnected: boolean;
  seatIndex: number;
}

export interface SidePot {
  amount: number;
  eligiblePlayerIds: string[];
}

export interface GameState {
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

export interface HandResult {
  rank: number;
  name: string;
  cards: Card[];
  tiebreakers: number[];
}

export interface WinnerInfo {
  playerId: string;
  playerName: string;
  amount: number;
  hand: HandResult;
  holeCards: Card[];
}

export interface RoomPlayer {
  sessionId: string;
  name: string;
  avatar: number;
  chips: number;
  isReady: boolean;
  isConnected: boolean;
  seatIndex: number;
}

export interface RoomState {
  code: string;
  hostSessionId: string;
  settings: {
    startingChips: number;
    smallBlind: number;
    maxPlayers: number;
  };
  players: RoomPlayer[];
  isGameStarted: boolean;
}

export interface Toast {
  id: string;
  message: string;
  type: 'info' | 'error' | 'success';
}

export interface FinalRanking {
  sessionId: string;
  name: string;
  avatar: number;
  chips: number;
  rank: number;
  isEliminated: boolean;
}

export interface FinalResult {
  rankings: FinalRanking[];
  winnerSessionId: string;
  loserSessionIds: string[];
  praiseText: string;
  tauntText: string;
  hostSessionId: string;
}

export interface ChatMessage {
  id: string;
  sessionId: string;
  name: string;
  avatar: number;
  message: string;
  timestamp: number;
}

export interface EmojiReaction {
  id: string;
  sessionId: string;
  name: string;
  emoji: string;
}

export interface FoldAnimation {
  id: string;
  sessionId: string;
  playerName: string;
}

export interface RedEnvelope {
  id: string;
  fromName: string;
  fromSessionId: string;
  toName: string | null;
  toSessionId: string | null;
  amount: number;
  perPerson?: number;
}

interface GameStore {
  // Identity
  mySessionId: string;
  myName: string;
  myAvatar: number;
  currentRoomCode: string | null;

  // Game state
  roomState: RoomState | null;
  gameState: GameState | null;
  gameLogs: string[];
  winners: WinnerInfo[];
  showWinnerOverlay: boolean;

  // Turn info
  isMyTurn: boolean;
  turnTimeLimit: number;
  canCheck: boolean;
  callAmount: number;
  minRaise: number;
  maxRaise: number;

  // Final result
  finalResult: FinalResult | null;

  // Chat & reactions
  chatMessages: ChatMessage[];
  emojiReactions: EmojiReaction[];
  foldAnimations: FoldAnimation[];
  isSpectator: boolean;
  voiceUsers: string[];

  // UI
  toasts: Toast[];

  // Actions
  setIdentity: (sessionId: string, name: string, avatar: number) => void;
  setRoomCode: (code: string | null) => void;
  setRoomState: (state: RoomState) => void;
  setGameState: (state: GameState) => void;
  addLog: (msg: string) => void;
  setLogs: (logs: string[]) => void;
  setWinners: (winners: WinnerInfo[]) => void;
  setShowWinnerOverlay: (show: boolean) => void;
  setTurnInfo: (info: { timeLimit: number; canCheck: boolean; callAmount: number; minRaise: number; maxRaise: number }) => void;
  setFinalResult: (result: FinalResult | null) => void;
  clearGameState: () => void;
  addToast: (message: string, type?: Toast['type']) => void;
  removeToast: (id: string) => void;
  reset: () => void;

  addChatMessage: (msg: ChatMessage) => void;
  addEmojiReaction: (reaction: EmojiReaction) => void;
  removeEmojiReaction: (id: string) => void;
  addFoldAnimation: (anim: FoldAnimation) => void;
  removeFoldAnimation: (id: string) => void;
  setIsSpectator: (v: boolean) => void;
  setVoiceUsers: (users: string[]) => void;
  addVoiceUser: (sessionId: string) => void;
  removeVoiceUser: (sessionId: string) => void;
}

export const useGameStore = create<GameStore>((set, get) => ({
  mySessionId: '',
  myName: '',
  myAvatar: 0,
  currentRoomCode: null,
  roomState: null,
  gameState: null,
  gameLogs: [],
  winners: [],
  showWinnerOverlay: false,
  isMyTurn: false,
  turnTimeLimit: 30,
  canCheck: false,
  callAmount: 0,
  minRaise: 0,
  maxRaise: 0,
  finalResult: null,
  chatMessages: [],
  emojiReactions: [],
  foldAnimations: [],
  isSpectator: false,
  voiceUsers: [],
  toasts: [],

  setIdentity: (sessionId, name, avatar) => set({ mySessionId: sessionId, myName: name, myAvatar: avatar }),
  setRoomCode: (code) => set({ currentRoomCode: code }),
  setRoomState: (state) => set({ roomState: state }),
  setGameState: (state) => set({ gameState: state, isMyTurn: state.isMyTurn }),
  addLog: (msg) => set((s) => ({ gameLogs: [msg, ...s.gameLogs].slice(0, 50) })),
  setLogs: (logs) => set({ gameLogs: logs }),
  setWinners: (winners) => set({ winners }),
  setShowWinnerOverlay: (show) => set({ showWinnerOverlay: show }),
  setTurnInfo: (info) => set({
    isMyTurn: true,
    turnTimeLimit: info.timeLimit,
    canCheck: info.canCheck,
    callAmount: info.callAmount,
    minRaise: info.minRaise,
    maxRaise: info.maxRaise,
  }),
  setFinalResult: (result) => set({ finalResult: result }),
  clearGameState: () => set({ gameState: null, isMyTurn: false }),
  addToast: (message, type = 'info') => {
    const id = Date.now().toString();
    set((s) => ({ toasts: [...s.toasts, { id, message, type }] }));
    setTimeout(() => get().removeToast(id), 3500);
  },
  removeToast: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
  reset: () => set({
    currentRoomCode: null, roomState: null, gameState: null, gameLogs: [],
    winners: [], showWinnerOverlay: false, isMyTurn: false, finalResult: null,
    chatMessages: [], emojiReactions: [], foldAnimations: [], isSpectator: false, voiceUsers: [],
  }),

  addChatMessage: (msg) => set((s) => ({ chatMessages: [...s.chatMessages.slice(-99), msg] })),
  addEmojiReaction: (r) => set((s) => ({ emojiReactions: [...s.emojiReactions, r] })),
  removeEmojiReaction: (id) => set((s) => ({ emojiReactions: s.emojiReactions.filter((r) => r.id !== id) })),
  addFoldAnimation: (a) => set((s) => ({ foldAnimations: [...s.foldAnimations, a] })),
  removeFoldAnimation: (id) => set((s) => ({ foldAnimations: s.foldAnimations.filter((f) => f.id !== id) })),
  setIsSpectator: (v) => set({ isSpectator: v }),
  setVoiceUsers: (users) => set({ voiceUsers: users }),
  addVoiceUser: (sessionId) => set((s) => ({ voiceUsers: s.voiceUsers.includes(sessionId) ? s.voiceUsers : [...s.voiceUsers, sessionId] })),
  removeVoiceUser: (sessionId) => set((s) => ({ voiceUsers: s.voiceUsers.filter((id) => id !== sessionId) })),
}));
