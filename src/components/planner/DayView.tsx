import { useState, useEffect } from 'react';
import { format, startOfDay, addHours } from 'date-fns';
import { cn } from '@/lib/utils';
import { EnergyLevel, Task } from '@/types';
import { ChevronLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import TaskItem from '@/components/tasks/TaskItem';
import AddTaskButton from '@/components/tasks/AddTaskButton';

interface DayViewProps {
  date: Date;
  currentEnergy: EnergyLevel;
  energyFilter?: EnergyLevel[];
  onBack: () => void;
}

const DayView = ({ date, currentEnergy, onBack }: DayViewProps) => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadTasks();
  }, [date]);

  const loadTasks = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const dateStr = format(date, 'yyyy-MM-dd');
      const { data, error } = await supabase
        .from('tasks')
        .select('*')
        .eq('user_id', user.id)
        .eq('due_date', dateStr)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setTasks(data as Task[] || []);
    } catch (err) {
      console.error('Load tasks error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddTask = async (title: string, energy: EnergyLevel) => {
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

  const hours = Array.from({ length: 16 }, (_, i) => i + 6); // 6am to 10pm

  return (
    <div className="animate-fade-in">
      <div className="flex items-center gap-4 mb-6">
        <Button variant="ghost" size="sm" onClick={onBack} className="gap-1">
          <ChevronLeft className="w-4 h-4" />
          Back
        </Button>
        <div>
          <h2 className="text-2xl font-light text-foreground">
            {format(date, 'EEEE')}
          </h2>
          <p className="text-foreground-muted">{format(date, 'MMMM d, yyyy')}</p>
        </div>
      </div>

      <div className="grid grid-cols-[auto_1fr] gap-4">
        {/* Time column */}
        <div className="space-y-8">
          {hours.map(hour => (
            <div key={hour} className="h-16 flex items-start">
              <span className="text-xs text-foreground-muted w-12">
                {format(addHours(startOfDay(date), hour), 'h a')}
              </span>
            </div>
          ))}
        </div>

        {/* Tasks column */}
        <div className="border-l border-border pl-4">
          <div className="space-y-2 mb-4">
            {tasks.map(task => (
              <TaskItem
                key={task.id}
                task={task}
                onUpdate={(updates) => handleUpdateTask(task.id, updates)}
              />
            ))}
          </div>
          <AddTaskButton onAdd={handleAddTask} defaultEnergy={currentEnergy} />
        </div>
      </div>
    </div>
  );
};

export default DayView;
