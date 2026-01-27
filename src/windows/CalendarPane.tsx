import PlannerView from '@/components/planner/PlannerView';
import { EnergyLevel, ViewMode, ZoomLevel } from '@/types';
import WindowFrame from './WindowFrame';

interface CalendarPaneProps {
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

export default function CalendarPane(props: CalendarPaneProps) {
  return (
    <WindowFrame title="Calendar" className="h-full">
      <PlannerView {...props} />
    </WindowFrame>
  );
}

