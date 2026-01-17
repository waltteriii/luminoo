import { useState, useEffect, useRef } from 'react';
import { format, startOfDay, addHours } from 'date-fns';
import { cn } from '@/lib/utils';
import { EnergyLevel, Task } from '@/types';
import { ChevronLeft, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import QuickAddTask from '@/components/tasks/QuickAddTask';
import DraggableTask from '@/components/tasks/DraggableTask';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { useRealtimeTasks } from '@/hooks/useRealtimeTasks';

interface DayViewProps {
  date: Date;
  currentEnergy: EnergyLevel;
  energyFilter?: EnergyLevel[];
  onBack: () => void;
}

interface TimeSlotProps {
  hour: number;
  date: Date;
  tasks: Task[];
  userId: string | null;
  currentEnergy: EnergyLevel;
  onAddTask: (hour: number) => void;
  onUpdateTask: (taskId: string, updates: Partial<Task>) => void;
  onDeleteTask: (taskId: string) => void;
  isAddingAt: number | null;
  onAddComplete: () => void;
  addTaskHandler: (task: any) => Promise<any>;
}

const TimeSlot = ({
  hour,
  date,
  tasks,
  userId,
  currentEnergy,
  onAddTask,
  onUpdateTask,
  onDeleteTask,
  isAddingAt,
  onAddComplete,
  addTaskHandler,
}: TimeSlotProps) => {
  const [isHovered, setIsHovered] = useState(false);
  const timeStr = format(addHours(startOfDay(date), hour), 'h a');
  const hourTasks = tasks.filter(t => {
    if (!t.start_time) return false;
    const taskHour = parseInt(t.start_time.split(':')[0]);
    return taskHour === hour;
  });

  const handleQuickAdd = async (task: {
    title: string;
    energy: EnergyLevel;
    date?: string;
    startTime?: string;
    endTime?: string;
    endDate?: string;
  }) => {
    await addTaskHandler({
      title: task.title,
      energy_level: task.energy,
      due_date: task.date || format(date, 'yyyy-MM-dd'),
      start_time: task.startTime || `${hour.toString().padStart(2, '0')}:00`,
      end_time: task.endTime,
      end_date: task.endDate,
    });
    onAddComplete();
  };

  return (
    <div
      className={cn(
        "group relative h-20 border-b border-border/50 transition-all",
        isHovered && "bg-primary/5"
      )}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Time label */}
      <div className="absolute left-0 top-0 w-16 text-xs text-foreground-muted py-1">
        {timeStr}
      </div>

      {/* Content area */}
      <div className="ml-20 h-full relative">
        {/* Existing tasks */}
        <SortableContext
          items={hourTasks.map(t => t.id)}
          strategy={verticalListSortingStrategy}
        >
          <div className="space-y-1 py-1">
            {hourTasks.map(task => (
              <DraggableTask
                key={task.id}
                task={task}
                onUpdate={(updates) => onUpdateTask(task.id, updates)}
                onDelete={() => onDeleteTask(task.id)}
                isShared={task.user_id !== userId}
                compact
              />
            ))}
          </div>
        </SortableContext>

        {/* Add task inline */}
        {isAddingAt === hour ? (
          <div className="absolute top-1 left-0 right-4 z-10">
            <QuickAddTask
              onAdd={handleQuickAdd}
              defaultEnergy={currentEnergy}
              defaultDate={date}
              defaultTime={`${hour.toString().padStart(2, '0')}:00`}
              compact
            />
          </div>
        ) : (
          /* Hover add button */
          isHovered && hourTasks.length === 0 && (
            <button
              onClick={() => onAddTask(hour)}
              className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <div className="flex items-center gap-1 text-xs text-foreground-muted hover:text-primary">
                <Plus className="w-3 h-3" />
                Click to add task
              </div>
            </button>
          )
        )}
      </div>
    </div>
  );
};

const DayView = ({ date, currentEnergy, energyFilter = [], onBack }: DayViewProps) => {
  const [userId, setUserId] = useState<string | null>(null);
  const [addingAtHour, setAddingAtHour] = useState<number | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUserId(data.user?.id || null);
    });
  }, []);

  const dateStr = format(date, 'yyyy-MM-dd');
  const { tasks, loading, addTask, updateTask, deleteTask } = useRealtimeTasks({
    userId: userId || undefined,
    singleDate: dateStr,
    includeShared: true,
  });

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    
    if (over && active.id !== over.id) {
      console.log('Reordered:', active.id, 'over', over.id);
    }
  };

  const handleQuickAdd = async (task: {
    title: string;
    energy: EnergyLevel;
    date?: string;
    startTime?: string;
    endTime?: string;
    endDate?: string;
  }) => {
    await addTask({
      title: task.title,
      energy_level: task.energy,
      due_date: task.date || dateStr,
      start_time: task.startTime,
      end_time: task.endTime,
      end_date: task.endDate,
    });
  };

  const filteredTasks = energyFilter.length > 0
    ? tasks.filter(t => energyFilter.includes(t.energy_level))
    : tasks;

  // Tasks without specific time
  const untimedTasks = filteredTasks.filter(t => !t.start_time);

  const hours = Array.from({ length: 17 }, (_, i) => i + 6); // 6 AM to 10 PM

  return (
    <div className="animate-fade-in">
      <div className="flex items-center gap-4 mb-6">
        <Button variant="ghost" size="sm" onClick={onBack} className="gap-1">
          <ChevronLeft className="w-4 h-4" />
          Back
        </Button>
        <div>
          <h2 className="text-2xl font-light text-foreground">
            {format(date, 'EEEE')}
          </h2>
          <p className="text-foreground-muted">{format(date, 'MMMM d, yyyy')}</p>
        </div>
      </div>

      <div className="flex gap-6">
        {/* Time grid */}
        <div className="flex-1">
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <div className="border-l border-border">
              {hours.map(hour => (
                <TimeSlot
                  key={hour}
                  hour={hour}
                  date={date}
                  tasks={filteredTasks}
                  userId={userId}
                  currentEnergy={currentEnergy}
                  onAddTask={(h) => setAddingAtHour(h)}
                  onUpdateTask={updateTask}
                  onDeleteTask={deleteTask}
                  isAddingAt={addingAtHour}
                  onAddComplete={() => setAddingAtHour(null)}
                  addTaskHandler={addTask}
                />
              ))}
            </div>
          </DndContext>
        </div>

        {/* Untimed tasks sidebar */}
        <div className="w-64 shrink-0">
          <h3 className="text-sm font-medium text-foreground-muted mb-3">Untimed Tasks</h3>
          <div className="space-y-2">
            {untimedTasks.map(task => (
              <DraggableTask
                key={task.id}
                task={task}
                onUpdate={(updates) => updateTask(task.id, updates)}
                onDelete={() => deleteTask(task.id)}
                isShared={task.user_id !== userId}
                compact
              />
            ))}
          </div>
          <div className="mt-3">
            <QuickAddTask
              onAdd={handleQuickAdd}
              defaultEnergy={currentEnergy}
              defaultDate={date}
              compact
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default DayView;