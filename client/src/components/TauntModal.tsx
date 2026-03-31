import socket from '../socket';
import { useGameStore } from '../store/gameStore';

const TAUNTS = [
  '敢不敢All In？',
  '你的筹码在哭泣',
  '摊牌吧懦夫',
  '今晚谁是冤大头？',
  '你是来捐款的吗？',
  '手气这么差还不走？',
  '我闭着眼都能赢你',
  '你的表情出卖了你',
  '该补充筹码了吧',
  '下注前先照照镜子',
  '这局你又要贡献筹码了',
  '牌技不行就别来',
  '我已经看穿你了',
  '你在虚张声势对吧',
  '这把我必赢',
];

interface Props {
  targetSessionId: string;
  targetName: string;
  onClose: () => void;
}

export default function TauntModal({ targetSessionId, targetName, onClose }: Props) {
  const { mySessionId, currentRoomCode } = useGameStore();

  const send = (content: string) => {
    if (!currentRoomCode) return;
    socket.emit('taunt', {
      roomCode: currentRoomCode,
      sessionId: mySessionId,
      targetSessionId,
      content,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/70 flex items-end sm:items-center justify-center z-50" onClick={onClose}>
      <div
        className="bg-gray-900 border border-gray-700 rounded-t-2xl sm:rounded-2xl w-full sm:max-w-sm shadow-2xl pb-safe"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-4 pt-4 pb-2 border-b border-gray-800">
          <p className="text-white font-bold text-sm">
            🗡 嘲讽 <span className="text-gold">{targetName}</span>
          </p>
        </div>
        <div className="overflow-y-auto" style={{ maxHeight: '60vh' }}>
          {TAUNTS.map((t) => (
            <button
              key={t}
              onClick={() => send(t)}
              className="w-full text-left px-4 py-3 text-sm text-gray-200 hover:bg-gray-800 active:bg-gray-700 border-b border-gray-800/50 transition-colors"
            >
              {t}
            </button>
          ))}
        </div>
        <div className="p-3">
          <button
            onClick={onClose}
            className="w-full py-2 bg-gray-800 text-gray-400 rounded-xl text-sm"
          >
            取消
          </button>
        </div>
      </div>
    </div>
  );
}
