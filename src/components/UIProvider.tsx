'use client';

import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from 'react';
import type { Report } from '@/lib/types';

export interface AlertMsg {
  title: string;
  body: string;
}

export interface TipState {
  content: ReactNode;
  x: number; // anchor centre, client coords
  y: number; // anchor top, client coords
}

interface UI {
  toast: (msg: string) => void;
  toastMsg: { text: string; key: number } | null;
  showAlert: (a: AlertMsg) => void;
  hideAlert: () => void;
  alert: (AlertMsg & { key: number }) | null;
  share: Report | null;
  openShare: (r: Report) => void;
  closeShare: () => void;
  tip: TipState | null;
  showTip: (content: ReactNode, anchor: Element | DOMRect) => void;
  hideTip: () => void;
}

const Ctx = createContext<UI | null>(null);

export const useUI = () => {
  const ui = useContext(Ctx);
  if (!ui) throw new Error('useUI must be used inside <UIProvider>');
  return ui;
};

export function UIProvider({ children }: { children: ReactNode }) {
  const [toastMsg, setToastMsg] = useState<UI['toastMsg']>(null);
  const [alert, setAlert] = useState<UI['alert']>(null);
  const [share, setShare] = useState<Report | null>(null);
  const [tip, setTip] = useState<TipState | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const alertTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const shareReturn = useRef<HTMLElement | null>(null);

  const toast = useCallback((text: string) => {
    clearTimeout(toastTimer.current);
    setToastMsg({ text, key: Date.now() });
    toastTimer.current = setTimeout(() => setToastMsg(null), 3000);
  }, []);

  const hideAlert = useCallback(() => {
    clearTimeout(alertTimer.current);
    setAlert(null);
  }, []);

  const showAlert = useCallback((a: AlertMsg) => {
    clearTimeout(alertTimer.current);
    setAlert({ ...a, key: Date.now() });
    alertTimer.current = setTimeout(() => setAlert(null), 8000);
  }, []);

  const openShare = useCallback((r: Report) => {
    shareReturn.current = document.activeElement as HTMLElement | null;
    setShare(r);
  }, []);

  const closeShare = useCallback(() => {
    setShare(null);
    const el = shareReturn.current;
    requestAnimationFrame(() => el?.focus?.());
  }, []);

  const showTip = useCallback((content: ReactNode, anchor: Element | DOMRect) => {
    const rect = anchor instanceof Element ? anchor.getBoundingClientRect() : anchor;
    setTip({ content, x: rect.left + rect.width / 2, y: rect.top });
  }, []);

  const hideTip = useCallback(() => setTip(null), []);

  const value = useMemo(
    () => ({ toast, toastMsg, showAlert, hideAlert, alert, share, openShare, closeShare, tip, showTip, hideTip }),
    [toast, toastMsg, showAlert, hideAlert, alert, share, openShare, closeShare, tip, showTip, hideTip],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
