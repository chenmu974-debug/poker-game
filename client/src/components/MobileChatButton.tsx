import { useState, useEffect, useRef } from 'react';
import { useGameStore, ChatMessage } from '../store/gameStore';
import ChatPanel from './ChatPanel';

interface PreviewItem {
  id: string;
  name: string;
  message: string;
  expiresAt: number;
}

export default function MobileChatButton() {
  const { chatMessages, mySessionId } = useGameStore();
  const [open, setOpen] = useState(false);
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
          className="fixed bottom-20 right-4 z-40 flex flex-col-reverse gap-1.5 items-end"
          style={{ maxWidth: 'calc(100vw - 2rem)' }}
        >
          {previews.map((item) => (
            <button
              key={item.id}
              onClick={handleOpen}
              className="flex items-start gap-2 bg-gray-900/95 border border-gray-700 rounded-2xl px-3 py-2 shadow-xl text-left animate-slide-up max-w-xs"
            >
              <span className="text-gray-400 text-xs font-semibold whitespace-nowrap mt-0.5">
                {item.name}
              </span>
              <span className="text-white text-xs break-words line-clamp-2">
                {item.message}
              </span>
            </button>
          ))}
        </div>
      )}

      {/* Floating button */}
      <button
        onClick={handleOpen}
        className="fixed bottom-4 right-4 z-40 w-14 h-14 bg-gold text-casino rounded-full shadow-2xl flex items-center justify-center text-2xl active:scale-95 transition-transform"
        style={{ WebkitTapHighlightColor: 'transparent' }}
      >
        💬
        {unread > 0 && (
          <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

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
    </>
  );
}
