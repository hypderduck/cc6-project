'use client';

import { useRef } from 'react';
import { useUI } from '@/components/UIProvider';
import { niceMax } from '@/lib/stats';
import { useWidth } from './useWidth';
import { Legend, TipRows, type Series } from './common';

export interface ColumnChartProps {
  categories: { label: string; tip: string }[];
  series: Series[];
  /** Emphasise one column (single-series charts). */
  highlight?: number;
  directLabels?: boolean;
  height?: number;
  ariaLabel: string;
}

const ML = 30;
const MB = 24;
const MT = 20;

/** Path for a bar with rounded corners only at the top (data end). */
function topRounded(x: number, y: number, w: number, h: number, r: number) {
  const rr = Math.min(r, h, w / 2);
  return `M${x},${y + h}V${y + rr}Q${x},${y} ${x + rr},${y}H${x + w - rr}Q${x + w},${y} ${x + w},${y + rr}V${y + h}Z`;
}

export function ColumnChart({ categories, series, highlight, directLabels, height = 230, ariaLabel }: ColumnChartProps) {
  const [ref, width] = useWidth<HTMLDivElement>();
  const svgRef = useRef<SVGSVGElement>(null);
  const ui = useUI();

  const n = categories.length;
  const totals = categories.map((_, i) => series.reduce((s, se) => s + (se.values[i] ?? 0), 0));
  const { max, step } = niceMax(Math.max(0, ...totals));
  const showDirect = !!directLabels && series.length > 1 && width >= 560;
  const MR = showDirect ? 84 : 8;
  const plotW = Math.max(0, width - ML - MR);
  const plotH = height - MT - MB;
  const slot = n ? plotW / n : 0;
  const barW = Math.max(2, Math.min(24, slot * 0.68));
  const y = (v: number) => MT + plotH * (1 - v / max);
  const labelEvery = Math.max(1, Math.ceil(n / Math.max(1, Math.floor(plotW / 44))));

  const show = (i: number) => {
    const svg = svgRef.current;
    if (!svg) return;
    const box = svg.getBoundingClientRect();
    const x = ML + slot * i + (slot - barW) / 2;
    ui.showTip(
      <TipRows title={categories[i].tip} rows={series.map((s) => ({ color: s.color, value: s.values[i] ?? 0, name: s.name }))} />,
      new DOMRect(box.left + x, box.top + y(totals[i]), barW, 0),
    );
  };

  const last = n - 1;

  return (
    <div className="chart">
      {series.length > 1 && <Legend series={series} />}
      <div ref={ref} className="chart-box">
        {width > 0 && (
          <svg ref={svgRef} width={width} height={height} role="group" aria-label={ariaLabel}>
            {/* gridlines + integer ticks */}
            {[0, 1, 2, 3, 4].map((k) => {
              const v = k * step;
              const yy = Math.round(y(v)) + 0.5;
              return (
                <g key={k}>
                  <line x1={ML} x2={ML + plotW} y1={yy} y2={yy} className={k === 0 ? 'axis-line' : 'grid-line'} />
                  <text x={ML - 6} y={yy} className="tick" textAnchor="end" dominantBaseline="middle">
                    {v}
                  </text>
                </g>
              );
            })}

            {categories.map((c, i) => {
              const x = ML + slot * i + (slot - barW) / 2;
              let base = MT + plotH;
              const segs = series
                .map((s) => ({ s, v: s.values[i] ?? 0 }))
                .filter((d) => d.v > 0);
              const dim = highlight != null && highlight !== i;
              return (
                <g key={i} opacity={dim ? 0.5 : 1}>
                  {segs.map(({ s, v }, k) => {
                    const h = (v / max) * plotH;
                    const gap = k > 0 ? 2 : 0;
                    const top = base - h;
                    const isTop = k === segs.length - 1;
                    const segH = Math.max(0, h - gap);
                    const el = isTop ? (
                      <path key={s.key} d={topRounded(x, top, barW, segH, 4)} fill={s.color} />
                    ) : (
                      <rect key={s.key} x={x} y={top} width={barW} height={segH} fill={s.color} />
                    );
                    base = top;
                    return el;
                  })}
                  {totals[i] > 0 && (
                    <text
                      x={x + barW / 2}
                      y={y(totals[i]) - 5}
                      textAnchor="middle"
                      className={`val${highlight === i ? ' val-strong' : ''}`}
                    >
                      {totals[i]}
                    </text>
                  )}
                  {i % labelEvery === 0 && (
                    <text x={x + barW / 2} y={MT + plotH + 16} textAnchor="middle" className="tick">
                      {c.label}
                    </text>
                  )}
                </g>
              );
            })}

            {/* direct series labels at the right edge */}
            {showDirect &&
              n > 0 &&
              (() => {
                let base = MT + plotH;
                const x = ML + slot * last + (slot + barW) / 2 + 8;
                return series.map((s) => {
                  const v = s.values[last] ?? 0;
                  const h = (v / max) * plotH;
                  const mid = base - h / 2;
                  base -= h;
                  if (h < 12) return null;
                  return (
                    <g key={s.key}>
                      <line x1={x} x2={x + 10} y1={mid} y2={mid} stroke={s.color} strokeWidth={3} strokeLinecap="round" />
                      <text x={x + 14} y={mid} dominantBaseline="middle" className="direct-label">
                        {s.name}
                      </text>
                    </g>
                  );
                });
              })()}

            {/* hit targets: hover and keyboard focus */}
            {categories.map((c, i) => (
              <rect
                key={`hit-${i}`}
                className="hit"
                x={ML + slot * i}
                y={MT}
                width={slot}
                height={plotH}
                tabIndex={0}
                role="img"
                aria-label={`${c.tip}: ${series.map((s) => `${s.values[i] ?? 0} ${s.name}`).join(', ')}`}
                onMouseEnter={() => show(i)}
                onFocus={() => show(i)}
                onMouseLeave={ui.hideTip}
                onBlur={ui.hideTip}
              />
            ))}
          </svg>
        )}
      </div>
    </div>
  );
}
