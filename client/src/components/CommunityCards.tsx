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
  // Cards waiting to flip (still face-down)
  const [faceDownSet, setFaceDownSet] = useState<Set<number>>(new Set());
  // Cards mid-flip (playing animateIn)
  const [flippingSet, setFlippingSet] = useState<Set<number>>(new Set());

  useEffect(() => {
    const prev = prevCountRef.current;
    if (cards.length === 0 && prev > 0) {
      // New hand — reset
      prevCountRef.current = 0;
      setFaceDownSet(new Set());
      setFlippingSet(new Set());
      return;
    }
    if (cards.length > prev) {
      const newIndices: number[] = [];
      for (let i = prev; i < cards.length; i++) newIndices.push(i);
      prevCountRef.current = cards.length;
      playSound('deal');

      // Show new cards face-down immediately
      setFaceDownSet((s) => new Set([...s, ...newIndices]));

      // Stagger-reveal each card with Y-axis flip
      newIndices.forEach((idx, j) => {
        setTimeout(() => {
          setFaceDownSet((s) => { const n = new Set(s); n.delete(idx); return n; });
          setFlippingSet((s) => new Set([...s, idx]));
          setTimeout(() => {
            setFlippingSet((s) => { const n = new Set(s); n.delete(idx); return n; });
          }, 550);
        }, j * 200 + 100);
      });
    }
  }, [cards.length]);

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="flex gap-2 items-center justify-center">
        {[0, 1, 2, 3, 4].map((i) => (
          <div key={i} className="relative">
            {cards[i] ? (
              faceDownSet.has(i)
                ? <PlayingCard faceDown />
                : <PlayingCard card={cards[i]} animateIn={flippingSet.has(i)} />
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
