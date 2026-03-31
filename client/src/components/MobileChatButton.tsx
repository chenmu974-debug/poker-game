import { useState } from 'react';
import { useGameStore } from '../store/gameStore';
import socket from '../socket';
import ChatPanel from './ChatPanel';
import RedEnvelopeModal from './RedEnvelopeModal';

const QUICK_EMOJIS = ['👍', '😂', '😮', '😢', '🔥', '💪', '🤔', '👏'];

export default function MobileChatButton() {
  const { chatMessages, mySessionId, isSpectator, currentRoomCode } = useGameStore();
  const [chatOpen, setChatOpen] = useState(false);
  const [emojiOpen, setEmojiOpen] = useState(false);
  const [showEnvelope, setShowEnvelope] = useState(false);

  // Latest 3 messages (including own), always up-to-date
  const latest3 = chatMessages.slice(-3);

  const openChat = () => {
    setChatOpen(true);
    setEmojiOpen(false);
  };

  const sendEmoji = (emoji: string) => {
    if (!currentRoomCode) return;
    socket.emit('emoji_reaction', { roomCode: currentRoomCode, sessionId: mySessionId, emoji });
    setEmojiOpen(false);
  };

  return (
    <>
      {/* Preview bubbles — fixed above chat button, always visible when chat is closed */}
      {!chatOpen && latest3.length > 0 && (
        <div
          className="fixed z-40 flex flex-col gap-1.5 items-end"
          style={{ right: 12, bottom: 130, maxWidth: '65vw' }}
        >
          {latest3.map((msg) => (
            <button
              key={msg.id}
              onClick={openChat}
              className="w-full flex items-start gap-2 bg-gray-900/97 border border-gray-600 rounded-2xl px-4 py-2.5 shadow-2xl text-left animate-slide-up"
            >
              <span
                className={`font-semibold whitespace-nowrap mt-0.5 ${msg.sessionId === mySessionId ? 'text-gold' : 'text-gray-300'}`}
                style={{ fontSize: 15 }}
              >
                {msg.sessionId === mySessionId ? '我' : msg.name}:
              </span>
              <span className="text-white break-words line-clamp-2" style={{ fontSize: 15 }}>
                {msg.message}
              </span>
            </button>
          ))}
        </div>
      )}

      {/* Floating button stack */}
      <div className="fixed bottom-4 right-4 z-40 flex flex-col gap-3 items-center">
        {!isSpectator && (
          <button
            onClick={() => setShowEnvelope(true)}
            className="w-14 h-14 bg-red-600 text-white rounded-full shadow-2xl flex items-center justify-center text-2xl active:scale-95 transition-transform"
            style={{ WebkitTapHighlightColor: 'transparent' }}
          >
            🧧
          </button>
        )}
        <button
          onClick={() => { setEmojiOpen((v) => !v); setChatOpen(false); }}
          className="w-14 h-14 bg-purple-600 text-white rounded-full shadow-2xl flex items-center justify-center text-2xl active:scale-95 transition-transform"
          style={{ WebkitTapHighlightColor: 'transparent' }}
        >
          😊
        </button>
        <button
          onClick={openChat}
          className="w-14 h-14 bg-gold text-casino rounded-full shadow-2xl flex items-center justify-center text-2xl active:scale-95 transition-transform"
          style={{ WebkitTapHighlightColor: 'transparent' }}
        >
          💬
        </button>
      </div>

      {/* Emoji bottom sheet */}
      {emojiOpen && (
        <div className="fixed inset-0 z-50" onClick={() => setEmojiOpen(false)}>
          <div
            className="absolute bottom-0 left-0 right-0 bg-gray-900 border-t border-gray-700 rounded-t-2xl p-4 pb-8"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="text-gray-400 text-xs text-center mb-3">选择表情发送给全桌</div>
            <div className="grid grid-cols-4 gap-3">
              {QUICK_EMOJIS.map((e) => (
                <button
                  key={e}
                  onClick={() => sendEmoji(e)}
                  className="h-14 text-3xl rounded-xl bg-gray-800 active:bg-gray-700 flex items-center justify-center active:scale-90 transition-transform"
                >
                  {e}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Full-screen chat overlay */}
      {chatOpen && (
        <div className="fixed inset-0 z-50 flex flex-col bg-gray-950">
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-800 flex-shrink-0">
            <span className="text-white font-bold">聊天</span>
            <button
              onClick={() => setChatOpen(false)}
              className="text-gray-400 text-2xl leading-none active:text-white"
            >
              ×
            </button>
          </div>
          <div className="flex-1 overflow-hidden">
            <ChatPanel />
          </div>
        </div>
      )}

      {showEnvelope && <RedEnvelopeModal onClose={() => setShowEnvelope(false)} />}
    </>
  );
}
