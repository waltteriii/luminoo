import { useMemo, useEffect, useState } from 'react';
import { ZoomLevel, EnergyLevel, Task } from '@/types';
import MonthCard from './MonthCard';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { startOfYear, endOfYear, parseISO } from 'date-fns';
import { useDroppable } from '@dnd-kit/core';

interface YearGridViewProps {
  zoomLevel: ZoomLevel;
  focusedMonth: number | null;
  currentEnergy: EnergyLevel;
  energyFilter?: EnergyLevel[];
  onMonthClick: (month: number) => void;
  onZoomOut: () => void;
}

const MONTHS = [
  'January', 'February', 'March', 'April',
  'May', 'June', 'July', 'August',
  'September', 'October', 'November', 'December'
];

interface MonthTaskData {
  [month: number]: {
    high: number;
    medium: number;
    low: number;
    recovery: number;
  };
}

interface DroppableMonthCardProps {
  monthIndex: number;
  name: string;
  isCurrentMonth: boolean;
  zoomLevel: ZoomLevel;
  onClick: () => void;
  taskIndicators: { energy: EnergyLevel; count: number }[];
}

const DroppableMonthCard = ({ monthIndex, name, isCurrentMonth, zoomLevel, onClick, taskIndicators }: DroppableMonthCardProps) => {
  const { isOver, setNodeRef } = useDroppable({
    id: `month-${monthIndex}`,
    data: { type: 'month', monthIndex },
  });

  return (
    <div ref={setNodeRef} className={cn(isOver && "ring-2 ring-primary rounded-lg")}>
      <MonthCard
        month={monthIndex}
        name={name}
        isCurrentMonth={isCurrentMonth}
        zoomLevel={zoomLevel}
        onClick={onClick}
        taskIndicators={taskIndicators}
      />
    </div>
  );
};

const YearGridView = ({
  zoomLevel,
  focusedMonth,
  currentEnergy,
  energyFilter = [],
  onMonthClick,
  onZoomOut,
}: YearGridViewProps) => {
  const currentMonth = new Date().getMonth();
  const currentYear = new Date().getFullYear();
  const [monthTaskData, setMonthTaskData] = useState<MonthTaskData>({});

  // Fetch tasks for the year to show indicators
  useEffect(() => {
    const fetchYearTasks = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const yearStart = startOfYear(new Date());
      const yearEnd = endOfYear(new Date());

      const { data: tasks, error } = await supabase
        .from('tasks')
        .select('due_date, energy_level')
        .eq('user_id', user.id)
        .gte('due_date', yearStart.toISOString())
        .lte('due_date', yearEnd.toISOString());

      if (error) {
        console.error('Error fetching year tasks:', error);
        return;
      }

      // Group tasks by month and energy level
      const grouped: MonthTaskData = {};
      for (let i = 0; i < 12; i++) {
        grouped[i] = { high: 0, medium: 0, low: 0, recovery: 0 };
      }

      tasks?.forEach(task => {
        if (task.due_date) {
          const date = parseISO(task.due_date);
          const month = date.getMonth();
          const energy = (task.energy_level || 'medium') as EnergyLevel;
          if (grouped[month]) {
            grouped[month][energy]++;
          }
        }
      });

      setMonthTaskData(grouped);
    };

    fetchYearTasks();
  }, []);

  const gridClass = useMemo(() => {
    switch (zoomLevel) {
      case 'year':
        return 'grid-cols-3 md:grid-cols-4 lg:grid-cols-6';
      case 'quarter':
        return 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3';
      case 'month':
        return 'grid-cols-1';
      default:
        return 'grid-cols-4';
    }
  }, [zoomLevel]);

  const visibleMonths = useMemo(() => {
    if (zoomLevel === 'month' && focusedMonth !== null) {
      return [focusedMonth];
    }
    if (zoomLevel === 'quarter' && focusedMonth !== null) {
      const quarter = Math.floor(focusedMonth / 3);
      return [quarter * 3, quarter * 3 + 1, quarter * 3 + 2];
    }
    return Array.from({ length: 12 }, (_, i) => i);
  }, [zoomLevel, focusedMonth]);

  const getTaskIndicators = (monthIndex: number) => {
    const data = monthTaskData[monthIndex];
    if (!data) return [];
    
    const indicators: { energy: EnergyLevel; count: number }[] = [];
    
    // If energy filter is active, only show filtered energies
    const energiesToShow: EnergyLevel[] = energyFilter.length > 0 
      ? energyFilter 
      : ['high', 'medium', 'low', 'recovery'];
    
    energiesToShow.forEach(energy => {
      if (data[energy] > 0) {
        indicators.push({ energy, count: data[energy] });
      }
    });
    
    return indicators;
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-light text-foreground">{currentYear}</h1>
          <p className="text-foreground-muted mt-1">
            {zoomLevel === 'year' && 'Annual Overview'}
            {zoomLevel === 'quarter' && focusedMonth !== null && `Q${Math.floor(focusedMonth / 3) + 1}`}
            {zoomLevel === 'month' && focusedMonth !== null && MONTHS[focusedMonth]}
          </p>
        </div>
        
        {zoomLevel !== 'year' && (
          <button
            onClick={onZoomOut}
            className="text-sm text-foreground-muted hover:text-foreground transition-colors"
          >
            ← Back to {zoomLevel === 'month' ? 'Quarter' : 'Year'}
          </button>
        )}
      </div>

      {/* Grid */}
      <div className={cn('grid gap-4', gridClass)}>
        {visibleMonths.map((monthIndex) => (
          <DroppableMonthCard
            key={monthIndex}
            monthIndex={monthIndex}
            name={MONTHS[monthIndex]}
            isCurrentMonth={monthIndex === currentMonth}
            zoomLevel={zoomLevel}
            onClick={() => onMonthClick(monthIndex)}
            taskIndicators={getTaskIndicators(monthIndex)}
          />
        ))}
      </div>

      {/* Empty state hint */}
      {zoomLevel === 'year' && (
        <p className="text-center text-foreground-subtle text-sm mt-8">
          Click on a month to zoom in • Drag inbox tasks to schedule
        </p>
      )}
    </div>
  );
};

export default YearGridView;
