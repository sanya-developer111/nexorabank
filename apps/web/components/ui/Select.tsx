'use client';

import { cn } from '@/lib/utils';

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  options: Array<{ value: string; label: string }>;
  error?: string;
}

export function Select({ label, options, error, className, ...props }: SelectProps) {
  return (
    <div className="space-y-2">
      {label && <label className="block text-sm font-medium text-white/80">{label}</label>}
      <select className={cn('input-glass cursor-pointer', error && 'border-red-500/50', className)} {...props}>
        {options.map((opt) => (
          <option key={opt.value} value={opt.value} className="bg-nexora-dark">
            {opt.label}
          </option>
        ))}
      </select>
      {error && <p className="text-sm text-red-400">{error}</p>}
    </div>
  );
}
