import { useMemo, useState } from 'react';
import { useDroppable, useDraggable } from '@dnd-kit/core';
import { cn } from '@/lib/utils';
import WindowFrame from './WindowFrame';
import { useTasksContext } from '@/contexts/TasksContext';
import type { Task } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { GripVertical, Plus, StickyNote } from 'lucide-react';

function NotesTaskRow({ task }: { task: Task }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `notes-${task.id}`,
    data: { type: 'notes-task', task },
  });

  const style = transform
    ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`, zIndex: isDragging ? 1000 : undefined }
    : undefined;

  return (
    <div
      ref={setNodeRef}
      style={style}
      data-dnd-item
      className={cn(
        'group flex items-center gap-2 rounded-lg border border-border bg-card px-2 py-2 min-h-[44px] min-w-0',
        isDragging && 'opacity-70 shadow-lg ring-2 ring-blue-500/60'
      )}
    >
      <div
        {...attributes}
        {...listeners}
        data-task-draggable="true"
        data-task-handle
        onPointerDown={(e) => e.stopPropagation()}
        onMouseDown={(e) => e.stopPropagation()}
        className="flex-shrink-0 p-1 -m-1 rounded touch-none cursor-grab active:cursor-grabbing opacity-50 group-hover:opacity-80 select-none"
        aria-label="Drag"
      >
        <GripVertical className="w-4 h-4 text-foreground-muted" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 min-w-0">
          <div className="text-sm font-medium truncate flex-1">{task.title}</div>
          <div className="flex items-center gap-1 text-[10px] text-muted-foreground border border-border rounded-md px-1.5 py-0.5 flex-shrink-0">
            <StickyNote className="w-3 h-3" />
            Note
          </div>
        </div>
        {task.description && <div className="text-xs text-muted-foreground truncate">{task.description}</div>}
      </div>
    </div>
  );
}

export default function NotesPane() {
  const { tasks, addTask } = useTasksContext();
  const { setNodeRef, isOver } = useDroppable({ id: 'notes', data: { type: 'notes' } });

  const notes = useMemo(() => tasks.filter((t) => t.location === 'notes' && !t.completed), [tasks]);

  const [title, setTitle] = useState('');

  const handleAdd = async () => {
    const trimmed = title.trim();
    if (!trimmed) return;
    await addTask({
      title: trimmed,
      energy_level: 'medium',
      completed: false,
      detected_from_brain_dump: false,
      due_date: null,
      start_time: null,
      end_time: null,
      end_date: null,
      location: 'notes',
    });
    setTitle('');
  };

  return (
    <WindowFrame title="Notes" className="h-full">
      <div
        ref={setNodeRef}
        className={cn(
          'h-full min-h-0 flex flex-col gap-3',
          isOver && 'rounded-lg ring-1 ring-blue-500/55 shadow-[0_0_0_3px_rgba(59,130,246,0.18)] bg-blue-500/5'
        )}
      >
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
            notes.map((t) => <NotesTaskRow key={t.id} task={t} />)
          )}
        </div>
      </div>
    </WindowFrame>
  );
}

