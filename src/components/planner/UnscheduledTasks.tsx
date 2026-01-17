import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { EnergyLevel, Task } from '@/types';
import { InboxIcon, ChevronRight, ChevronDown } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { ScrollArea } from '@/components/ui/scroll-area';
import InboxTaskItem from '@/components/tasks/InboxTaskItem';
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';

interface UnscheduledTasksProps {
  energyFilter: EnergyLevel[];
  onScheduleTask: (taskId: string, date: Date) => void;
}

const UnscheduledTasks = ({ energyFilter, onScheduleTask }: UnscheduledTasksProps) => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [collapsed, setCollapsed] = useState(false);
  const [activeTask, setActiveTask] = useState<Task | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

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
          start_time: startTime,
          end_time: endTime,
        })
        .eq('id', taskId);

      if (error) throw error;
      
      // Remove from local state
      setTasks(prev => prev.filter(t => t.id !== taskId));
    } catch (err) {
      console.error('Schedule task error:', err);
    }
  };

  const handleDragStart = (event: any) => {
    const task = event.active.data.current?.task;
    if (task) {
      setActiveTask(task);
    }
  };

  const handleDragEnd = () => {
    setActiveTask(null);
  };

  // Filter by energy if filter is active
  const filteredTasks = energyFilter.length > 0
    ? tasks.filter(t => energyFilter.includes(t.energy_level))
    : tasks;

  if (filteredTasks.length === 0) return null;

  return (
    <DndContext
      sensors={sensors}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
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
              • Drag tasks to calendar
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
                <InboxTaskItem
                  key={task.id}
                  task={task}
                  onSchedule={handleScheduleTask}
                />
              ))}
            </div>
          </ScrollArea>
        )}
      </div>

      {/* Drag overlay for visual feedback */}
      <DragOverlay>
        {activeTask && (
          <div className="p-2 rounded bg-card border border-primary shadow-lg opacity-90">
            <span className="text-sm">{activeTask.title}</span>
          </div>
        )}
      </DragOverlay>
    </DndContext>
  );
};

export default UnscheduledTasks;