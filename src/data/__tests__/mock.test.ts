import { describe, expect, it } from 'vitest';
import { generateMock } from '../mock';
import { hotspotStats, niceMax, riskScore, select, tierFor } from '../../lib/stats';
import { shareText } from '../../lib/share';
import { locText } from '../../lib/privacy';

const NOW = new Date('2026-10-15T12:00:00');

describe('mock generator', () => {
  it('always produces 96 reports', () => {
    expect(generateMock(NOW)).toHaveLength(96);
  });

  it('is deterministic', () => {
    const a = generateMock(NOW);
    const b = generateMock(NOW);
    expect(a.map((r) => [r.id, r.ts.getTime(), r.type, r.species, r.hs, r.status, r.likes, r.thread.length])).toEqual(
      b.map((r) => [r.id, r.ts.getTime(), r.type, r.species, r.hs, r.status, r.likes, r.thread.length]),
    );
  });

  it('is sorted newest first, within 120 days and never in the future', () => {
    const rs = generateMock(NOW);
    for (let i = 1; i < rs.length; i++) expect(rs[i - 1].ts.getTime()).toBeGreaterThanOrEqual(rs[i].ts.getTime());
    for (const r of rs) {
      expect(r.ts.getTime()).toBeLessThanOrEqual(NOW.getTime());
      expect(NOW.getTime() - r.ts.getTime()).toBeLessThan(122 * 864e5);
    }
  });
});

describe('stats', () => {
  it('niceMax gives integer steps', () => {
    expect(niceMax(0)).toEqual({ max: 4, step: 1 });
    expect(niceMax(7)).toEqual({ max: 8, step: 2 });
    expect(niceMax(23)).toEqual({ max: 40, step: 10 });
  });

  it('risk score and tiers follow the placeholder rules', () => {
    expect(riskScore(8, 5, true, 100)).toBe(100);
    expect(tierFor({ n: 6, f: 3, score: 65 }).key).toBe('strong');
    expect(tierFor({ n: 3, f: 0, score: 40 }).key).toBe('building');
    expect(tierFor({ n: 2, f: 0, score: 90 }).key).toBe('monitor');
  });

  it('select excludes rejected reports', () => {
    const rs = generateMock(NOW);
    const all = select(rs, { from: 0, to: NOW.getTime(), type: 'all' });
    expect(all.every((r) => r.status !== 'rejected')).toBe(true);
    expect(hotspotStats(all).reduce((a, s) => a + s.n, 0)).toBe(all.length);
  });
});

describe('privacy', () => {
  it('never names the reporter or the exact spot of protected species', () => {
    const r = { ...generateMock(NOW)[0], species: 'Sunda pangolin', reporter: 'Mei', type: 'fatality' as const };
    expect(shareText(r)).toBe('Roadkill: a protected species near NTU campus. Drive slowly and log wildlife on Wildwatch NTU.');
    expect(shareText(r)).not.toContain('Mei');
    expect(locText(r)).toBe('Location withheld (protected species)');
  });
});
