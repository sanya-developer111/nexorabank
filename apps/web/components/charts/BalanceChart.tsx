'use client';

import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { formatNex } from '@/lib/utils';

interface BalanceChartProps {
  data: Array<{ date: string; balance: number }>;
  height?: number;
}

export function BalanceChart({ data, height = 250 }: BalanceChartProps) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
        <XAxis dataKey="date" stroke="rgba(255,255,255,0.4)" fontSize={12} />
        <YAxis stroke="rgba(255,255,255,0.4)" fontSize={12} />
        <Tooltip
          contentStyle={{
            background: 'rgba(10, 10, 18, 0.9)',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: '12px',
          }}
          formatter={(value: number) => [formatNex(value), 'Баланс']}
        />
        <Bar dataKey="balance" fill="url(#barGradient)" radius={[6, 6, 0, 0]} />
        <defs>
          <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#00f0ff" />
            <stop offset="100%" stopColor="#a855f7" />
          </linearGradient>
        </defs>
      </BarChart>
    </ResponsiveContainer>
  );
}
