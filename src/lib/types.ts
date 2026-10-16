export type ReportType = 'sighting' | 'injury' | 'fatality';
export type Status = 'pending' | 'verified' | 'rejected';
export type Role = 'reporter' | 'admin';

export interface Comment {
  id: number;
  name: string;
  text: string;
  ts: Date;
  mine?: boolean;
  flagged?: boolean;
  demo?: boolean;
}

export interface Report {
  id: number;
  ts: Date;
  type: ReportType;
  species: string;
  hs: string;
  lat: number;
  lng: number;
  elsewhere?: boolean;
  night: boolean;
  poorLight: boolean;
  wet: boolean;
  heavyTraffic?: boolean;
  forestEdge?: boolean;
  wrongPlace?: boolean;
  photo: boolean;
  reporter: string;
  status: Status;
  mine?: boolean;
  likes: number;
  liked: boolean;
  thread: Comment[];
}

export interface Prefs {
  alerts: boolean;
  voice: boolean;
  anonDefault: boolean;
}

export interface Profile {
  email: string;
  displayName: string;
}

/** Admin dashboard filter state. */
export type DashType = 'incidents' | 'fatality' | 'injury' | 'sighting' | 'all';
export type RangePreset = '7' | '30' | '90' | 'all' | 'custom';
export interface DashFilters {
  preset: RangePreset;
  customFrom: string; // yyyy-mm-dd
  customTo: string;
  type: DashType;
  verified: boolean;
}
