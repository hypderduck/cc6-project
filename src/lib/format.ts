import type { Report } from './types';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export function ago(d: Date, now = Date.now()) {
  const s = Math.max(0, (now - d.getTime()) / 1000);
  if (s < 60) return 'just now';
  const m = Math.floor(s / 60);
  if (m < 60) return `${m} min ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} h ago`;
  const days = Math.floor(h / 24);
  if (days < 30) return `${days} d ago`;
  return fmtDay(d);
}

export const fmtDay = (d: Date) => `${d.getDate()} ${MONTHS[d.getMonth()]}`;

export function fmtTime(d: Date) {
  const h = d.getHours();
  const m = String(d.getMinutes()).padStart(2, '0');
  return `${h % 12 || 12}:${m} ${h < 12 ? 'am' : 'pm'}`;
}

export const fmtDateTime = (d: Date) => `${fmtDay(d)}, ${fmtTime(d)}`;

/** Value for <input type="datetime-local"> in local time. */
export function toLocalInput(d: Date) {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
}

/** Value for <input type="date"> in local time. */
export function toDateInput(d: Date) {
  return toLocalInput(d).slice(0, 10);
}

export const plural = (n: number, one: string, many = one + 's') => `${n} ${n === 1 ? one : many}`;

/** "at night, poor lighting, wet road" */
export function conditionsText(r: Report) {
  const c: string[] = [];
  if (r.night) c.push('at night');
  if (r.poorLight) c.push('poor lighting');
  if (r.wet) c.push('wet road');
  if (r.heavyTraffic) c.push('heavy traffic');
  if (r.forestEdge) c.push('near forest edge');
  if (r.wrongPlace) c.push('animal in the wrong place');
  return c.join(', ');
}
