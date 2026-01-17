import { useState, useEffect } from 'react';
import { format, startOfWeek, addDays, isSameDay, isToday } from 'date-fns';
import { cn } from '@/lib/utils';
import { EnergyLevel, Task } from '@/types';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import TaskItem from '@/components/tasks/TaskItem';
import AddTaskButton from '@/components/tasks/AddTaskButton';

interface WeekViewProps {
  startDate: Date;
  currentEnergy: EnergyLevel;
  onDayClick: (date: Date) => void;
  onBack: () => void;
}

const WeekView = ({ startDate, currentEnergy, onDayClick, onBack }: WeekViewProps) => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);

  const weekStart = startOfWeek(startDate, { weekStartsOn: 1 });
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  useEffect(() => {
    loadTasks();
  }, [startDate]);

  const loadTasks = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const startStr = format(weekStart, 'yyyy-MM-dd');
      const endStr = format(addDays(weekStart, 6), 'yyyy-MM-dd');

      const { data, error } = await supabase
        .from('tasks')
        .select('*')
        .eq('user_id', user.id)
        .gte('due_date', startStr)
        .lte('due_date', endStr)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setTasks(data as Task[] || []);
    } catch (err) {
      console.error('Load tasks error:', err);
    } finally {
      setLoading(false);
    }
  };

  const getTasksForDay = (date: Date) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    return tasks.filter(t => t.due_date === dateStr);
  };

  const handleAddTask = async (date: Date, title: string, energy: EnergyLevel) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('tasks')
        .insert({
          user_id: user.id,
          title,
          energy_level: energy,
          due_date: format(date, 'yyyy-MM-dd'),
        })
        .select()
        .single();

      if (error) throw error;
      if (data) {
        setTasks(prev => [...prev, data as Task]);
      }
    } catch (err) {
      console.error('Add task error:', err);
    }
  };

  const handleUpdateTask = async (taskId: string, updates: Partial<Task>) => {
    try {
      const { error } = await supabase
        .from('tasks')
        .update(updates)
        .eq('id', taskId);

      if (error) throw error;
      setTasks(prev => prev.map(t => t.id === taskId ? { ...t, ...updates } : t));
    } catch (err) {
      console.error('Update task error:', err);
    }
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
        {weekDays.map((day) => {
          const dayTasks = getTasksForDay(day);
          const today = isToday(day);

          return (
            <div
              key={day.toISOString()}
              className={cn(
                "rounded-lg border border-border bg-card p-3 min-h-[300px]",
                today && "border-primary ring-1 ring-primary/20"
              )}
            >
              <button
                onClick={() => onDayClick(day)}
                className={cn(
                  "w-full text-left mb-3 hover:text-primary transition-colors",
                  today && "text-primary"
                )}
              >
                <div className="text-xs text-foreground-muted uppercase">
                  {format(day, 'EEE')}
                </div>
                <div className={cn(
                  "text-lg font-medium",
                  today ? "text-primary" : "text-foreground"
                )}>
                  {format(day, 'd')}
                </div>
              </button>

              <div className="space-y-2">
                {dayTasks.slice(0, 3).map(task => (
                  <div
                    key={task.id}
                    className={cn(
                      "text-xs p-2 rounded bg-secondary truncate",
                      task.completed && "line-through opacity-60"
                    )}
                  >
                    {task.title}
                  </div>
                ))}
                {dayTasks.length > 3 && (
                  <div className="text-xs text-foreground-muted">
                    +{dayTasks.length - 3} more
                  </div>
                )}
                <AddTaskButton
                  onAdd={(title, energy) => handleAddTask(day, title, energy)}
                  defaultEnergy={currentEnergy}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default WeekView;
