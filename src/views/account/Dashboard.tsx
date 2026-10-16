'use client';

import { useMemo, useState } from 'react';
import { useStore } from '@/store/StoreProvider';
import { useUI } from '@/components/UIProvider';
import { HeatLegend, HeatMap } from '@/components/map';
import { ColumnChart } from '@/components/charts/ColumnChart';
import { HBarChart, type HBarRow } from '@/components/charts/HBarChart';
import { TableView, type Series } from '@/components/charts/common';
import { DateRangeMenu } from './DateRangeMenu';
import { SERIES_COLOR, TIME_BINS, TIME_BINS_SHORT } from '@/data/constants';
import { speciesByName } from '@/data/species';
import {
  DAY, hotspotShort, hotspotStats, peakBin, resolveRange, select, tierFor, topMarkers, type HotspotStat,
} from '@/lib/stats';
import { fmtDay, plural } from '@/lib/format';
import type { DashType, Report, ReportType } from '@/lib/types';

const TYPE_OPTIONS: { value: DashType; label: string }[] = [
  { value: 'incidents', label: 'Incidents (fatality + injury)' },
  { value: 'fatality', label: 'Fatalities' },
  { value: 'injury', label: 'Injuries' },
  { value: 'sighting', label: 'Sightings' },
  { value: 'all', label: 'All reports' },
];

const TYPE_NOUN: Record<DashType, string> = {
  incidents: 'Incidents',
  fatality: 'Fatalities',
  injury: 'Injuries',
  sighting: 'Sightings',
  all: 'All reports',
};

const SERIES_TYPES: Record<DashType, ReportType[]> = {
  incidents: ['injury', 'fatality'],
  fatality: ['fatality'],
  injury: ['injury'],
  sighting: ['sighting'],
  all: ['sighting', 'injury', 'fatality'],
};

const SERIES_NAME: Record<ReportType, string> = { injury: 'Injuries', fatality: 'Fatalities', sighting: 'Sightings' };

const startOfDay = (t: number) => {
  const d = new Date(t);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
};

function Delta({ d, badWhenUp, days, allTime, dark }: { d: number; badWhenUp: boolean | null; days: number; allTime: boolean; dark?: boolean }) {
  if (allTime) return <span className="delta">Whole pilot so far</span>;
  const vs = `vs previous ${plural(days, 'day')}`;
  if (d === 0) return <span className="delta">No change {vs}</span>;
  const up = d > 0;
  const bad = badWhenUp == null ? null : up === badWhenUp;
  const cls = bad == null ? '' : bad ? (dark ? 'delta-bad-dark' : 'delta-bad') : dark ? 'delta-good-dark' : 'delta-good';
  return (
    <span className={`delta ${cls}`}>
      {up ? '▲ up' : '▼ down'} {Math.abs(d)} {vs}
    </span>
  );
}

export function Dashboard() {
  const { reports, now, dash, setDash, simulateIncoming } = useStore();
  const ui = useUI();
  const [simBusy, setSimBusy] = useState(false);

  const range = useMemo(() => resolveRange(dash, reports, now), [dash, reports, now]);
  const slice = useMemo(
    () => select(reports, { from: range.from, to: range.to, type: dash.type, verified: dash.verified }),
    [reports, range, dash.type, dash.verified],
  );
  const prevSlice = useMemo(() => {
    const len = range.to - range.from;
    return select(reports, { from: range.from - len, to: range.from - 1, type: dash.type, verified: dash.verified });
  }, [reports, range, dash.type, dash.verified]);

  const count = (items: Report[], t: ReportType) => items.filter((r) => r.type === t).length;
  const pct = (k: number, n: number) => (n ? Math.round((k / n) * 100) : 0);
  const badWhenUp = dash.type === 'sighting' ? false : dash.type === 'all' ? null : true;
  const deltaProps = { days: range.days, allTime: range.allTime };

  const markers = useMemo(() => topMarkers(slice, 5), [slice]);
  const unit = SERIES_TYPES[dash.type].includes('sighting') ? 'reports' : 'incidents';

  // Phase 2 verdict always uses incidents in the date range, ignoring the type filter.
  const incStats = useMemo(() => {
    const inc = select(reports, { from: range.from, to: range.to, type: 'incidents', verified: dash.verified });
    return { n: inc.length, stats: hotspotStats(inc) };
  }, [reports, range, dash.verified]);

  const sliceStats = useMemo(() => hotspotStats(slice), [slice]);

  const onSimulate = async () => {
    setSimBusy(true);
    const r = await simulateIncoming();
    setSimBusy(false);
    if (r) ui.toast(`New ${r.type}: ${r.species}, ${hotspotShort(r.hs)}`);
    else ui.toast('Could not add the simulated report.');
  };

  return (
    <div className="dash">
      <p className="mock-banner" role="note">
        <strong>Mock dataset</strong> (96 invented reports over 120 days). Locations, species and counts are not real
        incident data.
      </p>

      <div className="filter-row">
        <DateRangeMenu />
        <label className="select-wrap">
          <span className="visually-hidden">Report type</span>
          <select className="input input-sm" value={dash.type} onChange={(e) => setDash({ type: e.target.value as DashType })}>
            {TYPE_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </label>
        <label className="select-wrap">
          <span className="visually-hidden">Data quality</span>
          <select
            className="input input-sm"
            value={dash.verified ? 'verified' : 'all'}
            onChange={(e) => setDash({ verified: e.target.value === 'verified' })}
          >
            <option value="all">All non-rejected</option>
            <option value="verified">Verified only</option>
          </select>
        </label>
        <button className="btn btn-ghost btn-sm push-right" onClick={onSimulate} disabled={simBusy}>
          Simulate incoming report
        </button>
      </div>

      <div className="dash-grid">
        {/* 1. KPI row */}
        <section className="span-12 kpi-row" aria-label="Key numbers">
          <div className="kpi kpi-hero">
            <div className="kpi-label">
              {TYPE_NOUN[dash.type]} · {range.label}
            </div>
            <div className="kpi-big">{slice.length}</div>
            <Delta d={slice.length - prevSlice.length} badWhenUp={badWhenUp} dark {...deltaProps} />
          </div>
          <div className="kpi">
            <div className="kpi-label">Fatalities</div>
            <div className="kpi-num">{count(slice, 'fatality')}</div>
            <Delta d={count(slice, 'fatality') - count(prevSlice, 'fatality')} badWhenUp {...deltaProps} />
          </div>
          <div className="kpi">
            <div className="kpi-label">Injuries</div>
            <div className="kpi-num">{count(slice, 'injury')}</div>
            <Delta d={count(slice, 'injury') - count(prevSlice, 'injury')} badWhenUp {...deltaProps} />
          </div>
          <div className="kpi">
            <div className="kpi-label">At night (7 pm–7 am)</div>
            <div className="kpi-num">{pct(slice.filter((r) => r.night).length, slice.length)}%</div>
            <span className="delta">
              {slice.filter((r) => r.night).length} of {plural(slice.length, 'report')}
            </span>
          </div>
          <div className="kpi">
            <div className="kpi-label">Reports with photo</div>
            <div className="kpi-num">{pct(slice.filter((r) => r.photo).length, slice.length)}%</div>
            <span className="delta">Evidence quality</span>
          </div>
        </section>

        {/* 2. Heatmap + verdict */}
        <section className="card span-8" aria-labelledby="dmap-h">
          <div className="card-head">
            <h2 id="dmap-h">Live NTU heatmap</h2>
            <span className="meta">{plural(slice.length, 'report')} · numbered markers = top 5 hotspots</span>
          </div>
          <HeatMap points={slice} markers={markers} unit={unit} label="Heatmap of filtered reports on NTU campus" />
          <HeatLegend />
          <TableView
            caption="Top hotspots on the map"
            head={['Hotspot', unit[0].toUpperCase() + unit.slice(1), 'Fatalities']}
            rows={markers.map((m) => [`${m.rank}. ${m.name}`, m.n, m.f])}
          />
        </section>

        <Verdict n={incStats.n} stats={incStats.stats} />

        {/* 3. Over time + time of day */}
        <OverTime slice={slice} type={dash.type} from={range.from} to={range.to} days={range.days} />
        <TimeOfDay slice={slice} type={dash.type} />

        {/* 4. Location + species */}
        <ByLocation slice={slice} />
        <BySpecies slice={slice} />

        {/* 5. Readiness table */}
        <Readiness stats={sliceStats} />
      </div>
    </div>
  );
}

function Verdict({ n, stats }: { n: number; stats: HotspotStat[] }) {
  const tiers = stats.map((s) => ({ s, t: tierFor(s) }));
  const strong = tiers.filter((x) => x.t.key === 'strong');
  const building = tiers.filter((x) => x.t.key === 'building');
  const top = [...stats].sort((a, b) => b.score - a.score).slice(0, 4);

  let icon = '✓';
  let cls = 'verdict-ok';
  let body;
  if (n < 10) {
    icon = '⚠';
    cls = 'verdict-warn';
    body = (
      <>
        <strong>Not enough data yet.</strong> Only {plural(n, 'incident')} in this range. Widen the date range or keep
        collecting.
      </>
    );
  } else if (strong.length) {
    icon = '⚠';
    cls = 'verdict-yes';
    const names = strong.map((x) => x.s.hs.short);
    const list = names.length > 1 ? `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}` : names[0];
    body = (
      <>
        <strong>Yes, at {plural(strong.length, 'hotspot')}.</strong> {list} {strong.length === 1 ? 'meets' : 'meet'} the
        placeholder threshold (6+ incidents, 3+ fatalities, score 65+).
      </>
    );
  } else if (building.length) {
    icon = 'ⓘ';
    cls = 'verdict-info';
    body = (
      <>
        <strong>Building.</strong> {plural(building.length, 'hotspot')} {building.length === 1 ? 'is' : 'are'} close.
        Keep collecting before committing budget.
      </>
    );
  } else {
    body = (
      <>
        <strong>Not yet.</strong> No hotspot meets the threshold in this range.
      </>
    );
  }

  return (
    <section className="card span-4" aria-labelledby="verdict-h">
      <h2 id="verdict-h">Does the data support Phase 2?</h2>
      <div className={`verdict ${cls}`}>
        <span className="verdict-icon" aria-hidden>
          {icon}
        </span>
        <p>{body}</p>
      </div>
      <h3 className="h3">Top hotspots by risk score (0–100)</h3>
      {top.length === 0 ? (
        <p className="empty">No incidents in this range.</p>
      ) : (
        <ol className="score-list">
          {top.map((s) => (
            <li key={s.hs.id}>
              <span className="score-name">{s.hs.short}</span>
              <span className="meter" aria-hidden>
                <span style={{ width: `${s.score}%` }} />
              </span>
              <span className="score-val">{s.score}</span>
            </li>
          ))}
        </ol>
      )}
      <p className="note">Score = frequency 38 + severity 24 + endangered species 14 + traffic exposure 24. Placeholder weights.</p>
    </section>
  );
}

function OverTime({ slice, type, from, to, days }: { slice: Report[]; type: DashType; from: number; to: number; days: number }) {
  const daily = days <= 14;
  const binLen = daily ? DAY : 7 * DAY;
  const start = startOfDay(from);
  const nBins = Math.max(1, Math.ceil((to - start + 1) / binLen));
  const types = SERIES_TYPES[type];

  const categories = Array.from({ length: nBins }, (_, i) => {
    const a = new Date(start + i * binLen);
    const b = new Date(Math.min(start + (i + 1) * binLen - 1, to));
    return { label: fmtDay(a), tip: daily ? fmtDay(a) : `${fmtDay(a)} – ${fmtDay(b)}` };
  });

  const series: Series[] = types.map((t) => {
    const values = new Array(nBins).fill(0);
    for (const r of slice) {
      if (r.type !== t) continue;
      const i = Math.floor((r.ts.getTime() - start) / binLen);
      if (i >= 0 && i < nBins) values[i]++;
    }
    return { key: t, name: SERIES_NAME[t], color: SERIES_COLOR[t], values };
  });

  const title = types.includes('sighting') ? 'Reports over time' : 'Incidents over time';

  return (
    <section className="card span-7" aria-labelledby="ot-h">
      <div className="card-head">
        <h2 id="ot-h">{title}</h2>
        <span className="meta">{daily ? 'Daily' : 'Weekly'}</span>
      </div>
      <ColumnChart categories={categories} series={series} directLabels ariaLabel={`${title}, ${daily ? 'daily' : 'weekly'}`} />
      <TableView
        caption={title}
        head={[daily ? 'Day' : 'Week', ...series.map((s) => s.name), 'Total']}
        rows={categories.map((c, i) => [c.tip, ...series.map((s) => s.values[i]), series.reduce((a, s) => a + s.values[i], 0)])}
      />
    </section>
  );
}

function TimeOfDay({ slice, type }: { slice: Report[]; type: DashType }) {
  const { bins, peak, label } = peakBin(slice);
  const noun = SERIES_TYPES[type].includes('sighting') ? 'reports' : 'incidents';
  return (
    <section className="card span-5" aria-labelledby="tod-h">
      <div className="card-head">
        <h2 id="tod-h">Time of day</h2>
      </div>
      <p className="sub">{slice.length ? `Most ${noun} happen between ${label}.` : 'No reports in this range.'}</p>
      <ColumnChart
        categories={TIME_BINS.map((t, i) => ({ label: TIME_BINS_SHORT[i], tip: t }))}
        series={[{ key: 'n', name: noun, color: '#2b4a35', values: bins }]}
        highlight={slice.length ? peak : undefined}
        ariaLabel="Reports by time of day, 3-hour bins"
      />
      <TableView caption="Time of day" head={['Time', noun]} rows={TIME_BINS.map((t, i) => [t, bins[i]])} />
    </section>
  );
}

function ByLocation({ slice }: { slice: Report[] }) {
  const tally = new Map<string, number>();
  for (const r of slice) tally.set(r.hs, (tally.get(r.hs) ?? 0) + 1);
  const rows: HBarRow[] = [...tally.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([hs, v]) => ({ label: hotspotShort(hs), value: v }));
  return (
    <section className="card span-6" aria-labelledby="loc-h">
      <h2 id="loc-h">By location</h2>
      <HBarChart rows={rows} unit="reports" ariaLabel="Reports per hotspot" />
      <TableView caption="By location" head={['Location', 'Reports']} rows={rows.map((r) => [r.label, r.value])} />
    </section>
  );
}

function BySpecies({ slice }: { slice: Report[] }) {
  const tally = new Map<string, number>();
  for (const r of slice) tally.set(r.species, (tally.get(r.species) ?? 0) + 1);
  const sorted = [...tally.entries()].sort((a, b) => b[1] - a[1]);
  let rows: HBarRow[] = sorted.slice(0, 6).map(([name, v]) => ({
    label: name,
    value: v,
    tag: speciesByName(name)?.sensitive ? 'critically endangered' : undefined,
  }));
  if (sorted.length > 6) rows = [...rows, { label: 'Other species', value: sorted.slice(6).reduce((a, [, v]) => a + v, 0) }];
  return (
    <section className="card span-6" aria-labelledby="sp-h">
      <h2 id="sp-h">Animals affected</h2>
      <HBarChart rows={rows} unit="reports" ariaLabel="Reports per species" />
      <TableView
        caption="Animals affected"
        head={['Species', 'Reports']}
        rows={rows.map((r) => [r.tag ? `${r.label} (${r.tag})` : r.label, r.value])}
      />
    </section>
  );
}

function Readiness({ stats }: { stats: HotspotStat[] }) {
  return (
    <section className="card span-12" aria-labelledby="ready-h">
      <h2 id="ready-h">Phase 2 readiness</h2>
      <div className="table-scroll">
        <table className="data-table readiness">
          <thead>
            <tr>
              <th>Hotspot</th>
              <th className="num">Incidents</th>
              <th className="num">Fatalities</th>
              <th>Most affected</th>
              <th>Peak time</th>
              <th className="num">Score</th>
              <th>Suggested next step</th>
            </tr>
          </thead>
          <tbody>
            {stats.map((s) => {
              const t = tierFor(s);
              return (
                <tr key={s.hs.id}>
                  <td>{s.hs.name}</td>
                  <td className="num">{s.n}</td>
                  <td className="num">{s.f}</td>
                  <td>{s.top}</td>
                  <td>{s.peakLabel}</td>
                  <td className="num">{s.score}</td>
                  <td>
                    <strong className={`tier tier-${t.key}`}>{t.label}.</strong> {t.step}
                  </td>
                </tr>
              );
            })}
            {stats.length === 0 && (
              <tr>
                <td colSpan={7} className="empty">
                  No reports in this range.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <p className="note">Scores and thresholds here are placeholders. Agree the real rules with Earthlink and Campus Estates.</p>
    </section>
  );
}
