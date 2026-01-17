import { useDraggable } from '@dnd-kit/core';
import { cn } from '@/lib/utils';
import { Task, EnergyLevel } from '@/types';
import { GripVertical, Calendar, Clock, Users, Check, X, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Calendar as CalendarPicker } from '@/components/ui/calendar';
import { format, addDays, startOfWeek, addWeeks } from 'date-fns';
import { useState, useRef, useEffect } from 'react';
import EnergyPill from '@/components/shared/EnergyPill';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface InboxTaskItemProps {
  task: Task;
  onSchedule: (taskId: string, date: string, startTime?: string, endTime?: string) => void;
  onEnergyChange?: (taskId: string, energy: EnergyLevel) => void;
  onTitleChange?: (taskId: string, title: string) => void;
  onAddBelow?: (afterTaskId: string) => void;
}

const TIME_OPTIONS = Array.from({ length: 32 }, (_, i) => {
  const hour = Math.floor(i / 2) + 6;
  const minute = (i % 2) * 30;
  return `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
});

const ENERGY_OPTIONS: { value: EnergyLevel; label: string }[] = [
  { value: 'high', label: 'High Focus' },
  { value: 'medium', label: 'Steady' },
  { value: 'low', label: 'Low Energy' },
  { value: 'recovery', label: 'Recovery' },
];

const InboxTaskItem = ({ task, onSchedule, onEnergyChange, onTitleChange, onAddBelow }: InboxTaskItemProps) => {
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>();
  const [selectedStartTime, setSelectedStartTime] = useState<string>('');
  const [selectedEndTime, setSelectedEndTime] = useState<string>('');
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(task.title);
  const inputRef = useRef<HTMLInputElement>(null);

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

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isEditing]);

  const handleDoubleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setEditTitle(task.title);
    setIsEditing(true);
  };

  const handleSaveTitle = () => {
    const trimmed = editTitle.trim();
    if (trimmed && trimmed !== task.title && onTitleChange) {
      onTitleChange(task.id, trimmed);
    }
    setIsEditing(false);
  };

  const handleCancelEdit = () => {
    setEditTitle(task.title);
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSaveTitle();
    } else if (e.key === 'Escape') {
      handleCancelEdit();
    }
  };

  const handleQuickSchedule = (daysFromNow: number) => {
    const date = addDays(new Date(), daysFromNow);
    onSchedule(task.id, format(date, 'yyyy-MM-dd'));
  };

  const handleDateSelect = (date: Date | undefined) => {
    setSelectedDate(date);
  };

  const handleConfirmSchedule = () => {
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
  };

  const nextMonday = startOfWeek(addWeeks(new Date(), 1), { weekStartsOn: 1 });

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={cn(
        "group flex items-center gap-2 p-2 rounded bg-card border border-border transition-all cursor-grab active:cursor-grabbing",
        isDragging && "opacity-70 shadow-lg ring-2 ring-primary"
      )}
    >
      {/* Drag handle icon - visual indicator */}
      <GripVertical className="w-4 h-4 text-foreground-muted flex-shrink-0" />

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
              className="flex-1 bg-transparent border-none outline-none text-sm text-foreground focus:ring-0 focus:outline-none p-0 selection:bg-transparent"
              onClick={(e) => e.stopPropagation()}
            />
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0"
              onClick={(e) => {
                e.stopPropagation();
                handleSaveTitle();
              }}
            >
              <Check className="w-3 h-3 text-primary" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0"
              onClick={(e) => {
                e.stopPropagation();
                handleCancelEdit();
              }}
            >
              <X className="w-3 h-3 text-foreground-muted" />
            </Button>
          </div>
        ) : (
          <span
            className="text-sm truncate cursor-text"
            onDoubleClick={handleDoubleClick}
            title="Double-click to edit"
          >
            {task.title}
          </span>
        )}

        {/* Clickable energy pill to change energy */}
        {!isEditing && (
          <Popover>
            <PopoverTrigger asChild onClick={(e) => e.stopPropagation()}>
              <button className="cursor-pointer hover:opacity-80">
                <EnergyPill energy={task.energy_level} />
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-36 p-1" align="start" onClick={(e) => e.stopPropagation()}>
              {ENERGY_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  onClick={(e) => {
                    e.stopPropagation();
                    onEnergyChange?.(task.id, option.value);
                  }}
                  className={cn(
                    "w-full flex items-center gap-2 px-2 py-1.5 text-xs rounded hover:bg-secondary transition-colors",
                    task.energy_level === option.value && "bg-secondary"
                  )}
                >
                  <span
                    className={cn(
                      "w-2 h-2 rounded-full",
                      option.value === 'high' && "bg-energy-high",
                      option.value === 'medium' && "bg-energy-medium",
                      option.value === 'low' && "bg-energy-low",
                      option.value === 'recovery' && "bg-energy-recovery"
                    )}
                  />
                  {option.label}
                </button>
              ))}
            </PopoverContent>
          </Popover>
        )}

        {task.is_shared && <Users className="w-3 h-3 text-primary" />}
      </div>

      {/* Quick schedule buttons */}
      {!isEditing && (
        <div
          className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Add below */}
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0"
            onClick={(e) => {
              e.stopPropagation();
              onAddBelow?.(task.id);
            }}
            title="Add a task below"
          >
            <Plus className="w-3 h-3" />
          </Button>

          <Button
            variant="ghost"
            size="sm"
            className="h-6 px-2 text-xs"
            onClick={(e) => {
              e.stopPropagation();
              handleQuickSchedule(0);
            }}
          >
            Today
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-6 px-2 text-xs"
            onClick={(e) => {
              e.stopPropagation();
              handleQuickSchedule(1);
            }}
          >
            Tomorrow
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-6 px-2 text-xs"
            onClick={(e) => {
              e.stopPropagation();
              onSchedule(task.id, format(nextMonday, 'yyyy-MM-dd'));
            }}
          >
            Mon
          </Button>

          {/* Full date/time picker */}
          <Popover open={isDatePickerOpen} onOpenChange={setIsDatePickerOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0"
                onClick={(e) => e.stopPropagation()}
              >
                <Calendar className="w-3 h-3" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="end" onClick={(e) => e.stopPropagation()}>
              <div className="p-3 space-y-3">
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
                      <SelectTrigger className="h-8 text-xs">
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
                      <SelectTrigger className="h-8 text-xs">
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
                <Button
                  onClick={handleConfirmSchedule}
                  disabled={!selectedDate}
                  className="w-full"
                  size="sm"
                >
                  Schedule {selectedDate && `for ${format(selectedDate, 'MMM d')}`}
                  {selectedStartTime && selectedStartTime !== 'none' && ` at ${format(new Date(`2000-01-01T${selectedStartTime}`), 'h:mm a')}`}
                </Button>
              </div>
            </PopoverContent>
          </Popover>
        </div>
      )}
    </div>
  );
};

export default InboxTaskItem;

