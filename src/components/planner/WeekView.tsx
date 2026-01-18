import { useState, useEffect, memo, useCallback, useMemo } from 'react';
import { format, startOfWeek, addDays, addWeeks, isToday } from 'date-fns';
import { cn } from '@/lib/utils';
import { EnergyLevel, Task } from '@/types';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import QuickAddTask from '@/components/tasks/QuickAddTask';
import DraggableTask from '@/components/tasks/DraggableTask';
import EditTaskDialog from '@/components/tasks/EditTaskDialog';
import { useDroppable } from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { useTasksContext } from '@/contexts/TasksContext';
import { useIsMobile } from '@/hooks/use-mobile';

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
  currentEnergy: EnergyLevel;
  userId: string | null;
  onDayClick: (date: Date) => void;
  onAddTask: (date: Date, title: string, energy: EnergyLevel) => void;
  onUpdateTask: (taskId: string, updates: Partial<Task>) => void;
  onDeleteTask: (taskId: string) => void;
  onEditTask: (task: Task) => void;
  compact?: boolean;
}

const DroppableDay = memo(({
  date,
  tasks,
  currentEnergy,
  userId,
  onDayClick,
  onAddTask,
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

  const handleDoubleClick = useCallback((e: React.MouseEvent, task: Task) => {
    e.stopPropagation();
    onEditTask(task);
  }, [onEditTask]);

  const maxTasks = compact ? 4 : 8;

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "rounded-lg border border-border bg-card px-1.5 py-1 transition-all flex flex-col min-h-[120px]",
        compact && "min-h-[100px]",
        today && "border-highlight ring-1 ring-highlight/30",
        isOver && "ring-2 ring-highlight bg-highlight-muted",
        !isOver && !today && "hover:bg-highlight-muted/50 hover:border-highlight/30"
      )}
    >
      <button
        onClick={() => onDayClick(date)}
        className={cn(
          "w-full text-left hover:text-highlight transition-colors",
          today && "text-highlight"
        )}
      >
        <div className="text-[9px] text-foreground-muted uppercase leading-none">
          {format(date, 'EEE')}
        </div>
        <div className={cn(
          "text-sm font-medium leading-tight",
          today ? "text-highlight" : "text-foreground"
        )}>
          {format(date, 'd')}
        </div>
      </button>

      <SortableContext
        items={tasks.map(t => t.id)}
        strategy={verticalListSortingStrategy}
      >
        <div className="flex flex-col gap-px mt-0.5 flex-1">
          {tasks.slice(0, maxTasks).map(task => (
            <div 
              key={task.id}
              onDoubleClick={(e) => handleDoubleClick(e, task)}
              className="cursor-pointer"
            >
              <DraggableTask
                task={task}
                onUpdate={(updates) => onUpdateTask(task.id, updates)}
                onDelete={() => onDeleteTask(task.id)}
                isShared={task.user_id !== userId}
                compact
                disableDoubleClickEdit
              />
            </div>
          ))}
          {tasks.length > maxTasks && (
            <button 
              onClick={() => onDayClick(date)}
              className="text-[9px] text-foreground-muted hover:text-primary pl-0.5"
            >
              +{tasks.length - maxTasks} more
            </button>
          )}
        </div>
        <div className="mt-auto pt-0.5">
          <QuickAddTask
            onAdd={async (task) => {
              await onAddTask(date, task.title, task.energy);
            }}
            defaultEnergy={currentEnergy}
            defaultDate={date}
            compact
          />
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

  const getTasksForDay = useCallback((date: Date) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    let dayTasks = tasks.filter(t => t.due_date === dateStr);
    
    if (energyFilter.length > 0) {
      dayTasks = dayTasks.filter(t => energyFilter.includes(t.energy_level));
    }
    
    return dayTasks;
  }, [tasks, energyFilter]);

  const handlePrevWeek = useCallback(() => {
    setCurrentStartDate(prev => addWeeks(prev, -1));
  }, []);

  const handleNextWeek = useCallback(() => {
    setCurrentStartDate(prev => addWeeks(prev, 1));
  }, []);

  const handleAddTask = useCallback(async (date: Date, title: string, energy: EnergyLevel) => {
    await addTask({
      title,
      energy_level: energy,
      due_date: format(date, 'yyyy-MM-dd'),
    });
  }, [addTask]);

  const handleEditTask = useCallback((task: Task) => {
    setEditingTask(task);
    setEditDialogOpen(true);
  }, []);

  const handleSaveTask = useCallback((taskId: string, updates: Partial<Task>) => {
    updateTask(taskId, updates);
    setEditDialogOpen(false);
    setEditingTask(null);
  }, [updateTask]);

  return (
    <div className="animate-fade-in">
      <div className="flex items-center justify-between mb-4 sm:mb-6 gap-2">
        <div className="flex items-center gap-2 sm:gap-4 min-w-0">
          <Button variant="ghost" size="sm" onClick={onBack} className="gap-1 flex-shrink-0">
            <ChevronLeft className="w-4 h-4" />
            <span className="hidden sm:inline">Back</span>
          </Button>
          <div className="min-w-0">
            <h2 className="text-lg sm:text-2xl font-light text-foreground truncate">
              Week of {format(weekStart, 'MMM d')}
            </h2>
            <p className="text-foreground-muted text-sm hidden sm:block">{format(weekStart, 'yyyy')}</p>
          </div>
        </div>
        <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
          <Button variant="outline" size="sm" onClick={handlePrevWeek} className="min-w-[44px] min-h-[44px] p-0 sm:p-2">
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={handleNextWeek} className="min-w-[44px] min-h-[44px] p-0 sm:p-2">
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Responsive grid: 2 cols on mobile, 7 on desktop */}
      <div className={cn(
        "grid gap-2",
        isMobile ? "grid-cols-2" : "grid-cols-7"
      )}>
        {weekDays.map((day) => (
          <DroppableDay
            key={day.toISOString()}
            date={day}
            tasks={getTasksForDay(day)}
            currentEnergy={currentEnergy}
            userId={userId}
            onDayClick={onDayClick}
            onAddTask={handleAddTask}
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
    </div>
  );
};

export default WeekView;
