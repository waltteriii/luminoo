import { cn } from '@/lib/utils';
import { ZoomLevel, EnergyLevel } from '@/types';
import { Plus } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface TaskIndicator {
  energy: EnergyLevel;
  count: number;
}

interface TopTask {
  title: string;
  energy: EnergyLevel;
}

interface MonthCardProps {
  month: number;
  name: string;
  isCurrentMonth: boolean;
  zoomLevel: ZoomLevel;
  onClick: () => void;
  taskIndicators?: TaskIndicator[];
  topTasks?: TopTask[];
}

const energyColors: Record<EnergyLevel, string> = {
  high: 'bg-energy-high',
  medium: 'bg-energy-medium',
  low: 'bg-energy-low',
  recovery: 'bg-energy-recovery',
};

const MonthCard = ({
  month,
  name,
  isCurrentMonth,
  zoomLevel,
  onClick,
  taskIndicators = [],
  topTasks = [],
}: MonthCardProps) => {
  const isCompact = zoomLevel === 'year';
  const isExpanded = zoomLevel === 'month';

  // Calculate total tasks for display
  const totalTasks = taskIndicators.reduce((sum, t) => sum + t.count, 0);

  const cardContent = (
    <div
      onClick={onClick}
      className={cn(
        "group relative rounded-lg border transition-all duration-200 cursor-pointer",
        "bg-card hover:bg-card-hover border-border hover:border-highlight/30",
        isCurrentMonth && "border-highlight/50 bg-highlight-muted/20",
        isCompact && "p-3 sm:p-4 aspect-[4/3] flex flex-col",
        !isCompact && !isExpanded && "p-4 lg:p-6 min-h-[160px] lg:min-h-[200px]",
        isExpanded && "p-6 lg:p-8 min-h-[300px] lg:min-h-[400px]"
      )}
    >
      {/* Month header */}
      <div className="flex items-start justify-between">
        <div className="min-w-0">
          <h3 className={cn(
            "font-medium text-foreground truncate",
            isCompact && "text-xs sm:text-sm",
            !isCompact && "text-base lg:text-lg"
          )}>
            {name}
          </h3>
          {isCurrentMonth && isCompact && (
            <span className="inline-block mt-0.5 text-[8px] sm:text-[9px] uppercase tracking-wider text-highlight font-semibold">
              Now
            </span>
          )}
        </div>
        
        <span className={cn(
          "text-foreground-subtle/50 font-light flex-shrink-0",
          isCompact && "text-xs sm:text-sm",
          !isCompact && "text-lg lg:text-xl"
        )}>
          {String(month + 1).padStart(2, '0')}
        </span>
      </div>

      {/* Minimalist energy indicators - just tiny dots in a row */}
      {isCompact && totalTasks > 0 && (
        <div className="mt-auto pt-2">
          <div className="flex items-center gap-0.5 flex-wrap">
            {taskIndicators.filter(t => t.count > 0).map((indicator) => (
              <div key={indicator.energy} className="flex gap-[2px]">
                {Array.from({ length: Math.min(indicator.count, 3) }).map((_, i) => (
                  <div
                    key={i}
                    className={cn(
                      "w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full opacity-80",
                      energyColors[indicator.energy]
                    )}
                  />
                ))}
                {indicator.count > 3 && (
                  <span className="text-[8px] sm:text-[9px] text-foreground-muted ml-0.5 leading-none">
                    +{indicator.count - 3}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Expanded view - bars */}
      {!isCompact && totalTasks > 0 && (
        <div className="mt-3 space-y-1.5">
          {taskIndicators.filter(t => t.count > 0).map((indicator) => (
            <div key={indicator.energy} className="flex items-center gap-2">
              <div
                className={cn(
                  "h-1.5 rounded-full",
                  energyColors[indicator.energy]
                )}
                style={{ width: `${Math.min(indicator.count * 8, 60)}px` }}
              />
              <span className="text-2xs text-foreground-muted">{indicator.count}</span>
            </div>
          ))}
        </div>
      )}

      {/* Add button - shows on hover for expanded views */}
      {!isCompact && (
        <button
          className={cn(
            "absolute bottom-4 right-4 w-8 h-8 rounded-lg",
            "bg-secondary text-foreground-muted",
            "flex items-center justify-center",
            "opacity-0 group-hover:opacity-100 transition-opacity",
            "hover:bg-primary hover:text-primary-foreground"
          )}
          onClick={(e) => {
            e.stopPropagation();
          }}
        >
          <Plus className="w-4 h-4" />
        </button>
      )}

      {/* Current month indicator line */}
      {isCurrentMonth && (
        <div className="absolute bottom-0 left-3 right-3 sm:left-4 sm:right-4 h-0.5 bg-highlight rounded-full" />
      )}
    </div>
  );

  // Wrap with tooltip only if we have tasks to preview (and in compact/year view)
  if (isCompact && topTasks.length > 0) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          {cardContent}
        </TooltipTrigger>
        <TooltipContent 
          side="bottom" 
          className="max-w-[200px] p-2 space-y-1.5"
          sideOffset={4}
        >
          <p className="text-xs font-medium text-foreground mb-1.5">Upcoming tasks</p>
          {topTasks.slice(0, 4).map((task, i) => (
            <div key={i} className="flex items-center gap-2">
              <div className={cn("w-1.5 h-1.5 rounded-full flex-shrink-0", energyColors[task.energy])} />
              <span className="text-xs text-foreground-muted truncate">{task.title}</span>
            </div>
          ))}
          {totalTasks > 4 && (
            <p className="text-[10px] text-foreground-muted/60 pt-1">
              +{totalTasks - 4} more tasks
            </p>
          )}
        </TooltipContent>
      </Tooltip>
    );
  }

  return cardContent;
};

export default MonthCard;
