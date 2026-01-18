import { useDraggable } from '@dnd-kit/core';
import { cn } from '@/lib/utils';
import { Task, EnergyLevel } from '@/types';
import { Users } from 'lucide-react';
import { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';

interface DraggableUntimedTaskProps {
  task: Task;
  onUpdate: (updates: Partial<Task>) => void;
  onDelete?: () => void;
  isShared?: boolean;
}

const energyColors: Record<EnergyLevel, string> = {
  high: 'border-l-energy-high',
  medium: 'border-l-energy-medium',
  low: 'border-l-energy-low',
  recovery: 'border-l-energy-recovery',
};

const DraggableUntimedTask = ({ task, onUpdate, onDelete, isShared }: DraggableUntimedTaskProps) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(task.title);

  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `untimed-${task.id}`,
    data: { type: 'inbox-task', task },
  });

  useEffect(() => {
    setEditTitle(task.title);
  }, [task.title]);

  const handleDoubleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsEditing(true);
    setEditTitle(task.title);
  };

  const handleSaveEdit = () => {
    if (editTitle.trim() && editTitle !== task.title) {
      onUpdate({ title: editTitle.trim() });
    }
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSaveEdit();
    } else if (e.key === 'Escape') {
      setEditTitle(task.title);
      setIsEditing(false);
    }
  };

  return (
    <div
      ref={setNodeRef}
      {...(isEditing ? {} : { ...attributes, ...listeners })}
      className={cn(
        "group flex items-center gap-3 p-4 rounded-xl bg-secondary border-l-[4px] shadow-sm min-h-[56px]",
        energyColors[task.energy_level],
        isDragging && "opacity-50 shadow-lg ring-2 ring-highlight",
        task.completed && "opacity-60",
        !isEditing && "cursor-grab active:cursor-grabbing hover:shadow-md hover:bg-secondary/80 transition-all"
      )}
      onDoubleClick={handleDoubleClick}
    >
      {isEditing ? (
        <Input
          value={editTitle}
          onChange={(e) => setEditTitle(e.target.value)}
          onBlur={handleSaveEdit}
          onKeyDown={handleKeyDown}
          onClick={(e) => e.stopPropagation()}
          autoFocus
          className="h-8 text-sm flex-1"
        />
      ) : (
        <span className={cn("text-sm font-medium truncate flex-1", task.completed && "line-through")}>
          {task.title}
        </span>
      )}
      {isShared && <Users className="w-4 h-4 text-primary flex-shrink-0" />}
    </div>
  );
};

export default DraggableUntimedTask;
