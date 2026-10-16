'use client';

import Link from 'next/link';
import { useMemo } from 'react';
import { useStore } from '@/store/StoreProvider';
import { useUI } from '@/components/UIProvider';
import { HeatLegend, HeatMap } from '@/components/map';
import { Loading, TypePill, ViewHeader } from '@/components/ui';
import { emojiFor } from '@/data/species';
import { hotspotStats, hotspotShort, last30Incidents, peakBin, topMarkers, visible } from '@/lib/stats';
import { ago, plural } from '@/lib/format';
import { isSensitive } from '@/lib/privacy';

export function MapView() {
  const { ready, reports, now, prefs } = useStore();
  const ui = useUI();

  const recent = useMemo(() => last30Incidents(reports, now), [reports, now]);
  const markers = useMemo(() => topMarkers(recent, 3), [recent]);
  const latest = useMemo(() => reports.filter(visible).slice(0, 4), [reports]);

  const previewAlert = () => {
    if (!prefs.alerts) {
      ui.toast('Hotspot alerts are off. Turn them on in Account.');
      return;
    }
    const top = hotspotStats(recent)[0];
    if (!top) {
      ui.toast('No hotspots in the last 30 days, so there is nothing to warn about.');
      return;
    }
    const peak = peakBin(recent.filter((r) => r.hs === top.hs.id)).label;
    ui.showAlert({
      title: `Hotspot ahead: ${top.hs.name}`,
      body: `${plural(top.n, 'incident')} here in the last 30 days, mostly between ${peak}. Slow down and watch the verges.`,
    });
    if (prefs.voice) {
      try {
        if ('speechSynthesis' in window) {
          window.speechSynthesis.cancel();
          window.speechSynthesis.speak(new SpeechSynthesisUtterance('Wildlife hotspot ahead. Please slow down.'));
        }
      } catch {
        /* speech not available */
      }
    }
  };

  return (
    <div className="view">
      <ViewHeader
        title="Campus hotspots"
        sub="Where wildlife has been hurt or killed on campus roads in the last 30 days."
      />
      {!ready ? (
        <Loading />
      ) : (
        <div className="map-layout">
          <section className="card map-card" aria-labelledby="heat-h">
            <div className="card-head">
              <h2 id="heat-h">Heatmap</h2>
              <span className="meta">Last 30 days · {plural(recent.length, 'incident')}</span>
            </div>
            <HeatMap
              points={recent}
              markers={markers}
              label="Heatmap of wildlife incidents on NTU campus in the last 30 days"
            />
            <HeatLegend />
            <p className="note">Real NTU basemap. Incident locations and hotspot positions are mock data, placed approximately.</p>
          </section>

          <div className="side-stack">
            <section className="card" aria-labelledby="alert-h">
              <h2 id="alert-h">Hotspot alerts</h2>
              <p className="body-text">
                Warns you when you are driving into a hotspot, based on past reports. Voice and on/off are in{' '}
                <Link href="/account">Account</Link>.
              </p>
              <button className="btn btn-primary" onClick={previewAlert}>
                Preview an alert
              </button>
            </section>

            <section className="card" aria-labelledby="recent-h">
              <h2 id="recent-h">Recent activity</h2>
              <ul className="activity">
                {latest.map((r) => (
                  <li key={r.id} className="activity-row">
                    <span className="avatar avatar-emoji" aria-hidden>
                      {emojiFor(r.species)}
                    </span>
                    <div>
                      <div className="activity-line">
                        <TypePill type={r.type} />
                        <span>
                          {r.species}, {isSensitive(r) ? 'location withheld' : r.elsewhere ? 'Elsewhere on campus' : hotspotShort(r.hs)}
                        </span>
                      </div>
                      <div className="meta">
                        {ago(r.ts, now)} · {r.mine ? 'You' : r.reporter} · {plural(r.thread.length, 'comment')}
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
              <Link href="/news" className="btn btn-ghost">
                See all in News
              </Link>
            </section>
          </div>
        </div>
      )}
    </div>
  );
}

