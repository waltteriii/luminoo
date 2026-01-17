import { Plus, Minus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ZoomLevel } from '@/types';
import { cn } from '@/lib/utils';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface ZoomControlsProps {
  zoomLevel: ZoomLevel;
  onZoomLevelChange: (level: ZoomLevel) => void;
}

// Order from most zoomed in (hour) to most zoomed out (year)
const ZOOM_ORDER: ZoomLevel[] = ['hour', 'day', 'week', 'month', 'year'];

const ZOOM_LABELS: Record<ZoomLevel, string> = {
  hour: 'Hour',
  day: 'Day',
  week: 'Week',
  month: 'Month',
  quarter: 'Quarter',
  year: 'Year',
};

const ZoomControls = ({ zoomLevel, onZoomLevelChange }: ZoomControlsProps) => {
  const currentIndex = ZOOM_ORDER.indexOf(zoomLevel);
  
  const canZoomIn = currentIndex > 0;
  const canZoomOut = currentIndex < ZOOM_ORDER.length - 1;

  const handleZoomIn = () => {
    if (canZoomIn) {
      onZoomLevelChange(ZOOM_ORDER[currentIndex - 1]);
    }
  };

  const handleZoomOut = () => {
    if (canZoomOut) {
      onZoomLevelChange(ZOOM_ORDER[currentIndex + 1]);
    }
  };

  return (
    <TooltipProvider>
      <div className="flex flex-col items-center gap-1 bg-secondary/50 rounded-lg p-1.5">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className={cn(
                "w-8 h-8",
                !canZoomIn && "opacity-40 cursor-not-allowed"
              )}
              onClick={handleZoomIn}
              disabled={!canZoomIn}
            >
              <Plus className="w-4 h-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="right">
            <p>Zoom in{canZoomIn ? ` to ${ZOOM_LABELS[ZOOM_ORDER[currentIndex - 1]]}` : ''}</p>
          </TooltipContent>
        </Tooltip>

        <div className="text-2xs font-medium text-foreground-muted px-2 py-1 text-center min-w-[3rem]">
          {ZOOM_LABELS[zoomLevel]}
        </div>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className={cn(
                "w-8 h-8",
                !canZoomOut && "opacity-40 cursor-not-allowed"
              )}
              onClick={handleZoomOut}
              disabled={!canZoomOut}
            >
              <Minus className="w-4 h-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="right">
            <p>Zoom out{canZoomOut ? ` to ${ZOOM_LABELS[ZOOM_ORDER[currentIndex + 1]]}` : ''}</p>
          </TooltipContent>
        </Tooltip>
      </div>
    </TooltipProvider>
  );
};

export default ZoomControls;
