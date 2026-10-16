'use client';

import type { ReactNode } from 'react';

export interface Series {
  key: string;
  name: string;
  color: string;
  values: number[];
}

/** Legend for 2+ series. Text stays ink; colour only on the key line. */
export function Legend({ series }: { series: Series[] }) {
  return (
    <ul className="legend">
      {series.map((s) => (
        <li key={s.key}>
          <span className="key-line" style={{ background: s.color }} />
          {s.name}
        </li>
      ))}
    </ul>
  );
}

/** Tooltip body: optional title, then rows of bold value + label. */
export function TipRows({ title, rows }: { title?: string; rows: { color?: string; value: number; name: string }[] }) {
  return (
    <>
      {title && <div className="tip-title">{title}</div>}
      {rows.map((r) => (
        <div key={r.name} className="tip-row">
          {r.color && <span className="key-line" style={{ background: r.color }} />}
          <b>{r.value}</b> {r.name}
        </div>
      ))}
    </>
  );
}

/** "View as table" toggle so every value is reachable without hovering. */
export function TableView({ head, rows, caption }: { head: ReactNode[]; rows: ReactNode[][]; caption?: string }) {
  return (
    <details className="table-toggle">
      <summary>View as table</summary>
      <div className="table-scroll">
        <table className="data-table">
          {caption && <caption className="visually-hidden">{caption}</caption>}
          <thead>
            <tr>
              {head.map((h, i) => (
                <th key={i} className={i > 0 ? 'num' : undefined}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i}>
                {r.map((c, j) => (
                  <td key={j} className={j > 0 ? 'num' : undefined}>
                    {c}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </details>
  );
}
