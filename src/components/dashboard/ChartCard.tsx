'use client';

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { formatCurrency } from '@/lib/utils';

interface ChartDataItem {
  label: string;
  amount: number;
}

interface ChartCardProps {
  title: string;
  data: ChartDataItem[];
  barColor?: string;
  height?: number;
  layout?: 'horizontal' | 'vertical';
  dataKey?: string;
  nameKey?: string;
}

export default function ChartCard({
  title,
  data,
  barColor = '#C9243F',
  height = 300,
  layout = 'horizontal',
  dataKey = 'amount',
  nameKey = 'label',
}: ChartCardProps) {
  if (data.length === 0) {
    return null;
  }

  return (
    <div className="chart-card">
      <h3>{title}</h3>
      <ResponsiveContainer width="100%" height={height}>
        {layout === 'vertical' ? (
          <BarChart data={data} layout="vertical" margin={{ left: 120 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis
              type="number"
              tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`}
            />
            <YAxis
              type="category"
              dataKey={nameKey}
              tick={{ fontSize: 12 }}
              width={110}
            />
            <Tooltip formatter={(v) => formatCurrency(v as number)} />
            <Bar dataKey={dataKey} fill={barColor} />
          </BarChart>
        ) : (
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey={nameKey} tick={{ fontSize: 12 }} />
            <YAxis tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
            <Tooltip formatter={(v) => formatCurrency(v as number)} />
            <Bar dataKey={dataKey} fill={barColor} />
          </BarChart>
        )}
      </ResponsiveContainer>
    </div>
  );
}
