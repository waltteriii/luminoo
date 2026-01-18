import { createContext, useContext, useState, ReactNode, useCallback, memo, useMemo } from 'react';
import {
  DndContext,
  DragOverlay,
  closestCenter,
  pointerWithin,
  type CollisionDetection,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  DragStartEvent,
  DragEndEvent,
  DragMoveEvent,
} from '@dnd-kit/core';
import { Task, EnergyLevel } from '@/types';
import { parse, format, addMinutes } from 'date-fns';
import { useTasksContext } from '@/contexts/TasksContext';
import ScheduleConfirmDialog from '@/components/tasks/ScheduleConfirmDialog';

interface DragOverInfo {
  groupTasks: Task[];
  targetColumnIndex: number;
  groupTop: number;
  groupHeight: number;
  activeTaskDuration?: number; // Duration in hours for drop zone highlighting
}

interface DndContextValue {
  activeTask: Task | null;
  dragOverInfo: DragOverInfo | null;
  activeTaskDuration: number | null; // Exposed for drop zone highlighting
}

const DndProviderContext = createContext<DndContextValue>({ activeTask: null, dragOverInfo: null, activeTaskDuration: null });

export const useDndContext = () => useContext(DndProviderContext);

interface DndProviderProps {
  children: ReactNode;
  onTaskScheduled?: () => void;
}

const DndProvider = memo(({ children, onTaskScheduled }: DndProviderProps) => {
  const { updateTask } = useTasksContext();
  const [activeTask, setActiveTask] = useState<Task | null>(null);
  const [dragOverInfo, setDragOverInfo] = useState<DragOverInfo | null>(null);
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [taskToSchedule, setTaskToSchedule] = useState<Task | null>(null);
  const [targetDate, setTargetDate] = useState<Date | null>(null);
  const [targetHour, setTargetHour] = useState<number | undefined>();

  // Configure sensors with touch support for mobile
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 200,
        tolerance: 8,
      },
    })
  );

  const handleDragStart = useCallback((event: DragStartEvent) => {
    const task = event.active.data.current?.task as Task | undefined;
    if (task) {
      setActiveTask(task);
    }
  }, []);

  // Calculate active task duration for drop zone highlighting
  const activeTaskDuration = useMemo(() => {
    if (!activeTask) return null;
    if (activeTask.start_time && activeTask.end_time) {
      const [sh, sm] = activeTask.start_time.split(':').map(Number);
      const [eh, em] = activeTask.end_time.split(':').map(Number);
      return ((eh * 60 + em) - (sh * 60 + sm)) / 60;
    }
    return 1; // Default 1 hour
  }, [activeTask]);

  const handleDragMove = useCallback((event: DragMoveEvent) => {
    const { over } = event;
    
    // Check if hovering over a reorder drop zone
    if (over && typeof over.id === 'string' && over.id.startsWith('reorder-zone-')) {
      const data = over.data.current;
      if (data?.type === 'reorder-zone') {
        setDragOverInfo({
          groupTasks: data.groupTasks,
          targetColumnIndex: data.columnIndex,
          groupTop: data.groupTop,
          groupHeight: data.groupHeight,
        });
        return;
      }
    }
    
    setDragOverInfo(null);
  }, []);

  const handleDragEnd = useCallback(async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveTask(null);
    setDragOverInfo(null);

    if (!over) return;

    const activeData = active.data.current;
    const overData = over.data.current;
    const overId = over.id as string;

    // Handle drop on reorder zone - reorder tasks within a group
    if (overData?.type === 'reorder-zone') {
      const task = activeData?.task as Task;
      const groupTasks = overData.groupTasks as Task[];
      const targetColumnIndex = overData.columnIndex as number;
      
      if (task && groupTasks) {
        // Find current position of dragged task
        const currentIndex = groupTasks.findIndex(t => t.id === task.id);
        if (currentIndex === -1) return;
        
        // Calculate new position
        let newIndex = targetColumnIndex;
        if (targetColumnIndex > currentIndex) {
          newIndex = targetColumnIndex - 1;
        }
        
        if (newIndex === currentIndex) return;
        
        // Update display_order for all affected tasks
        const updatePromises: Promise<unknown>[] = [];
        groupTasks.forEach((t, idx) => {
          let newOrder: number;
          if (t.id === task.id) {
            newOrder = newIndex * 10;
          } else if (idx < currentIndex && idx >= newIndex) {
            // Tasks that need to shift right
            newOrder = (idx + 1) * 10;
          } else if (idx > currentIndex && idx <= newIndex) {
            // Tasks that need to shift left
            newOrder = (idx - 1) * 10;
          } else {
            newOrder = idx * 10;
          }
          updatePromises.push(updateTask(t.id, { display_order: newOrder }));
        });
        
        await Promise.all(updatePromises);
        onTaskScheduled?.();
        return;
      }
    }

    // Handle drop to memory panel
    if (overId === 'memory-panel' || overData?.type === 'memory') {
      const task = activeData?.task as Task;
      if (task && (activeData?.type === 'inbox-task' || activeData?.type === 'calendar-task' || activeData?.type === 'night-task')) {
        await updateTask(task.id, { 
          location: 'memory',
          due_date: null,
          start_time: null,
          end_time: null
        });
        onTaskScheduled?.();
        return;
      }
    }

    // Handle drop onto night section
    if (overData?.type === 'night-section') {
      const task = activeData?.task as Task;
      const section = overData.section as 'night-before' | 'night-after';
      
      if (task && (activeData?.type === 'calendar-task' || activeData?.type === 'inbox-task')) {
        // Move to night hours - use default night time based on section
        // Night-before: use 2:00 AM, Night-after: use 23:00 or later based on settings
        const nightHour = section === 'night-before' ? 2 : 23;
        const start = `${String(nightHour).padStart(2, '0')}:00:00`;
        const end = `${String(nightHour + 1).padStart(2, '0')}:00:00`;
        
        await updateTask(task.id, {
          start_time: start,
          end_time: end,
        } as any);
        onTaskScheduled?.();
        return;
      }
    }

    // Night task being dragged => can go to day time slots or other locations
    if (activeData?.type === 'night-task') {
      const task = activeData.task as Task;

      // Dropped on a time slot (day view) - schedule to that hour
      if (overData?.type === 'time-slot') {
        const hour = overData.hour as number;
        const date = overData.date as Date | undefined;
        const nextDate = date || (task.due_date ? parse(task.due_date, 'yyyy-MM-dd', new Date()) : new Date());
        const nextDueDate = format(nextDate, 'yyyy-MM-dd');
        
        // Preserve duration if possible
        let durationHours = 1;
        if (task.start_time && task.end_time) {
          const [sh, sm] = task.start_time.split(':').map(Number);
          const [eh, em] = task.end_time.split(':').map(Number);
          durationHours = ((eh * 60 + em) - (sh * 60 + sm)) / 60;
        }
        
        const endHour = Math.min(hour + durationHours, 24);
        const start = `${String(hour).padStart(2, '0')}:00:00`;
        const end = `${String(Math.floor(endHour)).padStart(2, '0')}:${String(Math.round((endHour % 1) * 60)).padStart(2, '0')}:00`;
        
        await updateTask(task.id, {
          due_date: nextDueDate,
          start_time: start,
          end_time: end,
        } as any);
        onTaskScheduled?.();
        return;
      }

      // Dropped on a day (week/month view)
      if (/^\d{4}-\d{2}-\d{2}$/.test(overId)) {
        const date = parse(overId, 'yyyy-MM-dd', new Date());
        const nextDueDate = format(date, 'yyyy-MM-dd');
        
        await updateTask(task.id, {
          due_date: nextDueDate,
        } as any);
        onTaskScheduled?.();
        return;
      }

      return;
    }

    // Inbox task being dragged (unscheduled) => schedule immediately without dialog
    if (activeData?.type === 'inbox-task') {
      const task = activeData.task as Task;

      // Dropped on a time slot (day view) - schedule immediately
      if (overData?.type === 'time-slot') {
        const hour = overData.hour as number;
        const date = overData.date as Date | undefined;
        const nextDate = date || new Date();
        const nextDueDate = format(nextDate, 'yyyy-MM-dd');
        const start = `${String(hour).padStart(2, '0')}:00:00`;
        const end = `${String(hour + 1).padStart(2, '0')}:00:00`;
        
        await updateTask(task.id, {
          due_date: nextDueDate,
          start_time: start,
          end_time: end,
        } as any);
        onTaskScheduled?.();
        return;
      }

      // Dropped on a day (week/month view) - schedule immediately without time
      if (/^\d{4}-\d{2}-\d{2}$/.test(overId)) {
        const date = parse(overId, 'yyyy-MM-dd', new Date());
        const nextDueDate = format(date, 'yyyy-MM-dd');
        
        await updateTask(task.id, {
          due_date: nextDueDate,
        } as any);
        onTaskScheduled?.();
        return;
      }

      // Dropped on a month (year view) - schedule to first day of month
      if (/^month-\d+$/.test(overId)) {
        const monthIndex = parseInt(overId.split('-')[1]);
        const date = new Date();
        date.setMonth(monthIndex);
        date.setDate(1);
        const nextDueDate = format(date, 'yyyy-MM-dd');
        
        await updateTask(task.id, {
          due_date: nextDueDate,
        } as any);
        onTaskScheduled?.();
        return;
      }

      return;
    }

    // Calendar task drag => immediate reschedule
    if (activeData?.type === 'calendar-task') {
      const task = activeData.task as Task;

      let nextDate: Date | null = null;
      let nextHour: number | null = null;

      if (overData?.type === 'time-slot') {
        nextDate = (overData.date as Date) || null;
        nextHour = (overData.hour as number) ?? null;
      } else if (overData?.type === 'day') {
        nextDate = (overData.date as Date) || null;
      } else if (/^\d{4}-\d{2}-\d{2}$/.test(overId)) {
        nextDate = parse(overId, 'yyyy-MM-dd', new Date());
      } else if (overData?.type === 'calendar-task') {
        const overTask = overData.task as Task | undefined;
        if (overTask?.due_date) {
          nextDate = parse(overTask.due_date, 'yyyy-MM-dd', new Date());
        }
        if (overTask?.start_time) {
          nextHour = parseInt(overTask.start_time.split(':')[0]);
        }
      } else if (overData?.type === 'night-section') {
        // Moving from day to night section
        const section = overData.section as 'night-before' | 'night-after';
        const nightHour = section === 'night-before' ? 2 : 23;
        
        // Preserve duration
        let durationHours = 1;
        if (task.start_time && task.end_time) {
          const [sh, sm] = task.start_time.split(':').map(Number);
          const [eh, em] = task.end_time.split(':').map(Number);
          durationHours = ((eh * 60 + em) - (sh * 60 + sm)) / 60;
        }
        
        const endHour = nightHour + durationHours;
        const start = `${String(nightHour).padStart(2, '0')}:00:00`;
        const end = `${String(Math.floor(endHour)).padStart(2, '0')}:${String(Math.round((endHour % 1) * 60)).padStart(2, '0')}:00`;
        
        await updateTask(task.id, {
          start_time: start,
          end_time: end,
        } as any);
        onTaskScheduled?.();
        return;
      }

      if (!nextDate) return;

      const nextDueDate = format(nextDate, 'yyyy-MM-dd');
      const updateData: Record<string, unknown> = {};

      if (task.due_date !== nextDueDate) {
        updateData.due_date = nextDueDate;
      }

      if (nextHour !== null && Number.isFinite(nextHour)) {
        const start = `${String(nextHour).padStart(2, '0')}:00:00`;
        updateData.start_time = start;

        // Preserve duration if possible
        if (task.start_time && task.end_time) {
          const [sh, sm] = task.start_time.split(':').map(Number);
          const [eh, em] = task.end_time.split(':').map(Number);
          const durationMinutes = (eh * 60 + em) - (sh * 60 + sm);
          if (durationMinutes > 0) {
            const base = new Date(2000, 0, 1, nextHour, 0, 0);
            const end = addMinutes(base, durationMinutes);
            updateData.end_time = `${String(end.getHours()).padStart(2, '0')}:${String(end.getMinutes()).padStart(2, '0')}:00`;
          }
        }
      }

      if (Object.keys(updateData).length === 0) return;

      await updateTask(task.id, updateData as any);
      onTaskScheduled?.();
      return;
    }
  }, [onTaskScheduled, updateTask]);

  const handleConfirmSchedule = useCallback(async (
    taskId: string,
    dueDate: string,
    startTime?: string,
    endTime?: string,
    updates?: { title?: string; energy_level?: EnergyLevel; location?: string; is_shared?: boolean }
  ) => {
    const updateData: Record<string, unknown> = {
      due_date: dueDate,
    };

    // Only set/clear time when explicitly provided.
    if (startTime !== undefined) {
      if (startTime === 'none' || startTime === '') {
        updateData.start_time = null;
        updateData.end_time = null;
      } else {
        updateData.start_time = startTime;
      }
    }

    if (endTime !== undefined && startTime !== 'none' && startTime !== '') {
      updateData.end_time = endTime === 'none' || endTime === '' ? null : endTime;
    }

    if (updates) {
      if (updates.title) updateData.title = updates.title;
      if (updates.energy_level) updateData.energy_level = updates.energy_level;
      if (updates.location !== undefined) updateData.location = updates.location || null;
      if (updates.is_shared !== undefined) updateData.is_shared = updates.is_shared;
    }

    await updateTask(taskId, updateData as any);
    onTaskScheduled?.();
  }, [onTaskScheduled, updateTask]);

  const collisionDetectionStrategy = useCallback<CollisionDetection>((args) => {
    const activeType = args.active?.data?.current?.type as string | undefined;

    // 1) Prefer pointer-based collisions (feels like "snapping" follows the cursor)
    const pointerCollisions = pointerWithin(args);

    // If reordering overlapping tasks, prefer reorder zones over time-slot rows
    if (activeType === 'calendar-task') {
      const reorderPointer = pointerCollisions.filter((c) => String(c.id).startsWith('reorder-zone-'));
      if (reorderPointer.length) return reorderPointer;
    }

    if (pointerCollisions.length) return pointerCollisions;

    // 2) If reordering, prefer reorder zones even when pointer isn't inside one
    if (activeType === 'calendar-task') {
      const reorderContainers = args.droppableContainers.filter((c: any) => String(c.id).startsWith('reorder-zone-'));
      if (reorderContainers.length) {
        const reorderClosest = closestCenter({ ...args, droppableContainers: reorderContainers });
        if (reorderClosest.length) return reorderClosest;
      }
    }

    // 3) Fallback
    return closestCenter(args);
  }, []);

  return (
    <DndProviderContext.Provider value={{ activeTask, dragOverInfo, activeTaskDuration }}>
      <DndContext
        sensors={sensors}
        collisionDetection={collisionDetectionStrategy}
        onDragStart={handleDragStart}
        onDragMove={handleDragMove}
        onDragEnd={handleDragEnd}
      >
        {children}
        
        {/* Global drag overlay */}
        <DragOverlay>
          {activeTask && (
            <div className="p-2 rounded bg-card border border-primary shadow-lg opacity-90 max-w-xs touch-none">
              <span className="text-sm truncate block">{activeTask.title}</span>
            </div>
          )}
        </DragOverlay>
      </DndContext>

      {/* Global schedule confirmation dialog */}
      <ScheduleConfirmDialog
        open={confirmDialogOpen}
        onOpenChange={setConfirmDialogOpen}
        task={taskToSchedule}
        targetDate={targetDate}
        targetHour={targetHour}
        onConfirm={handleConfirmSchedule}
      />
    </DndProviderContext.Provider>
  );
});

DndProvider.displayName = 'DndProvider';

export default DndProvider;
