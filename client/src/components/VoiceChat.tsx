import { useWebRTC } from '../hooks/useWebRTC';
import { useGameStore } from '../store/gameStore';

interface Props {
  roomCode: string;
}

export default function VoiceChat({ roomCode }: Props) {
  const { mySessionId, gameState, voiceUsers } = useGameStore();
  const remoteIds = gameState?.players.map((p) => p.sessionId).filter((id) => id !== mySessionId) ?? [];
  const { isEnabled, isMuted, toggleVoice, toggleMute } = useWebRTC(roomCode, mySessionId, remoteIds);

  return (
    <div className="flex items-center gap-2">
      {/* Hidden audio elements for remote streams */}
      {remoteIds.map((sid) => (
        <audio key={sid} id={`audio-${sid}`} autoPlay playsInline />
      ))}

      <button
        onClick={toggleVoice}
        title={isEnabled ? '关闭语音' : '开启语音'}
        className={`p-1.5 rounded-lg text-sm transition-colors ${
          isEnabled
            ? 'bg-green-600 text-white hover:bg-green-500'
            : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
        }`}
      >
        {isEnabled ? '🎙️' : '🔇'}
      </button>

      {isEnabled && (
        <button
          onClick={toggleMute}
          title={isMuted ? '取消静音' : '静音'}
          className={`p-1.5 rounded-lg text-sm transition-colors ${
            isMuted ? 'bg-red-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
          }`}
        >
          {isMuted ? '🚫' : '🔊'}
        </button>
      )}

      {voiceUsers.length > 0 && (
        <div className="flex items-center gap-1">
          <span className="text-green-400 text-xs">●</span>
          <span className="text-gray-400 text-xs">{voiceUsers.length}人语音中</span>
        </div>
      )}
    </div>
  );
}
