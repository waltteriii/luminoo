import { ViewMode, ZoomLevel, EnergyLevel } from '@/types';
import YearGridView from './YearGridView';
import CircularView from './CircularView';
import TimelineView from './TimelineView';

interface PlannerViewProps {
  viewMode: ViewMode;
  zoomLevel: ZoomLevel;
  focusedMonth: number | null;
  currentEnergy: EnergyLevel;
  onMonthClick: (month: number) => void;
  onZoomOut: () => void;
}

const PlannerView = ({
  viewMode,
  zoomLevel,
  focusedMonth,
  currentEnergy,
  onMonthClick,
  onZoomOut,
}: PlannerViewProps) => {
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
