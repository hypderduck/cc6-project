'use client';

import { useId, useState, type FormEvent } from 'react';
import { useStore } from '@/store/StoreProvider';
import { useUI } from '@/components/UIProvider';
import { Loading, StatusBadge, Switch, TypePill, ViewHeader } from '@/components/ui';
import { Dashboard } from './Dashboard';
import { ReviewQueue } from './ReviewQueue';
import { locText } from '@/lib/privacy';
import { fmtDateTime } from '@/lib/format';

export function AccountView() {
  const { ready, role, setRole } = useStore();
  return (
    <div className="view">
      <div className="role-switch">
        <span>Demo only: view as</span>
        <div className="seg" role="group" aria-label="View as">
          <button aria-pressed={role === 'reporter'} onClick={() => setRole('reporter')}>
            Reporter
          </button>
          <button aria-pressed={role === 'admin'} onClick={() => setRole('admin')}>
            Admin (Earthlink / Estates)
          </button>
        </div>
      </div>
      {!ready ? <Loading /> : role === 'admin' ? <AdminPanel /> : <ReporterPanel />}
    </div>
  );
}

function ReporterPanel() {
  const { prefs, setPref, profile, setProfile, reports } = useStore();
  const ui = useUI();
  const id = useId();
  const [email, setEmail] = useState(profile.email);
  const [name, setName] = useState(profile.displayName);
  const [pw, setPw] = useState('');

  const mine = reports.filter((r) => r.mine);

  const save = (e: FormEvent) => {
    e.preventDefault();
    setProfile({ email: email.trim(), displayName: name.trim() || 'NTU reporter' });
    setPw('');
    ui.toast('Saved (mock). Real NTU login is not built yet.');
  };

  return (
    <>
      <ViewHeader title="Account" sub="Your login and how Wildwatch behaves for you." />
      <div className="account-grid">
        <form className="card form" onSubmit={save}>
          <h2>Login (mock)</h2>
          <div className="field">
            <label className="label" htmlFor={`${id}-email`}>
              NTU email
            </label>
            <input
              id={`${id}-email`}
              className="input"
              type="email"
              placeholder="you@e.ntu.edu.sg"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div className="field">
            <label className="label" htmlFor={`${id}-name`}>
              Display name
            </label>
            <input
              id={`${id}-name`}
              className="input"
              type="text"
              maxLength={40}
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div className="field">
            <label className="label" htmlFor={`${id}-pw`}>
              Password
            </label>
            <input
              id={`${id}-pw`}
              className="input"
              type="password"
              autoComplete="current-password"
              value={pw}
              onChange={(e) => setPw(e.target.value)}
            />
          </div>
          <button className="btn btn-primary" type="submit">
            Save
          </button>
          <p className="note">Prototype only. Nothing is sent anywhere. Real NTU single sign-on is out of scope.</p>
        </form>

        <section className="card" aria-labelledby="prefs-h">
          <h2 id="prefs-h">Preferences</h2>
          <Switch
            label="Hotspot alerts"
            sub="Warn me when I'm approaching a hotspot."
            checked={prefs.alerts}
            onChange={(v) => setPref('alerts', v)}
          />
          <Switch
            label="Voice alert"
            sub="Read the alert aloud so I don't need to look at my phone."
            checked={prefs.voice}
            onChange={(v) => setPref('voice', v)}
          />
          <Switch
            label="Anonymous by default"
            sub="Pre-tick 'Report anonymously' on new reports."
            checked={prefs.anonDefault}
            onChange={(v) => setPref('anonDefault', v)}
          />
        </section>

        <section className="card span-all" aria-labelledby="mine-h">
          <h2 id="mine-h">My reports</h2>
          {mine.length === 0 ? (
            <p className="empty">Nothing yet. Reports you log in this session appear here.</p>
          ) : (
            <ul className="mine-list">
              {mine.map((r) => (
                <li key={r.id}>
                  <div className="queue-title">
                    <TypePill type={r.type} />
                    <strong>{r.species}</strong>
                  </div>
                  <div className="meta">
                    {locText(r)} · {fmtDateTime(r.ts)}
                  </div>
                  <StatusBadge status={r.status} />
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </>
  );
}

function AdminPanel() {
  const { reports, mode, backendError, resetData } = useStore();
  const ui = useUI();
  const [tab, setTab] = useState<'dash' | 'queue'>('dash');
  const [busy, setBusy] = useState(false);
  const pending = reports.filter((r) => r.status === 'pending').length;

  const reset = async () => {
    if (!window.confirm('Reset to the original 96 mock reports? This removes every report, comment and like added in the demo.')) return;
    setBusy(true);
    await resetData();
    setBusy(false);
    ui.toast('Mock data reset.');
  };

  return (
    <>
      <ViewHeader
        title="Admin console"
        sub="Earthlink NTU and Campus Estates: review submissions and decide if the data supports Phase 2."
        right={<span className="live-tag">● Live · mock feed</span>}
      />
      <div className="subtabs" role="tablist" aria-label="Admin sections">
        <button role="tab" aria-selected={tab === 'dash'} className="subtab" onClick={() => setTab('dash')}>
          Dashboard
        </button>
        <button role="tab" aria-selected={tab === 'queue'} className="subtab" onClick={() => setTab('queue')}>
          Review queue ({pending} pending)
        </button>
      </div>
      <div role="tabpanel">{tab === 'dash' ? <Dashboard /> : <ReviewQueue />}</div>

      <footer className="admin-foot">
        <p className="note">
          Data source:{' '}
          {mode === 'supabase'
            ? 'Supabase (shared and live across devices).'
            : 'this browser only (Supabase is not connected).'}
          {backendError && <span className="error-text"> Last database error: {backendError}</span>}
        </p>
        <button className="btn btn-ghost btn-sm" onClick={reset} disabled={busy}>
          {busy ? 'Resetting…' : 'Reset mock data'}
        </button>
      </footer>
    </>
  );
}
