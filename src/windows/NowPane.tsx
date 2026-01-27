import { useMemo } from 'react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import WindowFrame from './WindowFrame';
import { useTasksContext } from '@/contexts/TasksContext';
import type { Task } from '@/types';
import { CalendarCheck, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';

function NowTaskRow({ task }: { task: Task }) {
  return (
    <div
      className={cn(
        'flex items-center gap-2 rounded-lg border border-border bg-card/60 px-2 py-2 min-h-[44px] min-w-0',
      )}
    >
      <div className="flex-shrink-0 w-6 h-6 rounded-md bg-secondary/60 flex items-center justify-center">
        <CalendarCheck className="w-4 h-4 text-highlight" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-sm font-medium truncate">{task.title}</div>
        <div className="text-xs text-muted-foreground truncate">
          {task.start_time ? task.start_time.slice(0, 5) : 'Untimed'}
        </div>
      </div>
    </div>
  );
}

function Section({ title, tasks }: { title: string; tasks: Task[] }) {
  return (
    <div className="rounded-lg border border-border bg-background/30 p-3 min-w-0">
      <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">{title}</div>
      <div className="space-y-2">
        {tasks.length === 0 ? (
          <div className="text-sm text-muted-foreground">No tasks</div>
        ) : (
          tasks.map((t) => <NowTaskRow key={t.id} task={t} />)
        )}
      </div>
    </div>
  );
}

export default function NowPane() {
  const { tasks, addTask } = useTasksContext();
  const todayStr = format(new Date(), 'yyyy-MM-dd');

  const relevant = useMemo(() => tasks.filter((t) => !t.completed && t.location !== 'notes' && t.location !== 'memory'), [tasks]);

  const scheduledToday = useMemo(() => relevant.filter((t) => t.due_date === todayStr && !!t.start_time), [relevant, todayStr]);
  const todayUntimed = useMemo(() => relevant.filter((t) => t.due_date === todayStr && !t.start_time), [relevant, todayStr]);
  const overdue = useMemo(() => relevant.filter((t) => t.due_date && t.due_date < todayStr), [relevant, todayStr]);

  const isEmpty = scheduledToday.length === 0 && todayUntimed.length === 0;

  return (
    <WindowFrame title="Now" className="h-full">
      <div className="h-full min-h-0 flex flex-col gap-3">
        <Section title="Scheduled Today" tasks={scheduledToday} />
        <Section title="Today (Untimed)" tasks={todayUntimed} />
        {overdue.length > 0 && <Section title="Overdue" tasks={overdue} />}

        {isEmpty && (
          <div className="mt-2 flex flex-col gap-2">
            <div className="text-sm text-muted-foreground">
              Nothing scheduled for today yet.
            </div>
            <Button
              variant="outline"
              className="h-10 justify-start"
              type="button"
              onClick={() =>
                addTask({
                  title: 'New task',
                  energy_level: 'medium',
                  completed: false,
                  detected_from_brain_dump: false,
                  due_date: todayStr,
                  start_time: null,
                  end_time: null,
                  end_date: null,
                  location: null,
                })
              }
            >
              <Plus className="w-4 h-4 mr-2" />
              Add a task for today
            </Button>
          </div>
        )}
      </div>
    </WindowFrame>
  );
}

