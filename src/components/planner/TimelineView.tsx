import { ZoomLevel, EnergyLevel } from '@/types';
import { cn } from '@/lib/utils';

interface TimelineViewProps {
  zoomLevel: ZoomLevel;
  focusedMonth: number | null;
  currentEnergy: EnergyLevel;
  onMonthClick: (month: number) => void;
  onZoomOut: () => void;
}

const MONTHS = [
  'January', 'February', 'March', 'April',
  'May', 'June', 'July', 'August',
  'September', 'October', 'November', 'December'
];

const TimelineView = ({
  zoomLevel,
  focusedMonth,
  currentEnergy,
  onMonthClick,
  onZoomOut,
}: TimelineViewProps) => {
  const currentMonth = new Date().getMonth();
  const currentYear = new Date().getFullYear();

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-light text-foreground">{currentYear}</h1>
          <p className="text-foreground-muted mt-1">Timeline View</p>
        </div>
      </div>

      {/* Timeline */}
      <div className="relative">
        {/* Timeline line */}
        <div className="absolute left-6 top-0 bottom-0 w-px bg-border" />

        {/* Months */}
        <div className="space-y-2">
          {MONTHS.map((month, index) => {
            const isCurrentMonth = index === currentMonth;
            const isPast = index < currentMonth;

            return (
              <div
                key={month}
                onClick={() => onMonthClick(index)}
                className={cn(
                  "relative pl-16 pr-4 py-4 rounded-lg cursor-pointer transition-all duration-200",
                  "hover:bg-card",
                  isCurrentMonth && "bg-card"
                )}
              >
                {/* Timeline dot */}
                <div
                  className={cn(
                    "absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full border-2",
                    isCurrentMonth 
                      ? "bg-primary border-primary"
                      : isPast 
                        ? "bg-secondary border-border"
                        : "bg-background border-border"
                  )}
                />

                {/* Content */}
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className={cn(
                      "font-medium",
                      isCurrentMonth ? "text-foreground" : "text-foreground-muted"
                    )}>
                      {month}
                    </h3>
                    {isCurrentMonth && (
                      <span className="text-2xs uppercase tracking-wider text-primary font-medium">
                        Current
                      </span>
                    )}
                  </div>

                  <span className="text-foreground-subtle text-sm">
                    {String(index + 1).padStart(2, '0')}
                  </span>
                </div>

                {/* Campaigns would go here */}
                <div className="mt-2 flex flex-wrap gap-2">
                  {/* Placeholder for campaign chips */}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default TimelineView;
