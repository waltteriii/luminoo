import { useState, useCallback } from 'react';
import { ViewMode, ZoomLevel, EnergyLevel } from '@/types';
import YearGridView from './YearGridView';
import CircularView from './CircularView';
import TimelineView from './TimelineView';
import MonthDetailView from './MonthDetailView';
import WeekView from './WeekView';
import DayView from './DayView';
import ViewSelector from './ViewSelector';

interface PlannerViewProps {
  viewMode: ViewMode;
  zoomLevel: ZoomLevel;
  focusedMonth: number | null;
  focusedDate: Date | null;
  currentEnergy: EnergyLevel;
  energyFilter: EnergyLevel[];
  onMonthClick: (month: number) => void;
  onDayClick: (date: Date) => void;
  onWeekClick: (date: Date) => void;
  onZoomOut: () => void;
  onZoomLevelChange: (level: ZoomLevel) => void;
}

const PlannerView = ({
  viewMode,
  zoomLevel,
  focusedMonth,
  focusedDate,
  currentEnergy,
  energyFilter,
  onMonthClick,
  onDayClick,
  onWeekClick,
  onZoomOut,
  onZoomLevelChange,
}: PlannerViewProps) => {
  const currentYear = new Date().getFullYear();

  // Track Day view layout reset capability
  const [canResetLayout, setCanResetLayout] = useState(false);
  const [resetLayoutFn, setResetLayoutFn] = useState<(() => void) | null>(null);

  const handleLayoutResetChange = useCallback((canReset: boolean, resetFn: () => void) => {
    setCanResetLayout(canReset);
    // Store as a function to avoid React calling it during setState
    setResetLayoutFn(() => resetFn);
  }, []);

  const handleResetLayout = useCallback(() => {
    resetLayoutFn?.();
  }, [resetLayoutFn]);

  // Day view
  if (zoomLevel === 'day' && focusedDate) {
    return (
      <div className="h-full p-6 lg:p-8">
        <div className="flex items-center justify-between mb-4">
          <ViewSelector
            zoomLevel={zoomLevel}
            onZoomLevelChange={onZoomLevelChange}
            canResetLayout={canResetLayout}
            onResetLayout={handleResetLayout}
          />
        </div>
        <DayView
          date={focusedDate}
          currentEnergy={currentEnergy}
          energyFilter={energyFilter}
          onBack={onZoomOut}
          onLayoutResetChange={handleLayoutResetChange}
        />
      </div>
    );
  }

  // Week view
  if (zoomLevel === 'week' && focusedDate) {
    return (
      <div className="h-full p-6 lg:p-8">
        <div className="flex items-center justify-between mb-4">
          <ViewSelector zoomLevel={zoomLevel} onZoomLevelChange={onZoomLevelChange} />
        </div>
        <WeekView
          startDate={focusedDate}
          currentEnergy={currentEnergy}
          energyFilter={energyFilter}
          onDayClick={onDayClick}
          onBack={onZoomOut}
        />
      </div>
    );
  }

  // Month detail view
  if (zoomLevel === 'month' && focusedMonth !== null) {
    return (
      <div className="h-full p-6 lg:p-8">
        <div className="flex items-center justify-between mb-4">
          <ViewSelector zoomLevel={zoomLevel} onZoomLevelChange={onZoomLevelChange} />
        </div>
        <MonthDetailView
          month={focusedMonth}
          year={currentYear}
          currentEnergy={currentEnergy}
          energyFilter={energyFilter}
          onDayClick={onDayClick}
          onWeekClick={onWeekClick}
          onBack={onZoomOut}
        />
      </div>
    );
  }

  const commonProps = {
    zoomLevel,
    focusedMonth,
    currentEnergy,
    energyFilter,
    onMonthClick,
    onZoomOut,
  };

  return (
    <div className="h-full p-6 lg:p-8">
      <div className="flex items-center justify-between mb-4">
        <ViewSelector zoomLevel={zoomLevel} onZoomLevelChange={onZoomLevelChange} />
      </div>
      {viewMode === 'grid' && <YearGridView {...commonProps} />}
      {viewMode === 'circular' && <CircularView {...commonProps} />}
      {viewMode === 'timeline' && <TimelineView {...commonProps} />}
    </div>
  );
};

export default PlannerView;
