import { cn } from '@/lib/utils';
import { 
  Grid3X3, 
  Circle, 
  LayoutList,
  ZoomIn,
  ZoomOut,
  Calendar,
  Lightbulb,
  Brain,
  TrendingUp
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ViewMode, ZoomLevel } from '@/types';

interface SidebarProps {
  open: boolean;
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
  zoomLevel: ZoomLevel;
  onZoomLevelChange: (level: ZoomLevel) => void;
}

const Sidebar = ({ 
  open, 
  viewMode, 
  onViewModeChange, 
  zoomLevel, 
  onZoomLevelChange 
}: SidebarProps) => {
  const viewModes: { value: ViewMode; icon: React.ReactNode; label: string }[] = [
    { value: 'grid', icon: <Grid3X3 className="w-4 h-4" />, label: 'Grid' },
    { value: 'circular', icon: <Circle className="w-4 h-4" />, label: 'Circular' },
    { value: 'timeline', icon: <LayoutList className="w-4 h-4" />, label: 'Timeline' },
  ];

  const zoomLevels: { value: ZoomLevel; label: string }[] = [
    { value: 'year', label: 'Year' },
    { value: 'quarter', label: 'Quarter' },
    { value: 'month', label: 'Month' },
  ];

  return (
    <aside 
      className={cn(
        "w-56 border-r border-border bg-sidebar flex-shrink-0 transition-all duration-300 overflow-hidden",
        !open && "w-0 border-r-0"
      )}
    >
      <div className="p-4 space-y-6">
        {/* View Mode */}
        <div className="space-y-2">
          <span className="caption">View</span>
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

        {/* Zoom Level */}
        <div className="space-y-2">
          <span className="caption">Zoom</span>
          <div className="flex items-center gap-1 bg-secondary rounded-lg p-1">
            {zoomLevels.map((level) => (
              <Button
                key={level.value}
                variant="ghost"
                size="sm"
                onClick={() => onZoomLevelChange(level.value)}
                className={cn(
                  "flex-1 text-xs text-foreground-muted hover:text-foreground",
                  zoomLevel === level.value && "bg-background text-foreground shadow-sm"
                )}
              >
                {level.label}
              </Button>
            ))}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="space-y-2">
          <span className="caption">Quick Actions</span>
          <div className="space-y-1">
            <Button
              variant="ghost"
              size="sm"
              className="w-full justify-start gap-2 text-foreground-muted hover:text-foreground"
            >
              <Brain className="w-4 h-4" />
              Brain Dump
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="w-full justify-start gap-2 text-foreground-muted hover:text-foreground"
            >
              <Lightbulb className="w-4 h-4" />
              AI Suggestions
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="w-full justify-start gap-2 text-foreground-muted hover:text-foreground"
            >
              <TrendingUp className="w-4 h-4" />
              Trending Topics
            </Button>
          </div>
        </div>

        {/* Today Button */}
        <Button 
          variant="outline" 
          size="sm" 
          className="w-full gap-2"
        >
          <Calendar className="w-4 h-4" />
          Jump to Today
        </Button>
      </div>
    </aside>
  );
};

export default Sidebar;
