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
  width?: number; // Current width in percentage
  baseWidth?: number; // Base width percentage (for overlapping tasks)
  minWidth?: number; // Minimum width percentage
  maxWidth?: number; // Maximum width percentage
  onWidthChange?: (newWidth: number) => void; // Legacy callback when width changes
  // Split-pane resize props
  canResizeLeft?: boolean; // Can resize left edge (has left neighbor)
  canResizeRight?: boolean; // Can resize right edge (has right neighbor)
  onResizeLeft?: (deltaPercent: number) => void; // Called with delta when resizing left
  onResizeRight?: (deltaPercent: number) => void; // Called with delta when resizing right
  canMoveLeft?: boolean;
  canMoveRight?: boolean;
  onMoveLeft?: () => void;
  onMoveRight?: () => void;
  showTooltip?: boolean; // Whether to show hover tooltip
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
  width,
  baseWidth = 100,
  minWidth = 20,
  maxWidth = 100,
  onWidthChange,
  canResizeLeft = false,
  canResizeRight = false,
  onResizeLeft,
  onResizeRight,
  canMoveLeft,
  canMoveRight,
  onMoveLeft,
  onMoveRight,
  showTooltip = true,
}: CalendarTaskProps) => {
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [resizeDirection, setResizeDirection] = useState<'top' | 'bottom' | 'left' | 'right' | null>(null);
  const [resizePreviewHeight, setResizePreviewHeight] = useState<number | null>(null);
  const [resizePreviewTop, setResizePreviewTop] = useState<number | null>(null);
  const [resizePreviewWidth, setResizePreviewWidth] = useState<number | null>(null);
  const resizeStartY = useRef<number>(0);
  const resizeStartX = useRef<number>(0);
  const resizeStartHeight = useRef<number>(0);
  const resizeStartTop = useRef<number>(0);
  const resizeStartWidth = useRef<number>(0);
  const containerRef = useRef<HTMLDivElement>(null);

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

    let raf: number | null = null;
    let pendingHeight = height;

    const applyPreview = () => {
      raf = null;
      setResizePreviewHeight(pendingHeight);
    };

    const handleMove = (ev: PointerEvent) => {
      const deltaY = ev.clientY - resizeStartY.current;
      pendingHeight = Math.max(22, resizeStartHeight.current + deltaY);
      if (raf === null) raf = requestAnimationFrame(applyPreview);
    };

    const handleUp = (ev: PointerEvent) => {
      window.removeEventListener('pointermove', handleMove);
      window.removeEventListener('pointerup', handleUp);

      if (raf !== null) {
        cancelAnimationFrame(raf);
        raf = null;
      }

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

    let raf: number | null = null;
    let pendingHeight = height;
    let pendingTop = 0;

    const applyPreview = () => {
      raf = null;
      setResizePreviewHeight(pendingHeight);
      setResizePreviewTop(pendingTop);
    };

    const handleMove = (ev: PointerEvent) => {
      const deltaY = ev.clientY - resizeStartY.current;
      pendingHeight = Math.max(22, resizeStartHeight.current - deltaY);
      pendingTop = deltaY;
      if (raf === null) raf = requestAnimationFrame(applyPreview);
    };

    const handleUp = (ev: PointerEvent) => {
      window.removeEventListener('pointermove', handleMove);
      window.removeEventListener('pointerup', handleUp);

      if (raf !== null) {
        cancelAnimationFrame(raf);
        raf = null;
      }

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

  // Throttle resize updates with RAF for smooth performance
  const rafRef = useRef<number | null>(null);
  const pendingDeltaRef = useRef<number>(0);

  // Handle right resize (split-pane style - steals from right neighbor)
  const handleResizeRightStart = useCallback((e: React.PointerEvent) => {
    if (!onResizeRight && !onWidthChange) return;
    
    e.preventDefault();
    e.stopPropagation();
    
    setIsResizing(true);
    setResizeDirection('right');
    resizeStartX.current = e.clientX;
    resizeStartWidth.current = width ?? 100;
    
    // Get container width for percentage calculation
    const parentElement = containerRef.current?.parentElement;
    const grandParentElement = parentElement?.parentElement;
    const containerWidth = grandParentElement?.offsetWidth || parentElement?.offsetWidth || 400;
    
    let lastDelta = 0;
    
    const applyResize = () => {
      const deltaPercent = pendingDeltaRef.current;
      if (Math.abs(deltaPercent - lastDelta) < 0.5) return;
      lastDelta = deltaPercent;
      
      if (onResizeRight) {
        onResizeRight(deltaPercent);
      } else if (onWidthChange) {
        const newWidth = Math.max(minWidth, Math.min(maxWidth, resizeStartWidth.current + deltaPercent));
        onWidthChange(newWidth);
      }
    };
    
    const handleMove = (ev: PointerEvent) => {
      const deltaX = ev.clientX - resizeStartX.current;
      pendingDeltaRef.current = (deltaX / containerWidth) * 100;
      
      if (rafRef.current === null) {
        rafRef.current = requestAnimationFrame(() => {
          applyResize();
          rafRef.current = null;
        });
      }
    };
    
    const handleUp = () => {
      window.removeEventListener('pointermove', handleMove);
      window.removeEventListener('pointerup', handleUp);
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
      // Final apply
      applyResize();
      
      setIsResizing(false);
      setResizeDirection(null);
    };
    
    window.addEventListener('pointermove', handleMove);
    window.addEventListener('pointerup', handleUp);
  }, [width, minWidth, maxWidth, onWidthChange, onResizeRight]);

  // Handle left resize (split-pane style - steals from left neighbor)
  const handleResizeLeftStart = useCallback((e: React.PointerEvent) => {
    if (!onResizeLeft && !onWidthChange) return;
    
    e.preventDefault();
    e.stopPropagation();
    
    setIsResizing(true);
    setResizeDirection('left');
    resizeStartX.current = e.clientX;
    resizeStartWidth.current = width ?? 100;
    
    const parentElement = containerRef.current?.parentElement;
    const grandParentElement = parentElement?.parentElement;
    const containerWidth = grandParentElement?.offsetWidth || parentElement?.offsetWidth || 400;
    
    let lastDelta = 0;
    
    const applyResize = () => {
      const deltaPercent = pendingDeltaRef.current;
      if (Math.abs(deltaPercent - lastDelta) < 0.5) return;
      lastDelta = deltaPercent;
      
      if (onResizeLeft) {
        onResizeLeft(deltaPercent);
      } else if (onWidthChange) {
        const newWidth = Math.max(minWidth, Math.min(maxWidth, resizeStartWidth.current + deltaPercent));
        onWidthChange(newWidth);
      }
    };
    
    const handleMove = (ev: PointerEvent) => {
      const deltaX = resizeStartX.current - ev.clientX; // Inverted for left resize
      pendingDeltaRef.current = (deltaX / containerWidth) * 100;
      
      if (rafRef.current === null) {
        rafRef.current = requestAnimationFrame(() => {
          applyResize();
          rafRef.current = null;
        });
      }
    };
    
    const handleUp = () => {
      window.removeEventListener('pointermove', handleMove);
      window.removeEventListener('pointerup', handleUp);
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
      // Final apply
      applyResize();
      
      setIsResizing(false);
      setResizeDirection(null);
    };
    
    window.addEventListener('pointermove', handleMove);
    window.addEventListener('pointerup', handleUp);
  }, [width, minWidth, maxWidth, onWidthChange, onResizeLeft]);
  const displayHeight = resizePreviewHeight ?? height;
  const isCompact = displayHeight < 36;
  const isMedium = displayHeight >= 36 && displayHeight < 60;
  const isLarge = displayHeight >= 60 && displayHeight < 100;
  const isExtraLarge = displayHeight >= 100;
  
  // Show full title (no truncate) when there's enough vertical space
  const allowTitleWrap = displayHeight >= 80;
  const canShowTime = displayHeight >= 48;
  const showDescription = displayHeight >= 100 && !!task.description;
  
  // Calculate max lines for title based on height
  const titleMaxLines = isExtraLarge ? 3 : isLarge ? 2 : 1;

  // Handle double-click to open edit dialog
  const handleDoubleClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    setEditDialogOpen(true);
  }, []);

  // Calculate display width
  const displayWidth = resizePreviewWidth ?? width;
  // Can resize horizontally if we have split-pane handlers OR legacy handler
  const canResizeHorizontallyLeft = canResizeLeft || !!onWidthChange;
  const canResizeHorizontallyRight = canResizeRight || !!onWidthChange;

  return (
    <>
      <TooltipProvider delayDuration={300}>
        <Tooltip>
          <TooltipTrigger asChild>
            <div
              ref={(node) => {
                setNodeRef(node);
                (containerRef as React.MutableRefObject<HTMLDivElement | null>).current = node;
              }}
              style={{
                ...style,
                height: resizePreviewHeight ? `${resizePreviewHeight}px` : undefined,
                marginTop: resizePreviewTop !== null ? `${resizePreviewTop}px` : undefined,
              }}
              {...attributes}
              {...listeners}
              onDoubleClick={handleDoubleClick}
              className={cn(
                'group relative h-full rounded-lg border-l-[3px] shadow-sm overflow-hidden',
                'hover:shadow-md hover:brightness-105',
                !isResizing && 'cursor-grab active:cursor-grabbing transition-all',
                isResizing && 'transition-none', // Disable transitions during resize for smoothness
                energyBorderColors[task.energy_level],
                energyBgColors[task.energy_level],
                isDragging && 'opacity-60 shadow-lg ring-2 ring-highlight',
                isResizing && 'ring-2 ring-highlight shadow-lg z-50',
                task.completed && 'opacity-50'
              )}
            >
              {/* Left resize handle - for split-pane resize */}
              {canResizeHorizontallyLeft && (
                <div
                  className={cn(
                    'absolute left-0 top-0 bottom-0 w-2 cursor-ew-resize flex items-center justify-center z-20',
                    'opacity-0 group-hover:opacity-100 transition-opacity hover:bg-primary/20',
                    isResizing && resizeDirection === 'left' && 'opacity-100 bg-primary/30'
                  )}
                  onPointerDown={handleResizeLeftStart}
                  onMouseDown={(e) => e.stopPropagation()}
                >
                  <div className="h-8 w-0.5 rounded-full bg-foreground/40" />
                </div>
              )}

              {/* Right resize handle - for split-pane resize */}
              {canResizeHorizontallyRight && (
                <div
                  className={cn(
                    'absolute right-0 top-0 bottom-0 w-2 cursor-ew-resize flex items-center justify-center z-20',
                    'opacity-0 group-hover:opacity-100 transition-opacity hover:bg-primary/20',
                    isResizing && resizeDirection === 'right' && 'opacity-100 bg-primary/30'
                  )}
                  onPointerDown={handleResizeRightStart}
                  onMouseDown={(e) => e.stopPropagation()}
                >
                  <div className="h-8 w-0.5 rounded-full bg-foreground/40" />
                </div>
              )}

              {/* Top resize handle */}
              <div
                className={cn(
                  'absolute top-0 left-0 right-0 h-2.5 cursor-ns-resize flex items-center justify-center z-10',
                  'opacity-0 group-hover:opacity-100 transition-opacity',
                  isResizing && resizeDirection === 'top' && 'opacity-100'
                )}
                onPointerDown={handleResizeTopStart}
                onMouseDown={(e) => e.stopPropagation()}
              >
                <div className="w-6 h-0.5 rounded-full bg-foreground/40" />
              </div>

              {/* Main content */}
              <div
                className={cn(
                  'h-full flex flex-col overflow-hidden',
                  (canMoveLeft || canMoveRight) ? 'pl-7 pr-2.5' : 'px-2.5',
                  isCompact ? 'py-1 justify-center' : 'pt-2.5 pb-2',
                  task.completed && 'line-through opacity-70'
                )}
              >
                {/* Title */}
                <div
                  className={cn(
                    'font-medium leading-tight',
                    isCompact ? 'text-[11px]' : 'text-[13px]',
                    allowTitleWrap 
                      ? `line-clamp-${titleMaxLines}` 
                      : 'truncate'
                  )}
                  style={allowTitleWrap ? { 
                    display: '-webkit-box',
                    WebkitLineClamp: titleMaxLines,
                    WebkitBoxOrient: 'vertical',
                    overflow: 'hidden'
                  } : undefined}
                >
                  {task.title}
                </div>

                {/* Time range - subtle, below title */}
                {canShowTime && showTimeRange && task.start_time && (
                  <div className={cn(
                    'text-[10px] font-medium tabular-nums opacity-60 mt-0.5',
                    isCompact && 'hidden'
                  )}>
                    {getTimeRange()}
                  </div>
                )}

                {/* Description - muted, spaced */}
                {showDescription && (
                  <div className="mt-2 text-[11px] opacity-50 line-clamp-3 leading-relaxed">
                    {task.description}
                  </div>
                )}
              </div>

              {/* Reorder buttons - kept in top area, but text has reserved padding */}
              {(canMoveLeft || canMoveRight) && (
                <div className={cn(
                  'absolute left-1 top-5 flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity z-10'
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
          {showTooltip && (
            <TooltipContent side="top" className="max-w-[200px]">
              <p className="font-medium">{task.title}</p>
              {task.start_time && (
                <p className="text-xs text-muted-foreground">{getTimeRange()}</p>
              )}
              {task.description && (
                <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{task.description}</p>
              )}
            </TooltipContent>
          )}
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
