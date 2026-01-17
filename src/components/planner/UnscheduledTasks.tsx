import { useState, useEffect, useRef } from 'react';
import { EnergyLevel, Task } from '@/types';
import { InboxIcon, ChevronRight, ChevronDown, Plus, Check, X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { ScrollArea } from '@/components/ui/scroll-area';
import InboxTaskItem from '@/components/tasks/InboxTaskItem';
import { Button } from '@/components/ui/button';

interface UnscheduledTasksProps {
  energyFilter: EnergyLevel[];
  onScheduleTask: (taskId: string, date: Date) => void;
}

const UnscheduledTasks = ({ energyFilter }: UnscheduledTasksProps) => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [collapsed, setCollapsed] = useState(false);

  // Quick add-below state
  const [createAfterId, setCreateAfterId] = useState<string | null>(null);
  const [createTitle, setCreateTitle] = useState('');
  const createInputRef = useRef<HTMLInputElement>(null);
  const [userId, setUserId] = useState<string | null>(null);

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

  useEffect(() => {
    if (!createAfterId) return;
    requestAnimationFrame(() => createInputRef.current?.focus());
  }, [createAfterId]);

  const loadTasks = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      setUserId(user.id);

      const { data, error } = await supabase
        .from('tasks')
        .select('*')
        .eq('user_id', user.id)
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

  const openCreateBelow = (afterTaskId: string) => {
    setCreateAfterId(afterTaskId);
    setCreateTitle('');
  };

  const cancelCreateBelow = () => {
    setCreateAfterId(null);
    setCreateTitle('');
  };

  const createTaskBelow = async () => {
    const title = createTitle.trim();
    if (!title || !userId || !createAfterId) return;

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
      setTasks(prev => {
        const idx = prev.findIndex(t => t.id === createAfterId);
        if (idx === -1) return [newTask, ...prev];
        const next = [...prev];
        next.splice(idx + 1, 0, newTask);
        return next;
      });

      cancelCreateBelow();
    } catch (err) {
      console.error('Create inbox task error:', err);
    }
  };

  // Filter by energy if filter is active
  const filteredTasks = energyFilter.length > 0
    ? tasks.filter(t => energyFilter.includes(t.energy_level))
    : tasks;

  if (loading) return null;
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
          <span className="text-xs text-foreground-muted opacity-60 hidden sm:inline">
            • Drag tasks to calendar, double-click to edit, or add below
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
              <div key={task.id} className="space-y-2">
                <InboxTaskItem
                  task={task}
                  onSchedule={handleScheduleTask}
                  onEnergyChange={handleEnergyChange}
                  onTitleChange={handleTitleChange}
                  onAddBelow={openCreateBelow}
                />

                {createAfterId === task.id && (
                  <div className="flex items-center gap-2 p-2 rounded bg-card border border-border">
                    <Plus className="w-4 h-4 text-foreground-muted flex-shrink-0" />
                    <input
                      ref={createInputRef}
                      value={createTitle}
                      onChange={(e) => setCreateTitle(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') createTaskBelow();
                        if (e.key === 'Escape') cancelCreateBelow();
                      }}
                      placeholder="New task…"
                      className="flex-1 bg-transparent border-none outline-none text-sm text-foreground focus:ring-0 focus:outline-none p-0 selection:bg-transparent"
                    />
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 p-0"
                      onClick={(e) => {
                        e.stopPropagation();
                        createTaskBelow();
                      }}
                      disabled={!createTitle.trim()}
                    >
                      <Check className="w-4 h-4 text-primary" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 p-0"
                      onClick={(e) => {
                        e.stopPropagation();
                        cancelCreateBelow();
                      }}
                    >
                      <X className="w-4 h-4 text-foreground-muted" />
                    </Button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </ScrollArea>
      )}
    </div>
  );
};

export default UnscheduledTasks;

