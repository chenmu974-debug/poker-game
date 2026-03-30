import { useEffect, useRef, useState } from 'react';

interface Props {
  seconds: number;
  onExpire: () => void;
}

export default function Timer({ seconds, onExpire }: Props) {
  const [remaining, setRemaining] = useState(seconds);
  const startRef = useRef(Date.now());
  const expiredRef = useRef(false);

  useEffect(() => {
    setRemaining(seconds);
    startRef.current = Date.now();
    expiredRef.current = false;

    const interval = setInterval(() => {
      const elapsed = (Date.now() - startRef.current) / 1000;
      const left = Math.max(0, seconds - elapsed);
      setRemaining(left);
      if (left <= 0 && !expiredRef.current) {
        expiredRef.current = true;
        onExpire();
        clearInterval(interval);
      }
    }, 100);

    return () => clearInterval(interval);
  }, [seconds]);

  const pct = remaining / seconds;
  const radius = 18;
  const circ = 2 * Math.PI * radius;
  const dash = circ * pct;
  const color = pct > 0.5 ? '#c9a84c' : pct > 0.25 ? '#f97316' : '#ef4444';

  return (
    <div className="relative w-12 h-12 flex items-center justify-center">
      <svg className="absolute inset-0 -rotate-90" width="48" height="48">
        <circle cx="24" cy="24" r={radius} fill="none" stroke="#374151" strokeWidth="3" />
        <circle
          cx="24" cy="24" r={radius}
          fill="none"
          stroke={color}
          strokeWidth="3"
          strokeDasharray={`${dash} ${circ}`}
          strokeLinecap="round"
          style={{ transition: 'stroke-dasharray 0.1s linear, stroke 0.3s' }}
        />
      </svg>
      <span className="text-sm font-bold tabular-nums" style={{ color }}>
        {Math.ceil(remaining)}
      </span>
    </div>
  );
}
