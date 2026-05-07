'use client';

interface AlertModalProps {
  open: boolean;
  title: string;
  message?: string;
  onClose: () => void;
  dark?: boolean;
  icon?: string;
}

export default function AlertModal({
  open,
  title,
  message,
  onClose,
  dark = false,
  icon,
}: AlertModalProps) {
  if (!open) return null;

  const cardBg = dark ? 'bg-gray-800 border border-gray-700 text-white' : 'bg-white text-gray-800';
  const textSub = dark ? 'text-gray-400' : 'text-gray-500';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className={`relative ${cardBg} rounded-2xl shadow-2xl w-full max-w-sm p-6 text-center`}>
        {icon && <div className="text-4xl mb-4">{icon}</div>}
        <h2 className={`text-xl font-bold mb-2 ${dark ? 'text-white' : 'text-gray-800'}`}>{title}</h2>
        {message && <p className={`${textSub} mb-6`}>{message}</p>}
        <button
          onClick={onClose}
          className="w-full mt-4 py-3 rounded-xl bg-green-600 hover:bg-green-700 text-white font-bold transition-colors"
        >
          OK
        </button>
      </div>
    </div>
  );
}
