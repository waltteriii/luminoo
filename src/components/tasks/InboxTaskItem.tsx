import { useDraggable } from '@dnd-kit/core';
import { cn } from '@/lib/utils';
import { Task, EnergyLevel } from '@/types';
import { GripVertical, Calendar, Clock, Users, Check, X, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Calendar as CalendarPicker } from '@/components/ui/calendar';
import { format, addDays } from 'date-fns';
import { useState, useRef, useEffect, useCallback, memo } from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useIsMobile } from '@/hooks/use-mobile';

interface InboxTaskItemProps {
  task: Task;
  onSchedule: (taskId: string, date: string, startTime?: string, endTime?: string) => void;
  onEnergyChange?: (taskId: string, energy: EnergyLevel) => void;
  onTitleChange?: (taskId: string, title: string) => void;
  onDelete?: (taskId: string) => void;
}

const TIME_OPTIONS = Array.from({ length: 32 }, (_, i) => {
  const hour = Math.floor(i / 2) + 6;
  const minute = (i % 2) * 30;
  return `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
});
const InboxTaskItem = memo(({ task, onSchedule, onEnergyChange, onTitleChange, onDelete }: InboxTaskItemProps) => {
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>();
  const [selectedStartTime, setSelectedStartTime] = useState<string>('');
  const [selectedEndTime, setSelectedEndTime] = useState<string>('');
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(task.title);
  const inputRef = useRef<HTMLInputElement>(null);
  const isMobile = useIsMobile();

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    isDragging,
  } = useDraggable({
    id: `inbox-${task.id}`,
    data: { task, type: 'inbox-task' },
  });

  const style = transform
    ? {
        transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
        zIndex: isDragging ? 1000 : undefined,
      }
    : undefined;

  const [clickPosition, setClickPosition] = useState<number | null>(null);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      if (clickPosition !== null) {
        inputRef.current.setSelectionRange(clickPosition, clickPosition);
        setClickPosition(null);
      }
    }
  }, [isEditing, clickPosition]);

  const handleDoubleClick = useCallback((e: React.MouseEvent<HTMLSpanElement>) => {
    e.stopPropagation();
    
    const target = e.currentTarget;
    const text = task.title;
    const rect = target.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const charWidth = rect.width / text.length;
    const approxPosition = Math.round(clickX / charWidth);
    const clampedPosition = Math.max(0, Math.min(text.length, approxPosition));
    
    setEditTitle(task.title);
    setClickPosition(clampedPosition);
    setIsEditing(true);
  }, [task.title]);

  const handleSaveTitle = useCallback(() => {
    const trimmed = editTitle.trim();
    if (trimmed && trimmed !== task.title && onTitleChange) {
      onTitleChange(task.id, trimmed);
    }
    setIsEditing(false);
  }, [editTitle, task.id, task.title, onTitleChange]);

  const handleCancelEdit = useCallback(() => {
    setEditTitle(task.title);
    setIsEditing(false);
  }, [task.title]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSaveTitle();
    } else if (e.key === 'Escape') {
      handleCancelEdit();
    }
  }, [handleSaveTitle, handleCancelEdit]);

  const handleQuickSchedule = useCallback((daysFromNow: number) => {
    const date = addDays(new Date(), daysFromNow);
    onSchedule(task.id, format(date, 'yyyy-MM-dd'));
  }, [task.id, onSchedule]);

  const handleDateSelect = useCallback((date: Date | undefined) => {
    setSelectedDate(date);
  }, []);

  const handleConfirmSchedule = useCallback(() => {
    if (selectedDate) {
      onSchedule(
        task.id,
        format(selectedDate, 'yyyy-MM-dd'),
        selectedStartTime || undefined,
        selectedEndTime || undefined
      );
      setIsDatePickerOpen(false);
      setSelectedDate(undefined);
      setSelectedStartTime('');
      setSelectedEndTime('');
    }
  }, [selectedDate, selectedStartTime, selectedEndTime, task.id, onSchedule]);

  // Always use grip handle for drag - on mobile and desktop
  // When editing, disable drag to allow text selection
  const dragHandleProps = isEditing ? {} : { ...attributes, ...listeners };
  const containerDragProps = {}; // Don't make entire container draggable, only grip handle

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...containerDragProps}
      className={cn(
        "group flex items-center gap-1.5 lg:gap-2 p-1.5 lg:p-2 rounded bg-card border border-border transition-all",
        isMobile ? "touch-auto" : "touch-none",
        isDragging && "opacity-70 shadow-lg ring-2 ring-primary",
        !isDragging && !isMobile && "cursor-grab active:cursor-grabbing"
      )}
    >
      {/* Grip handle for dragging */}
      <div 
        {...dragHandleProps}
        className={cn(
          "flex-shrink-0 p-1.5 -m-1 rounded touch-none cursor-grab active:cursor-grabbing",
          isMobile ? "opacity-100" : "opacity-40 group-hover:opacity-70 transition-opacity"
        )}
      >
        <GripVertical className="w-4 h-4 text-foreground-muted" />
      </div>

      {/* Task title and energy */}
      <div className="flex-1 min-w-0 flex items-center gap-2">
        {isEditing ? (
          <div className="flex-1 flex items-center gap-1">
            <input
              ref={inputRef}
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              onKeyDown={handleKeyDown}
              onBlur={handleSaveTitle}
              className="flex-1 bg-transparent border-none outline-none text-sm text-foreground focus:ring-0 focus:outline-none p-0 selection:bg-highlight/30"
              onClick={(e) => e.stopPropagation()}
            />
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0"
              onClick={(e) => {
                e.stopPropagation();
                handleSaveTitle();
              }}
            >
              <Check className="w-4 h-4 text-primary" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0"
              onClick={(e) => {
                e.stopPropagation();
                handleCancelEdit();
              }}
            >
              <X className="w-4 h-4 text-foreground-muted" />
            </Button>
          </div>
        ) : (
          <span
            className="text-xs lg:text-sm truncate cursor-text"
            onDoubleClick={handleDoubleClick}
            title="Double-click to edit"
          >
            {task.title}
          </span>
        )}

        {/* Energy dot - single click cycles through states */}
        {!isEditing && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              const energyOrder: EnergyLevel[] = ['high', 'medium', 'low', 'recovery'];
              const currentIndex = energyOrder.indexOf(task.energy_level);
              const nextIndex = (currentIndex + 1) % energyOrder.length;
              onEnergyChange?.(task.id, energyOrder[nextIndex]);
            }}
            className="cursor-pointer hover:scale-110 min-w-[32px] min-h-[32px] flex items-center justify-center transition-transform"
            title={`Energy: ${task.energy_level.charAt(0).toUpperCase() + task.energy_level.slice(1)} (click to change)`}
          >
            <span
              className={cn(
                "w-3 h-3 rounded-full transition-colors",
                task.energy_level === 'high' && "bg-energy-high",
                task.energy_level === 'medium' && "bg-energy-medium",
                task.energy_level === 'low' && "bg-energy-low",
                task.energy_level === 'recovery' && "bg-energy-recovery"
              )}
            />
          </button>
        )}

        {task.is_shared && <Users className="w-3 h-3 text-primary flex-shrink-0" />}
      </div>

      {/* Action buttons - always visible on mobile */}
      {!isEditing && (
        <div
          className={cn(
            "flex items-center gap-1 transition-opacity",
            isMobile ? "opacity-100" : "opacity-0 group-hover:opacity-100"
          )}
          onClick={(e) => e.stopPropagation()}
          onPointerDown={(e) => e.stopPropagation()}
        >
          <Button
            variant="ghost"
            size="sm"
            className="h-7 lg:h-8 px-1.5 lg:px-2 text-xs min-w-[36px] lg:min-w-[44px]"
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => {
              e.stopPropagation();
              handleQuickSchedule(0);
            }}
          >
            Today
          </Button>
          {!isMobile && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 lg:h-8 px-1.5 lg:px-2 text-xs"
              onPointerDown={(e) => e.stopPropagation()}
              onClick={(e) => {
                e.stopPropagation();
                handleQuickSchedule(1);
              }}
            >
              Tomorrow
            </Button>
          )}

          {/* Full date/time picker */}
          <Popover open={isDatePickerOpen} onOpenChange={setIsDatePickerOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 w-7 lg:h-8 lg:w-8 p-0 min-w-[36px] lg:min-w-[40px] min-h-[36px] lg:min-h-[40px]"
                onClick={(e) => e.stopPropagation()}
              >
                <Calendar className="w-3.5 h-3.5 lg:w-4 lg:h-4" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="end" onClick={(e) => e.stopPropagation()}>
              <div className="p-3 space-y-3">
                {/* Close button for mobile */}
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Schedule Task</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0"
                    onClick={(e) => {
                      e.stopPropagation();
                      setIsDatePickerOpen(false);
                    }}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
                <CalendarPicker
                  mode="single"
                  selected={selectedDate}
                  onSelect={handleDateSelect}
                  initialFocus
                  className="pointer-events-auto"
                />
                <div className="flex gap-2">
                  <div className="flex-1">
                    <label className="text-xs text-foreground-muted mb-1 block">
                      <Clock className="w-3 h-3 inline mr-1" />
                      Start
                    </label>
                    <Select value={selectedStartTime} onValueChange={setSelectedStartTime}>
                      <SelectTrigger className="h-10 text-xs">
                        <SelectValue placeholder="Start time" />
                      </SelectTrigger>
                      <SelectContent className="max-h-48">
                        <SelectItem value="none">No time</SelectItem>
                        {TIME_OPTIONS.map((time) => (
                          <SelectItem key={time} value={time}>
                            {format(new Date(`2000-01-01T${time}`), 'h:mm a')}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex-1">
                    <label className="text-xs text-foreground-muted mb-1 block">End</label>
                    <Select value={selectedEndTime} onValueChange={setSelectedEndTime}>
                      <SelectTrigger className="h-10 text-xs">
                        <SelectValue placeholder="End time" />
                      </SelectTrigger>
                      <SelectContent className="max-h-48">
                        <SelectItem value="none">No time</SelectItem>
                        {TIME_OPTIONS.filter(t => !selectedStartTime || selectedStartTime === 'none' || t > selectedStartTime).map((time) => (
                          <SelectItem key={time} value={time}>
                            {format(new Date(`2000-01-01T${time}`), 'h:mm a')}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={(e) => {
                      e.stopPropagation();
                      setIsDatePickerOpen(false);
                    }}
                    className="flex-1 min-h-[44px]"
                    size="sm"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleConfirmSchedule}
                    disabled={!selectedDate}
                    className="flex-1 min-h-[44px]"
                    size="sm"
                  >
                    Schedule
                  </Button>
                </div>
              </div>
            </PopoverContent>
          </Popover>

          {/* Delete button */}
          {onDelete && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 w-7 lg:h-8 lg:w-8 p-0 min-w-[36px] lg:min-w-[40px] min-h-[36px] lg:min-h-[40px] text-destructive hover:text-destructive hover:bg-destructive/10"
              onClick={(e) => {
                e.stopPropagation();
                onDelete(task.id);
              }}
              title="Delete task"
            >
              <Trash2 className="w-3.5 h-3.5 lg:w-4 lg:h-4" />
            </Button>
          )}
        </div>
      )}
    </div>
  );
});

InboxTaskItem.displayName = 'InboxTaskItem';

export default InboxTaskItem;
