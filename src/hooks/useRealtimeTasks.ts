import { useState, useEffect, useCallback, useRef } from 'react';
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
  
  // Ref to prevent duplicate loads
  const loadingRef = useRef(false);

  // Load shared calendar user IDs
  useEffect(() => {
    if (!options.userId || !options.includeShared) return;

    const loadSharedUsers = async () => {
      try {
        const { data, error } = await supabase
          .from('shared_calendars')
          .select('owner_id')
          .eq('shared_with_id', options.userId);

        if (error) throw error;
        if (data) {
          setSharedUserIds(data.map(c => c.owner_id));
        }
      } catch (err) {
        console.error('Error loading shared users:', err);
      }
    };

    loadSharedUsers();
  }, [options.userId, options.includeShared]);

  // Load initial tasks
  const loadTasks = useCallback(async () => {
    if (!options.userId || loadingRef.current) return;

    loadingRef.current = true;
    setLoading(true);
    
    try {
      let query = supabase
        .from('tasks')
        .select('*')
        .order('created_at', { ascending: true });

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
      console.error('Error loading tasks:', err);
      setTasks([]);
    } finally {
      setLoading(false);
      loadingRef.current = false;
    }
  }, [options.userId, options.singleDate, options.dateRange, sharedUserIds]);

  useEffect(() => {
    loadTasks();
  }, [loadTasks]);

  // Set up realtime subscription - KORJATTU VERSIO
  useEffect(() => {
    if (!options.userId) return;

    const userIds = [options.userId, ...sharedUserIds];
    
    // Käytä STABIILIA channel ID:tä - riippuu vain userId:stä
    const channelId = `tasks-user-${options.userId}`;

    const channel = supabase
      .channel(channelId)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'tasks',
        },
        (payload: RealtimePostgresChangesPayload<Task>) => {
          if (payload.eventType === 'INSERT') {
            const newTask = payload.new as Task;
            
            // Tarkista että task kuuluu oikealle käyttäjälle
            if (!userIds.includes(newTask.user_id)) return;
            
            setTasks(prev => {
              // Estä duplikaatit
              if (prev.some(t => t.id === newTask.id)) return prev;
              return [...prev, newTask];
            });
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

    // TÄRKEÄ: Cleanup function joka sulkee kanavan kunnolla
    return () => {
      channel.unsubscribe();
      supabase.removeChannel(channel);
    };
  }, [options.userId, sharedUserIds]); // Poistettu optionsKey - käytetään vain userId

  const addTask = useCallback(async (task: Partial<Task> & { start_time?: string; end_time?: string; end_date?: string }) => {
    if (!options.userId) return null;

    try {
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

      if (error) throw error;

      const inserted = data as Task;

      // Optimistic add - tarkista että task sopii filtereihin
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
    } catch (err) {
      console.error('Error adding task:', err);
      return null;
    }
  }, [options.userId, options.singleDate, options.dateRange]);

  const updateTask = useCallback(async (taskId: string, updates: Partial<Task>) => {
    try {
      // Optimistic update with loading flag
      setTasks(prev => prev.map(t => 
        t.id === taskId 
          ? { ...t, ...updates, _optimistic: true } as Task
          : t
      ));

      const { error } = await supabase
        .from('tasks')
        .update(updates)
        .eq('id', taskId);

      if (error) throw error;

      // Remove optimistic flag
      setTasks(prev => prev.map(t => {
        if (t.id === taskId) {
          const { _optimistic, ...rest } = t as any;
          return rest;
        }
        return t;
      }));

      return true;
    } catch (err) {
      console.error('Error updating task:', err);
      // Revert on error
      await loadTasks();
      return false;
    }
  }, [loadTasks]);

  const deleteTask = useCallback(async (taskId: string) => {
    try {
      // Optimistic delete
      setTasks(prev => prev.filter(t => t.id !== taskId));

      const { error } = await supabase
        .from('tasks')
        .delete()
        .eq('id', taskId);

      if (error) throw error;

      return true;
    } catch (err) {
      console.error('Error deleting task:', err);
      // Revert on error
      await loadTasks();
      return false;
    }
  }, [loadTasks]);

  const rescheduleTask = useCallback(async (taskId: string, newDate: string) => {
    return updateTask(taskId, { due_date: newDate });
  }, [updateTask]);

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
