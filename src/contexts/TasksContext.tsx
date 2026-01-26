import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { Task, TaskInsert, TaskUpdate } from '@/types';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useUndoOptional } from '@/contexts/UndoContext';

// Local types for context
// type TaskInsert = Partial<Omit<Task, 'id' | 'created_at' | 'updated_at' | 'user_id'>> & { title: string };
// type TaskUpdate = Partial<Task>;

interface TasksContextValue {
  tasks: Task[];
  loading: boolean;
  addTask: (task: TaskInsert) => Promise<Task | null>;
  updateTask: (id: string, updates: TaskUpdate) => Promise<boolean>;
  deleteTask: (id: string) => Promise<boolean>;
  rescheduleTask: (id: string, newDate: string | null, startTime?: string | null, endTime?: string | null) => Promise<boolean>;
  refreshTasks: () => Promise<void>;
}

const TasksContext = createContext<TasksContextValue | undefined>(undefined);

export const useTasksContext = () => {
  const context = useContext(TasksContext);
  if (!context) {
    throw new Error('useTasksContext must be used within a TasksProvider');
  }
  return context;
};

interface TasksProviderProps {
  children: ReactNode;
  userId: string;
}

export const TasksProvider = ({ children, userId }: TasksProviderProps) => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const { showUndo } = useUndoOptional();

  const fetchTasks = useCallback(async () => {
    if (!userId) {
      setTasks([]);
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('tasks')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setTasks(data || []);
    } catch (err) {
      console.error('Error fetching tasks:', err);
      toast({
        title: 'Error loading tasks',
        description: 'Please check your connection',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [userId, toast]);

  // Initial fetch
  useEffect(() => {
    fetchTasks();

    // Subscribe to realtime changes
    const channel = supabase
      .channel('tasks-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'tasks',
          filter: `user_id=eq.${userId}`,
        },
        async (payload) => {
          // Simple refresh strategy for now
          fetchTasks();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchTasks, userId]);

  // Add task
  const addTask = useCallback(
    async (taskData: TaskInsert): Promise<Task | null> => {
      if (!userId) return null;

      try {
        const { data, error } = await supabase
          .from('tasks')
          .insert({
            ...taskData,
            user_id: userId,
          })
          .select()
          .single();

        if (error) throw error;

        // Optimistic update done by realtime subscription or explicit fetch
        // But for speed we can append locally too if we want, but fetch is safer
        return data;
      } catch (err) {
        console.error('Add task error:', err);
        toast({
          title: 'Error creating task',
          description: 'Could not save task to database',
          variant: 'destructive',
        });
        return null;
      }
    },
    [userId, toast]
  );

  // Update task
  const updateTask = useCallback(
    async (id: string, updates: TaskUpdate): Promise<boolean> => {
      try {
        const { error } = await supabase
          .from('tasks')
          .update(updates)
          .eq('id', id);

        if (error) throw error;
        return true;
      } catch (err) {
        console.error('Update task error:', err);
        toast({
          title: 'Update failed',
          variant: 'destructive',
        });
        return false;
      }
    },
    [toast]
  );

  // Delete task
  const deleteTask = useCallback(
    async (id: string): Promise<boolean> => {
      // Find task for undo
      const taskToDelete = tasks.find((t) => t.id === id);

      try {
        const { error } = await supabase
          .from('tasks')
          .delete()
          .eq('id', id);

        if (error) throw error;

        if (taskToDelete) {
          showUndo('Task deleted', async () => {
            // Restore logic
            const { id: _, ...rest } = taskToDelete;
            await addTask(rest);
          });
        }

        return true;
      } catch (err) {
        console.error('Delete task error:', err);
        toast({
          title: 'Delete failed',
          variant: 'destructive',
        });
        return false;
      }
    },
    [tasks, toast, showUndo, addTask]
  );

  const rescheduleTask = useCallback(
    async (id: string, newDate: string | null, startTime?: string | null, endTime?: string | null): Promise<boolean> => {
      return updateTask(id, {
        due_date: newDate,
        start_time: startTime ?? null,
        end_time: endTime ?? null,
      });
    },
    [updateTask]
  );

  return (
    <TasksContext.Provider
      value={{
        tasks,
        loading,
        addTask,
        updateTask,
        deleteTask,
        rescheduleTask,
        refreshTasks: fetchTasks,
      }}
    >
      {children}
    </TasksContext.Provider>
  );
};
