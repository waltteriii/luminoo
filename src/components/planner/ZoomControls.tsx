import { cn } from "@/lib/utils";
import { ZoomLevel } from "@/types/planner";
import { ZoomIn, ZoomOut, Maximize2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ZoomControlsProps {
  zoomLevel: ZoomLevel;
  onZoomChange: (level: ZoomLevel) => void;
  focusedQuarter?: number;
  focusedMonth?: number;
  onClearFocus: () => void;
}

const zoomLevels: ZoomLevel[] = ['year', 'quarter', 'month'];

export function ZoomControls({
  zoomLevel,
  onZoomChange,
  focusedQuarter,
  focusedMonth,
  onClearFocus,
}: ZoomControlsProps) {
  const currentIndex = zoomLevels.indexOf(zoomLevel);
  
  const canZoomIn = currentIndex < zoomLevels.length - 1;
  const canZoomOut = currentIndex > 0;

  const handleZoomIn = () => {
    if (canZoomIn) {
      onZoomChange(zoomLevels[currentIndex + 1]);
    }
  };

  const handleZoomOut = () => {
    if (canZoomOut) {
      onZoomChange(zoomLevels[currentIndex - 1]);
    }
  };

  return (
    <div className="flex items-center gap-3 animate-fade-in">
      <div className="flex items-center gap-1 bg-secondary/50 rounded-lg p-1">
        {zoomLevels.map((level) => (
          <button
            key={level}
            onClick={() => onZoomChange(level)}
            className={cn(
              "px-3 py-1.5 text-xs rounded-md transition-all duration-300 capitalize",
              zoomLevel === level
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            {level}
          </button>
        ))}
      </div>

      <div className="flex items-center gap-1">
        <Button
          variant="zoom"
          size="compact"
          onClick={handleZoomOut}
          disabled={!canZoomOut}
          className="opacity-70 hover:opacity-100"
        >
          <ZoomOut className="w-3.5 h-3.5" />
        </Button>
        <Button
          variant="zoom"
          size="compact"
          onClick={handleZoomIn}
          disabled={!canZoomIn}
          className="opacity-70 hover:opacity-100"
        >
          <ZoomIn className="w-3.5 h-3.5" />
        </Button>
      </div>

      {(focusedQuarter || focusedMonth !== undefined) && (
        <Button
          variant="ghost"
          size="compact"
          onClick={onClearFocus}
          className="text-xs text-muted-foreground hover:text-foreground"
        >
          <Maximize2 className="w-3 h-3 mr-1" />
          See full year
        </Button>
      )}
    </div>
  );
}
