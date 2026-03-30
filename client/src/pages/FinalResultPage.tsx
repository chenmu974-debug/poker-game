import { useEffect, useRef } from 'react';
import { useGameStore } from '../store/gameStore';
import socket from '../socket';

const AVATARS = ['🎩', '🦁', '🐯', '🦊', '🐺', '🐻', '🦝', '🐼'];

const RANK_MEDALS = ['🥇', '🥈', '🥉'];

export default function FinalResultPage() {
  const { finalResult, mySessionId, currentRoomCode, reset, addToast } = useGameStore();
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d')!;
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const particles = Array.from({ length: 150 }, () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height * 0.6 - 50,
      vx: (Math.random() - 0.5) * 3,
      vy: Math.random() * 2 + 0.5,
      r: Math.random() * 7 + 2,
      color: ['#c9a84c', '#f0d060', '#fff', '#e8a020', '#ffd700', '#ff6b6b'][Math.floor(Math.random() * 6)],
    }));

    const anim = setInterval(() => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      for (const p of particles) {
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.03;
        if (p.y > canvas.height) { p.y = -10; p.x = Math.random() * canvas.width; p.vy = 1; }
        ctx.fillStyle = p.color;
        ctx.globalAlpha = 0.85;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    }, 16);

    return () => clearInterval(anim);
  }, []);

  if (!finalResult) return null;

  const { rankings, winnerSessionId, loserSessionIds, praiseText, tauntText, hostSessionId } = finalResult;
  const isHost = mySessionId === hostSessionId;

  const handleRestart = () => {
    if (!currentRoomCode) return;
    socket.emit('restart_game', { roomCode: currentRoomCode, sessionId: mySessionId });
  };

  const handleLeave = () => {
    if (currentRoomCode) {
      socket.emit('leave_room', { roomCode: currentRoomCode, sessionId: mySessionId });
    }
    sessionStorage.removeItem('pokerSession');
    reset();
  };

  return (
    <div className="min-h-screen bg-casino flex flex-col items-center justify-start p-4 overflow-y-auto relative">
      <canvas ref={canvasRef} className="fixed inset-0 pointer-events-none z-0" />

      <div className="relative z-10 w-full max-w-lg py-6">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="text-5xl mb-2">🏁</div>
          <h1 className="font-display text-4xl font-bold text-gold tracking-wide">游戏结束</h1>
        </div>

        {/* Winner Card */}
        {rankings[0] && (() => {
          const winner = rankings[0];
          return (
            <div className="bg-gradient-to-br from-yellow-900/60 to-yellow-800/30 border-2 border-gold rounded-2xl p-6 mb-4 text-center shadow-2xl shadow-gold/20">
              <div className="text-4xl mb-2">🏆</div>
              <div className="text-5xl mb-2">{AVATARS[winner.avatar] ?? '🎩'}</div>
              <div className="font-display text-2xl font-bold text-gold mb-1">{winner.name}</div>
              <div className="text-white text-xl font-bold mb-3">${winner.chips.toLocaleString()}</div>
              {winnerSessionId === winner.sessionId && (
                <div className="inline-block bg-gold/20 border border-gold/50 rounded-xl px-4 py-2 text-gold text-sm font-medium">
                  ✨ {praiseText}
                </div>
              )}
            </div>
          );
        })()}

        {/* Losers */}
        {loserSessionIds.length > 0 && (
          <div className="bg-red-950/40 border border-red-800/50 rounded-2xl p-4 mb-4 text-center">
            {rankings.filter(r => loserSessionIds.includes(r.sessionId)).map(loser => (
              <div key={loser.sessionId} className="mb-2 last:mb-0">
                <span className="text-2xl mr-2">{AVATARS[loser.avatar] ?? '🎩'}</span>
                <span className="text-red-300 font-bold">{loser.name}</span>
                <span className="text-gray-500 text-sm ml-2">筹码归零</span>
              </div>
            ))}
            <div className="mt-3 inline-block bg-red-900/40 border border-red-700/40 rounded-xl px-4 py-2 text-red-300 text-sm">
              😅 {tauntText}
            </div>
          </div>
        )}

        {/* Rankings Table */}
        <div className="bg-gray-900 border border-gray-700 rounded-2xl overflow-hidden mb-6">
          <div className="px-4 py-3 border-b border-gray-700">
            <span className="text-gray-300 font-medium text-sm">最终排名</span>
          </div>
          {rankings.map((r) => {
            const isWinner = r.sessionId === winnerSessionId;
            const isLoser = loserSessionIds.includes(r.sessionId);
            const isMe = r.sessionId === mySessionId;
            return (
              <div
                key={r.sessionId}
                className={`flex items-center px-4 py-3 border-b border-gray-800 last:border-0
                  ${isWinner ? 'bg-yellow-900/20' : isLoser ? 'bg-red-900/10' : ''}`}
              >
                <div className="w-8 text-center text-lg">
                  {r.rank <= 3 ? RANK_MEDALS[r.rank - 1] : <span className="text-gray-500 text-sm">{r.rank}</span>}
                </div>
                <div className="text-xl mr-3">{AVATARS[r.avatar] ?? '🎩'}</div>
                <div className="flex-1">
                  <span className={`font-medium ${isMe ? 'text-blue-300' : 'text-white'}`}>
                    {r.name}
                  </span>
                  {isMe && <span className="ml-2 text-xs text-blue-400">(你)</span>}
                </div>
                <div className={`font-bold tabular-nums ${
                  isLoser ? 'text-red-400' : isWinner ? 'text-gold' : 'text-gray-300'
                }`}>
                  ${r.chips.toLocaleString()}
                </div>
              </div>
            );
          })}
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3">
          <button
            onClick={handleLeave}
            className="flex-1 py-3 bg-gray-800 text-gray-300 font-bold rounded-xl border border-gray-600 hover:bg-gray-700 transition-colors"
          >
            退出房间
          </button>
          {isHost ? (
            <button
              onClick={handleRestart}
              className="flex-1 py-3 bg-gold text-casino font-bold rounded-xl hover:bg-gold-light transition-colors shadow-lg shadow-gold/20"
            >
              🔄 再来一局
            </button>
          ) : (
            <div className="flex-1 py-3 bg-gray-800/50 text-gray-500 font-medium rounded-xl border border-gray-700 text-center text-sm flex items-center justify-center">
              等待房主重新开始...
            </div>
          )}
        </div>

        {!isHost && (
          <p className="text-center text-gray-600 text-xs mt-3">
            只有房主可以发起新一局
          </p>
        )}
      </div>
    </div>
  );
}
