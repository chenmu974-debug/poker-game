import { useGameStore } from '../store/gameStore';

export default function EmojiReactions() {
  const { emojiReactions } = useGameStore();

  return (
    <div className="fixed inset-0 pointer-events-none z-50">
      {emojiReactions.map((r) => (
        <div
          key={r.id}
          className="absolute left-1/2 bottom-32 -translate-x-1/2 flex flex-col items-center animate-float-up"
          style={{ '--delay': `${Math.random() * 0.3}s` } as React.CSSProperties}
        >
          <span className="text-4xl">{r.emoji}</span>
          <span className="text-xs text-white bg-black/50 rounded px-1 mt-1">{r.name}</span>
        </div>
      ))}
    </div>
  );
}
