'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Nav } from './Nav';
import { HotspotAlert, ShareSheet, Toast, Tooltip } from './Overlays';
import { PlusIcon } from './Icons';
import { load, save } from '@/lib/storage';

export function Shell({ children }: { children: ReactNode }) {
  const path = usePathname();
  const mainRef = useRef<HTMLElement>(null);
  const [phone, setPhone] = useState(false);

  useEffect(() => {
    // Restore the saved preview size after hydration (storage is client-only).
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPhone(load('ww.phonePreview', false));
  }, []);

  useEffect(() => {
    mainRef.current?.scrollTo({ top: 0 });
  }, [path]);

  const togglePreview = (v: boolean) => {
    setPhone(v);
    save('ww.phonePreview', v);
  };

  const showFab = path === '/' || path === '/news';

  return (
    <>
      <div className="demo-bar">
        <span>
          <strong>Wildwatch NTU</strong> · click-through prototype · all data is mock
        </span>
        <div className="seg seg-dark" role="group" aria-label="Preview size">
          <button aria-pressed={!phone} onClick={() => togglePreview(false)}>
            Responsive
          </button>
          <button aria-pressed={phone} onClick={() => togglePreview(true)}>
            Phone preview
          </button>
        </div>
      </div>
      <div className="stage">
        <div className={`frame${phone ? ' frame-phone' : ''}`}>
          <div className="shell">
            <Nav />
            <div className="main-col">
              <main className="scroller" ref={mainRef} id="main">
                {children}
              </main>
              {showFab && (
                <Link href="/report" className="fab">
                  <PlusIcon />
                  <span>Report</span>
                </Link>
              )}
            </div>
          </div>
          <HotspotAlert />
          <Toast />
          <ShareSheet />
        </div>
      </div>
      <Tooltip />
    </>
  );
}
