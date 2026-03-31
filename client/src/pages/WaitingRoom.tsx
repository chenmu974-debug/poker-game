import { useState } from 'react';
import { useGameStore } from '../store/gameStore';
import socket from '../socket';
import RedEnvelopeModal from '../components/RedEnvelopeModal';

const AVATARS = ['🎩', '🦁', '🐯', '🦊', '🐺', '🐻', '🦝', '🐼'];

export default function WaitingRoom() {
  const { roomState, mySessionId, addToast } = useGameStore();
  const [copied, setCopied] = useState(false);
  const [showRedEnvelope, setShowRedEnvelope] = useState(false);

  if (!roomState) return null;

  const isHost = roomState.hostSessionId === mySessionId;
  const me = roomState.players.find((p) => p.sessionId === mySessionId);
  const allReady = roomState.players.length >= 2 && roomState.players.every((p) => p.isReady);

  const copyCode = () => {
    navigator.clipboard.writeText(roomState.code).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const toggleReady = () => {
    socket.emit('player_ready', { roomCode: roomState.code, sessionId: mySessionId });
  };

  const startGame = () => {
    if (!allReady) { addToast('所有玩家需要准备就绪', 'error'); return; }
    socket.emit('start_game', { roomCode: roomState.code, sessionId: mySessionId });
  };

  const leaveRoom = () => {
    socket.emit('leave_room', { roomCode: roomState.code, sessionId: mySessionId });
    useGameStore.getState().reset();
  };

  return (
    <div className="min-h-screen bg-casino flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        <div className="text-center mb-8">
          <h2 className="font-display text-3xl text-gold font-bold">等待大厅</h2>
        </div>

        {/* Room Code */}
        <div className="bg-gray-900 rounded-xl border border-gray-700 p-6 mb-4">
          <div className="flex items-center justify-between mb-1">
            <span className="text-gray-400 text-sm">房间码</span>
            <button onClick={copyCode} className="text-xs text-gold hover:text-gold-light transition-colors">
              {copied ? '已复制!' : '复制'}
            </button>
          </div>
          <div className="text-4xl font-mono font-bold text-white tracking-widest text-center py-3 bg-gray-800 rounded-lg">
            {roomState.code}
          </div>
          <p className="text-gray-500 text-xs text-center mt-2">
            分享此房间码邀请其他玩家加入
          </p>
        </div>

        {/* Settings */}
        <div className="bg-gray-900 rounded-xl border border-gray-700 p-4 mb-4 grid grid-cols-3 gap-4">
          <div className="text-center">
            <div className="text-gold text-xl font-bold">${roomState.settings.startingChips}</div>
            <div className="text-gray-500 text-xs">初始筹码</div>
          </div>
          <div className="text-center">
            <div className="text-gold text-xl font-bold">${roomState.settings.smallBlind}</div>
            <div className="text-gray-500 text-xs">小盲注</div>
          </div>
          <div className="text-center">
            <div className="text-gold text-xl font-bold">{roomState.settings.maxPlayers}</div>
            <div className="text-gray-500 text-xs">最大人数</div>
          </div>
        </div>

        {/* Player List */}
        <div className="bg-gray-900 rounded-xl border border-gray-700 p-4 mb-4">
          <div className="flex items-center justify-between mb-3">
            <span className="text-gray-300 text-sm font-medium">
              玩家 ({roomState.players.length}/{roomState.settings.maxPlayers})
            </span>
          </div>
          <div className="space-y-2">
            {roomState.players.map((p) => (
              <div
                key={p.sessionId}
                className="flex items-center justify-between bg-gray-800 rounded-lg px-4 py-3"
              >
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{AVATARS[p.avatar] ?? '🎩'}</span>
                  <div>
                    <span className="text-white font-medium">{p.name}</span>
                    {p.sessionId === roomState.hostSessionId && (
                      <span className="ml-2 text-xs bg-gold/20 text-gold px-2 py-0.5 rounded">房主</span>
                    )}
                    {p.sessionId === mySessionId && (
                      <span className="ml-2 text-xs bg-blue-500/20 text-blue-400 px-2 py-0.5 rounded">你</span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {!p.isConnected && (
                    <span className="text-xs text-red-400">离线</span>
                  )}
                  <div className={`w-3 h-3 rounded-full ${p.isReady ? 'bg-green-400' : 'bg-gray-600'}`} />
                  <span className={`text-xs ${p.isReady ? 'text-green-400' : 'text-gray-500'}`}>
                    {p.isReady ? '已准备' : '未准备'}
                  </span>
                </div>
              </div>
            ))}
          </div>
          {roomState.players.length < 2 && (
            <p className="text-gray-500 text-xs text-center mt-3">至少需要2名玩家才能开始</p>
          )}
        </div>

        {/* Red Envelope */}
        {roomState.players.length >= 2 && (
          <div className="mb-4 text-center">
            <button
              onClick={() => setShowRedEnvelope(true)}
              className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white font-bold rounded-lg text-sm transition-colors"
            >
              🧧 发红包
            </button>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3">
          <button
            onClick={leaveRoom}
            className="flex-1 py-3 bg-gray-800 text-gray-300 font-medium rounded-lg hover:bg-gray-700 transition-colors border border-gray-600"
          >
            离开
          </button>
          <button
            onClick={toggleReady}
            className={`flex-1 py-3 font-bold rounded-lg transition-colors ${
              me?.isReady
                ? 'bg-gray-700 text-gray-300 border border-gray-500'
                : 'bg-green-600 text-white hover:bg-green-500'
            }`}
          >
            {me?.isReady ? '取消准备' : '准备就绪'}
          </button>
          {isHost && (
            <button
              onClick={startGame}
              disabled={!allReady}
              className="flex-1 py-3 bg-gold text-casino font-bold rounded-lg hover:bg-gold-light transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              开始游戏
            </button>
          )}
        </div>
      </div>
      {showRedEnvelope && <RedEnvelopeModal onClose={() => setShowRedEnvelope(false)} />}
    </div>
  );
}
