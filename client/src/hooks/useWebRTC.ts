import { useEffect, useRef, useState, useCallback } from 'react';
import socket from '../socket';

const ICE_SERVERS = [{ urls: 'stun:stun.l.google.com:19302' }];

type Signal =
  | { type: 'offer'; sdp: RTCSessionDescriptionInit }
  | { type: 'answer'; sdp: RTCSessionDescriptionInit }
  | { type: 'ice'; candidate: RTCIceCandidateInit | null };

export function useWebRTC(roomCode: string, mySessionId: string, remoteSessionIds: string[]) {
  const [isEnabled, setIsEnabled] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const localStreamRef = useRef<MediaStream | null>(null);
  const peersRef = useRef<Map<string, RTCPeerConnection>>(new Map());
  const remoteStreamsRef = useRef<Map<string, MediaStream>>(new Map());
  const [, forceUpdate] = useState(0);

  const createPeer = useCallback(
    (targetSessionId: string, isInitiator: boolean) => {
      if (peersRef.current.has(targetSessionId)) return;
      const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });
      peersRef.current.set(targetSessionId, pc);

      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach((t) => pc.addTrack(t, localStreamRef.current!));
      }

      pc.ontrack = (e) => {
        const stream = e.streams[0] ?? new MediaStream([e.track]);
        remoteStreamsRef.current.set(targetSessionId, stream);
        forceUpdate((n) => n + 1);
        // Attach to audio element
        const audio = document.getElementById(`audio-${targetSessionId}`) as HTMLAudioElement | null;
        if (audio) audio.srcObject = stream;
      };

      pc.onicecandidate = (e) => {
        socket.emit('webrtc_signal', {
          roomCode, fromSessionId: mySessionId, targetSessionId,
          signal: { type: 'ice', candidate: e.candidate },
        });
      };

      if (isInitiator) {
        pc.createOffer().then((offer) => {
          pc.setLocalDescription(offer);
          socket.emit('webrtc_signal', {
            roomCode, fromSessionId: mySessionId, targetSessionId,
            signal: { type: 'offer', sdp: offer },
          });
        });
      }

      return pc;
    },
    [roomCode, mySessionId],
  );

  const closePeer = useCallback((sessionId: string) => {
    peersRef.current.get(sessionId)?.close();
    peersRef.current.delete(sessionId);
    remoteStreamsRef.current.delete(sessionId);
    forceUpdate((n) => n + 1);
  }, []);

  const handleSignal = useCallback(
    ({ fromSessionId, signal }: { fromSessionId: string; signal: Signal }) => {
      let pc = peersRef.current.get(fromSessionId);
      if (!pc) pc = createPeer(fromSessionId, false);
      if (!pc) return;

      if (signal.type === 'offer') {
        pc.setRemoteDescription(signal.sdp).then(() =>
          pc!.createAnswer().then((answer) => {
            pc!.setLocalDescription(answer);
            socket.emit('webrtc_signal', {
              roomCode, fromSessionId: mySessionId, targetSessionId: fromSessionId,
              signal: { type: 'answer', sdp: answer },
            });
          }),
        );
      } else if (signal.type === 'answer') {
        pc.setRemoteDescription(signal.sdp);
      } else if (signal.type === 'ice' && signal.candidate) {
        pc.addIceCandidate(signal.candidate).catch(() => {});
      }
    },
    [roomCode, mySessionId, createPeer],
  );

  useEffect(() => {
    socket.on('webrtc_signal', handleSignal);
    socket.on('voice_user_joined', ({ sessionId }: { sessionId: string }) => {
      if (isEnabled && sessionId !== mySessionId) createPeer(sessionId, true);
    });
    socket.on('voice_user_left', ({ sessionId }: { sessionId: string }) => {
      closePeer(sessionId);
    });
    return () => {
      socket.off('webrtc_signal', handleSignal);
      socket.off('voice_user_joined');
      socket.off('voice_user_left');
    };
  }, [handleSignal, isEnabled, mySessionId, createPeer, closePeer]);

  const enableVoice = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
      localStreamRef.current = stream;
      setIsEnabled(true);
      socket.emit('voice_join', { roomCode, sessionId: mySessionId });
      // Connect to all current voice users
      for (const sid of remoteSessionIds) {
        if (sid !== mySessionId) createPeer(sid, true);
      }
    } catch (err) {
      console.error('Mic access denied', err);
    }
  }, [roomCode, mySessionId, remoteSessionIds, createPeer]);

  const disableVoice = useCallback(() => {
    localStreamRef.current?.getTracks().forEach((t) => t.stop());
    localStreamRef.current = null;
    for (const sid of [...peersRef.current.keys()]) closePeer(sid);
    setIsEnabled(false);
    setIsMuted(false);
    socket.emit('voice_leave', { roomCode, sessionId: mySessionId });
  }, [roomCode, mySessionId, closePeer]);

  const toggleMute = useCallback(() => {
    if (!localStreamRef.current) return;
    const enabled = !isMuted;
    localStreamRef.current.getAudioTracks().forEach((t) => { t.enabled = enabled; });
    setIsMuted(!enabled);
  }, [isMuted]);

  const toggleVoice = useCallback(() => {
    if (isEnabled) disableVoice(); else enableVoice();
  }, [isEnabled, enableVoice, disableVoice]);

  return { isEnabled, isMuted, toggleVoice, toggleMute };
}
