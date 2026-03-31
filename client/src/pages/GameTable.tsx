import { useState, useEffect, useRef } from 'react';
import { useGameStore, PersonalizedPlayer } from '../store/gameStore';
import PlayerSeat from '../components/PlayerSeat';
import CommunityCards from '../components/CommunityCards';
import ActionPanel from '../components/ActionPanel';
import PotDisplay from '../components/PotDisplay';
import ChatPanel from '../components/ChatPanel';
import WinnerOverlay from '../components/WinnerOverlay';
import EmojiReactions from '../components/EmojiReactions';
import FoldTaunt from '../components/FoldTaunt';
import VoiceChat from '../components/VoiceChat';
import RedEnvelopeModal from '../components/RedEnvelopeModal';
import MobileChatButton from '../components/MobileChatButton';
import TauntModal from '../components/TauntModal';

// Seat positions for up to 8 players (percentages of table width/height)
// Index 0 = bottom center (you), going counter-clockwise
const SEAT_POSITIONS = [
  { x: 50, y: 88 },   // 0: bottom center (you)
  { x: 14, y: 72 },   // 1: bottom left
  { x: 4,  y: 46 },   // 2: left
  { x: 14, y: 20 },   // 3: top left
  { x: 50, y: 8 },    // 4: top center
  { x: 86, y: 20 },   // 5: top right
  { x: 96, y: 46 },   // 6: right
  { x: 86, y: 72 },   // 7: bottom right
];

export default function GameTable() {
  const { gameState, mySessionId, showWinnerOverlay, winners, isSpectator, currentRoomCode, tauntedSessionId } = useGameStore();
  const [showRedEnvelope, setShowRedEnvelope] = useState(false);
  const [tauntTarget, setTauntTarget] = useState<{ sessionId: string; name: string } | null>(null);

  // Deal animation: fires when handNumber increases
  const prevHandRef = useRef(gameState?.handNumber ?? 0);
  const [dealingHandNum, setDealingHandNum] = useState<number | null>(null);
  useEffect(() => {
    if (!gameState) return;
    if (gameState.handNumber !== prevHandRef.current) {
      prevHandRef.current = gameState.handNumber;
      setDealingHandNum(gameState.handNumber);
      // Clear after all cards dealt (8 seats × 2 cards × 150ms + buffer)
      setTimeout(() => setDealingHandNum(null), 8 * 2 * 150 + 800);
    }
  }, [gameState?.handNumber]);
  if (!gameState) return null;

  const { players } = gameState;

  // Find my position in the players array
  const myIdx = players.findIndex((p) => p.sessionId === mySessionId);

  // Reorder players so that "me" is always at visual seat 0 (bottom)
  const orderedPlayers: (PersonalizedPlayer | null)[] = Array(8).fill(null);
  for (let i = 0; i < players.length; i++) {
    const visualSeat = myIdx >= 0 ? (i - myIdx + players.length) % players.length : i;
    orderedPlayers[visualSeat] = players[i];
  }

  // Compute per-visual-seat deal delays (clockwise from dealer)
  const dealerVisualSeat = orderedPlayers.findIndex((p) => p?.isDealer);
  const activeSeatCount = orderedPlayers.filter(Boolean).length;
  const getDealDelays = (visualIdx: number): [number, number] => {
    const base = dealerVisualSeat >= 0
      ? (visualIdx - dealerVisualSeat - 1 + activeSeatCount) % activeSeatCount
      : visualIdx;
    return [base * 150, (activeSeatCount + base) * 150];
  };

  return (
    <div className="h-screen bg-casino flex overflow-hidden">
      {/* Main table area */}
      <div className="flex-1 relative flex items-center justify-center p-4">
        {/* Spectator banner */}
        {isSpectator && (
          <div className="absolute top-2 left-1/2 -translate-x-1/2 z-20 bg-purple-600/80 text-white text-xs font-bold px-4 py-1 rounded-full">
            👁 观战模式
          </div>
        )}

        {/* Table */}
        <div
          className="relative"
          style={{ width: 'min(90vw, 900px)', height: 'min(75vh, 560px)' }}
        >
          {/* Felt surface */}
          <div
            className="absolute inset-0 rounded-[50%] border-8 border-[#2a1a0a] shadow-2xl"
            style={{
              background: 'radial-gradient(ellipse at center, #1f4a35 0%, #1a3a2a 50%, #163020 100%)',
              boxShadow: 'inset 0 0 60px rgba(0,0,0,0.4), 0 0 40px rgba(0,0,0,0.6)',
            }}
          />

          {/* Table inner line */}
          <div
            className="absolute rounded-[50%] border-2 border-[#2e5c42] pointer-events-none"
            style={{ inset: '12px' }}
          />

          {/* Center content */}
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
            <PotDisplay />
            <CommunityCards cards={gameState.communityCards} phase={gameState.phase} />
          </div>

          {/* Player seats */}
          {orderedPlayers.map((player, visualIdx) => {
            if (!player) return null;
            const pos = SEAT_POSITIONS[visualIdx];
            const isMe = player.sessionId === mySessionId;

            return (
              <div
                key={player.sessionId}
                className="absolute"
                style={{
                  left: `${pos.x}%`,
                  top: `${pos.y}%`,
                  transform: 'translate(-50%, -50%)',
                  zIndex: isMe ? 10 : 5,
                }}
              >
                <PlayerSeat
                  player={player}
                  isMe={isMe}
                  tablePosition={visualIdx}
                  isTaunted={tauntedSessionId === player.sessionId}
                  onTaunt={!isMe && !isSpectator ? (sid, name) => setTauntTarget({ sessionId: sid, name }) : undefined}
                  dealDelays={dealingHandNum !== null ? getDealDelays(visualIdx) : undefined}
                />
              </div>
            );
          })}
        </div>
      </div>

      {/* Right sidebar — hidden on mobile */}
      <div className="hidden md:flex w-64 flex-col border-l border-gray-800 bg-gray-950">
        {/* Header */}
        <div className="p-2 border-b border-gray-800 flex items-center justify-between flex-shrink-0">
          <div className="text-gray-500 text-xs">第 {gameState.handNumber} 局 · {phaseLabel(gameState.phase)}</div>
          <div className="flex items-center gap-1">
            {currentRoomCode && <VoiceChat roomCode={currentRoomCode} />}
            {!isSpectator && (
              <button
                onClick={() => setShowRedEnvelope(true)}
                className="p-1 text-sm hover:scale-110 transition-transform"
                title="发红包"
              >
                🧧
              </button>
            )}
          </div>
        </div>
        <ChatPanel />
      </div>

      {/* Action Panel (hidden for spectators) */}
      {!isSpectator && <ActionPanel />}

      {/* Overlays */}
      {showWinnerOverlay && <WinnerOverlay winners={winners} />}
      <EmojiReactions />
      <FoldTaunt />
      {showRedEnvelope && <RedEnvelopeModal onClose={() => setShowRedEnvelope(false)} />}
      {tauntTarget && (
        <TauntModal
          targetSessionId={tauntTarget.sessionId}
          targetName={tauntTarget.name}
          onClose={() => setTauntTarget(null)}
        />
      )}

      {/* Mobile floating chat button */}
      <div className="md:hidden">
        <MobileChatButton />
      </div>
    </div>
  );
}

function phaseLabel(phase: string): string {
  const map: Record<string, string> = {
    'pre-flop': '翻牌前', flop: '翻牌', turn: '转牌',
    river: '河牌', showdown: '摊牌', waiting: '等待中',
  };
  return map[phase] ?? phase;
}
