import { useState, useEffect, useRef } from 'react';
import { useGameStore } from '../store/gameStore';
import socket from '../socket';
import Timer from './Timer';
import { playSound } from '../utils/audio';

export default function ActionPanel() {
  const {
    gameState, isMyTurn, mySessionId, canCheck, callAmount,
    minRaise, maxRaise, turnTimeLimit,
  } = useGameStore();

  const [raiseAmount, setRaiseAmount] = useState(0);
  const [showRaise, setShowRaise] = useState(false);
  const timerStartRef = useRef<number>(0);

  useEffect(() => {
    if (isMyTurn && gameState) {
      const bigBlind = gameState.lastRaiseAmount > 0 ? gameState.lastRaiseAmount : gameState.currentBet;
      const defaultRaise = Math.min(
        (gameState.currentBet || bigBlind) * 2,
        maxRaise,
      );
      setRaiseAmount(defaultRaise);
      setShowRaise(false);
      timerStartRef.current = Date.now();
      playSound('yourTurn');
    }
  }, [isMyTurn]);

  if (!gameState || !isMyTurn) return null;

  const currentPlayer = gameState.players.find((p) => p.sessionId === mySessionId);
  if (!currentPlayer) return null;

  const emit = (action: string, amount?: number) => {
    playSound('chip');
    useGameStore.getState().setTurnInfo({
      timeLimit: 30, canCheck: false, callAmount: 0, minRaise: 0, maxRaise: 0,
    });
    // Clear isMyTurn
    useGameStore.setState({ isMyTurn: false });
    socket.emit('player_action', {
      roomCode: gameState.roomCode,
      action,
      amount,
      sessionId: mySessionId,
    });
  };

  const bigBlind = gameState.currentBet || (gameState.lastRaiseAmount * 2);
  const effectiveMin = Math.max(minRaise, bigBlind, gameState.currentBet);

  return (
    <div className="fixed bottom-0 left-0 right-0 z-20">
      <div className="w-full px-3 pb-4">
        <div className="bg-gray-950/95 backdrop-blur border border-gray-700 rounded-2xl shadow-2xl p-4">
          {/* Timer row */}
          <div className="flex items-center justify-between mb-3">
            <span className="text-gold font-display font-bold text-sm tracking-wide">⏱ 你的回合</span>
            <Timer seconds={turnTimeLimit} onExpire={() => {}} />
          </div>

          {/* Raise slider */}
          {showRaise && (
            <div className="mb-4 bg-gray-900 rounded-xl p-3">
              <div className="flex items-center justify-between mb-2">
                <span className="text-gray-400 text-xs">加注金额</span>
                <span className="text-gold font-bold">${raiseAmount}</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-gray-500 text-xs">${effectiveMin}</span>
                <input
                  type="range"
                  min={effectiveMin}
                  max={maxRaise}
                  step={bigBlind || 1}
                  value={raiseAmount}
                  onChange={(e) => setRaiseAmount(Number(e.target.value))}
                  className="flex-1 accent-gold"
                />
                <span className="text-gray-500 text-xs">全押</span>
              </div>
              <div className="flex gap-2 mt-2">
                {[2, 3, 4].map((mult) => {
                  const val = Math.min((bigBlind || gameState.currentBet) * mult, maxRaise);
                  return (
                    <button
                      key={mult}
                      onClick={() => setRaiseAmount(val)}
                      className="flex-1 py-1 text-xs bg-gray-800 text-gray-300 rounded hover:bg-gray-700 transition-colors"
                    >
                      {mult}x (${val})
                    </button>
                  );
                })}
                <button
                  onClick={() => setRaiseAmount(maxRaise)}
                  className="flex-1 py-1 text-xs bg-yellow-900/60 text-yellow-400 rounded hover:bg-yellow-900 transition-colors font-bold"
                >
                  全押
                </button>
              </div>
            </div>
          )}

          {/* Action buttons */}
          <div className="flex gap-2">
            <button
              onClick={() => emit('fold')}
              className="flex-1 py-4 md:py-3 bg-red-900/80 text-red-300 font-bold rounded-xl hover:bg-red-800 active:scale-95 transition-all border border-red-800/50 text-base md:text-sm"
            >
              弃牌
            </button>

            {canCheck ? (
              <button
                onClick={() => emit('check')}
                className="flex-1 py-4 md:py-3 bg-gray-700 text-white font-bold rounded-xl hover:bg-gray-600 active:scale-95 transition-all border border-gray-600 text-base md:text-sm"
              >
                过牌
              </button>
            ) : (
              <button
                onClick={() => emit('call', callAmount)}
                className="flex-1 py-4 md:py-3 bg-blue-800 text-blue-100 font-bold rounded-xl hover:bg-blue-700 active:scale-95 transition-all border border-blue-700 text-base md:text-sm"
              >
                跟注 ${callAmount}
              </button>
            )}

            {maxRaise > (gameState.currentBet || 0) && (
              <button
                onClick={() => {
                  if (showRaise) {
                    emit('raise', raiseAmount);
                  } else {
                    setShowRaise(true);
                  }
                }}
                className="flex-1 py-4 md:py-3 bg-gold/90 text-casino font-bold rounded-xl hover:bg-gold active:scale-95 transition-all text-base md:text-sm"
              >
                {showRaise ? `加注 $${raiseAmount}` : '加注 ▲'}
              </button>
            )}

            <button
              onClick={() => emit('all_in')}
              className="flex-1 py-4 md:py-3 bg-yellow-700/80 text-yellow-200 font-bold rounded-xl hover:bg-yellow-700 active:scale-95 transition-all border border-yellow-700/50 text-base md:text-sm"
            >
              全押
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
