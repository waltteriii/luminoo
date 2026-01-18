import { useDraggable } from '@dnd-kit/core';
import { cn } from '@/lib/utils';
import { Task, EnergyLevel } from '@/types';
import { Users, GripVertical } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Input } from '@/components/ui/input';
import EditTaskDialog from '@/components/tasks/EditTaskDialog';

interface DraggableUntimedTaskProps {
  task: Task;
  onUpdate: (updates: Partial<Task>) => void;
  onDelete?: () => void;
  isShared?: boolean;
  isNew?: boolean; // Flag to trigger glow animation
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

const DraggableUntimedTask = ({ task, onUpdate, onDelete, isShared, isNew }: DraggableUntimedTaskProps) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editTitle, setEditTitle] = useState(task.title);
  const [showGlow, setShowGlow] = useState(isNew);
  const hasAnimated = useRef(false);

  // Distinguish click-to-edit vs drag gesture
  const downPosRef = useRef<{ x: number; y: number } | null>(null);
  const movedRef = useRef(false);

  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `untimed-${task.id}`,
    data: { type: 'inbox-task', task },
    disabled: isEditing || editDialogOpen,
  });

  const dragProps = isEditing || editDialogOpen ? {} : { ...attributes, ...listeners };

  useEffect(() => {
    setEditTitle(task.title);
  }, [task.title]);

  // Trigger glow animation for new tasks
  useEffect(() => {
    if (isNew && !hasAnimated.current) {
      hasAnimated.current = true;
      setShowGlow(true);
      const timer = setTimeout(() => setShowGlow(false), 1500);
      return () => clearTimeout(timer);
    }
  }, [isNew]);

  const handleSaveEdit = () => {
    const trimmed = editTitle.trim();
    if (trimmed && trimmed !== task.title) {
      onUpdate({ title: trimmed });
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
    <>
      <div
        ref={setNodeRef}
        {...dragProps}
        onPointerDownCapture={(e) => {
          if (isEditing || editDialogOpen) return;
          downPosRef.current = { x: e.clientX, y: e.clientY };
          movedRef.current = false;
        }}
        onPointerMoveCapture={(e) => {
          if (!downPosRef.current) return;
          const dx = Math.abs(e.clientX - downPosRef.current.x);
          const dy = Math.abs(e.clientY - downPosRef.current.y);
          if (dx + dy > 8) movedRef.current = true;
        }}
        onClickCapture={(e) => {
          if (!movedRef.current) return;
          // A drag happened: prevent the click from entering edit mode.
          movedRef.current = false;
          downPosRef.current = null;
          e.preventDefault();
          e.stopPropagation();
        }}
        onClick={(e) => {
          e.stopPropagation();
          if (isEditing || editDialogOpen) return;
          setEditTitle(task.title);
          setIsEditing(true);
        }}
        onDoubleClick={(e) => {
          e.stopPropagation();
          e.preventDefault();
          setEditDialogOpen(true);
        }}
        className={cn(
          'group flex items-center gap-2.5 rounded-lg border-l-[3px] shadow-sm min-h-[44px] px-2.5 py-2 outline-none cursor-grab',
          'hover:shadow-md hover:brightness-105 transition-all',
          energyBorderColors[task.energy_level],
          energyBgColors[task.energy_level],
          isDragging && 'opacity-60 shadow-lg ring-2 ring-highlight cursor-grabbing',
          task.completed && 'opacity-60',
          showGlow && 'animate-glow-highlight'
        )}
      >
        {/* Grip icon - indicates untimed task that can be dragged */}
        {!isEditing && (
          <GripVertical className="w-4 h-4 text-foreground-muted/50 group-hover:text-foreground-muted flex-shrink-0 transition-colors" />
        )}

        {isEditing ? (
          <Input
            value={editTitle}
            onChange={(e) => setEditTitle(e.target.value)}
            onBlur={handleSaveEdit}
            onKeyDown={handleKeyDown}
            onClick={(e) => e.stopPropagation()}
            onMouseDown={(e) => e.stopPropagation()}
            onPointerDown={(e) => e.stopPropagation()}
            autoFocus
            className="h-8 text-[13px] flex-1 bg-transparent"
          />
        ) : (
          <span className={cn('text-[13px] font-medium truncate flex-1', task.completed && 'line-through')}>
            {task.title}
          </span>
        )}

        {!isEditing && isShared && <Users className="w-4 h-4 text-primary flex-shrink-0" />}
      </div>

      <EditTaskDialog
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        task={task}
        onSave={(_, updates) => onUpdate(updates)}
        onDelete={onDelete ? () => onDelete() : undefined}
      />
    </>
  );
};

export default DraggableUntimedTask;

