import { useState, useRef, useEffect } from 'react';
import { useGameStore } from '../store/gameStore';
import socket from '../socket';

const AVATARS = ['🎩', '🦁', '🐯', '🦊', '🐺', '🐻', '🦝', '🐼'];
const QUICK_EMOJIS = ['👍', '😂', '😮', '😢', '🔥', '💪', '🤔', '👏'];

export default function ChatPanel() {
  const { chatMessages, gameLogs, mySessionId, currentRoomCode } = useGameStore();
  const [tab, setTab] = useState<'log' | 'chat'>('chat');
  const [input, setInput] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (tab === 'chat') bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages, tab]);

  const sendMsg = () => {
    if (!input.trim() || !currentRoomCode) return;
    socket.emit('chat_message', {
      roomCode: currentRoomCode,
      sessionId: mySessionId,
      message: input.trim(),
    });
    setInput('');
  };

  const sendEmoji = (emoji: string) => {
    if (!currentRoomCode) return;
    socket.emit('emoji_reaction', {
      roomCode: currentRoomCode,
      sessionId: mySessionId,
      emoji,
    });
  };

  return (
    <div className="flex flex-col h-full">
      {/* Tabs */}
      <div className="flex border-b border-gray-800 flex-shrink-0">
        {(['log', 'chat'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex-1 py-2 text-xs font-medium transition-colors ${
              tab === t ? 'text-gold border-b-2 border-gold' : 'text-gray-500 hover:text-gray-300'
            }`}
          >
            {t === 'log' ? '游戏日志' : '聊天'}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-2 space-y-1 text-xs">
        {tab === 'log' ? (
          gameLogs.map((log, i) => (
            <div key={i} className="text-gray-400 leading-relaxed">{log}</div>
          ))
        ) : (
          <>
            {chatMessages.map((msg) => (
              <div key={msg.id} className={`flex gap-2 ${msg.sessionId === mySessionId ? 'flex-row-reverse' : ''}`}>
                <span className="text-lg flex-shrink-0">{AVATARS[msg.avatar] ?? '🎩'}</span>
                <div className={`max-w-[80%] ${msg.sessionId === mySessionId ? 'items-end' : 'items-start'} flex flex-col`}>
                  <span className="text-gray-500 text-[10px] mb-0.5">{msg.name}</span>
                  <div className={`rounded-lg px-2 py-1 text-xs break-words ${
                    msg.sessionId === mySessionId
                      ? 'bg-gold/20 text-gold-light'
                      : 'bg-gray-800 text-gray-200'
                  }`}>
                    {msg.message}
                  </div>
                </div>
              </div>
            ))}
            <div ref={bottomRef} />
          </>
        )}
      </div>

      {/* Quick emojis */}
      <div className="flex gap-1 px-2 py-1 border-t border-gray-800 flex-shrink-0">
        {QUICK_EMOJIS.map((e) => (
          <button
            key={e}
            onClick={() => sendEmoji(e)}
            className="text-base hover:scale-125 transition-transform"
            title="发送表情"
          >
            {e}
          </button>
        ))}
      </div>

      {/* Chat input */}
      <div className="flex gap-1 p-2 border-t border-gray-800 flex-shrink-0">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && sendMsg()}
          placeholder="发送消息..."
          maxLength={200}
          className="flex-1 bg-gray-800 border border-gray-700 rounded px-2 py-1 text-xs text-white placeholder-gray-600 focus:outline-none focus:border-gold"
        />
        <button
          onClick={sendMsg}
          className="px-2 py-1 bg-gold text-casino text-xs font-bold rounded hover:bg-gold-light transition-colors"
        >
          发
        </button>
      </div>
    </div>
  );
}
