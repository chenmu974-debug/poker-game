import { useState, useEffect, useRef } from 'react';
import { useGameStore, ChatMessage } from '../store/gameStore';
import ChatPanel from './ChatPanel';
import RedEnvelopeModal from './RedEnvelopeModal';

interface PreviewItem {
  id: string;
  name: string;
  message: string;
  expiresAt: number;
}

export default function MobileChatButton() {
  const { chatMessages, mySessionId, isSpectator } = useGameStore();
  const [open, setOpen] = useState(false);
  const [showEnvelope, setShowEnvelope] = useState(false);
  const [previews, setPreviews] = useState<PreviewItem[]>([]);
  const prevLenRef = useRef(chatMessages.length);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const prev = prevLenRef.current;
    prevLenRef.current = chatMessages.length;

    if (open) return;

    const newMsgs: ChatMessage[] = chatMessages.slice(prev).filter(
      (m) => m.sessionId !== mySessionId,
    );
    if (newMsgs.length === 0) return;

    const now = Date.now();
    const expiresAt = now + 5000;

    setPreviews((p) => {
      const next = [
        ...p,
        ...newMsgs.map((m) => ({ id: m.id, name: m.name, message: m.message, expiresAt })),
      ].slice(-5);
      return next;
    });

    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      setPreviews((p) => p.filter((item) => Date.now() < item.expiresAt));
    }, 5100);
  }, [chatMessages, open, mySessionId]);

  const handleOpen = () => {
    setOpen(true);
    setPreviews([]);
    prevLenRef.current = chatMessages.length;
  };

  const unread = previews.length;

  return (
    <>
      {/* Preview bubbles */}
      {!open && previews.length > 0 && (
        <div
          className="fixed z-40 flex flex-col-reverse gap-2 items-end"
          style={{ right: 12, bottom: 130, maxWidth: '65vw' }}
        >
          {previews.map((item) => (
            <button
              key={item.id}
              onClick={handleOpen}
              className="w-full flex items-start gap-3 bg-gray-900/97 border border-gray-600 rounded-2xl px-4 py-3 shadow-2xl text-left animate-slide-up"
            >
              <span className="text-gray-300 font-semibold whitespace-nowrap mt-0.5" style={{ fontSize: 16 }}>
                {item.name}:
              </span>
              <span className="text-white break-words line-clamp-2" style={{ fontSize: 16 }}>
                {item.message}
              </span>
            </button>
          ))}
        </div>
      )}

      {/* Floating buttons: red envelope + chat */}
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
          onClick={handleOpen}
          className="relative w-14 h-14 bg-gold text-casino rounded-full shadow-2xl flex items-center justify-center text-2xl active:scale-95 transition-transform"
          style={{ WebkitTapHighlightColor: 'transparent' }}
        >
          💬
          {unread > 0 && (
            <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
              {unread > 9 ? '9+' : unread}
            </span>
          )}
        </button>
      </div>

      {/* Full-screen chat overlay */}
      {open && (
        <div className="fixed inset-0 z-50 flex flex-col bg-gray-950">
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-800 flex-shrink-0">
            <span className="text-white font-bold">聊天</span>
            <button
              onClick={() => setOpen(false)}
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
