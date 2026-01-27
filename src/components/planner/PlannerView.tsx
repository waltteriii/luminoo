import { useState, useCallback, useRef, useEffect } from 'react';
import { ViewMode, ZoomLevel, EnergyLevel } from '@/types';
import { addMonths, addWeeks, addDays } from 'date-fns';
import YearGridView from './YearGridView';
import CircularView from './CircularView';
import TimelineView from './TimelineView';
import MonthDetailView from './MonthDetailView';
import WeekView from './WeekView';
import DayView from './DayView';
import ViewSelector from './ViewSelector';
import useSwipeNavigation from '@/hooks/useSwipeNavigation';

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
  onJumpToToday: () => void;
  onSetFocusedDate: (date: Date) => void;
  onSetFocusedMonth: (month: number) => void;
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
  onJumpToToday,
  onSetFocusedDate,
  onSetFocusedMonth,
}: PlannerViewProps) => {
  const currentYear = new Date().getFullYear();
  const containerRef = useRef<HTMLDivElement>(null);

  // Track Day view layout reset capability
  const [canResetLayout, setCanResetLayout] = useState(false);
  const [resetLayoutFn, setResetLayoutFn] = useState<(() => void) | null>(null);

  // Year state for year view navigation
  const [viewYear, setViewYear] = useState(currentYear);

  const handleLayoutResetChange = useCallback((canReset: boolean, resetFn: () => void) => {
    setCanResetLayout(canReset);
    setResetLayoutFn(() => resetFn);
  }, []);

  const handleResetLayout = useCallback(() => {
    resetLayoutFn?.();
  }, [resetLayoutFn]);

  // Navigation handlers for swipe
  const handleSwipeNext = useCallback(() => {
    if (zoomLevel === 'day' && focusedDate) {
      onSetFocusedDate(addDays(focusedDate, 1));
    } else if (zoomLevel === 'week' && focusedDate) {
      onSetFocusedDate(addWeeks(focusedDate, 1));
    } else if (zoomLevel === 'month' && focusedMonth !== null) {
      const newMonth = (focusedMonth + 1) % 12;
      onSetFocusedMonth(newMonth);
    } else if (zoomLevel === 'year') {
      setViewYear(prev => prev + 1);
    }
  }, [zoomLevel, focusedDate, focusedMonth, onSetFocusedDate, onSetFocusedMonth]);

  const handleSwipePrev = useCallback(() => {
    if (zoomLevel === 'day' && focusedDate) {
      onSetFocusedDate(addDays(focusedDate, -1));
    } else if (zoomLevel === 'week' && focusedDate) {
      onSetFocusedDate(addWeeks(focusedDate, -1));
    } else if (zoomLevel === 'month' && focusedMonth !== null) {
      const newMonth = focusedMonth === 0 ? 11 : focusedMonth - 1;
      onSetFocusedMonth(newMonth);
    } else if (zoomLevel === 'year') {
      setViewYear(prev => prev - 1);
    }
  }, [zoomLevel, focusedDate, focusedMonth, onSetFocusedDate, onSetFocusedMonth]);

  // Swipe navigation hook
  const { bindToElement } = useSwipeNavigation({
    onSwipeLeft: handleSwipeNext,
    onSwipeRight: handleSwipePrev,
    threshold: 60,
    enabled: true,
  });

  // Bind swipe to container
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    return bindToElement(container);
  }, [bindToElement]);

  // Day view
  if (zoomLevel === 'day' && focusedDate) {
    return (
      <div ref={containerRef} className="h-full min-h-0">
        <div className="flex items-center justify-between mb-4 sm:mb-5">
          <ViewSelector
            zoomLevel={zoomLevel}
            onZoomLevelChange={onZoomLevelChange}
            canResetLayout={canResetLayout}
            onResetLayout={handleResetLayout}
            onJumpToToday={onJumpToToday}
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
      <div ref={containerRef} className="h-full min-h-0">
        <div className="flex items-center justify-between mb-4 sm:mb-5">
          <ViewSelector
            zoomLevel={zoomLevel}
            onZoomLevelChange={onZoomLevelChange}
            onJumpToToday={onJumpToToday}
          />
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
      <div ref={containerRef} className="h-full min-h-0">
        <div className="flex items-center justify-between mb-4 sm:mb-5">
          <ViewSelector
            zoomLevel={zoomLevel}
            onZoomLevelChange={onZoomLevelChange}
            onJumpToToday={onJumpToToday}
          />
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
    <div ref={containerRef} className="h-full min-h-0">
      <div className="flex items-center justify-between mb-4 sm:mb-5">
        <ViewSelector
          zoomLevel={zoomLevel}
          onZoomLevelChange={onZoomLevelChange}
          onJumpToToday={onJumpToToday}
        />
      </div>
      {viewMode === 'grid' && <YearGridView {...commonProps} />}
      {viewMode === 'circular' && <CircularView {...commonProps} />}
      {viewMode === 'timeline' && <TimelineView {...commonProps} />}
    </div>
  );
};

export default PlannerView;
