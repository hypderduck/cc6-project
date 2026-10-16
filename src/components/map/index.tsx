'use client';

import dynamic from 'next/dynamic';
import type { HeatMapProps } from './HeatMap';

export type { HeatMarker, HeatPoint } from './HeatMap';

// Leaflet touches `window`, so the map only renders on the client.
const HeatMapInner = dynamic(() => import('./HeatMap'), {
  ssr: false,
  loading: () => (
    <div className="map-wrap">
      <div className="map-box map-loading" />
    </div>
  ),
});

export function HeatMap(props: HeatMapProps) {
  return <HeatMapInner {...props} />;
}

export function HeatLegend() {
  return (
    <div className="heat-legend" aria-hidden>
      <span>Fewer incidents</span>
      <span className="heat-ramp" />
      <span>More incidents</span>
    </div>
  );
}
