import { useMemo, useState } from 'react';
import { useDroppable } from '@dnd-kit/core';
import { cn } from '@/lib/utils';
import WindowFrame from './WindowFrame';
import { useTasksContext } from '@/contexts/TasksContext';
import type { Task } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, StickyNote } from 'lucide-react';
import InboxTaskItem from '@/components/tasks/InboxTaskItem';
import { useDndContext } from '@/components/dnd/DndProvider';

export default function NotesPane() {
  const { notesTasks, addNotesTask, updateTask, deleteTask } = useTasksContext();
  const { activeTask } = useDndContext();
  const { setNodeRef, isOver } = useDroppable({ id: 'zone:notes', data: { kind: 'zone', zone: 'notes' } });

  const notes = useMemo(() => notesTasks, [notesTasks]);

  const [title, setTitle] = useState('');

  const handleAdd = async () => {
    const trimmed = title.trim();
    if (!trimmed) return;
    const created = await addNotesTask({
      title: trimmed,
      energy_level: 'medium',
      completed: false,
      detected_from_brain_dump: false,
      due_date: null,
      start_time: null,
      end_time: null,
      end_date: null,
    });
    if (import.meta.env.DEV && created?.id) console.log('[Notes:add]', created.id);
    setTitle('');
  };

  return (
    <WindowFrame title="Notes" className="h-full">
      <div
        ref={setNodeRef}
        className={cn(
          'h-full min-h-0 flex flex-col gap-3 pointer-events-auto relative',
          import.meta.env.DEV && activeTask && 'outline outline-1 outline-blue-500/30',
          isOver && 'rounded-lg ring-1 ring-blue-500/55 shadow-[0_0_0_3px_rgba(59,130,246,0.18)] bg-blue-500/5'
        )}
      >
        {import.meta.env.DEV && activeTask && (
          <div className="pointer-events-none absolute top-2 right-2 text-[10px] text-blue-200/80 bg-blue-500/10 border border-blue-500/30 rounded px-2 py-1">
            droppable: zone:notes
          </div>
        )}
        <div className="flex gap-2 min-w-0">
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Add to Notes…"
            className="h-10 min-w-0"
            onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
          />
          <Button onClick={handleAdd} className="h-10 px-3 flex-shrink-0">
            <Plus className="w-4 h-4 mr-2" />
            Add
          </Button>
        </div>

        <div className="flex-1 min-h-0 overflow-auto space-y-2">
          {notes.length === 0 ? (
            <div className="text-sm text-muted-foreground">
              Drop tasks here to pin them. Drag back out to Inbox or Calendar.
            </div>
          ) : (
            notes.map((t: Task) => (
              <InboxTaskItem
                key={t.id}
                task={t}
                fromZone="notes"
                showSchedulingControls={false}
                badge={
                  <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground border border-border rounded-md px-1.5 py-0.5 flex-shrink-0">
                    <StickyNote className="w-3 h-3" />
                    Note
                  </span>
                }
                onSchedule={() => {
                  // Notes are scheduled via drag-and-drop (keep UI simple).
                }}
                onTitleChange={(taskId, title) => updateTask(taskId, { title })}
                onEnergyChange={(taskId, energy_level) => updateTask(taskId, { energy_level })}
                onDelete={(taskId) => deleteTask(taskId)}
              />
            ))
          )}
        </div>
      </div>
    </WindowFrame>
  );
}

