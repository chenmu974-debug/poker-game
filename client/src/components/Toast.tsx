import { useGameStore } from '../store/gameStore';

export default function Toast() {
  const { toasts, removeToast } = useGameStore();

  if (!toasts.length) return null;

  return (
    <div className="fixed top-4 right-4 z-50 flex flex-col gap-2">
      {toasts.map((t) => (
        <div
          key={t.id}
          onClick={() => removeToast(t.id)}
          className={`animate-slide-in px-4 py-3 rounded-xl shadow-xl border cursor-pointer max-w-sm text-sm font-medium transition-all
            ${t.type === 'error' ? 'bg-red-950 border-red-700 text-red-200' :
              t.type === 'success' ? 'bg-green-950 border-green-700 text-green-200' :
              'bg-gray-900 border-gray-700 text-gray-200'}`}
        >
          {t.message}
        </div>
      ))}
    </div>
  );
}
