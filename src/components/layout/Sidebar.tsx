import { cn } from '@/lib/utils';
import { 
  Grid3X3, 
  Calendar,
  Brain,
  TrendingUp,
  Users,
  Archive
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ViewMode } from '@/types';

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
}

// Layout modes - currently only 'grid' is enabled
// Kept flexible for future layout expansions
const ENABLED_LAYOUTS: ViewMode[] = ['grid'];

// Future layout options (disabled for now but kept in code for future use)
// const FUTURE_LAYOUTS: ViewMode[] = ['circular', 'timeline'];

const Sidebar = ({ 
  open, 
  viewMode, 
  onViewModeChange, 
  onBrainDumpClick,
  onTrendingClick,
  onFriendsClick,
  onJumpToToday,
  memoryOpen,
  onMemoryClick
}: SidebarProps) => {
  // Only show enabled layouts - filter maintains proper typing
  const viewModes = [
    { value: 'grid' as ViewMode, icon: <Grid3X3 className="w-4 h-4" />, label: 'Grid' },
    // Future layouts - uncomment when ready:
    // { value: 'circular' as ViewMode, icon: <Circle className="w-4 h-4" />, label: 'Circular' },
    // { value: 'timeline' as ViewMode, icon: <LayoutList className="w-4 h-4" />, label: 'Timeline' },
  ].filter(mode => ENABLED_LAYOUTS.includes(mode.value));

  return (
    <aside 
      className={cn(
        "w-56 border-r border-border bg-sidebar flex-shrink-0 transition-all duration-300 overflow-hidden",
        !open && "w-0 border-r-0"
      )}
    >
      <div className="p-4 space-y-6">
        {/* Layout Mode - Only show if multiple layouts are enabled */}
        {viewModes.length > 1 && (
          <div className="space-y-2">
            <span className="caption">Layout</span>
            <div className="space-y-1">
              {viewModes.map((mode) => (
                <Button
                  key={mode.value}
                  variant="ghost"
                  size="sm"
                  onClick={() => onViewModeChange(mode.value)}
                  className={cn(
                    "w-full justify-start gap-2 text-foreground-muted hover:text-foreground",
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
        <div className="space-y-2">
          <span className="caption">Quick Actions</span>
          <div className="space-y-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={onBrainDumpClick}
              className="w-full justify-start gap-2 text-foreground-muted hover:text-foreground"
            >
              <Brain className="w-4 h-4" />
              Brain Dump
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={onTrendingClick}
              className="w-full justify-start gap-2 text-foreground-muted hover:text-foreground"
            >
              <TrendingUp className="w-4 h-4" />
              Trending Topics
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={onFriendsClick}
              className="w-full justify-start gap-2 text-foreground-muted hover:text-foreground"
            >
              <Users className="w-4 h-4" />
              Friends & Sharing
            </Button>
          </div>
        </div>

        {/* Storage - Hidden for now
        <div className="space-y-2">
          <span className="caption">Storage</span>
          <div className="space-y-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={onMemoryClick}
              className={cn(
                "w-full justify-start gap-2 text-foreground-muted hover:text-foreground",
                memoryOpen && "bg-secondary text-foreground"
              )}
            >
              <Archive className="w-4 h-4" />
              Memory
            </Button>
          </div>
        </div>
        */}

        {/* Today Button */}
        <Button 
          variant="outline" 
          size="sm" 
          className="w-full gap-2"
          onClick={onJumpToToday}
        >
          <Calendar className="w-4 h-4" />
          Jump to Today
        </Button>
      </div>
    </aside>
  );
};

export default Sidebar;
