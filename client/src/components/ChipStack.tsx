interface Props {
  amount: number;
  small?: boolean;
}

// Visual chip stack using colored circles
export default function ChipStack({ amount, small }: Props) {
  const size = small ? 'w-3 h-3' : 'w-4 h-4';

  // Determine chip color based on amount
  let color = 'bg-red-500';
  if (amount >= 1000) color = 'bg-purple-500';
  else if (amount >= 500) color = 'bg-blue-500';
  else if (amount >= 100) color = 'bg-gray-800 border border-gray-600';
  else if (amount >= 25) color = 'bg-green-600';
  else color = 'bg-red-600';

  const numChips = Math.min(Math.ceil(Math.log10(amount + 1)), 5);

  return (
    <div className="relative" style={{ width: small ? 14 : 18, height: numChips * (small ? 3 : 4) + (small ? 12 : 16) }}>
      {Array.from({ length: numChips }).map((_, i) => (
        <div
          key={i}
          className={`absolute rounded-full ${size} ${color} border-2 border-white/20 shadow-sm`}
          style={{
            bottom: i * (small ? 3 : 4),
            left: 0,
          }}
        />
      ))}
    </div>
  );
}
