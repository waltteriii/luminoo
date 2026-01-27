import type { Layout, Layouts } from 'react-grid-layout';
import type { WindowId } from './windowRegistry';

export const WORKSPACE_SCHEMA_VERSION = 1;
export const CURRENT_LAYOUT_STORAGE_VERSION = 1;

export const WORKSPACE_BREAKPOINTS = { lg: 1200, md: 900, sm: 600, xs: 0 } as const;
export const WORKSPACE_COLS = { lg: 12, md: 10, sm: 6, xs: 4 } as const;

export type BuiltinTemplateId =
  | 'focus'
  | 'capture'
  | 'plan'
  | 'minimal'
  // Back-compat (older IDs may still appear in UI/storage during a session)
  | 'classic-2x2'
  | 'focus-calendar'
  | 'capture-mode'
  | 'mobile-stack';

export type WorkspaceData = {
  version: typeof WORKSPACE_SCHEMA_VERSION;
  // Grid layouts for responsive breakpoints (used in medium/wide).
  layouts: Layouts;
  // Visible windows (also defines mobile tab order).
  visibleWindows: WindowId[];
  // Active tab for narrow mode.
  activeTab: WindowId;
  // When locked: windows cannot move/resize (tasks still draggable).
  locked: boolean;
};

export type SavedWorkspace = {
  id: string;
  name: string;
  createdAt: number;
  updatedAt: number;
  data: WorkspaceData;
};

export function currentLayoutStorageKey(userKey: string) {
  return `ui.workspace.layout.v${CURRENT_LAYOUT_STORAGE_VERSION}.${userKey}`;
}

export function workspacesStorageKey(userKey: string) {
  return `ui.workspaces.v${WORKSPACE_SCHEMA_VERSION}.${userKey}`;
}

export function lastGoodStorageKey(userKey: string) {
  return `ui.workspaces.lastGood.v${WORKSPACE_SCHEMA_VERSION}.${userKey}`;
}

export function lockStorageKey(userKey: string) {
  return `ui.workspace.lock.v${WORKSPACE_SCHEMA_VERSION}.${userKey}`;
}

export function activeTabStorageKey(userKey: string) {
  return `ui.workspace.mobile.activeTab.v${WORKSPACE_SCHEMA_VERSION}.${userKey}`;
}

export function safeParseJson<T>(raw: string | null): T | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export function normalizeVisibleWindows(input: WindowId[]): WindowId[] {
  const order: WindowId[] = ['inbox', 'calendar', 'now', 'notes'];
  const set = new Set(input);
  const normalized = order.filter((id) => set.has(id));
  return normalized.length > 0 ? normalized : ['inbox'];
}

function layoutMin(id: WindowId): Pick<Layout, 'minW' | 'minH'> {
  if (id === 'calendar') return { minW: 4, minH: 8 };
  if (id === 'inbox') return { minW: 3, minH: 6 };
  return { minW: 2, minH: 6 };
}

export function makeTemplateData(templateId: BuiltinTemplateId): WorkspaceData {
  // Normalize legacy IDs.
  const id: BuiltinTemplateId =
    templateId === 'classic-2x2' ? 'plan' :
    templateId === 'focus-calendar' ? 'focus' :
    templateId === 'capture-mode' ? 'capture' :
    templateId === 'mobile-stack' ? 'minimal' :
    templateId;

  const visibleWindows: WindowId[] = ['inbox', 'notes', 'calendar', 'now'];
  const activeTab: WindowId = 'inbox';
  const locked = false;

  const lg: Layout[] = [];
  const md: Layout[] = [];
  const sm: Layout[] = [];
  const xs: Layout[] = [];

  const add = (arr: Layout[], l: Layout) => arr.push(l);

  if (id === 'plan') {
    // lg (12 cols): 6/6 split, each column stacked.
    add(lg, { i: 'inbox', x: 0, y: 0, w: 6, h: 8, ...layoutMin('inbox') });
    add(lg, { i: 'notes', x: 0, y: 8, w: 6, h: 8, ...layoutMin('notes') });
    add(lg, { i: 'calendar', x: 6, y: 0, w: 6, h: 10, ...layoutMin('calendar') });
    add(lg, { i: 'now', x: 6, y: 10, w: 6, h: 6, ...layoutMin('now') });

    // md (10 cols): 5/5 split
    add(md, { i: 'inbox', x: 0, y: 0, w: 5, h: 8, ...layoutMin('inbox') });
    add(md, { i: 'notes', x: 0, y: 8, w: 5, h: 8, ...layoutMin('notes') });
    add(md, { i: 'calendar', x: 5, y: 0, w: 5, h: 10, ...layoutMin('calendar') });
    add(md, { i: 'now', x: 5, y: 10, w: 5, h: 6, ...layoutMin('now') });

    // sm (6 cols): 3/3 split (still readable)
    add(sm, { i: 'inbox', x: 0, y: 0, w: 3, h: 8, ...layoutMin('inbox') });
    add(sm, { i: 'notes', x: 0, y: 8, w: 3, h: 8, ...layoutMin('notes') });
    add(sm, { i: 'calendar', x: 3, y: 0, w: 3, h: 10, ...layoutMin('calendar') });
    add(sm, { i: 'now', x: 3, y: 10, w: 3, h: 6, ...layoutMin('now') });

    // xs: stack vertically (fallback)
    add(xs, { i: 'calendar', x: 0, y: 0, w: 4, h: 10, ...layoutMin('calendar') });
    add(xs, { i: 'now', x: 0, y: 10, w: 4, h: 6, ...layoutMin('now') });
    add(xs, { i: 'inbox', x: 0, y: 16, w: 4, h: 6, ...layoutMin('inbox') });
    add(xs, { i: 'notes', x: 0, y: 22, w: 4, h: 6, ...layoutMin('notes') });
  }

  if (id === 'focus') {
    // Calendar dominates the right; left is stacked capture/focus lanes.
    add(lg, { i: 'calendar', x: 4, y: 0, w: 8, h: 16, ...layoutMin('calendar') });
    add(lg, { i: 'inbox', x: 0, y: 0, w: 4, h: 6, ...layoutMin('inbox') });
    add(lg, { i: 'now', x: 0, y: 6, w: 4, h: 5, ...layoutMin('now') });
    add(lg, { i: 'notes', x: 0, y: 11, w: 4, h: 5, ...layoutMin('notes') });

    add(md, { i: 'calendar', x: 4, y: 0, w: 6, h: 16, ...layoutMin('calendar') });
    add(md, { i: 'inbox', x: 0, y: 0, w: 4, h: 6, ...layoutMin('inbox') });
    add(md, { i: 'now', x: 0, y: 6, w: 4, h: 5, ...layoutMin('now') });
    add(md, { i: 'notes', x: 0, y: 11, w: 4, h: 5, ...layoutMin('notes') });

    // sm: calendar top, rest stacked below
    add(sm, { i: 'calendar', x: 0, y: 0, w: 6, h: 10, ...layoutMin('calendar') });
    add(sm, { i: 'inbox', x: 0, y: 10, w: 6, h: 6, ...layoutMin('inbox') });
    add(sm, { i: 'now', x: 0, y: 16, w: 6, h: 5, ...layoutMin('now') });
    add(sm, { i: 'notes', x: 0, y: 21, w: 6, h: 6, ...layoutMin('notes') });

    add(xs, { i: 'calendar', x: 0, y: 0, w: 4, h: 10, ...layoutMin('calendar') });
    add(xs, { i: 'inbox', x: 0, y: 10, w: 4, h: 6, ...layoutMin('inbox') });
    add(xs, { i: 'now', x: 0, y: 16, w: 4, h: 6, ...layoutMin('now') });
    add(xs, { i: 'notes', x: 0, y: 22, w: 4, h: 6, ...layoutMin('notes') });
  }

  if (id === 'capture') {
    // Big Inbox, medium Notes, smaller Calendar+Now lane.
    add(lg, { i: 'inbox', x: 0, y: 0, w: 6, h: 16, ...layoutMin('inbox') });
    add(lg, { i: 'notes', x: 6, y: 0, w: 3, h: 16, ...layoutMin('notes') });
    add(lg, { i: 'calendar', x: 9, y: 0, w: 3, h: 10, ...layoutMin('calendar') });
    add(lg, { i: 'now', x: 9, y: 10, w: 3, h: 6, ...layoutMin('now') });

    add(md, { i: 'inbox', x: 0, y: 0, w: 5, h: 16, ...layoutMin('inbox') });
    add(md, { i: 'notes', x: 5, y: 0, w: 3, h: 16, ...layoutMin('notes') });
    add(md, { i: 'calendar', x: 8, y: 0, w: 2, h: 10, ...layoutMin('calendar') });
    add(md, { i: 'now', x: 8, y: 10, w: 2, h: 6, ...layoutMin('now') });

    // sm: inbox+notes split, calendar+now stacked full width below
    add(sm, { i: 'inbox', x: 0, y: 0, w: 4, h: 12, ...layoutMin('inbox') });
    add(sm, { i: 'notes', x: 4, y: 0, w: 2, h: 12, ...layoutMin('notes') });
    add(sm, { i: 'calendar', x: 0, y: 12, w: 6, h: 10, ...layoutMin('calendar') });
    add(sm, { i: 'now', x: 0, y: 22, w: 6, h: 6, ...layoutMin('now') });

    add(xs, { i: 'inbox', x: 0, y: 0, w: 4, h: 10, ...layoutMin('inbox') });
    add(xs, { i: 'notes', x: 0, y: 10, w: 4, h: 8, ...layoutMin('notes') });
    add(xs, { i: 'calendar', x: 0, y: 18, w: 4, h: 10, ...layoutMin('calendar') });
    add(xs, { i: 'now', x: 0, y: 28, w: 4, h: 6, ...layoutMin('now') });
  }

  if (id === 'minimal') {
    // Minimal: calendar dominates, with a slim bottom lane for capture/focus.
    add(lg, { i: 'calendar', x: 0, y: 0, w: 12, h: 12, ...layoutMin('calendar') });
    add(lg, { i: 'inbox', x: 0, y: 12, w: 6, h: 6, ...layoutMin('inbox') });
    add(lg, { i: 'now', x: 6, y: 12, w: 3, h: 6, ...layoutMin('now') });
    add(lg, { i: 'notes', x: 9, y: 12, w: 3, h: 6, ...layoutMin('notes') });

    add(md, { i: 'calendar', x: 0, y: 0, w: 10, h: 12, ...layoutMin('calendar') });
    add(md, { i: 'inbox', x: 0, y: 12, w: 5, h: 6, ...layoutMin('inbox') });
    add(md, { i: 'now', x: 5, y: 12, w: 3, h: 6, ...layoutMin('now') });
    add(md, { i: 'notes', x: 8, y: 12, w: 2, h: 6, ...layoutMin('notes') });

    add(sm, { i: 'calendar', x: 0, y: 0, w: 6, h: 10, ...layoutMin('calendar') });
    add(sm, { i: 'inbox', x: 0, y: 10, w: 6, h: 6, ...layoutMin('inbox') });
    add(sm, { i: 'now', x: 0, y: 16, w: 6, h: 5, ...layoutMin('now') });
    add(sm, { i: 'notes', x: 0, y: 21, w: 6, h: 6, ...layoutMin('notes') });

    add(xs, { i: 'calendar', x: 0, y: 0, w: 4, h: 10, ...layoutMin('calendar') });
    add(xs, { i: 'inbox', x: 0, y: 10, w: 4, h: 6, ...layoutMin('inbox') });
    add(xs, { i: 'now', x: 0, y: 16, w: 4, h: 6, ...layoutMin('now') });
    add(xs, { i: 'notes', x: 0, y: 22, w: 4, h: 6, ...layoutMin('notes') });
  }

  return {
    version: WORKSPACE_SCHEMA_VERSION,
    layouts: { lg, md, sm, xs },
    visibleWindows,
    activeTab,
    locked,
  };
}

export function templateName(id: BuiltinTemplateId): string {
  switch (id) {
    case 'plan':
    case 'classic-2x2':
      return 'Plan';
    case 'focus':
    case 'focus-calendar':
      return 'Focus';
    case 'capture':
    case 'capture-mode':
      return 'Capture';
    case 'minimal':
    case 'mobile-stack':
      return 'Minimal';
  }
}

export const BUILTIN_TEMPLATES: BuiltinTemplateId[] = ['focus', 'capture', 'plan', 'minimal'];

export function ensureVisibleInLayouts(layouts: Layouts, visible: WindowId[]): Layouts {
  const normalized = normalizeVisibleWindows(visible);
  const defaults = makeTemplateData('classic-2x2').layouts;
  const next: Layouts = { ...layouts };

  (Object.keys(WORKSPACE_BREAKPOINTS) as Array<keyof typeof WORKSPACE_BREAKPOINTS>).forEach((bp) => {
    const current = ((next[bp] ?? []) as Layout[]).map((l) => ({ ...l }));
    const present = new Set(current.map((l) => l.i));
    const merged = [...current];
    for (const id of normalized) {
      if (!present.has(id)) {
        const def = ((defaults[bp] ?? []) as Layout[]).find((l) => l.i === id);
        if (def) merged.push({ ...def });
      }
    }
    // Keep layouts compact by dropping hidden windows.
    next[bp] = merged.filter((l) => normalized.includes(l.i as WindowId));
  });

  return next;
}

