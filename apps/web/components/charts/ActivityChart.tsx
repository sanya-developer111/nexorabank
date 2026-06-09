'use client';

import {
  Line,
  LineChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  Legend,
} from 'recharts';
import { formatNex } from '@/lib/utils';

interface ActivityChartProps {
  data: Array<{ date: string; income: number; expenses: number }>;
  height?: number;
}

export function ActivityChart({ data, height = 250 }: ActivityChartProps) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
        <XAxis dataKey="date" stroke="rgba(255,255,255,0.4)" fontSize={12} />
        <YAxis stroke="rgba(255,255,255,0.4)" fontSize={12} />
        <Tooltip
          contentStyle={{
            background: 'rgba(10, 10, 18, 0.9)',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: '12px',
          }}
          formatter={(value: number) => formatNex(value)}
        />
        <Legend />
        <Line type="monotone" dataKey="income" stroke="#00f0ff" strokeWidth={2} dot={false} />
        <Line type="monotone" dataKey="expenses" stroke="#ec4899" strokeWidth={2} dot={false} />
      </LineChart>
    </ResponsiveContainer>
  );
}
