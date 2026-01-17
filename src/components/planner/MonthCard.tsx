import { cn } from '@/lib/utils';
import { ZoomLevel, EnergyLevel } from '@/types';
import { Plus } from 'lucide-react';

interface TaskIndicator {
  energy: EnergyLevel;
  count: number;
}

interface MonthCardProps {
  month: number;
  name: string;
  isCurrentMonth: boolean;
  zoomLevel: ZoomLevel;
  onClick: () => void;
  taskIndicators?: TaskIndicator[];
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
}: MonthCardProps) => {
  const isCompact = zoomLevel === 'year';
  const isExpanded = zoomLevel === 'month';

  // Calculate total tasks for display
  const totalTasks = taskIndicators.reduce((sum, t) => sum + t.count, 0);

  return (
    <div
      onClick={onClick}
      className={cn(
        "group relative rounded-xl border transition-all duration-200 cursor-pointer",
        "bg-card hover:bg-card/80 border-border hover:border-border/80",
        isCurrentMonth && "ring-1 ring-primary/50",
        isCompact && "p-4 min-h-[120px]",
        !isCompact && !isExpanded && "p-6 min-h-[200px]",
        isExpanded && "p-8 min-h-[400px]"
      )}
    >
      {/* Month header */}
      <div className="flex items-start justify-between">
        <div>
          <h3 className={cn(
            "font-medium text-foreground",
            isCompact && "text-sm",
            !isCompact && "text-lg"
          )}>
            {name}
          </h3>
          {isCurrentMonth && (
            <span className="inline-block mt-1 text-2xs uppercase tracking-wider text-primary font-medium">
              Current
            </span>
          )}
        </div>
        
        <span className={cn(
          "text-foreground-subtle font-light",
          isCompact && "text-lg",
          !isCompact && "text-2xl"
        )}>
          {String(month + 1).padStart(2, '0')}
        </span>
      </div>

      {/* Task indicators - energy colored dots/bars */}
      <div className={cn(
        "mt-3 flex-1",
        isCompact && "space-y-1",
        !isCompact && "space-y-2"
      )}>
        {totalTasks > 0 && (
          <div className="flex flex-wrap gap-1">
            {taskIndicators.filter(t => t.count > 0).map((indicator) => (
              <div key={indicator.energy} className="flex items-center gap-1">
                {/* Show dots for compact view, bars for expanded */}
                {isCompact ? (
                  <div className="flex gap-0.5">
                    {Array.from({ length: Math.min(indicator.count, 5) }).map((_, i) => (
                      <div
                        key={i}
                        className={cn(
                          "w-1.5 h-1.5 rounded-full",
                          energyColors[indicator.energy]
                        )}
                      />
                    ))}
                    {indicator.count > 5 && (
                      <span className="text-2xs text-foreground-muted ml-0.5">+{indicator.count - 5}</span>
                    )}
                  </div>
                ) : (
                  <div className="flex items-center gap-1.5">
                    <div
                      className={cn(
                        "h-2 rounded-full",
                        energyColors[indicator.energy]
                      )}
                      style={{ width: `${Math.min(indicator.count * 8, 60)}px` }}
                    />
                    <span className="text-2xs text-foreground-muted">{indicator.count}</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Total tasks count for compact */}
        {isCompact && totalTasks > 0 && (
          <p className="text-2xs text-foreground-muted mt-1">
            {totalTasks} task{totalTasks !== 1 ? 's' : ''}
          </p>
        )}
      </div>

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
            // Add campaign logic
          }}
        >
          <Plus className="w-4 h-4" />
        </button>
      )}

      {/* Current month indicator line */}
      {isCurrentMonth && (
        <div className="absolute bottom-0 left-4 right-4 h-0.5 bg-primary rounded-full" />
      )}
    </div>
  );
};

export default MonthCard;
