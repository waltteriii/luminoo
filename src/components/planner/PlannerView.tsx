import { ViewMode, ZoomLevel, EnergyLevel } from '@/types';
import YearGridView from './YearGridView';
import CircularView from './CircularView';
import TimelineView from './TimelineView';
import MonthDetailView from './MonthDetailView';
import WeekView from './WeekView';
import DayView from './DayView';

interface PlannerViewProps {
  viewMode: ViewMode;
  zoomLevel: ZoomLevel;
  focusedMonth: number | null;
  focusedDate: Date | null;
  currentEnergy: EnergyLevel;
  onMonthClick: (month: number) => void;
  onDayClick: (date: Date) => void;
  onWeekClick: (date: Date) => void;
  onZoomOut: () => void;
}

const PlannerView = ({
  viewMode,
  zoomLevel,
  focusedMonth,
  focusedDate,
  currentEnergy,
  onMonthClick,
  onDayClick,
  onWeekClick,
  onZoomOut,
}: PlannerViewProps) => {
  const currentYear = new Date().getFullYear();

  // Day view
  if (zoomLevel === 'day' && focusedDate) {
    return (
      <div className="h-full p-6 lg:p-8">
        <DayView
          date={focusedDate}
          currentEnergy={currentEnergy}
          onBack={onZoomOut}
        />
      </div>
    );
  }

  // Week view
  if (zoomLevel === 'week' && focusedDate) {
    return (
      <div className="h-full p-6 lg:p-8">
        <WeekView
          startDate={focusedDate}
          currentEnergy={currentEnergy}
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
        <MonthDetailView
          month={focusedMonth}
          year={currentYear}
          currentEnergy={currentEnergy}
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
    onMonthClick,
    onZoomOut,
  };

  return (
    <div className="h-full p-6 lg:p-8">
      {viewMode === 'grid' && <YearGridView {...commonProps} />}
      {viewMode === 'circular' && <CircularView {...commonProps} />}
      {viewMode === 'timeline' && <TimelineView {...commonProps} />}
    </div>
  );
};

export default PlannerView;
