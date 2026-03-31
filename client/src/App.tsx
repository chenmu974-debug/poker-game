import { useEffect } from 'react';
import { useGameStore } from './store/gameStore';
import socket from './socket';
import LobbyPage from './pages/LobbyPage';
import WaitingRoom from './pages/WaitingRoom';
import GameTable from './pages/GameTable';
import FinalResultPage from './pages/FinalResultPage';
import Toast from './components/Toast';

function App() {
  const {
    currentRoomCode, roomState, gameState, finalResult,
    setRoomState, setGameState, setRoomCode, setTurnInfo,
    addLog, setLogs, setWinners, setShowWinnerOverlay,
    addToast, setFinalResult, clearGameState, reset,
    addChatMessage, addEmojiReaction, removeEmojiReaction,
    addFoldAnimation, removeFoldAnimation, setIsSpectator,
    addVoiceUser, removeVoiceUser,
  } = useGameStore();

  useEffect(() => {
    const savedSession = sessionStorage.getItem('pokerSession');
    if (savedSession) {
      try {
        const { sessionId, name, avatar, roomCode } = JSON.parse(savedSession);
        useGameStore.getState().setIdentity(sessionId, name, avatar);
        if (roomCode) {
          socket.connect();
          socket.emit('join_room', { roomCode, playerName: name, avatar, sessionId });
        }
      } catch {}
    }
  }, []);

  useEffect(() => {
    socket.on('room_updated', (state) => setRoomState(state));

    socket.on('game_started', () => {
      setFinalResult(null);
      addLog('🃏 游戏开始！');
    });

    socket.on('game_state', (state) => setGameState(state));

    socket.on('your_turn', (info) => setTurnInfo(info));

    socket.on('action_broadcast', ({ playerName, action, amount }) => {
      const labels: Record<string, string> = {
        fold: '弃牌了', check: '过牌', call: `跟注 $${amount ?? 0}`,
        raise: `加注到 $${amount ?? 0}`, all_in: '全押！',
      };
      addLog(`${playerName} ${labels[action] ?? action}`);
    });

    socket.on('round_ended', (result) => {
      if (result.winners?.length) {
        setWinners(result.winners);
        setShowWinnerOverlay(true);
        setTimeout(() => setShowWinnerOverlay(false), 4000);
      }
    });

    socket.on('game_log', ({ logs }) => setLogs(logs));

    socket.on('final_result', (result) => {
      setFinalResult(result);
      setShowWinnerOverlay(false);
    });

    socket.on('game_restarted', () => {
      setFinalResult(null);
      clearGameState();
      addToast('🔄 房间已重置，请重新准备', 'info');
    });

    socket.on('room_created', ({ code }) => {
      setRoomCode(code);
      const saved = sessionStorage.getItem('pokerSession');
      if (saved) {
        const s = JSON.parse(saved);
        sessionStorage.setItem('pokerSession', JSON.stringify({ ...s, roomCode: code }));
      }
    });

    socket.on('room_joined', ({ code, isSpectator }) => {
      setRoomCode(code);
      if (isSpectator) {
        setIsSpectator(true);
        addToast('以观众身份加入', 'info');
      }
    });

    socket.on('error', ({ message }) => addToast(message, 'error'));

    socket.on('player_eliminated', ({ playerName }) =>
      addLog(`💀 ${playerName} 已被淘汰`),
    );

    socket.on('chat_message', (msg) => addChatMessage(msg));
    socket.on('emoji_reaction', (reaction) => {
      addEmojiReaction(reaction);
      setTimeout(() => removeEmojiReaction(reaction.id), 3000);
    });
    socket.on('fold_animation', (anim) => {
      const id = Date.now().toString() + Math.random();
      addFoldAnimation({ ...anim, id });
      setTimeout(() => removeFoldAnimation(id), 3500);
    });
    socket.on('red_envelope_received', (env) => {
      const detail = env.toName ? `给 ${env.toName} $${env.amount}` : `给所有人，每人 $${env.perPerson ?? env.amount}`;
      addToast(`🧧 ${env.fromName} 发红包：${detail}`, 'success');
      addChatMessage({
        id: env.id,
        sessionId: env.fromSessionId,
        name: env.fromName,
        avatar: 0,
        message: `🧧 发红包 ${detail}`,
        timestamp: Date.now(),
      });
    });
    socket.on('voice_user_joined', ({ sessionId }: { sessionId: string }) => addVoiceUser(sessionId));
    socket.on('voice_user_left', ({ sessionId }: { sessionId: string }) => removeVoiceUser(sessionId));

    return () => {
      socket.off('room_updated');
      socket.off('game_started');
      socket.off('game_state');
      socket.off('your_turn');
      socket.off('action_broadcast');
      socket.off('round_ended');
      socket.off('game_log');
      socket.off('final_result');
      socket.off('game_restarted');
      socket.off('room_created');
      socket.off('room_joined');
      socket.off('error');
      socket.off('player_eliminated');
      socket.off('chat_message');
      socket.off('emoji_reaction');
      socket.off('fold_animation');
      socket.off('red_envelope_received');
      socket.off('voice_user_joined');
      socket.off('voice_user_left');
    };
  }, []);

  // Show final result screen
  if (finalResult && currentRoomCode) {
    return (
      <div className="min-h-screen bg-casino font-body">
        <FinalResultPage />
        <Toast />
      </div>
    );
  }

  const isInGame = gameState && gameState.phase !== 'waiting';

  return (
    <div className="min-h-screen bg-casino font-body">
      {!currentRoomCode && <LobbyPage />}
      {currentRoomCode && !isInGame && roomState && <WaitingRoom />}
      {currentRoomCode && isInGame && <GameTable />}
      <Toast />
    </div>
  );
}

export default App;
