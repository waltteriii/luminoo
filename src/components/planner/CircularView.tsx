import { ZoomLevel, EnergyLevel } from '@/types';
import { cn } from '@/lib/utils';

interface CircularViewProps {
  zoomLevel: ZoomLevel;
  focusedMonth: number | null;
  currentEnergy: EnergyLevel;
  onMonthClick: (month: number) => void;
  onZoomOut: () => void;
}

const MONTHS = [
  'Jan', 'Feb', 'Mar', 'Apr',
  'May', 'Jun', 'Jul', 'Aug',
  'Sep', 'Oct', 'Nov', 'Dec'
];

const CircularView = ({
  zoomLevel,
  focusedMonth,
  currentEnergy,
  onMonthClick,
  onZoomOut,
}: CircularViewProps) => {
  const currentMonth = new Date().getMonth();
  const currentYear = new Date().getFullYear();
  
  const size = 400;
  const center = size / 2;
  const radius = 160;

  return (
    <div className="flex flex-col items-center justify-center min-h-[600px] animate-fade-in">
      {/* Header */}
      <div className="text-center mb-8">
        <h1 className="text-3xl font-light text-foreground">{currentYear}</h1>
        <p className="text-foreground-muted mt-1">Annual Wheel</p>
      </div>

      {/* Circular View */}
      <div className="relative" style={{ width: size, height: size }}>
        {/* Background circle */}
        <svg 
          width={size} 
          height={size} 
          className="absolute inset-0"
        >
          <circle
            cx={center}
            cy={center}
            r={radius + 40}
            fill="none"
            stroke="hsl(var(--border))"
            strokeWidth="1"
            strokeDasharray="4 4"
          />
          <circle
            cx={center}
            cy={center}
            r={radius - 20}
            fill="none"
            stroke="hsl(var(--border))"
            strokeWidth="1"
          />
        </svg>

        {/* Center content */}
        <div 
          className="absolute inset-0 flex items-center justify-center"
          style={{ pointerEvents: 'none' }}
        >
          <div className="text-center">
            <div className="text-4xl font-light text-foreground">{currentYear}</div>
            <div className="text-sm text-foreground-muted mt-1">
              {MONTHS[currentMonth]}
            </div>
          </div>
        </div>

        {/* Month nodes */}
        {MONTHS.map((month, index) => {
          const angle = (index * 30 - 90) * (Math.PI / 180);
          const x = center + radius * Math.cos(angle);
          const y = center + radius * Math.sin(angle);
          const isCurrentMonth = index === currentMonth;

          return (
            <button
              key={month}
              onClick={() => onMonthClick(index)}
              className={cn(
                "absolute w-12 h-12 rounded-full flex items-center justify-center",
                "text-xs font-medium transition-all duration-200",
                "-translate-x-1/2 -translate-y-1/2",
                isCurrentMonth 
                  ? "bg-primary text-primary-foreground ring-2 ring-primary/30"
                  : "bg-card text-foreground-muted hover:bg-secondary hover:text-foreground border border-border"
              )}
              style={{
                left: x,
                top: y,
              }}
            >
              {month}
            </button>
          );
        })}

        {/* Current month indicator arc */}
        <svg 
          width={size} 
          height={size} 
          className="absolute inset-0 pointer-events-none"
        >
          <circle
            cx={center}
            cy={center}
            r={radius}
            fill="none"
            stroke="hsl(var(--primary))"
            strokeWidth="2"
            strokeLinecap="round"
            strokeDasharray={`${(currentMonth + 1) / 12 * 2 * Math.PI * radius} ${2 * Math.PI * radius}`}
            transform={`rotate(-90 ${center} ${center})`}
            opacity="0.3"
          />
        </svg>
      </div>

      {/* Legend */}
      <div className="mt-8 flex items-center gap-6 text-sm text-foreground-muted">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-primary" />
          <span>Current month</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-card border border-border" />
          <span>Upcoming</span>
        </div>
      </div>
    </div>
  );
};

export default CircularView;
