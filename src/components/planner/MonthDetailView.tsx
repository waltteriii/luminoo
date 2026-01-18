import { useState, useEffect, useCallback, useMemo, memo } from 'react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, startOfWeek, endOfWeek, isSameMonth, isToday, getWeek, addMonths, parseISO, isWithinInterval, isSameDay } from 'date-fns';
import { cn } from '@/lib/utils';
import { EnergyLevel, Task } from '@/types';
import { ChevronLeft, ChevronRight, CalendarDays, GripVertical } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useDroppable, useDraggable } from '@dnd-kit/core';
import { useTasksContext } from '@/contexts/TasksContext';
import EditTaskDialog from '@/components/tasks/EditTaskDialog';
import { useIsMobile } from '@/hooks/use-mobile';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

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
const WEEKDAYS_SHORT = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

interface DroppableDayCellProps {
  day: Date;
  tasks: Task[];
  multiDayTasks: Task[];
  inMonth: boolean;
  today: boolean;
  userId: string | null;
  onDayClick: (date: Date) => void;
  onEditTask: (task: Task) => void;
  compact?: boolean;
}

const DroppableDayCell = memo(({ day, tasks, multiDayTasks, inMonth, today, userId, onDayClick, onEditTask, compact = false }: DroppableDayCellProps) => {
  const dateStr = format(day, 'yyyy-MM-dd');
  const { isOver, setNodeRef } = useDroppable({ 
    id: dateStr,
    data: { type: 'day', date: day },
  });

  const handleTaskDoubleClick = useCallback((e: React.MouseEvent, task: Task) => {
    e.stopPropagation();
    onEditTask(task);
  }, [onEditTask]);

  const maxTasks = compact ? 1 : 2;
  const maxMultiDay = compact ? 1 : 1;

  return (
    <button
      ref={setNodeRef}
      onClick={() => onDayClick(day)}
      className={cn(
        "p-1 lg:p-2 rounded-lg border text-left transition-all overflow-hidden min-h-[50px] sm:min-h-[70px] lg:min-h-[90px]",
        inMonth 
          ? "bg-card border-border hover:border-highlight/50 hover:bg-highlight-muted/50" 
          : "bg-secondary/50 border-transparent opacity-50",
        today && "border-highlight ring-1 ring-highlight/30",
        isOver && "ring-2 ring-highlight bg-highlight-muted"
      )}
    >
      <div className={cn(
        "text-[10px] sm:text-xs lg:text-sm font-medium mb-0.5",
        today ? "text-highlight" : inMonth ? "text-foreground" : "text-foreground-muted"
      )}>
        {format(day, 'd')}
      </div>
      
      {/* Multi-day tasks */}
      {multiDayTasks.slice(0, maxMultiDay).map(task => (
        <TooltipProvider key={task.id} delayDuration={200}>
          <Tooltip>
            <TooltipTrigger asChild>
              <div
                onClick={(e) => {
                  e.stopPropagation();
                  onEditTask(task);
                }}
                className={cn(
                  "text-[7px] sm:text-[8px] lg:text-[9px] px-1 py-0.5 rounded cursor-pointer mb-0.5",
                  "bg-primary/10 text-primary hover:bg-primary/20 border border-primary/20",
                  "flex items-center gap-0.5"
                )}
              >
                <CalendarDays className="w-2 h-2 flex-shrink-0" />
                <span className="truncate">{task.title}</span>
              </div>
            </TooltipTrigger>
            <TooltipContent side="top" className="max-w-[180px]">
              <p className="font-medium text-sm">{task.title}</p>
              <p className="text-xs text-muted-foreground">
                {format(parseISO(task.due_date!), 'MMM d')} - {format(parseISO(task.end_date!), 'MMM d')}
              </p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      ))}
      {multiDayTasks.length > maxMultiDay && (
        <div className="text-[7px] sm:text-[8px] text-foreground-muted">
          +{multiDayTasks.length - maxMultiDay} multi-day
        </div>
      )}

      <div className="space-y-0.5">
        {tasks.slice(0, maxTasks).map(task => (
          <DraggableMonthTask
            key={task.id}
            task={task}
            userId={userId}
            onDoubleClick={(e) => handleTaskDoubleClick(e, task)}
          />
        ))}
        {tasks.length > maxTasks && (
          <div className="text-[8px] sm:text-[9px] lg:text-[10px] text-foreground-muted">
            +{tasks.length - maxTasks}
          </div>
        )}
      </div>
    </button>
  );
});

DroppableDayCell.displayName = 'DroppableDayCell';

// Draggable task component for month view
interface DraggableMonthTaskProps {
  task: Task;
  userId: string | null;
  onDoubleClick: (e: React.MouseEvent) => void;
}

const DraggableMonthTask = memo(({ task, userId, onDoubleClick }: DraggableMonthTaskProps) => {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `month-task-${task.id}`,
    data: { task, type: 'calendar-task' },
  });

  const style = transform
    ? {
        transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
        zIndex: isDragging ? 1000 : undefined,
      }
    : undefined;

  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          <div
            ref={setNodeRef}
            style={style}
            {...attributes}
            {...listeners}
            onDoubleClick={onDoubleClick}
            className={cn(
              "text-[8px] sm:text-[9px] lg:text-[10px] px-1 py-0.5 rounded cursor-grab active:cursor-grabbing overflow-hidden touch-none",
              "hover:ring-1 hover:ring-primary/30 transition-all",
              task.energy_level === 'high' && "bg-energy-high/20 text-energy-high",
              task.energy_level === 'medium' && "bg-energy-medium/20 text-energy-medium",
              task.energy_level === 'low' && "bg-energy-low/20 text-energy-low",
              task.energy_level === 'recovery' && "bg-energy-recovery/20 text-energy-recovery",
              task.completed && "line-through opacity-60",
              isDragging && "opacity-50 shadow-lg ring-2 ring-primary"
            )}
          >
            <div className="flex items-center gap-0.5">
              <GripVertical className="w-2 h-2 text-current opacity-50 flex-shrink-0" />
              <span className="truncate flex-1">{task.title}</span>
              {task.user_id !== userId && (
                <span className="w-1 h-1 rounded-full bg-primary flex-shrink-0" />
              )}
            </div>
          </div>
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-[180px]">
          <p className="font-medium text-sm">{task.title}</p>
          {task.start_time && (
            <p className="text-xs text-muted-foreground">{task.start_time} - {task.end_time || ''}</p>
          )}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
});

DraggableMonthTask.displayName = 'DraggableMonthTask';

const MonthDetailView = ({ month, year, currentEnergy, energyFilter = [], onDayClick, onWeekClick, onBack }: MonthDetailViewProps) => {
  const [userId, setUserId] = useState<string | null>(null);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(month);
  const [currentYear, setCurrentYear] = useState(year);
  const isMobile = useIsMobile();

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUserId(data.user?.id || null);
    });
  }, []);

  useEffect(() => {
    setCurrentMonth(month);
    setCurrentYear(year);
  }, [month, year]);

  const monthDate = useMemo(() => new Date(currentYear, currentMonth, 1), [currentYear, currentMonth]);
  const monthStart = useMemo(() => startOfMonth(monthDate), [monthDate]);
  const monthEnd = useMemo(() => endOfMonth(monthDate), [monthDate]);
  const calendarStart = useMemo(() => startOfWeek(monthStart, { weekStartsOn: 1 }), [monthStart]);
  const calendarEnd = useMemo(() => endOfWeek(monthEnd, { weekStartsOn: 1 }), [monthEnd]);
  const calendarDays = useMemo(() => eachDayOfInterval({ start: calendarStart, end: calendarEnd }), [calendarStart, calendarEnd]);

  const { tasks: allTasks, updateTask, deleteTask } = useTasksContext();
  
  // Filter tasks for the calendar range from centralized context
  const tasks = useMemo(() => {
    const startStr = format(calendarStart, 'yyyy-MM-dd');
    const endStr = format(calendarEnd, 'yyyy-MM-dd');
    return allTasks.filter(t => t.due_date && t.due_date >= startStr && t.due_date <= endStr);
  }, [allTasks, calendarStart, calendarEnd]);

  // Separate regular tasks and multi-day tasks
  const { regularTasks, multiDayTasks } = useMemo(() => {
    const regular: Task[] = [];
    const multiDay: Task[] = [];
    
    tasks.forEach(t => {
      if (t.end_date && t.end_date !== t.due_date) {
        multiDay.push(t);
      } else {
        regular.push(t);
      }
    });
    
    return { regularTasks: regular, multiDayTasks: multiDay };
  }, [tasks]);

  const getTasksForDay = useCallback((date: Date) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    let dayTasks = regularTasks.filter(t => t.due_date === dateStr);
    
    if (energyFilter.length > 0) {
      dayTasks = dayTasks.filter(t => energyFilter.includes(t.energy_level));
    }
    
    return dayTasks;
  }, [regularTasks, energyFilter]);

  // Get multi-day tasks that span a specific day
  const getMultiDayTasksForDay = useCallback((date: Date) => {
    return multiDayTasks.filter(t => {
      if (!t.due_date || !t.end_date) return false;
      const startDate = parseISO(t.due_date);
      const endDate = parseISO(t.end_date);
      return isWithinInterval(date, { start: startDate, end: endDate }) ||
             isSameDay(date, startDate) || isSameDay(date, endDate);
    });
  }, [multiDayTasks]);

  const handleEditTask = useCallback((task: Task) => {
    setEditingTask(task);
    setEditDialogOpen(true);
  }, []);

  const handleSaveTask = useCallback((taskId: string, updates: Partial<Task>) => {
    updateTask(taskId, updates);
    setEditDialogOpen(false);
    setEditingTask(null);
  }, [updateTask]);

  const handlePrevMonth = useCallback(() => {
    const newDate = addMonths(monthDate, -1);
    setCurrentMonth(newDate.getMonth());
    setCurrentYear(newDate.getFullYear());
  }, [monthDate]);

  const handleNextMonth = useCallback(() => {
    const newDate = addMonths(monthDate, 1);
    setCurrentMonth(newDate.getMonth());
    setCurrentYear(newDate.getFullYear());
  }, [monthDate]);

  const weeks = useMemo(() => {
    const result: Date[][] = [];
    for (let i = 0; i < calendarDays.length; i += 7) {
      result.push(calendarDays.slice(i, i + 7));
    }
    return result;
  }, [calendarDays]);

  const weekdayLabels = isMobile ? WEEKDAYS_SHORT : WEEKDAYS;

  return (
    <div className="animate-fade-in">
      <div className="flex items-center justify-between mb-3 lg:mb-6 gap-2">
        <div className="flex items-center gap-2 lg:gap-4 min-w-0">
          <Button variant="ghost" size="sm" onClick={onBack} className="gap-1 flex-shrink-0 h-8 lg:h-9 px-2 lg:px-3">
            <ChevronLeft className="w-3.5 h-3.5 lg:w-4 lg:h-4" />
            <span className="hidden sm:inline text-xs lg:text-sm">Back</span>
          </Button>
          <h2 className="text-base sm:text-xl lg:text-2xl font-light text-foreground truncate">
            {format(monthDate, 'MMMM yyyy')}
          </h2>
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          <Button variant="outline" size="sm" onClick={handlePrevMonth} className="min-w-[36px] lg:min-w-[40px] min-h-[36px] lg:min-h-[40px] p-0">
            <ChevronLeft className="w-3.5 h-3.5 lg:w-4 lg:h-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={handleNextMonth} className="min-w-[36px] lg:min-w-[40px] min-h-[36px] lg:min-h-[40px] p-0">
            <ChevronRight className="w-3.5 h-3.5 lg:w-4 lg:h-4" />
          </Button>
        </div>
      </div>

      {/* Weekday headers - responsive grid */}
      <div className={cn(
        "grid gap-0.5 lg:gap-1 mb-1 lg:mb-2",
        isMobile ? "grid-cols-[auto_repeat(7,1fr)]" : "grid-cols-[auto_repeat(7,1fr)]"
      )}>
        <div className="w-6 sm:w-8 lg:w-12" />
        {weekdayLabels.map((day, idx) => (
          <div key={idx} className="text-center text-[9px] sm:text-[10px] lg:text-xs text-foreground-muted uppercase py-0.5 lg:py-2">
            {day}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="space-y-0.5 lg:space-y-1">
        {weeks.map((week, weekIdx) => (
          <div key={weekIdx} className="grid grid-cols-[auto_repeat(7,1fr)] gap-0.5 lg:gap-1">
            <button
              onClick={() => onWeekClick(week[0])}
              className="w-6 sm:w-8 lg:w-12 flex items-center justify-center text-[9px] sm:text-[10px] lg:text-xs text-foreground-muted hover:text-primary hover:bg-secondary rounded transition-colors min-h-[36px] lg:min-h-[40px]"
            >
              W{getWeek(week[0])}
            </button>
            
            {week.map((day) => (
              <DroppableDayCell
                key={day.toISOString()}
                day={day}
                tasks={getTasksForDay(day)}
                multiDayTasks={getMultiDayTasksForDay(day)}
                inMonth={isSameMonth(day, monthDate)}
                today={isToday(day)}
                userId={userId}
                onDayClick={onDayClick}
                onEditTask={handleEditTask}
                compact={isMobile}
              />
            ))}
          </div>
        ))}
      </div>

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
