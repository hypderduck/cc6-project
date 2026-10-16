'use client';

import { memo, useMemo, useRef, useState, type KeyboardEvent } from 'react';
import { useStore } from '@/store/StoreProvider';
import { useUI } from '@/components/UIProvider';
import { Avatar, FilterChips, Loading, StatusBadge, TypePill, ViewHeader } from '@/components/ui';
import { emojiFor } from '@/data/species';
import { visible } from '@/lib/stats';
import { ago, conditionsText } from '@/lib/format';
import { displayName, isAnon, isSensitive, locText } from '@/lib/privacy';
import type { Report, ReportType, Role } from '@/lib/types';

type Filter = 'all' | ReportType;
const FILTERS: { value: Filter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'fatality', label: 'Fatalities' },
  { value: 'injury', label: 'Injuries' },
  { value: 'sighting', label: 'Sightings' },
];
const PAGE = 10;

export function NewsView() {
  const { ready, reports, now, role } = useStore();
  const [filter, setFilter] = useState<Filter>('all');
  const [shown, setShown] = useState(PAGE);

  const feed = useMemo(
    () => reports.filter((r) => visible(r) && (filter === 'all' || r.type === filter)),
    [reports, filter],
  );

  return (
    <div className="view">
      <div className="feed-col">
        <ViewHeader
          title="Community feed"
          sub="See what people are reporting around campus. Comment, and share with friends so more people know where to slow down."
        />
        <FilterChips
          label="Filter reports"
          options={FILTERS}
          value={filter}
          onChange={(v) => {
            setFilter(v);
            setShown(PAGE);
          }}
        />
        {!ready ? (
          <Loading />
        ) : (
          <>
            <ul className="feed">
              {feed.slice(0, shown).map((r) => (
                <li key={r.id}>
                  <PostCard report={r} now={now} role={role} />
                </li>
              ))}
            </ul>
            {feed.length === 0 && <p className="empty">No reports match this filter yet.</p>}
            {shown < feed.length && (
              <button className="btn btn-ghost btn-block" onClick={() => setShown((n) => n + PAGE)}>
                Load more
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}

const PostCard = memo(function PostCard({ report: r, now, role }: { report: Report; now: number; role: Role }) {
  const { toggleLike, addComment, flagComment, removeComment } = useStore();
  const ui = useUI();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const threadId = `thread-${r.id}`;

  const anon = isAnon(r.reporter) && !r.mine;
  const name = displayName(r.reporter, r.mine);
  const cond = conditionsText(r);

  const post = () => {
    if (!draft.trim()) return;
    addComment(r.id, draft);
    setDraft('');
    inputRef.current?.focus();
  };

  const onKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      post();
    }
  };

  return (
    <article className="card post" aria-label={`${r.type} report: ${isSensitive(r) ? 'protected species' : r.species}`}>
      <header className="post-head">
        <Avatar name={name} anon={anon} />
        <div className="post-who">
          <div className="post-name">
            {anon ? (
              <>
                <strong>Anonymous</strong> <span className="muted">· identity hidden</span>
              </>
            ) : (
              <strong>{name}</strong>
            )}
          </div>
          <div className="meta">
            {ago(r.ts, now)} · {locText(r)}
          </div>
        </div>
        <StatusBadge status={r.status} />
      </header>

      <div className="post-body">
        <div className="post-title">
          <TypePill type={r.type} />
          <span>
            <span aria-hidden>{emojiFor(r.species)} </span>
            <strong>{r.species}</strong>
          </span>
        </div>
        {cond && <p className="post-cond">Conditions: {cond}</p>}
      </div>

      {r.photo && (
        <div className="photo-ph" role="img" aria-label="Photo attached (placeholder)">
          <span className="photo-emoji" aria-hidden>
            {emojiFor(r.species)}
          </span>
          <span className="photo-cap">Photo attached (placeholder)</span>
        </div>
      )}

      <div className="post-actions">
        <button
          className={`act${r.liked ? ' act-liked' : ''}`}
          aria-pressed={r.liked}
          aria-label={`Like, ${r.likes} likes`}
          onClick={() => toggleLike(r.id)}
        >
          <span aria-hidden>{r.liked ? '♥' : '♡'}</span> {r.likes}
        </button>
        <button
          className="act"
          aria-expanded={open}
          aria-controls={threadId}
          aria-label={`Comments, ${r.thread.length}`}
          onClick={() => setOpen((o) => !o)}
        >
          <span aria-hidden>💬</span> {r.thread.length}
        </button>
        <button className="act" onClick={() => ui.openShare(r)}>
          <span aria-hidden>↗</span> Share
        </button>
      </div>

      {open && (
        <div className="thread" id={threadId}>
          {r.thread.length > 0 && (
            <ul className="comments">
              {r.thread.map((c) => {
                const cName = displayName(c.name, c.mine);
                return (
                  <li key={c.id} className="comment">
                    <Avatar name={cName} anon={isAnon(c.name) && !c.mine} />
                    <div className="comment-body">
                      <div className="comment-meta">
                        <strong>{cName}</strong> <span className="muted">· {ago(c.ts, now)}</span>
                        {role === 'reporter' && !c.mine && !c.flagged && (
                          <button
                            className="link-btn"
                            onClick={() => {
                              flagComment(r.id, c.id);
                              ui.toast('Thanks. An admin will review this comment (simulated).');
                            }}
                          >
                            Report
                          </button>
                        )}
                        {role === 'admin' && (
                          <button
                            className="link-btn link-danger"
                            onClick={() => {
                              removeComment(r.id, c.id);
                              ui.toast('Comment removed (admin).');
                            }}
                          >
                            Remove
                          </button>
                        )}
                      </div>
                      {/* Plain text only: React escapes it, never rendered as HTML. */}
                      <p className={c.flagged && role !== 'admin' ? 'comment-text flagged' : 'comment-text'}>
                        {c.flagged && role !== 'admin'
                          ? 'This comment was reported and is hidden while an admin reviews it (simulated).'
                          : c.text}
                        {c.flagged && role === 'admin' && <span className="flag-tag"> · reported</span>}
                      </p>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
          <div className="composer">
            <input
              ref={inputRef}
              className="input"
              type="text"
              placeholder="Add a comment"
              aria-label="Add a comment"
              maxLength={280}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={onKey}
            />
            <button className="btn btn-primary btn-sm" onClick={post}>
              Post
            </button>
          </div>
          <p className="fine">Earlier comments in this demo are invented. Be kind: comments are moderated by admins.</p>
        </div>
      )}
    </article>
  );
});
