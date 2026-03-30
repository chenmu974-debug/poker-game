let ctx: AudioContext | null = null;

function getCtx(): AudioContext {
  if (!ctx) ctx = new AudioContext();
  return ctx;
}

function beep(freq: number, duration: number, type: OscillatorType = 'sine', vol = 0.3) {
  try {
    const ac = getCtx();
    const osc = ac.createOscillator();
    const gain = ac.createGain();
    osc.connect(gain);
    gain.connect(ac.destination);
    osc.type = type;
    osc.frequency.setValueAtTime(freq, ac.currentTime);
    gain.gain.setValueAtTime(vol, ac.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + duration);
    osc.start(ac.currentTime);
    osc.stop(ac.currentTime + duration);
  } catch {}
}

export function playSound(type: 'deal' | 'chip' | 'win' | 'yourTurn') {
  switch (type) {
    case 'deal':
      beep(800, 0.08, 'square', 0.15);
      setTimeout(() => beep(600, 0.08, 'square', 0.1), 60);
      break;
    case 'chip':
      beep(1200, 0.05, 'triangle', 0.2);
      setTimeout(() => beep(900, 0.05, 'triangle', 0.15), 40);
      break;
    case 'win':
      [523, 659, 784, 1047].forEach((f, i) =>
        setTimeout(() => beep(f, 0.25, 'sine', 0.35), i * 120)
      );
      break;
    case 'yourTurn':
      beep(880, 0.1, 'sine', 0.25);
      setTimeout(() => beep(1100, 0.15, 'sine', 0.2), 120);
      break;
  }
}
