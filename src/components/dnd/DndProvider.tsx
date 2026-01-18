import { createContext, useContext, useState, ReactNode, useCallback, memo } from 'react';
import {
  DndContext,
  DragOverlay,
  closestCenter,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  DragStartEvent,
  DragEndEvent,
} from '@dnd-kit/core';
import { Task, EnergyLevel } from '@/types';
import { parse, format, addMinutes } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import ScheduleConfirmDialog from '@/components/tasks/ScheduleConfirmDialog';

interface DndContextValue {
  activeTask: Task | null;
}

const DndProviderContext = createContext<DndContextValue>({ activeTask: null });

export const useDndContext = () => useContext(DndProviderContext);

interface DndProviderProps {
  children: ReactNode;
  onTaskScheduled?: () => void;
}

const DndProvider = memo(({ children, onTaskScheduled }: DndProviderProps) => {
  const [activeTask, setActiveTask] = useState<Task | null>(null);
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

  const handleDragEnd = useCallback(async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveTask(null);

    if (!over) return;

    const activeData = active.data.current;
    const overData = over.data.current;
    const overId = over.id as string;

    // Handle drop to memory panel
    if (overId === 'memory-panel' || overData?.type === 'memory') {
      const task = activeData?.task as Task;
      if (task && (activeData?.type === 'inbox-task' || activeData?.type === 'calendar-task')) {
        try {
          await supabase
            .from('tasks')
            .update({ 
              location: 'memory',
              due_date: null,
              start_time: null,
              end_time: null
            })
            .eq('id', task.id);
          onTaskScheduled?.();
        } catch (err) {
          // Error handling without console.log
        }
        return;
      }
    }

    // Inbox task being dragged (unscheduled) => confirmation dialog
    if (activeData?.type === 'inbox-task') {
      const task = activeData.task as Task;

      // Dropped on a time slot (day view)
      if (overData?.type === 'time-slot') {
        const hour = overData.hour as number;
        setTaskToSchedule(task);
        setTargetHour(hour);
        const date = overData.date as Date | undefined;
        setTargetDate(date || new Date());
        setConfirmDialogOpen(true);
        return;
      }

      // Dropped on a day (week/month view)
      if (/^\d{4}-\d{2}-\d{2}$/.test(overId)) {
        const date = parse(overId, 'yyyy-MM-dd', new Date());
        setTaskToSchedule(task);
        setTargetDate(date);
        setTargetHour(undefined);
        setConfirmDialogOpen(true);
        return;
      }

      // Dropped on a month (year view)
      if (/^month-\d+$/.test(overId)) {
        const monthIndex = parseInt(overId.split('-')[1]);
        const date = new Date();
        date.setMonth(monthIndex);
        date.setDate(1);
        setTaskToSchedule(task);
        setTargetDate(date);
        setTargetHour(undefined);
        setConfirmDialogOpen(true);
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

      try {
        await supabase.from('tasks').update(updateData).eq('id', task.id);
        onTaskScheduled?.();
      } catch (err) {
        // Error handling without console.log
      }

      return;
    }
  }, [onTaskScheduled]);

  const handleConfirmSchedule = useCallback(async (
    taskId: string,
    dueDate: string,
    startTime?: string,
    endTime?: string,
    updates?: { title?: string; energy_level?: EnergyLevel; location?: string; is_shared?: boolean }
  ) => {
    try {
      const updateData: Record<string, unknown> = {
        due_date: dueDate,
        start_time: startTime && startTime !== 'none' ? startTime : null,
        end_time: endTime && endTime !== 'none' ? endTime : null,
      };
      
      if (updates) {
        if (updates.title) updateData.title = updates.title;
        if (updates.energy_level) updateData.energy_level = updates.energy_level;
        if (updates.location !== undefined) updateData.location = updates.location || null;
        if (updates.is_shared !== undefined) updateData.is_shared = updates.is_shared;
      }
      
      await supabase
        .from('tasks')
        .update(updateData)
        .eq('id', taskId);
      
      onTaskScheduled?.();
    } catch (err) {
      // Error handling without console.log
    }
  }, [onTaskScheduled]);

  return (
    <DndProviderContext.Provider value={{ activeTask }}>
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
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
