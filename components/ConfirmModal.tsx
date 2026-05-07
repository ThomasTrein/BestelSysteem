'use client';

interface ConfirmModalProps {
  open: boolean;
  title: string;
  message?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
  danger?: boolean;
  dark?: boolean;
  icon?: string;
}

export default function ConfirmModal({
  open,
  title,
  message,
  confirmLabel = 'Bevestigen',
  cancelLabel = 'Annuleren',
  onConfirm,
  onCancel,
  danger = false,
  dark = false,
  icon,
}: ConfirmModalProps) {
  if (!open) return null;

  const cardBg = dark ? 'bg-gray-800 border border-gray-700 text-white' : 'bg-white text-gray-800';
  const textSub = dark ? 'text-gray-400' : 'text-gray-500';
  const cancelCls = dark
    ? 'border-gray-600 text-gray-300 hover:bg-gray-700'
    : 'border-gray-300 text-gray-600 hover:bg-gray-50';
  const confirmCls = danger
    ? 'bg-red-600 hover:bg-red-700 text-white'
    : 'bg-green-600 hover:bg-green-700 text-white';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60" onClick={onCancel} />
      <div className={`relative ${cardBg} rounded-2xl shadow-2xl w-full max-w-sm p-6 text-center`}>
        {icon && <div className="text-4xl mb-4">{icon}</div>}
        <h2 className={`text-xl font-bold mb-2 ${dark ? 'text-white' : 'text-gray-800'}`}>{title}</h2>
        {message && <p className={`${textSub} mb-6`}>{message}</p>}
        <div className="flex gap-3 mt-4">
          <button
            onClick={onCancel}
            className={`flex-1 py-3 rounded-xl border-2 font-semibold transition-colors ${cancelCls}`}
          >
            {cancelLabel}
          </button>
          <button
            onClick={onConfirm}
            className={`flex-1 py-3 rounded-xl font-bold transition-colors ${confirmCls}`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
