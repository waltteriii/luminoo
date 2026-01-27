import { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { WindowId, WINDOW_REGISTRY } from './windowRegistry';

const STORAGE_KEY = 'ui.windows.visible';
const DEFAULT_VISIBLE: WindowId[] = ['inbox', 'calendar'];

export type WindowStateValue = {
  visibleWindows: WindowId[];
  toggleWindow: (windowId: WindowId) => void;
  setWindowVisible: (windowId: WindowId, visible: boolean) => void;
  isWindowVisible: (windowId: WindowId) => boolean;
};

export function useWindowState(): WindowStateValue {
  const validIds = useMemo(() => new Set<WindowId>(Object.keys(WINDOW_REGISTRY) as WindowId[]), []);

  const [visibleWindows, setVisibleWindows] = useState<WindowId[]>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as unknown;
        if (Array.isArray(parsed)) {
          const valid = parsed.filter((id): id is WindowId => typeof id === 'string' && validIds.has(id as WindowId));
          if (valid.length > 0) return valid;
        }
      }
    } catch {
      // ignore
    }
    return DEFAULT_VISIBLE;
  });

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(visibleWindows));
    } catch {
      // ignore
    }
  }, [visibleWindows]);

  const toggleWindow = useCallback((windowId: WindowId) => {
    setVisibleWindows((prev) => {
      if (prev.includes(windowId)) {
        if (prev.length === 1) return prev; // keep at least one visible
        return prev.filter((id) => id !== windowId);
      }
      return [...prev, windowId];
    });
  }, []);

  const setWindowVisible = useCallback((windowId: WindowId, visible: boolean) => {
    setVisibleWindows((prev) => {
      if (visible) {
        if (prev.includes(windowId)) return prev;
        return [...prev, windowId];
      }
      if (prev.length === 1 && prev[0] === windowId) return prev; // keep at least one visible
      return prev.filter((id) => id !== windowId);
    });
  }, []);

  const isWindowVisible = useCallback((windowId: WindowId) => visibleWindows.includes(windowId), [visibleWindows]);

  return { visibleWindows, toggleWindow, setWindowVisible, isWindowVisible };
}

const WindowStateContext = createContext<WindowStateValue | null>(null);

export function WindowStateProvider({ children }: { children: ReactNode }) {
  const value = useWindowState();
  return <WindowStateContext.Provider value={value}>{children}</WindowStateContext.Provider>;
}

export function useWindowStateContext(): WindowStateValue {
  const ctx = useContext(WindowStateContext);
  if (!ctx) {
    throw new Error('useWindowStateContext must be used within WindowStateProvider');
  }
  return ctx;
}

