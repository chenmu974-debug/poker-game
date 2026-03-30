import { useEffect, useRef } from 'react';
import { WinnerInfo } from '../store/gameStore';
import PlayingCard from './PlayingCard';
import { playSound } from '../utils/audio';

interface Props {
  winners: WinnerInfo[];
}

export default function WinnerOverlay({ winners }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    playSound('win');
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d')!;
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const particles = Array.from({ length: 120 }, () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height * 0.5,
      vx: (Math.random() - 0.5) * 4,
      vy: Math.random() * 3 + 1,
      r: Math.random() * 8 + 3,
      color: ['#c9a84c', '#f0d060', '#fff', '#e8a020', '#ffd700'][Math.floor(Math.random() * 5)],
      life: 1,
    }));

    let frame = 0;
    const anim = setInterval(() => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      frame++;
      for (const p of particles) {
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.05;
        p.life -= 0.008;
        if (p.y > canvas.height) { p.y = -10; p.x = Math.random() * canvas.width; p.vy = 2; p.life = 1; }
        ctx.globalAlpha = Math.max(0, p.life);
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    }, 16);

    return () => clearInterval(anim);
  }, []);

  if (!winners.length) return null;

  const main = winners[0];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none">
      <canvas ref={canvasRef} className="absolute inset-0 pointer-events-none" />

      <div className="relative animate-winner-pop text-center px-8 py-6 bg-black/80 rounded-3xl border-2 border-gold shadow-2xl max-w-sm w-full mx-4">
        <div className="text-5xl mb-2">🏆</div>
        <div className="font-display text-gold text-3xl font-bold mb-1">
          {main.playerName}
        </div>
        <div className="text-white text-xl font-bold mb-1">
          赢得 ${main.amount.toLocaleString()}！
        </div>
        <div className="text-gray-400 text-sm mb-3">{main.hand.name}</div>

        {/* Winning cards */}
        {main.holeCards.length > 0 && (
          <div className="flex justify-center gap-2">
            {main.holeCards.map((c, i) => (
              <PlayingCard key={i} card={c} highlighted />
            ))}
          </div>
        )}

        {/* Other winners */}
        {winners.length > 1 && (
          <div className="mt-3 text-xs text-gray-400">
            {winners.slice(1).map((w) => (
              <div key={w.playerId}>{w.playerName} +${w.amount}</div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
