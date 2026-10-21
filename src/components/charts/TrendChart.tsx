import { useId, useState } from 'react';
import type { Period } from '@/types/household';

export function PeriodTabs({
  value,
  onChange,
}: {
  value: Period;
  onChange: (period: Period) => void;
}) {
  return (
    <div className="segmented" aria-label="统计周期">
      {(['day', 'week', 'month'] as const).map((period, index) => (
        <button
          key={period}
          aria-pressed={value === period}
          className={value === period ? 'selected' : ''}
          onClick={() => onChange(period)}
        >
          {['日', '周', '月'][index]}
        </button>
      ))}
    </div>
  );
}

export function TrendChart({
  values,
  variant = 'bar',
  labels = ['00:00', '06:00', '12:00', '18:00', '24:00'],
  unit = 'kWh',
}: {
  values: number[];
  variant?: 'bar' | 'line';
  labels?: string[];
  unit?: string;
}) {
  const id = useId();
  const [point, setPoint] = useState<number | null>(null);
  const max = Math.max(...values, 1) * 1.2;
  const step = 540 / Math.max(values.length, 1);
  const points = values
    .map((v, i) => `${30 + i * step + step / 2},${130 - (v / max) * 104}`)
    .join(' ');
  return (
    <div className="trend-chart">
      <svg
        viewBox="0 0 600 164"
        preserveAspectRatio="none"
        role="img"
        aria-label={`${variant === 'bar' ? '用量柱状图' : '变化趋势图'}，${values.map((v) => `${v}${unit}`).join('、')}`}
      >
        <defs>
          <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="var(--accent)" stopOpacity=".18" />
            <stop offset="1" stopColor="var(--accent)" stopOpacity="0" />
          </linearGradient>
        </defs>
        {[30, 80, 130].map((y) => (
          <path key={y} d={`M25 ${y}h550`} stroke="var(--line)" strokeDasharray="3 5" />
        ))}
        {variant === 'line' && (
          <>
            <polygon points={`30,130 ${points} ${570 - step / 2},130`} fill={`url(#${id})`} />
            <polyline
              points={points}
              fill="none"
              stroke="var(--accent)"
              strokeWidth="2.5"
              strokeLinejoin="round"
            />
          </>
        )}
        {values.map((v, i) => (
          <g key={i}>
            <rect
              x={30 + i * step + step * 0.22}
              y={130 - (v / max) * 104}
              width={step * 0.56}
              height={(v / max) * 104}
              rx="3"
              fill="var(--accent)"
              opacity={variant === 'line' ? 0 : point === i ? 1 : 0.72}
            />
            <rect
              tabIndex={0}
              role="button"
              aria-label={`第 ${i + 1} 项 ${v} ${unit}`}
              x={30 + i * step}
              y="15"
              width={step}
              height="116"
              fill="transparent"
              onFocus={() => setPoint(i)}
              onBlur={() => setPoint(null)}
              onMouseEnter={() => setPoint(i)}
              onMouseLeave={() => setPoint(null)}
            />
            <title>
              {v} {unit}
            </title>
          </g>
        ))}
        {labels.map((label, i) => (
          <text
            key={label}
            x={30 + (i * 540) / Math.max(1, labels.length - 1)}
            y="157"
            textAnchor={i === 0 ? 'start' : i === labels.length - 1 ? 'end' : 'middle'}
            fill="var(--muted)"
            fontSize="10"
          >
            {label}
          </text>
        ))}
      </svg>
      {point !== null && (
        <span className="chart-tooltip">
          第 {point + 1} 项 · {values[point]} {unit}
        </span>
      )}
    </div>
  );
}
