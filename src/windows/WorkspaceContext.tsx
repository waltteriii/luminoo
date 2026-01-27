import { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import type { Layouts } from 'react-grid-layout';
import type { WindowId } from './windowRegistry';
import { useWindowStateContext } from './useWindowState';
import { supabase } from '@/integrations/supabase/client';
import {
  BUILTIN_TEMPLATES,
  BuiltinTemplateId,
  WorkspaceData,
  SavedWorkspace,
  activeTabStorageKey,
  currentLayoutStorageKey,
  ensureVisibleInLayouts,
  lastGoodStorageKey,
  lockStorageKey,
  makeTemplateData,
  normalizeVisibleWindows,
  safeParseJson,
  templateName,
  workspacesStorageKey,
} from './workspaces';

type WorkspaceContextValue = {
  userKey: string;
  // Current working layout state
  layouts: Layouts;
  setLayouts: (next: Layouts) => void;
  activeTab: WindowId;
  setActiveTab: (id: WindowId) => void;
  locked: boolean;
  setLocked: (locked: boolean) => void;

  // Templates + named workspaces
  templates: Array<{ id: BuiltinTemplateId; name: string }>;
  saved: SavedWorkspace[];

  applyTemplate: (id: BuiltinTemplateId) => void;
  applySaved: (id: string) => void;
  saveCurrent: (name: string) => void;
  renameSaved: (id: string, name: string) => void;
  deleteSaved: (id: string) => void;

  restoreLastGood: () => void;
  hasLastGood: boolean;
};

const WorkspaceContext = createContext<WorkspaceContextValue | null>(null);

function nowMs() {
  return Date.now();
}

function newId() {
  // Good enough for localStorage IDs.
  return `ws_${Math.random().toString(36).slice(2)}_${Date.now().toString(36)}`;
}

export function WorkspaceProvider({ userKey, children }: { userKey: string; children: ReactNode }) {
  const { visibleWindows, setVisibleWindows } = useWindowStateContext();
  const isAnonymous = userKey === 'anonymous';

  const layoutKey = useMemo(() => currentLayoutStorageKey(userKey), [userKey]);
  const savedKey = useMemo(() => workspacesStorageKey(userKey), [userKey]);
  const lastGoodKey = useMemo(() => lastGoodStorageKey(userKey), [userKey]);
  const lockKey = useMemo(() => lockStorageKey(userKey), [userKey]);
  const tabKey = useMemo(() => activeTabStorageKey(userKey), [userKey]);

  const templates = useMemo(
    () => BUILTIN_TEMPLATES.map((id) => ({ id, name: templateName(id) })),
    []
  );

  const [layouts, setLayoutsState] = useState<Layouts>(() => {
    const stored = typeof window === 'undefined' ? null : safeParseJson<Layouts>(localStorage.getItem(layoutKey));
    return stored ?? makeTemplateData('classic-2x2').layouts;
  });

  const [activeTab, setActiveTabState] = useState<WindowId>(() => {
    const stored = typeof window === 'undefined' ? null : safeParseJson<WindowId>(localStorage.getItem(tabKey));
    return stored ?? 'inbox';
  });

  const [locked, setLockedState] = useState<boolean>(() => {
    const stored = typeof window === 'undefined' ? null : safeParseJson<boolean>(localStorage.getItem(lockKey));
    return stored ?? false;
  });

  const [saved, setSaved] = useState<SavedWorkspace[]>(() => {
    const stored = typeof window === 'undefined' ? null : safeParseJson<SavedWorkspace[]>(localStorage.getItem(savedKey));
    return Array.isArray(stored) ? stored : [];
  });

  const [hasLastGood, setHasLastGood] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return !!localStorage.getItem(lastGoodKey);
  });

  // Supabase-backed persistence (preferred when authenticated), with localStorage fallback.
  // This is intentionally best-effort: if the column doesn't exist or RLS blocks it, we silently fall back.
  const didHydrateRef = useRef(false);
  const suppressRemoteWriteRef = useRef(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (isAnonymous) return;

    let cancelled = false;
    (async () => {
      try {
        const { data, error } = await supabase
          .from('profiles')
          // column may not exist; best-effort only
          .select('workspace_state')
          .eq('id', userKey)
          .maybeSingle();

        if (cancelled) return;
        if (error || !data) return;
        const raw = (data as unknown as { workspace_state?: unknown }).workspace_state;
        if (!raw || typeof raw !== 'object') return;

        const ws = raw as Partial<{
          layouts: Layouts;
          saved: SavedWorkspace[];
          lastGood: WorkspaceData;
          locked: boolean;
          activeTab: WindowId;
          visibleWindows: WindowId[];
        }>;

        suppressRemoteWriteRef.current = true;
        if (ws.visibleWindows && Array.isArray(ws.visibleWindows)) {
          setVisibleWindows(ws.visibleWindows);
        }
        if (ws.layouts) setLayoutsState(ws.layouts);
        if (ws.activeTab) setActiveTabState(ws.activeTab);
        if (typeof ws.locked === 'boolean') setLockedState(ws.locked);
        if (ws.saved && Array.isArray(ws.saved)) setSaved(ws.saved);
        if (ws.lastGood) {
          try {
            localStorage.setItem(lastGoodKey, JSON.stringify(ws.lastGood));
            setHasLastGood(true);
          } catch {
            // ignore
          }
        }

        didHydrateRef.current = true;
      } finally {
        // allow remote writes after initial hydration pass
        setTimeout(() => {
          suppressRemoteWriteRef.current = false;
        }, 500);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [isAnonymous, lastGoodKey, setVisibleWindows, userKey]);

  // Keep layouts compatible with window visibility changes.
  useEffect(() => {
    setLayoutsState((prev) => ensureVisibleInLayouts(prev, visibleWindows));
    setActiveTabState((prev) => {
      const normalized = normalizeVisibleWindows(visibleWindows);
      return normalized.includes(prev) ? prev : normalized[0] ?? 'inbox';
    });
  }, [visibleWindows]);

  // Keep current layouts synced with current-layout storage (back-compat with existing persistence).
  useEffect(() => {
    try {
      localStorage.setItem(layoutKey, JSON.stringify(layouts));
    } catch {
      // ignore
    }
  }, [layoutKey, layouts]);

  useEffect(() => {
    try {
      localStorage.setItem(tabKey, JSON.stringify(activeTab));
    } catch {
      // ignore
    }
  }, [tabKey, activeTab]);

  useEffect(() => {
    try {
      localStorage.setItem(lockKey, JSON.stringify(locked));
    } catch {
      // ignore
    }
  }, [lockKey, locked]);

  useEffect(() => {
    try {
      localStorage.setItem(savedKey, JSON.stringify(saved));
    } catch {
      // ignore
    }
  }, [savedKey, saved]);

  // Persist to Supabase (debounced) when authenticated.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (isAnonymous) return;
    if (suppressRemoteWriteRef.current) return;

    const handle = window.setTimeout(async () => {
      try {
        const payload = {
          layouts,
          saved,
          locked,
          activeTab,
          visibleWindows,
          lastGood: safeParseJson<WorkspaceData>(localStorage.getItem(lastGoodKey)) ?? null,
        };
        await supabase
          .from('profiles')
          .upsert({ id: userKey, workspace_state: payload } as unknown as Record<string, unknown>, { onConflict: 'id' });
      } catch {
        // ignore
      }
    }, 800);

    return () => window.clearTimeout(handle);
  }, [activeTab, isAnonymous, layouts, lastGoodKey, locked, saved, userKey, visibleWindows]);

  const setLayouts = useCallback((next: Layouts) => setLayoutsState(next), []);
  const setActiveTab = useCallback((id: WindowId) => setActiveTabState(id), []);
  const setLocked = useCallback((v: boolean) => setLockedState(v), []);

  const snapshotCurrent = useCallback((): WorkspaceData => {
    const normalized = normalizeVisibleWindows(visibleWindows);
    const tab = normalized.includes(activeTab) ? activeTab : normalized[0] ?? 'inbox';
    return { version: 1, layouts, visibleWindows: normalized, activeTab: tab, locked };
  }, [activeTab, layouts, locked, visibleWindows]);

  const writeLastGood = useCallback(
    (data: WorkspaceData) => {
      try {
        localStorage.setItem(lastGoodKey, JSON.stringify(data));
        setHasLastGood(true);
      } catch {
        // ignore
      }
    },
    [lastGoodKey]
  );

  const applyWorkspaceData = useCallback(
    (data: WorkspaceData) => {
      const normalized = normalizeVisibleWindows(data.visibleWindows);
      setVisibleWindows(normalized);
      setLayoutsState(data.layouts);
      setActiveTabState(normalized.includes(data.activeTab) ? data.activeTab : normalized[0] ?? 'inbox');
      setLockedState(!!data.locked);
    },
    [setVisibleWindows]
  );

  const applyTemplate = useCallback(
    (id: BuiltinTemplateId) => {
      const data = makeTemplateData(id);
      writeLastGood(snapshotCurrent());
      applyWorkspaceData(data);
    },
    [applyWorkspaceData, snapshotCurrent, writeLastGood]
  );

  const applySaved = useCallback(
    (id: string) => {
      const ws = saved.find((w) => w.id === id);
      if (!ws) return;
      writeLastGood(snapshotCurrent());
      applyWorkspaceData(ws.data);
    },
    [applyWorkspaceData, saved, snapshotCurrent, writeLastGood]
  );

  const saveCurrent = useCallback(
    (name: string) => {
      const trimmed = name.trim();
      if (!trimmed) return;
      const data = snapshotCurrent();
      const t = nowMs();
      const next: SavedWorkspace = { id: newId(), name: trimmed, createdAt: t, updatedAt: t, data };
      setSaved((prev) => [next, ...prev]);
      writeLastGood(data);
    },
    [snapshotCurrent, writeLastGood]
  );

  const renameSaved = useCallback((id: string, name: string) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    setSaved((prev) =>
      prev.map((w) => (w.id === id ? { ...w, name: trimmed, updatedAt: nowMs() } : w))
    );
  }, []);

  const deleteSaved = useCallback((id: string) => {
    setSaved((prev) => prev.filter((w) => w.id !== id));
  }, []);

  const restoreLastGood = useCallback(() => {
    const stored = safeParseJson<WorkspaceData>(localStorage.getItem(lastGoodKey));
    if (!stored) return;
    applyWorkspaceData(stored);
  }, [applyWorkspaceData, lastGoodKey]);

  const value: WorkspaceContextValue = {
    userKey,
    layouts,
    setLayouts,
    activeTab,
    setActiveTab,
    locked,
    setLocked,
    templates,
    saved,
    applyTemplate,
    applySaved,
    saveCurrent,
    renameSaved,
    deleteSaved,
    restoreLastGood,
    hasLastGood,
  };

  return <WorkspaceContext.Provider value={value}>{children}</WorkspaceContext.Provider>;
}

export function useWorkspace() {
  const ctx = useContext(WorkspaceContext);
  if (!ctx) throw new Error('useWorkspace must be used within WorkspaceProvider');
  return ctx;
}

