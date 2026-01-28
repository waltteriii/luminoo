import PlannerView from '@/components/planner/PlannerView';
import { EnergyLevel, ViewMode, ZoomLevel } from '@/types';
import WindowFrame from './WindowFrame';
import { useDroppable } from '@dnd-kit/core';
import { cn } from '@/lib/utils';
import { useDndContext } from '@/components/dnd/DndProvider';

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
  const { activeTask } = useDndContext();
  const { setNodeRef, isOver } = useDroppable({
    id: 'zone:calendar',
    data: { kind: 'zone', zone: 'calendar', date: props.focusedDate ?? new Date() },
  });
  return (
    <WindowFrame title="Calendar" className="h-full">
      <div
        ref={setNodeRef}
        className={cn(
          'pointer-events-auto relative',
          import.meta.env.DEV && activeTask && 'outline outline-1 outline-blue-500/30',
          isOver && 'rounded-lg ring-1 ring-blue-500/55 shadow-[0_0_0_3px_rgba(59,130,246,0.18)] bg-blue-500/5'
        )}
      >
        {import.meta.env.DEV && activeTask && (
          <div className="pointer-events-none absolute top-2 right-2 z-50 text-[10px] text-blue-200/80 bg-blue-500/10 border border-blue-500/30 rounded px-2 py-1">
            droppable: zone:calendar
          </div>
        )}
        <PlannerView {...props} />
      </div>
    </WindowFrame>
  );
}

