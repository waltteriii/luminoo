import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { cn } from '@/lib/utils';
import { Task, EnergyLevel } from '@/types';
import { GripVertical, Check, MoreHorizontal, Pencil, Trash2, Users, MapPin } from 'lucide-react';
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
import { Input } from '@/components/ui/input';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface DraggableTaskProps {
  task: Task;
  onUpdate: (updates: Partial<Task>) => void;
  onDelete?: () => void;
  isShared?: boolean;
  compact?: boolean;
  enableFullDrag?: boolean; // Allow dragging from entire element
}

const energyColors: Record<EnergyLevel, string> = {
  high: 'border-l-energy-high',
  medium: 'border-l-energy-medium',
  low: 'border-l-energy-low',
  recovery: 'border-l-energy-recovery',
};

const DraggableTask = ({ task, onUpdate, onDelete, isShared, compact, enableFullDrag = false }: DraggableTaskProps) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(task.title);

  const handleDoubleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsEditing(true);
    setEditTitle(task.title);
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
  } = useSortable({ id: task.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const handleToggleComplete = () => {
    onUpdate({ completed: !task.completed });
  };

  const handleSaveEdit = () => {
    if (editTitle.trim()) {
      onUpdate({ title: editTitle.trim() });
    }
    setIsEditing(false);
  };

  const handleEnergyChange = (energy: EnergyLevel) => {
    onUpdate({ energy_level: energy });
  };

  // Props to apply drag to the whole element or just the handle
  const dragProps = enableFullDrag && !isEditing
    ? { ...attributes, ...listeners }
    : {};

  if (compact) {
    return (
      <div
        ref={setNodeRef}
        style={style}
        {...dragProps}
        className={cn(
          "group flex items-center gap-2 p-2 rounded bg-secondary border-l-2",
          energyColors[task.energy_level],
          isDragging && "opacity-50 shadow-lg",
          task.completed && "opacity-60",
          enableFullDrag && !isEditing && "cursor-grab active:cursor-grabbing"
        )}
        onDoubleClick={handleDoubleClick}
      >
        {!enableFullDrag && (
          <button
            {...attributes}
            {...listeners}
            className="opacity-0 group-hover:opacity-100 cursor-grab active:cursor-grabbing"
          >
            <GripVertical className="w-3 h-3 text-foreground-muted" />
          </button>
        )}
        {isEditing ? (
          <Input
            value={editTitle}
            onChange={(e) => setEditTitle(e.target.value)}
            onBlur={handleSaveEdit}
            onKeyDown={handleKeyDown}
            onClick={(e) => e.stopPropagation()}
            autoFocus
            className="h-6 text-xs flex-1"
          />
        ) : (
          <span className={cn("text-xs truncate flex-1", task.completed && "line-through")}>
            {task.title}
          </span>
        )}
        {isShared && <Users className="w-3 h-3 text-primary" />}
      </div>
    );
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "group flex items-center gap-3 p-3 rounded-lg bg-card border border-border transition-all",
        "border-l-4",
        energyColors[task.energy_level],
        isDragging && "opacity-50 shadow-lg ring-2 ring-primary",
        task.completed && "opacity-60"
      )}
    >
      {/* Drag handle */}
      <button
        {...attributes}
        {...listeners}
        className="opacity-0 group-hover:opacity-100 cursor-grab active:cursor-grabbing transition-opacity"
      >
        <GripVertical className="w-4 h-4 text-foreground-muted" />
      </button>

      {/* Checkbox */}
      <button
        onClick={handleToggleComplete}
        className={cn(
          "w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors",
          task.completed
            ? "bg-primary border-primary"
            : "border-foreground-muted hover:border-primary"
        )}
      >
        {task.completed && <Check className="w-3 h-3 text-primary-foreground" />}
      </button>

      {/* Content */}
      <div className="flex-1 min-w-0">
        {isEditing ? (
          <Input
            value={editTitle}
            onChange={(e) => setEditTitle(e.target.value)}
            onBlur={handleSaveEdit}
            onKeyDown={(e) => e.key === 'Enter' && handleSaveEdit()}
            autoFocus
            className="h-7 text-sm"
          />
        ) : (
          <span className={cn("text-sm", task.completed && "line-through")}>
            {task.title}
          </span>
        )}
        {/* Location indicator */}
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

      {/* Shared indicator - show if task is marked as shared */}
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

      {/* Energy pill - clickable to change */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button className="focus:outline-none">
            <EnergyPill energy={task.energy_level} />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {(['high', 'medium', 'low', 'recovery'] as EnergyLevel[]).map(energy => (
            <DropdownMenuItem
              key={energy}
              onClick={() => handleEnergyChange(energy)}
              className="gap-2"
            >
              <EnergyPill energy={energy} />
              <span className="capitalize">{energy === 'high' ? 'High Focus' : energy === 'medium' ? 'Steady' : energy === 'low' ? 'Low Energy' : 'Recovery'}</span>
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
    </div>
  );
};

export default DraggableTask;