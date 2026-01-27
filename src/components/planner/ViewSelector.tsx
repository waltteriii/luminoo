import { memo } from 'react';
import { cn } from '@/lib/utils';
import { ZoomLevel } from '@/types';
import { Calendar, CalendarDays, LayoutGrid, Clock, RotateCcw, Moon, CalendarCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useIsMobile } from '@/hooks/use-mobile';
import { useDensity } from '@/contexts/DensityContext';

interface ViewSelectorProps {
  zoomLevel: ZoomLevel;
  onZoomLevelChange: (level: ZoomLevel) => void;
  canResetLayout?: boolean;
  onResetLayout?: () => void;
  onJumpToToday?: () => void;
}

const views: { value: ZoomLevel; label: string; shortLabel: string; icon: React.ReactNode }[] = [
  { value: 'year', label: 'Year', shortLabel: 'Y', icon: <LayoutGrid className="w-4 h-4" /> },
  { value: 'month', label: 'Month', shortLabel: 'M', icon: <Calendar className="w-4 h-4" /> },
  { value: 'week', label: 'Week', shortLabel: 'W', icon: <CalendarDays className="w-4 h-4" /> },
  { value: 'day', label: 'Day', shortLabel: 'D', icon: <Clock className="w-4 h-4" /> },
];

const ViewSelector = memo(({ zoomLevel, onZoomLevelChange, canResetLayout, onResetLayout, onJumpToToday }: ViewSelectorProps) => {
  const isMobile = useIsMobile();
  const { timeRangeSettings, setTimeRangeSettings } = useDensity();
  
  const showNight = timeRangeSettings.showNight ?? false;
  const isFocusMode = timeRangeSettings.dayTimeRangeMode === 'FOCUS';
  const showNightToggle = zoomLevel === 'day' && isFocusMode;

  const handleToggleNight = () => {
    setTimeRangeSettings({
      ...timeRangeSettings,
      showNight: !showNight,
      timeDisplayMode: !showNight ? 'BOTH' : 'DAY',
    });
  };
  
  return (
    <div className="flex flex-wrap items-center gap-2 sm:gap-3 w-full min-w-0">
      {/* Main view selector - full width on mobile */}
      <div className={cn(
        "flex items-center bg-secondary/60 backdrop-blur-sm rounded-xl border border-border/50 p-1 min-w-0",
        isMobile ? "flex-1 w-full" : "w-auto"
      )}>
        {views.map((view) => (
          <button
            key={view.value}
            type="button"
            onClick={() => onZoomLevelChange(view.value)}
            className={cn(
              "flex items-center justify-center gap-1.5 rounded-lg font-medium transition-all touch-manipulation",
              "min-h-[44px] sm:min-h-[40px]",
              isMobile ? "flex-1 px-2 py-2.5" : "px-3 py-2",
              zoomLevel === view.value
                ? "bg-background text-foreground shadow-md"
                : "text-foreground-muted hover:text-foreground hover:bg-background/50 active:bg-background/70"
            )}
          >
            {view.icon}
            <span className={cn(
              "text-sm font-medium",
              isMobile && "hidden xs:inline"
            )}>
              {isMobile ? view.shortLabel : view.label}
            </span>
          </button>
        ))}
      </div>

      {/* Action buttons - grouped together */}
      <div className="flex flex-wrap items-center gap-1.5 w-full sm:w-auto justify-end">
        {/* Today button */}
        {onJumpToToday && (
          <TooltipProvider delayDuration={300}>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    onJumpToToday();
                  }}
                  className={cn(
                    "border-border/50 bg-secondary/60 backdrop-blur-sm gap-1.5 touch-manipulation",
                    "h-11 min-h-[44px] sm:h-10 sm:min-h-[40px] px-3"
                  )}
                >
                  <CalendarCheck className="w-4 h-4" />
                  <span className="text-sm hidden sm:inline">Today</span>
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Jump to today</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}

        {/* Night toggle - Day view + Focus mode only */}
        {showNightToggle && (
          <TooltipProvider delayDuration={300}>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleToggleNight}
                  className={cn(
                    "border-border/50 bg-secondary/60 backdrop-blur-sm touch-manipulation",
                    "h-11 min-h-[44px] sm:h-10 sm:min-h-[40px] w-11 sm:w-auto px-0 sm:px-3",
                    showNight && "bg-highlight/20 border-highlight/50 text-highlight"
                  )}
                >
                  <Moon className="w-4 h-4" />
                  <span className="text-sm hidden sm:inline ml-1.5">Night</span>
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>{showNight ? 'Hide night hours' : 'Show night hours'}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}

        {/* Reset Layout - Day view only when customized */}
        {zoomLevel === 'day' && canResetLayout && onResetLayout && (
          <TooltipProvider delayDuration={300}>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onResetLayout}
                  className="border-border/50 bg-secondary/60 backdrop-blur-sm h-11 w-11 min-h-[44px] min-w-[44px] sm:h-10 sm:w-10 p-0 touch-manipulation"
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
    </div>
  );
});

ViewSelector.displayName = 'ViewSelector';

export default ViewSelector;
