import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { cn } from '@/lib/utils';
import { Task, EnergyLevel } from '@/types';
import { Check, MoreHorizontal, Pencil, Trash2, Users, MapPin, Clock } from 'lucide-react';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import EnergyPill from '@/components/shared/EnergyPill';
import { useState } from 'react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import EditTaskDialog from '@/components/tasks/EditTaskDialog';

interface DraggableTaskProps {
  task: Task;
  onUpdate: (updates: Partial<Task>) => void;
  onDelete?: () => void;
  isShared?: boolean;
  compact?: boolean;
  enableFullDrag?: boolean;
  showDetailsButton?: boolean;
  enableInlineTitleEdit?: boolean;
  disableDoubleClickEdit?: boolean;
  showTime?: boolean;
  dndData?: Record<string, unknown>;
}

const energyColors: Record<EnergyLevel, string> = {
  high: 'border-l-energy-high',
  medium: 'border-l-energy-medium',
  low: 'border-l-energy-low',
  recovery: 'border-l-energy-recovery',
};

const DraggableTask = ({
  task,
  onUpdate,
  onDelete,
  isShared,
  compact,
  enableFullDrag = false,
  showDetailsButton = false,
  enableInlineTitleEdit = false,
  disableDoubleClickEdit = false,
  showTime = false,
  dndData,
}: DraggableTaskProps) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(task.title);
  const [editDialogOpen, setEditDialogOpen] = useState(false);

  // Format time for display
  const formatTime = (time: string | null | undefined) => {
    if (!time) return null;
    try {
      const normalized = time.length === 5 ? time : time.slice(0, 5);
      return format(new Date(`2000-01-01T${normalized}`), 'h:mm a');
    } catch {
      return null;
    }
  };

  const handleDoubleClick = (e: React.MouseEvent) => {
    if (disableDoubleClickEdit) return;
    e.stopPropagation();
    e.preventDefault();
    setEditDialogOpen(true);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSaveEdit();
    } else if (e.key === 'Escape') {
      setEditTitle(task.title);
      setIsEditing(false);
    }
  };

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: task.id,
    data: { type: 'calendar-task', task, ...(dndData || {}) },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const handleToggleComplete = () => {
    onUpdate({ completed: !task.completed });
  };

  const handleSaveEdit = () => {
    const trimmed = editTitle.trim();
    if (trimmed) {
      onUpdate({ title: trimmed });
    }
    setIsEditing(false);
  };

  const handleEnergyChange = (energy: EnergyLevel) => {
    onUpdate({ energy_level: energy });
  };

  // Always make full card draggable in compact mode (week view)
  const dragProps = (enableFullDrag || compact) && !isEditing ? { ...attributes, ...listeners } : {};

  if (compact) {
    return (
      <div
        ref={setNodeRef}
        style={style}
        {...dragProps}
        className={cn(
          'group flex items-center gap-2 pl-2.5 pr-1.5 py-1.5 rounded-lg text-xs bg-secondary/50 hover:bg-secondary border-l-2 transition-colors',
          energyColors[task.energy_level],
          isDragging && 'opacity-50 shadow-lg',
          task.completed && 'opacity-60',
          !isEditing && 'cursor-grab active:cursor-grabbing'
        )}
        onDoubleClick={handleDoubleClick}
      >

        <div className="flex-1 min-w-0 flex flex-col">
          {isEditing ? (
            <input
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              onBlur={handleSaveEdit}
              onKeyDown={handleKeyDown}
              onClick={(e) => e.stopPropagation()}
              autoFocus
              className="h-6 text-xs flex-1 bg-transparent border-none outline-none p-0 text-foreground"
            />
          ) : (
            <span
              className={cn('text-xs truncate', task.completed && 'line-through')}
              onDoubleClick={
                enableInlineTitleEdit
                  ? (e) => {
                    e.stopPropagation();
                    e.preventDefault();
                    setEditTitle(task.title);
                    setIsEditing(true);
                  }
                  : undefined
              }
            >
              {task.title}
            </span>
          )}

          {/* Show time if enabled and task has time */}
          {showTime && task.start_time && (
            <div className="flex items-center gap-1 text-[10px] text-foreground-muted leading-tight mt-0.5">
              <Clock className="w-2.5 h-2.5 flex-shrink-0" />
              <span className="tabular-nums truncate">
                {formatTime(task.start_time)}
                {task.end_time && ` - ${formatTime(task.end_time)}`}
              </span>
            </div>
          )}
        </div>

        {showDetailsButton && (
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 opacity-0 group-hover:opacity-100"
            onClick={(e) => {
              e.stopPropagation();
              e.preventDefault();
              setEditDialogOpen(true);
            }}
            onMouseDown={(e) => {
              // Prevent DayView drag-to-create from starting
              e.preventDefault();
              e.stopPropagation();
            }}
            onPointerDown={(e) => {
              // Extra safety for PointerEvents
              e.preventDefault();
              e.stopPropagation();
            }}
            title="Edit task details"
          >
            <Pencil className="w-3 h-3" />
          </Button>
        )}

        {isShared && <Users className="w-3 h-3 text-primary" />}

        <EditTaskDialog
          open={editDialogOpen}
          onOpenChange={setEditDialogOpen}
          task={task}
          onSave={(taskId, updates) => onUpdate(updates)}
          onDelete={onDelete ? () => onDelete() : undefined}
        />
      </div>
    );
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        'group flex items-center gap-3 p-3 rounded-lg bg-card border border-border transition-all',
        'border-l-4',
        energyColors[task.energy_level],
        isDragging && 'opacity-50 shadow-lg ring-2 ring-primary',
        task.completed && 'opacity-60'
      )}
    >
      {/* Checkbox */}
      <button
        onClick={handleToggleComplete}
        className={cn(
          'w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors',
          task.completed ? 'bg-primary border-primary' : 'border-foreground-muted hover:border-primary'
        )}
      >
        {task.completed && <Check className="w-3 h-3 text-primary-foreground" />}
      </button>

      {/* Content */}
      <div className="flex-1 min-w-0">
        {isEditing ? (
          <input
            value={editTitle}
            onChange={(e) => setEditTitle(e.target.value)}
            onBlur={handleSaveEdit}
            onKeyDown={(e) => e.key === 'Enter' && handleSaveEdit()}
            autoFocus
            className="h-7 text-sm w-full bg-transparent border-none outline-none p-0 text-foreground"
          />
        ) : (
          <span className={cn('text-sm', task.completed && 'line-through')}>{task.title}</span>
        )}
        {task.location && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="text-2xs text-foreground-muted flex items-center gap-0.5">
                  <MapPin className="w-3 h-3" />
                  {task.location}
                </span>
              </TooltipTrigger>
              <TooltipContent>
                <p>Location: {task.location}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
      </div>

      {/* Shared indicator */}
      {(isShared || task.is_shared) && (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="flex items-center gap-1 text-primary">
                <Users className="w-4 h-4" />
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <p>{isShared ? 'Shared with you' : 'You are sharing this task'}</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )}

      {/* Energy pill */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button className="focus:outline-none">
            <EnergyPill energy={task.energy_level} />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {(['high', 'medium', 'low', 'recovery'] as EnergyLevel[]).map((energy) => (
            <DropdownMenuItem key={energy} onClick={() => handleEnergyChange(energy)} className="gap-2">
              <EnergyPill energy={energy} />
              <span className="capitalize">
                {energy === 'high'
                  ? 'High Focus'
                  : energy === 'medium'
                    ? 'Steady'
                    : energy === 'low'
                      ? 'Low Energy'
                      : 'Recovery'}
              </span>
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Actions menu */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="w-7 h-7 opacity-0 group-hover:opacity-100">
            <MoreHorizontal className="w-4 h-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => setIsEditing(true)}>
            <Pencil className="w-4 h-4 mr-2" />
            Edit
          </DropdownMenuItem>
          {onDelete && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={onDelete} className="text-destructive">
                <Trash2 className="w-4 h-4 mr-2" />
                Delete
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Edit Task Dialog */}
      <EditTaskDialog
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        task={task}
        onSave={(taskId, updates) => onUpdate(updates)}
        onDelete={onDelete ? () => onDelete() : undefined}
      />
    </div>
  );
};

export default DraggableTask;
