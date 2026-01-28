import { EnergyLevel } from '@/types';
import UnscheduledTasks from '@/components/planner/UnscheduledTasks';
import WindowFrame from './WindowFrame';
import { useDroppable } from '@dnd-kit/core';
import { cn } from '@/lib/utils';
import { useDndContext } from '@/components/dnd/DndProvider';

interface InboxPaneProps {
  energyFilter: EnergyLevel[];
  onScheduleTask: (taskId: string, date: Date) => void;
}

export default function InboxPane({ energyFilter, onScheduleTask }: InboxPaneProps) {
  const { activeTask } = useDndContext();
  const { setNodeRef, isOver } = useDroppable({ id: 'zone:inbox', data: { kind: 'zone', zone: 'inbox' } });
  return (
    <WindowFrame title="Inbox" className="h-full">
      <div
        ref={setNodeRef}
        className={cn(
          'h-full min-h-0 pointer-events-auto relative',
          import.meta.env.DEV && activeTask && 'outline outline-1 outline-blue-500/30',
          isOver && 'rounded-lg ring-1 ring-blue-500/55 shadow-[0_0_0_3px_rgba(59,130,246,0.18)] bg-blue-500/5'
        )}
      >
        {import.meta.env.DEV && activeTask && (
          <div className="pointer-events-none absolute top-2 right-2 text-[10px] text-blue-200/80 bg-blue-500/10 border border-blue-500/30 rounded px-2 py-1">
            droppable: zone:inbox
          </div>
        )}
        <UnscheduledTasks energyFilter={energyFilter} onScheduleTask={onScheduleTask} />
      </div>
    </WindowFrame>
  );
}

