import { useState, useEffect } from 'react';
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
import { useRealtimeTasks } from '@/hooks/useRealtimeTasks';

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
}

const DroppableDay = ({
  date,
  tasks,
  currentEnergy,
  userId,
  onDayClick,
  onAddTask,
  onUpdateTask,
  onDeleteTask,
  onEditTask,
}: DroppableDayProps) => {
  const dateStr = format(date, 'yyyy-MM-dd');
  const today = isToday(date);

  const { isOver, setNodeRef } = useDroppable({
    id: dateStr,
    data: { type: 'day', date },
  });

  const handleDoubleClick = (e: React.MouseEvent, task: Task) => {
    e.stopPropagation();
    onEditTask(task);
  };

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "rounded-lg border border-border bg-card p-2 min-h-[200px] transition-all flex flex-col",
        today && "border-primary ring-1 ring-primary/20",
        isOver && "ring-2 ring-primary bg-primary/5"
      )}
    >
      <button
        onClick={() => onDayClick(date)}
        className={cn(
          "w-full text-left mb-2 hover:text-primary transition-colors",
          today && "text-primary"
        )}
      >
        <div className="text-[10px] text-foreground-muted uppercase">
          {format(date, 'EEE')}
        </div>
        <div className={cn(
          "text-base font-medium",
          today ? "text-primary" : "text-foreground"
        )}>
          {format(date, 'd')}
        </div>
      </button>

      <SortableContext
        items={tasks.map(t => t.id)}
        strategy={verticalListSortingStrategy}
      >
        <div className="space-y-1 flex-1">
          {tasks.slice(0, 6).map(task => (
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
          {tasks.length > 6 && (
            <button 
              onClick={() => onDayClick(date)}
              className="text-[10px] text-foreground-muted hover:text-primary"
            >
              +{tasks.length - 6} more
            </button>
          )}
        </div>
        <div className="mt-1">
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
};

const WeekView = ({ startDate, currentEnergy, energyFilter = [], onDayClick, onBack }: WeekViewProps) => {
  const [userId, setUserId] = useState<string | null>(null);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [currentStartDate, setCurrentStartDate] = useState(startDate);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUserId(data.user?.id || null);
    });
  }, []);

  // Sync with prop changes
  useEffect(() => {
    setCurrentStartDate(startDate);
  }, [startDate]);

  const weekStart = startOfWeek(currentStartDate, { weekStartsOn: 1 });
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  const { tasks, addTask, updateTask, deleteTask } = useRealtimeTasks({
    userId: userId || undefined,
    dateRange: {
      start: format(weekStart, 'yyyy-MM-dd'),
      end: format(addDays(weekStart, 6), 'yyyy-MM-dd'),
    },
    includeShared: true,
  });

  const getTasksForDay = (date: Date) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    let dayTasks = tasks.filter(t => t.due_date === dateStr);
    
    if (energyFilter.length > 0) {
      dayTasks = dayTasks.filter(t => energyFilter.includes(t.energy_level));
    }
    
    return dayTasks;
  };

  const handlePrevWeek = () => {
    setCurrentStartDate(prev => addWeeks(prev, -1));
  };

  const handleNextWeek = () => {
    setCurrentStartDate(prev => addWeeks(prev, 1));
  };

  const handleAddTask = async (date: Date, title: string, energy: EnergyLevel) => {
    await addTask({
      title,
      energy_level: energy,
      due_date: format(date, 'yyyy-MM-dd'),
    });
  };

  const handleEditTask = (task: Task) => {
    setEditingTask(task);
    setEditDialogOpen(true);
  };

  const handleSaveTask = (taskId: string, updates: Partial<Task>) => {
    updateTask(taskId, updates);
    setEditDialogOpen(false);
    setEditingTask(null);
  };

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
              Week of {format(weekStart, 'MMMM d')}
            </h2>
            <p className="text-foreground-muted">{format(weekStart, 'yyyy')}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handlePrevWeek}>
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={handleNextWeek}>
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-2">
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
          />
        ))}
      </div>

      {/* Edit dialog for task editing */}
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