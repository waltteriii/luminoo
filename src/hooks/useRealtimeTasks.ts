import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Task } from '@/types';
import { RealtimePostgresChangesPayload } from '@supabase/supabase-js';

interface UseRealtimeTasksOptions {
  userId?: string;
  dateRange?: { start: string; end: string };
  singleDate?: string;
  includeShared?: boolean;
}

export const useRealtimeTasks = (options: UseRealtimeTasksOptions) => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [sharedUserIds, setSharedUserIds] = useState<string[]>([]);

  // Load shared calendar user IDs
  useEffect(() => {
    if (!options.userId || !options.includeShared) return;

    const loadSharedUsers = async () => {
      const { data } = await supabase
        .from('shared_calendars')
        .select('owner_id')
        .eq('shared_with_id', options.userId);

      if (data) {
        setSharedUserIds(data.map(c => c.owner_id));
      }
    };

    loadSharedUsers();
  }, [options.userId, options.includeShared]);

  // Load initial tasks
  const loadTasks = useCallback(async () => {
    if (!options.userId) return;

    setLoading(true);
    try {
      let query = supabase
        .from('tasks')
        .select('*')
        .order('created_at', { ascending: true });

      // Build user filter - own tasks + shared calendars
      const userIds = [options.userId, ...sharedUserIds];
      query = query.in('user_id', userIds);

      if (options.singleDate) {
        query = query.eq('due_date', options.singleDate);
      } else if (options.dateRange) {
        query = query
          .gte('due_date', options.dateRange.start)
          .lte('due_date', options.dateRange.end);
      }

      const { data, error } = await query;

      if (error) throw error;
      setTasks((data || []) as Task[]);
    } catch (err) {
      console.error('Load tasks error:', err);
    } finally {
      setLoading(false);
    }
  }, [options.userId, options.singleDate, options.dateRange, sharedUserIds]);

  useEffect(() => {
    loadTasks();
  }, [loadTasks]);

  // Set up realtime subscription
  useEffect(() => {
    if (!options.userId) return;

    const userIds = [options.userId, ...sharedUserIds];

    const channel = supabase
      .channel('tasks-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'tasks',
        },
        (payload: RealtimePostgresChangesPayload<Task>) => {
          console.log('Realtime task update:', payload);

          if (payload.eventType === 'INSERT') {
            const newTask = payload.new as Task;
            // Only add if it's from a relevant user
            if (userIds.includes(newTask.user_id)) {
              setTasks(prev => {
                // Check if already exists
                if (prev.some(t => t.id === newTask.id)) return prev;
                return [...prev, newTask];
              });
            }
          } else if (payload.eventType === 'UPDATE') {
            const updatedTask = payload.new as Task;
            setTasks(prev => 
              prev.map(t => t.id === updatedTask.id ? updatedTask : t)
            );
          } else if (payload.eventType === 'DELETE') {
            const deletedTask = payload.old as { id: string };
            setTasks(prev => prev.filter(t => t.id !== deletedTask.id));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [options.userId, sharedUserIds]);

  const addTask = async (task: Partial<Task> & { start_time?: string; end_time?: string; end_date?: string }) => {
    if (!options.userId) return null;

    const { data, error } = await supabase
      .from('tasks')
      .insert({
        user_id: options.userId,
        title: task.title || '',
        energy_level: task.energy_level || 'medium',
        due_date: task.due_date || null,
        start_time: task.start_time || null,
        end_time: task.end_time || null,
        end_date: task.end_date || null,
        description: task.description,
        campaign_id: task.campaign_id,
        urgency: task.urgency,
        emotional_note: task.emotional_note,
        suggested_timeframe: task.suggested_timeframe,
        detected_from_brain_dump: task.detected_from_brain_dump || false,
      })
      .select()
      .single();

    if (error) {
      console.error('Add task error:', error);
      return null;
    }

    const inserted = data as Task;

    // Optimistic add so the task appears immediately (no view switching required)
    const due = inserted.due_date;
    const include = options.singleDate
      ? due === options.singleDate
      : options.dateRange
        ? !!due && due >= options.dateRange.start && due <= options.dateRange.end
        : true;

    if (include) {
      setTasks(prev => (prev.some(t => t.id === inserted.id) ? prev : [...prev, inserted]));
    }

    return inserted;
  };

  const updateTask = async (taskId: string, updates: Partial<Task>) => {
    const { error } = await supabase
      .from('tasks')
      .update(updates)
      .eq('id', taskId);

    if (error) {
      console.error('Update task error:', error);
      return false;
    }

    // Optimistic update
    setTasks(prev => prev.map(t => t.id === taskId ? { ...t, ...updates } : t));
    return true;
  };

  const deleteTask = async (taskId: string) => {
    const { error } = await supabase
      .from('tasks')
      .delete()
      .eq('id', taskId);

    if (error) {
      console.error('Delete task error:', error);
      return false;
    }

    setTasks(prev => prev.filter(t => t.id !== taskId));
    return true;
  };

  const rescheduleTask = async (taskId: string, newDate: string) => {
    return updateTask(taskId, { due_date: newDate });
  };

  return {
    tasks,
    loading,
    addTask,
    updateTask,
    deleteTask,
    rescheduleTask,
    reload: loadTasks,
  };
};