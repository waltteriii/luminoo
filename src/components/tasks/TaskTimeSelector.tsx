import { useState, useRef } from 'react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ChevronUp, ChevronDown } from 'lucide-react';

interface TaskTimeSelectorProps {
  startTime: string;
  endTime: string;
  onStartTimeChange: (time: string) => void;
  onEndTimeChange: (time: string) => void;
  minHour?: number;
  maxHour?: number;
}

// Generate time options in 15-minute increments
const generateTimeOptions = (minHour: number, maxHour: number) => {
  const options: string[] = [];
  for (let hour = minHour; hour <= maxHour; hour++) {
    for (let min = 0; min < 60; min += 15) {
      if (hour === maxHour && min > 0) break;
      options.push(`${hour.toString().padStart(2, '0')}:${min.toString().padStart(2, '0')}`);
    }
  }
  return options;
};

const TaskTimeSelector = ({
  startTime,
  endTime,
  onStartTimeChange,
  onEndTimeChange,
  minHour = 0,
  maxHour = 23,
}: TaskTimeSelectorProps) => {
  const trackRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState<'start' | 'end' | 'range' | null>(null);
  const [dragOffset, setDragOffset] = useState(0);

  const displayMinHour = 6;
  const displayMaxHour = 22;
  const totalDisplayHours = displayMaxHour - displayMinHour;

  const timeOptions = generateTimeOptions(minHour, maxHour);

  const getHourFromTime = (time: string): number => {
    if (!time || time === 'none') return displayMinHour;
    const [hours, minutes] = time.split(':').map(Number);
    return hours + minutes / 60;
  };

  const formatHour = (hour: number): string => {
    const h = Math.floor(hour);
    const m = Math.round((hour - h) * 60);
    const clampedM = Math.round(m / 15) * 15;
    const finalM = clampedM === 60 ? 0 : clampedM;
    const finalH = clampedM === 60 ? h + 1 : h;
    return `${Math.max(0, Math.min(23, finalH)).toString().padStart(2, '0')}:${finalM.toString().padStart(2, '0')}`;
  };

  const formatDisplayTime = (time: string): string => {
    if (!time || time === 'none') return '--';
    try {
      return format(new Date(`2000-01-01T${time}`), 'h:mm a');
    } catch {
      return time;
    }
  };

  const startHour = getHourFromTime(startTime);
  const endHour = getHourFromTime(endTime);
  const durationMinutes = Math.round((endHour - startHour) * 60);

  // Clamp display positions to slider bounds
  const clampedStart = Math.max(displayMinHour, Math.min(displayMaxHour, startHour));
  const clampedEnd = Math.max(displayMinHour, Math.min(displayMaxHour, endHour));

  const startPercent = ((clampedStart - displayMinHour) / totalDisplayHours) * 100;
  const endPercent = ((clampedEnd - displayMinHour) / totalDisplayHours) * 100;
  const rangeWidth = Math.max(0, endPercent - startPercent);

  const getHourFromPosition = (clientX: number): number => {
    if (!trackRef.current) return displayMinHour;
    const rect = trackRef.current.getBoundingClientRect();
    const percent = (clientX - rect.left) / rect.width;
    const hour = displayMinHour + percent * totalDisplayHours;
    // Snap to 15-minute increments
    const snapped = Math.round(hour * 4) / 4;
    return Math.max(displayMinHour, Math.min(displayMaxHour, snapped));
  };

  const handlePointerDown = (type: 'start' | 'end' | 'range') => (e: React.PointerEvent) => {
    e.preventDefault();
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    setIsDragging(type);

    if (type === 'range') {
      const hour = getHourFromPosition(e.clientX);
      setDragOffset(hour - startHour);
    }
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging) return;

    const hour = getHourFromPosition(e.clientX);

    if (isDragging === 'start') {
      const newStart = Math.min(hour, endHour - 0.25);
      onStartTimeChange(formatHour(newStart));
    } else if (isDragging === 'end') {
      const newEnd = Math.max(hour, startHour + 0.25);
      onEndTimeChange(formatHour(newEnd));
    } else if (isDragging === 'range') {
      const duration = endHour - startHour;
      let newStart = hour - dragOffset;
      let newEnd = newStart + duration;

      if (newStart < displayMinHour) {
        newStart = displayMinHour;
        newEnd = displayMinHour + duration;
      }
      if (newEnd > displayMaxHour) {
        newEnd = displayMaxHour;
        newStart = displayMaxHour - duration;
      }

      onStartTimeChange(formatHour(newStart));
      onEndTimeChange(formatHour(newEnd));
    }
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    (e.target as HTMLElement).releasePointerCapture(e.pointerId);
    setIsDragging(null);
  };

  // Hour markers for display
  const hourMarkers = Array.from({ length: totalDisplayHours + 1 }, (_, i) => displayMinHour + i);

  // Format duration display
  const formatDuration = (mins: number) => {
    if (mins < 60) return `${mins} min`;
    const hours = Math.floor(mins / 60);
    const remainingMins = mins % 60;
    if (remainingMins === 0) return `${hours}h`;
    return `${hours}h ${remainingMins}m`;
  };

  return (
    <div className="space-y-4">
      {/* Time display with clickable selectors */}
      <div className="flex justify-between items-center">
        <div className="text-center">
          <div className="text-xs text-foreground-muted mb-1">Start</div>
          <Select value={startTime} onValueChange={onStartTimeChange}>
            <SelectTrigger className="h-auto w-auto border-0 bg-transparent p-0 text-xl font-semibold hover:text-primary transition-colors focus:ring-0 focus:ring-offset-0">
              <SelectValue>{formatDisplayTime(startTime)}</SelectValue>
            </SelectTrigger>
            <SelectContent className="max-h-64">
              {timeOptions.map((time) => (
                <SelectItem 
                  key={time} 
                  value={time}
                  disabled={time >= endTime}
                >
                  {formatDisplayTime(time)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex-1 text-center">
          <div className="text-xs text-foreground-muted mb-1">Duration</div>
          <div className="text-sm font-medium text-foreground-muted">
            {formatDuration(durationMinutes)}
          </div>
        </div>
        <div className="text-center">
          <div className="text-xs text-foreground-muted mb-1">End</div>
          <Select value={endTime} onValueChange={onEndTimeChange}>
            <SelectTrigger className="h-auto w-auto border-0 bg-transparent p-0 text-xl font-semibold hover:text-primary transition-colors focus:ring-0 focus:ring-offset-0">
              <SelectValue>{formatDisplayTime(endTime)}</SelectValue>
            </SelectTrigger>
            <SelectContent className="max-h-64">
              {timeOptions.map((time) => (
                <SelectItem 
                  key={time} 
                  value={time}
                  disabled={time <= startTime}
                >
                  {formatDisplayTime(time)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Slider track */}
      <div className="relative pt-5 pb-2">
        {/* Hour markers */}
        <div className="absolute top-0 left-0 right-0 flex justify-between">
          {hourMarkers.filter((_, i) => i % 2 === 0).map((hour) => (
            <div
              key={hour}
              className="text-[10px] text-foreground-subtle"
              style={{
                position: 'absolute',
                left: `${((hour - displayMinHour) / totalDisplayHours) * 100}%`,
                transform: 'translateX(-50%)',
              }}
            >
              {format(new Date(2000, 0, 1, hour), 'ha')}
            </div>
          ))}
        </div>

        {/* Track */}
        <div
          ref={trackRef}
          className="relative h-9 bg-secondary/60 rounded-lg cursor-pointer touch-none"
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onClick={(e) => {
            if (isDragging) return;
            const hour = getHourFromPosition(e.clientX);
            const distToStart = Math.abs(hour - startHour);
            const distToEnd = Math.abs(hour - endHour);
            if (distToStart < distToEnd) {
              onStartTimeChange(formatHour(Math.min(hour, endHour - 0.25)));
            } else {
              onEndTimeChange(formatHour(Math.max(hour, startHour + 0.25)));
            }
          }}
        >
          {/* Selected range */}
          <div
            className={cn(
              'absolute top-0 bottom-0 bg-primary/25 rounded cursor-grab active:cursor-grabbing transition-colors touch-none',
              isDragging === 'range' && 'bg-primary/35'
            )}
            style={{
              left: `${startPercent}%`,
              width: `${rangeWidth}%`,
            }}
            onPointerDown={handlePointerDown('range')}
          />

          {/* Start handle */}
          <div
            className={cn(
              'absolute top-1/2 -translate-y-1/2 w-4 h-9 bg-primary rounded cursor-ew-resize shadow-md transition-all touch-none flex items-center justify-center',
              isDragging === 'start' && 'scale-110 shadow-lg'
            )}
            style={{ left: `calc(${startPercent}% - 8px)` }}
            onPointerDown={handlePointerDown('start')}
          >
            <div className="w-0.5 h-4 bg-primary-foreground/60 rounded-full" />
          </div>

          {/* End handle */}
          <div
            className={cn(
              'absolute top-1/2 -translate-y-1/2 w-4 h-9 bg-primary rounded cursor-ew-resize shadow-md transition-all touch-none flex items-center justify-center',
              isDragging === 'end' && 'scale-110 shadow-lg'
            )}
            style={{ left: `calc(${endPercent}% - 8px)` }}
            onPointerDown={handlePointerDown('end')}
          >
            <div className="w-0.5 h-4 bg-primary-foreground/60 rounded-full" />
          </div>
        </div>
      </div>

      {/* Quick duration buttons */}
      <div className="flex gap-2 justify-center">
        {[15, 30, 60, 120, 180].map((mins) => (
          <button
            key={mins}
            onClick={() => {
              const newEnd = startHour + mins / 60;
              if (newEnd <= 23) {
                onEndTimeChange(formatHour(newEnd));
              }
            }}
            className={cn(
              'px-3 py-1.5 text-xs rounded-lg border border-border/60 hover:bg-secondary transition-colors',
              durationMinutes === mins && 'bg-primary/15 border-primary/40 text-primary'
            )}
          >
            {mins < 60 ? `${mins}m` : `${mins / 60}h`}
          </button>
        ))}
      </div>
    </div>
  );
};

export default TaskTimeSelector;
