'use client';

import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { useEffect, useRef, useState } from 'react';
import { NTU_BOUNDS, NTU_CENTER } from '@/data/hotspots';
import { HEAT_RAMP } from '@/data/constants';
import { useUI } from '@/components/UIProvider';

export interface HeatPoint {
  lat: number;
  lng: number;
}

export interface HeatMarker {
  rank: number;
  name: string;
  lat: number;
  lng: number;
  n: number;
  f: number;
}

export interface HeatMapProps {
  points: HeatPoint[];
  markers: HeatMarker[];
  label: string;
  unit?: string; // "incidents" or "reports"
}

// CARTO's free basemaps now return an "API key required" placeholder, so the default is
// OpenStreetMap's tile server (fine for a showcase; see its tile usage policy). Set
// NEXT_PUBLIC_TILE_URL / NEXT_PUBLIC_TILE_ATTRIBUTION to use another provider.
const TILE_URL = process.env.NEXT_PUBLIC_TILE_URL || 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';
const ATTRIBUTION =
  process.env.NEXT_PUBLIC_TILE_ATTRIBUTION ||
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';

/** 256-entry RGB lookup for the heat ramp. */
const LUT = (() => {
  const hex = (h: string) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
  const stops = HEAT_RAMP.map(hex);
  const out = new Uint8ClampedArray(256 * 3);
  for (let i = 0; i < 256; i++) {
    const t = (i / 255) * (stops.length - 1);
    const k = Math.min(stops.length - 2, Math.floor(t));
    const f = t - k;
    for (let c = 0; c < 3; c++) out[i * 3 + c] = stops[k][c] + (stops[k + 1][c] - stops[k][c]) * f;
  }
  return out;
})();

function bounds() {
  return L.latLngBounds(NTU_BOUNDS).pad(0.35);
}

export default function HeatMap({ points, markers, label, unit = 'incidents' }: HeatMapProps) {
  const boxRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const redrawRef = useRef<(() => void) | null>(null);
  const markerLayerRef = useRef<L.LayerGroup | null>(null);
  const pointsRef = useRef(points);
  const [offline, setOffline] = useState(false);
  const ui = useUI();
  const uiRef = useRef(ui);
  useEffect(() => {
    uiRef.current = ui;
  });

  // Create the map. Runs again whenever the route is shown (Activity re-runs effects).
  useEffect(() => {
    const el = boxRef.current;
    if (!el) return;
    setOffline(false);
    const coarse = window.matchMedia?.('(pointer: coarse)').matches ?? false;
    const map = L.map(el, {
      center: NTU_CENTER,
      zoom: 15,
      minZoom: 14,
      maxZoom: 18,
      maxBounds: bounds(),
      maxBoundsViscosity: 0.8,
      scrollWheelZoom: false,
      dragging: !coarse, // one-finger swipes scroll the page; pinch still zooms
      attributionControl: true,
    });
    mapRef.current = map;

    const tiles = L.tileLayer(TILE_URL, { subdomains: 'abcd', maxZoom: 19, attribution: ATTRIBUTION }).addTo(map);
    let errs = 0;
    let loads = 0;
    tiles.on('tileerror', () => {
      errs++;
      if (errs >= 2 && loads === 0) setOffline(true);
    });
    tiles.on('tileload', () => {
      loads++;
      setOffline(false);
    });

    // Custom canvas heat layer: above tiles, below markers.
    const pane = map.createPane('heat');
    pane.style.zIndex = '450';
    pane.style.pointerEvents = 'none';
    const canvas = L.DomUtil.create('canvas', 'heat-canvas', pane) as HTMLCanvasElement;
    const off = document.createElement('canvas');

    const redraw = () => {
      const size = map.getSize();
      if (!size.x || !size.y) return;
      canvas.width = size.x;
      canvas.height = size.y;
      canvas.style.width = `${size.x}px`;
      canvas.style.height = `${size.y}px`;
      L.DomUtil.setPosition(canvas, map.containerPointToLayerPoint([0, 0]));

      const ctx = canvas.getContext('2d');
      off.width = size.x;
      off.height = size.y;
      const octx = off.getContext('2d', { willReadFrequently: true });
      if (!ctx || !octx) return;

      const mpp = (156543.03 * Math.cos((map.getCenter().lat * Math.PI) / 180)) / Math.pow(2, map.getZoom());
      const R = Math.max(14, Math.min(90, 150 / mpp));

      octx.clearRect(0, 0, size.x, size.y);
      for (const p of pointsRef.current) {
        const cp = map.latLngToContainerPoint([p.lat, p.lng]);
        if (cp.x < -R || cp.y < -R || cp.x > size.x + R || cp.y > size.y + R) continue;
        const g = octx.createRadialGradient(cp.x, cp.y, 0, cp.x, cp.y, R);
        g.addColorStop(0, 'rgba(0,0,0,0.34)');
        g.addColorStop(1, 'rgba(0,0,0,0)');
        octx.fillStyle = g;
        octx.fillRect(cp.x - R, cp.y - R, R * 2, R * 2);
      }

      const src = octx.getImageData(0, 0, size.x, size.y).data;
      const out = ctx.createImageData(size.x, size.y);
      const dst = out.data;
      for (let i = 0; i < src.length; i += 4) {
        const a = src[i + 3] / 255;
        if (a < 0.02) continue;
        const t = Math.min(1, a / 0.85);
        const k = Math.round(t * 255) * 3;
        dst[i] = LUT[k];
        dst[i + 1] = LUT[k + 1];
        dst[i + 2] = LUT[k + 2];
        dst[i + 3] = Math.min(1, t * 1.7) * 0.88 * 255;
      }
      ctx.putImageData(out, 0, 0);
      canvas.style.visibility = 'visible';
    };
    redrawRef.current = redraw;

    map.on('zoomstart', () => {
      canvas.style.visibility = 'hidden';
    });
    map.on('moveend zoomend resize', redraw);

    markerLayerRef.current = L.layerGroup().addTo(map);

    const ro = new ResizeObserver(() => map.invalidateSize());
    ro.observe(el);
    const io = new IntersectionObserver((entries) => {
      if (entries.some((e) => e.isIntersecting)) map.invalidateSize();
    });
    io.observe(el);

    redraw();

    return () => {
      ro.disconnect();
      io.disconnect();
      uiRef.current.hideTip();
      map.remove();
      mapRef.current = null;
      redrawRef.current = null;
      markerLayerRef.current = null;
    };
  }, []);

  useEffect(() => {
    pointsRef.current = points;
    redrawRef.current?.();
  }, [points]);

  useEffect(() => {
    const layer = markerLayerRef.current;
    if (!layer) return;
    layer.clearLayers();
    for (const m of markers) {
      const icon = L.divIcon({
        className: 'hs-marker',
        html: `<span>${m.rank}</span>`,
        iconSize: [26, 26],
        iconAnchor: [13, 13],
      });
      const marker = L.marker([m.lat, m.lng], { icon, keyboard: true, riseOnHover: true }).addTo(layer);
      const el = marker.getElement();
      if (!el) continue;
      el.setAttribute('role', 'button');
      el.setAttribute('aria-label', `${m.rank}. ${m.name}, ${m.n} ${unit}`);
      el.removeAttribute('title');
      const show = () =>
        uiRef.current.showTip(
          <>
            <div className="tip-title">{m.name}</div>
            <div>
              <b>{m.n}</b> {unit}
            </div>
            <div>
              <b>{m.f}</b> fatalities
            </div>
          </>,
          el,
        );
      const hide = () => uiRef.current.hideTip();
      el.addEventListener('mouseenter', show);
      el.addEventListener('focus', show);
      el.addEventListener('mouseleave', hide);
      el.addEventListener('blur', hide);
    }
  }, [markers, unit]);

  return (
    <div className="map-wrap">
      <div ref={boxRef} className="map-box" role="region" aria-label={label} />
      {offline && (
        <div className="map-offline" role="note">
          Map tiles could not load. Open this with an internet connection to see the real NTU map. Heat layer and hotspots
          still work.
        </div>
      )}
    </div>
  );
}
