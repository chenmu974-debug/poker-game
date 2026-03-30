import { Card } from '../store/gameStore';

const SUIT_SYMBOLS: Record<string, string> = {
  spades: '♠',
  hearts: '♥',
  diamonds: '♦',
  clubs: '♣',
};

const RED_SUITS = new Set(['hearts', 'diamonds']);

interface Props {
  card?: Card;
  faceDown?: boolean;
  small?: boolean;
  highlighted?: boolean;
  animateIn?: boolean;
}

export default function PlayingCard({ card, faceDown, small, highlighted, animateIn }: Props) {
  const size = small
    ? 'w-8 h-11 text-xs'
    : 'w-12 h-16 text-sm';

  if (faceDown || !card) {
    return (
      <div
        className={`${size} rounded-md border-2 border-gray-600 flex items-center justify-center shadow-lg ${
          animateIn ? 'animate-flip-card' : ''
        }`}
        style={{
          background: 'repeating-linear-gradient(45deg, #1e3a5f, #1e3a5f 2px, #1a3050 2px, #1a3050 8px)',
          borderColor: '#2a4a7f',
        }}
      >
        <span className="text-blue-900 opacity-30 text-lg">🂠</span>
      </div>
    );
  }

  const isRed = RED_SUITS.has(card.suit);
  const symbol = SUIT_SYMBOLS[card.suit];

  return (
    <div
      className={`${size} rounded-md bg-white shadow-lg flex flex-col p-0.5 select-none relative
        ${highlighted ? 'ring-2 ring-gold shadow-gold/50 shadow-lg' : ''}
        ${animateIn ? 'animate-flip-card' : ''}
        border border-gray-200`}
    >
      {/* Top-left */}
      <div className={`leading-none font-bold ${isRed ? 'text-red-600' : 'text-gray-900'}`}>
        <div className={small ? 'text-[10px]' : 'text-xs'}>{card.rank}</div>
        <div className={small ? 'text-[10px]' : 'text-xs'}>{symbol}</div>
      </div>
      {/* Center suit */}
      <div className={`flex-1 flex items-center justify-center font-bold ${isRed ? 'text-red-600' : 'text-gray-900'}`}>
        <span className={small ? 'text-base' : 'text-xl'}>{symbol}</span>
      </div>
      {/* Bottom-right (rotated) */}
      <div
        className={`leading-none font-bold self-end rotate-180 ${isRed ? 'text-red-600' : 'text-gray-900'}`}
      >
        <div className={small ? 'text-[10px]' : 'text-xs'}>{card.rank}</div>
        <div className={small ? 'text-[10px]' : 'text-xs'}>{symbol}</div>
      </div>
    </div>
  );
}
