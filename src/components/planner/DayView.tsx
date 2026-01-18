import { useState, useEffect, useRef } from 'react';
import { format, startOfDay, addHours, addDays, isToday } from 'date-fns';
import { cn } from '@/lib/utils';
import { EnergyLevel, Task } from '@/types';
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import QuickAddTask from '@/components/tasks/QuickAddTask';
import CalendarTask from '@/components/tasks/CalendarTask';
import DraggableUntimedTask from '@/components/tasks/DraggableUntimedTask';
import CreateTaskDialog from '@/components/tasks/CreateTaskDialog';
import CurrentTimeIndicator from '@/components/planner/CurrentTimeIndicator';
import { useDroppable } from '@dnd-kit/core';
import { useRealtimeTasks } from '@/hooks/useRealtimeTasks';

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

const TimeSlotDropZone = ({ hour, date, children }: TimeSlotDropZoneProps) => {
  const { setNodeRef, isOver } = useDroppable({
    id: `time-slot-${hour}`,
    data: { hour, type: 'time-slot', date },
  });

  return (
    <div
      ref={setNodeRef}
      className={cn(
        'h-full transition-colors',
        isOver && 'bg-primary/10 ring-1 ring-primary/30'
      )}
    >
      {children}
    </div>
  );
};

const DayView = ({ date, currentEnergy, energyFilter = [], onBack, showHourFocus = false, timezone = 'UTC' }: DayViewProps) => {
  const [userId, setUserId] = useState<string | null>(null);
  const [addingAtHour, setAddingAtHour] = useState<number | null>(null);
  const [isDraggingToCreate, setIsDraggingToCreate] = useState(false);
  const [dragStartHour, setDragStartHour] = useState<number | null>(null);
  const [dragEndHour, setDragEndHour] = useState<number | null>(null);
  const [currentDate, setCurrentDate] = useState(date);
  const timeGridRef = useRef<HTMLDivElement>(null);

  // State for drag-to-create immediate task creation
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [createTimeRange, setCreateTimeRange] = useState<{ start: string; end: string } | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUserId(data.user?.id || null);
    });
  }, []);

  // Sync with prop changes
  useEffect(() => {
    setCurrentDate(date);
  }, [date]);

  const dateStr = format(currentDate, 'yyyy-MM-dd');
  const { tasks, addTask, updateTask, deleteTask } = useRealtimeTasks({
    userId: userId || undefined,
    singleDate: dateStr,
    includeShared: true,
  });

  // Handle mouse events for drag-to-create
  const handleMouseDown = (hour: number, e: React.MouseEvent) => {
    if (isDraggingToCreate) return;

    const target = e.target as HTMLElement;

    // Never start drag-to-create when interacting with tasks or controls
    if (target.closest('.task-item')) return;
    if (target.closest('button, a, input, textarea, select, [role="button"], [data-no-drag-create]')) return;

    // left click only
    if ((e as unknown as MouseEvent).button !== 0) return;

    e.preventDefault();

    const startHour = hour;
    let endHour = hour;
    let moved = false;

    setIsDraggingToCreate(true);
    setDragStartHour(startHour);
    setDragEndHour(endHour);

    const onMove = (ev: MouseEvent) => {
      if (!timeGridRef.current) return;

      moved = true;

      const rect = timeGridRef.current.getBoundingClientRect();
      const relativeY = ev.clientY - rect.top;
      const hourHeight = 48; // Height of each hour slot (compact)
      const hoveredHour = Math.floor(relativeY / hourHeight) + 6; // 6 AM start
      const clampedHour = Math.max(6, Math.min(22, hoveredHour));

      endHour = clampedHour;
      setDragEndHour(clampedHour);
    };

    const onUp = () => {
      window.removeEventListener('mousemove', onMove);

      // If it was a simple click (no drag), do nothing.
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
  };

  const handleQuickAdd = async (task: {
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
  };

  const handleCreateFromDrag = async (
    title: string,
    energy: EnergyLevel,
    startTime?: string,
    endTime?: string
  ) => {
    await addTask({
      title,
      energy_level: energy,
      due_date: dateStr,
      start_time: startTime,
      end_time: endTime,
    });
    setShowCreateDialog(false);
    setCreateTimeRange(null);
  };

  const handlePrevDay = () => {
    setCurrentDate(prev => addDays(prev, -1));
  };

  const handleNextDay = () => {
    setCurrentDate(prev => addDays(prev, 1));
  };

  const filteredTasks = energyFilter.length > 0
    ? tasks.filter(t => energyFilter.includes(t.energy_level))
    : tasks;

  // Tasks without specific time
  const untimedTasks = filteredTasks.filter(t => !t.start_time);
  
  // Tasks with times - calculate their positions
  const timedTasks = filteredTasks.filter(t => t.start_time);

  const hours = Array.from({ length: 17 }, (_, i) => i + 6); // 6 AM to 10 PM
  const HOUR_HEIGHT = 48; // Height per hour in pixels

  // Calculate drag selection range
  const selectionStart = dragStartHour !== null && dragEndHour !== null
    ? Math.min(dragStartHour, dragEndHour)
    : null;
  const selectionEnd = dragStartHour !== null && dragEndHour !== null
    ? Math.max(dragStartHour, dragEndHour)
    : null;

  // Helper to calculate task position and dimensions
  const getTaskPosition = (task: Task) => {
    if (!task.start_time) return null;
    
    const [startH, startM] = task.start_time.split(':').map(Number);
    const startHour = startH + startM / 60;
    
    let endHour = startHour + 1; // Default 1 hour duration
    if (task.end_time) {
      const [endH, endM] = task.end_time.split(':').map(Number);
      endHour = endH + endM / 60;
    }
    
    const duration = endHour - startHour;
    const top = (startHour - 6) * HOUR_HEIGHT; // 6 AM is hour 0
    const height = duration * HOUR_HEIGHT;
    
    return { top, height, startHour, endHour, duration };
  };

  // Group overlapping tasks for horizontal stacking
  const getOverlappingGroups = () => {
    const groups: Task[][] = [];
    const sortedTasks = [...timedTasks].sort((a, b) => {
      const posA = getTaskPosition(a);
      const posB = getTaskPosition(b);
      return (posA?.startHour || 0) - (posB?.startHour || 0);
    });

    for (const task of sortedTasks) {
      const taskPos = getTaskPosition(task);
      if (!taskPos) continue;

      // Find a group this task overlaps with
      let foundGroup = false;
      for (const group of groups) {
        const groupEnd = Math.max(...group.map(t => getTaskPosition(t)?.endHour || 0));
        const groupStart = Math.min(...group.map(t => getTaskPosition(t)?.startHour || 0));
        
        // Check if this task overlaps with the group
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

    return groups;
  };

  const overlappingGroups = getOverlappingGroups();

  return (
    <div className="animate-fade-in">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={onBack} className="gap-1">
            <ChevronLeft className="w-4 h-4" />
            Back
          </Button>
          <div>
            <h2 className="text-2xl font-light text-foreground">
              {format(currentDate, 'EEEE')}
            </h2>
            <p className="text-foreground-muted">{format(currentDate, 'MMMM d, yyyy')}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handlePrevDay}>
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={handleNextDay}>
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      </div>

      <div className="flex gap-6">
        {/* Time grid */}
        <div className="flex-1">
          <div ref={timeGridRef} className="border-l border-border select-none relative" style={{ height: `${hours.length * HOUR_HEIGHT}px` }}>
            {/* Current time indicator - only show for today */}
            {isToday(currentDate) && (
              <CurrentTimeIndicator startHour={6} hourHeight={HOUR_HEIGHT} timezone={timezone} />
            )}

            {/* Hour rows - just the grid lines and drop zones */}
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
                      'group relative border-b border-border/50 transition-all cursor-crosshair',
                      isInSelection && 'bg-highlight/20 ring-1 ring-highlight/50'
                    )}
                    style={{ height: `${HOUR_HEIGHT}px` }}
                    onMouseDown={(e) => handleMouseDown(hour, e)}
                  >
                    {/* Time label */}
                    <div className="absolute left-0 top-0 w-16 text-xs text-foreground-muted py-1 pointer-events-none">
                      {timeStr}
                    </div>

                    {/* Hover hint for empty slots */}
                    {!isDraggingToCreate && (
                      <div className="absolute inset-0 ml-20 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                        <div className="flex items-center gap-1 text-xs text-foreground-muted">
                          <Plus className="w-3 h-3" />
                          Drag to create
                        </div>
                      </div>
                    )}
                  </div>
                </TimeSlotDropZone>
              );
            })}

            {/* Absolutely positioned tasks that span their duration */}
            <div className="absolute inset-0 ml-20 pointer-events-none">
              {overlappingGroups.map((group, groupIdx) => {
                const groupWidth = 100 / group.length;
                
                return group.map((task, taskIdx) => {
                  const pos = getTaskPosition(task);
                  if (!pos) return null;

                  const leftPercent = taskIdx * groupWidth;
                  const widthPercent = groupWidth - 1; // Small gap between stacked tasks
                  const taskHeight = Math.max(pos.height - 2, 20);
                  
                  return (
                    <div
                      key={task.id}
                      className="absolute task-item pointer-events-auto"
                      style={{
                        top: `${pos.top + 1}px`,
                        height: `${taskHeight}px`,
                        left: `${leftPercent}%`,
                        width: `calc(${widthPercent}% - 4px)`,
                      }}
                      onMouseDown={(e) => e.stopPropagation()}
                      onPointerDown={(e) => e.stopPropagation()}
                    >
                      <CalendarTask
                        task={task}
                        onUpdate={(updates) => updateTask(task.id, updates)}
                        onDelete={() => deleteTask(task.id)}
                        isShared={task.user_id !== userId}
                        showTimeRange={pos.duration >= 2}
                        height={taskHeight}
                      />
                    </div>
                  );
                });
              })}
            </div>
          </div>
        </div>

        {/* Untimed tasks sidebar */}
        <div className="w-64 shrink-0">
          <h3 className="text-sm font-medium text-foreground-muted mb-3">
            Untimed Tasks
            <span className="ml-2 text-xs opacity-60">Drag to schedule</span>
          </h3>
          <div className="space-y-2">
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

      {/* Create task dialog for drag-to-create */}
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

