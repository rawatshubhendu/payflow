'use client';

import {
  Area,
  AreaChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { PaymentStatusOverview, RevenuePoint } from '@payflow/types';
import { formatInrCompact, formatInrExact } from '@/lib/money';

const RANGES = [7, 30, 90] as const;

export function RevenueChart({
  series,
  range,
  onRangeChange,
}: {
  series: RevenuePoint[];
  range: 7 | 30 | 90;
  onRangeChange: (range: 7 | 30 | 90) => void;
}) {
  return (
    <div className="min-h-64 rounded-2xl border border-line bg-elevated p-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm text-muted">Revenue over time</p>
          <p className="mt-1 text-xs text-muted">Collected from verified payments.</p>
        </div>
        <div className="flex shrink-0 rounded-lg border border-line bg-white p-0.5 text-xs">
          {RANGES.map((days) => (
            <button
              key={days}
              type="button"
              onClick={() => onRangeChange(days)}
              className={`rounded-md px-2.5 py-1 font-medium transition-colors ${
                range === days ? 'bg-ink text-white' : 'text-muted hover:text-ink'
              }`}
            >
              {days}d
            </button>
          ))}
        </div>
      </div>
      <div className="mt-4 h-56">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={series} margin={{ top: 4, right: 4, left: 4, bottom: 0 }}>
            <defs>
              <linearGradient id="revenueFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#4f7cff" stopOpacity={0.25} />
                <stop offset="100%" stopColor="#4f7cff" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.06)" vertical={false} />
            <XAxis
              dataKey="label"
              tick={{ fontSize: 11, fill: '#6b7280' }}
              tickLine={false}
              axisLine={false}
              interval="preserveStartEnd"
            />
            <YAxis
              width={44}
              tick={{ fontSize: 11, fill: '#6b7280' }}
              tickLine={false}
              axisLine={false}
              tickFormatter={(value: number) => formatInrCompact(value)}
            />
            <Tooltip
              cursor={{ stroke: 'rgba(0,0,0,0.12)' }}
              formatter={(value) => [formatInrExact(Number(value ?? 0)), 'Revenue']}
              labelFormatter={(label) => `Received ${String(label)}`}
              contentStyle={{
                borderRadius: 12,
                border: '1px solid #e5e7eb',
                boxShadow: '0 8px 24px rgba(0,0,0,0.08)',
                fontSize: 13,
              }}
            />
            <Area
              type="monotone"
              dataKey="revenue"
              stroke="#4f7cff"
              strokeWidth={2}
              fill="url(#revenueFill)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

const STATUS_COLORS: Record<'paid' | 'pending' | 'overdue' | 'failed', string> = {
  paid: '#10b981',
  pending: '#f59e0b',
  overdue: '#ef4444',
  failed: '#d1d5db',
};

export function PaymentStatusDonut({ data }: { data: PaymentStatusOverview }) {
  const points = [
    { key: 'paid' as const, label: 'Paid', amount: data.paid, count: data.counts.paid },
    { key: 'pending' as const, label: 'Pending', amount: data.pending, count: data.counts.pending },
    { key: 'overdue' as const, label: 'Overdue', amount: data.overdue, count: data.counts.overdue },
    { key: 'failed' as const, label: 'Failed', amount: data.failed, count: data.counts.failed },
  ];
  const hasData = data.total > 0;

  return (
    <div className="rounded-2xl border border-line bg-elevated p-5">
      <p className="text-sm text-muted">Payment status</p>
      <div className="flex items-center gap-6">
        <div className="relative h-40 w-40 shrink-0">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={points}
                dataKey="amount"
                nameKey="label"
                innerRadius={54}
                outerRadius={74}
                paddingAngle={hasData ? 2 : 0}
                strokeWidth={0}
              >
                {points.map((point) => (
                  <Cell key={point.key} fill={STATUS_COLORS[point.key]} />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
            <span className="font-serif text-lg tracking-tight">{hasData ? formatInrCompact(data.total) : '—'}</span>
            <span className="text-[11px] text-muted">invoiced</span>
          </div>
        </div>
        <div className="min-w-0 flex-1 space-y-2.5 text-sm">
          {points.map((point) => (
            <div key={point.key} className="flex items-center justify-between gap-3">
              <span className="inline-flex items-center gap-2 text-muted">
                <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: STATUS_COLORS[point.key] }} />
                {point.label}
                {point.count > 0 ? <span className="text-xs text-muted/60">({point.count})</span> : null}
              </span>
              <span className="font-medium">{formatInrExact(point.amount)}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}