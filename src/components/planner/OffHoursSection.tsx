import { memo, useState, useMemo, useRef, useCallback, useEffect } from 'react';
import { useDraggable, useDroppable } from '@dnd-kit/core';
import { cn } from '@/lib/utils';
import { Task, EnergyLevel } from '@/types';
import { Moon, ChevronDown, ChevronUp, Clock, Copy, Trash2 } from 'lucide-react';
import { parseTimeToHours } from '@/lib/timeUtils';
import { TimeRangeSettings, formatHourLabel } from '@/lib/timeRangeConfig';
import EditTaskDialog from '@/components/tasks/EditTaskDialog';
import { Input } from '@/components/ui/input';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
  ContextMenuSeparator,
} from '@/components/ui/context-menu';

interface OffHoursSectionProps {
  type: 'night-before' | 'night-after';
  tasks: Task[];
  settings: TimeRangeSettings;
  hourHeight: number;
  onTaskClick?: (task: Task) => void;
  onTaskUpdate?: (taskId: string, updates: Partial<Task>) => void;
  onTaskDelete?: (taskId: string) => void;
  onTaskCopy?: (task: Task) => void;
  isExpanded: boolean;
  onToggleExpand: () => void;
  className?: string;
}

const energyColors: Record<EnergyLevel, string> = {
  high: 'bg-energy-high',
  medium: 'bg-energy-medium',
  low: 'bg-energy-low',
  recovery: 'bg-energy-recovery',
};

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

// Night task item - behaves like CalendarTask
interface NightTaskItemProps {
  task: Task;
  onUpdate?: (updates: Partial<Task>) => void;
  onDelete?: () => void;
  onCopy?: () => void;
  isSelected?: boolean;
  onSelect?: () => void;
}

const NightTaskItem = memo(({ task, onUpdate, onDelete, onCopy, isSelected, onSelect }: NightTaskItemProps) => {
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editTitle, setEditTitle] = useState(task.title);
  const titleInputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    isDragging,
  } = useDraggable({
    id: task.id,
    data: { type: 'night-task', task },
    disabled: isEditingTitle,
  });

  const style = transform
    ? {
        transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
        zIndex: isDragging ? 1000 : undefined,
      }
    : undefined;

  // Focus input when editing starts
  useEffect(() => {
    if (isEditingTitle && titleInputRef.current) {
      titleInputRef.current.focus();
      titleInputRef.current.select();
    }
  }, [isEditingTitle]);

  // Sync local title with prop
  useEffect(() => {
    if (!isEditingTitle) {
      setEditTitle(task.title);
    }
  }, [task.title, isEditingTitle]);

  // Handle keyboard shortcuts when selected
  useEffect(() => {
    if (!isSelected) return;

    const handleKeyDown = (ev: KeyboardEvent) => {
      // Skip when editing text
      if (isEditingTitle) return;
      
      // Copy: Ctrl+C or Cmd+C
      if ((ev.ctrlKey || ev.metaKey) && ev.key === 'c' && onCopy) {
        ev.preventDefault();
        onCopy();
      }
      // Delete: Backspace or Delete
      if ((ev.key === 'Backspace' || ev.key === 'Delete') && onDelete) {
        ev.preventDefault();
        onDelete();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isSelected, onCopy, onDelete, isEditingTitle]);

  const handleSaveTitle = useCallback(() => {
    const trimmed = editTitle.trim();
    if (trimmed && trimmed !== task.title) {
      onUpdate?.({ title: trimmed });
    } else {
      setEditTitle(task.title);
    }
    setIsEditingTitle(false);
  }, [editTitle, task.title, onUpdate]);

  const handleTitleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSaveTitle();
    } else if (e.key === 'Escape') {
      setEditTitle(task.title);
      setIsEditingTitle(false);
    }
  }, [handleSaveTitle, task.title]);

  // Handle click on title for inline editing
  const handleTitleClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isEditingTitle) {
      setIsEditingTitle(true);
    }
  }, [isEditingTitle]);

  // Handle double-click to open edit dialog
  const handleDoubleClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    if (!isEditingTitle) {
      setEditDialogOpen(true);
    }
  }, [isEditingTitle]);

  // Handle selection
  const handleClick = useCallback((e: React.MouseEvent) => {
    // Don't select if clicking on title (for inline edit)
    if ((e.target as HTMLElement).closest('.task-title-area')) return;
    e.stopPropagation();
    onSelect?.();
  }, [onSelect]);

  const startHour = parseTimeToHours(task.start_time);
  const endHour = parseTimeToHours(task.end_time);
  const timeStr = startHour !== null
    ? `${formatHourLabel(startHour)}${endHour !== null ? ` – ${formatHourLabel(endHour)}` : ''}`
    : '';

  return (
    <>
      <ContextMenu>
        <ContextMenuTrigger asChild>
          <div
            ref={(node) => {
              setNodeRef(node);
              (containerRef as any).current = node;
            }}
            style={style}
            onClick={handleClick}
            onDoubleClick={handleDoubleClick}
            {...attributes}
            {...listeners}
            className={cn(
              'task-item group relative flex items-stretch gap-0 rounded-md cursor-grab active:cursor-grabbing touch-none',
              'transition-all duration-150',
              'border-l-4 border',
              energyBorderColors[task.energy_level],
              energyBgColors[task.energy_level],
              isDragging && 'opacity-50 shadow-lg ring-2 ring-primary/50 scale-[1.02]',
              isSelected && 'ring-2 ring-primary shadow-md',
              task.completed && 'opacity-60'
            )}
          >
            {/* Main content */}
            <div className="flex-1 min-w-0 py-1.5 px-2">
              {/* Title - click to edit */}
              <div className="task-title-area">
                {isEditingTitle ? (
                  <Input
                    ref={titleInputRef}
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    onBlur={handleSaveTitle}
                    onKeyDown={handleTitleKeyDown}
                    className="h-5 py-0 px-1 text-sm font-medium border-none bg-background/80 focus-visible:ring-1"
                    onClick={(e) => e.stopPropagation()}
                    onPointerDown={(e) => e.stopPropagation()}
                  />
                ) : (
                  <div 
                    className={cn(
                      "text-sm font-medium truncate cursor-text hover:text-primary transition-colors",
                      task.completed && 'line-through'
                    )}
                    onClick={handleTitleClick}
                    onPointerDown={(e) => e.stopPropagation()}
                  >
                    {task.title}
                  </div>
                )}
              </div>
              
              {/* Time display */}
              {timeStr && !isEditingTitle && (
                <div className="flex items-center gap-1 text-[10px] text-foreground-muted mt-0.5">
                  <Clock className="w-2.5 h-2.5" />
                  {timeStr}
                </div>
              )}
            </div>

            {/* Selection indicator */}
            {isSelected && (
              <div className="absolute -right-1 -top-1 w-2.5 h-2.5 rounded-full bg-primary shadow-sm" />
            )}
          </div>
        </ContextMenuTrigger>
        
        <ContextMenuContent>
          <ContextMenuItem onClick={() => setEditDialogOpen(true)}>
            Edit task...
          </ContextMenuItem>
          {onCopy && (
            <ContextMenuItem onClick={onCopy}>
              <Copy className="w-3.5 h-3.5 mr-2" />
              Copy
            </ContextMenuItem>
          )}
          <ContextMenuSeparator />
          {onDelete && (
            <ContextMenuItem onClick={onDelete} className="text-destructive">
              <Trash2 className="w-3.5 h-3.5 mr-2" />
              Delete
            </ContextMenuItem>
          )}
        </ContextMenuContent>
      </ContextMenu>

      {/* Edit Dialog */}
      <EditTaskDialog
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        task={task}
        onSave={(taskId, updates) => {
          onUpdate?.(updates);
          setEditDialogOpen(false);
        }}
        onDelete={onDelete ? () => {
          onDelete();
          setEditDialogOpen(false);
        } : undefined}
      />
    </>
  );
});

NightTaskItem.displayName = 'NightTaskItem';

const OffHoursSection = memo(({
  type,
  tasks,
  settings,
  hourHeight,
  onTaskClick,
  onTaskUpdate,
  onTaskDelete,
  onTaskCopy,
  isExpanded,
  onToggleExpand,
  className,
}: OffHoursSectionProps) => {
  const isNightBefore = type === 'night-before';
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  
  // Droppable zone for the night section
  const { setNodeRef: setDropRef, isOver } = useDroppable({
    id: `night-section-${type}`,
    data: { type: 'night-section', section: type },
  });
  
  // Deselect when clicking outside tasks
  useEffect(() => {
    if (!selectedTaskId) return;
    
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (target.closest('.task-item')) return;
      setSelectedTaskId(null);
    };
    
    window.addEventListener('click', handleClickOutside);
    return () => window.removeEventListener('click', handleClickOutside);
  }, [selectedTaskId]);
  
  const { startHour, endHour, label, hourCount } = useMemo(() => {
    if (isNightBefore) {
      return {
        startHour: 0,
        endHour: settings.focusStartTime,
        label: 'Night',
        hourCount: settings.focusStartTime,
      };
    } else {
      return {
        startHour: settings.focusEndTime,
        endHour: 24,
        label: 'Night',
        hourCount: 24 - settings.focusEndTime,
      };
    }
  }, [isNightBefore, settings.focusStartTime, settings.focusEndTime]);

  const timeRange = `${formatHourLabel(startHour)} – ${formatHourLabel(endHour)}`;

  // Calculate collapsed height (compact representation)
  const collapsedHeight = 48; // Fixed collapsed height
  const expandedHeight = Math.max(hourCount * hourHeight * settings.offHoursDenseScaleFactor, 140);

  const currentHeight = isExpanded ? expandedHeight : collapsedHeight;

  if (hourCount === 0) return null;

  return (
    <div
      ref={setDropRef}
      className={cn(
        'relative transition-all duration-300 ease-out overflow-hidden',
        'border-b border-border/50 bg-background/50',
        isNightBefore ? 'rounded-t-lg' : 'rounded-b-lg',
        isOver && 'ring-2 ring-primary/50 bg-primary/5',
        className
      )}
      style={{ height: currentHeight }}
    >
      {/* Drop indicator overlay */}
      {isOver && (
        <div className="absolute inset-0 pointer-events-none bg-primary/10 border-2 border-dashed border-primary/40 rounded-lg z-10" />
      )}

      {/* Collapsed View */}
      {!isExpanded && (
        <button
          onClick={onToggleExpand}
          className={cn(
            'w-full h-full flex items-center px-3 gap-3',
            'hover:bg-secondary/50 transition-colors',
            'text-left'
          )}
        >
          {/* Icon */}
          <div className="flex items-center gap-2 text-foreground-muted">
            <Moon className="w-4 h-4" />
            <span className="text-sm font-medium">{label}</span>
          </div>

          {/* Time range */}
          <span className="text-xs text-foreground-muted">
            {timeRange}
          </span>

          {/* Task count and mini previews */}
          {tasks.length > 0 && (
            <div className="flex items-center gap-2 ml-auto">
              <div className="flex items-center gap-1">
                {tasks.slice(0, 5).map(task => (
                  <div
                    key={task.id}
                    className={cn(
                      'w-2 h-2 rounded-full',
                      energyColors[task.energy_level]
                    )}
                    title={task.title}
                  />
                ))}
                {tasks.length > 5 && (
                  <span className="text-[10px] text-foreground-muted">
                    +{tasks.length - 5}
                  </span>
                )}
              </div>
              <span className="text-xs text-foreground-muted">
                {tasks.length} task{tasks.length !== 1 ? 's' : ''}
              </span>
            </div>
          )}

          <ChevronDown className="w-4 h-4 text-foreground-muted ml-2" />
        </button>
      )}

      {/* Expanded View */}
      {isExpanded && (
        <div className="h-full flex flex-col">
          {/* Header */}
          <button
            onClick={onToggleExpand}
            className={cn(
              'flex items-center justify-between px-3 py-2',
              'hover:bg-secondary/50 transition-colors',
              'border-b border-border/30'
            )}
          >
            <div className="flex items-center gap-2 text-foreground-muted">
              <Moon className="w-4 h-4" />
              <span className="text-sm font-medium">{label}</span>
              <span className="text-xs">({timeRange})</span>
            </div>
            <ChevronUp className="w-4 h-4 text-foreground-muted" />
          </button>

          {/* Task list - with full interaction support */}
          <div className="flex-1 overflow-y-auto px-3 py-2 space-y-1.5">
            {tasks.length === 0 ? (
              <div className="text-xs text-foreground-muted text-center py-4">
                {isOver ? (
                  <span className="text-primary font-medium">Drop task here</span>
                ) : (
                  'No tasks in this time range'
                )}
              </div>
            ) : (
              tasks.map(task => (
                <NightTaskItem
                  key={task.id}
                  task={task}
                  onUpdate={(updates) => onTaskUpdate?.(task.id, updates)}
                  onDelete={() => onTaskDelete?.(task.id)}
                  onCopy={() => onTaskCopy?.(task)}
                  isSelected={selectedTaskId === task.id}
                  onSelect={() => setSelectedTaskId(task.id)}
                />
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
});

OffHoursSection.displayName = 'OffHoursSection';

export default OffHoursSection;
