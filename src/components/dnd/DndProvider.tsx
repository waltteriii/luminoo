import { createContext, useContext, useState, ReactNode, useCallback } from 'react';
import {
  DndContext,
  DragOverlay,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  DragStartEvent,
  DragEndEvent,
} from '@dnd-kit/core';
import { Task, EnergyLevel } from '@/types';
import { parse, format } from 'date-fns';
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

const DndProvider = ({ children, onTaskScheduled }: DndProviderProps) => {
  const [activeTask, setActiveTask] = useState<Task | null>(null);
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [taskToSchedule, setTaskToSchedule] = useState<Task | null>(null);
  const [targetDate, setTargetDate] = useState<Date | null>(null);
  const [targetHour, setTargetHour] = useState<number | undefined>();

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
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

    // Check if this is an inbox task being dragged
    if (activeData?.type === 'inbox-task') {
      const task = activeData.task as Task;

      // Dropped on a time slot (day view) - format: time-slot-{hour}
      if (overData?.type === 'time-slot') {
        const hour = overData.hour as number;
        setTaskToSchedule(task);
        setTargetHour(hour);
        // Get the date from the time slot data or use current date
        const date = overData.date as Date | undefined;
        setTargetDate(date || new Date());
        setConfirmDialogOpen(true);
        return;
      }

      // Dropped on a day (week/month view) - format: yyyy-MM-dd
      if (/^\d{4}-\d{2}-\d{2}$/.test(overId)) {
        const date = parse(overId, 'yyyy-MM-dd', new Date());
        setTaskToSchedule(task);
        setTargetDate(date);
        setTargetHour(undefined);
        setConfirmDialogOpen(true);
        return;
      }

      // Dropped on a month (year view) - format: month-{index}
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
    }

    // Handle regular task reordering within the same view
    // This is handled by individual views with their own drag handlers
  }, []);

  const handleConfirmSchedule = async (
    taskId: string,
    dueDate: string,
    startTime?: string,
    endTime?: string
  ) => {
    try {
      await supabase
        .from('tasks')
        .update({
          due_date: dueDate,
          start_time: startTime && startTime !== 'none' ? startTime : null,
          end_time: endTime && endTime !== 'none' ? endTime : null,
        })
        .eq('id', taskId);
      
      onTaskScheduled?.();
    } catch (err) {
      console.error('Schedule task error:', err);
    }
  };

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
            <div className="p-2 rounded bg-card border border-primary shadow-lg opacity-90 max-w-xs">
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
};

export default DndProvider;
