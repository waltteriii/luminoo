import { useMemo } from 'react';
import { ZoomLevel, EnergyLevel } from '@/types';
import MonthCard from './MonthCard';
import { cn } from '@/lib/utils';

interface YearGridViewProps {
  zoomLevel: ZoomLevel;
  focusedMonth: number | null;
  currentEnergy: EnergyLevel;
  onMonthClick: (month: number) => void;
  onZoomOut: () => void;
}

const MONTHS = [
  'January', 'February', 'March', 'April',
  'May', 'June', 'July', 'August',
  'September', 'October', 'November', 'December'
];

const YearGridView = ({
  zoomLevel,
  focusedMonth,
  currentEnergy,
  onMonthClick,
  onZoomOut,
}: YearGridViewProps) => {
  const currentMonth = new Date().getMonth();
  const currentYear = new Date().getFullYear();

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
          <MonthCard
            key={monthIndex}
            month={monthIndex}
            name={MONTHS[monthIndex]}
            isCurrentMonth={monthIndex === currentMonth}
            zoomLevel={zoomLevel}
            onClick={() => onMonthClick(monthIndex)}
          />
        ))}
      </div>

      {/* Empty state hint */}
      {zoomLevel === 'year' && (
        <p className="text-center text-foreground-subtle text-sm mt-8">
          Click on a month to zoom in and add campaigns
        </p>
      )}
    </div>
  );
};

export default YearGridView;
