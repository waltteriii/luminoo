import { useState, useEffect, memo, useCallback, useMemo } from 'react';
import { format, startOfWeek, addDays, addWeeks, isToday, isWithinInterval, parseISO, isSameDay } from 'date-fns';
import { cn } from '@/lib/utils';
import { EnergyLevel, Task } from '@/types';
import { ChevronLeft, ChevronRight, Plus, Clock, CalendarDays } from 'lucide-react';
import { Button } from '@/components/ui/button';

import DraggableTask from '@/components/tasks/DraggableTask';
import EditTaskDialog from '@/components/tasks/EditTaskDialog';
import CreateTaskDialog from '@/components/tasks/CreateTaskDialog';
import { useDroppable, useDraggable as useDndDraggable } from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useTasksContext } from '@/contexts/TasksContext';
import { useIsMobile } from '@/hooks/use-mobile';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { useDndContext } from '@/components/dnd/DndProvider';

interface WeekViewProps {
  startDate: Date;
  currentEnergy: EnergyLevel;
  energyFilter?: EnergyLevel[];
  onDayClick: (date: Date) => void;
  onBack: () => void;
}

interface DroppableDayProps {
  date: Date;
  tasks: Task[];
  multiDayTasks: Task[];
  currentEnergy: EnergyLevel;
  userId: string | null;
  onDayClick: (date: Date) => void;
  onOpenCreateDialog: (date: Date) => void;
  onUpdateTask: (taskId: string, updates: Partial<Task>) => void;
  onDeleteTask: (taskId: string) => void;
  onEditTask: (task: Task) => void;
  compact?: boolean;
  hoveredTaskId: string | null;
  setHoveredTaskId: (id: string | null) => void;
  selectedTaskId: string | null;
  setSelectedTaskId: (id: string | null) => void;
  onResizeTask: (taskId: string, newDate: Date) => void;
  maxLanes: number;
}

const ResizeHandle = memo(({
  taskId,
  type,
  className
}: {
  taskId: string;
  type: 'start' | 'end';
  className: string
}) => {
  const { attributes, listeners, setNodeRef, isDragging } = useDndDraggable({
    id: `resize-${type}-${taskId}`,
    data: { type: `resize-${type}`, taskId },
  });

  return (
    <div
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      onPointerDown={(e) => e.stopPropagation()}
      className={cn(
        className,
        "cursor-ew-resize active:cursor-grabbing touch-none z-[210] pointer-events-auto",
        isDragging && "opacity-0"
      )}
    />
  );
});

ResizeHandle.displayName = 'ResizeHandle';

const DraggableMultiDaySegment = memo(({
  task,
  dateStr,
  isStart,
  isEnd,
  isHovered,
  isSelected,
  onEditTask,
  onMouseEnter,
  onMouseLeave,
  onClick,
  date,
}: {
  task: Task;
  dateStr: string;
  isStart: boolean;
  isEnd: boolean;
  isHovered: boolean;
  isSelected: boolean;
  onEditTask: (task: Task) => void;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
  onClick: (e: React.MouseEvent) => void;
  date: Date;
}) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: `multi-${task.id}-${dateStr}`,
    data: { type: 'calendar-task', task },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 200 : (isSelected || isHovered ? 150 : 1),
  };

  const formatTime = (time: string | null | undefined) => {
    if (!time) return null;
    try {
      const normalized = time.length === 5 ? time : time.slice(0, 5);
      return format(new Date(`2000-01-01T${normalized}`), 'h:mm a');
    } catch {
      return null;
    }
  };

  const showHandles = isSelected || (isHovered && !isDragging);

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={onClick}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      className={cn(
        "group relative flex flex-col justify-center gap-0.5 px-2.5 py-1.5 cursor-grab active:cursor-grabbing transition-all min-h-[44px] touch-none",
        "bg-secondary/40 border-y border-highlight/10 text-foreground hover:bg-secondary/60",
        isHovered && "bg-highlight/10 border-highlight/30 shadow-[0_0_15px_rgba(var(--highlight-rgb),0.2)]",
        isSelected && "bg-highlight/20 border-highlight/50 ring-2 ring-inset ring-highlight shadow-[0_4px_20px_rgba(var(--highlight-rgb),0.3)]",
        isStart ? "rounded-l-xl border-l border-highlight/20 ml-1" : "-ml-4",
        isEnd ? "rounded-r-xl border-r border-highlight/20 mr-1" : "-mr-4",
        !isStart && !isEnd && "border-x-0"
      )}
    >
      {showHandles && (
        <>
          {isStart && (
            <ResizeHandle
              taskId={task.id}
              type="start"
              className="absolute left-[-4px] top-1/4 bottom-1/4 w-4 h-6 bg-highlight rounded-full shadow-[0_0_12px_rgba(var(--highlight-rgb),0.6)] flex items-center justify-center after:content-[''] after:w-0.5 after:h-4 after:bg-white/50 after:rounded-full z-[200] hover:scale-110 active:scale-125 transition-transform"
            />
          )}
          {isEnd && (
            <ResizeHandle
              taskId={task.id}
              type="end"
              className="absolute right-[-4px] top-1/4 bottom-1/4 w-4 h-6 bg-highlight rounded-full shadow-[0_0_12px_rgba(var(--highlight-rgb),0.6)] flex items-center justify-center after:content-[''] after:w-0.5 after:h-4 after:bg-white/50 after:rounded-full z-[200] hover:scale-110 active:scale-125 transition-transform"
            />
          )}
        </>
      )}

      <div className="flex items-center gap-1.5 min-w-0">
        {isStart && <CalendarDays className="w-3.5 h-3.5 text-highlight flex-shrink-0" />}
        <div className="flex flex-col min-w-0">
          {(isStart || (date.getDay() === 1)) && (
            <span className={cn(
              "text-xs font-semibold truncate",
              task.completed && "line-through opacity-60"
            )}>
              {task.title}
            </span>
          )}

          {(isStart || (date.getDay() === 1)) && task.start_time && (
            <div className="flex items-center gap-1 text-[10px] text-foreground-muted leading-tight">
              <Clock className="w-2.5 h-2.5 flex-shrink-0" />
              <span className="truncate tabular-nums">
                {formatTime(task.start_time)}
                {task.end_time && ` - ${formatTime(task.end_time)}`}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
});

DraggableMultiDaySegment.displayName = 'DraggableMultiDaySegment';

const DroppableDay = memo(({
  date,
  tasks,
  multiDayTasks,
  allTasksInView,
  currentEnergy,
  userId,
  onDayClick,
  onOpenCreateDialog,
  onUpdateTask,
  onDeleteTask,
  onEditTask,
  compact = false,
  hoveredTaskId,
  setHoveredTaskId,
  selectedTaskId,
  setSelectedTaskId,
  onResizeTask,
  maxLanes,
}: DroppableDayProps & { allTasksInView: Task[] }) => {
  const dateStr = format(date, 'yyyy-MM-dd');
  const today = isToday(date);
  const { resizeInfo } = useDndContext();

  const { isOver, setNodeRef } = useDroppable({
    id: dateStr,
    data: { type: 'day', date },
  });

  const activeResizeTask = useMemo(() => {
    if (!resizeInfo || !resizeInfo.targetDate) return null;
    const task = allTasksInView.find(t => t.id === resizeInfo.taskId);
    if (!task) return null;

    let previewStart = parseISO(task.due_date!);
    let previewEnd = task.end_date ? parseISO(task.end_date) : previewStart;

    if (resizeInfo.type === 'resize-start') {
      previewStart = resizeInfo.targetDate;
    } else {
      previewEnd = resizeInfo.targetDate;
    }

    // Ensure start <= end
    if (previewStart > previewEnd) {
      [previewStart, previewEnd] = [previewEnd, previewStart];
    }

    const isInRange = isWithinInterval(date, { start: previewStart, end: previewEnd }) ||
      isSameDay(date, previewStart) || isSameDay(date, previewEnd);

    if (!isInRange) return null;

    return {
      ...task,
      previewStart,
      previewEnd,
      isStart: isSameDay(date, previewStart),
      isEnd: isSameDay(date, previewEnd),
    };
  }, [resizeInfo, date, multiDayTasks, tasks]);

  const maxTasks = compact ? 3 : 5;

  return (
    <div
      ref={setNodeRef}
      onClick={(e) => {
        if (selectedTaskId) {
          onResizeTask(selectedTaskId, date);
          e.stopPropagation();
        } else {
          onDayClick(date);
        }
      }}
      className={cn(
        "rounded-xl border border-border bg-card p-3 sm:p-4 transition-all flex flex-col relative group/day",
        "min-h-[240px] sm:min-h-[300px] lg:min-h-[360px]",
        today && "border-highlight ring-2 ring-inset ring-highlight/40 bg-highlight/5 z-10",
        isOver && "ring-2 ring-highlight bg-highlight-muted",
        !isOver && !today && "hover:bg-highlight-muted/50 hover:border-highlight/30",
        selectedTaskId && "cursor-cell hover:bg-highlight/5"
      )}
    >
      <button
        onClick={() => onDayClick(date)}
        className={cn(
          "w-full text-left hover:text-highlight transition-colors mb-4 touch-manipulation",
          "min-h-[44px] flex items-start justify-between",
          today && "text-highlight"
        )}
      >
        <div>
          <div className="text-[11px] sm:text-xs text-foreground-muted uppercase tracking-wide">
            {format(date, 'EEE')}
          </div>
          <div className={cn(
            "text-xl sm:text-lg font-semibold leading-tight",
            today ? "text-highlight" : "text-foreground"
          )}>
            {format(date, 'd')}
          </div>
        </div>
        {(tasks.length > 0 || multiDayTasks.length > 0) && (
          <div className="flex flex-col items-end gap-0.5">
            <span className={cn(
              "text-[10px] px-1.5 py-0.5 rounded-full transition-colors",
              today ? "bg-highlight/20 text-highlight" : "bg-secondary text-foreground-muted group-hover/day:bg-highlight/10 group-hover/day:text-highlight"
            )}>
              {tasks.length + multiDayTasks.length}
            </span>
          </div>
        )}
      </button>

      <div
        className="mb-4 space-y-1 relative"
        style={{ minHeight: `${maxLanes * 52}px` }}
      >
        <SortableContext
          items={multiDayTasks.map(t => `multi-${t.id}-${dateStr}`)}
          strategy={verticalListSortingStrategy}
        >
          {multiDayTasks.sort((a, b) => (a.display_order || 0) - (b.display_order || 0)).map(task => {
            const laneIndex = Math.max(0, task.display_order || 0);
            const isBeingResized = resizeInfo?.taskId === task.id;

            // If this task is being resized and this day is part of current preview, use preview styling
            if (isBeingResized && activeResizeTask) {
              return (
                <div
                  key={task.id}
                  className="absolute left-0 right-0 z-[150] pointer-events-none"
                  style={{ top: `${laneIndex * 48}px` }}
                >
                  <div className={cn(
                    "flex flex-col justify-center gap-0.5 px-2.5 py-1.5 min-h-[44px]",
                    "bg-highlight/40 border-y border-highlight/50 text-foreground ring-1 ring-inset ring-highlight shadow-[0_0_20px_rgba(var(--highlight-rgb),0.4)]",
                    activeResizeTask.isStart ? "rounded-l-xl border-l ml-1" : "-ml-4",
                    activeResizeTask.isEnd ? "rounded-r-xl border-r mr-1" : "-mr-4",
                  )}>
                    {activeResizeTask.isStart && (
                      <span className="text-xs font-bold truncate">{task.title}</span>
                    )}
                  </div>
                </div>
              );
            }

            // Hide original segment during resizing
            if (isBeingResized) return null;

            return (
              <div
                key={task.id}
                className="absolute left-0 right-0"
                style={{ top: `${laneIndex * 48}px` }}
              >
                <TooltipProvider delayDuration={200}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <DraggableMultiDaySegment
                        task={task}
                        date={date}
                        dateStr={dateStr}
                        isStart={task.due_date === dateStr}
                        isEnd={task.end_date === dateStr}
                        isHovered={hoveredTaskId === task.id}
                        isSelected={selectedTaskId === task.id}
                        onEditTask={onEditTask}
                        onMouseEnter={() => setHoveredTaskId(task.id)}
                        onMouseLeave={() => setHoveredTaskId(null)}
                        onClick={(e) => {
                          e.stopPropagation();
                          if (selectedTaskId === task.id) {
                            setSelectedTaskId(null);
                          } else {
                            setSelectedTaskId(task.id);
                          }
                        }}
                      />
                    </TooltipTrigger>
                    <TooltipContent side="top">
                      <p className="font-medium text-sm">{task.title}</p>
                      <p className="text-xs text-muted-foreground whitespace-nowrap">
                        {format(parseISO(task.due_date!), 'MMM d')} - {format(parseISO(task.end_date!), 'MMM d')}
                      </p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
            );
          })}

          {/* Render preview for regular tasks being turned into multi-day */}
          {activeResizeTask && !multiDayTasks.find(t => t.id === activeResizeTask.id) && (
            <div className="absolute left-0 right-0 z-50 pointer-events-none" style={{ top: '0px' }}>
              <div className={cn(
                "flex flex-col justify-center gap-0.5 px-2.5 py-1.5 min-h-[44px]",
                "bg-highlight/40 border-y border-highlight/50 text-foreground ring-2 ring-inset ring-highlight shadow-[0_0_20px_rgba(var(--highlight-rgb),0.4)]",
                activeResizeTask.isStart ? "rounded-l-xl border-l ml-1" : "-ml-4",
                activeResizeTask.isEnd ? "rounded-r-xl border-r mr-1" : "-mr-4",
              )}>
                {activeResizeTask.isStart && (
                  <span className="text-xs font-bold truncate">{activeResizeTask.title}</span>
                )}
              </div>
            </div>
          )}
        </SortableContext>
      </div>

      <SortableContext
        items={tasks.map(t => t.id)}
        strategy={verticalListSortingStrategy}
      >
        <div className="flex flex-col gap-1.5 flex-1 min-h-[100px] mt-2">
          {tasks.slice(0, maxTasks).map(task => {
            const isBeingResized = resizeInfo?.taskId === task.id;
            if (isBeingResized) return null; // Logic handled in multi-day preview block above

            return (
              <DraggableTask
                key={task.id}
                task={task}
                onUpdate={(updates) => onUpdateTask(task.id, updates)}
                onDelete={() => onDeleteTask(task.id)}
                isShared={task.user_id !== userId}
                compact
                enableFullDrag
                showTime
              />
            );
          })}
          {tasks.length > maxTasks && (
            <button
              onClick={() => onDayClick(date)}
              className="text-[10px] text-foreground-muted hover:text-highlight px-1.5 py-1 mt-1 transition-colors"
            >
              +{tasks.length - maxTasks} more
            </button>
          )}
        </div>

        <div className="mt-auto flex justify-start pt-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onOpenCreateDialog(date)}
            className="h-7 w-7 rounded-lg text-foreground-muted hover:text-highlight hover:bg-highlight/10 border border-dashed border-border/40 hover:border-highlight/50 transition-all shadow-sm active:scale-95"
          >
            <Plus className="w-3.5 h-3.5" />
          </Button>
        </div>
      </SortableContext>
    </div>
  );
});

DroppableDay.displayName = 'DroppableDay';

const WeekView = ({ startDate, currentEnergy, energyFilter = [], onDayClick, onBack }: WeekViewProps) => {
  const [userId, setUserId] = useState<string | null>(null);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [currentStartDate, setCurrentStartDate] = useState(startDate);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [createDialogDate, setCreateDialogDate] = useState<Date>(new Date());
  const [hoveredTaskId, setHoveredTaskId] = useState<string | null>(null);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const isMobile = useIsMobile();

  useEffect(() => {
    setUserId('demo-user');
  }, []);

  useEffect(() => {
    setCurrentStartDate(startDate);
  }, [startDate]);

  const weekStart = startOfWeek(currentStartDate, { weekStartsOn: 1 });
  const weekDays = useMemo(() =>
    Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)),
    [weekStart]
  );

  const { tasks: allTasks, addTask, updateTask, deleteTask } = useTasksContext();

  const tasks = useMemo(() => {
    const startStr = format(weekStart, 'yyyy-MM-dd');
    const endStr = format(addDays(weekStart, 6), 'yyyy-MM-dd');
    return allTasks.filter(t => t.due_date && t.due_date >= startStr && t.due_date <= endStr);
  }, [allTasks, weekStart]);

  const { regularTasks, multiDayTasks } = useMemo(() => {
    const regular: Task[] = [];
    const multiDay: Task[] = [];
    tasks.forEach(t => {
      if (t.end_date && t.end_date !== t.due_date) {
        multiDay.push(t);
      } else {
        regular.push(t);
      }
    });
    return { regularTasks: regular, multiDayTasks: multiDay };
  }, [tasks]);

  const getTasksForDay = useCallback((date: Date) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    let dayTasks = regularTasks.filter(t => t.due_date === dateStr);
    if (energyFilter.length > 0) {
      dayTasks = dayTasks.filter(t => energyFilter.includes(t.energy_level));
    }
    return dayTasks.sort((a, b) => {
      if (a.start_time && !b.start_time) return -1;
      if (!a.start_time && b.start_time) return 1;
      if (a.start_time && b.start_time) return a.start_time.localeCompare(b.start_time);
      return 0;
    });
  }, [regularTasks, energyFilter]);

  const weekMultiLanes = useMemo(() => {
    const multiSet = multiDayTasks.filter(t => t.end_date && t.end_date !== t.due_date);
    return multiSet.sort((a, b) => {
      const startA = a.due_date || '';
      const startB = b.due_date || '';
      if (startA !== startB) return startA.localeCompare(startB);
      const durA = new Date(a.end_date!).getTime() - new Date(a.due_date!).getTime();
      const durB = new Date(b.end_date!).getTime() - new Date(b.due_date!).getTime();
      return durB - durA;
    }).map(t => t.id);
  }, [multiDayTasks]);

  const maxLanes = weekMultiLanes.length || 1;

  const getMultiDayTasksForDay = useCallback((date: Date) => {
    const dayMultiTasks = multiDayTasks.filter(t => {
      if (!t.due_date || !t.end_date) return false;
      const startDate = parseISO(t.due_date);
      const endDate = parseISO(t.end_date);
      return isWithinInterval(date, { start: startDate, end: endDate }) ||
        isSameDay(date, startDate) || isSameDay(date, endDate);
    });

    return dayMultiTasks.map(t => ({
      ...t,
      display_order: weekMultiLanes.indexOf(t.id)
    }));
  }, [multiDayTasks, weekMultiLanes]);

  const handlePrevWeek = useCallback(() => {
    setCurrentStartDate(prev => addWeeks(prev, -1));
  }, []);

  const handleNextWeek = useCallback(() => {
    setCurrentStartDate(prev => addWeeks(prev, 1));
  }, []);

  const handleOpenCreateDialog = useCallback((date: Date) => {
    setCreateDialogDate(date);
    setCreateDialogOpen(true);
  }, []);

  const handleCreateTask = useCallback(async (title: string, energy: EnergyLevel, startTime?: string, endTime?: string, options?: { description?: string; location?: string; isShared?: boolean; endDate?: string }) => {
    await addTask({
      title,
      energy_level: energy,
      due_date: format(createDialogDate, 'yyyy-MM-dd'),
      start_time: startTime,
      end_time: endTime,
      description: options?.description,
      location: options?.location,
      is_shared: options?.isShared,
      end_date: options?.endDate,
    });
  }, [addTask, createDialogDate]);

  const handleEditTask = useCallback((task: Task) => {
    setEditingTask(task);
    setEditDialogOpen(true);
  }, []);

  const handleSaveTask = useCallback((taskId: string, updates: Partial<Task>) => {
    updateTask(taskId, updates);
    setEditDialogOpen(false);
    setEditingTask(null);
  }, [updateTask]);

  const handleResizeTask = useCallback((taskId: string, newDate: Date) => {
    const task = allTasks.find(t => t.id === taskId);
    if (!task || !task.due_date) return;

    const start = parseISO(task.due_date);
    const dateStr = format(newDate, 'yyyy-MM-dd');

    if (newDate < start) {
      updateTask(taskId, { due_date: dateStr });
    } else {
      updateTask(taskId, { end_date: dateStr });
    }
    setSelectedTaskId(null);
  }, [allTasks, updateTask]);

  const weekTaskCount = tasks.length;
  const completedCount = tasks.filter(t => t.completed).length;

  return (
    <div className="animate-fade-in">
      <div className="flex items-center justify-between gap-3 mb-6">
        <div className="flex items-center gap-3 min-w-0">
          <Button variant="ghost" size="sm" onClick={onBack} className="flex-shrink-0 h-11 w-11 p-0 hover:bg-highlight/10">
            <ChevronLeft className="w-5 h-5" />
          </Button>
          <div className="min-w-0 flex flex-col">
            <h2 className="font-semibold tracking-tight text-foreground truncate text-xl sm:text-2xl lg:text-3xl">
              Week of {format(weekStart, 'MMM d')}
            </h2>
            <div className="flex items-center gap-2">
              <p className="text-foreground-muted text-sm sm:text-base">{format(weekStart, 'yyyy')}</p>
              {weekTaskCount > 0 && <span className="text-xs text-foreground-muted">• {completedCount}/{weekTaskCount} done</span>}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <Button variant="outline" size="sm" onClick={handlePrevWeek} className="h-11 w-11 p-0 border-border/50 hover:border-highlight/50 transition-colors"><ChevronLeft className="w-5 h-5" /></Button>
          <Button variant="outline" size="sm" onClick={handleNextWeek} className="h-11 w-11 p-0 border-border/50 hover:border-highlight/50 transition-colors"><ChevronRight className="w-5 h-5" /></Button>
        </div>
      </div>

      <div className={cn(
        "grid gap-px bg-border/20 rounded-2xl overflow-hidden border border-border/10",
        isMobile ? "grid-cols-1 xs:grid-cols-2" : "grid-cols-7"
      )}>
        {weekDays.map((day) => (
          <DroppableDay
            key={day.toISOString()}
            date={day}
            tasks={getTasksForDay(day)}
            multiDayTasks={getMultiDayTasksForDay(day)}
            currentEnergy={currentEnergy}
            userId={userId}
            onDayClick={onDayClick}
            onOpenCreateDialog={handleOpenCreateDialog}
            onUpdateTask={updateTask}
            onDeleteTask={deleteTask}
            onEditTask={handleEditTask}
            compact={isMobile}
            hoveredTaskId={hoveredTaskId}
            setHoveredTaskId={setHoveredTaskId}
            selectedTaskId={selectedTaskId}
            setSelectedTaskId={setSelectedTaskId}
            onResizeTask={handleResizeTask}
            maxLanes={maxLanes}
            allTasksInView={allTasks}
          />
        ))}
      </div>

      <EditTaskDialog open={editDialogOpen} onOpenChange={setEditDialogOpen} task={editingTask} onSave={handleSaveTask} onDelete={editingTask ? () => { deleteTask(editingTask.id); setEditDialogOpen(false); setEditingTask(null); } : undefined} />
      <CreateTaskDialog open={createDialogOpen} onOpenChange={setCreateDialogOpen} targetDate={createDialogDate} defaultEnergy={currentEnergy} onConfirm={handleCreateTask} />
    </div>
  );
};

export default WeekView;
