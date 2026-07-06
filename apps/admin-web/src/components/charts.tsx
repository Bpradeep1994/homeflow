"use client";

import { useState } from "react";

// Chart colors come from the CSS custom properties defined in globals.css
// (validated palette: series slots, ink and gridline roles, both modes).

type Point = { label: string; value: number };

// Serializable formatter flag: server pages can't pass functions to client components.
type Format = "number" | "inr";

function fmt(v: number, format: Format): string {
  return format === "inr" ? "₹" + v.toLocaleString("en-IN") : String(v);
}

function niceMax(values: number[]): number {
  const max = Math.max(...values);
  const mag = Math.pow(10, Math.floor(Math.log10(max)));
  return Math.ceil(max / mag) * mag;
}

export function TrendLineChart({
  data,
  format = "number",
}: {
  data: Point[];
  format?: Format;
}) {
  const [hover, setHover] = useState<number | null>(null);

  const w = 640;
  const h = 220;
  const pad = { top: 12, right: 12, bottom: 26, left: 36 };
  const iw = w - pad.left - pad.right;
  const ih = h - pad.top - pad.bottom;
  const yMax = niceMax(data.map((d) => d.value));

  const x = (i: number) => pad.left + (i / (data.length - 1)) * iw;
  const y = (v: number) => pad.top + ih - (v / yMax) * ih;
  const path = data.map((d, i) => `${i === 0 ? "M" : "L"}${x(i)},${y(d.value)}`).join(" ");
  const ticks = [0, yMax / 2, yMax];

  return (
    <div className="relative">
      <svg
        viewBox={`0 0 ${w} ${h}`}
        className="w-full"
        role="img"
        aria-label="Bookings per day, last 14 days"
        onMouseLeave={() => setHover(null)}
      >
        {ticks.map((t) => (
          <g key={t}>
            <line
              x1={pad.left}
              x2={w - pad.right}
              y1={y(t)}
              y2={y(t)}
              stroke="var(--viz-grid)"
              strokeWidth={1}
            />
            <text x={pad.left - 8} y={y(t) + 4} textAnchor="end" fontSize={11} fill="var(--viz-muted)">
              {t}
            </text>
          </g>
        ))}
        {data.map((d, i) =>
          i % 3 === 0 || i === data.length - 1 ? (
            <text key={d.label} x={x(i)} y={h - 8} textAnchor="middle" fontSize={11} fill="var(--viz-muted)">
              {d.label}
            </text>
          ) : null
        )}
        <path d={path} fill="none" stroke="var(--series-1)" strokeWidth={2} strokeLinejoin="round" />
        {hover !== null && (
          <>
            <line
              x1={x(hover)}
              x2={x(hover)}
              y1={pad.top}
              y2={pad.top + ih}
              stroke="var(--viz-muted)"
              strokeWidth={1}
              strokeDasharray="3 3"
            />
            <circle
              cx={x(hover)}
              cy={y(data[hover].value)}
              r={5}
              fill="var(--series-1)"
              stroke="var(--viz-surface)"
              strokeWidth={2}
            />
          </>
        )}
        {/* invisible hit targets, wider than the marks */}
        {data.map((d, i) => (
          <rect
            key={d.label}
            x={x(i) - iw / data.length / 2}
            y={pad.top}
            width={iw / data.length}
            height={ih}
            fill="transparent"
            onMouseEnter={() => setHover(i)}
          />
        ))}
      </svg>
      {hover !== null && (
        <div
          className="pointer-events-none absolute -translate-x-1/2 rounded-lg border border-black/10 bg-white px-2.5 py-1.5 text-xs shadow-sm dark:border-white/10 dark:bg-neutral-800"
          style={{ left: `${(x(hover) / w) * 100}%`, top: 0 }}
        >
          <div className="text-neutral-500">{data[hover].label}</div>
          <div className="font-bold">{fmt(data[hover].value, format)}</div>
        </div>
      )}
    </div>
  );
}

export function BarChart({
  data,
  categorical = false,
  format = "number",
  ariaLabel,
}: {
  data: Point[];
  /** true → identity coloring from the categorical slots; false → single hue */
  categorical?: boolean;
  format?: Format;
  ariaLabel: string;
}) {
  const [hover, setHover] = useState<number | null>(null);

  const w = 640;
  const h = 220;
  const pad = { top: 12, right: 12, bottom: 26, left: 44 };
  const iw = w - pad.left - pad.right;
  const ih = h - pad.top - pad.bottom;
  const yMax = niceMax(data.map((d) => d.value));
  const slot = (i: number) => `var(--series-${(i % 3) + 1})`;

  const band = iw / data.length;
  const barW = Math.min(band * 0.5, 48);
  const y = (v: number) => pad.top + ih - (v / yMax) * ih;
  const ticks = [0, yMax / 2, yMax];

  return (
    <div className="relative">
      <svg viewBox={`0 0 ${w} ${h}`} className="w-full" role="img" aria-label={ariaLabel} onMouseLeave={() => setHover(null)}>
        {ticks.map((t) => (
          <g key={t}>
            <line x1={pad.left} x2={w - pad.right} y1={y(t)} y2={y(t)} stroke="var(--viz-grid)" strokeWidth={1} />
            <text x={pad.left - 8} y={y(t) + 4} textAnchor="end" fontSize={11} fill="var(--viz-muted)">
              {fmt(t, format)}
            </text>
          </g>
        ))}
        {data.map((d, i) => {
          const cx = pad.left + band * i + band / 2;
          const barH = Math.max(ih * (d.value / yMax), 4);
          return (
            <g key={d.label}>
              {/* rounded data-end, flat baseline: round the top 4px only */}
              <path
                d={`M${cx - barW / 2},${pad.top + ih}
                   V${y(d.value) + 4}
                   Q${cx - barW / 2},${y(d.value)} ${cx - barW / 2 + 4},${y(d.value)}
                   H${cx + barW / 2 - 4}
                   Q${cx + barW / 2},${y(d.value)} ${cx + barW / 2},${y(d.value) + 4}
                   V${pad.top + ih} Z`}
                fill={categorical ? slot(i) : "var(--series-1)"}
                opacity={hover === null || hover === i ? 1 : 0.45}
                data-bar-height={barH}
              />
              <text x={cx} y={h - 8} textAnchor="middle" fontSize={11} fill="var(--viz-muted)">
                {d.label}
              </text>
              <rect
                x={pad.left + band * i}
                y={pad.top}
                width={band}
                height={ih}
                fill="transparent"
                onMouseEnter={() => setHover(i)}
              />
            </g>
          );
        })}
      </svg>
      {hover !== null && (
        <div
          className="pointer-events-none absolute -translate-x-1/2 rounded-lg border border-black/10 bg-white px-2.5 py-1.5 text-xs shadow-sm dark:border-white/10 dark:bg-neutral-800"
          style={{ left: `${((pad.left + band * hover + band / 2) / w) * 100}%`, top: 0 }}
        >
          <div className="text-neutral-500">{data[hover].label}</div>
          <div className="font-bold">{fmt(data[hover].value, format)}</div>
        </div>
      )}
    </div>
  );
}
