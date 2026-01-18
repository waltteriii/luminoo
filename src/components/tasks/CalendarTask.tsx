import { useDraggable } from '@dnd-kit/core';
import { cn } from '@/lib/utils';
import { Task, EnergyLevel } from '@/types';
import { format } from 'date-fns';
import { Pencil } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useState } from 'react';
import EditTaskDialog from '@/components/tasks/EditTaskDialog';

interface CalendarTaskProps {
  task: Task;
  onUpdate: (updates: Partial<Task>) => void;
  onDelete?: () => void;
  isShared?: boolean;
  showTimeRange?: boolean;
  height: number;
}

const energyBorderColors: Record<EnergyLevel, string> = {
  high: 'border-l-energy-high',
  medium: 'border-l-energy-medium',
  low: 'border-l-energy-low',
  recovery: 'border-l-energy-recovery',
};

const energyBgColors: Record<EnergyLevel, string> = {
  high: 'bg-energy-high/15 hover:bg-energy-high/25',
  medium: 'bg-energy-medium/15 hover:bg-energy-medium/25',
  low: 'bg-energy-low/15 hover:bg-energy-low/25',
  recovery: 'bg-energy-recovery/15 hover:bg-energy-recovery/25',
};

const CalendarTask = ({
  task,
  onUpdate,
  onDelete,
  isShared,
  showTimeRange = false,
  height,
}: CalendarTaskProps) => {
  const [editDialogOpen, setEditDialogOpen] = useState(false);

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    isDragging,
  } = useDraggable({
    id: task.id,
    data: { type: 'calendar-task', task },
  });

  const style = transform
    ? {
        transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
        zIndex: isDragging ? 1000 : undefined,
      }
    : undefined;

  // Format time range
  const getTimeRange = () => {
    if (!task.start_time) return '';
    const startFormatted = format(new Date(`2000-01-01T${task.start_time}`), 'h:mm a');
    if (!task.end_time) return startFormatted;
    const endFormatted = format(new Date(`2000-01-01T${task.end_time}`), 'h:mm a');
    return `${startFormatted} - ${endFormatted}`;
  };

  // Determine layout based on height
  const isCompact = height < 40;
  const showDetails = height >= 60;
  const contentPadding = isCompact ? 'py-0.5' : showDetails ? 'py-2' : 'py-1.5';
  const contentJustify = showDetails ? 'justify-start' : 'justify-center';

  return (
    <>
      <div
        ref={setNodeRef}
        style={style}
        {...attributes}
        {...listeners}
        className={cn(
          'group relative h-full rounded-md border-l-2 ring-1 ring-border/40 shadow-sm cursor-grab active:cursor-grabbing transition-[box-shadow,opacity] overflow-hidden',
          'hover:shadow-md',
          energyBorderColors[task.energy_level],
          energyBgColors[task.energy_level],
          isDragging && 'opacity-60 shadow-lg ring-1 ring-highlight',
          task.completed && 'opacity-50'
        )}
      >
        <div
          className={cn(
            'h-full flex flex-col px-2 leading-snug',
            contentJustify,
            contentPadding,
            task.completed && 'line-through'
          )}
        >
          {/* Title */}
          <div
            className={cn(
              'font-medium truncate tracking-tight',
              isCompact ? 'text-[12px]' : 'text-[13px]'
            )}
          >
            {task.title}
          </div>

          {/* Time range - show if enough space */}
          {showDetails && showTimeRange && task.start_time && (
            <div className="mt-1 text-[11px] tabular-nums text-foreground-muted truncate">
              {getTimeRange()}
            </div>
          )}
        </div>

        {/* Edit button - appears on hover */}
        <Button
          variant="ghost"
          size="icon"
          className={cn(
            'absolute top-1 right-1 h-5 w-5 opacity-0 group-hover:opacity-100 transition-opacity',
            'bg-background/80 hover:bg-background'
          )}
          onClick={(e) => {
            e.stopPropagation();
            e.preventDefault();
            setEditDialogOpen(true);
          }}
          onMouseDown={(e) => e.stopPropagation()}
          onPointerDown={(e) => e.stopPropagation()}
        >
          <Pencil className="w-3 h-3" />
        </Button>
      </div>

      <EditTaskDialog
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        task={task}
        onSave={(taskId, updates) => onUpdate(updates)}
        onDelete={onDelete}
      />
    </>
  );
};

export default CalendarTask;
