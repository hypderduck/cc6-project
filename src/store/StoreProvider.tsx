'use client';

import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import * as api from '@/lib/backend';
import { generateMock } from '@/data/mock';
import { HOTSPOTS, NTU_CENTER, ELSEWHERE_ID, hotspotById } from '@/data/hotspots';
import { SPECIES } from '@/data/species';
import { REPORTER_NAMES } from '@/data/constants';
import { clientId, load, save } from '@/lib/storage';
import type { Comment, DashFilters, Prefs, Profile, Report, ReportType, Role, Status } from '@/lib/types';

export interface NewReportInput {
  type: ReportType;
  species: string;
  hs: string; // hotspot id or ELSEWHERE_ID
  ts: Date;
  poorLight: boolean;
  wet: boolean;
  heavyTraffic: boolean;
  forestEdge: boolean;
  wrongPlace: boolean;
  photo: boolean;
  anonymous: boolean;
}

type Mode = 'supabase' | 'local';

interface Store {
  ready: boolean;
  /** Clock for time windows; refreshed every minute and whenever reports change. */
  now: number;
  mode: Mode;
  backendError: string | null;
  reports: Report[];
  prefs: Prefs;
  setPref: (k: keyof Prefs, v: boolean) => void;
  profile: Profile;
  setProfile: (p: Profile) => void;
  role: Role;
  setRole: (r: Role) => void;
  dash: DashFilters;
  setDash: (patch: Partial<DashFilters>) => void;
  addReport: (input: NewReportInput) => Promise<Report | null>;
  simulateIncoming: () => Promise<Report | null>;
  setStatus: (id: number, status: Status) => void;
  toggleLike: (id: number) => void;
  addComment: (reportId: number, text: string) => void;
  flagComment: (reportId: number, commentId: number) => void;
  removeComment: (reportId: number, commentId: number) => void;
  resetData: () => Promise<void>;
}

const Ctx = createContext<Store | null>(null);

export const useStore = () => {
  const s = useContext(Ctx);
  if (!s) throw new Error('useStore must be used inside <StoreProvider>');
  return s;
};

const DEFAULT_PREFS: Prefs = { alerts: true, voice: false, anonDefault: false };
const DEFAULT_PROFILE: Profile = { email: '', displayName: 'NTU reporter' };
const DEFAULT_DASH: DashFilters = { preset: '30', customFrom: '', customTo: '', type: 'incidents', verified: false };
const LOCAL_KEY = 'ww.reports.v1';

const byNewest = (a: Report, b: Report) => b.ts.getTime() - a.ts.getTime();
const errMsg = (e: unknown) => (e instanceof Error ? e.message : typeof e === 'object' && e && 'message' in e ? String((e as { message: unknown }).message) : String(e));

function buildReport(input: NewReportInput, reporter: string, mine: boolean, id: number): Report {
  const base = hotspotById(input.hs);
  const lat0 = base ? base.lat : NTU_CENTER[0];
  const lng0 = base ? base.lng : NTU_CENTER[1];
  const jitter = () => (Math.random() * 2 - 1) * 0.0004;
  const hour = input.ts.getHours();
  return {
    id,
    ts: input.ts,
    type: input.type,
    species: input.species,
    hs: base ? base.id : ELSEWHERE_ID,
    lat: lat0 + jitter(),
    lng: lng0 + jitter(),
    elsewhere: !base,
    night: hour >= 19 || hour < 7,
    poorLight: input.poorLight,
    wet: input.wet,
    heavyTraffic: input.heavyTraffic,
    forestEdge: input.forestEdge,
    wrongPlace: input.wrongPlace,
    photo: input.photo,
    reporter,
    status: 'pending',
    mine,
    likes: 0,
    liked: false,
    thread: [],
  };
}

export function StoreProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [mode, setMode] = useState<Mode>(api.supabase ? 'supabase' : 'local');
  const [backendError, setBackendError] = useState<string | null>(null);
  const [reports, setReportsState] = useState<Report[]>([]);
  const [prefs, setPrefs] = useState<Prefs>(DEFAULT_PREFS);
  const [profile, setProfileState] = useState<Profile>(DEFAULT_PROFILE);
  const [role, setRoleState] = useState<Role>('reporter');
  const [dash, setDashState] = useState<DashFilters>(DEFAULT_DASH);

  const [now, setNow] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(t);
  }, []);

  const cid = useRef('');
  const liked = useRef<Set<number>>(new Set());
  const modeRef = useRef<Mode>(api.supabase ? 'supabase' : 'local');

  // Every data change also refreshes the clock, so brand-new reports fall inside "last N days".
  const setReports = useCallback((next: Report[] | ((rs: Report[]) => Report[])) => {
    setReportsState(next);
    setNow(Date.now());
  }, []);

  const refresh = useCallback(async () => {
    const rows = await api.fetchReports(cid.current, liked.current);
    setReports(rows);
    return rows;
  }, [setReports]);

  // Initial load (client only, so prerender never touches Date or storage).
  /* eslint-disable react-hooks/set-state-in-effect -- hydrating from browser storage / the database on mount */
  useEffect(() => {
    cid.current = clientId();
    liked.current = new Set(load<number[]>('ww.liked', []));
    setPrefs({ ...DEFAULT_PREFS, ...load<Partial<Prefs>>('ww.prefs', {}) });
    setProfileState({ ...DEFAULT_PROFILE, ...load<Partial<Profile>>('ww.profile', {}) });
    setRoleState(load<Role>('ww.role', 'reporter'));

    const loadLocal = () => {
      const stored = load<Parameters<typeof api.deserialize>[0] | null>(LOCAL_KEY, null);
      let data: Report[];
      try {
        data = stored ? api.deserialize(stored) : generateMock();
      } catch {
        data = generateMock();
      }
      setReports(data.sort(byNewest));
      modeRef.current = 'local';
      setMode('local');
      setReady(true);
    };

    if (!api.supabase) {
      loadLocal();
      return;
    }

    let unsub: (() => void) | undefined;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let cancelled = false;
    (async () => {
      try {
        let rows = await refresh();
        if (rows.length === 0) {
          try {
            await api.seedMock();
          } catch {
            /* another client may be seeding at the same moment */
          }
          rows = await refresh();
        }
        if (cancelled) return;
        setReady(true);
        unsub = api.subscribe(() => {
          clearTimeout(timer);
          timer = setTimeout(() => void refresh().catch(() => {}), 350);
        });
      } catch (e) {
        if (cancelled) return;
        console.warn('Supabase unavailable, using local demo data:', e);
        setBackendError(errMsg(e));
        loadLocal();
      }
    })();
    return () => {
      cancelled = true;
      clearTimeout(timer);
      unsub?.();
    };
  }, [refresh, setReports]);
  /* eslint-enable react-hooks/set-state-in-effect */

  // Local mode: persist the whole dataset after every change.
  useEffect(() => {
    if (ready && mode === 'local') save(LOCAL_KEY, api.serialize(reports));
  }, [ready, mode, reports]);

  const remote = (fn: () => Promise<unknown>) => {
    if (modeRef.current !== 'supabase') return;
    fn().catch((e) => {
      console.error(e);
      setBackendError(errMsg(e));
    });
  };

  const patch = (id: number, f: (r: Report) => Report) =>
    setReports((rs) => rs.map((r) => (r.id === id ? f(r) : r)));

  const setPref = useCallback((k: keyof Prefs, v: boolean) => {
    setPrefs((p) => {
      const next = { ...p, [k]: v };
      save('ww.prefs', next);
      return next;
    });
  }, []);

  const setProfile = useCallback((p: Profile) => {
    setProfileState(p);
    save('ww.profile', p);
  }, []);

  const setRole = useCallback((r: Role) => {
    setRoleState(r);
    save('ww.role', r);
  }, []);

  const setDash = useCallback((p: Partial<DashFilters>) => setDashState((d) => ({ ...d, ...p })), []);

  const insert = async (r: Report, mine: boolean): Promise<Report | null> => {
    if (modeRef.current === 'supabase') {
      try {
        const id = await api.insertReport(r, mine ? cid.current : null);
        const saved = { ...r, id };
        setReports((rs) => (rs.some((x) => x.id === id) ? rs : [saved, ...rs].sort(byNewest)));
        return saved;
      } catch (e) {
        console.error(e);
        setBackendError(errMsg(e));
        return null;
      }
    }
    setReports((rs) => [r, ...rs].sort(byNewest));
    return r;
  };

  const nextLocalId = () => Math.max(999, ...reports.map((r) => r.id)) + 1;

  const addReport = async (input: NewReportInput) => {
    const name = input.anonymous ? 'Anonymous' : profile.displayName || 'NTU reporter';
    return insert(buildReport(input, name, true, nextLocalId()), true);
  };

  const simulateIncoming = async () => {
    const hs = HOTSPOTS[Math.floor(Math.random() * HOTSPOTS.length)];
    const species = SPECIES[Math.floor(Math.random() * SPECIES.length)].name;
    const now = new Date();
    const r = buildReport(
      {
        type: Math.random() < 0.6 ? 'fatality' : 'injury',
        species,
        hs: hs.id,
        ts: now,
        poorLight: now.getHours() >= 19 || now.getHours() < 7,
        wet: Math.random() < 0.25,
        heavyTraffic: false,
        forestEdge: false,
        wrongPlace: false,
        photo: Math.random() < 0.9,
        anonymous: false,
      },
      Math.random() < 0.25 ? 'Anonymous' : REPORTER_NAMES[Math.floor(Math.random() * REPORTER_NAMES.length)],
      false,
      nextLocalId(),
    );
    return insert(r, false);
  };

  const setStatus = (id: number, status: Status) => {
    patch(id, (r) => ({ ...r, status }));
    remote(() => api.updateStatus(id, status));
  };

  const toggleLike = (id: number) => {
    const r = reports.find((x) => x.id === id);
    if (!r) return;
    const nowLiked = !r.liked;
    if (nowLiked) liked.current.add(id);
    else liked.current.delete(id);
    save('ww.liked', [...liked.current]);
    patch(id, (x) => ({ ...x, liked: nowLiked, likes: Math.max(0, x.likes + (nowLiked ? 1 : -1)) }));
    remote(() => api.bumpLikes(id, nowLiked ? 1 : -1));
  };

  const addComment = (reportId: number, text: string) => {
    const clean = text.trim().slice(0, 280);
    if (!clean) return;
    const tmpId = -Date.now();
    const c: Comment = {
      id: tmpId,
      name: prefs.anonDefault ? 'Anonymous' : profile.displayName || 'NTU reporter',
      text: clean,
      ts: new Date(),
      mine: true,
    };
    patch(reportId, (r) => ({ ...r, thread: [...r.thread, c] }));
    if (modeRef.current === 'supabase') {
      api
        .insertComment(reportId, c, cid.current)
        .then((id) =>
          patch(reportId, (r) => ({
            ...r,
            thread: r.thread.some((x) => x.id === id)
              ? r.thread.filter((x) => x.id !== tmpId)
              : r.thread.map((x) => (x.id === tmpId ? { ...x, id } : x)),
          })),
        )
        .catch((e) => {
          console.error(e);
          setBackendError(errMsg(e));
        });
    }
  };

  const flagComment = (reportId: number, commentId: number) => {
    patch(reportId, (r) => ({ ...r, thread: r.thread.map((c) => (c.id === commentId ? { ...c, flagged: true } : c)) }));
    remote(() => api.flagComment(commentId));
  };

  const removeComment = (reportId: number, commentId: number) => {
    patch(reportId, (r) => ({ ...r, thread: r.thread.filter((c) => c.id !== commentId) }));
    remote(() => api.deleteComment(commentId));
  };

  const resetData = async () => {
    liked.current.clear();
    save('ww.liked', []);
    if (modeRef.current === 'supabase') {
      try {
        await api.seedMock();
        await refresh();
        setBackendError(null);
      } catch (e) {
        setBackendError(errMsg(e));
      }
      return;
    }
    setReports(generateMock());
  };

  const value: Store = {
    ready: ready && now > 0, now, mode, backendError, reports, prefs, setPref, profile, setProfile, role, setRole, dash, setDash,
    addReport, simulateIncoming, setStatus, toggleLike, addComment, flagComment, removeComment, resetData,
  };

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
