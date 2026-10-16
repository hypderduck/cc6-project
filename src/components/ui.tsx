'use client';

import { useRef, type KeyboardEvent, type ReactNode } from 'react';
import { TYPE_LABEL } from '@/data/constants';
import type { ReportType, Status } from '@/lib/types';

export function TypePill({ type }: { type: ReportType }) {
  return <span className={`pill pill-${type}`}>{TYPE_LABEL[type]}</span>;
}

const STATUS_INFO: Record<Status, { label: string; title: string }> = {
  verified: { label: 'Verified', title: 'An admin (Earthlink NTU / Nature Society) has checked this report.' },
  pending: { label: 'Awaiting review', title: 'Not yet checked by an admin. It still counts on the map.' },
  rejected: { label: 'Rejected', title: 'An admin rejected this report. It is hidden from the map, feed and charts.' },
};

export function StatusBadge({ status }: { status: Status }) {
  const s = STATUS_INFO[status];
  return (
    <span className={`badge badge-${status}`} title={s.title}>
      {s.label}
    </span>
  );
}

export function Avatar({ name, anon }: { name: string; anon?: boolean }) {
  return (
    <span className="avatar" aria-hidden>
      {anon ? '?' : name.trim().charAt(0).toUpperCase() || '?'}
    </span>
  );
}

export function Switch({
  checked,
  onChange,
  label,
  sub,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
  sub?: string;
}) {
  return (
    <div className="switch-row">
      <div className="switch-text">
        <span className="switch-label">{label}</span>
        {sub && <span className="switch-sub">{sub}</span>}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        className="switch"
        onClick={() => onChange(!checked)}
      >
        <span className="switch-knob" />
      </button>
    </div>
  );
}

/** Single-select toggle chips (aria-pressed). */
export function FilterChips<T extends string>({
  options,
  value,
  onChange,
  label,
}: {
  options: { value: T; label: ReactNode }[];
  value: T;
  onChange: (v: T) => void;
  label: string;
}) {
  return (
    <div className="chips" role="group" aria-label={label}>
      {options.map((o) => (
        <button key={o.value} type="button" className="chip" aria-pressed={value === o.value} onClick={() => onChange(o.value)}>
          {o.label}
        </button>
      ))}
    </div>
  );
}

/** Radio-group chips with roving focus. Space/Enter selects, arrows move. */
export function RadioChips<T extends string>({
  options,
  value,
  onChange,
  labelledBy,
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
  labelledBy: string;
}) {
  const refs = useRef<(HTMLDivElement | null)[]>([]);
  const onKey = (e: KeyboardEvent, i: number) => {
    if (e.key === ' ' || e.key === 'Enter') {
      e.preventDefault();
      onChange(options[i].value);
    } else if (['ArrowRight', 'ArrowDown', 'ArrowLeft', 'ArrowUp'].includes(e.key)) {
      e.preventDefault();
      const d = e.key === 'ArrowRight' || e.key === 'ArrowDown' ? 1 : -1;
      const n = (i + d + options.length) % options.length;
      onChange(options[n].value);
      refs.current[n]?.focus();
    }
  };
  return (
    <div className="chips" role="radiogroup" aria-labelledby={labelledBy}>
      {options.map((o, i) => (
        <div
          key={o.value}
          ref={(el) => {
            refs.current[i] = el;
          }}
          role="radio"
          aria-checked={value === o.value}
          tabIndex={value === o.value ? 0 : -1}
          className={`chip chip-radio chip-${o.value}`}
          onClick={() => onChange(o.value)}
          onKeyDown={(e) => onKey(e, i)}
        >
          {o.label}
        </div>
      ))}
    </div>
  );
}

export function Loading() {
  return <p className="loading">Loading reports…</p>;
}

export function ViewHeader({ title, sub, right }: { title: string; sub?: string; right?: ReactNode }) {
  return (
    <header className="view-header">
      <div>
        <h1>{title}</h1>
        {sub && <p className="sub">{sub}</p>}
      </div>
      {right}
    </header>
  );
}
