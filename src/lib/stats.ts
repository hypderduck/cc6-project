import { HOTSPOTS, hotspotById, type Hotspot } from '@/data/hotspots';
import { speciesByName } from '@/data/species';
import { TIME_BINS } from '@/data/constants';
import type { DashFilters, DashType, Report } from './types';

export const DAY = 864e5;

export const isIncident = (r: Report) => r.type !== 'sighting';
export const visible = (r: Report) => r.status !== 'rejected';
export const binOf = (d: Date) => Math.floor(d.getHours() / 3);

export function matchesType(r: Report, type: DashType) {
  if (type === 'all') return true;
  if (type === 'incidents') return isIncident(r);
  return r.type === type;
}

export interface SelectOpts {
  from: number;
  to: number;
  type: DashType;
  verified?: boolean;
}

/** Non-rejected reports in [from, to] matching the type (and verified-only if set). */
export function select(reports: Report[], { from, to, type, verified }: SelectOpts) {
  return reports.filter((r) => {
    if (!visible(r)) return false;
    const t = r.ts.getTime();
    if (t < from || t > to) return false;
    if (verified && r.status !== 'verified') return false;
    return matchesType(r, type);
  });
}

/** Non-rejected incidents in the last 30 days (public map + alerts). */
export function last30Incidents(reports: Report[], now = Date.now()) {
  return select(reports, { from: now - 30 * DAY, to: now, type: 'incidents' });
}

export interface HotspotStat {
  hs: Hotspot;
  n: number;
  f: number;
  i: number;
  night: number;
  species: Record<string, number>;
  top: string;
  bins: number[];
  peak: number;
  peakLabel: string;
  endangered: boolean;
  score: number;
}

/** Placeholder risk score 0–100. Must be agreed with Earthlink and Campus Estates. */
export function riskScore(n: number, f: number, endangered: boolean, traffic: number) {
  const s =
    38 * Math.min(n / 8, 1) +
    24 * Math.min(f / 5, 1) +
    14 * (endangered ? 1 : 0) +
    24 * (traffic / 100);
  return Math.round(s);
}

export function hotspotStats(items: Report[]): HotspotStat[] {
  const map = new Map<string, HotspotStat>();
  for (const r of items) {
    const hs = hotspotById(r.hs);
    if (!hs) continue; // "Elsewhere on campus" has no hotspot
    let s = map.get(hs.id);
    if (!s) {
      s = { hs, n: 0, f: 0, i: 0, night: 0, species: {}, top: '', bins: new Array(8).fill(0), peak: 0, peakLabel: '', endangered: false, score: 0 };
      map.set(hs.id, s);
    }
    s.n++;
    if (r.type === 'fatality') s.f++;
    if (r.type === 'injury') s.i++;
    if (r.night) s.night++;
    s.species[r.species] = (s.species[r.species] ?? 0) + 1;
    s.bins[binOf(r.ts)]++;
    if (speciesByName(r.species)?.sensitive) s.endangered = true;
  }
  const out = [...map.values()];
  for (const s of out) {
    s.top = Object.entries(s.species).sort((a, b) => b[1] - a[1])[0]?.[0] ?? '';
    s.peak = s.bins.indexOf(Math.max(...s.bins));
    s.peakLabel = TIME_BINS[s.peak];
    s.score = riskScore(s.n, s.f, s.endangered, s.hs.traffic);
  }
  return out.sort((a, b) => b.n - a.n || b.score - a.score);
}

export type TierKey = 'strong' | 'building' | 'monitor';
export interface Tier {
  key: TierKey;
  label: string;
  step: string;
}

export function tierFor(s: Pick<HotspotStat, 'n' | 'f' | 'score'>): Tier {
  if (s.n >= 6 && s.f >= 3 && s.score >= 65)
    return {
      key: 'strong',
      label: 'Strong case',
      step: 'Field-check with Earthlink, then start Tier 1 (signage, rumble strips). Review Tier 2 (culvert, fencing) if incidents continue.',
    };
  if (s.n >= 3 && s.score >= 40)
    return { key: 'building', label: 'Building', step: 'Trial Tier 1 (signage) and keep collecting reports.' };
  return { key: 'monitor', label: 'Keep monitoring', step: 'Too few incidents to justify a build yet.' };
}

/** Peak 3-hour bin for a set of reports. */
export function peakBin(items: Report[]) {
  const bins = new Array(8).fill(0);
  for (const r of items) bins[binOf(r.ts)]++;
  const peak = bins.indexOf(Math.max(...bins));
  return { bins, peak, label: TIME_BINS[peak] };
}

/** Integer axis max: step = max(1, ceil(v/4)), rounded up to a multiple of 5 if > 5. */
export function niceMax(v: number) {
  let step = Math.max(1, Math.ceil(v / 4));
  if (step > 5) step = Math.ceil(step / 5) * 5;
  return { max: step * 4, step };
}

const startOfDay = (t: number) => {
  const d = new Date(t);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
};

/** Resolve the dashboard date range to [from, to] plus a label. */
export function resolveRange(f: DashFilters, reports: Report[], now = Date.now()) {
  if (f.preset === 'custom' && f.customFrom && f.customTo) {
    const from = new Date(f.customFrom + 'T00:00:00').getTime();
    const to = new Date(f.customTo + 'T23:59:59.999').getTime();
    const a = Math.min(from, to);
    const b = Math.max(from, to);
    return { from: a, to: b, label: 'Custom range', days: Math.round((b - a) / DAY), allTime: false };
  }
  if (f.preset === 'all') {
    const earliest = reports.reduce((m, r) => Math.min(m, r.ts.getTime()), now);
    const from = startOfDay(earliest);
    return { from, to: now, label: 'All time (pilot)', days: Math.ceil((now - from) / DAY), allTime: true };
  }
  const days = Number(f.preset === 'custom' ? '30' : f.preset);
  return { from: now - days * DAY, to: now, label: `Last ${days} days`, days, allTime: false };
}

export const hotspotName = (id: string) => hotspotById(id)?.name ?? 'Elsewhere on campus';
export const hotspotShort = (id: string) => hotspotById(id)?.short ?? 'Elsewhere';
export { HOTSPOTS };

/** Numbered map markers for the top-k hotspots (only hotspots with at least one report). */
export function topMarkers(items: Report[], k: number) {
  return hotspotStats(items)
    .slice(0, k)
    .map((s, i) => ({ rank: i + 1, name: s.hs.name, lat: s.hs.lat, lng: s.hs.lng, n: s.n, f: s.f }));
}
