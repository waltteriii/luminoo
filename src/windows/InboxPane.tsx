import { EnergyLevel } from '@/types';
import UnscheduledTasks from '@/components/planner/UnscheduledTasks';
import WindowFrame from './WindowFrame';

interface InboxPaneProps {
  energyFilter: EnergyLevel[];
  onScheduleTask: (taskId: string, date: Date) => void;
}

export default function InboxPane({ energyFilter, onScheduleTask }: InboxPaneProps) {
  return (
    <WindowFrame title="Inbox" className="h-full">
      <UnscheduledTasks energyFilter={energyFilter} onScheduleTask={onScheduleTask} />
    </WindowFrame>
  );
}

