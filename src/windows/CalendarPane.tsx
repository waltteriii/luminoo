import PlannerView from '@/components/planner/PlannerView';
import { EnergyLevel, ViewMode, ZoomLevel } from '@/types';
import WindowFrame from './WindowFrame';
import { useDroppable } from '@dnd-kit/core';
import { cn } from '@/lib/utils';

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
  const { setNodeRef, isOver } = useDroppable({
    id: 'calendar',
    data: { type: 'calendar', date: props.focusedDate ?? new Date() },
  });
  return (
    <WindowFrame title="Calendar" className="h-full">
      <div
        ref={setNodeRef}
        className={cn(isOver && 'rounded-lg ring-1 ring-blue-500/55 shadow-[0_0_0_3px_rgba(59,130,246,0.18)] bg-blue-500/5')}
      >
        <PlannerView {...props} />
      </div>
    </WindowFrame>
  );
}

