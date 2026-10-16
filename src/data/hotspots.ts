// Approximate placements, NOT surveyed. Replace with real coordinates from
// NTU Nature Watch / Earthlink. `w` = generator weight, `traffic` = invented 0–100 exposure.
export interface Hotspot {
  id: string;
  name: string;
  short: string;
  lat: number;
  lng: number;
  w: number;
  traffic: number;
}

export const HOTSPOTS: Hotspot[] = [
  { id: 'wkw', name: 'Nanyang Ave, near Wee Kim Wee', short: 'Wee Kim Wee', lat: 1.3438, lng: 103.68, w: 26, traffic: 85 },
  { id: 'h6', name: 'Nanyang Drive, Hall 6 side', short: 'Hall 6 side', lat: 1.3512, lng: 103.6853, w: 22, traffic: 60 },
  { id: 'yg', name: 'Yunnan Garden road', short: 'Yunnan Garden', lat: 1.3466, lng: 103.6838, w: 16, traffic: 35 },
  { id: 'ss', name: 'South Spine bus loop', short: 'South Spine loop', lat: 1.3425, lng: 103.6824, w: 9, traffic: 90 },
  { id: 'h11', name: 'Hall 11 service road', short: 'Hall 11 road', lat: 1.3521, lng: 103.691, w: 10, traffic: 30 },
  { id: 'lake', name: 'Nanyang Lake path', short: 'Lake path', lat: 1.3446, lng: 103.6878, w: 7, traffic: 25 },
];

export const NTU_CENTER: [number, number] = [1.3478, 103.683];
export const NTU_BOUNDS: [[number, number], [number, number]] = [
  [1.334, 103.67],
  [1.36, 103.696],
];

export const ELSEWHERE_ID = 'elsewhere';

export const hotspotById = (id: string) => HOTSPOTS.find((h) => h.id === id);
