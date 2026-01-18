import { cn } from '@/lib/utils';
import { ZoomLevel } from '@/types';
import { Calendar, CalendarDays, LayoutGrid, Clock, RotateCcw, Moon, Sun, SunMoon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { useIsMobile } from '@/hooks/use-mobile';
import { useDensity } from '@/contexts/DensityContext';
import { TimeDisplayMode } from '@/lib/timeRangeConfig';

interface ViewSelectorProps {
  zoomLevel: ZoomLevel;
  onZoomLevelChange: (level: ZoomLevel) => void;
  canResetLayout?: boolean;
  onResetLayout?: () => void;
}

const views: { value: ZoomLevel; label: string; icon: React.ReactNode }[] = [
  { value: 'year', label: 'Year', icon: <LayoutGrid className="w-4 h-4" /> },
  { value: 'month', label: 'Month', icon: <Calendar className="w-4 h-4" /> },
  { value: 'week', label: 'Week', icon: <CalendarDays className="w-4 h-4" /> },
  { value: 'day', label: 'Day', icon: <Clock className="w-4 h-4" /> },
];

const timeDisplayModes: { value: TimeDisplayMode; icon: React.ReactNode; label: string }[] = [
  { value: 'DAY', icon: <Sun className="w-4 h-4" />, label: 'Day hours only' },
  { value: 'NIGHT', icon: <Moon className="w-4 h-4" />, label: 'Night hours only' },
  { value: 'BOTH', icon: <SunMoon className="w-4 h-4" />, label: 'All hours' },
];

const ViewSelector = ({ zoomLevel, onZoomLevelChange, canResetLayout, onResetLayout }: ViewSelectorProps) => {
  const isMobile = useIsMobile();
  const { timeRangeSettings, updateTimeRangeSetting } = useDensity();
  
  const currentDisplayMode = timeRangeSettings.timeDisplayMode || 'BOTH';
  const isFocusMode = timeRangeSettings.dayTimeRangeMode === 'FOCUS';
  const showTimeToggle = zoomLevel === 'day' && isFocusMode;

  // Cycle through display modes on click
  const handleTimeDisplayToggle = () => {
    const currentIndex = timeDisplayModes.findIndex(m => m.value === currentDisplayMode);
    const nextIndex = (currentIndex + 1) % timeDisplayModes.length;
    updateTimeRangeSetting('timeDisplayMode', timeDisplayModes[nextIndex].value);
  };
  
  return (
    <div className={cn(
      "flex items-center",
      isMobile ? "gap-2 w-full" : "gap-3"
    )}>
      {/* Main view selector */}
      <div className={cn(
        "flex items-center bg-secondary/60 backdrop-blur-sm rounded-xl border border-border/50",
        isMobile ? "flex-1 p-1" : "p-1"
      )}>
        {views.map((view) => (
          <button
            key={view.value}
            onClick={() => onZoomLevelChange(view.value)}
            className={cn(
              "flex items-center justify-center gap-2 rounded-lg font-medium transition-all",
              isMobile 
                ? "flex-1 px-3 py-3.5 text-sm min-h-[52px]" 
                : "px-4 py-2.5 text-sm",
              zoomLevel === view.value
                ? "bg-background text-foreground shadow-md"
                : "text-foreground-muted hover:text-foreground hover:bg-background/50"
            )}
          >
            {view.icon}
            <span className={cn(
              "font-medium",
              isMobile && "text-sm"
            )}>{view.label}</span>
          </button>
        ))}
      </div>

      {/* Quick time display toggle - only in Day view with Focus mode */}
      {showTimeToggle && (
        <TooltipProvider delayDuration={300}>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                onClick={handleTimeDisplayToggle}
                className={cn(
                  "border-border/50 bg-secondary/60 backdrop-blur-sm",
                  isMobile ? "h-[52px] w-[52px] p-0" : "h-10 w-10 p-0",
                  currentDisplayMode === 'NIGHT' && "bg-secondary border-highlight/50 text-highlight"
                )}
              >
                {timeDisplayModes.find(m => m.value === currentDisplayMode)?.icon}
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>{timeDisplayModes.find(m => m.value === currentDisplayMode)?.label}</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )}

      {/* Reset Layout button - only visible in Day view when there are customizations */}
      {zoomLevel === 'day' && canResetLayout && onResetLayout && (
        <TooltipProvider delayDuration={300}>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                onClick={onResetLayout}
                className={cn(
                  "border-border/50 bg-secondary/60 backdrop-blur-sm",
                  isMobile ? "h-[52px] w-[52px] p-0" : "h-10 w-10 p-0"
                )}
              >
                <RotateCcw className="w-4 h-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Reset layout</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )}
    </div>
  );
};

export default ViewSelector;
