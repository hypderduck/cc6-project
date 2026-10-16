import { HOTSPOTS } from './hotspots';
import { SPECIES } from './species';
import { COMMENTER_NAMES, COMMENT_POOL, HOUR_WEIGHTS, REPORTER_NAMES, TYPE_WEIGHTS } from './constants';
import type { Comment, Report, Status } from '@/lib/types';

export const SEED = 20261015;
export const MOCK_COUNT = 96;
export const MOCK_DAYS = 120;
const DAY = 864e5;

export function mulberry32(seed: number) {
  let a = seed;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function pickIndex(rand: () => number, weights: number[]) {
  const total = weights.reduce((a, b) => a + b, 0);
  let x = rand() * total;
  for (let i = 0; i < weights.length; i++) {
    x -= weights[i];
    if (x < 0) return i;
  }
  return weights.length - 1;
}

const pick = <T,>(rand: () => number, arr: T[]) => arr[Math.floor(rand() * arr.length)];

/** Deterministic mock dataset: 96 reports over the last 120 days, newest first. */
export function generateMock(now: Date = new Date()): Report[] {
  const rand = mulberry32(SEED);
  const gauss = () => (rand() + rand() + rand() - 1.5) * 2;
  const nowMs = now.getTime();
  const out: Report[] = [];

  for (let id = 1; id <= MOCK_COUNT; id++) {
    const daysAgo = Math.floor(MOCK_DAYS * Math.pow(rand(), 1.5));
    const hs = HOTSPOTS[pickIndex(rand, HOTSPOTS.map((h) => h.w))];
    const type = TYPE_WEIGHTS[pickIndex(rand, TYPE_WEIGHTS.map((t) => t.w))].type;
    const species = SPECIES[pickIndex(rand, SPECIES.map((s) => s.w))].name;
    const hour = pickIndex(rand, HOUR_WEIGHTS);
    const minute = Math.floor(rand() * 60);

    const d = new Date(nowMs - daysAgo * DAY);
    d.setHours(hour, minute, 0, 0);
    if (d.getTime() > nowMs) d.setTime(d.getTime() - DAY);

    const spread = rand() < 0.1 ? 2.4 : 1;
    const lat = hs.lat + gauss() * 0.00028 * spread;
    const lng = hs.lng + gauss() * 0.00033 * spread;

    const night = hour >= 19 || hour < 7;
    const poorLight = rand() < (night ? 0.7 : 0.08);
    const wet = rand() < 0.25;
    const photo = rand() < (type === 'sighting' ? 0.5 : 0.92);
    const reporter = rand() < 0.25 ? 'Anonymous' : pick(rand, REPORTER_NAMES);

    let status: Status;
    if (daysAgo >= 5) {
      if (rand() < 0.88) status = 'verified';
      else status = rand() < 0.5 ? 'rejected' : 'pending';
    } else {
      status = rand() < 0.5 ? 'pending' : 'verified';
    }

    // Social, seeded per report so it doesn't disturb the main sequence.
    const sr = mulberry32(id * 7919);
    const likes = Math.floor(sr() * 14);
    const nComments = Math.floor(sr() * 4);
    const thread: Comment[] = [];
    const span = Math.max(0, nowMs - d.getTime());
    for (let c = 0; c < nComments; c++) {
      thread.push({
        id: id * 10 + c,
        name: pick(sr, COMMENTER_NAMES),
        text: pick(sr, COMMENT_POOL[type]),
        ts: new Date(d.getTime() + sr() * span),
        demo: true,
      });
    }
    thread.sort((a, b) => a.ts.getTime() - b.ts.getTime());

    out.push({
      id, ts: d, type, species, hs: hs.id, lat, lng, night, poorLight, wet, photo,
      reporter, status, likes, liked: false, thread,
    });
  }

  return out.sort((a, b) => b.ts.getTime() - a.ts.getTime());
}
