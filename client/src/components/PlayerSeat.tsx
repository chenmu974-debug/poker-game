import { PersonalizedPlayer } from '../store/gameStore';
import PlayingCard from './PlayingCard';
import ChipStack from './ChipStack';

const AVATARS = ['🎩', '🦁', '🐯', '🦊', '🐺', '🐻', '🦝', '🐼'];

interface Props {
  player: PersonalizedPlayer;
  isMe: boolean;
  tablePosition: number;
}

export default function PlayerSeat({ player, isMe, tablePosition }: Props) {
  const isFolded = player.status === 'folded';
  const isAllIn = player.status === 'all-in';
  const isEliminated = player.status === 'eliminated';
  const isActive = player.isCurrentTurn;

  // Cards layout: for bottom seats show cards above the avatar, top seats below
  const cardsAbove = tablePosition >= 4; // top half of table

  return (
    <div className="flex flex-col items-center gap-1" style={{ minWidth: 90 }}>
      {/* Hole cards (top of table = show below seat) */}
      {!cardsAbove && player.holeCards.length > 0 && (
        <div className="flex gap-1 mb-1">
          {player.isHoleCardsVisible
            ? player.holeCards.map((c, i) => (
                <PlayingCard key={i} card={c} small />
              ))
            : player.holeCards.map((_, i) => (
                <PlayingCard key={i} faceDown small />
              ))}
        </div>
      )}
      {!cardsAbove && player.holeCards.length === 0 && !isFolded && !isEliminated && (
        <div className="flex gap-1 mb-1 opacity-0">
          <div className="w-8 h-11" />
        </div>
      )}

      {/* Seat circle */}
      <div className="relative">
        {/* Active pulse ring */}
        {isActive && (
          <div className="absolute inset-0 rounded-full border-2 border-gold animate-pulse-ring scale-125 pointer-events-none" />
        )}

        <div
          className={`relative flex flex-col items-center gap-0.5 rounded-xl px-3 py-2 transition-all
            ${isMe ? 'bg-blue-900/60 border border-blue-500/60' : 'bg-gray-900/80 border border-gray-700'}
            ${isActive ? 'border-gold shadow-lg shadow-gold/20' : ''}
            ${isFolded || isEliminated ? 'opacity-50' : ''}
            ${!player.isConnected ? 'opacity-60' : ''}
          `}
          style={{ minWidth: 80 }}
        >
          {/* Badge row */}
          <div className="absolute -top-2 -right-2 flex gap-0.5">
            {player.isDealer && (
              <span className="w-5 h-5 bg-white text-casino text-xs font-bold rounded-full flex items-center justify-center shadow">D</span>
            )}
          </div>
          <div className="absolute -top-2 -left-2 flex gap-0.5">
            {player.isSmallBlind && (
              <span className="w-5 h-5 bg-blue-500 text-white text-xs font-bold rounded-full flex items-center justify-center shadow">S</span>
            )}
            {player.isBigBlind && (
              <span className="w-5 h-5 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center shadow">B</span>
            )}
          </div>

          {/* Avatar */}
          <div className={`text-2xl ${isFolded ? 'grayscale' : ''}`}>
            {AVATARS[player.avatar] ?? '🎩'}
          </div>

          {/* Name */}
          <div className="text-white text-xs font-medium truncate max-w-[72px]">
            {player.name}
            {!player.isConnected && <span className="text-red-400 ml-1">📡</span>}
          </div>

          {/* Chips */}
          <div className={`text-xs font-bold ${player.chips < 100 ? 'text-red-400' : 'text-gold'}`}>
            ${player.chips.toLocaleString()}
          </div>

          {/* Status label */}
          {isFolded && (
            <div className="text-xs text-gray-400 font-medium tracking-wider">已弃牌</div>
          )}
          {isAllIn && (
            <div className="text-xs text-yellow-400 font-bold animate-pulse">全押</div>
          )}
          {isEliminated && (
            <div className="text-xs text-red-400 font-medium">已淘汰</div>
          )}
        </div>
      </div>

      {/* Current bet display */}
      {player.bet > 0 && (
        <div className="flex items-center gap-1 mt-0.5">
          <ChipStack amount={player.bet} small />
          <span className="text-xs text-yellow-300 font-bold">${player.bet}</span>
        </div>
      )}

      {/* Hole cards (bottom half of table) */}
      {cardsAbove && player.holeCards.length > 0 && (
        <div className="flex gap-1 mt-1">
          {player.isHoleCardsVisible
            ? player.holeCards.map((c, i) => (
                <PlayingCard key={i} card={c} small />
              ))
            : player.holeCards.map((_, i) => (
                <PlayingCard key={i} faceDown small />
              ))}
        </div>
      )}
    </div>
  );
}
