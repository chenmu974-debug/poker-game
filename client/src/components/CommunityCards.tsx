import { useEffect, useRef, useState } from 'react';
import PlayingCard from './PlayingCard';
import { Card, GamePhase } from '../store/gameStore';
import { playSound } from '../utils/audio';

interface Props {
  cards: Card[];
  phase: GamePhase;
}

export default function CommunityCards({ cards, phase }: Props) {
  const prevCountRef = useRef(0);
  const [newCardIndices, setNewCardIndices] = useState<Set<number>>(new Set());

  useEffect(() => {
    const prev = prevCountRef.current;
    if (cards.length > prev) {
      const newSet = new Set<number>();
      for (let i = prev; i < cards.length; i++) newSet.add(i);
      setNewCardIndices(newSet);
      playSound('deal');
      setTimeout(() => setNewCardIndices(new Set()), 700);
    }
    prevCountRef.current = cards.length;
  }, [cards.length]);

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="flex gap-2 items-center justify-center">
        {[0, 1, 2, 3, 4].map((i) => (
          <div key={i} className="relative">
            {cards[i] ? (
              <PlayingCard
                card={cards[i]}
                animateIn={newCardIndices.has(i)}
              />
            ) : (
              <div className="w-12 h-16 rounded-md border-2 border-dashed border-gray-700/50 opacity-30" />
            )}
          </div>
        ))}
      </div>
      {phase !== 'waiting' && phase !== 'pre-flop' && (
        <div className="text-xs text-gray-500 tracking-wider uppercase">{phaseLabel(phase)}</div>
      )}
    </div>
  );
}

function phaseLabel(phase: GamePhase): string {
  const labels: Partial<Record<GamePhase, string>> = {
    flop: '翻牌', turn: '转牌', river: '河牌', showdown: '摊牌',
  };
  return labels[phase] ?? '';
}
