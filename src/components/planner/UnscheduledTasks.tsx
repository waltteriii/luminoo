import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { EnergyLevel, Task } from '@/types';
import { InboxIcon, Calendar, ChevronRight, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import TaskItem from '@/components/tasks/TaskItem';
import { ScrollArea } from '@/components/ui/scroll-area';

interface UnscheduledTasksProps {
  energyFilter: EnergyLevel[];
  onScheduleTask: (taskId: string, date: Date) => void;
}

const UnscheduledTasks = ({ energyFilter, onScheduleTask }: UnscheduledTasksProps) => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    loadTasks();
    
    // Subscribe to task changes
    const channel = supabase
      .channel('unscheduled-tasks')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tasks' }, () => {
        loadTasks();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const loadTasks = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('tasks')
        .select('*')
        .eq('user_id', user.id)
        .is('due_date', null)
        .eq('completed', false)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setTasks(data as Task[] || []);
    } catch (err) {
      console.error('Load unscheduled tasks error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateTask = async (taskId: string, updates: Partial<Task>) => {
    try {
      const { error } = await supabase
        .from('tasks')
        .update(updates)
        .eq('id', taskId);

      if (error) throw error;
      
      // If due_date was set, remove from local state
      if (updates.due_date) {
        setTasks(prev => prev.filter(t => t.id !== taskId));
      } else {
        setTasks(prev => prev.map(t => t.id === taskId ? { ...t, ...updates } : t));
      }
    } catch (err) {
      console.error('Update task error:', err);
    }
  };

  const handleQuickSchedule = async (taskId: string, daysFromNow: number) => {
    const date = new Date();
    date.setDate(date.getDate() + daysFromNow);
    await handleUpdateTask(taskId, { due_date: format(date, 'yyyy-MM-dd') });
  };

  // Filter by energy if filter is active
  const filteredTasks = energyFilter.length > 0
    ? tasks.filter(t => energyFilter.includes(t.energy_level))
    : tasks;

  if (filteredTasks.length === 0) return null;

  return (
    <div className="border-b border-border bg-secondary/30">
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-secondary/50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <InboxIcon className="w-4 h-4 text-foreground-muted" />
          <span className="text-sm font-medium text-foreground">Inbox</span>
          <span className="text-xs text-foreground-muted bg-secondary px-2 py-0.5 rounded-full">
            {filteredTasks.length} unscheduled
          </span>
        </div>
        {collapsed ? (
          <ChevronRight className="w-4 h-4 text-foreground-muted" />
        ) : (
          <ChevronDown className="w-4 h-4 text-foreground-muted" />
        )}
      </button>

      {!collapsed && (
        <ScrollArea className="max-h-[250px]">
          <div className="px-4 pb-4 space-y-2">
            {filteredTasks.map(task => (
              <div key={task.id} className="group">
                <TaskItem
                  task={task}
                  onUpdate={(updates) => handleUpdateTask(task.id, updates)}
                />
                <div className="flex gap-1 mt-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 px-2 text-xs"
                    onClick={() => handleQuickSchedule(task.id, 0)}
                  >
                    Today
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 px-2 text-xs"
                    onClick={() => handleQuickSchedule(task.id, 1)}
                  >
                    Tomorrow
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 px-2 text-xs"
                    onClick={() => handleQuickSchedule(task.id, 7)}
                  >
                    Next week
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      )}
    </div>
  );
};

export default UnscheduledTasks;
