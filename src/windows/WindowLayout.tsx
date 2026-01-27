import { ReactNode, useEffect, useMemo, useState } from 'react';
import { cn } from '@/lib/utils';
import { useIsMobile } from '@/hooks/use-mobile';
import { WindowId, getWindowDefinition } from './windowRegistry';

type LayoutMode = 'single' | 'twoColumns' | 'threeColumns' | 'twoColumnsStackedRight' | 'mobileTabs';

interface WindowLayoutProps {
  visibleWindows: WindowId[];
  children: (windowId: WindowId) => ReactNode;
  className?: string;
}

function computeLayoutMode(visibleWindows: WindowId[], isMobile: boolean, width: number): LayoutMode {
  if (isMobile || width < 1000) return 'mobileTabs';
  if (visibleWindows.length === 1) return 'single';
  if (visibleWindows.length === 2) return 'twoColumns';
  if (visibleWindows.length === 3) return width >= 1400 ? 'threeColumns' : 'twoColumnsStackedRight';
  return 'single';
}

export default function WindowLayout({ visibleWindows, children, className }: WindowLayoutProps) {
  const isMobile = useIsMobile();
  const [windowWidth, setWindowWidth] = useState(typeof window !== 'undefined' ? window.innerWidth : 1400);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const layoutMode = useMemo(
    () => computeLayoutMode(visibleWindows, isMobile, windowWidth),
    [visibleWindows, isMobile, windowWidth]
  );

  // Mobile tab state (must be top-level hooks)
  const [activeTab, setActiveTab] = useState<WindowId>(() => visibleWindows[0] || 'inbox');
  useEffect(() => {
    if (!visibleWindows.includes(activeTab) && visibleWindows.length > 0) {
      setActiveTab(visibleWindows[0]);
    }
  }, [visibleWindows, activeTab]);
  const displayTab = visibleWindows.includes(activeTab) ? activeTab : visibleWindows[0];

  if (layoutMode === 'single' && visibleWindows.length === 1) {
    return <div className={cn('h-full min-h-0', className)}>{children(visibleWindows[0])}</div>;
  }

  if (layoutMode === 'twoColumns' && visibleWindows.length === 2) {
    return (
      <div className={cn('h-full grid grid-cols-2 gap-4 min-h-0', className)}>
        {visibleWindows.map((id) => (
          <div key={id} className="min-w-0 min-h-0">
            {children(id)}
          </div>
        ))}
      </div>
    );
  }

  if (layoutMode === 'threeColumns' && visibleWindows.length === 3) {
    return (
      <div className={cn('h-full grid grid-cols-3 gap-4 min-h-0', className)}>
        {visibleWindows.map((id) => (
          <div key={id} className="min-w-0 min-h-0">
            {children(id)}
          </div>
        ))}
      </div>
    );
  }

  if (layoutMode === 'twoColumnsStackedRight' && visibleWindows.length === 3) {
    const left = visibleWindows.includes('inbox') ? 'inbox' : visibleWindows[0];
    const right = visibleWindows.filter((w) => w !== left);
    return (
      <div className={cn('h-full grid grid-cols-2 gap-4 min-h-0', className)}>
        <div className="min-w-0 min-h-0">{children(left)}</div>
        <div className="min-w-0 min-h-0 grid grid-rows-2 gap-4">
          {right.map((id) => (
            <div key={id} className="min-w-0 min-h-0">
              {children(id)}
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (layoutMode === 'mobileTabs') {
    return (
      <div className={cn('h-full flex flex-col min-h-0', className)}>
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
        <div className="flex-1 overflow-hidden min-h-0">{children(displayTab)}</div>
      </div>
    );
  }

  // Fallback: stacked column
  return (
    <div className={cn('h-full flex flex-col gap-4 min-h-0', className)}>
      {visibleWindows.map((id) => (
        <div key={id} className="min-w-0 flex-1 min-h-0">
          {children(id)}
        </div>
      ))}
    </div>
  );
}

