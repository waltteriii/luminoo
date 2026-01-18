import { memo, useState, useMemo } from 'react';
import { cn } from '@/lib/utils';
import { Task, EnergyLevel } from '@/types';
import { Moon, ChevronDown, ChevronUp, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { parseTimeToHours } from '@/lib/timeUtils';
import { TimeRangeSettings, formatHourLabel } from '@/lib/timeRangeConfig';

interface OffHoursSectionProps {
  type: 'night-before' | 'night-after';
  tasks: Task[];
  settings: TimeRangeSettings;
  hourHeight: number;
  onTaskClick?: (task: Task) => void;
  isExpanded: boolean;
  onToggleExpand: () => void;
  className?: string;
}

const energyColors: Record<EnergyLevel, string> = {
  high: 'bg-energy-high',
  medium: 'bg-energy-medium',
  low: 'bg-energy-low',
  recovery: 'bg-energy-recovery',
};

const OffHoursSection = memo(({
  type,
  tasks,
  settings,
  hourHeight,
  onTaskClick,
  isExpanded,
  onToggleExpand,
  className,
}: OffHoursSectionProps) => {
  const isNightBefore = type === 'night-before';
  
  const { startHour, endHour, label, hourCount } = useMemo(() => {
    if (isNightBefore) {
      return {
        startHour: 0,
        endHour: settings.focusStartTime,
        label: 'Night',
        hourCount: settings.focusStartTime,
      };
    } else {
      return {
        startHour: settings.focusEndTime,
        endHour: 24,
        label: 'Night',
        hourCount: 24 - settings.focusEndTime,
      };
    }
  }, [isNightBefore, settings.focusStartTime, settings.focusEndTime]);

  const timeRange = `${formatHourLabel(startHour)} – ${formatHourLabel(endHour)}`;

  // Calculate collapsed height (compact representation)
  const collapsedHeight = 48; // Fixed collapsed height
  const expandedHeight = hourCount * hourHeight * settings.offHoursDenseScaleFactor;

  const currentHeight = isExpanded ? expandedHeight : collapsedHeight;

  if (hourCount === 0) return null;

  return (
    <div
      className={cn(
        'relative transition-all duration-300 ease-out overflow-hidden',
        'border-b border-border/50 bg-background/50',
        isNightBefore ? 'rounded-t-lg' : 'rounded-b-lg',
        className
      )}
      style={{ height: currentHeight }}
    >
      {/* Collapsed View */}
      {!isExpanded && (
        <button
          onClick={onToggleExpand}
          className={cn(
            'w-full h-full flex items-center px-3 gap-3',
            'hover:bg-secondary/50 transition-colors',
            'text-left'
          )}
        >
          {/* Icon */}
          <div className="flex items-center gap-2 text-foreground-muted">
            <Moon className="w-4 h-4" />
            <span className="text-sm font-medium">{label}</span>
          </div>

          {/* Time range */}
          <span className="text-xs text-foreground-muted">
            {timeRange}
          </span>

          {/* Task count and mini previews */}
          {tasks.length > 0 && (
            <div className="flex items-center gap-2 ml-auto">
              <div className="flex items-center gap-1">
                {tasks.slice(0, 5).map(task => (
                  <div
                    key={task.id}
                    className={cn(
                      'w-2 h-2 rounded-full',
                      energyColors[task.energy_level]
                    )}
                    title={task.title}
                  />
                ))}
                {tasks.length > 5 && (
                  <span className="text-[10px] text-foreground-muted">
                    +{tasks.length - 5}
                  </span>
                )}
              </div>
              <span className="text-xs text-foreground-muted">
                {tasks.length} task{tasks.length !== 1 ? 's' : ''}
              </span>
            </div>
          )}

          <ChevronDown className="w-4 h-4 text-foreground-muted ml-2" />
        </button>
      )}

      {/* Expanded View */}
      {isExpanded && (
        <div className="h-full flex flex-col">
          {/* Header */}
          <button
            onClick={onToggleExpand}
            className={cn(
              'flex items-center justify-between px-3 py-2',
              'hover:bg-secondary/50 transition-colors',
              'border-b border-border/30'
            )}
          >
            <div className="flex items-center gap-2 text-foreground-muted">
              <Moon className="w-4 h-4" />
              <span className="text-sm font-medium">{label}</span>
              <span className="text-xs">({timeRange})</span>
            </div>
            <ChevronUp className="w-4 h-4 text-foreground-muted" />
          </button>

          {/* Task list in dense mode */}
          <div className="flex-1 overflow-y-auto px-3 py-2 space-y-1">
            {tasks.length === 0 ? (
              <div className="text-xs text-foreground-muted text-center py-2">
                No tasks in this time range
              </div>
            ) : (
              tasks.map(task => {
                const startHour = parseTimeToHours(task.start_time);
                const endHour = parseTimeToHours(task.end_time);
                const timeStr = startHour !== null
                  ? `${formatHourLabel(startHour)}${endHour !== null ? ` – ${formatHourLabel(endHour)}` : ''}`
                  : '';

                return (
                  <button
                    key={task.id}
                    onClick={() => onTaskClick?.(task)}
                    className={cn(
                      'w-full flex items-center gap-2 px-2 py-1.5 rounded-md',
                      'hover:bg-secondary/80 transition-colors text-left',
                      'border border-border/50'
                    )}
                  >
                    <div
                      className={cn(
                        'w-2 h-full min-h-[16px] rounded-full shrink-0',
                        energyColors[task.energy_level]
                      )}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium truncate">
                        {task.title}
                      </div>
                      {timeStr && (
                        <div className="flex items-center gap-1 text-[10px] text-foreground-muted">
                          <Clock className="w-2.5 h-2.5" />
                          {timeStr}
                        </div>
                      )}
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
});

OffHoursSection.displayName = 'OffHoursSection';

export default OffHoursSection;
