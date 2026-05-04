'use client';

interface Props {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
}

export default function QuantitySelector({ value, onChange, min = 0, max = 99 }: Props) {
  return (
    <div className="flex items-center gap-2">
      <button
        onClick={() => onChange(Math.max(min, value - 1))}
        className="w-8 h-8 rounded-full bg-gray-200 hover:bg-gray-300 font-bold text-lg flex items-center justify-center transition-colors"
        disabled={value <= min}
      >
        −
      </button>
      <span className="w-8 text-center font-semibold text-lg">{value}</span>
      <button
        onClick={() => onChange(Math.min(max, value + 1))}
        className="w-8 h-8 rounded-full bg-green-600 hover:bg-green-700 text-white font-bold text-lg flex items-center justify-center transition-colors"
        disabled={value >= max}
      >
        +
      </button>
    </div>
  );
}
