'use client';

import { useMemo, useState } from 'react';
import { useStore } from '@/store/StoreProvider';
import { FilterChips, StatusBadge, TypePill } from '@/components/ui';
import { hotspotName } from '@/lib/stats';
import { conditionsText, fmtDateTime } from '@/lib/format';
import type { Status } from '@/lib/types';

const PAGE = 20;

export function ReviewQueue() {
  const { reports, setStatus } = useStore();
  const [status, setFilter] = useState<Status>('pending');
  const [shown, setShown] = useState(PAGE);

  const counts = useMemo(() => {
    const c = { pending: 0, verified: 0, rejected: 0 };
    for (const r of reports) c[r.status]++;
    return c;
  }, [reports]);
  const rows = useMemo(() => reports.filter((r) => r.status === status), [reports, status]);

  return (
    <div>
      <FilterChips
        label="Filter by status"
        value={status}
        onChange={(v) => {
          setFilter(v);
          setShown(PAGE);
        }}
        options={[
          { value: 'pending', label: `Pending (${counts.pending})` },
          { value: 'verified', label: `Verified (${counts.verified})` },
          { value: 'rejected', label: `Rejected (${counts.rejected})` },
        ]}
      />
      {rows.length === 0 ? (
        <p className="empty">Nothing here.</p>
      ) : (
        <ul className="queue">
          {rows.slice(0, shown).map((r) => {
            const cond = conditionsText(r);
            return (
              <li key={r.id} className="card queue-row">
                <div className="queue-main">
                  <div className="queue-title">
                    <TypePill type={r.type} />
                    <strong>{r.species}</strong>
                    <StatusBadge status={r.status} />
                  </div>
                  <div className="meta">
                    {r.elsewhere ? 'Elsewhere on campus' : hotspotName(r.hs)} · {fmtDateTime(r.ts)}
                  </div>
                  <div className="meta">
                    Reporter: {r.mine ? `${r.reporter} (you)` : r.reporter} · Photo: {r.photo ? 'yes' : 'no'}
                    {cond && ` · ${cond}`}
                  </div>
                </div>
                <div className="queue-actions">
                  {r.status === 'pending' ? (
                    <>
                      <button className="btn btn-primary btn-sm" onClick={() => setStatus(r.id, 'verified')}>
                        Verify
                      </button>
                      <button className="btn btn-ghost btn-sm btn-danger" onClick={() => setStatus(r.id, 'rejected')}>
                        Reject
                      </button>
                    </>
                  ) : (
                    <button className="btn btn-ghost btn-sm" onClick={() => setStatus(r.id, 'pending')}>
                      Undo
                    </button>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
      {shown < rows.length && (
        <button className="btn btn-ghost btn-block" onClick={() => setShown((n) => n + PAGE)}>
          Show more
        </button>
      )}
    </div>
  );
}
