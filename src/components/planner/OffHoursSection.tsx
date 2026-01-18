import { memo, useState, useMemo, useRef, useCallback, useEffect } from 'react';
import { useDraggable, useDroppable } from '@dnd-kit/core';
import { cn } from '@/lib/utils';
import { Task, EnergyLevel } from '@/types';
import { Moon, ChevronDown, ChevronUp, Clock, GripVertical } from 'lucide-react';
import { parseTimeToHours } from '@/lib/timeUtils';
import { TimeRangeSettings, formatHourLabel } from '@/lib/timeRangeConfig';
import EditTaskDialog from '@/components/tasks/EditTaskDialog';
import { Input } from '@/components/ui/input';

interface OffHoursSectionProps {
  type: 'night-before' | 'night-after';
  tasks: Task[];
  settings: TimeRangeSettings;
  hourHeight: number;
  onTaskClick?: (task: Task) => void;
  onTaskUpdate?: (taskId: string, updates: Partial<Task>) => void;
  onTaskDelete?: (taskId: string) => void;
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

// Draggable task item for night sections
interface DraggableNightTaskProps {
  task: Task;
  onUpdate?: (updates: Partial<Task>) => void;
  onDelete?: () => void;
}

const DraggableNightTask = memo(({ task, onUpdate, onDelete }: DraggableNightTaskProps) => {
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editTitle, setEditTitle] = useState(task.title);
  const titleInputRef = useRef<HTMLInputElement>(null);
  const clickTimeout = useRef<NodeJS.Timeout | null>(null);
  const clickCount = useRef(0);

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

  // Handle click: single = edit title, double = open dialog
  const handleClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    clickCount.current += 1;

    if (clickCount.current === 1) {
      clickTimeout.current = setTimeout(() => {
        // Single click - start inline editing
        if (clickCount.current === 1) {
          setIsEditingTitle(true);
        }
        clickCount.current = 0;
      }, 250);
    } else if (clickCount.current === 2) {
      // Double click - open dialog
      if (clickTimeout.current) {
        clearTimeout(clickTimeout.current);
      }
      clickCount.current = 0;
      setEditDialogOpen(true);
    }
  }, []);

  const startHour = parseTimeToHours(task.start_time);
  const endHour = parseTimeToHours(task.end_time);
  const timeStr = startHour !== null
    ? `${formatHourLabel(startHour)}${endHour !== null ? ` – ${formatHourLabel(endHour)}` : ''}`
    : '';

  return (
    <>
      <div
        ref={setNodeRef}
        style={style}
        className={cn(
          'group flex items-center gap-2 px-2 py-1.5 rounded-md',
          'bg-secondary/60 hover:bg-secondary/80 transition-colors text-left',
          'border-l-4 border border-border/50',
          energyBorderColors[task.energy_level],
          isDragging && 'opacity-50 shadow-lg ring-2 ring-primary/50'
        )}
      >
        {/* Drag handle */}
        <div
          {...attributes}
          {...listeners}
          className="cursor-grab active:cursor-grabbing touch-none flex-shrink-0 opacity-50 group-hover:opacity-100 transition-opacity"
        >
          <GripVertical className="w-3.5 h-3.5 text-foreground-muted" />
        </div>

        {/* Energy indicator */}
        <div
          className={cn(
            'w-2 h-full min-h-[20px] rounded-full shrink-0',
            energyColors[task.energy_level]
          )}
        />

        {/* Content - click to edit */}
        <div 
          className="flex-1 min-w-0 cursor-text"
          onClick={handleClick}
        >
          {isEditingTitle ? (
            <Input
              ref={titleInputRef}
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              onBlur={handleSaveTitle}
              onKeyDown={handleTitleKeyDown}
              className="h-6 py-0 px-1 text-sm font-medium border-none bg-background focus-visible:ring-1"
              onClick={(e) => e.stopPropagation()}
            />
          ) : (
            <div className="text-sm font-medium truncate hover:text-primary transition-colors">
              {task.title}
            </div>
          )}
          {timeStr && !isEditingTitle && (
            <div className="flex items-center gap-1 text-[10px] text-foreground-muted">
              <Clock className="w-2.5 h-2.5" />
              {timeStr}
            </div>
          )}
        </div>
      </div>

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

DraggableNightTask.displayName = 'DraggableNightTask';

const OffHoursSection = memo(({
  type,
  tasks,
  settings,
  hourHeight,
  onTaskClick,
  onTaskUpdate,
  onTaskDelete,
  isExpanded,
  onToggleExpand,
  className,
}: OffHoursSectionProps) => {
  const isNightBefore = type === 'night-before';
  
  // Droppable zone for the night section
  const { setNodeRef: setDropRef, isOver } = useDroppable({
    id: `night-section-${type}`,
    data: { type: 'night-section', section: type },
  });
  
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
  const expandedHeight = Math.max(hourCount * hourHeight * settings.offHoursDenseScaleFactor, 120);

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

          {/* Task list in dense mode - with draggable items */}
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
                <DraggableNightTask
                  key={task.id}
                  task={task}
                  onUpdate={(updates) => onTaskUpdate?.(task.id, updates)}
                  onDelete={() => onTaskDelete?.(task.id)}
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
