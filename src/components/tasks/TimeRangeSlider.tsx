import { useState, useRef, useEffect } from 'react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

interface TimeRangeSliderProps {
  startTime: string;
  endTime: string;
  onStartTimeChange: (time: string) => void;
  onEndTimeChange: (time: string) => void;
  minHour?: number;
  maxHour?: number;
}

const TimeRangeSlider = ({
  startTime,
  endTime,
  onStartTimeChange,
  onEndTimeChange,
  minHour = 6,
  maxHour = 22,
}: TimeRangeSliderProps) => {
  const trackRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState<'start' | 'end' | 'range' | null>(null);
  const [dragOffset, setDragOffset] = useState(0);

  const totalHours = maxHour - minHour;
  
  // Parse times to get hours
  const getHourFromTime = (time: string): number => {
    if (!time || time === 'none') return minHour;
    const [hours, minutes] = time.split(':').map(Number);
    return hours + minutes / 60;
  };

  const formatHour = (hour: number): string => {
    const h = Math.floor(hour);
    const m = Math.round((hour - h) * 60);
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
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

  const startPercent = ((startHour - minHour) / totalHours) * 100;
  const endPercent = ((endHour - minHour) / totalHours) * 100;
  const rangeWidth = endPercent - startPercent;

  const getHourFromPosition = (clientX: number): number => {
    if (!trackRef.current) return minHour;
    const rect = trackRef.current.getBoundingClientRect();
    const percent = (clientX - rect.left) / rect.width;
    const hour = minHour + percent * totalHours;
    // Snap to 15-minute increments
    const snapped = Math.round(hour * 4) / 4;
    return Math.max(minHour, Math.min(maxHour, snapped));
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
      
      if (newStart < minHour) {
        newStart = minHour;
        newEnd = minHour + duration;
      }
      if (newEnd > maxHour) {
        newEnd = maxHour;
        newStart = maxHour - duration;
      }
      
      onStartTimeChange(formatHour(newStart));
      onEndTimeChange(formatHour(newEnd));
    }
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    (e.target as HTMLElement).releasePointerCapture(e.pointerId);
    setIsDragging(null);
  };

  // Hour markers
  const hourMarkers = Array.from({ length: totalHours + 1 }, (_, i) => minHour + i);

  return (
    <div className="space-y-3">
      {/* Time display */}
      <div className="flex justify-between items-center">
        <div className="text-center">
          <div className="text-xs text-foreground-muted">Start</div>
          <div className="text-lg font-medium">{formatDisplayTime(startTime)}</div>
        </div>
        <div className="flex-1 text-center">
          <div className="text-xs text-foreground-muted">Duration</div>
          <div className="text-sm text-foreground-muted">
            {Math.round((endHour - startHour) * 60)} min
          </div>
        </div>
        <div className="text-center">
          <div className="text-xs text-foreground-muted">End</div>
          <div className="text-lg font-medium">{formatDisplayTime(endTime)}</div>
        </div>
      </div>

      {/* Slider track */}
      <div className="relative pt-6 pb-2">
        {/* Hour markers */}
        <div className="absolute top-0 left-0 right-0 flex justify-between px-2">
          {hourMarkers.filter((_, i) => i % 2 === 0).map((hour) => (
            <div
              key={hour}
              className="text-[10px] text-foreground-muted"
              style={{
                position: 'absolute',
                left: `${((hour - minHour) / totalHours) * 100}%`,
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
          className="relative h-10 bg-secondary rounded-lg cursor-pointer touch-none"
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onClick={(e) => {
            if (isDragging) return;
            const hour = getHourFromPosition(e.clientX);
            // Move the closest handle
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
              "absolute top-0 bottom-0 bg-highlight/40 rounded cursor-grab active:cursor-grabbing transition-colors touch-none",
              isDragging === 'range' && "bg-highlight/60"
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
              "absolute top-1/2 -translate-y-1/2 w-5 h-10 bg-highlight rounded-md cursor-ew-resize shadow-md transition-transform touch-none",
              isDragging === 'start' && "scale-110"
            )}
            style={{ left: `calc(${startPercent}% - 10px)` }}
            onPointerDown={handlePointerDown('start')}
          />

          {/* End handle */}
          <div
            className={cn(
              "absolute top-1/2 -translate-y-1/2 w-5 h-10 bg-highlight rounded-md cursor-ew-resize shadow-md transition-transform touch-none",
              isDragging === 'end' && "scale-110"
            )}
            style={{ left: `calc(${endPercent}% - 10px)` }}
            onPointerDown={handlePointerDown('end')}
          />
        </div>
      </div>

      {/* Quick duration buttons */}
      <div className="flex gap-2 justify-center">
        {[15, 30, 60, 120, 180].map((mins) => (
          <button
            key={mins}
            onClick={() => {
              const newEnd = startHour + mins / 60;
              if (newEnd <= maxHour) {
                onEndTimeChange(formatHour(newEnd));
              }
            }}
            className={cn(
              "px-2 py-1 text-xs rounded-md border border-border hover:bg-secondary transition-colors",
              Math.round((endHour - startHour) * 60) === mins && "bg-highlight/20 border-highlight"
            )}
          >
            {mins < 60 ? `${mins}m` : `${mins / 60}h`}
          </button>
        ))}
      </div>
    </div>
  );
};

export default TimeRangeSlider;
