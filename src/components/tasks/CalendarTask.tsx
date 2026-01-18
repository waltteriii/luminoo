import { useDraggable } from '@dnd-kit/core';
import { cn } from '@/lib/utils';
import { normalizeTime, parseTimeToHours, formatHoursToTime } from '@/lib/timeUtils';
import { Task, EnergyLevel } from '@/types';
import { format } from 'date-fns';
import { Pencil, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useState, useCallback, useRef } from 'react';
import EditTaskDialog from '@/components/tasks/EditTaskDialog';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface CalendarTaskProps {
  task: Task;
  onUpdate: (updates: Partial<Task>) => void;
  onDelete?: () => void;
  isShared?: boolean;
  showTimeRange?: boolean;
  height: number;
  canMoveLeft?: boolean;
  canMoveRight?: boolean;
  onMoveLeft?: () => void;
  onMoveRight?: () => void;
}

const energyBorderColors: Record<EnergyLevel, string> = {
  high: 'border-l-energy-high',
  medium: 'border-l-energy-medium',
  low: 'border-l-energy-low',
  recovery: 'border-l-energy-recovery',
};

const energyBgColors: Record<EnergyLevel, string> = {
  high: 'bg-energy-high/15 hover:bg-energy-high/25',
  medium: 'bg-energy-medium/15 hover:bg-energy-medium/25',
  low: 'bg-energy-low/15 hover:bg-energy-low/25',
  recovery: 'bg-energy-recovery/15 hover:bg-energy-recovery/25',
};

const CalendarTask = ({
  task,
  onUpdate,
  onDelete,
  isShared,
  showTimeRange = false,
  height,
  canMoveLeft,
  canMoveRight,
  onMoveLeft,
  onMoveRight,
}: CalendarTaskProps) => {
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [resizeDirection, setResizeDirection] = useState<'top' | 'bottom' | null>(null);
  const [resizePreviewHeight, setResizePreviewHeight] = useState<number | null>(null);
  const [resizePreviewTop, setResizePreviewTop] = useState<number | null>(null);
  const resizeStartY = useRef<number>(0);
  const resizeStartHeight = useRef<number>(0);
  const resizeStartTop = useRef<number>(0);

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    isDragging,
  } = useDraggable({
    id: task.id,
    data: { type: 'calendar-task', task },
    disabled: isResizing,
  });

  const style = transform
    ? {
        transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
        zIndex: isDragging ? 1000 : undefined,
      }
    : undefined;

  // Format time range
  const getTimeRange = () => {
    const startNorm = normalizeTime(task.start_time);
    if (!startNorm) return '';
    const startFormatted = format(new Date(`2000-01-01T${startNorm}`), 'h:mm a');
    const endNorm = normalizeTime(task.end_time);
    if (!endNorm) return startFormatted;
    const endFormatted = format(new Date(`2000-01-01T${endNorm}`), 'h:mm a');
    return `${startFormatted} - ${endFormatted}`;
  };

  // Calculate new end time from height change (resize bottom)
  const calculateNewEndTime = useCallback((heightDelta: number) => {
    const startHour = parseTimeToHours(task.start_time);
    if (startHour === null) return null;
    
    const HOUR_HEIGHT = 48;
    const MIN_DURATION_MINS = 15;
    
    const newHeight = Math.max(resizeStartHeight.current + heightDelta, MIN_DURATION_MINS / 60 * HOUR_HEIGHT);
    const durationHours = newHeight / HOUR_HEIGHT;
    
    const durationMins = Math.round(durationHours * 60 / 15) * 15;
    const clampedMins = Math.max(MIN_DURATION_MINS, Math.min(durationMins, 16 * 60));
    
    const startTotalMins = startHour * 60;
    const endTotalMins = startTotalMins + clampedMins;
    
    const endH = Math.floor(endTotalMins / 60);
    const endM = Math.round(endTotalMins % 60);
    
    if (endH >= 22) return '22:00';
    
    return formatHoursToTime(endH + endM / 60);
  }, [task.start_time]);

  // Calculate new start time from height change (resize top)
  const calculateNewStartTime = useCallback((heightDelta: number) => {
    const endHour = parseTimeToHours(task.end_time);
    if (endHour === null) return null;
    
    const HOUR_HEIGHT = 48;
    const MIN_DURATION_MINS = 15;
    
    // Height delta is negative when dragging up (earlier start time)
    const newHeight = Math.max(resizeStartHeight.current - heightDelta, MIN_DURATION_MINS / 60 * HOUR_HEIGHT);
    const durationHours = newHeight / HOUR_HEIGHT;
    
    const durationMins = Math.round(durationHours * 60 / 15) * 15;
    const clampedMins = Math.max(MIN_DURATION_MINS, Math.min(durationMins, 16 * 60));
    
    const endTotalMins = endHour * 60;
    const startTotalMins = endTotalMins - clampedMins;
    
    const startH = Math.floor(startTotalMins / 60);
    const startM = Math.round(startTotalMins % 60);
    
    // Clamp to 6:00 min
    if (startH < 6) return '06:00';
    
    return formatHoursToTime(startH + startM / 60);
  }, [task.end_time]);

  // Handle bottom resize (changes end time)
  const handleResizeBottomStart = useCallback((e: React.PointerEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    setIsResizing(true);
    setResizeDirection('bottom');
    resizeStartY.current = e.clientY;
    resizeStartHeight.current = height;
    
    const handleMove = (ev: PointerEvent) => {
      const deltaY = ev.clientY - resizeStartY.current;
      const newHeight = Math.max(22, resizeStartHeight.current + deltaY);
      setResizePreviewHeight(newHeight);
    };
    
    const handleUp = (ev: PointerEvent) => {
      window.removeEventListener('pointermove', handleMove);
      window.removeEventListener('pointerup', handleUp);
      
      const deltaY = ev.clientY - resizeStartY.current;
      const newEndTime = calculateNewEndTime(deltaY);
      
      if (newEndTime && newEndTime !== task.end_time) {
        onUpdate({ end_time: newEndTime });
      }
      
      setIsResizing(false);
      setResizeDirection(null);
      setResizePreviewHeight(null);
    };
    
    window.addEventListener('pointermove', handleMove);
    window.addEventListener('pointerup', handleUp);
  }, [height, calculateNewEndTime, task.end_time, onUpdate]);

  // Handle top resize (changes start time)
  const handleResizeTopStart = useCallback((e: React.PointerEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    setIsResizing(true);
    setResizeDirection('top');
    resizeStartY.current = e.clientY;
    resizeStartHeight.current = height;
    resizeStartTop.current = 0; // Will be adjusted visually
    
    const handleMove = (ev: PointerEvent) => {
      const deltaY = ev.clientY - resizeStartY.current;
      const newHeight = Math.max(22, resizeStartHeight.current - deltaY);
      setResizePreviewHeight(newHeight);
      setResizePreviewTop(deltaY);
    };
    
    const handleUp = (ev: PointerEvent) => {
      window.removeEventListener('pointermove', handleMove);
      window.removeEventListener('pointerup', handleUp);
      
      const deltaY = ev.clientY - resizeStartY.current;
      const newStartTime = calculateNewStartTime(deltaY);
      
      if (newStartTime && newStartTime !== task.start_time) {
        onUpdate({ start_time: newStartTime });
      }
      
      setIsResizing(false);
      setResizeDirection(null);
      setResizePreviewHeight(null);
      setResizePreviewTop(null);
    };
    
    window.addEventListener('pointermove', handleMove);
    window.addEventListener('pointerup', handleUp);
  }, [height, calculateNewStartTime, task.start_time, onUpdate]);

  // Determine layout based on height
  const displayHeight = resizePreviewHeight ?? height;
  const isCompact = displayHeight < 40;
  const showDetails = displayHeight >= 60;
  const contentPadding = isCompact ? 'py-0.5' : showDetails ? 'py-2' : 'py-1.5';
  const contentJustify = showDetails ? 'justify-start' : 'justify-center';

  // Handle double-click to open edit dialog
  const handleDoubleClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    setEditDialogOpen(true);
  }, []);

  return (
    <>
      <TooltipProvider delayDuration={300}>
        <Tooltip>
          <TooltipTrigger asChild>
            <div
              ref={setNodeRef}
              style={{
                ...style,
                height: resizePreviewHeight ? `${resizePreviewHeight}px` : undefined,
                marginTop: resizePreviewTop !== null ? `${resizePreviewTop}px` : undefined,
              }}
              {...attributes}
              {...listeners}
              onDoubleClick={handleDoubleClick}
              className={cn(
                'group relative h-full rounded-md border-l-2 ring-1 ring-border/40 shadow-sm transition-[box-shadow,opacity] overflow-hidden',
                'hover:shadow-md',
                !isResizing && 'cursor-grab active:cursor-grabbing',
                energyBorderColors[task.energy_level],
                energyBgColors[task.energy_level],
                isDragging && 'opacity-60 shadow-lg ring-1 ring-highlight',
                isResizing && 'ring-2 ring-primary shadow-lg z-50',
                task.completed && 'opacity-50'
              )}
            >
              {/* Top resize handle - changes start time */}
              <div
                className={cn(
                  'absolute top-0 left-0 right-0 h-3 cursor-ns-resize flex items-center justify-center',
                  'opacity-0 group-hover:opacity-100 transition-opacity',
                  'bg-gradient-to-b from-background/60 to-transparent',
                  isResizing && resizeDirection === 'top' && 'opacity-100'
                )}
                onPointerDown={handleResizeTopStart}
                onMouseDown={(e) => e.stopPropagation()}
              >
                <div className="w-8 h-1 rounded-full bg-foreground/30" />
              </div>

              <div
                className={cn(
                  'h-full flex flex-col px-2 leading-snug',
                  contentJustify,
                  contentPadding,
                  task.completed && 'line-through'
                )}
              >
                {/* Title */}
                <div
                  className={cn(
                    'font-medium truncate tracking-tight',
                    isCompact ? 'text-[12px]' : 'text-[13px]'
                  )}
                >
                  {task.title}
                </div>

                {/* Time range - show if enough space */}
                {showDetails && showTimeRange && task.start_time && (
                  <div className="mt-1 text-[11px] tabular-nums text-foreground-muted truncate">
                    {getTimeRange()}
                  </div>
                )}
              </div>

              {/* Reorder buttons - centered vertically for better visibility */}
              {(canMoveLeft || canMoveRight) && (
                <div className={cn(
                  'absolute left-1 top-1/2 -translate-y-1/2 flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity z-10'
                )}>
                  {canMoveLeft && (
                    <Button
                      variant="secondary"
                      size="icon"
                      className="h-5 w-5 bg-background/95 hover:bg-primary hover:text-primary-foreground shadow-md transition-all"
                      onClick={(e) => {
                        e.stopPropagation();
                        e.preventDefault();
                        onMoveLeft?.();
                      }}
                      onMouseDown={(e) => e.stopPropagation()}
                      onPointerDown={(e) => e.stopPropagation()}
                      title="Move left"
                    >
                      <ChevronLeft className="w-3 h-3" />
                    </Button>
                  )}
                  {canMoveRight && (
                    <Button
                      variant="secondary"
                      size="icon"
                      className="h-5 w-5 bg-background/95 hover:bg-primary hover:text-primary-foreground shadow-md transition-all"
                      onClick={(e) => {
                        e.stopPropagation();
                        e.preventDefault();
                        onMoveRight?.();
                      }}
                      onMouseDown={(e) => e.stopPropagation()}
                      onPointerDown={(e) => e.stopPropagation()}
                      title="Move right"
                    >
                      <ChevronRight className="w-3 h-3" />
                    </Button>
                  )}
                </div>
              )}

              {/* Edit button - appears on hover */}
              <Button
                variant="secondary"
                size="icon"
                className={cn(
                  'absolute top-1 right-1 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity',
                  'bg-background/90 hover:bg-background shadow-sm'
                )}
                onClick={(e) => {
                  e.stopPropagation();
                  e.preventDefault();
                  setEditDialogOpen(true);
                }}
                onMouseDown={(e) => e.stopPropagation()}
                onPointerDown={(e) => e.stopPropagation()}
              >
                <Pencil className="w-3 h-3" />
              </Button>

              {/* Bottom resize handle - changes end time */}
              <div
                className={cn(
                  'absolute bottom-0 left-0 right-0 h-3 cursor-ns-resize flex items-center justify-center',
                  'opacity-0 group-hover:opacity-100 transition-opacity',
                  'bg-gradient-to-t from-background/60 to-transparent',
                  isResizing && resizeDirection === 'bottom' && 'opacity-100'
                )}
                onPointerDown={handleResizeBottomStart}
                onMouseDown={(e) => e.stopPropagation()}
              >
                <div className="w-8 h-1 rounded-full bg-foreground/30" />
              </div>
            </div>
          </TooltipTrigger>
          <TooltipContent side="top" className="max-w-[200px]">
            <p className="font-medium">{task.title}</p>
            {task.start_time && (
              <p className="text-xs text-muted-foreground">{getTimeRange()}</p>
            )}
            {task.description && (
              <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{task.description}</p>
            )}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>

      <EditTaskDialog
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        task={task}
        onSave={(taskId, updates) => onUpdate(updates)}
        onDelete={onDelete}
      />
    </>
  );
};

export default CalendarTask;
