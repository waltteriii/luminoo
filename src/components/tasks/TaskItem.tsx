import { useState, useRef, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { EnergyLevel, Task } from '@/types';
import { Checkbox } from '@/components/ui/checkbox';
import EnergyPill from '@/components/shared/EnergyPill';
import { GripVertical } from 'lucide-react';

interface TaskItemProps {
  task: Task;
  onUpdate: (updates: Partial<Task>) => void;
  onDelete?: () => void;
}

const TaskItem = ({ task, onUpdate, onDelete }: TaskItemProps) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(task.title);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const handleDoubleClick = () => {
    setIsEditing(true);
    setEditText(task.title);
  };

  const handleBlur = () => {
    if (editText.trim() && editText !== task.title) {
      onUpdate({ title: editText.trim() });
    } else {
      setEditText(task.title);
    }
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      inputRef.current?.blur();
    } else if (e.key === 'Escape') {
      setEditText(task.title);
      setIsEditing(false);
    }
  };

  const handleEnergyChange = (energy: EnergyLevel) => {
    onUpdate({ energy_level: energy });
  };

  return (
    <div className={cn(
      "group flex items-center gap-3 p-3 rounded-lg",
      "bg-card border border-border hover:border-primary/30",
      "transition-all duration-200",
      task.completed && "opacity-60"
    )}>
      <GripVertical className="w-4 h-4 text-foreground-muted opacity-0 group-hover:opacity-100 cursor-grab" />
      
      <Checkbox
        checked={task.completed}
        onCheckedChange={(checked) => onUpdate({ completed: !!checked })}
        className="flex-shrink-0"
      />

      <div className="flex-1 min-w-0">
        {isEditing ? (
          <input
            ref={inputRef}
            type="text"
            value={editText}
            onChange={(e) => setEditText(e.target.value)}
            onBlur={handleBlur}
            onKeyDown={handleKeyDown}
            className={cn(
              "w-full bg-transparent border-none outline-none",
              "text-sm text-foreground",
              "focus:ring-0"
            )}
          />
        ) : (
          <p
            onDoubleClick={handleDoubleClick}
            className={cn(
              "text-sm text-foreground cursor-text",
              task.completed && "line-through text-foreground-muted"
            )}
          >
            {task.title}
          </p>
        )}
      </div>

      <EnergyPill
        energy={task.energy_level}
        onChange={handleEnergyChange}
        editable
        size="sm"
      />
    </div>
  );
};

export default TaskItem;
