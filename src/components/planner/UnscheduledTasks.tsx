import { useState, useEffect, useRef } from 'react';
import { EnergyLevel, Task } from '@/types';
import { InboxIcon, ChevronRight, ChevronDown, Plus } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { ScrollArea } from '@/components/ui/scroll-area';
import InboxTaskItem from '@/components/tasks/InboxTaskItem';

interface UnscheduledTasksProps {
  energyFilter: EnergyLevel[];
  onScheduleTask: (taskId: string, date: Date) => void;
}

const UnscheduledTasks = ({ energyFilter }: UnscheduledTasksProps) => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [collapsed, setCollapsed] = useState(false);

  // Always-visible new task input
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const newTaskInputRef = useRef<HTMLInputElement>(null);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    // Get user first, then load tasks
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUserId(user.id);
        loadTasks(user.id);
      }
    };
    init();

    // Subscribe to task changes
    const channel = supabase
      .channel('unscheduled-tasks')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tasks' }, async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) loadTasks(user.id);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const loadTasks = async (uid?: string) => {
    const userIdToUse = uid || userId;
    if (!userIdToUse) return;
    
    try {
      const { data, error } = await supabase
        .from('tasks')
        .select('*')
        .eq('user_id', userIdToUse)
        .is('due_date', null)
        .eq('completed', false)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setTasks((data as Task[]) || []);
    } catch (err) {
      console.error('Load unscheduled tasks error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleScheduleTask = async (
    taskId: string,
    dueDate: string,
    startTime?: string,
    endTime?: string
  ) => {
    try {
      const { error } = await supabase
        .from('tasks')
        .update({
          due_date: dueDate,
          start_time: startTime === 'none' ? null : startTime,
          end_time: endTime === 'none' ? null : endTime,
        })
        .eq('id', taskId);

      if (error) throw error;

      // Remove from local state
      setTasks(prev => prev.filter(t => t.id !== taskId));
    } catch (err) {
      console.error('Schedule task error:', err);
    }
  };

  const handleEnergyChange = async (taskId: string, energy: EnergyLevel) => {
    try {
      const { error } = await supabase
        .from('tasks')
        .update({ energy_level: energy })
        .eq('id', taskId);

      if (error) throw error;

      // Update local state
      setTasks(prev => prev.map(t =>
        t.id === taskId ? { ...t, energy_level: energy } : t
      ));
    } catch (err) {
      console.error('Update energy error:', err);
    }
  };

  const handleTitleChange = async (taskId: string, title: string) => {
    try {
      const { error } = await supabase
        .from('tasks')
        .update({ title })
        .eq('id', taskId);

      if (error) throw error;

      // Update local state
      setTasks(prev => prev.map(t =>
        t.id === taskId ? { ...t, title } : t
      ));
    } catch (err) {
      console.error('Update title error:', err);
    }
  };

  const createNewTask = async () => {
    const title = newTaskTitle.trim();
    if (!title || !userId) return;

    try {
      const { data, error } = await supabase
        .from('tasks')
        .insert({
          user_id: userId,
          title,
          energy_level: 'medium',
          due_date: null,
          completed: false,
          detected_from_brain_dump: false,
        })
        .select()
        .single();

      if (error) throw error;

      const newTask = data as Task;
      setTasks(prev => [newTask, ...prev]);
      setNewTaskTitle('');
    } catch (err) {
      console.error('Create inbox task error:', err);
    }
  };

  // Filter by energy if filter is active
  const filteredTasks = energyFilter.length > 0
    ? tasks.filter(t => energyFilter.includes(t.energy_level))
    : tasks;

  if (loading) return null;

  // Show inbox even when empty so user can add tasks
  const showInbox = filteredTasks.length > 0 || tasks.length === 0;
  if (!showInbox) return null;

  return (
    <div className="border-b border-border bg-secondary/30">
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-secondary/50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <InboxIcon className="w-4 h-4 text-foreground-muted" />
          <span className="text-sm font-medium text-foreground">Inbox</span>
          {filteredTasks.length > 0 && (
            <span className="text-xs text-foreground-muted bg-secondary px-2 py-0.5 rounded-full">
              {filteredTasks.length} unscheduled
            </span>
          )}
          <span className="text-xs text-foreground-muted opacity-60 hidden sm:inline">
            • Drag tasks to calendar or double-click to edit
          </span>
        </div>
        {collapsed ? (
          <ChevronRight className="w-4 h-4 text-foreground-muted" />
        ) : (
          <ChevronDown className="w-4 h-4 text-foreground-muted" />
        )}
      </button>

      {!collapsed && (
        <ScrollArea className="max-h-[280px]">
          <div className="px-4 pb-4 space-y-2">
            {filteredTasks.map(task => (
              <InboxTaskItem
                key={task.id}
                task={task}
                onSchedule={handleScheduleTask}
                onEnergyChange={handleEnergyChange}
                onTitleChange={handleTitleChange}
              />
            ))}

            {/* Always-visible new task input */}
            <div className="flex items-center gap-2 p-2 rounded bg-card/50 border border-border/50 hover:border-border transition-colors">
              <Plus className="w-4 h-4 text-foreground-muted flex-shrink-0" />
              <input
                ref={newTaskInputRef}
                value={newTaskTitle}
                onChange={(e) => setNewTaskTitle(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') createNewTask();
                  if (e.key === 'Escape') {
                    setNewTaskTitle('');
                    newTaskInputRef.current?.blur();
                  }
                }}
                placeholder="New task…"
                className="flex-1 bg-transparent border-none outline-none text-sm text-foreground placeholder:text-foreground-muted/60 focus:ring-0 focus:outline-none p-0"
              />
            </div>
          </div>
        </ScrollArea>
      )}
    </div>
  );
};

export default UnscheduledTasks;
