import { useGameStore } from '../store/gameStore';

export default function PotDisplay() {
  const { gameState } = useGameStore();
  if (!gameState) return null;

  const { pot, sidePots } = gameState;

  return (
    <div className="flex flex-col items-center gap-1">
      <div className="flex items-center gap-2 bg-black/40 rounded-full px-4 py-1.5 border border-gold/30">
        <span className="text-gray-400 text-xs font-medium">POT</span>
        <span className="text-gold font-bold text-lg font-display tracking-wide">
          ${pot.toLocaleString()}
        </span>
      </div>
      {sidePots.length > 0 && sidePots.map((sp, i) => (
        <div key={i} className="flex items-center gap-1 text-xs text-gray-500">
          <span>Side Pot {i + 1}:</span>
          <span className="text-yellow-600">${sp.amount}</span>
        </div>
      ))}
    </div>
  );
}
