import { useState, useEffect } from 'react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, startOfWeek, endOfWeek, isSameMonth, isToday, getWeek } from 'date-fns';
import { cn } from '@/lib/utils';
import { EnergyLevel, Task } from '@/types';
import { ChevronLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  useDroppable,
} from '@dnd-kit/core';
import { useRealtimeTasks } from '@/hooks/useRealtimeTasks';

interface MonthDetailViewProps {
  month: number;
  year: number;
  currentEnergy: EnergyLevel;
  energyFilter?: EnergyLevel[];
  onDayClick: (date: Date) => void;
  onWeekClick: (date: Date) => void;
  onBack: () => void;
}

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

interface DroppableDayCellProps {
  day: Date;
  tasks: Task[];
  inMonth: boolean;
  today: boolean;
  userId: string | null;
  onDayClick: (date: Date) => void;
}

const DroppableDayCell = ({ day, tasks, inMonth, today, userId, onDayClick }: DroppableDayCellProps) => {
  const dateStr = format(day, 'yyyy-MM-dd');
  const { isOver, setNodeRef } = useDroppable({ id: dateStr });

  return (
    <button
      ref={setNodeRef}
      onClick={() => onDayClick(day)}
      className={cn(
        "min-h-[80px] p-2 rounded-lg border text-left transition-all",
        inMonth 
          ? "bg-card border-border hover:border-primary/50" 
          : "bg-secondary/50 border-transparent opacity-50",
        today && "border-primary ring-1 ring-primary/20",
        isOver && "ring-2 ring-primary bg-primary/5"
      )}
    >
      <div className={cn(
        "text-sm font-medium mb-1",
        today ? "text-primary" : inMonth ? "text-foreground" : "text-foreground-muted"
      )}>
        {format(day, 'd')}
      </div>
      
      <div className="space-y-0.5">
        {tasks.slice(0, 2).map(task => (
          <div
            key={task.id}
            className={cn(
              "text-[10px] px-1 py-0.5 rounded truncate flex items-center gap-1",
              task.energy_level === 'high' && "bg-energy-high/20 text-energy-high",
              task.energy_level === 'medium' && "bg-energy-medium/20 text-energy-medium",
              task.energy_level === 'low' && "bg-energy-low/20 text-energy-low",
              task.energy_level === 'recovery' && "bg-energy-recovery/20 text-energy-recovery",
              task.completed && "line-through opacity-60"
            )}
          >
            <span className="truncate">{task.title}</span>
            {task.user_id !== userId && (
              <span className="w-1.5 h-1.5 rounded-full bg-primary flex-shrink-0" />
            )}
          </div>
        ))}
        {tasks.length > 2 && (
          <div className="text-[10px] text-foreground-muted">
            +{tasks.length - 2}
          </div>
        )}
      </div>
    </button>
  );
};

const MonthDetailView = ({ month, year, currentEnergy, energyFilter = [], onDayClick, onWeekClick, onBack }: MonthDetailViewProps) => {
  const [userId, setUserId] = useState<string | null>(null);
  const [activeTask, setActiveTask] = useState<Task | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUserId(data.user?.id || null);
    });
  }, []);

  const monthDate = new Date(year, month, 1);
  const monthStart = startOfMonth(monthDate);
  const monthEnd = endOfMonth(monthDate);
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
  const calendarDays = eachDayOfInterval({ start: calendarStart, end: calendarEnd });

  const { tasks, rescheduleTask } = useRealtimeTasks({
    userId: userId || undefined,
    dateRange: {
      start: format(calendarStart, 'yyyy-MM-dd'),
      end: format(calendarEnd, 'yyyy-MM-dd'),
    },
    includeShared: true,
  });

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  const getTasksForDay = (date: Date) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    let dayTasks = tasks.filter(t => t.due_date === dateStr);
    
    if (energyFilter.length > 0) {
      dayTasks = dayTasks.filter(t => energyFilter.includes(t.energy_level));
    }
    
    return dayTasks;
  };

  const handleDragStart = (event: DragStartEvent) => {
    const task = tasks.find(t => t.id === event.active.id);
    setActiveTask(task || null);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveTask(null);

    if (!over) return;

    const taskId = active.id as string;
    const targetDate = over.id as string;

    if (/^\d{4}-\d{2}-\d{2}$/.test(targetDate)) {
      const task = tasks.find(t => t.id === taskId);
      if (task && task.due_date !== targetDate) {
        await rescheduleTask(taskId, targetDate);
      }
    }
  };

  // Group days by week
  const weeks: Date[][] = [];
  for (let i = 0; i < calendarDays.length; i += 7) {
    weeks.push(calendarDays.slice(i, i + 7));
  }

  return (
    <div className="animate-fade-in">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={onBack} className="gap-1">
            <ChevronLeft className="w-4 h-4" />
            Back
          </Button>
          <h2 className="text-2xl font-light text-foreground">
            {format(monthDate, 'MMMM yyyy')}
          </h2>
        </div>
      </div>

      {/* Weekday headers */}
      <div className="grid grid-cols-[auto_repeat(7,1fr)] gap-1 mb-2">
        <div className="w-12" />
        {WEEKDAYS.map(day => (
          <div key={day} className="text-center text-xs text-foreground-muted uppercase py-2">
            {day}
          </div>
        ))}
      </div>

      {/* Calendar grid with drag-and-drop */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="space-y-1">
          {weeks.map((week, weekIdx) => (
            <div key={weekIdx} className="grid grid-cols-[auto_repeat(7,1fr)] gap-1">
              <button
                onClick={() => onWeekClick(week[0])}
                className="w-12 flex items-center justify-center text-xs text-foreground-muted hover:text-primary hover:bg-secondary rounded transition-colors"
              >
                W{getWeek(week[0])}
              </button>
              
              {week.map((day) => (
                <DroppableDayCell
                  key={day.toISOString()}
                  day={day}
                  tasks={getTasksForDay(day)}
                  inMonth={isSameMonth(day, monthDate)}
                  today={isToday(day)}
                  userId={userId}
                  onDayClick={onDayClick}
                />
              ))}
            </div>
          ))}
        </div>

        <DragOverlay>
          {activeTask && (
            <div className="bg-card border border-primary rounded-lg p-2 shadow-xl opacity-90">
              <span className="text-sm">{activeTask.title}</span>
            </div>
          )}
        </DragOverlay>
      </DndContext>
    </div>
  );
};

export default MonthDetailView;