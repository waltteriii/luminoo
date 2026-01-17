import { useState, useEffect } from 'react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, startOfWeek, endOfWeek, isSameMonth, isSameDay, isToday, getWeek } from 'date-fns';
import { cn } from '@/lib/utils';
import { EnergyLevel, Task } from '@/types';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import AddTaskButton from '@/components/tasks/AddTaskButton';

interface MonthDetailViewProps {
  month: number; // 0-indexed
  year: number;
  currentEnergy: EnergyLevel;
  energyFilter?: EnergyLevel[];
  onDayClick: (date: Date) => void;
  onWeekClick: (date: Date) => void;
  onBack: () => void;
}

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

const MonthDetailView = ({ month, year, currentEnergy, onDayClick, onWeekClick, onBack }: MonthDetailViewProps) => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);

  const monthDate = new Date(year, month, 1);
  const monthStart = startOfMonth(monthDate);
  const monthEnd = endOfMonth(monthDate);
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
  const calendarDays = eachDayOfInterval({ start: calendarStart, end: calendarEnd });

  useEffect(() => {
    loadTasks();
  }, [month, year]);

  const loadTasks = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const startStr = format(calendarStart, 'yyyy-MM-dd');
      const endStr = format(calendarEnd, 'yyyy-MM-dd');

      const { data, error } = await supabase
        .from('tasks')
        .select('*')
        .eq('user_id', user.id)
        .gte('due_date', startStr)
        .lte('due_date', endStr)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setTasks(data as Task[] || []);
    } catch (err) {
      console.error('Load tasks error:', err);
    } finally {
      setLoading(false);
    }
  };

  const getTasksForDay = (date: Date) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    return tasks.filter(t => t.due_date === dateStr);
  };

  const handleAddTask = async (date: Date, title: string, energy: EnergyLevel) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('tasks')
        .insert({
          user_id: user.id,
          title,
          energy_level: energy,
          due_date: format(date, 'yyyy-MM-dd'),
        })
        .select()
        .single();

      if (error) throw error;
      if (data) {
        setTasks(prev => [...prev, data as Task]);
      }
    } catch (err) {
      console.error('Add task error:', err);
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
        <div className="w-12" /> {/* Week number column */}
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
            {/* Week number */}
            <button
              onClick={() => onWeekClick(week[0])}
              className="w-12 flex items-center justify-center text-xs text-foreground-muted hover:text-primary hover:bg-secondary rounded transition-colors"
            >
              W{getWeek(week[0])}
            </button>
            
            {/* Days */}
            {week.map((day) => {
              const dayTasks = getTasksForDay(day);
              const inMonth = isSameMonth(day, monthDate);
              const today = isToday(day);

              return (
                <button
                  key={day.toISOString()}
                  onClick={() => onDayClick(day)}
                  className={cn(
                    "min-h-[80px] p-2 rounded-lg border text-left transition-all",
                    inMonth 
                      ? "bg-card border-border hover:border-primary/50" 
                      : "bg-secondary/50 border-transparent opacity-50",
                    today && "border-primary ring-1 ring-primary/20"
                  )}
                >
                  <div className={cn(
                    "text-sm font-medium mb-1",
                    today ? "text-primary" : inMonth ? "text-foreground" : "text-foreground-muted"
                  )}>
                    {format(day, 'd')}
                  </div>
                  
                  <div className="space-y-0.5">
                    {dayTasks.slice(0, 2).map(task => (
                      <div
                        key={task.id}
                        className={cn(
                          "text-[10px] px-1 py-0.5 rounded truncate",
                          task.energy_level === 'high' && "bg-energy-high/20 text-energy-high",
                          task.energy_level === 'medium' && "bg-energy-medium/20 text-energy-medium",
                          task.energy_level === 'low' && "bg-energy-low/20 text-energy-low",
                          task.energy_level === 'recovery' && "bg-energy-recovery/20 text-energy-recovery",
                          task.completed && "line-through opacity-60"
                        )}
                      >
                        {task.title}
                      </div>
                    ))}
                    {dayTasks.length > 2 && (
                      <div className="text-[10px] text-foreground-muted">
                        +{dayTasks.length - 2}
                      </div>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
};

export default MonthDetailView;
