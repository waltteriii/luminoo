import { ReactNode, useMemo, useRef, useState } from 'react';
import { cn } from '@/lib/utils';
import { WindowId, getWindowDefinition } from './windowRegistry';
import { useContainerSize } from '@/hooks/useContainerSize';
import { WindowLayoutProvider, type LayoutTier } from './WindowLayoutContext';
import { Responsive, type Layouts, type Layout } from 'react-grid-layout';
import { useWorkspace } from './WorkspaceContext';
import { WORKSPACE_BREAKPOINTS, WORKSPACE_COLS } from './workspaces';

interface WindowLayoutProps {
  visibleWindows: WindowId[];
  children: (windowId: WindowId) => ReactNode;
  className?: string;
}

function computeLayoutTier(width: number): LayoutTier {
  if (width > 0 && width < 900) return 'narrow';
  if (width > 0 && width < 1200) return 'medium';
  return 'wide';
}

const breakpoints = WORKSPACE_BREAKPOINTS;
const cols = WORKSPACE_COLS;

export default function WindowLayout({ visibleWindows, children, className }: WindowLayoutProps) {
  const { ref, width, height } = useContainerSize<HTMLDivElement>();
  const tier = useMemo(() => computeLayoutTier(width), [width]);
  const [currentBreakpoint, setCurrentBreakpoint] = useState<keyof typeof breakpoints>('lg');
  const [dockPreview, setDockPreview] = useState<{
    draggingId: string;
    targetId: string;
    zone: 'left' | 'right' | 'top' | 'bottom' | 'tab';
    rect: { left: number; top: number; width: number; height: number };
  } | null>(null);

  const { layouts, setLayouts, activeTab, setActiveTab, locked } = useWorkspace();
  const displayTab = visibleWindows.includes(activeTab) ? activeTab : visibleWindows[0];

  const persistLayouts = (next: Layouts) => {
    setLayouts(next);
  };

  const applyDock = (all: Layouts, bp: keyof typeof breakpoints, draggingId: string, targetId: string, zone: 'left' | 'right' | 'top' | 'bottom' | 'tab') => {
    const current = (all[bp] ?? []) as Layout[];
    const dIdx = current.findIndex((l) => l.i === draggingId);
    const tIdx = current.findIndex((l) => l.i === targetId);
    if (dIdx === -1 || tIdx === -1) return all;

    const nextLayouts: Layouts = { ...all };
    const next = current.map((l) => ({ ...l }));
    const d = next[dIdx];
    const t = next[tIdx];

    if (zone === 'tab') {
      // MVP "tab dock": swap positions/sizes (true tab-stacking is planned for later).
      const tmp = { x: d.x, y: d.y, w: d.w, h: d.h };
      d.x = t.x; d.y = t.y; d.w = t.w; d.h = t.h;
      t.x = tmp.x; t.y = tmp.y; t.w = tmp.w; t.h = tmp.h;
      nextLayouts[bp] = next;
      return nextLayouts;
    }

    if (zone === 'left' || zone === 'right') {
      if (t.w < 4) return all;
      const splitW = Math.max(d.minW ?? 2, Math.floor(t.w / 2));
      const otherW = t.w - splitW;
      if (otherW < (t.minW ?? 2)) return all;

      d.y = t.y;
      d.h = t.h;
      d.w = splitW;
      t.w = otherW;

      if (zone === 'left') {
        d.x = t.x;
        t.x = t.x + splitW;
      } else {
        d.x = t.x + otherW;
      }

      nextLayouts[bp] = next;
      return nextLayouts;
    }

    // top/bottom
    if (t.h < 8) return all;
    const splitH = Math.max(d.minH ?? 6, Math.floor(t.h / 2));
    const otherH = t.h - splitH;
    if (otherH < (t.minH ?? 6)) return all;

    d.x = t.x;
    d.w = t.w;
    d.h = splitH;
    t.h = otherH;

    if (zone === 'top') {
      d.y = t.y;
      t.y = t.y + splitH;
    } else {
      d.y = t.y + otherH;
    }

    nextLayouts[bp] = next;
    return nextLayouts;
  };

  const computeDockPreview = (draggingId: string, clientX: number, clientY: number) => {
    const el = document.elementFromPoint(clientX, clientY);
    const target = el?.closest?.('[data-window-id]') as HTMLElement | null;
    if (!target) return null;
    const targetId = target.getAttribute('data-window-id');
    if (!targetId || targetId === draggingId) return null;

    const r = target.getBoundingClientRect();
    const relX = (clientX - r.left) / r.width;
    const relY = (clientY - r.top) / r.height;
    const edge = 0.25;

    let zone: 'left' | 'right' | 'top' | 'bottom' | 'tab' = 'tab';
    if (relX <= edge) zone = 'left';
    else if (relX >= 1 - edge) zone = 'right';
    else if (relY <= edge) zone = 'top';
    else if (relY >= 1 - edge) zone = 'bottom';
    else zone = 'tab';

    return { draggingId, targetId, zone, rect: { left: r.left, top: r.top, width: r.width, height: r.height } };
  };

  // Throttle dock-preview updates to avoid flashing (rAF).
  const rafIdRef = useRef<number | null>(null);
  const pendingRef = useRef<{ draggingId: string; x: number; y: number } | null>(null);
  const scheduleDockPreview = (draggingId: string, clientX: number, clientY: number) => {
    pendingRef.current = { draggingId, x: clientX, y: clientY };
    if (rafIdRef.current != null) return;
    rafIdRef.current = window.requestAnimationFrame(() => {
      rafIdRef.current = null;
      const p = pendingRef.current;
      pendingRef.current = null;
      if (!p) return;
      setDockPreview(computeDockPreview(p.draggingId, p.x, p.y));
    });
  };

  if (tier === 'narrow') {
    return (
      <div ref={ref} className={cn('h-full flex flex-col min-w-0 min-h-0', className)}>
        <WindowLayoutProvider value={{ tier, width, height }}>
          {visibleWindows.length > 1 && (
            <div className="flex border-b border-border bg-secondary/30 flex-shrink-0">
              {visibleWindows.map((id) => (
                <button
                  key={id}
                  onClick={() => setActiveTab(id)}
                  className={cn(
                    'flex-1 px-4 py-2 text-sm font-medium transition-colors border-b-2',
                    displayTab === id
                      ? 'border-primary text-primary'
                      : 'border-transparent text-muted-foreground hover:text-foreground'
                  )}
                >
                  {getWindowDefinition(id).title}
                </button>
              ))}
            </div>
          )}
          <div className="flex-1 overflow-hidden min-w-0 min-h-0">
            <div className="h-full min-w-0 min-h-0">{children(displayTab)}</div>
          </div>
        </WindowLayoutProvider>
      </div>
    );
  }

  // Medium/Wide: dockable grid workspace (drag + resize).
  return (
    <div ref={ref} className={cn('relative h-full min-w-0 min-h-0', className)}>
      <WindowLayoutProvider value={{ tier, width, height }}>
        {dockPreview && ref.current && (
          <div className="pointer-events-none absolute inset-0">
            {(() => {
              const containerRect = ref.current!.getBoundingClientRect();
              const x = dockPreview.rect.left - containerRect.left;
              const y = dockPreview.rect.top - containerRect.top;
              const w = dockPreview.rect.width;
              const h = dockPreview.rect.height;
              return (
                <div
                  className="absolute rounded-lg"
                  style={{ left: x, top: y, width: w, height: h }}
                >
                  {/* Base outline/glow */}
                  <div
                    className="absolute inset-0 rounded-lg"
                    style={{
                      border: '1px solid rgba(59,130,246,0.55)',
                      background: 'rgba(59,130,246,0.08)',
                      boxShadow: '0 0 0 3px rgba(59,130,246,0.18)',
                    }}
                  />
                  <div
                    className={cn(
                      'absolute left-0 top-0 bottom-0 w-1/4 rounded-l-lg',
                      dockPreview.zone === 'left' && 'bg-blue-500/15'
                    )}
                  />
                  <div
                    className={cn(
                      'absolute right-0 top-0 bottom-0 w-1/4 rounded-r-lg',
                      dockPreview.zone === 'right' && 'bg-blue-500/15'
                    )}
                  />
                  <div
                    className={cn(
                      'absolute left-0 top-0 right-0 h-1/4 rounded-t-lg',
                      dockPreview.zone === 'top' && 'bg-blue-500/15'
                    )}
                  />
                  <div
                    className={cn(
                      'absolute left-0 bottom-0 right-0 h-1/4 rounded-b-lg',
                      dockPreview.zone === 'bottom' && 'bg-blue-500/15'
                    )}
                  />
                  <div
                    className={cn(
                      'absolute left-1/4 top-1/4 right-1/4 bottom-1/4 rounded-md',
                      dockPreview.zone === 'tab' && 'bg-blue-500/15'
                    )}
                  />
                </div>
              );
            })()}
          </div>
        )}
        <div className={cn(dockPreview && 'is-window-docking')}>
          <Responsive
            width={width || 1200}
            layouts={layouts}
            breakpoints={breakpoints}
            cols={cols}
            margin={[16, 16]}
            containerPadding={[0, 0]}
            rowHeight={24}
            isDraggable={!locked}
            isResizable={!locked}
            draggableHandle="[data-window-drag-handle]"
            draggableCancel=".window-content, [data-task-draggable], [data-task-handle], button, a, input, textarea, select, [role='button'], [contenteditable='true'], [data-dnd-item], [data-window-no-drag]"
            resizeHandles={['se']}
            compactType="vertical"
            onBreakpointChange={(bp) => setCurrentBreakpoint(bp as keyof typeof breakpoints)}
            onDragStart={(_layout, item, _newItem, _placeholder, e) => {
              if (locked) return;
              if (!e) return;
              scheduleDockPreview(item.i, (e as MouseEvent).clientX, (e as MouseEvent).clientY);
            }}
            onDrag={(_layout, item, _newItem, _placeholder, e) => {
              if (locked) return;
              if (!e) return;
              scheduleDockPreview(item.i, (e as MouseEvent).clientX, (e as MouseEvent).clientY);
            }}
            onDragStop={(_layout, item, _newItem, _placeholder, e) => {
              if (locked) return;
              if (!e) return;
              const preview = computeDockPreview(item.i, (e as MouseEvent).clientX, (e as MouseEvent).clientY);
              setDockPreview(null);
              if (!preview) return;
              const next = applyDock(layouts, currentBreakpoint, preview.draggingId, preview.targetId, preview.zone);
              if (next !== layouts) persistLayouts(next);
            }}
            onLayoutChange={(_current, all) => !locked && persistLayouts(all)}
          >
            {visibleWindows.map((id) => (
              <div key={id} data-window-id={id} className="h-full min-w-0 min-h-0">
                {children(id)}
              </div>
            ))}
          </Responsive>
        </div>
      </WindowLayoutProvider>
    </div>
  );
}

