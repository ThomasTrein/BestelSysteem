'use client';

interface Props {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  accent?: string;
  isDark?: boolean;
}

export default function QuantitySelector({ value, onChange, min = 0, max = 99, accent = '#16a34a', isDark = false }: Props) {
  return (
    <div className="flex items-center gap-2">
      <button
        onClick={() => onChange(Math.max(min, value - 1))}
        className={`w-8 h-8 rounded-full font-bold text-lg flex items-center justify-center transition-colors ${isDark ? 'bg-gray-600 hover:bg-gray-500 text-white' : 'bg-gray-200 hover:bg-gray-300 text-gray-800'}`}
        disabled={value <= min}
      >
        −
      </button>
      <span className={`w-8 text-center font-semibold text-lg ${isDark ? 'text-white' : 'text-gray-800'}`}>{value}</span>
      <button
        onClick={() => onChange(Math.min(max, value + 1))}
        className="w-8 h-8 rounded-full text-white font-bold text-lg flex items-center justify-center transition-colors"
        style={{ backgroundColor: accent }}
        disabled={value >= max}
      >
        +
      </button>
    </div>
  );
}
