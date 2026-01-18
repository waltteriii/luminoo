import { useState, useEffect, useRef, useMemo, useCallback, memo } from 'react';
import { format, startOfDay, addHours, addDays, isToday } from 'date-fns';
import { cn } from '@/lib/utils';
import { parseTimeToHours } from '@/lib/timeUtils';
import { EnergyLevel, Task } from '@/types';
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react';
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
import { useDndContext } from '@/components/dnd/DndProvider';
import { useDensity } from '@/contexts/DensityContext';
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
  onLayoutResetChange?: (canReset: boolean, resetFn: () => void) => void;
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

  const { activeTaskDuration, activeTask } = useDndContext();
  
  // Calculate if this slot should be highlighted based on active task duration
  const durationHours = activeTaskDuration ?? 1;

  return (
    <div
      ref={setNodeRef}
      className={cn(
        'transition-colors relative',
        isOver && 'bg-primary/10 ring-1 ring-primary/30'
      )}
    >
      {children}
      {/* Duration-matching highlight overlay */}
      {isOver && activeTask && durationHours > 1 && (
        <div 
          className="absolute left-14 right-2 bg-primary/15 border-2 border-dashed border-primary/40 rounded-lg pointer-events-none z-30"
          style={{
            top: 0,
            height: `${durationHours * 48}px`, // 48px per hour (desktop HOUR_HEIGHT)
          }}
        />
      )}
    </div>
  );
});

TimeSlotDropZone.displayName = 'TimeSlotDropZone';

// Reorder drop zone component for task column reordering
interface ReorderDropZoneProps {
  groupIdx: number;
  columnIndex: number;
  groupTasks: Task[];
  groupTop: number;
  groupHeight: number;
  edgeLeftPercent: number; // Actual left edge position in percentage
}

const ReorderDropZone = memo(({ groupIdx, columnIndex, groupTasks, groupTop, groupHeight, edgeLeftPercent }: ReorderDropZoneProps) => {
  const { setNodeRef, isOver } = useDroppable({
    id: `reorder-zone-${groupIdx}-${columnIndex}`,
    data: { 
      type: 'reorder-zone', 
      columnIndex, 
      groupTasks,
      groupTop,
      groupHeight,
    },
  });

  // Zone width - a thin strip at the exact edge
  const zoneWidth = 24;

  return (
    <div
      ref={setNodeRef}
      className={cn(
        'absolute pointer-events-auto z-40 transition-all rounded',
        isOver && 'bg-primary/30'
      )}
      style={{
        top: `${groupTop}px`,
        height: `${Math.max(groupHeight, 48)}px`,
        left: `calc(${edgeLeftPercent}% - ${zoneWidth / 2}px)`,
        width: `${zoneWidth}px`,
      }}
    >
      {isOver && (
        <div className="absolute left-1/2 top-0 bottom-0 w-1 -translate-x-1/2 bg-primary rounded-full shadow-lg shadow-primary/50" />
      )}
    </div>
  );
});

ReorderDropZone.displayName = 'ReorderDropZone';

const DayView = ({ date, currentEnergy, energyFilter = [], onBack, showHourFocus = false, timezone = 'UTC', onLayoutResetChange }: DayViewProps) => {
  const [userId, setUserId] = useState<string | null>(null);
  const [addingAtHour, setAddingAtHour] = useState<number | null>(null);
  const [isDraggingToCreate, setIsDraggingToCreate] = useState(false);
  const [dragStartHour, setDragStartHour] = useState<number | null>(null);
  const [dragEndHour, setDragEndHour] = useState<number | null>(null);
  const [currentDate, setCurrentDate] = useState(date);
  const timeGridRef = useRef<HTMLDivElement>(null);
  const isMobile = useIsMobile();
  const { activeTask, dragOverInfo } = useDndContext();
  const { isTooltipEnabledForView } = useDensity();

  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [createTimeRange, setCreateTimeRange] = useState<{ start: string; end: string } | null>(null);
  
  // Track custom widths AND left positions for tasks (percentage values)
  // For single tasks: width + left offset. For groups: just widths that sum to 100%
  const [taskWidths, setTaskWidths] = useState<Record<string, number>>({});
  const [taskLefts, setTaskLefts] = useState<Record<string, number>>({});

  const canResetLayout = useMemo(
    () => Object.keys(taskWidths).length > 0 || Object.keys(taskLefts).length > 0,
    [taskWidths, taskLefts]
  );

  const handleResetLayout = useCallback(() => {
    setTaskWidths({});
    setTaskLefts({});
  }, []);

  // Notify parent about reset capability
  useEffect(() => {
    onLayoutResetChange?.(canResetLayout, handleResetLayout);
  }, [canResetLayout, handleResetLayout, onLayoutResetChange]);

  // Helper to get widths for a group - ensures they always sum to 100%
  const getGroupWidths = useCallback((group: Task[]): number[] => {
    const defaultWidth = 100 / group.length;
    const widths = group.map(t => taskWidths[t.id] ?? defaultWidth);
    
    // Normalize to ensure sum is exactly 100%
    const sum = widths.reduce((a, b) => a + b, 0);
    if (Math.abs(sum - 100) > 0.1) {
      const scale = 100 / sum;
      return widths.map(w => w * scale);
    }
    return widths;
  }, [taskWidths]);

  // Handle width change for a task - redistributes space from/to neighbors
  const handleGroupWidthChange = useCallback((
    group: Task[],
    taskIndex: number,
    newWidth: number,
    direction: 'left' | 'right'
  ) => {
    const MIN_WIDTH = 15; // Minimum 15% width
    const widths = getGroupWidths(group);
    const currentWidth = widths[taskIndex];
    const delta = newWidth - currentWidth;
    
    if (Math.abs(delta) < 0.5) return;
    
    // Find neighbor to steal from / give to
    const neighborIndex = direction === 'right' ? taskIndex + 1 : taskIndex - 1;
    
    if (neighborIndex < 0 || neighborIndex >= group.length) return;
    
    const neighborWidth = widths[neighborIndex];
    const newNeighborWidth = neighborWidth - delta;
    
    // Clamp both to min width
    let finalNewWidth = newWidth;
    let finalNeighborWidth = newNeighborWidth;
    
    if (finalNewWidth < MIN_WIDTH) {
      finalNewWidth = MIN_WIDTH;
      finalNeighborWidth = currentWidth + neighborWidth - MIN_WIDTH;
    }
    if (finalNeighborWidth < MIN_WIDTH) {
      finalNeighborWidth = MIN_WIDTH;
      finalNewWidth = currentWidth + neighborWidth - MIN_WIDTH;
    }
    
    // Update both widths
    setTaskWidths(prev => ({
      ...prev,
      [group[taskIndex].id]: finalNewWidth,
      [group[neighborIndex].id]: finalNeighborWidth,
    }));
  }, [getGroupWidths]);

  // Handle single task resize (can resize from either edge)
  const handleSingleTaskResize = useCallback((
    taskId: string,
    delta: number,
    direction: 'left' | 'right'
  ) => {
    const MIN_WIDTH = 15;
    const MAX_WIDTH = 100; // Can resize back to full width
    const currentWidth = taskWidths[taskId] ?? 100;
    const currentLeft = taskLefts[taskId] ?? 0;
    
    if (direction === 'right') {
      // Right edge: just change width, clamped to MAX_WIDTH
      const newWidth = Math.max(MIN_WIDTH, Math.min(MAX_WIDTH, Math.min(100 - currentLeft, currentWidth + delta)));
      setTaskWidths(prev => ({ ...prev, [taskId]: newWidth }));
    } else {
      // Left edge: change both left position and width
      const potentialLeft = currentLeft + delta;
      const potentialWidth = currentWidth - delta;
      
      // Clamp left position to 0 minimum and width to limits
      let newLeft = Math.max(0, Math.min(100 - MIN_WIDTH, potentialLeft));
      let newWidth = Math.max(MIN_WIDTH, Math.min(MAX_WIDTH, potentialWidth));
      
      // Ensure left + width <= 100
      if (newLeft + newWidth > 100) {
        newWidth = 100 - newLeft;
      }
      
      setTaskLefts(prev => ({ ...prev, [taskId]: newLeft }));
      setTaskWidths(prev => ({ ...prev, [taskId]: newWidth }));
    }
  }, [taskWidths, taskLefts]);

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

    const onUp = async () => {
      window.removeEventListener('mousemove', onMove);

      if (!moved) {
        setIsDraggingToCreate(false);
        setDragStartHour(null);
        setDragEndHour(null);
        return;
      }

      const rangeStart = Math.min(startHour, endHour);
      const rangeEnd = Math.max(startHour, endHour) + 1;

      const startTimeStr = `${rangeStart.toString().padStart(2, '0')}:00`;
      const endTimeStr = `${rangeEnd.toString().padStart(2, '0')}:00`;

      // Create task immediately with default title (user can double-click to edit)
      await addTask({
        title: 'New Task',
        energy_level: currentEnergy,
        due_date: dateStr,
        start_time: startTimeStr,
        end_time: endTimeStr,
      });

      setIsDraggingToCreate(false);
      setDragStartHour(null);
      setDragEndHour(null);
    };

    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp, { once: true });
  }, [isMobile, isDraggingToCreate, addTask, currentEnergy, dateStr]);

  // Mobile: tap to add at hour - create task immediately
  const handleTapToAdd = useCallback(async (hour: number) => {
    if (!isMobile) return;
    await addTask({
      title: 'New Task',
      energy_level: currentEnergy,
      due_date: dateStr,
      start_time: `${hour.toString().padStart(2, '0')}:00`,
      end_time: `${(hour + 1).toString().padStart(2, '0')}:00`,
    });
  }, [isMobile, addTask, currentEnergy, dateStr]);

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
    options?: { description?: string; location?: string; isShared?: boolean; endDate?: string }
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
      end_date: options?.endDate,
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
                
                // Calculate group bounds for drop indicator
                const groupPositions = group.map(t => getTaskPosition(t)).filter(Boolean);
                const groupTop = Math.min(...groupPositions.map(p => p!.top));
                const groupBottom = Math.max(...groupPositions.map(p => p!.top + p!.height));
                const groupHeight = groupBottom - groupTop;

                // Check if this group is the target for drop indicator
                const isTargetGroup = dragOverInfo && 
                  dragOverInfo.groupTasks.length === group.length &&
                  dragOverInfo.groupTasks.every((t, i) => t.id === group[i]?.id);

                return (
                  <div key={`group-${groupIdx}`}>
                    {/* Drop indicator line - use actual cumulative widths */}
                    {isTargetGroup && activeTask && (() => {
                      const groupWidthsForIndicator = getGroupWidths(group);
                      let indicatorLeft = 0;
                      for (let i = 0; i < dragOverInfo.targetColumnIndex && i < groupWidthsForIndicator.length; i++) {
                        indicatorLeft += groupWidthsForIndicator[i];
                      }
                      return (
                        <div
                          className="absolute z-50 pointer-events-none"
                          style={{
                            top: `${groupTop}px`,
                            height: `${groupHeight}px`,
                            left: `calc(${indicatorLeft}% + 2px)`,
                            width: '3px',
                          }}
                        >
                          <div className="w-full h-full bg-primary rounded-full animate-pulse" />
                        </div>
                      );
                    })()}
                    
                    {/* Reorder drop zones - invisible areas at actual task edges */}
                    {isMultiTask && activeTask && group.some(t => t.id === activeTask.id) && (
                      <>
                        {(() => {
                          // Calculate actual edge positions based on cumulative widths
                          const groupWidthsForZones = getGroupWidths(group);
                          const edges: number[] = [0]; // Start with left edge at 0%
                          let cumulative = 0;
                          for (const w of groupWidthsForZones) {
                            cumulative += w;
                            edges.push(cumulative);
                          }
                          
                          return edges.map((edgePercent, zoneIdx) => (
                            <ReorderDropZone
                              key={`zone-${groupIdx}-${zoneIdx}`}
                              groupIdx={groupIdx}
                              columnIndex={zoneIdx}
                              groupTasks={group}
                              groupTop={groupTop}
                              groupHeight={groupHeight}
                              edgeLeftPercent={edgePercent}
                            />
                          ));
                        })()}
                      </>
                    )}
                    
                    {(() => {
                      // Calculate split-pane widths for this group
                      const groupWidths = getGroupWidths(group);
                      let cumulativeLeft = 0;
                      
                      return group.map((task, columnIdx) => {
                        const pos = getTaskPosition(task);
                        if (!pos) return null;

                        const taskHeight = Math.max(pos.height - 2, 22);
                        const taskWidth = groupWidths[columnIdx];
                        const taskLeft = cumulativeLeft;
                        cumulativeLeft += taskWidth;
                        
                        // Swap handlers - swap positions AND widths with neighbor
                        const handleMoveLeft = isMultiTask && columnIdx > 0 ? () => {
                          const leftTask = group[columnIdx - 1];
                          // Swap display_order
                          const newLeftOrder = columnIdx * 10;
                          const newCurrentOrder = (columnIdx - 1) * 10;
                          updateTask(task.id, { display_order: newCurrentOrder });
                          updateTask(leftTask.id, { display_order: newLeftOrder });
                          // Swap widths so they snap to each other's position
                          const leftWidth = groupWidths[columnIdx - 1];
                          const currentWidth = groupWidths[columnIdx];
                          setTaskWidths(prev => ({
                            ...prev,
                            [task.id]: leftWidth,
                            [leftTask.id]: currentWidth,
                          }));
                        } : undefined;
                        
                        const handleMoveRight = isMultiTask && columnIdx < group.length - 1 ? () => {
                          const rightTask = group[columnIdx + 1];
                          // Swap display_order
                          const newRightOrder = columnIdx * 10;
                          const newCurrentOrder = (columnIdx + 1) * 10;
                          updateTask(task.id, { display_order: newCurrentOrder });
                          updateTask(rightTask.id, { display_order: newRightOrder });
                          // Swap widths so they snap to each other's position
                          const rightWidth = groupWidths[columnIdx + 1];
                          const currentWidth = groupWidths[columnIdx];
                          setTaskWidths(prev => ({
                            ...prev,
                            [task.id]: rightWidth,
                            [rightTask.id]: currentWidth,
                          }));
                        } : undefined;

                        // For split-pane resize in groups; for single task, both edges are resizable
                        // Disable horizontal resizing on mobile/touch devices for better UX
                        const canResizeLeft = !isMobile && (isMultiTask ? columnIdx > 0 : true);
                        const canResizeRight = !isMobile && (isMultiTask ? columnIdx < group.length - 1 : true);
                        
                        // Resize handlers - different logic for single vs group
                        const handleResizeLeft = canResizeLeft ? (delta: number) => {
                          if (isMultiTask) {
                            handleGroupWidthChange(group, columnIdx, taskWidth + delta, 'left');
                          } else {
                            handleSingleTaskResize(task.id, -delta, 'left');
                          }
                        } : undefined;
                        
                        const handleResizeRight = canResizeRight ? (delta: number) => {
                          if (isMultiTask) {
                            handleGroupWidthChange(group, columnIdx, taskWidth + delta, 'right');
                          } else {
                            handleSingleTaskResize(task.id, delta, 'right');
                          }
                        } : undefined;

                        // For single tasks, use stored left position; for groups, use cumulative
                        const displayLeft = isMultiTask ? taskLeft : (taskLefts[task.id] ?? 0);
                        const displayWidth = isMultiTask ? taskWidth : (taskWidths[task.id] ?? 100);

                        return (
                          <div
                            key={task.id}
                            className="absolute task-item pointer-events-auto group/task"
                            style={{
                              top: `${pos.top + 1}px`,
                              height: `${taskHeight}px`,
                              left: `calc(${displayLeft}% + 2px)`,
                              width: `calc(${displayWidth}% - 4px)`,
                              transition: 'none',
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
                              width={displayWidth}
                              baseWidth={100 / group.length}
                              minWidth={15}
                              maxWidth={100}
                              canResizeLeft={canResizeLeft}
                              canResizeRight={canResizeRight}
                              onResizeLeft={handleResizeLeft}
                              onResizeRight={handleResizeRight}
                              canMoveLeft={!!handleMoveLeft}
                              canMoveRight={!!handleMoveRight}
                              onMoveLeft={handleMoveLeft}
                              onMoveRight={handleMoveRight}
                              showTooltip={isTooltipEnabledForView('day')}
                            />
                          </div>
                        );
                      });
                    })()}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Untimed tasks */}
        <div className={cn(
          "shrink-0",
          isMobile ? "order-1 w-full" : "w-80"
        )}>
          <h3 className="text-sm font-semibold text-foreground mb-3">
            Untimed Tasks
            {!isMobile && <span className="ml-2 text-xs text-foreground-muted font-normal">Drag to schedule</span>}
          </h3>
          <div className={cn(
            "space-y-3",
            isMobile && "grid grid-cols-2 gap-3 space-y-0"
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
          <div className="mt-4">
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
