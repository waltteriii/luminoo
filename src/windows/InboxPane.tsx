import { EnergyLevel } from '@/types';
import UnscheduledTasks from '@/components/planner/UnscheduledTasks';
import WindowFrame from './WindowFrame';
import { useDroppable } from '@dnd-kit/core';
import { cn } from '@/lib/utils';

interface InboxPaneProps {
  energyFilter: EnergyLevel[];
  onScheduleTask: (taskId: string, date: Date) => void;
}

export default function InboxPane({ energyFilter, onScheduleTask }: InboxPaneProps) {
  const { setNodeRef, isOver } = useDroppable({ id: 'inbox', data: { type: 'inbox' } });
  return (
    <WindowFrame title="Inbox" className="h-full">
      <div
        ref={setNodeRef}
        className={cn(
          'h-full min-h-0',
          isOver && 'rounded-lg ring-1 ring-blue-500/55 shadow-[0_0_0_3px_rgba(59,130,246,0.18)] bg-blue-500/5'
        )}
      >
        <UnscheduledTasks energyFilter={energyFilter} onScheduleTask={onScheduleTask} />
      </div>
    </WindowFrame>
  );
}

