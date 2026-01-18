import { cn } from '@/lib/utils';
import { 
  Grid3X3, 
  Calendar,
  Brain,
  TrendingUp,
  Users,
  X
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ViewMode } from '@/types';
import { useIsMobile } from '@/hooks/use-mobile';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';

interface SidebarProps {
  open: boolean;
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
  onBrainDumpClick: () => void;
  onTrendingClick: () => void;
  onFriendsClick: () => void;
  onJumpToToday: () => void;
  memoryOpen?: boolean;
  onMemoryClick?: () => void;
  onClose?: () => void;
}

// Layout modes - currently only 'grid' is enabled
const ENABLED_LAYOUTS: ViewMode[] = ['grid'];

const SidebarContent = ({ 
  viewMode, 
  onViewModeChange, 
  onBrainDumpClick,
  onTrendingClick,
  onFriendsClick,
  onJumpToToday,
  onClose
}: Omit<SidebarProps, 'open' | 'memoryOpen' | 'onMemoryClick'>) => {
  const viewModes = [
    { value: 'grid' as ViewMode, icon: <Grid3X3 className="w-4 h-4" />, label: 'Grid' },
  ].filter(mode => ENABLED_LAYOUTS.includes(mode.value));

  const handleAction = (action: () => void) => {
    action();
    onClose?.();
  };

  return (
    <div className="p-3 lg:p-4 space-y-4 lg:space-y-6">
      {/* Layout Mode - Only show if multiple layouts are enabled */}
      {viewModes.length > 1 && (
        <div className="space-y-1.5 lg:space-y-2">
          <span className="caption text-[10px] lg:text-xs">Layout</span>
          <div className="space-y-0.5 lg:space-y-1">
            {viewModes.map((mode) => (
              <Button
                key={mode.value}
                variant="ghost"
                size="sm"
                onClick={() => handleAction(() => onViewModeChange(mode.value))}
                className={cn(
                  "w-full justify-start gap-2 text-foreground-muted hover:text-foreground min-h-[36px] lg:min-h-[40px] text-xs lg:text-sm",
                  viewMode === mode.value && "bg-secondary text-foreground"
                )}
              >
                {mode.icon}
                {mode.label}
              </Button>
            ))}
          </div>
        </div>
      )}

      {/* Quick Actions */}
      <div className="space-y-1.5 lg:space-y-2">
        <span className="caption text-[10px] lg:text-xs">Quick Actions</span>
        <div className="space-y-0.5 lg:space-y-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleAction(onBrainDumpClick)}
            className="w-full justify-start gap-2 text-foreground-muted hover:text-foreground min-h-[36px] lg:min-h-[40px] text-xs lg:text-sm"
          >
            <Brain className="w-3.5 h-3.5 lg:w-4 lg:h-4" />
            Brain Dump
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleAction(onTrendingClick)}
            className="w-full justify-start gap-2 text-foreground-muted hover:text-foreground min-h-[36px] lg:min-h-[40px] text-xs lg:text-sm"
          >
            <TrendingUp className="w-3.5 h-3.5 lg:w-4 lg:h-4" />
            Trending Topics
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleAction(onFriendsClick)}
            className="w-full justify-start gap-2 text-foreground-muted hover:text-foreground min-h-[36px] lg:min-h-[40px] text-xs lg:text-sm"
          >
            <Users className="w-3.5 h-3.5 lg:w-4 lg:h-4" />
            Friends & Sharing
          </Button>
        </div>
      </div>
    </div>
  );
};

const Sidebar = ({ 
  open, 
  viewMode, 
  onViewModeChange, 
  onBrainDumpClick,
  onTrendingClick,
  onFriendsClick,
  onJumpToToday,
  memoryOpen,
  onMemoryClick,
  onClose
}: SidebarProps) => {
  const isMobile = useIsMobile();

  // Mobile: use Sheet (drawer)
  if (isMobile) {
    return (
      <Sheet open={open} onOpenChange={(isOpen) => !isOpen && onClose?.()}>
        <SheetContent side="left" className="w-72 p-0 bg-sidebar">
          <SheetHeader className="p-4 border-b border-border">
            <SheetTitle className="text-foreground">Menu</SheetTitle>
          </SheetHeader>
          <SidebarContent
            viewMode={viewMode}
            onViewModeChange={onViewModeChange}
            onBrainDumpClick={onBrainDumpClick}
            onTrendingClick={onTrendingClick}
            onFriendsClick={onFriendsClick}
            onJumpToToday={onJumpToToday}
            onClose={onClose}
          />
        </SheetContent>
      </Sheet>
    );
  }

  // Desktop: static sidebar
  return (
    <aside 
      className={cn(
        "w-48 lg:w-52 xl:w-56 border-r border-border bg-sidebar flex-shrink-0 transition-all duration-300 overflow-hidden",
        !open && "w-0 border-r-0"
      )}
    >
      <SidebarContent
        viewMode={viewMode}
        onViewModeChange={onViewModeChange}
        onBrainDumpClick={onBrainDumpClick}
        onTrendingClick={onTrendingClick}
        onFriendsClick={onFriendsClick}
        onJumpToToday={onJumpToToday}
      />
    </aside>
  );
};

export default Sidebar;
