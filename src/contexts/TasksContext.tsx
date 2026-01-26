import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import type { Task, Task as TaskType } from '@/types'; // Import from local types
import { useUndoOptional } from '@/contexts/UndoContext';

// Local types for context
type TaskInsert = Partial<Omit<Task, 'id' | 'created_at' | 'updated_at' | 'user_id'>> & { title: string };
type TaskUpdate = Partial<Task>;

interface TasksContextValue {
  tasks: Task[];
  loading: boolean;
  addTask: (task: TaskInsert) => Promise<Task | null>;
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
  const [loading, setLoading] = useState(false); // No loading since local
  const previousTasksRef = useRef<Task[]>([]);
  const undoContext = useUndoOptional();

  // Load all tasks for the user (Mock implementation)
  const loadTasks = useCallback(async () => {
    // In a real app this would fetch from backend.
    // For now we keep local state.
    setLoading(false);
  }, []);

  // Initial load
  useEffect(() => {
    loadTasks();
  }, [loadTasks]);

  // Add task (Local implementation)
  const addTask = useCallback(
    async (taskData: TaskInsert): Promise<Task | null> => {
      if (!userId) return null;

      const tempId = crypto.randomUUID();
      const newTask: Task = {
        id: tempId,
        user_id: userId,
        title: taskData.title,
        description: taskData.description ?? null,
        due_date: taskData.due_date ?? null,
        start_time: taskData.start_time ?? null,
        end_time: taskData.end_time ?? null,
        energy_level: taskData.energy_level ?? 'medium',
        completed: taskData.completed ?? false,
        location: taskData.location ?? null,
        campaign_id: taskData.campaign_id ?? null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        detected_from_brain_dump: taskData.detected_from_brain_dump ?? false,
        emotional_note: taskData.emotional_note ?? null,
        end_date: taskData.end_date ?? null,
        is_shared: taskData.is_shared ?? false,
        shared_with: taskData.shared_with ?? [],
        suggested_timeframe: taskData.suggested_timeframe ?? null,
        time_model: taskData.time_model ?? 'event-based',
        urgency: taskData.urgency ?? 'normal',
        display_order: taskData.display_order ?? 0,
      };

      setTasks((prev) => [newTask, ...prev]);
      return newTask;
    },
    [userId]
  );

  // Update task (Local implementation)
  const updateTask = useCallback(
    async (id: string, updates: TaskUpdate): Promise<boolean> => {
      const taskToUpdate = tasks.find((t) => t.id === id);
      if (!taskToUpdate) return false;

      const previousState = { ...taskToUpdate };

      setTasks((prev) =>
        prev.map((t) =>
          t.id === id
            ? { ...t, ...updates, updated_at: new Date().toISOString() }
            : t
        )
      );

      // Push undo action
      if (undoContext) {
        const description = `Reverted "${previousState.title.slice(0, 30)}${previousState.title.length > 30 ? '...' : ''}"`;

        undoContext.pushUndo(description, async () => {
          setTasks((prev) =>
            prev.map((t) =>
              t.id === id ? previousState : t
            )
          );
        });
      }

      return true;
    },
    [tasks, undoContext]
  );

  // Delete task (Local implementation)
  const deleteTask = useCallback(
    async (id: string): Promise<boolean> => {
      const taskToDelete = tasks.find((t) => t.id === id);
      if (!taskToDelete) return false;

      setTasks((prev) => prev.filter((t) => t.id !== id));

      if (undoContext) {
        const description = `Restored "${taskToDelete.title.slice(0, 30)}${taskToDelete.title.length > 30 ? '...' : ''}"`;

        undoContext.pushUndo(description, async () => {
          setTasks((prev) => [taskToDelete, ...prev]);
        });
      }

      return true;
    },
    [tasks, undoContext]
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
