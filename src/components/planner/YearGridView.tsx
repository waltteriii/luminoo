import { useMemo, useEffect, useState } from 'react';
import { ZoomLevel, EnergyLevel, Task } from '@/types';
import MonthCard from './MonthCard';
import { cn } from '@/lib/utils';

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
    topTasks: { title: string; energy: EnergyLevel }[];
  };
}

interface DroppableMonthCardProps {
  monthIndex: number;
  name: string;
  isCurrentMonth: boolean;
  zoomLevel: ZoomLevel;
  onClick: () => void;
  taskIndicators: { energy: EnergyLevel; count: number }[];
  topTasks: { title: string; energy: EnergyLevel }[];
}

const DroppableMonthCard = ({ monthIndex, name, isCurrentMonth, zoomLevel, onClick, taskIndicators, topTasks }: DroppableMonthCardProps) => {
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
        topTasks={topTasks}
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

  // Fetch tasks for the year to show indicators (Stubbed)
  useEffect(() => {
    // Stub - empty data for visual clean start
    setMonthTaskData({});
  }, []);

  const gridClass = useMemo(() => {
    switch (zoomLevel) {
      case 'year':
        return 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6';
      case 'quarter':
        return 'grid-cols-1 md:grid-cols-3';
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

  const getTopTasks = (monthIndex: number) => {
    return monthTaskData[monthIndex]?.topTasks || [];
  };

  return (
    <div className="space-y-6 lg:space-y-8 animate-fade-in">
      {/* Header - cleaner on mobile */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-light text-foreground">{currentYear}</h1>
          <p className="text-foreground-muted text-xs sm:text-sm mt-0.5">
            {zoomLevel === 'year' && 'Annual Overview'}
            {zoomLevel === 'quarter' && focusedMonth !== null && `Q${Math.floor(focusedMonth / 3) + 1}`}
            {zoomLevel === 'month' && focusedMonth !== null && MONTHS[focusedMonth]}
          </p>
        </div>

        {zoomLevel !== 'year' && (
          <button
            onClick={onZoomOut}
            className="text-xs sm:text-sm text-foreground-muted hover:text-foreground transition-colors"
          >
            ← Back
          </button>
        )}
      </div>

      {/* Grid - hairline gaps */}
      <div className={cn('grid gap-px bg-border/20 rounded-xl overflow-hidden', gridClass)}>
        {visibleMonths.map((monthIndex) => (
          <DroppableMonthCard
            key={monthIndex}
            monthIndex={monthIndex}
            name={MONTHS[monthIndex]}
            isCurrentMonth={monthIndex === currentMonth}
            zoomLevel={zoomLevel}
            onClick={() => onMonthClick(monthIndex)}
            taskIndicators={getTaskIndicators(monthIndex)}
            topTasks={getTopTasks(monthIndex)}
          />
        ))}
      </div>

      {/* Hint - smaller on mobile */}
      {zoomLevel === 'year' && (
        <p className="text-center text-foreground-subtle text-[10px] sm:text-xs mt-4 sm:mt-6">
          Tap a month to zoom in
        </p>
      )}
    </div>
  );
};

export default YearGridView;
