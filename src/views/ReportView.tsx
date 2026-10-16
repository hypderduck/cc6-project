'use client';

import { useRouter } from 'next/navigation';
import { useId, useRef, useState, type FormEvent } from 'react';
import { useStore } from '@/store/StoreProvider';
import { useUI } from '@/components/UIProvider';
import { Loading, RadioChips, Switch, ViewHeader } from '@/components/ui';
import { HOTSPOTS, ELSEWHERE_ID } from '@/data/hotspots';
import { OTHER_SPECIES, SPECIES } from '@/data/species';
import { toLocalInput } from '@/lib/format';
import type { ReportType } from '@/lib/types';

const TYPES: { value: ReportType; label: string }[] = [
  { value: 'sighting', label: 'Sighting' },
  { value: 'injury', label: 'Injury' },
  { value: 'fatality', label: 'Fatality' },
];

const FACTORS = [
  { key: 'poorLight', label: 'Poor lighting' },
  { key: 'wet', label: 'Wet road' },
  { key: 'heavyTraffic', label: 'Heavy traffic' },
  { key: 'forestEdge', label: 'Near forest edge' },
] as const;

type FactorKey = (typeof FACTORS)[number]['key'];
const NO_FACTORS: Record<FactorKey, boolean> = { poorLight: false, wet: false, heavyTraffic: false, forestEdge: false };

export function ReportView() {
  const { ready, now, prefs, addReport } = useStore();
  const ui = useUI();
  const router = useRouter();
  const id = useId();

  const [type, setType] = useState<ReportType>('sighting');
  const [species, setSpecies] = useState(SPECIES[0].name);
  const [hs, setHs] = useState(HOTSPOTS[0].id);
  const [time, setTime] = useState(''); // '' means "now"
  const [factors, setFactors] = useState(NO_FACTORS);
  const [wrongPlace, setWrongPlace] = useState(false);
  const [photoName, setPhotoName] = useState('');
  const [anonChoice, setAnonChoice] = useState<boolean | null>(null); // null follows the Account preference
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const photoRef = useRef<HTMLInputElement>(null);
  const photoBoxRef = useRef<HTMLDivElement>(null);
  const formRef = useRef<HTMLFormElement>(null);

  const anonymous = anonChoice ?? prefs.anonDefault;
  const nowInput = now ? toLocalInput(new Date(now)) : '';

  const needsPhoto = type !== 'sighting';

  const reset = () => {
    setType('sighting');
    setSpecies(SPECIES[0].name);
    setHs(HOTSPOTS[0].id);
    setTime('');
    setFactors(NO_FACTORS);
    setWrongPlace(false);
    setPhotoName('');
    if (photoRef.current) photoRef.current.value = '';
    setAnonChoice(null);
    setError('');
  };

  const setMockLocation = () => {
    const h = HOTSPOTS[Math.floor(Math.random() * HOTSPOTS.length)];
    setHs(h.id);
    ui.toast('Location set from GPS (mock).');
  };

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (busy) return;
    if (needsPhoto && !photoName) {
      setError('Add a photo for injury and fatality reports.');
      photoBoxRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      photoRef.current?.focus({ preventScroll: true });
      return;
    }
    const now = new Date();
    let ts = time ? new Date(time) : now;
    if (isNaN(ts.getTime()) || ts > now) ts = now; // future times are clamped to now

    setBusy(true);
    const saved = await addReport({
      type,
      species,
      hs,
      ts,
      ...factors,
      wrongPlace,
      photo: !!photoName,
      anonymous,
    });
    setBusy(false);
    if (!saved) {
      ui.toast('Could not save the report. Check your connection and try again.');
      return;
    }
    // Severity routing (simulated).
    if (type === 'injury' || wrongPlace) ui.toast('Logged. An urgent alert was sent to NParks and ACRES (simulated).');
    else ui.toast('Thanks. Your report is on the map.');
    reset();
    router.push('/');
  };

  if (!ready)
    return (
      <div className="view">
        <ViewHeader title="Log a report" sub="Every entry improves the hotspot map for everyone." />
        <Loading />
      </div>
    );

  return (
    <div className="view">
      <ViewHeader title="Log a report" sub="Every entry improves the hotspot map for everyone." />
      <form className="form card" onSubmit={onSubmit} ref={formRef} noValidate>
        <div className="field">
          <span className="label" id={`${id}-type`}>
            What did you see?
          </span>
          <RadioChips options={TYPES} value={type} onChange={(v) => { setType(v); setError(''); }} labelledBy={`${id}-type`} />
        </div>

        <div className="field">
          <label className="label" htmlFor={`${id}-species`}>
            Animal
          </label>
          <select id={`${id}-species`} className="input" value={species} onChange={(e) => setSpecies(e.target.value)}>
            {SPECIES.map((s) => (
              <option key={s.name} value={s.name}>
                {s.name}
              </option>
            ))}
            <option value={OTHER_SPECIES}>{OTHER_SPECIES}</option>
          </select>
        </div>

        <div className="field">
          <label className="label" htmlFor={`${id}-loc`}>
            Location
          </label>
          <div className="row-gap">
            <select id={`${id}-loc`} className="input" value={hs} onChange={(e) => setHs(e.target.value)}>
              {HOTSPOTS.map((h) => (
                <option key={h.id} value={h.id}>
                  {h.name}
                </option>
              ))}
              <option value={ELSEWHERE_ID}>Elsewhere on campus</option>
            </select>
            <button type="button" className="btn btn-ghost btn-sm" onClick={setMockLocation}>
              Use my location (mock)
            </button>
          </div>
        </div>

        <div className="field">
          <label className="label" htmlFor={`${id}-time`}>
            Time
          </label>
          <input
            id={`${id}-time`}
            className="input"
            type="datetime-local"
            value={time || nowInput}
            max={nowInput}
            onChange={(e) => setTime(e.target.value)}
          />
        </div>

        <fieldset className="field">
          <legend className="label">Other factors</legend>
          <div className="check-grid">
            {FACTORS.map((f) => (
              <label key={f.key} className="check">
                <input
                  type="checkbox"
                  checked={factors[f.key]}
                  onChange={(e) => setFactors((x) => ({ ...x, [f.key]: e.target.checked }))}
                />
                <span>{f.label}</span>
              </label>
            ))}
          </div>
        </fieldset>

        <div className="field">
          <label className="check">
            <input type="checkbox" checked={wrongPlace} onChange={(e) => setWrongPlace(e.target.checked)} />
            <span>Animal is somewhere it shouldn&apos;t be (for example inside a building)</span>
          </label>
        </div>

        <div className="field" ref={photoBoxRef}>
          <span className="label">
            Photo {needsPhoto ? <span className="req">required for injury and fatality</span> : <span className="opt">optional</span>}
          </span>
          <label className={`upload${error ? ' upload-error' : ''}${photoName ? ' upload-done' : ''}`}>
            <input
              ref={photoRef}
              type="file"
              accept="image/*"
              className="visually-hidden"
              aria-invalid={!!error}
              aria-describedby={error ? `${id}-photo-err` : undefined}
              onChange={(e) => {
                const f = e.target.files?.[0];
                setPhotoName(f ? f.name : '');
                if (f) setError('');
              }}
            />
            <span aria-hidden className="upload-icon">
              📷
            </span>
            <span>{photoName ? `Photo added: ${photoName}` : 'Tap to add a photo'}</span>
          </label>
          {error && (
            <p className="field-error" id={`${id}-photo-err`} role="alert">
              {error}
            </p>
          )}
        </div>

        <Switch
          checked={anonymous}
          onChange={setAnonChoice}
          label="Report anonymously"
          sub="Your name is hidden from the feed. Admins still see the report."
        />

        <button type="submit" className="btn btn-primary btn-block btn-lg" disabled={busy}>
          {busy ? 'Saving…' : 'Log report'}
        </button>
      </form>
    </div>
  );
}
