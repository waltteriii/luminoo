import { useState, useEffect } from 'react';
import { format, startOfDay, addHours } from 'date-fns';
import { cn } from '@/lib/utils';
import { EnergyLevel, Task } from '@/types';
import { ChevronLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import AddTaskButton from '@/components/tasks/AddTaskButton';
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
  arrayMove,
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

const DayView = ({ date, currentEnergy, energyFilter = [], onBack }: DayViewProps) => {
  const [userId, setUserId] = useState<string | null>(null);

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
      // Reordering within the same day - just visual for now
      // Could implement task order field if needed
      console.log('Reordered:', active.id, 'over', over.id);
    }
  };

  const handleAddTask = async (title: string, energy: EnergyLevel) => {
    await addTask({
      title,
      energy_level: energy,
      due_date: dateStr,
    });
  };

  const filteredTasks = energyFilter.length > 0
    ? tasks.filter(t => energyFilter.includes(t.energy_level))
    : tasks;

  const hours = Array.from({ length: 16 }, (_, i) => i + 6);

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

      <div className="grid grid-cols-[auto_1fr] gap-4">
        {/* Time column */}
        <div className="space-y-8">
          {hours.map(hour => (
            <div key={hour} className="h-16 flex items-start">
              <span className="text-xs text-foreground-muted w-12">
                {format(addHours(startOfDay(date), hour), 'h a')}
              </span>
            </div>
          ))}
        </div>

        {/* Tasks column */}
        <div className="border-l border-border pl-4">
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={filteredTasks.map(t => t.id)}
              strategy={verticalListSortingStrategy}
            >
              <div className="space-y-2 mb-4">
                {filteredTasks.map(task => (
                  <DraggableTask
                    key={task.id}
                    task={task}
                    onUpdate={(updates) => updateTask(task.id, updates)}
                    onDelete={() => deleteTask(task.id)}
                    isShared={task.user_id !== userId}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
          <AddTaskButton onAdd={handleAddTask} defaultEnergy={currentEnergy} />
        </div>
      </div>
    </div>
  );
};

export default DayView;