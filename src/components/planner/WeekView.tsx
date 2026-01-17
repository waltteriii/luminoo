import { useState, useEffect } from 'react';
import { format, startOfWeek, addDays, isToday } from 'date-fns';
import { cn } from '@/lib/utils';
import { EnergyLevel, Task } from '@/types';
import { ChevronLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import QuickAddTask from '@/components/tasks/QuickAddTask';
import DraggableTask from '@/components/tasks/DraggableTask';
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
}: DroppableDayProps) => {
  const dateStr = format(date, 'yyyy-MM-dd');
  const today = isToday(date);

  const { isOver, setNodeRef } = useDroppable({
    id: dateStr,
    data: { type: 'day', date },
  });

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "rounded-lg border border-border bg-card p-3 min-h-[300px] transition-all",
        today && "border-primary ring-1 ring-primary/20",
        isOver && "ring-2 ring-primary bg-primary/5"
      )}
    >
      <button
        onClick={() => onDayClick(date)}
        className={cn(
          "w-full text-left mb-3 hover:text-primary transition-colors",
          today && "text-primary"
        )}
      >
        <div className="text-xs text-foreground-muted uppercase">
          {format(date, 'EEE')}
        </div>
        <div className={cn(
          "text-lg font-medium",
          today ? "text-primary" : "text-foreground"
        )}>
          {format(date, 'd')}
        </div>
      </button>

      <SortableContext
        items={tasks.map(t => t.id)}
        strategy={verticalListSortingStrategy}
      >
        <div className="space-y-2">
          {tasks.slice(0, 5).map(task => (
            <DraggableTask
              key={task.id}
              task={task}
              onUpdate={(updates) => onUpdateTask(task.id, updates)}
              onDelete={() => onDeleteTask(task.id)}
              isShared={task.user_id !== userId}
              compact
              enableFullDrag
            />
          ))}
          {tasks.length > 5 && (
            <button 
              onClick={() => onDayClick(date)}
              className="text-xs text-foreground-muted hover:text-primary"
            >
              +{tasks.length - 5} more
            </button>
          )}
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

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUserId(data.user?.id || null);
    });
  }, []);

  const weekStart = startOfWeek(startDate, { weekStartsOn: 1 });
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  const { tasks, loading, addTask, updateTask, deleteTask, rescheduleTask } = useRealtimeTasks({
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

  const handleAddTask = async (date: Date, title: string, energy: EnergyLevel) => {
    await addTask({
      title,
      energy_level: energy,
      due_date: format(date, 'yyyy-MM-dd'),
    });
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
      </div>

      <div className="grid grid-cols-7 gap-3">
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
          />
        ))}
      </div>
    </div>
  );
};

export default WeekView;
