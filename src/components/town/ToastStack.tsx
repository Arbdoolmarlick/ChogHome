import React from 'react';
import { X } from 'lucide-react';
import { ToastItem } from '../../types/chog';

interface ToastStackProps {
  toasts: ToastItem[];
  onAcceptChallenge: (gameType: 'four' | 'duel' | 'showdown', opponentId: number) => void;
  onDismissToast: (id: string) => void;
}

export const ToastStack: React.FC<ToastStackProps> = ({
  toasts,
  onAcceptChallenge,
  onDismissToast,
}) => {
  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-20 lg:bottom-5 right-4 z-40 flex flex-col gap-2 max-w-sm w-full pointer-events-auto">
      {toasts.map(t => (
        <div
          key={t.id}
          className="pixel-box rounded-xl p-3 bg-[#241B35] border-2 border-[#FFDF6D] flex items-center justify-between gap-3 shadow-2xl"
        >
          <div className="font-pixel-body leading-tight">
            <div className="text-base font-bold text-[#FFDF6D]">{t.title}</div>
            <div className="text-sm text-[#B9B4C7]">{t.subtitle}</div>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            {t.type === 'challenge' && t.opponentId && (
              <button
                onClick={() => {
                  onAcceptChallenge(t.gameType || 'four', t.opponentId!);
                  onDismissToast(t.id);
                }}
                className="px-2.5 py-1 rounded bg-[#8CE071] text-[#14101C] font-pixel-body text-sm font-bold pixel-btn"
              >
                Accept ({t.ttl}s)
              </button>
            )}
            <button
              onClick={() => onDismissToast(t.id)}
              className="p-1 text-[#B9B4C7] hover:text-white"
              aria-label="Dismiss notification"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      ))}
    </div>
  );
};
