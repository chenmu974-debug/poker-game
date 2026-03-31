import { useState } from 'react';
import { useGameStore } from '../store/gameStore';
import socket from '../socket';

interface Props {
  onClose: () => void;
}

const AVATARS = ['🎩', '🦁', '🐯', '🦊', '🐺', '🐻', '🦝', '🐼'];

export default function RedEnvelopeModal({ onClose }: Props) {
  const { roomState, mySessionId, currentRoomCode } = useGameStore();
  const [amount, setAmount] = useState(100);
  const [targetId, setTargetId] = useState<string>('all');

  if (!roomState) return null;

  const others = roomState.players.filter((p) => p.sessionId !== mySessionId);
  const me = roomState.players.find((p) => p.sessionId === mySessionId);

  const send = () => {
    if (!currentRoomCode || amount <= 0) return;
    socket.emit('send_red_envelope', {
      roomCode: currentRoomCode,
      sessionId: mySessionId,
      amount,
      targetSessionId: targetId === 'all' ? undefined : targetId,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-gray-900 border border-red-500 rounded-2xl p-6 w-80 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="text-center mb-4">
          <span className="text-4xl">🧧</span>
          <h2 className="text-xl font-bold text-red-400 mt-1">发红包</h2>
          <p className="text-gray-400 text-xs mt-1">我的筹码：${me?.chips ?? 0}</p>
        </div>

        <div className="mb-4">
          <label className="text-gray-400 text-xs block mb-1">发给</label>
          <select
            value={targetId}
            onChange={(e) => setTargetId(e.target.value)}
            className="w-full bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none"
          >
            <option value="all">所有玩家（平均分配）</option>
            {others.map((p) => (
              <option key={p.sessionId} value={p.sessionId}>
                {AVATARS[p.avatar]} {p.name}
              </option>
            ))}
          </select>
        </div>

        <div className="mb-4">
          <label className="text-gray-400 text-xs block mb-1">金额</label>
          <div className="flex gap-2 mb-2">
            {[50, 100, 200, 500].map((v) => (
              <button
                key={v}
                onClick={() => setAmount(v)}
                className={`flex-1 py-1 rounded text-xs font-medium transition-colors ${
                  amount === v ? 'bg-red-500 text-white' : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                }`}
              >
                {v}
              </button>
            ))}
          </div>
          <input
            type="number"
            min={1}
            max={me?.chips ?? 0}
            value={amount}
            onChange={(e) => setAmount(Number(e.target.value))}
            className="w-full bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-red-400"
          />
        </div>

        <div className="flex gap-2">
          <button onClick={onClose} className="flex-1 py-2 bg-gray-800 text-gray-300 rounded-lg text-sm hover:bg-gray-700">
            取消
          </button>
          <button
            onClick={send}
            disabled={amount <= 0 || amount > (me?.chips ?? 0)}
            className="flex-1 py-2 bg-red-500 text-white font-bold rounded-lg text-sm hover:bg-red-400 disabled:opacity-40"
          >
            发送 🧧
          </button>
        </div>
      </div>
    </div>
  );
}
