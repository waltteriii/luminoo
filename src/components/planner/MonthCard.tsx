import { cn } from '@/lib/utils';
import { ZoomLevel } from '@/types';
import { Plus } from 'lucide-react';

interface MonthCardProps {
  month: number;
  name: string;
  isCurrentMonth: boolean;
  zoomLevel: ZoomLevel;
  onClick: () => void;
}

const MonthCard = ({
  month,
  name,
  isCurrentMonth,
  zoomLevel,
  onClick,
}: MonthCardProps) => {
  const isCompact = zoomLevel === 'year';
  const isExpanded = zoomLevel === 'month';

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

      {/* Content area */}
      <div className={cn(
        "mt-4 flex-1",
        isCompact && "space-y-1",
        !isCompact && "space-y-2"
      )}>
        {/* Placeholder for campaigns */}
        <div className="flex flex-wrap gap-1">
          {/* Sample campaign chips would go here */}
        </div>
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
