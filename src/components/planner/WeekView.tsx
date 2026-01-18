import { useState, useEffect, memo, useCallback, useMemo } from 'react';
import { format, startOfWeek, addDays, addWeeks, isToday, isWithinInterval, parseISO, isSameDay } from 'date-fns';
import { cn } from '@/lib/utils';
import { EnergyLevel, Task } from '@/types';
import { ChevronLeft, ChevronRight, Plus, Clock, CalendarDays } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import DraggableTask from '@/components/tasks/DraggableTask';
import EditTaskDialog from '@/components/tasks/EditTaskDialog';
import CreateTaskDialog from '@/components/tasks/CreateTaskDialog';
import { useDroppable } from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { useTasksContext } from '@/contexts/TasksContext';
import { useIsMobile } from '@/hooks/use-mobile';
import { useDensity } from '@/contexts/DensityContext';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

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
}

const DroppableDay = memo(({
  date,
  tasks,
  multiDayTasks,
  currentEnergy,
  userId,
  onDayClick,
  onOpenCreateDialog,
  onUpdateTask,
  onDeleteTask,
  onEditTask,
  compact = false,
}: DroppableDayProps) => {
  const dateStr = format(date, 'yyyy-MM-dd');
  const today = isToday(date);

  const { isOver, setNodeRef } = useDroppable({
    id: dateStr,
    data: { type: 'day', date },
  });

  // No longer needed - double-click is handled in DraggableTask now

  const maxTasks = compact ? 3 : 5;
  
  // Count tasks with times
  const timedTasks = tasks.filter(t => t.start_time);

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "rounded-xl border border-border bg-card p-2 transition-all flex flex-col min-h-[160px]",
        compact && "min-h-[120px]",
        today && "border-highlight ring-1 ring-highlight/30 bg-highlight/5",
        isOver && "ring-2 ring-highlight bg-highlight-muted",
        !isOver && !today && "hover:bg-highlight-muted/50 hover:border-highlight/30"
      )}
    >
      {/* Day header */}
      <button
        onClick={() => onDayClick(date)}
        className={cn(
          "w-full text-left hover:text-highlight transition-colors mb-2",
          today && "text-highlight"
        )}
      >
        <div className="flex items-center justify-between">
          <div>
            <div className="text-[10px] text-foreground-muted uppercase tracking-wide">
              {format(date, 'EEE')}
            </div>
            <div className={cn(
              "text-lg font-semibold leading-tight",
              today ? "text-highlight" : "text-foreground"
            )}>
              {format(date, 'd')}
            </div>
          </div>
          {/* Task count badge */}
          {(tasks.length > 0 || multiDayTasks.length > 0) && (
            <div className="flex flex-col items-end gap-0.5">
              <span className={cn(
                "text-[10px] px-1.5 py-0.5 rounded-full",
                today ? "bg-highlight/20 text-highlight" : "bg-secondary text-foreground-muted"
              )}>
                {tasks.length + multiDayTasks.length} task{tasks.length + multiDayTasks.length !== 1 ? 's' : ''}
              </span>
              {timedTasks.length > 0 && (
                <div className="flex items-center gap-1 text-[9px] text-foreground-muted">
                  <Clock className="w-2.5 h-2.5 flex-shrink-0" />
                  <span>{timedTasks.length} scheduled</span>
                </div>
              )}
            </div>
          )}
        </div>
      </button>

      {/* Multi-day tasks indicator */}
      {multiDayTasks.length > 0 && (
        <div className="mb-2 space-y-1">
          {multiDayTasks.slice(0, 2).map(task => (
            <TooltipProvider key={task.id} delayDuration={200}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div
                    onClick={(e) => {
                      e.stopPropagation();
                      onEditTask(task);
                    }}
                    className={cn(
                      "flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] cursor-pointer transition-colors",
                      "bg-primary/10 text-primary hover:bg-primary/20 border border-primary/20"
                    )}
                  >
                    <CalendarDays className="w-2.5 h-2.5 flex-shrink-0" />
                    <span className="truncate">{task.title}</span>
                  </div>
                </TooltipTrigger>
                <TooltipContent side="top" className="max-w-[200px]">
                  <p className="font-medium">{task.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {format(parseISO(task.due_date!), 'MMM d')} - {format(parseISO(task.end_date!), 'MMM d')}
                  </p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          ))}
          {multiDayTasks.length > 2 && (
            <span className="text-[9px] text-foreground-muted pl-1">
              +{multiDayTasks.length - 2} more multi-day
            </span>
          )}
        </div>
      )}

      <SortableContext
        items={tasks.map(t => t.id)}
        strategy={verticalListSortingStrategy}
      >
        <div className="flex flex-col gap-1 flex-1">
          {tasks.slice(0, maxTasks).map(task => (
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
          ))}
          {tasks.length > maxTasks && (
            <button 
              onClick={() => onDayClick(date)}
              className="text-[10px] text-foreground-muted hover:text-primary pl-1 py-0.5"
            >
              +{tasks.length - maxTasks} more
            </button>
          )}
        </div>
        
        {/* Add task button */}
        <div className="mt-auto pt-2 border-t border-border/50">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onOpenCreateDialog(date)}
            className="w-full h-8 text-xs gap-1.5 text-foreground-muted hover:text-foreground border border-dashed border-border hover:border-primary/50"
          >
            <Plus className="w-3.5 h-3.5" />
            Add task
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
  const isMobile = useIsMobile();

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUserId(data.user?.id || null);
    });
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
  
  // Filter tasks for the week from centralized context
  const tasks = useMemo(() => {
    const startStr = format(weekStart, 'yyyy-MM-dd');
    const endStr = format(addDays(weekStart, 6), 'yyyy-MM-dd');
    return allTasks.filter(t => t.due_date && t.due_date >= startStr && t.due_date <= endStr);
  }, [allTasks, weekStart]);

  // Separate regular tasks and multi-day tasks
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
    
    // Sort: timed tasks first, then by time
    return dayTasks.sort((a, b) => {
      if (a.start_time && !b.start_time) return -1;
      if (!a.start_time && b.start_time) return 1;
      if (a.start_time && b.start_time) return a.start_time.localeCompare(b.start_time);
      return 0;
    });
  }, [regularTasks, energyFilter]);

  // Get multi-day tasks that span a specific day
  const getMultiDayTasksForDay = useCallback((date: Date) => {
    return multiDayTasks.filter(t => {
      if (!t.due_date || !t.end_date) return false;
      const startDate = parseISO(t.due_date);
      const endDate = parseISO(t.end_date);
      return isWithinInterval(date, { start: startDate, end: endDate }) ||
             isSameDay(date, startDate) || isSameDay(date, endDate);
    });
  }, [multiDayTasks]);

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

  const handleCreateTask = useCallback(async (
    title: string,
    energy: EnergyLevel,
    startTime?: string,
    endTime?: string,
    options?: { description?: string; location?: string; isShared?: boolean; endDate?: string }
  ) => {
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

  // Week summary
  const weekTaskCount = tasks.length;
  const completedCount = tasks.filter(t => t.completed).length;

  return (
    <div className="animate-fade-in">
      {/* Header: Week info + navigation */}
      <div className={cn(
        "flex items-center justify-between gap-3",
        isMobile ? "mb-4" : "mb-6"
      )}>
        {/* Left: Back + Week info */}
        <div className="flex items-center gap-3 min-w-0">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={onBack} 
            className={cn(
              "flex-shrink-0 gap-1.5",
              isMobile ? "h-11 w-11 p-0" : "h-10 px-3"
            )}
          >
            <ChevronLeft className="w-5 h-5" />
            <span className="hidden lg:inline text-sm">Back</span>
          </Button>
          
          <div className="min-w-0 flex flex-col">
            <h2 className={cn(
              "font-semibold tracking-tight text-foreground truncate leading-tight",
              isMobile ? "text-xl" : "text-2xl"
            )}>
              Week of {format(weekStart, 'MMM d')}
            </h2>
            <div className="flex items-center gap-2">
              <p className={cn(
                "text-foreground-muted leading-tight",
                isMobile ? "text-sm" : "text-base"
              )}>
                {format(weekStart, 'yyyy')}
              </p>
              {weekTaskCount > 0 && (
                <span className="text-xs text-foreground-muted">
                  • {completedCount}/{weekTaskCount} done
                </span>
              )}
            </div>
          </div>
        </div>
        
        {/* Right: Nav buttons */}
        <div className="flex items-center gap-1 flex-shrink-0">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handlePrevWeek} 
            className={cn(
              "border-border/50",
              isMobile ? "h-11 w-11 p-0" : "h-10 w-10 p-0"
            )}
          >
            <ChevronLeft className="w-5 h-5" />
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleNextWeek} 
            className={cn(
              "border-border/50",
              isMobile ? "h-11 w-11 p-0" : "h-10 w-10 p-0"
            )}
          >
            <ChevronRight className="w-5 h-5" />
          </Button>
        </div>
      </div>

      {/* Responsive grid: 2 cols on mobile, 7 on desktop */}
      <div className={cn(
        "grid gap-3",
        isMobile ? "grid-cols-2" : "grid-cols-7"
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
          />
        ))}
      </div>

      <EditTaskDialog
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        task={editingTask}
        onSave={handleSaveTask}
        onDelete={editingTask ? () => {
          deleteTask(editingTask.id);
          setEditDialogOpen(false);
          setEditingTask(null);
        } : undefined}
      />

      <CreateTaskDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        targetDate={createDialogDate}
        defaultEnergy={currentEnergy}
        onConfirm={handleCreateTask}
      />
    </div>
  );
};

export default WeekView;
