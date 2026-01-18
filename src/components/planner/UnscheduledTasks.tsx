import { useState, useEffect, useRef, useMemo } from 'react';
import { cn } from '@/lib/utils';
import { EnergyLevel, Task } from '@/types';
import { InboxIcon, ChevronRight, ChevronDown, Plus, RefreshCw, Search, ChevronUp, AlertTriangle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import InboxTaskItem from '@/components/tasks/InboxTaskItem';
import { useToast } from '@/hooks/use-toast';

interface UnscheduledTasksProps {
  energyFilter: EnergyLevel[];
  onScheduleTask: (taskId: string, date: Date) => void;
}

const MAX_VISIBLE_TASKS = 5;

const UnscheduledTasks = ({ energyFilter }: UnscheduledTasksProps) => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearch, setShowSearch] = useState(false);

  // Always-visible new task input
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const newTaskInputRef = useRef<HTMLInputElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const { toast } = useToast();

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

  useEffect(() => {
    if (showSearch && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [showSearch]);

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

  const handleDeleteTask = async (taskId: string) => {
    try {
      const { error } = await supabase
        .from('tasks')
        .delete()
        .eq('id', taskId);

      if (error) throw error;

      setTasks(prev => prev.filter(t => t.id !== taskId));
      toast({ title: 'Deleted', description: 'Task removed from inbox' });
    } catch (err) {
      console.error('Delete task error:', err);
      toast({ title: 'Error', description: 'Could not delete task', variant: 'destructive' });
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
  const energyFilteredTasks = energyFilter.length > 0
    ? tasks.filter(t => energyFilter.includes(t.energy_level))
    : tasks;

  // Filter by search query
  const filteredTasks = useMemo(() => {
    if (!searchQuery.trim()) return energyFilteredTasks;
    const query = searchQuery.toLowerCase();
    return energyFilteredTasks.filter(t => 
      t.title.toLowerCase().includes(query) ||
      t.description?.toLowerCase().includes(query)
    );
  }, [energyFilteredTasks, searchQuery]);

  // Visible tasks (limited unless expanded)
  const visibleTasks = expanded ? filteredTasks : filteredTasks.slice(0, MAX_VISIBLE_TASKS);
  const hiddenCount = filteredTasks.length - MAX_VISIBLE_TASKS;
  const isOverflowing = filteredTasks.length > MAX_VISIBLE_TASKS;

  if (loading) return null;

  // Show inbox even when empty so user can add tasks
  const showInbox = filteredTasks.length > 0 || tasks.length === 0;
  if (!showInbox) return null;

  return (
    <div className={cn(
      "border-b border-border bg-secondary/30",
      isOverflowing && !expanded && "border-l-2 border-l-amber-500/50"
    )}>
      <div
        role="button"
        tabIndex={0}
        aria-expanded={!collapsed}
        onClick={() => setCollapsed(!collapsed)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            setCollapsed((v) => !v);
          }
        }}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-secondary/50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <InboxIcon className="w-4 h-4 text-foreground-muted" />
          <span className="text-sm font-medium text-foreground">Inbox</span>
          {filteredTasks.length > 0 && (
            <span className={cn(
              "text-xs px-2 py-0.5 rounded-full",
              isOverflowing 
                ? "bg-amber-500/20 text-amber-400" 
                : "bg-secondary text-foreground-muted"
            )}>
              {filteredTasks.length} unscheduled
              {isOverflowing && !expanded && (
                <span className="ml-1">
                  <AlertTriangle className="w-3 h-3 inline -mt-0.5" />
                </span>
              )}
            </span>
          )}
          <span className="text-xs text-foreground-muted opacity-60 hidden lg:inline">
            • Drag tasks to calendar
          </span>
        </div>

        <div className="flex items-center gap-1">
          {/* Search toggle */}
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 opacity-60 hover:opacity-100 hover:bg-secondary"
            onClick={(e) => {
              e.stopPropagation();
              setShowSearch(v => !v);
              if (showSearch) setSearchQuery('');
            }}
            title="Search inbox"
          >
            <Search className={cn("w-3.5 h-3.5", showSearch && "text-primary")} />
          </Button>

          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 opacity-60 hover:opacity-100 hover:bg-secondary"
            onClick={async (e) => {
              e.stopPropagation();
              if (!userId) return;
              setRefreshing(true);
              await loadTasks(userId);
              setRefreshing(false);
            }}
            title="Refresh inbox"
          >
            <RefreshCw className={cn("w-3.5 h-3.5", refreshing && "animate-spin")} />
          </Button>

          {collapsed ? (
            <ChevronRight className="w-4 h-4 text-foreground-muted" />
          ) : (
            <ChevronDown className="w-4 h-4 text-foreground-muted" />
          )}
        </div>
      </div>

      {!collapsed && (
        <div className="px-4 pb-4 space-y-2">
          {/* Search input */}
          {showSearch && (
            <div className="relative">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-foreground-muted" />
              <input
                ref={searchInputRef}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Filter tasks..."
                className="w-full pl-7 pr-3 py-1.5 rounded bg-card border border-border text-sm text-foreground placeholder:text-foreground-muted/60 focus:outline-none focus:ring-1 focus:ring-primary"
                onClick={(e) => e.stopPropagation()}
              />
            </div>
          )}

          {/* Always-visible new task input at the top */}
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

          {/* Task list */}
          {visibleTasks.map(task => (
            <InboxTaskItem
              key={task.id}
              task={task}
              onSchedule={handleScheduleTask}
              onEnergyChange={handleEnergyChange}
              onTitleChange={handleTitleChange}
              onDelete={handleDeleteTask}
            />
          ))}

          {/* Overflow indicator */}
          {isOverflowing && (
            <button
              onClick={() => setExpanded(v => !v)}
              className={cn(
                "w-full flex items-center justify-center gap-2 py-2 rounded text-xs transition-colors",
                expanded
                  ? "text-foreground-muted hover:text-foreground"
                  : "bg-amber-500/10 text-amber-400 hover:bg-amber-500/20"
              )}
            >
              {expanded ? (
                <>
                  <ChevronUp className="w-3.5 h-3.5" />
                  Show less
                </>
              ) : (
                <>
                  <AlertTriangle className="w-3.5 h-3.5" />
                  +{hiddenCount} more tasks — clear your inbox!
                  <ChevronDown className="w-3.5 h-3.5" />
                </>
              )}
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default UnscheduledTasks;
