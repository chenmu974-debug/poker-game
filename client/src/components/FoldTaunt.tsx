import { useGameStore } from '../store/gameStore';

const TAUNT_EMOJIS = ['💸', '😢', '🃏', '👋', '🤡', '😬', '💀', '🫡'];

export default function FoldTaunt() {
  const { foldAnimations } = useGameStore();

  return (
    <div className="fixed inset-0 pointer-events-none z-40">
      {foldAnimations.map((a) => (
        <div
          key={a.id}
          className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center animate-bounce-fade"
        >
          <span className="text-5xl">{TAUNT_EMOJIS[a.sessionId.charCodeAt(0) % TAUNT_EMOJIS.length]}</span>
          <span className="text-white font-bold text-lg mt-1 bg-black/70 rounded-lg px-3 py-1">
            {a.playerName} 弃牌了！
          </span>
        </div>
      ))}
    </div>
  );
}
