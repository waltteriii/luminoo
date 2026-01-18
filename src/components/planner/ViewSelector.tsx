import { cn } from '@/lib/utils';
import { ZoomLevel } from '@/types';
import { Calendar, CalendarDays, LayoutGrid, Clock, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

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

const ViewSelector = ({ zoomLevel, onZoomLevelChange, canResetLayout, onResetLayout }: ViewSelectorProps) => {
  return (
    <div className="flex items-center gap-2">
      <div className="flex items-center gap-1 p-1 bg-secondary/50 rounded-lg">
        {views.map((view) => (
          <button
            key={view.value}
            onClick={() => onZoomLevelChange(view.value)}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-all",
              zoomLevel === view.value
                ? "bg-background text-foreground shadow-sm"
                : "text-foreground-muted hover:text-foreground"
            )}
          >
            {view.icon}
            <span className="hidden sm:inline">{view.label}</span>
          </button>
        ))}
      </div>

      {/* Reset Layout button - only visible in Day view when there are customizations */}
      {zoomLevel === 'day' && canResetLayout && onResetLayout && (
        <TooltipProvider delayDuration={300}>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                onClick={onResetLayout}
                className="h-9 w-9 p-0"
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
