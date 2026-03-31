import { Server, Socket } from 'socket.io';
import { v4 as uuidv4 } from 'uuid';
import {
  Room, Player, GameState, PersonalizedGameState, PersonalizedPlayer,
  RoomSettings, RoundResult,
} from './types';
import {
  initHand, processAction, isBettingRoundComplete, activeNonFoldedCount,
  advancePhase, resolveShowdown, applyRoundResult,
} from './gameLogic';

const rooms = new Map<string, Room>();
const actionTimers = new Map<string, NodeJS.Timeout>();

const PRAISE_TEXTS = [
  '你就是今晚的牌桌之王！',
  '运气和实力都在你这边！',
  '完美发挥，无懈可击！',
  '神一样的操作，服了！',
  '今晚的大赢家，实至名归！',
  '你的牌技让对手无处遁形！',
  '稳如老狗，赢麻了！',
  '天选之人非你莫属！',
  '牌桌统治者，强！',
  '今晚注定是你的夜晚！',
  '运筹帷幄，决胜千里！',
  '一骑绝尘，无人能敌！',
];

const TAUNT_TEXTS = [
  '钱包比脸还干净！',
  '下次带够盘缠再来！',
  '今晚的ATM机非你莫属！',
  '输得这么彻底，也是一种本事！',
  '你的筹码喂狗了？',
  '赤条条来，赤条条去！',
  '还好不是真钱，否则今晚喝西北风！',
  '这牌技，是认真的吗？',
  '全场MVP——最有价值的输家！',
  '怎么输得那么好看呢？',
  '下次学会弃牌再来吧！',
  '今天就当交学费了！',
];

function rand<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function generateRoomCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return rooms.has(code) ? generateRoomCode() : code;
}

function getRoom(code: string): Room | undefined {
  return rooms.get(code);
}

function personalizeState(gs: GameState, forSessionId: string): PersonalizedGameState {
  const myPlayer = gs.players.find((p) => p.sessionId === forSessionId);
  const isMyTurn = myPlayer?.isCurrentTurn ?? false;
  const minRaise = gs.lastRaiseAmount > 0 ? gs.lastRaiseAmount : gs.currentBet;
  const maxRaise = myPlayer ? myPlayer.chips + myPlayer.bet : 0;

  const players: PersonalizedPlayer[] = gs.players.map((p) => ({
    id: p.id,
    sessionId: p.sessionId,
    name: p.name,
    avatar: p.avatar,
    chips: p.chips,
    bet: p.bet,
    totalBet: p.totalBet,
    holeCards: p.sessionId === forSessionId || gs.phase === 'showdown' ? p.holeCards : [],
    isHoleCardsVisible: p.sessionId === forSessionId || gs.phase === 'showdown',
    status: p.status,
    isDealer: p.isDealer,
    isSmallBlind: p.isSmallBlind,
    isBigBlind: p.isBigBlind,
    isCurrentTurn: p.isCurrentTurn,
    isConnected: p.isConnected,
    seatIndex: p.seatIndex,
  }));

  return {
    roomCode: gs.roomCode,
    phase: gs.phase,
    players,
    communityCards: gs.communityCards,
    pot: gs.pot,
    sidePots: gs.sidePots,
    currentPlayerIndex: gs.currentPlayerIndex,
    dealerIndex: gs.dealerIndex,
    smallBlindIndex: gs.smallBlindIndex,
    bigBlindIndex: gs.bigBlindIndex,
    currentBet: gs.currentBet,
    lastRaiseAmount: gs.lastRaiseAmount,
    handNumber: gs.handNumber,
    mySessionId: forSessionId,
    isMyTurn,
    minRaise: Math.max(minRaise, gs.currentBet),
    maxRaise,
  };
}

function spectatorGameState(gs: GameState): PersonalizedGameState {
  const players: PersonalizedPlayer[] = gs.players.map((p) => ({
    id: p.id, sessionId: p.sessionId, name: p.name, avatar: p.avatar,
    chips: p.chips, bet: p.bet, totalBet: p.totalBet,
    holeCards: gs.phase === 'showdown' ? p.holeCards : [],
    isHoleCardsVisible: gs.phase === 'showdown',
    status: p.status, isDealer: p.isDealer, isSmallBlind: p.isSmallBlind,
    isBigBlind: p.isBigBlind, isCurrentTurn: p.isCurrentTurn,
    isConnected: p.isConnected, seatIndex: p.seatIndex,
  }));
  return {
    roomCode: gs.roomCode, phase: gs.phase, players,
    communityCards: gs.communityCards, pot: gs.pot, sidePots: gs.sidePots,
    currentPlayerIndex: gs.currentPlayerIndex, dealerIndex: gs.dealerIndex,
    smallBlindIndex: gs.smallBlindIndex, bigBlindIndex: gs.bigBlindIndex,
    currentBet: gs.currentBet, lastRaiseAmount: gs.lastRaiseAmount,
    handNumber: gs.handNumber, mySessionId: 'spectator',
    isMyTurn: false, minRaise: 0, maxRaise: 0,
  };
}

function broadcastGameState(io: Server, room: Room) {
  if (!room.gameState) return;
  for (const player of room.players) {
    if (player.isConnected) {
      io.to(player.id).emit('game_state', personalizeState(room.gameState, player.sessionId));
    }
  }
  if (room.spectators.length > 0) {
    const sv = spectatorGameState(room.gameState);
    for (const spec of room.spectators) {
      io.to(spec.socketId).emit('game_state', sv);
    }
  }
}

function broadcastRoomState(io: Server, room: Room) {
  const state = {
    code: room.code,
    hostSessionId: room.hostSessionId,
    settings: room.settings,
    players: room.players.map((p) => ({
      sessionId: p.sessionId,
      name: p.name,
      avatar: p.avatar,
      chips: p.chips,
      isReady: p.isReady,
      isConnected: p.isConnected,
      seatIndex: p.seatIndex,
    })),
    isGameStarted: room.isGameStarted,
  };
  io.to(room.code).emit('room_updated', state);
}

function cancelTimer(roomCode: string, sessionId: string) {
  const key = `${roomCode}:${sessionId}`;
  const timer = actionTimers.get(key);
  if (timer) { clearTimeout(timer); actionTimers.delete(key); }
}

function setActionTimer(io: Server, room: Room, sessionId: string, timeoutMs = 30000) {
  cancelTimer(room.code, sessionId);
  const key = `${room.code}:${sessionId}`;
  const timer = setTimeout(() => {
    actionTimers.delete(key);
    if (!room.gameState) return;
    // Use gameState.players (not room.players) to check current turn, as room.players doesn't track isCurrentTurn
    const gp = room.gameState.players.find((pl) => pl.sessionId === sessionId);
    if (!gp?.isCurrentTurn) return;
    const player = room.players.find((p) => p.sessionId === sessionId);
    if (!player) return;
    const canCheck = gp.bet >= room.gameState.currentBet;
    const autoAction = canCheck ? 'check' : 'fold';
    addLog(io, room, `⏰ ${player.name} 操作超时，自动${autoAction === 'check' ? '过牌' : '弃牌'}`);
    handleAction(io, room, sessionId, autoAction as any, undefined);
  }, timeoutMs);
  actionTimers.set(key, timer);
}

const gameLogs = new Map<string, string[]>();

function addLog(io: Server, room: Room, msg: string) {
  const logs = gameLogs.get(room.code) ?? [];
  logs.unshift(msg);
  if (logs.length > 50) logs.pop();
  gameLogs.set(room.code, logs);
  io.to(room.code).emit('game_log', { message: msg, logs });
}

function handleAction(
  io: Server,
  room: Room,
  sessionId: string,
  action: 'fold' | 'check' | 'call' | 'raise' | 'all_in',
  amount: number | undefined,
) {
  if (!room.gameState) return;
  cancelTimer(room.code, sessionId);

  const player = room.players.find((p) => p.sessionId === sessionId);
  if (!player) return;

  const actionLabels: Record<string, string> = {
    fold: '弃牌了',
    check: '过牌',
    call: `跟注 $${Math.min((room.gameState.currentBet - (room.gameState.players.find(p => p.sessionId === sessionId)?.bet ?? 0)), room.gameState.players.find(p => p.sessionId === sessionId)?.chips ?? 0)}`,
    raise: `加注到 $${amount ?? 0}`,
    all_in: '全押！',
  };
  addLog(io, room, `${player.name} ${actionLabels[action] ?? action}`);
  io.to(room.code).emit('action_broadcast', { playerName: player.name, action, amount });

  if (action === 'fold') {
    io.to(room.code).emit('fold_animation', { sessionId, playerName: player.name });
  }

  room.gameState = processAction(room.gameState, sessionId, action, amount);
  checkAndAdvance(io, room);
}

function checkAndAdvance(io: Server, room: Room) {
  if (!room.gameState) return;
  let gs = room.gameState;

  const nonFolded = gs.players.filter((p) => p.status === 'active' || p.status === 'all-in');
  if (nonFolded.length <= 1) {
    while (gs.phase !== 'showdown') {
      gs = advancePhase(gs);
      gs.playersToAct = [];
    }
    room.gameState = gs;
    endHand(io, room);
    return;
  }

  if (isBettingRoundComplete(gs)) {
    if (gs.phase === 'river') {
      room.gameState = advancePhase(gs);
      endHand(io, room);
      return;
    }

    const newGs = advancePhase(gs);
    room.gameState = newGs;

    const activeBettors = newGs.players.filter((p) => p.status === 'active');
    if (activeBettors.length === 0) {
      setTimeout(() => {
        if (!room.gameState) return;
        let s = room.gameState;
        broadcastGameState(io, room);
        const runOut = async () => {
          if (s.phase === 'showdown') { endHand(io, room); return; }
          await delay(1200);
          s = advancePhase(s);
          s.playersToAct = [];
          room.gameState = s;
          broadcastGameState(io, room);
          runOut();
        };
        runOut();
      }, 1000);
      return;
    }

    setTimeout(() => {
      if (!room.gameState) return;
      broadcastGameState(io, room);
      startNextTurn(io, room);
    }, 1200);
  } else {
    broadcastGameState(io, room);
    startNextTurn(io, room);
  }
}

function delay(ms: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, ms));
}

function startNextTurn(io: Server, room: Room) {
  if (!room.gameState) return;
  const gs = room.gameState;
  const current = gs.players[gs.currentPlayerIndex];
  if (!current || current.status !== 'active') return;

  io.to(current.id).emit('your_turn', {
    timeLimit: 30,
    minRaise: gs.lastRaiseAmount > 0 ? gs.lastRaiseAmount : gs.currentBet,
    maxRaise: current.chips + current.bet,
    canCheck: current.bet >= gs.currentBet,
    callAmount: Math.min(gs.currentBet - current.bet, current.chips),
  });
  setActionTimer(io, room, current.sessionId);
}

function endHand(io: Server, room: Room) {
  if (!room.gameState) return;
  const result = resolveShowdown(room.gameState);

  // Reveal all hands at showdown
  const showdownState = { ...room.gameState, phase: 'showdown' as const };
  for (const player of room.players) {
    if (player.isConnected) {
      const ps = personalizeState(showdownState, player.sessionId);
      ps.players = ps.players.map((pp) => {
        const original = showdownState.players.find((p) => p.sessionId === pp.sessionId);
        return { ...pp, holeCards: original?.holeCards ?? [], isHoleCardsVisible: true };
      });
      io.to(player.id).emit('game_state', ps);
    }
  }

  const showdownSv = spectatorGameState({ ...showdownState });
  for (const spec of room.spectators) {
    io.to(spec.socketId).emit('game_state', showdownSv);
  }

  for (const w of result.winners) {
    addLog(io, room, `🏆 ${w.playerName} 赢得 $${w.amount}（${w.hand.name}）`);
  }
  io.to(room.code).emit('round_ended', result);

  // Record eliminated count before applying result
  const prevEliminated = room.gameState.players.filter((p) => p.status === 'eliminated').length;
  room.gameState = applyRoundResult(room.gameState, result);
  const newEliminated = room.gameState.players.filter((p) => p.status === 'eliminated').length;
  const alive = room.gameState.players.filter((p) => p.status !== 'eliminated');

  // Update room players' chips
  for (const rp of room.players) {
    const gp = room.gameState.players.find((p) => p.sessionId === rp.sessionId);
    if (gp) rp.chips = gp.chips;
  }

  // Trigger final result when someone is newly eliminated OR only 1 alive
  if (newEliminated > prevEliminated || alive.length <= 1) {
    setTimeout(() => showFinalResult(io, room), 2500);
    return;
  }

  // Continue with next hand
  setTimeout(() => {
    if (!room.gameState) return;
    room.gameState = initHand(room.gameState, room.settings.smallBlind);
    addLog(io, room, `━━━ 第 ${room.gameState.handNumber} 局开始 ━━━`);
    broadcastGameState(io, room);
    startNextTurn(io, room);
  }, 5000);
}

function showFinalResult(io: Server, room: Room) {
  if (!room.gameState) return;

  const players = room.gameState.players;
  const rankings = [...players]
    .sort((a, b) => b.chips - a.chips)
    .map((p, i) => ({
      sessionId: p.sessionId,
      name: p.name,
      avatar: p.avatar,
      chips: p.chips,
      rank: i + 1,
      isEliminated: p.status === 'eliminated' || p.chips === 0,
    }));

  const winner = rankings[0];
  const losers = rankings.filter((r) => r.isEliminated);

  addLog(io, room, `🎉 游戏结束！冠军：${winner.name}（$${winner.chips}）`);

  io.to(room.code).emit('final_result', {
    rankings,
    winnerSessionId: winner.sessionId,
    loserSessionIds: losers.map((l) => l.sessionId),
    praiseText: rand(PRAISE_TEXTS),
    tauntText: rand(TAUNT_TEXTS),
    hostSessionId: room.hostSessionId,
  });

  room.isGameStarted = false;
  room.gameState = null;
}

export function setupGameManager(io: Server) {
  io.on('connection', (socket: Socket) => {

    socket.on('create_room', ({ playerName, avatar, sessionId, settings }: {
      playerName: string; avatar: number; sessionId: string;
      settings?: Partial<RoomSettings>;
    }) => {
      const code = generateRoomCode();
      const player: Player = {
        id: socket.id, sessionId, name: playerName, avatar,
        chips: settings?.startingChips ?? 1000,
        bet: 0, totalBet: 0, holeCards: [], status: 'active',
        isDealer: false, isSmallBlind: false, isBigBlind: false, isCurrentTurn: false,
        isReady: false, isConnected: true, seatIndex: 0,
      };
      const roomSettings: RoomSettings = {
        startingChips: settings?.startingChips ?? 1000,
        smallBlind: settings?.smallBlind ?? 10,
        maxPlayers: settings?.maxPlayers ?? 8,
      };
      const room: Room = {
        code, hostSessionId: sessionId, settings: roomSettings,
        players: [player], spectators: [], gameState: null, isGameStarted: false,
      };
      rooms.set(code, room);
      gameLogs.set(code, []);
      socket.join(code);
      socket.emit('room_created', { code });
      broadcastRoomState(io, room);
    });

    socket.on('join_room', ({ roomCode, playerName, avatar, sessionId }: {
      roomCode: string; playerName: string; avatar: number; sessionId: string;
    }) => {
      const room = getRoom(roomCode);
      if (!room) { socket.emit('error', { message: '房间不存在' }); return; }

      const existing = room.players.find((p) => p.sessionId === sessionId);
      if (existing) {
        existing.id = socket.id;
        existing.isConnected = true;
        existing.disconnectedAt = undefined;
        socket.join(roomCode);
        socket.emit('room_joined', { code: roomCode });
        broadcastRoomState(io, room);
        if (room.gameState) {
          room.gameState.players = room.gameState.players.map((p) =>
            p.sessionId === sessionId ? { ...p, id: socket.id, isConnected: true } : p,
          );
          broadcastGameState(io, room);
        }
        // Send current logs
        const logs = gameLogs.get(roomCode) ?? [];
        socket.emit('game_log', { message: '', logs });
        return;
      }

      if (room.isGameStarted) {
        room.spectators.push({ socketId: socket.id, name: playerName, sessionId });
        socket.join(roomCode);
        socket.emit('room_joined', { code: roomCode, isSpectator: true });
        return;
      }

      if (room.players.length >= room.settings.maxPlayers) {
        socket.emit('error', { message: '房间已满' }); return;
      }

      const player: Player = {
        id: socket.id, sessionId, name: playerName, avatar,
        chips: room.settings.startingChips,
        bet: 0, totalBet: 0, holeCards: [], status: 'active',
        isDealer: false, isSmallBlind: false, isBigBlind: false, isCurrentTurn: false,
        isReady: false, isConnected: true, seatIndex: room.players.length,
      };
      room.players.push(player);
      socket.join(roomCode);
      socket.emit('room_joined', { code: roomCode });
      broadcastRoomState(io, room);
    });

    socket.on('update_settings', ({ roomCode, settings, sessionId }: {
      roomCode: string; settings: Partial<RoomSettings>; sessionId: string;
    }) => {
      const room = getRoom(roomCode);
      if (!room || room.hostSessionId !== sessionId || room.isGameStarted) return;
      room.settings = { ...room.settings, ...settings };
      broadcastRoomState(io, room);
    });

    socket.on('player_ready', ({ roomCode, sessionId }: { roomCode: string; sessionId: string }) => {
      const room = getRoom(roomCode);
      if (!room) return;
      const player = room.players.find((p) => p.sessionId === sessionId);
      if (player) { player.isReady = !player.isReady; broadcastRoomState(io, room); }
    });

    socket.on('start_game', ({ roomCode, sessionId }: { roomCode: string; sessionId: string }) => {
      const room = getRoom(roomCode);
      if (!room) { socket.emit('error', { message: '房间不存在' }); return; }
      if (room.hostSessionId !== sessionId) { socket.emit('error', { message: '只有房主可以开始游戏' }); return; }
      if (room.players.length < 2) { socket.emit('error', { message: '至少需要2名玩家' }); return; }
      if (!room.players.every((p) => p.isReady)) { socket.emit('error', { message: '所有玩家需要准备就绪' }); return; }

      room.isGameStarted = true;
      gameLogs.set(roomCode, []);

      const initialGs: GameState = {
        roomCode,
        phase: 'waiting',
        players: room.players.map((p) => ({
          ...p,
          chips: room.settings.startingChips,
          bet: 0, totalBet: 0, holeCards: [], status: 'active',
          isDealer: false, isSmallBlind: false, isBigBlind: false, isCurrentTurn: false,
        })),
        communityCards: [], pot: 0, sidePots: [],
        currentPlayerIndex: 0,
        dealerIndex: room.players.length - 1,
        smallBlindIndex: 0, bigBlindIndex: 1,
        currentBet: 0, lastRaiseAmount: 0, deck: [], playersToAct: [], handNumber: 0,
      };

      room.gameState = initHand(initialGs, room.settings.smallBlind);
      io.to(roomCode).emit('game_started', {});
      addLog(io, room, `━━━ 第 ${room.gameState.handNumber} 局开始 ━━━`);
      broadcastGameState(io, room);
      startNextTurn(io, room);
    });

    socket.on('player_action', ({ roomCode, action, amount, sessionId }: {
      roomCode: string; action: 'fold' | 'check' | 'call' | 'raise' | 'all_in';
      amount?: number; sessionId: string;
    }) => {
      const room = getRoom(roomCode);
      if (!room || !room.gameState) { socket.emit('error', { message: '游戏未开始' }); return; }
      const gs = room.gameState;
      const player = gs.players.find((p) => p.sessionId === sessionId);
      if (!player?.isCurrentTurn) { socket.emit('error', { message: '还没轮到你' }); return; }
      handleAction(io, room, sessionId, action, amount);
    });

    // Restart game: reset chips and go back to waiting room
    socket.on('restart_game', ({ roomCode, sessionId }: { roomCode: string; sessionId: string }) => {
      const room = getRoom(roomCode);
      if (!room) { socket.emit('error', { message: '房间不存在' }); return; }
      if (room.hostSessionId !== sessionId) { socket.emit('error', { message: '只有房主可以重新开始' }); return; }

      // Reset chips and ready state for all players
      room.players.forEach((p) => {
        p.chips = room.settings.startingChips;
        p.isReady = false;
      });
      room.gameState = null;
      room.isGameStarted = false;
      gameLogs.set(roomCode, ['🔄 已重置，请重新准备']);

      io.to(roomCode).emit('game_restarted', {});
      broadcastRoomState(io, room);
      io.to(roomCode).emit('game_log', { message: '', logs: ['🔄 已重置，请重新准备'] });
    });

    socket.on('chat_message', ({ roomCode, sessionId, message }: {
      roomCode: string; sessionId: string; message: string;
    }) => {
      const room = getRoom(roomCode);
      if (!room) return;
      const player = room.players.find((p) => p.sessionId === sessionId);
      const spec = room.spectators.find((s) => s.sessionId === sessionId);
      const name = player?.name ?? spec?.name ?? '观众';
      const avatar = player?.avatar ?? 0;
      if (!message.trim() || message.length > 200) return;
      io.to(roomCode).emit('chat_message', {
        id: uuidv4(), sessionId, name, avatar,
        message: message.trim(), timestamp: Date.now(),
      });
    });

    socket.on('emoji_reaction', ({ roomCode, sessionId, emoji }: {
      roomCode: string; sessionId: string; emoji: string;
    }) => {
      const room = getRoom(roomCode);
      if (!room) return;
      const player = room.players.find((p) => p.sessionId === sessionId);
      const name = player?.name ?? '观众';
      io.to(roomCode).emit('emoji_reaction', {
        id: uuidv4(), sessionId, name, emoji,
      });
    });

    socket.on('voice_join', ({ roomCode, sessionId }: { roomCode: string; sessionId: string }) => {
      const room = getRoom(roomCode);
      if (!room) return;
      socket.to(roomCode).emit('voice_user_joined', { sessionId });
    });

    socket.on('voice_leave', ({ roomCode, sessionId }: { roomCode: string; sessionId: string }) => {
      const room = getRoom(roomCode);
      if (!room) return;
      socket.to(roomCode).emit('voice_user_left', { sessionId });
    });

    socket.on('webrtc_signal', ({ roomCode, targetSessionId, fromSessionId, signal }: {
      roomCode: string; targetSessionId: string; fromSessionId: string; signal: unknown;
    }) => {
      const room = getRoom(roomCode);
      if (!room) return;
      const target = room.players.find((p) => p.sessionId === targetSessionId);
      if (target?.id) {
        io.to(target.id).emit('webrtc_signal', { fromSessionId, signal });
      }
    });

    socket.on('send_red_envelope', ({ roomCode, sessionId, amount, targetSessionId }: {
      roomCode: string; sessionId: string; amount: number; targetSessionId?: string;
    }) => {
      const room = getRoom(roomCode);
      if (!room) { socket.emit('error', { message: '房间不存在' }); return; }

      const sender = room.players.find((p) => p.sessionId === sessionId);
      if (!sender) { socket.emit('error', { message: '玩家不存在' }); return; }

      const parsedAmount = Math.floor(Number(amount));
      if (!parsedAmount || parsedAmount <= 0) { socket.emit('error', { message: '红包金额无效' }); return; }

      // Use gameState chips if game is active (more accurate), otherwise room chips
      const senderChips = room.gameState
        ? (room.gameState.players.find((p) => p.sessionId === sessionId)?.chips ?? sender.chips)
        : sender.chips;
      if (senderChips < parsedAmount) {
        socket.emit('error', { message: `筹码不足，当前余额 $${senderChips}` }); return;
      }

      const envId = uuidv4();
      if (targetSessionId) {
        const target = room.players.find((p) => p.sessionId === targetSessionId);
        if (!target) { socket.emit('error', { message: '目标玩家不存在' }); return; }
        sender.chips -= parsedAmount;
        target.chips += parsedAmount;
        if (room.gameState) {
          const gSender = room.gameState.players.find((p) => p.sessionId === sessionId);
          const gTarget = room.gameState.players.find((p) => p.sessionId === targetSessionId);
          if (gSender) gSender.chips -= parsedAmount;
          if (gTarget) gTarget.chips += parsedAmount;
        }
        io.to(roomCode).emit('red_envelope_received', {
          id: envId, fromName: sender.name, fromSessionId: sessionId,
          toName: target.name, toSessionId: targetSessionId, amount: parsedAmount,
        });
        addLog(io, room, `🧧 ${sender.name} 给 ${target.name} 发了 $${parsedAmount} 红包`);
      } else {
        const others = room.players.filter((p) => p.sessionId !== sessionId);
        if (others.length === 0) { socket.emit('error', { message: '没有其他玩家可以发送' }); return; }
        const perPerson = Math.floor(parsedAmount / others.length);
        if (perPerson === 0) { socket.emit('error', { message: '金额太小，无法平分' }); return; }
        const actual = perPerson * others.length;
        sender.chips -= actual;
        for (const p of others) p.chips += perPerson;
        if (room.gameState) {
          const gSender = room.gameState.players.find((p) => p.sessionId === sessionId);
          if (gSender) gSender.chips -= actual;
          for (const p of others) {
            const gp = room.gameState.players.find((gp) => gp.sessionId === p.sessionId);
            if (gp) gp.chips += perPerson;
          }
        }
        io.to(roomCode).emit('red_envelope_received', {
          id: envId, fromName: sender.name, fromSessionId: sessionId,
          toName: null, toSessionId: null, amount: actual, perPerson,
        });
        addLog(io, room, `🧧 ${sender.name} 给所有人发了红包，每人 $${perPerson}`);
      }
      broadcastRoomState(io, room);
      if (room.gameState) broadcastGameState(io, room);
    });

    socket.on('leave_room', ({ roomCode, sessionId }: { roomCode: string; sessionId: string }) => {
      handleDisconnect(io, socket, roomCode, sessionId, true);
    });

    socket.on('disconnect', () => {
      for (const [code, room] of rooms) {
        const player = room.players.find((p) => p.id === socket.id);
        if (player) { handleDisconnect(io, socket, code, player.sessionId, false); break; }
      }
    });
  });
}

function handleDisconnect(
  io: Server, socket: Socket, roomCode: string, sessionId: string, permanent: boolean,
) {
  const room = getRoom(roomCode);
  if (!room) return;
  const player = room.players.find((p) => p.sessionId === sessionId);
  if (!player) return;

  player.isConnected = false;
  player.disconnectedAt = Date.now();

  if (room.gameState) {
    room.gameState.players = room.gameState.players.map((p) =>
      p.sessionId === sessionId ? { ...p, isConnected: false } : p,
    );
  }

  if (permanent) {
    room.players = room.players.filter((p) => p.sessionId !== sessionId);
    if (room.gameState) {
      room.gameState.players = room.gameState.players.map((p) =>
        p.sessionId === sessionId ? { ...p, status: 'folded' } : p,
      );
      checkAndAdvance(io, room);
    }
    broadcastRoomState(io, room);
    if (room.players.length === 0) rooms.delete(roomCode);
    return;
  }

  broadcastGameState(io, room);

  if (room.gameState) {
    const gp = room.gameState.players.find((p) => p.sessionId === sessionId);
    if (gp?.isCurrentTurn) {
      cancelTimer(roomCode, sessionId);
      setActionTimer(io, room, sessionId, 8000);
    }
  }

  setTimeout(() => {
    const r = getRoom(roomCode);
    if (!r) return;
    const p = r.players.find((pl) => pl.sessionId === sessionId);
    if (p && !p.isConnected) {
      r.players = r.players.filter((pl) => pl.sessionId !== sessionId);
      if (r.gameState) {
        r.gameState.players = r.gameState.players.map((pl) =>
          pl.sessionId === sessionId ? { ...pl, status: 'folded' } : pl,
        );
        broadcastGameState(io, r);
      }
      broadcastRoomState(io, r);
      if (r.players.length === 0) rooms.delete(roomCode);
    }
  }, 60000);
}
