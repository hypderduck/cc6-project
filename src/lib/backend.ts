import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { generateMock } from '@/data/mock';
import type { Comment, Report, Status } from './types';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const supabase: SupabaseClient | null =
  url && key ? createClient(url, key, { auth: { persistSession: false } }) : null;

interface CommentRow {
  id: number;
  report_id: number;
  name: string;
  text: string;
  ts: string;
  client_id: string | null;
  flagged: boolean;
  demo: boolean;
}

interface ReportRow {
  id: number;
  ts: string;
  type: Report['type'];
  species: string;
  hs: string;
  lat: number;
  lng: number;
  elsewhere: boolean;
  night: boolean;
  poor_light: boolean;
  wet: boolean;
  heavy_traffic: boolean;
  forest_edge: boolean;
  wrong_place: boolean;
  photo: boolean;
  reporter: string;
  status: Status;
  client_id: string | null;
  likes: number;
  comments?: CommentRow[];
}

const commentFromRow = (c: CommentRow, cid: string): Comment => ({
  id: c.id,
  name: c.name,
  text: c.text,
  ts: new Date(c.ts),
  mine: !!c.client_id && c.client_id === cid,
  flagged: c.flagged,
  demo: c.demo,
});

function fromRow(row: ReportRow, cid: string, liked: Set<number>): Report {
  return {
    id: row.id,
    ts: new Date(row.ts),
    type: row.type,
    species: row.species,
    hs: row.hs,
    lat: row.lat,
    lng: row.lng,
    elsewhere: row.elsewhere,
    night: row.night,
    poorLight: row.poor_light,
    wet: row.wet,
    heavyTraffic: row.heavy_traffic,
    forestEdge: row.forest_edge,
    wrongPlace: row.wrong_place,
    photo: row.photo,
    reporter: row.reporter,
    status: row.status,
    mine: !!row.client_id && row.client_id === cid,
    likes: row.likes,
    liked: liked.has(row.id),
    thread: (row.comments ?? [])
      .map((c) => commentFromRow(c, cid))
      .sort((a, b) => a.ts.getTime() - b.ts.getTime()),
  };
}

function toRow(r: Report, cid: string | null, withId: boolean) {
  return {
    ...(withId ? { id: r.id } : {}),
    ts: r.ts.toISOString(),
    type: r.type,
    species: r.species,
    hs: r.hs,
    lat: r.lat,
    lng: r.lng,
    elsewhere: !!r.elsewhere,
    night: r.night,
    poor_light: r.poorLight,
    wet: r.wet,
    heavy_traffic: !!r.heavyTraffic,
    forest_edge: !!r.forestEdge,
    wrong_place: !!r.wrongPlace,
    photo: r.photo,
    reporter: r.reporter,
    status: r.status,
    client_id: cid,
    likes: r.likes,
  };
}

function db() {
  if (!supabase) throw new Error('Supabase is not configured');
  return supabase;
}

export async function fetchReports(cid: string, liked: Set<number>): Promise<Report[]> {
  const { data, error } = await db()
    .from('reports')
    .select('*, comments(*)')
    .order('ts', { ascending: false });
  if (error) throw error;
  return (data as ReportRow[]).map((r) => fromRow(r, cid, liked));
}

/** Wipe everything and load the deterministic mock dataset. */
export async function seedMock() {
  const client = db();
  const del = await client.from('reports').delete().gte('id', 0);
  if (del.error) throw del.error;
  const mock = generateMock();
  const ins = await client.from('reports').insert(mock.map((r) => toRow(r, null, true)));
  if (ins.error) throw ins.error;
  const comments = mock.flatMap((r) =>
    r.thread.map((c) => ({ report_id: r.id, name: c.name, text: c.text, ts: c.ts.toISOString(), demo: true })),
  );
  if (comments.length) {
    const ci = await client.from('comments').insert(comments);
    if (ci.error) throw ci.error;
  }
}

export async function insertReport(r: Report, cid: string | null): Promise<number> {
  const { data, error } = await db().from('reports').insert(toRow(r, cid, false)).select('id').single();
  if (error) throw error;
  return data.id as number;
}

export async function updateStatus(id: number, status: Status) {
  const { error } = await db().from('reports').update({ status }).eq('id', id);
  if (error) throw error;
}

export async function bumpLikes(id: number, delta: 1 | -1) {
  const { error } = await db().rpc('bump_likes', { p_report_id: id, p_delta: delta });
  if (error) throw error;
}

export async function insertComment(reportId: number, c: Comment, cid: string): Promise<number> {
  const { data, error } = await db()
    .from('comments')
    .insert({ report_id: reportId, name: c.name, text: c.text, ts: c.ts.toISOString(), client_id: cid })
    .select('id')
    .single();
  if (error) throw error;
  return data.id as number;
}

export async function flagComment(id: number) {
  const { error } = await db().from('comments').update({ flagged: true }).eq('id', id);
  if (error) throw error;
}

export async function deleteComment(id: number) {
  const { error } = await db().from('comments').delete().eq('id', id);
  if (error) throw error;
}

/** Calls `onChange` whenever reports or comments change in the database. */
export function subscribe(onChange: () => void) {
  const client = db();
  const channel = client
    .channel('wildwatch-live')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'reports' }, onChange)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'comments' }, onChange)
    .subscribe();
  return () => {
    client.removeChannel(channel);
  };
}

// ---- Local (no Supabase) persistence ---------------------------------------

type Stored = Omit<Report, 'ts' | 'thread'> & { ts: string; thread: (Omit<Comment, 'ts'> & { ts: string })[] };

export function serialize(reports: Report[]): Stored[] {
  return reports.map((r) => ({
    ...r,
    ts: r.ts.toISOString(),
    thread: r.thread.map((c) => ({ ...c, ts: c.ts.toISOString() })),
  }));
}

export function deserialize(stored: Stored[]): Report[] {
  return stored.map((r) => ({
    ...r,
    ts: new Date(r.ts),
    thread: r.thread.map((c) => ({ ...c, ts: new Date(c.ts) })),
  }));
}
