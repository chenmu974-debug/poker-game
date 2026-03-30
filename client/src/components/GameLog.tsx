import { useGameStore } from '../store/gameStore';

export default function GameLog() {
  const { gameLogs } = useGameStore();

  return (
    <div className="flex-1 overflow-y-auto p-3 space-y-1">
      {gameLogs.length === 0 && (
        <p className="text-gray-600 text-xs text-center mt-4">游戏日志将在这里显示...</p>
      )}
      {gameLogs.map((log, i) => (
        <div
          key={i}
          className={`text-xs py-1 px-2 rounded transition-all ${
            i === 0 ? 'animate-slide-in bg-gray-800/60 text-white' : 'text-gray-500'
          }`}
        >
          {log}
        </div>
      ))}
    </div>
  );
}
