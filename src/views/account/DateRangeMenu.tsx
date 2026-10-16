'use client';

import { useEffect, useId, useRef, useState } from 'react';
import { useStore } from '@/store/StoreProvider';
import { ChevronIcon } from '@/components/Icons';
import { DAY, resolveRange } from '@/lib/stats';
import { fmtDay, toDateInput } from '@/lib/format';
import type { RangePreset } from '@/lib/types';

const PRESETS: { value: Exclude<RangePreset, 'custom'>; label: string }[] = [
  { value: '7', label: 'Last 7 days' },
  { value: '30', label: 'Last 30 days' },
  { value: '90', label: 'Last 90 days' },
  { value: 'all', label: 'All time (pilot)' },
];

export function DateRangeMenu() {
  const { dash, setDash, reports, now } = useStore();
  const [open, setOpen] = useState(false);
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const wrapRef = useRef<HTMLDivElement>(null);
  const btnRef = useRef<HTMLButtonElement>(null);
  const id = useId();

  const range = resolveRange(dash, reports, now);
  const label =
    dash.preset === 'custom' ? `${fmtDay(new Date(range.from))} – ${fmtDay(new Date(range.to))}` : range.label;

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpen(false);
        btnRef.current?.focus();
      }
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const toggle = () => {
    if (!open) {
      setFrom(dash.customFrom || toDateInput(new Date(now - 30 * DAY)));
      setTo(dash.customTo || toDateInput(new Date(now)));
    }
    setOpen((o) => !o);
  };

  const choose = (p: RangePreset) => {
    setDash({ preset: p });
    setOpen(false);
    btnRef.current?.focus();
  };

  const apply = () => {
    if (!from || !to) return;
    setDash({ preset: 'custom', customFrom: from, customTo: to });
    setOpen(false);
    btnRef.current?.focus();
  };

  return (
    <div className="dropdown" ref={wrapRef}>
      <button
        ref={btnRef}
        className="btn btn-ghost btn-sm dropdown-btn"
        aria-haspopup="true"
        aria-expanded={open}
        aria-controls={`${id}-menu`}
        onClick={toggle}
      >
        <span className="visually-hidden">Date range: </span>
        {label}
        <ChevronIcon />
      </button>
      {open && (
        <div className="dropdown-menu" id={`${id}-menu`}>
          <ul>
            {PRESETS.map((p) => {
              const sel = dash.preset === p.value;
              return (
                <li key={p.value}>
                  <button className="menu-row" aria-pressed={sel} onClick={() => choose(p.value)} autoFocus={sel}>
                    <span className="menu-check" aria-hidden>
                      {sel ? '✓' : ''}
                    </span>
                    {p.label}
                  </button>
                </li>
              );
            })}
          </ul>
          <div className="menu-custom">
            <span className="menu-custom-title">
              <span className="menu-check" aria-hidden>
                {dash.preset === 'custom' ? '✓' : ''}
              </span>
              Custom range
            </span>
            <label>
              From
              <input type="date" className="input input-sm" value={from} onChange={(e) => setFrom(e.target.value)} />
            </label>
            <label>
              To
              <input type="date" className="input input-sm" value={to} onChange={(e) => setTo(e.target.value)} />
            </label>
            <button className="btn btn-primary btn-sm" onClick={apply} disabled={!from || !to}>
              Apply
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
