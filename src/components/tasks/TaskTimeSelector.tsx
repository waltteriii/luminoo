import * as React from 'react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

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

type DragType = 'start' | 'end' | 'range';

type DragState = {
  type: DragType;
  pointerId: number;
  startHour: number;
  endHour: number;
  durationHours: number;
  rangeOffsetHours: number; // pointer hour - startHour at drag start
};

const TaskTimeSelector = React.forwardRef<HTMLDivElement, TaskTimeSelectorProps>(
  ({
    startTime,
    endTime,
    onStartTimeChange,
    onEndTimeChange,
    minHour = 0,
    maxHour = 23,
  }, ref) => {
    const trackRef = useRef<HTMLDivElement>(null);

    // Slider display window (UX choice)
    const displayMinHour = 6;
    const displayMaxHour = 22;
    const totalDisplayHours = displayMaxHour - displayMinHour;

    const timeOptions = useMemo(() => generateTimeOptions(minHour, maxHour), [minHour, maxHour]);

    const [dragType, setDragType] = useState<DragType | null>(null);

    // Local draft values prevent "shrinking" caused by intermediate parent state updates.
    const [draftStartTime, setDraftStartTime] = useState(startTime);
    const [draftEndTime, setDraftEndTime] = useState(endTime);

    const dragStateRef = useRef<DragState | null>(null);
    const rafRef = useRef<number | null>(null);
    const pendingRef = useRef<{ start: string; end: string } | null>(null);
    const suppressClickRef = useRef(false);
    // Track the latest draft values for endDrag since React state may be stale
    const latestDraftRef = useRef({ start: startTime, end: endTime });

    useEffect(() => {
      if (dragType) return;
      setDraftStartTime(startTime);
      setDraftEndTime(endTime);
      latestDraftRef.current = { start: startTime, end: endTime };
    }, [startTime, endTime, dragType]);

    const getHourFromTime = (time: string): number => {
      if (!time || time === 'none') return displayMinHour;
      const [hours, minutes] = time.split(':').map(Number);
      if (Number.isNaN(hours) || Number.isNaN(minutes)) return displayMinHour;
      return hours + minutes / 60;
    };

    const clampHourToDay = (hour: number) => Math.max(minHour, Math.min(maxHour, hour));

    const formatHour = (hour: number): string => {
      const h = Math.floor(hour);
      const m = Math.round((hour - h) * 60);
      const clampedM = Math.round(m / 15) * 15;
      const finalM = clampedM === 60 ? 0 : clampedM;
      const finalH = clampedM === 60 ? h + 1 : h;

      const clampedH = clampHourToDay(finalH);
      return `${clampedH.toString().padStart(2, '0')}:${finalM.toString().padStart(2, '0')}`;
    };

    const formatDisplayTime = (time: string): string => {
      if (!time || time === 'none') return '--';
      try {
        return format(new Date(`2000-01-01T${time}`), 'h:mm a');
      } catch {
        return time;
      }
    };

    const effectiveStartHour = getHourFromTime(draftStartTime);
    const effectiveEndHour = getHourFromTime(draftEndTime);
    const durationMinutes = Math.max(0, Math.round((effectiveEndHour - effectiveStartHour) * 60));

    // Clamp display positions to slider bounds
    const clampedStart = Math.max(displayMinHour, Math.min(displayMaxHour, effectiveStartHour));
    const clampedEnd = Math.max(displayMinHour, Math.min(displayMaxHour, effectiveEndHour));

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

    const applyPendingDraft = () => {
      rafRef.current = null;
      if (!pendingRef.current) return;
      const next = pendingRef.current;
      pendingRef.current = null;
      setDraftStartTime(next.start);
      setDraftEndTime(next.end);
      latestDraftRef.current = { start: next.start, end: next.end };
    };

    const setDraftThrottled = (start: string, end: string) => {
      pendingRef.current = { start, end };
      // Also update latestDraftRef immediately so endDrag always has latest values
      latestDraftRef.current = { start, end };
      if (rafRef.current === null) {
        rafRef.current = requestAnimationFrame(applyPendingDraft);
      }
    };

    const endDrag = () => {
      setDragType(null);
      dragStateRef.current = null;

      // Use latestDraftRef which is always up-to-date (not React state which may be stale)
      const final = pendingRef.current ?? latestDraftRef.current;

      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
      pendingRef.current = null;

      setDraftStartTime(final.start);
      setDraftEndTime(final.end);
      latestDraftRef.current = { start: final.start, end: final.end };

      // Commit final times to parent state
      onStartTimeChange(final.start);
      onEndTimeChange(final.end);

      // Prevent the trailing click event from "jumping" the slider after a drag
      window.setTimeout(() => {
        suppressClickRef.current = false;
      }, 0);
    };

    const startDrag = (type: DragType) => (e: React.PointerEvent) => {
      e.preventDefault();
      e.stopPropagation();

      // Suppress the synthetic click that fires after pointerup
      suppressClickRef.current = true;

      const target = e.currentTarget as HTMLElement;
      target.setPointerCapture(e.pointerId);

      const pointerId = e.pointerId;
      const pointerHour = getHourFromPosition(e.clientX);

      const startHour = getHourFromTime(draftStartTime);
      const endHour = getHourFromTime(draftEndTime);
      const durationHours = Math.max(0.25, endHour - startHour);

      dragStateRef.current = {
        type,
        pointerId,
        startHour,
        endHour,
        durationHours,
        rangeOffsetHours: pointerHour - startHour,
      };

      setDragType(type);

      const handleMove = (ev: PointerEvent) => {
        ev.preventDefault(); // Prevent scroll on touch
        const state = dragStateRef.current;
        if (!state || state.pointerId !== pointerId) return;

        const hour = getHourFromPosition(ev.clientX);

        if (state.type === 'start') {
          const newStart = Math.min(hour, state.endHour - 0.25);
          const start = formatHour(newStart);
          const end = formatHour(state.endHour);
          setDraftThrottled(start, end);
        } else if (state.type === 'end') {
          const newEnd = Math.max(hour, state.startHour + 0.25);
          const start = formatHour(state.startHour);
          const end = formatHour(newEnd);
          setDraftThrottled(start, end);
        } else {
          // range drag - keep duration constant
          const duration = state.durationHours;
          let newStart = hour - state.rangeOffsetHours;
          let newEnd = newStart + duration;

          if (newStart < displayMinHour) {
            newStart = displayMinHour;
            newEnd = displayMinHour + duration;
          }
          if (newEnd > displayMaxHour) {
            newEnd = displayMaxHour;
            newStart = displayMaxHour - duration;
          }

          setDraftThrottled(formatHour(newStart), formatHour(newEnd));
        }
      };

      const handleUp = (ev: PointerEvent) => {
        target.releasePointerCapture(ev.pointerId);
        if (dragStateRef.current?.pointerId !== pointerId) return;
        window.removeEventListener('pointermove', handleMove);
        window.removeEventListener('pointerup', handleUp);
        endDrag();
      };

      window.addEventListener('pointermove', handleMove, { passive: false });
      window.addEventListener('pointerup', handleUp);
    };

    // Hour markers for display
    const hourMarkers = useMemo(
      () => Array.from({ length: totalDisplayHours + 1 }, (_, i) => displayMinHour + i),
      [totalDisplayHours],
    );

    const formatDuration = (mins: number) => {
      if (mins < 60) return `${mins} min`;
      const hours = Math.floor(mins / 60);
      const remainingMins = mins % 60;
      if (remainingMins === 0) return `${hours}h`;
      return `${hours}h ${remainingMins}m`;
    };

    const handleClickTrack = (e: React.MouseEvent) => {
      if (dragType || suppressClickRef.current) return;
      const hour = getHourFromPosition(e.clientX);
      const startH = getHourFromTime(draftStartTime);
      const endH = getHourFromTime(draftEndTime);

      const distToStart = Math.abs(hour - startH);
      const distToEnd = Math.abs(hour - endH);

      if (distToStart < distToEnd) {
        const newStart = Math.min(hour, endH - 0.25);
        const nextStart = formatHour(newStart);
        setDraftStartTime(nextStart);
        latestDraftRef.current = { start: nextStart, end: latestDraftRef.current.end };
        onStartTimeChange(nextStart);
      } else {
        const newEnd = Math.max(hour, startH + 0.25);
        const nextEnd = formatHour(newEnd);
        setDraftEndTime(nextEnd);
        latestDraftRef.current = { start: latestDraftRef.current.start, end: nextEnd };
        onEndTimeChange(nextEnd);
      }
    };

    return (
      <div ref={ref} className="space-y-4">
        {/* Time display with clickable selectors */}
        <div className="flex justify-between items-center">
          <div className="text-center">
            <div className="text-xs text-foreground-muted mb-1">Start</div>
            <Select
              value={draftStartTime}
              onValueChange={(val) => {
                setDraftStartTime(val);
                latestDraftRef.current = { start: val, end: latestDraftRef.current.end };
                onStartTimeChange(val);
              }}
            >
              <SelectTrigger className="h-auto w-auto border-0 bg-transparent p-0 text-xl font-semibold hover:text-highlight transition-colors focus:ring-0 focus:ring-offset-0">
                <SelectValue>{formatDisplayTime(draftStartTime)}</SelectValue>
              </SelectTrigger>
              <SelectContent className="max-h-64">
                {timeOptions.map((time) => (
                  <SelectItem key={time} value={time} disabled={time >= draftEndTime}>
                    {formatDisplayTime(time)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex-1 text-center">
            <div className="text-xs text-foreground-muted mb-1">Duration</div>
            <div className="text-sm font-medium text-foreground-muted">{formatDuration(durationMinutes)}</div>
          </div>

          <div className="text-center">
            <div className="text-xs text-foreground-muted mb-1">End</div>
            <Select
              value={draftEndTime}
              onValueChange={(val) => {
                setDraftEndTime(val);
                latestDraftRef.current = { start: latestDraftRef.current.start, end: val };
                onEndTimeChange(val);
              }}
            >
              <SelectTrigger className="h-auto w-auto border-0 bg-transparent p-0 text-xl font-semibold hover:text-highlight transition-colors focus:ring-0 focus:ring-offset-0">
                <SelectValue>{formatDisplayTime(draftEndTime)}</SelectValue>
              </SelectTrigger>
              <SelectContent className="max-h-64">
                {timeOptions.map((time) => (
                  <SelectItem key={time} value={time} disabled={time <= draftStartTime}>
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
            {hourMarkers
              .filter((_, i) => i % 2 === 0)
              .map((hour) => (
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
            onClick={handleClickTrack}
          >
            {/* Selected range */}
            <div
              className={cn(
                'absolute top-0 bottom-0 bg-highlight/25 rounded cursor-grab active:cursor-grabbing transition-colors touch-none',
                dragType === 'range' && 'bg-highlight/35'
              )}
              style={{
                left: `${startPercent}%`,
                width: `${rangeWidth}%`,
              }}
              onPointerDown={startDrag('range')}
            />

            {/* Start handle */}
            <div
              className={cn(
                'absolute top-1/2 -translate-y-1/2 w-4 h-9 bg-highlight rounded cursor-ew-resize shadow-md transition-all touch-none flex items-center justify-center',
                dragType === 'start' && 'scale-110 shadow-lg'
              )}
              style={{ left: `calc(${startPercent}% - 8px)` }}
              onPointerDown={startDrag('start')}
            >
              <div className="w-0.5 h-4 bg-highlight-foreground/60 rounded-full" />
            </div>

            {/* End handle */}
            <div
              className={cn(
                'absolute top-1/2 -translate-y-1/2 w-4 h-9 bg-highlight rounded cursor-ew-resize shadow-md transition-all touch-none flex items-center justify-center',
                dragType === 'end' && 'scale-110 shadow-lg'
              )}
              style={{ left: `calc(${endPercent}% - 8px)` }}
              onPointerDown={startDrag('end')}
            >
              <div className="w-0.5 h-4 bg-highlight-foreground/60 rounded-full" />
            </div>
          </div>
        </div>

        {/* Quick duration buttons */}
        <div className="flex gap-2 justify-center">
          {[15, 30, 60, 120, 180].map((mins) => (
            <button
              key={mins}
              onClick={() => {
                const startH = getHourFromTime(draftStartTime);
                const newEnd = startH + mins / 60;
                if (newEnd <= displayMaxHour) {
                  const nextEnd = formatHour(newEnd);
                  setDraftEndTime(nextEnd);
                  latestDraftRef.current = { start: latestDraftRef.current.start, end: nextEnd };
                  onEndTimeChange(nextEnd);
                }
              }}
              className={cn(
                'px-3 py-1.5 text-xs rounded-lg border border-border/60 hover:bg-secondary transition-colors',
                durationMinutes === mins && 'bg-highlight/15 border-highlight/40 text-highlight'
              )}
            >
              {mins < 60 ? `${mins}m` : `${mins / 60}h`}
            </button>
          ))}
        </div>
      </div>
    );
  },
);

TaskTimeSelector.displayName = 'TaskTimeSelector';

export default TaskTimeSelector;
