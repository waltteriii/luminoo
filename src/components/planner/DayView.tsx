import { useState, useEffect, useRef } from 'react';
import { format, startOfDay, addHours, addDays, isToday } from 'date-fns';
import { cn } from '@/lib/utils';
import { EnergyLevel, Task } from '@/types';
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import QuickAddTask from '@/components/tasks/QuickAddTask';
import DraggableTask from '@/components/tasks/DraggableTask';
import DraggableUntimedTask from '@/components/tasks/DraggableUntimedTask';
import CreateTaskDialog from '@/components/tasks/CreateTaskDialog';
import CurrentTimeIndicator from '@/components/planner/CurrentTimeIndicator';
import { useDroppable } from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
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

  const hours = Array.from({ length: 17 }, (_, i) => i + 6); // 6 AM to 10 PM

  // Calculate drag selection range
  const selectionStart = dragStartHour !== null && dragEndHour !== null
    ? Math.min(dragStartHour, dragEndHour)
    : null;
  const selectionEnd = dragStartHour !== null && dragEndHour !== null
    ? Math.max(dragStartHour, dragEndHour)
    : null;

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
          <div ref={timeGridRef} className="border-l border-border select-none relative">
            {/* Current time indicator - only show for today */}
            {isToday(currentDate) && (
              <CurrentTimeIndicator startHour={6} hourHeight={48} timezone={timezone} />
            )}

            {hours.map(hour => {
              const isInSelection = selectionStart !== null &&
                selectionEnd !== null &&
                hour >= selectionStart &&
                hour <= selectionEnd;

              const timeStr = format(addHours(startOfDay(currentDate), hour), 'h a');
              const hourTasks = filteredTasks.filter(t => {
                if (!t.start_time) return false;
                const taskHour = parseInt(t.start_time.split(':')[0]);
                return taskHour === hour;
              });

              return (
                <TimeSlotDropZone key={hour} hour={hour} date={currentDate}>
                  <div
                    className={cn(
                      'group relative h-12 border-b border-border/50 transition-all cursor-crosshair',
                      isInSelection && 'bg-primary/20 ring-1 ring-primary/50'
                    )}
                    onMouseDown={(e) => handleMouseDown(hour, e)}
                  >
                    {/* Time label */}
                    <div className="absolute left-0 top-0 w-16 text-xs text-foreground-muted py-1 pointer-events-none">
                      {timeStr}
                    </div>

                    {/* Content area */}
                    <div className="ml-20 h-full relative">
                      <SortableContext
                        items={hourTasks.map(t => t.id)}
                        strategy={verticalListSortingStrategy}
                      >
                        <div className="space-y-1 py-1">
                          {hourTasks.map(task => (
                            <div
                              key={task.id}
                              className="task-item"
                              onMouseDown={(e) => e.stopPropagation()}
                              onPointerDown={(e) => e.stopPropagation()}
                            >
                              <DraggableTask
                                task={task}
                                onUpdate={(updates) => updateTask(task.id, updates)}
                                onDelete={() => deleteTask(task.id)}
                                isShared={task.user_id !== userId}
                                compact
                                showDetailsButton
                                enableInlineTitleEdit
                                disableDoubleClickEdit
                                dndData={{ hour, date: currentDate }}
                              />
                            </div>
                          ))}
                        </div>
                      </SortableContext>

                      {/* Add task inline */}
                      {addingAtHour === hour ? (
                        <div className="absolute top-1 left-0 right-4 z-10">
                          <QuickAddTask
                            onAdd={handleQuickAdd}
                            defaultEnergy={currentEnergy}
                            defaultDate={currentDate}
                            defaultTime={`${hour.toString().padStart(2, '0')}:00`}
                            compact
                          />
                        </div>
                      ) : (
                        !isDraggingToCreate && hourTasks.length === 0 && (
                          <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                            <div className="flex items-center gap-1 text-xs text-foreground-muted">
                              <Plus className="w-3 h-3" />
                              Drag to create task
                            </div>
                          </div>
                        )
                      )}
                    </div>
                  </div>
                </TimeSlotDropZone>
              );
            })}
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

