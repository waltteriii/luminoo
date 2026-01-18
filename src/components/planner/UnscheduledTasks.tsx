import { useState, useEffect, useRef, useMemo, useCallback, memo } from 'react';
import { cn } from '@/lib/utils';
import { EnergyLevel, Task } from '@/types';
import { InboxIcon, ChevronRight, ChevronDown, Plus, RefreshCw, Search, ChevronUp, AlertTriangle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import InboxTaskItem from '@/components/tasks/InboxTaskItem';
import { useToast } from '@/hooks/use-toast';
import { useIsMobile } from '@/hooks/use-mobile';

interface UnscheduledTasksProps {
  energyFilter: EnergyLevel[];
  onScheduleTask: (taskId: string, date: Date) => void;
}

// Smart grid: show complete rows only (accounting for new task input taking 1 slot)
// 3 cols × 3 rows = 9 slots → 8 tasks + input
// 2 cols × 3 rows = 6 slots → 5 tasks + input
// 1 col × 4 rows = 4 slots → 3 tasks + input
const ROWS_MOBILE = 4;
const ROWS_TABLET = 3;
const ROWS_DESKTOP = 3;

const UnscheduledTasks = memo(({ energyFilter }: UnscheduledTasksProps) => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearch, setShowSearch] = useState(false);

  const [newTaskTitle, setNewTaskTitle] = useState('');
  const newTaskInputRef = useRef<HTMLInputElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const { toast } = useToast();
  const isMobile = useIsMobile();

  // Responsive columns and max visible tasks
  const [windowWidth, setWindowWidth] = useState(typeof window !== 'undefined' ? window.innerWidth : 1024);
  
  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Calculate columns and max visible to fill complete rows
  const { columns, maxVisible } = useMemo(() => {
    let cols: number;
    let rows: number;
    
    if (windowWidth >= 1536) {
      cols = 3;
      rows = ROWS_DESKTOP;
    } else if (windowWidth >= 1024) {
      cols = 2;
      rows = ROWS_TABLET;
    } else {
      cols = 1;
      rows = ROWS_MOBILE;
    }
    
    // Total slots minus 1 for the new task input
    const totalSlots = cols * rows;
    const maxTasks = totalSlots - 1;
    
    return { columns: cols, maxVisible: maxTasks };
  }, [windowWidth]);

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUserId(user.id);
        loadTasks(user.id);
      }
    };
    init();

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

  const loadTasks = useCallback(async (uid?: string) => {
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
      // Error handling
    } finally {
      setLoading(false);
    }
  }, [userId]);

  const handleScheduleTask = useCallback(async (
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
      setTasks(prev => prev.filter(t => t.id !== taskId));
    } catch (err) {
      // Error handling
    }
  }, []);

  const handleEnergyChange = useCallback(async (taskId: string, energy: EnergyLevel) => {
    try {
      const { error } = await supabase
        .from('tasks')
        .update({ energy_level: energy })
        .eq('id', taskId);

      if (error) throw error;
      setTasks(prev => prev.map(t =>
        t.id === taskId ? { ...t, energy_level: energy } : t
      ));
    } catch (err) {
      // Error handling
    }
  }, []);

  const handleTitleChange = useCallback(async (taskId: string, title: string) => {
    try {
      const { error } = await supabase
        .from('tasks')
        .update({ title })
        .eq('id', taskId);

      if (error) throw error;
      setTasks(prev => prev.map(t =>
        t.id === taskId ? { ...t, title } : t
      ));
    } catch (err) {
      // Error handling
    }
  }, []);

  const handleDeleteTask = useCallback(async (taskId: string) => {
    try {
      const { error } = await supabase
        .from('tasks')
        .delete()
        .eq('id', taskId);

      if (error) throw error;

      setTasks(prev => prev.filter(t => t.id !== taskId));
      toast({ title: 'Deleted', description: 'Task removed from inbox' });
    } catch (err) {
      toast({ title: 'Error', description: 'Could not delete task', variant: 'destructive' });
    }
  }, [toast]);

  const createNewTask = useCallback(async () => {
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
      // Error handling
    }
  }, [newTaskTitle, userId]);

  const energyFilteredTasks = useMemo(() => 
    energyFilter.length > 0
      ? tasks.filter(t => energyFilter.includes(t.energy_level))
      : tasks,
    [tasks, energyFilter]
  );

  const filteredTasks = useMemo(() => {
    if (!searchQuery.trim()) return energyFilteredTasks;
    const query = searchQuery.toLowerCase();
    return energyFilteredTasks.filter(t => 
      t.title.toLowerCase().includes(query) ||
      t.description?.toLowerCase().includes(query)
    );
  }, [energyFilteredTasks, searchQuery]);

  const visibleTasks = useMemo(() => 
    expanded ? filteredTasks : filteredTasks.slice(0, maxVisible),
    [expanded, filteredTasks, maxVisible]
  );
  
  const hiddenCount = filteredTasks.length - maxVisible;
  const isOverflowing = filteredTasks.length > maxVisible;

  if (loading) return null;

  const showInbox = filteredTasks.length > 0 || tasks.length === 0;
  if (!showInbox) return null;

  return (
    <div className={cn(
      "border-b border-border bg-secondary/30",
      isOverflowing && !expanded && "border-l border-l-highlight/40"
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
        className="w-full flex items-center justify-between px-3 sm:px-4 lg:px-6 py-2 lg:py-2.5 hover:bg-secondary/50 transition-colors min-h-[44px] lg:min-h-[48px]"
      >
        <div className="flex items-center gap-2 min-w-0">
          <InboxIcon className="w-4 h-4 text-foreground-muted flex-shrink-0" />
          <span className="text-sm font-medium text-foreground">Inbox</span>
          {filteredTasks.length > 0 && (
            <span className={cn(
              "text-xs px-2 py-0.5 rounded-full flex-shrink-0",
              isOverflowing 
                ? "bg-highlight-muted text-highlight-foreground" 
                : "bg-secondary text-foreground-muted"
            )}>
              {filteredTasks.length}
              {isOverflowing && !expanded && (
                <AlertTriangle className="w-3 h-3 inline ml-1 -mt-0.5" />
              )}
            </span>
          )}
          {!isMobile && (
            <span className="text-xs text-foreground-muted opacity-60 hidden lg:inline">
              • Drag tasks to calendar
            </span>
          )}
        </div>

        <div className="flex items-center gap-1 flex-shrink-0">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 opacity-60 hover:opacity-100 hover:bg-secondary"
            onClick={(e) => {
              e.stopPropagation();
              setShowSearch(v => !v);
              if (showSearch) setSearchQuery('');
            }}
            title="Search inbox"
          >
            <Search className={cn("w-4 h-4", showSearch && "text-primary")} />
          </Button>

          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 opacity-60 hover:opacity-100 hover:bg-secondary"
            onClick={async (e) => {
              e.stopPropagation();
              if (!userId) return;
              setRefreshing(true);
              await loadTasks(userId);
              setRefreshing(false);
            }}
            title="Refresh inbox"
          >
            <RefreshCw className={cn("w-4 h-4", refreshing && "animate-spin")} />
          </Button>

          {collapsed ? (
            <ChevronRight className="w-4 h-4 text-foreground-muted" />
          ) : (
            <ChevronDown className="w-4 h-4 text-foreground-muted" />
          )}
        </div>
      </div>

      {!collapsed && (
        <div className="px-3 sm:px-4 lg:px-6 pb-3 lg:pb-4 space-y-2">
          {showSearch && (
            <div className="relative max-w-md">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-foreground-muted" />
              <input
                ref={searchInputRef}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Filter tasks..."
                className="w-full pl-9 pr-3 py-2 rounded-lg bg-card border border-border text-sm text-foreground placeholder:text-foreground-muted/60 focus:outline-none focus:ring-2 focus:ring-primary/50 min-h-[44px]"
                onClick={(e) => e.stopPropagation()}
              />
            </div>
          )}

          {/* Task grid - responsive 1/2/3 columns */}
          <div className="grid grid-cols-1 lg:grid-cols-2 2xl:grid-cols-3 gap-2">
            {/* New task input - consistent highlight (no intensity shift) */}
            <div className="flex items-center gap-2 p-2.5 rounded-lg bg-card border border-border hover:border-highlight focus-within:border-highlight transition-colors min-h-[44px] group">
              <Plus className="w-4 h-4 text-foreground-muted group-focus-within:text-highlight flex-shrink-0 transition-colors" />
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
          </div>

          {/* Clean overflow indicator */}
          {isOverflowing && (
            <button
              onClick={() => setExpanded(v => !v)}
              className="w-full flex items-center justify-center gap-1 py-2 text-xs text-highlight hover:text-highlight/80 transition-colors"
            >
              {expanded ? (
                <>
                  <ChevronUp className="w-3.5 h-3.5" />
                  <span>Show less</span>
                </>
              ) : (
                <>
                  <span>+{hiddenCount} more · clean your inbox</span>
                  <ChevronDown className="w-3.5 h-3.5" />
                </>
              )}
            </button>
          )}
        </div>
      )}
    </div>
  );
});

UnscheduledTasks.displayName = 'UnscheduledTasks';

export default UnscheduledTasks;
