import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { Tables, TablesInsert, TablesUpdate } from '@/integrations/supabase/types';

type Task = Tables<'tasks'>;
type TaskInsert = TablesInsert<'tasks'>;
type TaskUpdate = TablesUpdate<'tasks'>;

interface TasksContextValue {
  tasks: Task[];
  loading: boolean;
  addTask: (task: Omit<TaskInsert, 'user_id'>) => Promise<Task | null>;
  updateTask: (id: string, updates: TaskUpdate) => Promise<boolean>;
  deleteTask: (id: string) => Promise<boolean>;
  rescheduleTask: (id: string, newDate: string | null, startTime?: string | null, endTime?: string | null) => Promise<boolean>;
  reload: () => Promise<void>;
}

const TasksContext = createContext<TasksContextValue | null>(null);

export const useTasksContext = () => {
  const context = useContext(TasksContext);
  if (!context) {
    throw new Error('useTasksContext must be used within a TasksProvider');
  }
  return context;
};

interface TasksProviderProps {
  children: React.ReactNode;
  userId: string | null;
}

export const TasksProvider: React.FC<TasksProviderProps> = ({ children, userId }) => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const previousTasksRef = useRef<Task[]>([]);

  // Load all tasks for the user
  const loadTasks = useCallback(async () => {
    if (!userId) {
      setTasks([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('tasks')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error loading tasks:', error);
        return;
      }

      setTasks(data || []);
      previousTasksRef.current = data || [];
    } catch (err) {
      console.error('Error loading tasks:', err);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  // Initial load
  useEffect(() => {
    loadTasks();
  }, [loadTasks]);

  // Real-time subscription
  useEffect(() => {
    if (!userId) return;

    const channel = supabase
      .channel(`tasks-${userId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'tasks',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            const newTask = payload.new as Task;
            setTasks((prev) => {
              // Check if task already exists (from optimistic update)
              if (prev.some((t) => t.id === newTask.id)) {
                return prev.map((t) => (t.id === newTask.id ? newTask : t));
              }
              return [newTask, ...prev];
            });
          } else if (payload.eventType === 'UPDATE') {
            const updatedTask = payload.new as Task;
            setTasks((prev) =>
              prev.map((t) => (t.id === updatedTask.id ? updatedTask : t))
            );
          } else if (payload.eventType === 'DELETE') {
            const deletedId = payload.old.id as string;
            setTasks((prev) => prev.filter((t) => t.id !== deletedId));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId]);

  // Add task with optimistic update
  const addTask = useCallback(
    async (taskData: Omit<TaskInsert, 'user_id'>): Promise<Task | null> => {
      if (!userId) return null;

      const tempId = crypto.randomUUID();
      const optimisticTask: Task = {
        id: tempId,
        user_id: userId,
        title: taskData.title,
        description: taskData.description ?? null,
        due_date: taskData.due_date ?? null,
        start_time: taskData.start_time ?? null,
        end_time: taskData.end_time ?? null,
        energy_level: taskData.energy_level ?? null,
        completed: taskData.completed ?? false,
        location: taskData.location ?? null,
        campaign_id: taskData.campaign_id ?? null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        detected_from_brain_dump: taskData.detected_from_brain_dump ?? false,
        emotional_note: taskData.emotional_note ?? null,
        end_date: taskData.end_date ?? null,
        is_shared: taskData.is_shared ?? false,
        shared_with: taskData.shared_with ?? null,
        suggested_timeframe: taskData.suggested_timeframe ?? null,
        time_model: taskData.time_model ?? null,
        urgency: taskData.urgency ?? null,
        display_order: taskData.display_order ?? 0,
      };

      // Optimistic update
      previousTasksRef.current = tasks;
      setTasks((prev) => [optimisticTask, ...prev]);

      try {
        const { data, error } = await supabase
          .from('tasks')
          .insert({ ...taskData, user_id: userId })
          .select()
          .single();

        if (error) {
          console.error('Error adding task:', error);
          // Revert on error
          setTasks(previousTasksRef.current);
          return null;
        }

        // Replace optimistic task with real one
        setTasks((prev) =>
          prev.map((t) => (t.id === tempId ? data : t))
        );

        return data;
      } catch (err) {
        console.error('Error adding task:', err);
        setTasks(previousTasksRef.current);
        return null;
      }
    },
    [userId, tasks]
  );

  // Update task with optimistic update
  const updateTask = useCallback(
    async (id: string, updates: TaskUpdate): Promise<boolean> => {
      const sanitizedUpdates = Object.fromEntries(
        Object.entries(updates).filter(([, v]) => v !== undefined)
      ) as TaskUpdate;

      if (Object.keys(sanitizedUpdates).length === 0) return true;

      const taskToUpdate = tasks.find((t) => t.id === id);
      if (!taskToUpdate) return false;

      // Store previous state for rollback
      previousTasksRef.current = tasks;

      // Optimistic update
      setTasks((prev) =>
        prev.map((t) =>
          t.id === id
            ? { ...t, ...sanitizedUpdates, updated_at: new Date().toISOString() }
            : t
        )
      );

      try {
        const { error } = await supabase
          .from('tasks')
          .update(sanitizedUpdates)
          .eq('id', id);

        if (error) {
          console.error('Error updating task:', error);
          setTasks(previousTasksRef.current);
          return false;
        }

        return true;
      } catch (err) {
        console.error('Error updating task:', err);
        setTasks(previousTasksRef.current);
        return false;
      }
    },
    [tasks]
  );

  // Delete task with optimistic update
  const deleteTask = useCallback(
    async (id: string): Promise<boolean> => {
      previousTasksRef.current = tasks;

      // Optimistic delete
      setTasks((prev) => prev.filter((t) => t.id !== id));

      try {
        const { error } = await supabase.from('tasks').delete().eq('id', id);

        if (error) {
          console.error('Error deleting task:', error);
          setTasks(previousTasksRef.current);
          return false;
        }

        return true;
      } catch (err) {
        console.error('Error deleting task:', err);
        setTasks(previousTasksRef.current);
        return false;
      }
    },
    [tasks]
  );

  // Reschedule task
  const rescheduleTask = useCallback(
    async (
      id: string,
      newDate: string | null,
      startTime?: string | null,
      endTime?: string | null
    ): Promise<boolean> => {
      const updates: TaskUpdate = {
        due_date: newDate,
      };
      if (startTime !== undefined) updates.start_time = startTime;
      if (endTime !== undefined) updates.end_time = endTime;

      return updateTask(id, updates);
    },
    [updateTask]
  );

  const value: TasksContextValue = {
    tasks,
    loading,
    addTask,
    updateTask,
    deleteTask,
    rescheduleTask,
    reload: loadTasks,
  };

  return <TasksContext.Provider value={value}>{children}</TasksContext.Provider>;
};
