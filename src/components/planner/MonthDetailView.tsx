import { useState, useEffect } from 'react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, startOfWeek, endOfWeek, isSameMonth, isToday, getWeek, addMonths } from 'date-fns';
import { cn } from '@/lib/utils';
import { EnergyLevel, Task } from '@/types';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useDroppable } from '@dnd-kit/core';
import { useRealtimeTasks } from '@/hooks/useRealtimeTasks';
import EditTaskDialog from '@/components/tasks/EditTaskDialog';

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
  onEditTask: (task: Task) => void;
}

const DroppableDayCell = ({ day, tasks, inMonth, today, userId, onDayClick, onEditTask }: DroppableDayCellProps) => {
  const dateStr = format(day, 'yyyy-MM-dd');
  const { isOver, setNodeRef } = useDroppable({ 
    id: dateStr,
    data: { type: 'day', date: day },
  });

  const handleTaskDoubleClick = (e: React.MouseEvent, task: Task) => {
    e.stopPropagation();
    onEditTask(task);
  };

  return (
    <button
      ref={setNodeRef}
      onClick={() => onDayClick(day)}
      className={cn(
        "h-[100px] p-2 rounded-lg border text-left transition-all overflow-hidden",
        inMonth 
          ? "bg-card border-border hover:border-highlight/50 hover:bg-highlight-muted/50" 
          : "bg-secondary/50 border-transparent opacity-50",
        today && "border-highlight ring-1 ring-highlight/30",
        isOver && "ring-2 ring-highlight bg-highlight-muted"
      )}
    >
      <div className={cn(
        "text-sm font-medium mb-1",
        today ? "text-highlight" : inMonth ? "text-foreground" : "text-foreground-muted"
      )}>
        {format(day, 'd')}
      </div>
      
      <div className="space-y-0.5">
        {tasks.slice(0, 2).map(task => (
          <div
            key={task.id}
            onDoubleClick={(e) => handleTaskDoubleClick(e, task)}
            className={cn(
              "text-[10px] px-1.5 py-0.5 rounded cursor-pointer hover:ring-1 hover:ring-primary/30 overflow-hidden",
              task.energy_level === 'high' && "bg-energy-high/20 text-energy-high",
              task.energy_level === 'medium' && "bg-energy-medium/20 text-energy-medium",
              task.energy_level === 'low' && "bg-energy-low/20 text-energy-low",
              task.energy_level === 'recovery' && "bg-energy-recovery/20 text-energy-recovery",
              task.completed && "line-through opacity-60"
            )}
          >
            <div className="flex items-center gap-1">
              <span className="truncate flex-1 bg-gradient-to-r from-current to-transparent bg-clip-text" style={{ WebkitBackgroundClip: 'text' }}>{task.title}</span>
              {task.user_id !== userId && (
                <span className="w-1.5 h-1.5 rounded-full bg-primary flex-shrink-0" />
              )}
            </div>
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
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(month);
  const [currentYear, setCurrentYear] = useState(year);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUserId(data.user?.id || null);
    });
  }, []);

  // Sync with prop changes
  useEffect(() => {
    setCurrentMonth(month);
    setCurrentYear(year);
  }, [month, year]);

  const monthDate = new Date(currentYear, currentMonth, 1);
  const monthStart = startOfMonth(monthDate);
  const monthEnd = endOfMonth(monthDate);
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
  const calendarDays = eachDayOfInterval({ start: calendarStart, end: calendarEnd });

  const { tasks, updateTask, deleteTask } = useRealtimeTasks({
    userId: userId || undefined,
    dateRange: {
      start: format(calendarStart, 'yyyy-MM-dd'),
      end: format(calendarEnd, 'yyyy-MM-dd'),
    },
    includeShared: true,
  });

  const getTasksForDay = (date: Date) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    let dayTasks = tasks.filter(t => t.due_date === dateStr);
    
    if (energyFilter.length > 0) {
      dayTasks = dayTasks.filter(t => energyFilter.includes(t.energy_level));
    }
    
    return dayTasks;
  };

  const handleEditTask = (task: Task) => {
    setEditingTask(task);
    setEditDialogOpen(true);
  };

  const handleSaveTask = (taskId: string, updates: Partial<Task>) => {
    updateTask(taskId, updates);
    setEditDialogOpen(false);
    setEditingTask(null);
  };

  const handlePrevMonth = () => {
    const newDate = addMonths(monthDate, -1);
    setCurrentMonth(newDate.getMonth());
    setCurrentYear(newDate.getFullYear());
  };

  const handleNextMonth = () => {
    const newDate = addMonths(monthDate, 1);
    setCurrentMonth(newDate.getMonth());
    setCurrentYear(newDate.getFullYear());
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
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handlePrevMonth}>
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={handleNextMonth}>
            <ChevronRight className="w-4 h-4" />
          </Button>
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

      {/* Calendar grid */}
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
                onEditTask={handleEditTask}
              />
            ))}
          </div>
        ))}
      </div>

      {/* Edit task dialog */}
      <EditTaskDialog
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        task={editingTask}
        onSave={handleSaveTask}
        onDelete={editingTask ? () => {
          deleteTask(editingTask.id);
          setEditDialogOpen(false);
          setEditingTask(null);
        } : undefined}
      />
    </div>
  );
};

export default MonthDetailView;