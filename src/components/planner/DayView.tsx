import { useState, useEffect, useRef, useMemo, useCallback, memo } from 'react';
import { format, startOfDay, addHours, addDays, isToday } from 'date-fns';
import { cn } from '@/lib/utils';
import { parseTimeToHours } from '@/lib/timeUtils';
import { EnergyLevel, Task } from '@/types';
import { ChevronLeft, ChevronRight, Plus, ArrowLeftRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import QuickAddTask from '@/components/tasks/QuickAddTask';
import CalendarTask from '@/components/tasks/CalendarTask';
import DraggableUntimedTask from '@/components/tasks/DraggableUntimedTask';
import CreateTaskDialog from '@/components/tasks/CreateTaskDialog';
import CurrentTimeIndicator from '@/components/planner/CurrentTimeIndicator';
import { useDroppable } from '@dnd-kit/core';
import { useTasksContext } from '@/contexts/TasksContext';
import { useIsMobile } from '@/hooks/use-mobile';
import { supabase } from '@/integrations/supabase/client';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface DayViewProps {
  date: Date;
  currentEnergy: EnergyLevel;
  energyFilter?: EnergyLevel[];
  onBack: () => void;
  showHourFocus?: boolean;
  timezone?: string;
}

interface TimeSlotDropZoneProps {
  hour: number;
  date: Date;
  children: React.ReactNode;
}

const TimeSlotDropZone = memo(({ hour, date, children }: TimeSlotDropZoneProps) => {
  const { setNodeRef, isOver } = useDroppable({
    id: `time-slot-${hour}`,
    data: { hour, type: 'time-slot', date },
  });

  return (
    <div
      ref={setNodeRef}
      className={cn(
        'transition-colors',
        isOver && 'bg-primary/10 ring-1 ring-primary/30'
      )}
    >
      {children}
    </div>
  );
});

TimeSlotDropZone.displayName = 'TimeSlotDropZone';

const DayView = ({ date, currentEnergy, energyFilter = [], onBack, showHourFocus = false, timezone = 'UTC' }: DayViewProps) => {
  const [userId, setUserId] = useState<string | null>(null);
  const [addingAtHour, setAddingAtHour] = useState<number | null>(null);
  const [isDraggingToCreate, setIsDraggingToCreate] = useState(false);
  const [dragStartHour, setDragStartHour] = useState<number | null>(null);
  const [dragEndHour, setDragEndHour] = useState<number | null>(null);
  const [currentDate, setCurrentDate] = useState(date);
  const timeGridRef = useRef<HTMLDivElement>(null);
  const isMobile = useIsMobile();

  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [createTimeRange, setCreateTimeRange] = useState<{ start: string; end: string } | null>(null);

  const { tasks: allTasks, addTask, updateTask, deleteTask } = useTasksContext();

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUserId(data.user?.id || null);
    });
  }, []);

  useEffect(() => {
    setCurrentDate(date);
  }, [date]);

  const dateStr = format(currentDate, 'yyyy-MM-dd');
  
  // Filter tasks for current date from the centralized context
  const tasks = useMemo(() => 
    allTasks.filter(t => t.due_date === dateStr),
    [allTasks, dateStr]
  );

  // Disable drag-to-create on mobile (use tap instead)
  const handleMouseDown = useCallback((hour: number, e: React.MouseEvent) => {
    if (isMobile || isDraggingToCreate) return;

    const target = e.target as HTMLElement;
    if (target.closest('.task-item')) return;
    if (target.closest('button, a, input, textarea, select, [role="button"], [data-no-drag-create]')) return;
    if ((e as unknown as MouseEvent).button !== 0) return;

    e.preventDefault();

    const startHour = hour;
    let endHour = hour;
    let moved = false;

    setIsDraggingToCreate(true);
    setDragStartHour(startHour);
    setDragEndHour(endHour);

    const HOUR_HEIGHT = isMobile ? 60 : 48;

    const onMove = (ev: MouseEvent) => {
      if (!timeGridRef.current) return;
      moved = true;

      const rect = timeGridRef.current.getBoundingClientRect();
      const relativeY = ev.clientY - rect.top;
      const hoveredHour = Math.floor(relativeY / HOUR_HEIGHT) + 6;
      const clampedHour = Math.max(6, Math.min(22, hoveredHour));

      endHour = clampedHour;
      setDragEndHour(clampedHour);
    };

    const onUp = () => {
      window.removeEventListener('mousemove', onMove);

      if (!moved) {
        setIsDraggingToCreate(false);
        setDragStartHour(null);
        setDragEndHour(null);
        return;
      }

      const rangeStart = Math.min(startHour, endHour);
      const rangeEnd = Math.max(startHour, endHour) + 1;

      const timeRange = {
        start: `${rangeStart.toString().padStart(2, '0')}:00`,
        end: `${rangeEnd.toString().padStart(2, '0')}:00`,
      };

      setCreateTimeRange(timeRange);
      setShowCreateDialog(true);

      setIsDraggingToCreate(false);
      setDragStartHour(null);
      setDragEndHour(null);
    };

    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp, { once: true });
  }, [isMobile, isDraggingToCreate]);

  // Mobile: tap to add at hour
  const handleTapToAdd = useCallback((hour: number) => {
    if (!isMobile) return;
    setCreateTimeRange({
      start: `${hour.toString().padStart(2, '0')}:00`,
      end: `${(hour + 1).toString().padStart(2, '0')}:00`,
    });
    setShowCreateDialog(true);
  }, [isMobile]);

  const handleQuickAdd = useCallback(async (task: {
    title: string;
    energy: EnergyLevel;
    date?: string;
    startTime?: string;
    endTime?: string;
    endDate?: string;
  }) => {
    await addTask({
      title: task.title,
      energy_level: task.energy,
      due_date: task.date || dateStr,
      start_time: task.startTime,
      end_time: task.endTime,
      end_date: task.endDate,
    });
    setAddingAtHour(null);
  }, [addTask, dateStr]);

  const handleCreateFromDrag = useCallback(async (
    title: string,
    energy: EnergyLevel,
    startTime?: string,
    endTime?: string,
    options?: { description?: string; location?: string; isShared?: boolean }
  ) => {
    await addTask({
      title,
      energy_level: energy,
      due_date: dateStr,
      start_time: startTime,
      end_time: endTime,
      description: options?.description,
      location: options?.location,
      is_shared: options?.isShared,
    });
    setShowCreateDialog(false);
    setCreateTimeRange(null);
  }, [addTask, dateStr]);

  const handlePrevDay = useCallback(() => {
    setCurrentDate(prev => addDays(prev, -1));
  }, []);

  const handleNextDay = useCallback(() => {
    setCurrentDate(prev => addDays(prev, 1));
  }, []);

  const filteredTasks = useMemo(() => 
    energyFilter.length > 0
      ? tasks.filter(t => energyFilter.includes(t.energy_level))
      : tasks,
    [tasks, energyFilter]
  );

  const untimedTasks = useMemo(() => filteredTasks.filter(t => !t.start_time), [filteredTasks]);
  const timedTasks = useMemo(() => filteredTasks.filter(t => t.start_time), [filteredTasks]);

  const hours = useMemo(() => Array.from({ length: 17 }, (_, i) => i + 6), []);
  const HOUR_HEIGHT = isMobile ? 60 : 48;

  const selectionStart = dragStartHour !== null && dragEndHour !== null
    ? Math.min(dragStartHour, dragEndHour)
    : null;
  const selectionEnd = dragStartHour !== null && dragEndHour !== null
    ? Math.max(dragStartHour, dragEndHour)
    : null;

  const getTaskPosition = useCallback((task: Task) => {
    const startHour = parseTimeToHours(task.start_time);
    if (startHour === null) return null;
    
    let endHour = startHour + 1;
    const parsedEnd = parseTimeToHours(task.end_time);
    if (parsedEnd !== null) {
      endHour = parsedEnd;
    }
    
    const duration = endHour - startHour;
    const top = (startHour - 6) * HOUR_HEIGHT;
    const height = duration * HOUR_HEIGHT;
    
    return { top, height, startHour, endHour, duration };
  }, [HOUR_HEIGHT]);

  const overlappingGroups = useMemo(() => {
    const groups: Task[][] = [];
    const sortedTasks = [...timedTasks].sort((a, b) => {
      const posA = getTaskPosition(a);
      const posB = getTaskPosition(b);
      // First by start time
      const startDiff = (posA?.startHour || 0) - (posB?.startHour || 0);
      if (startDiff !== 0) return startDiff;
      // Then by display_order for same start time
      return (a.display_order || 0) - (b.display_order || 0);
    });

    for (const task of sortedTasks) {
      const taskPos = getTaskPosition(task);
      if (!taskPos) continue;

      let foundGroup = false;
      for (const group of groups) {
        const groupEnd = Math.max(...group.map(t => getTaskPosition(t)?.endHour || 0));
        const groupStart = Math.min(...group.map(t => getTaskPosition(t)?.startHour || 0));
        
        if (taskPos.startHour < groupEnd && taskPos.endHour > groupStart) {
          group.push(task);
          foundGroup = true;
          break;
        }
      }

      if (!foundGroup) {
        groups.push([task]);
      }
    }

    // Sort each group by display_order for reordering
    groups.forEach(group => {
      group.sort((a, b) => (a.display_order || 0) - (b.display_order || 0));
    });

    return groups;
  }, [timedTasks, getTaskPosition]);

  return (
    <div className="animate-fade-in">
      <div className="flex items-center justify-between mb-4 gap-2">
        <div className="flex items-center gap-2 sm:gap-4 min-w-0">
          <Button variant="ghost" size="sm" onClick={onBack} className="gap-1 flex-shrink-0">
            <ChevronLeft className="w-4 h-4" />
            <span className="hidden sm:inline">Back</span>
          </Button>
          <div className="min-w-0">
            <h2 className="text-lg sm:text-xl font-medium tracking-tight text-foreground truncate">
              {format(currentDate, 'EEEE')}
            </h2>
            <p className="text-sm text-foreground-muted">{format(currentDate, 'MMM d, yyyy')}</p>
          </div>
        </div>
        <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
          <Button variant="outline" size="sm" onClick={handlePrevDay} className="min-w-[44px] min-h-[44px] p-0 sm:p-2">
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={handleNextDay} className="min-w-[44px] min-h-[44px] p-0 sm:p-2">
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Mobile: stacked layout. Desktop: side-by-side */}
      <div className={cn("flex gap-4", isMobile ? "flex-col" : "flex-row")}>
        {/* Time grid */}
        <div className={cn("flex-1", isMobile && "order-2")}>
          <div 
            ref={timeGridRef} 
            className="border-l border-border select-none relative" 
            style={{ height: `${hours.length * HOUR_HEIGHT}px` }}
          >
            {isToday(currentDate) && (
              <CurrentTimeIndicator startHour={6} hourHeight={HOUR_HEIGHT} timezone={timezone} />
            )}

            {hours.map(hour => {
              const isInSelection = selectionStart !== null &&
                selectionEnd !== null &&
                hour >= selectionStart &&
                hour <= selectionEnd;

              const timeStr = format(addHours(startOfDay(currentDate), hour), 'h a');

              return (
                <TimeSlotDropZone key={hour} hour={hour} date={currentDate}>
                  <div
                    className={cn(
                      'group relative border-b border-border/50 transition-all',
                      !isMobile && 'cursor-crosshair',
                      isInSelection && 'bg-highlight/20 ring-1 ring-highlight/50'
                    )}
                    style={{ height: `${HOUR_HEIGHT}px` }}
                    onMouseDown={(e) => handleMouseDown(hour, e)}
                    onClick={() => handleTapToAdd(hour)}
                  >
                    <div className="absolute left-0 top-0 w-10 sm:w-12 text-[10px] sm:text-[11px] tabular-nums text-foreground-muted py-0.5 pointer-events-none">
                      {timeStr}
                    </div>

                    {!isDraggingToCreate && !isMobile && (
                      <div className="absolute inset-0 ml-14 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                        <div className="flex items-center gap-1 text-[11px] text-foreground-muted">
                          <Plus className="w-3 h-3" />
                          Drag to create
                        </div>
                      </div>
                    )}

                    {isMobile && (
                      <div className="absolute inset-0 ml-12 flex items-center justify-center opacity-0 active:opacity-100 transition-opacity pointer-events-none">
                        <div className="flex items-center gap-1 text-[11px] text-foreground-muted">
                          <Plus className="w-3 h-3" />
                          Tap to add
                        </div>
                      </div>
                    )}
                  </div>
                </TimeSlotDropZone>
              );
            })}

            {/* Positioned tasks */}
            <div className={cn("absolute inset-0 pr-2 pointer-events-none", isMobile ? "ml-12" : "ml-14")}>
              {overlappingGroups.map((group, groupIdx) => {
                const columnWidth = 100 / group.length;
                const isMultiTask = group.length > 1;

                return group.map((task, columnIdx) => {
                  const pos = getTaskPosition(task);
                  if (!pos) return null;

                  const taskHeight = Math.max(pos.height - 2, 22);
                  
                  // Reorder handlers - use sequential indices for clear ordering
                  const handleMoveLeft = isMultiTask && columnIdx > 0 ? () => {
                    // Swap positions by exchanging display_order values
                    const leftTask = group[columnIdx - 1];
                    // Use columnIdx as base to ensure distinct values
                    const newLeftOrder = columnIdx * 10;
                    const newCurrentOrder = (columnIdx - 1) * 10;
                    updateTask(task.id, { display_order: newCurrentOrder });
                    updateTask(leftTask.id, { display_order: newLeftOrder });
                  } : undefined;
                  
                  const handleMoveRight = isMultiTask && columnIdx < group.length - 1 ? () => {
                    // Swap positions by exchanging display_order values
                    const rightTask = group[columnIdx + 1];
                    // Use columnIdx as base to ensure distinct values
                    const newRightOrder = columnIdx * 10;
                    const newCurrentOrder = (columnIdx + 1) * 10;
                    updateTask(task.id, { display_order: newCurrentOrder });
                    updateTask(rightTask.id, { display_order: newRightOrder });
                  } : undefined;

                  return (
                    <div
                      key={task.id}
                      className="absolute task-item pointer-events-auto group/task"
                      style={{
                        top: `${pos.top + 1}px`,
                        height: `${taskHeight}px`,
                        left: `calc(${columnIdx * columnWidth}% + 4px)`,
                        width: `calc(${columnWidth}% - 8px)`,
                      }}
                      onMouseDown={(e) => e.stopPropagation()}
                      onPointerDown={(e) => e.stopPropagation()}
                    >
                      <CalendarTask
                        task={task}
                        onUpdate={(updates) => updateTask(task.id, updates)}
                        onDelete={() => deleteTask(task.id)}
                        isShared={task.user_id !== userId}
                        showTimeRange={pos.duration >= 1}
                        height={taskHeight}
                        canMoveLeft={!!handleMoveLeft}
                        canMoveRight={!!handleMoveRight}
                        onMoveLeft={handleMoveLeft}
                        onMoveRight={handleMoveRight}
                      />
                    </div>
                  );
                });
              })}
            </div>
          </div>
        </div>

        {/* Untimed tasks */}
        <div className={cn(
          "shrink-0",
          isMobile ? "order-1 w-full" : "w-64"
        )}>
          <h3 className="text-sm font-medium text-foreground-muted mb-3">
            Untimed Tasks
            {!isMobile && <span className="ml-2 text-xs opacity-60">Drag to schedule</span>}
          </h3>
          <div className={cn(
            "space-y-2",
            isMobile && "grid grid-cols-2 gap-2 space-y-0"
          )}>
            {untimedTasks.map(task => (
              <DraggableUntimedTask
                key={task.id}
                task={task}
                onUpdate={(updates) => updateTask(task.id, updates)}
                onDelete={() => deleteTask(task.id)}
                isShared={task.user_id !== userId}
              />
            ))}
          </div>
          <div className="mt-3">
            <QuickAddTask
              onAdd={handleQuickAdd}
              defaultEnergy={currentEnergy}
              defaultDate={currentDate}
              compact
            />
          </div>
        </div>
      </div>

      <CreateTaskDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
        targetDate={currentDate}
        startTime={createTimeRange?.start}
        endTime={createTimeRange?.end}
        defaultEnergy={currentEnergy}
        onConfirm={handleCreateFromDrag}
      />
    </div>
  );
};

export default DayView;
