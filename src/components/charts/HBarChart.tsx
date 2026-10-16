'use client';

import { useUI } from '@/components/UIProvider';
import { niceMax } from '@/lib/stats';
import { TipRows } from './common';

export interface HBarRow {
  label: string;
  value: number;
  tag?: string;
}

export function HBarChart({
  rows,
  color = '#2b4a35',
  unit,
  ariaLabel,
}: {
  rows: HBarRow[];
  color?: string;
  unit: string;
  ariaLabel: string;
}) {
  const ui = useUI();
  const { max, step } = niceMax(Math.max(0, ...rows.map((r) => r.value)));
  const ticks = [0, 1, 2, 3, 4].map((k) => k * step);

  if (!rows.length) return <p className="empty">No reports in this range.</p>;

  return (
    <div className="chart hbar" role="group" aria-label={ariaLabel}>
      {rows.map((r) => {
        const pct = (r.value / max) * 100;
        const show = (el: Element) => ui.showTip(<TipRows title={r.label} rows={[{ value: r.value, name: unit }]} />, el);
        return (
          <div key={r.label} className="hbar-row">
            <div className="hbar-label">
              {r.label}
              {r.tag && <span className="tag">{r.tag}</span>}
            </div>
            <div className="hbar-plot">
              {ticks.map((t, k) => (
                <span key={k} className={k === 0 ? 'hbar-axis' : 'hbar-grid'} style={{ left: `${(t / max) * 100}%` }} />
              ))}
              <span
                className="hbar-bar"
                style={{ width: `${pct}%`, background: color }}
                tabIndex={0}
                role="img"
                aria-label={`${r.label}: ${r.value} ${unit}`}
                onMouseEnter={(e) => show(e.currentTarget)}
                onFocus={(e) => show(e.currentTarget)}
                onMouseLeave={ui.hideTip}
                onBlur={ui.hideTip}
              />
              <span className="hbar-val" style={{ left: `calc(${pct}% + 6px)` }}>
                {r.value}
              </span>
            </div>
          </div>
        );
      })}
      <div className="hbar-row hbar-ticks" aria-hidden>
        <div />
        <div className="hbar-plot">
          {ticks.map((t, k) => (
            <span key={k} className="tick-label" style={{ left: `${(t / max) * 100}%` }}>
              {t}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
