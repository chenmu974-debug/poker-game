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
      if (isSpectator) addToast('以观众身份加入', 'info');
    });

    socket.on('error', ({ message }) => addToast(message, 'error'));

    socket.on('player_eliminated', ({ playerName }) =>
      addLog(`💀 ${playerName} 已被淘汰`),
    );

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
