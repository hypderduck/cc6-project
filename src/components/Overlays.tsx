'use client';

import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useUI } from './UIProvider';
import { copyText, shareLink, shareText, telegramUrl, whatsappUrl } from '@/lib/share';

export function Toast() {
  const { toastMsg } = useUI();
  return (
    <div className="toast-region" role="status" aria-live="polite">
      {toastMsg && (
        <div key={toastMsg.key} className="toast">
          {toastMsg.text}
        </div>
      )}
    </div>
  );
}

export function HotspotAlert() {
  const { alert, hideAlert } = useUI();
  if (!alert) return null;
  return (
    <div key={alert.key} className="hs-alert" role="alert">
      <div className="hs-alert-icon" aria-hidden>
        ⚠
      </div>
      <div className="hs-alert-text">
        <strong>{alert.title}</strong>
        <span>{alert.body}</span>
      </div>
      <button className="hs-alert-close" onClick={hideAlert} aria-label="Dismiss alert">
        ×
      </button>
    </div>
  );
}

export function ShareSheet() {
  const { share, closeShare, toast } = useUI();
  const copyRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!share) return;
    copyRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        closeShare();
      }
      if (e.key === 'Tab' && dialogRef.current) {
        const els = dialogRef.current.querySelectorAll<HTMLElement>('button, a[href]');
        if (!els.length) return;
        const first = els[0];
        const last = els[els.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [share, closeShare]);

  if (!share) return null;
  const canNative = typeof navigator.share === 'function';
  const text = shareText(share);
  const link = shareLink(share);

  const doCopy = async () => {
    const ok = await copyText(`${text} ${link}`);
    closeShare();
    toast(ok ? 'Copied to clipboard.' : 'Could not copy. Select the text and copy it manually.');
  };

  const doNative = async () => {
    try {
      await navigator.share({ title: 'Wildwatch NTU', text, url: link });
    } catch {
      /* user cancelled */
    }
  };

  return (
    <div className="sheet-wrap">
      <div className="scrim" onClick={closeShare} aria-hidden />
      <div className="sheet" role="dialog" aria-modal="true" aria-labelledby="share-title" ref={dialogRef}>
        <h2 id="share-title" className="sheet-title">
          Share this report
        </h2>
        <div className="share-preview">
          <p>{text}</p>
          <p className="share-link">{link}</p>
        </div>
        <div className="share-grid">
          <button ref={copyRef} className="btn btn-primary" onClick={doCopy}>
            Copy
          </button>
          <a className="btn btn-ghost" href={telegramUrl(share)} target="_blank" rel="noopener noreferrer">
            Telegram
          </a>
          <a className="btn btn-ghost" href={whatsappUrl(share)} target="_blank" rel="noopener noreferrer">
            WhatsApp
          </a>
          {canNative && (
            <button className="btn btn-ghost" onClick={doNative}>
              More apps
            </button>
          )}
        </div>
        <p className="fine">
          Shares the type, species and general area only. Never the reporter&apos;s name, and never an exact spot for
          protected species. Prototype link, not live.
        </p>
        <button className="btn btn-ghost btn-block" onClick={closeShare}>
          Close
        </button>
      </div>
    </div>
  );
}

export function Tooltip() {
  const { tip } = useUI();
  const ref = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ left: number; top: number } | null>(null);

  useLayoutEffect(() => {
    if (!tip || !ref.current) {
      setPos(null);
      return;
    }
    const el = ref.current.getBoundingClientRect();
    const pad = 8;
    let left = tip.x - el.width / 2;
    left = Math.max(pad, Math.min(window.innerWidth - el.width - pad, left));
    let top = tip.y - el.height - 10;
    if (top < pad) top = tip.y + 28;
    setPos({ left, top });
  }, [tip]);

  if (!tip) return null;
  return (
    <div
      ref={ref}
      className="tooltip"
      role="tooltip"
      style={pos ? { left: pos.left, top: pos.top } : { left: -9999, top: -9999 }}
    >
      {tip.content}
    </div>
  );
}
