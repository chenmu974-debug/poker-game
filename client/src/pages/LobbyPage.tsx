import { useState } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { useGameStore } from '../store/gameStore';
import socket from '../socket';

const AVATARS = ['🎩', '🦁', '🐯', '🦊', '🐺', '🐻', '🦝', '🐼'];

export default function LobbyPage() {
  const { setIdentity, addToast } = useGameStore();
  const [name, setName] = useState('');
  const [avatar, setAvatar] = useState(0);
  const [roomCode, setRoomCode] = useState('');
  const [startingChips, setStartingChips] = useState(1000);
  const [smallBlind, setSmallBlind] = useState(10);
  const [tab, setTab] = useState<'create' | 'join'>('create');
  const [connecting, setConnecting] = useState(false);

  const getOrCreateSession = () => {
    let sessionId = sessionStorage.getItem('pokerSessionId');
    if (!sessionId) {
      sessionId = uuidv4();
      sessionStorage.setItem('pokerSessionId', sessionId);
    }
    return sessionId;
  };

  const connect = (cb: (sessionId: string) => void) => {
    if (!name.trim()) { addToast('请输入昵称', 'error'); return; }
    setConnecting(true);
    const sessionId = getOrCreateSession();
    setIdentity(sessionId, name.trim(), avatar);
    sessionStorage.setItem('pokerSession', JSON.stringify({
      sessionId, name: name.trim(), avatar, roomCode: null,
    }));

    if (!socket.connected) {
      socket.connect();
      socket.once('connect', () => cb(sessionId));
    } else {
      cb(sessionId);
    }
    setTimeout(() => setConnecting(false), 3000);
  };

  const handleCreate = () => {
    connect((sessionId) => {
      socket.emit('create_room', {
        playerName: name.trim(), avatar, sessionId,
        settings: { startingChips, smallBlind },
      });
    });
  };

  const handleJoin = () => {
    if (!roomCode.trim()) { addToast('请输入房间码', 'error'); return; }
    connect((sessionId) => {
      socket.emit('join_room', {
        roomCode: roomCode.trim().toUpperCase(),
        playerName: name.trim(), avatar, sessionId,
      });
    });
  };

  return (
    <div className="min-h-screen bg-casino flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-10">
          <div className="text-6xl mb-3">🃏</div>
          <h1 className="font-display text-4xl font-bold text-gold tracking-wide">
            Texas Hold'em
          </h1>
          <p className="text-gray-400 mt-2 text-sm">多人在线德州扑克</p>
        </div>

        {/* Card */}
        <div className="bg-gray-900 rounded-2xl border border-gray-700 shadow-2xl p-8">
          {/* Name Input */}
          <div className="mb-6">
            <label className="block text-gray-300 text-sm font-medium mb-2">昵称</label>
            <input
              type="text"
              maxLength={16}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="输入你的昵称..."
              className="w-full bg-gray-800 border border-gray-600 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-gold transition-colors"
            />
          </div>

          {/* Avatar */}
          <div className="mb-6">
            <label className="block text-gray-300 text-sm font-medium mb-2">选择头像</label>
            <div className="grid grid-cols-8 gap-2">
              {AVATARS.map((a, i) => (
                <button
                  key={i}
                  onClick={() => setAvatar(i)}
                  className={`text-2xl h-10 rounded-lg transition-all ${
                    avatar === i
                      ? 'bg-gold/20 border-2 border-gold scale-110'
                      : 'bg-gray-800 border border-gray-600 hover:border-gray-400'
                  }`}
                >
                  {a}
                </button>
              ))}
            </div>
          </div>

          {/* Tabs */}
          <div className="flex mb-6 bg-gray-800 rounded-lg p-1">
            {(['create', 'join'] as const).map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`flex-1 py-2 rounded-md text-sm font-medium transition-all ${
                  tab === t ? 'bg-gold text-casino' : 'text-gray-400 hover:text-white'
                }`}
              >
                {t === 'create' ? '创建房间' : '加入房间'}
              </button>
            ))}
          </div>

          {tab === 'create' ? (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-gray-400 text-xs mb-1">初始筹码</label>
                  <input
                    type="number"
                    min={100} max={100000} step={100}
                    value={startingChips}
                    onChange={(e) => setStartingChips(Number(e.target.value))}
                    className="w-full bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-gold"
                  />
                </div>
                <div>
                  <label className="block text-gray-400 text-xs mb-1">小盲注</label>
                  <input
                    type="number"
                    min={1} max={1000} step={1}
                    value={smallBlind}
                    onChange={(e) => setSmallBlind(Number(e.target.value))}
                    className="w-full bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-gold"
                  />
                </div>
              </div>
              <button
                onClick={handleCreate}
                disabled={connecting}
                className="w-full py-3 bg-gold text-casino font-bold rounded-lg hover:bg-gold-light transition-colors disabled:opacity-50 text-lg"
              >
                {connecting ? '连接中...' : '创建房间'}
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <label className="block text-gray-400 text-xs mb-1">房间码</label>
                <input
                  type="text"
                  maxLength={6}
                  value={roomCode}
                  onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                  placeholder="输入6位房间码"
                  className="w-full bg-gray-800 border border-gray-600 rounded-lg px-4 py-3 text-white text-center text-xl tracking-widest placeholder-gray-600 uppercase focus:outline-none focus:border-gold"
                />
              </div>
              <button
                onClick={handleJoin}
                disabled={connecting}
                className="w-full py-3 bg-felt text-white font-bold rounded-lg border border-felt-light hover:bg-felt-light transition-colors disabled:opacity-50 text-lg"
              >
                {connecting ? '连接中...' : '加入房间'}
              </button>
            </div>
          )}
        </div>

        <p className="text-center text-gray-600 text-xs mt-6">
          支持 4~8 人局域网联机 · 服务端游戏逻辑
        </p>
      </div>
    </div>
  );
}
