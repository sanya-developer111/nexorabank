'use client';

import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { formatNex } from '@/lib/utils';

interface PriceChartProps {
  data: Array<{ timestamp?: string; date?: string; price: number }>;
  height?: number;
}

export function PriceChart({ data, height = 300 }: PriceChartProps) {
  const chartData = data.map((d) => ({
    ...d,
    label: d.timestamp
      ? new Date(d.timestamp).toLocaleDateString('ru-RU')
      : d.date || '',
  }));

  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={chartData}>
        <defs>
          <linearGradient id="priceGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#00f0ff" stopOpacity={0.4} />
            <stop offset="100%" stopColor="#a855f7" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
        <XAxis dataKey="label" stroke="rgba(255,255,255,0.4)" fontSize={12} />
        <YAxis stroke="rgba(255,255,255,0.4)" fontSize={12} />
        <Tooltip
          contentStyle={{
            background: 'rgba(10, 10, 18, 0.9)',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: '12px',
          }}
          formatter={(value: number) => [formatNex(value), 'Price']}
        />
        <Area
          type="monotone"
          dataKey="price"
          stroke="#00f0ff"
          strokeWidth={2}
          fill="url(#priceGradient)"
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
