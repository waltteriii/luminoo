import { useDraggable } from '@dnd-kit/core';
import { cn } from '@/lib/utils';
import { Task, EnergyLevel } from '@/types';
import { GripVertical, Calendar, Clock, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Calendar as CalendarPicker } from '@/components/ui/calendar';
import { format, addDays, startOfWeek, addWeeks } from 'date-fns';
import { useState } from 'react';
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
}

const TIME_OPTIONS = Array.from({ length: 32 }, (_, i) => {
  const hour = Math.floor(i / 2) + 6;
  const minute = (i % 2) * 30;
  return `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
});

const InboxTaskItem = ({ task, onSchedule }: InboxTaskItemProps) => {
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>();
  const [selectedStartTime, setSelectedStartTime] = useState<string>('');
  const [selectedEndTime, setSelectedEndTime] = useState<string>('');

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
      className={cn(
        "group flex items-center gap-2 p-2 rounded bg-card border border-border transition-all",
        isDragging && "opacity-70 shadow-lg ring-2 ring-primary cursor-grabbing"
      )}
    >
      {/* Drag handle */}
      <button
        {...attributes}
        {...listeners}
        className="cursor-grab active:cursor-grabbing"
      >
        <GripVertical className="w-4 h-4 text-foreground-muted" />
      </button>

      {/* Task title and energy */}
      <div className="flex-1 min-w-0 flex items-center gap-2">
        <span className="text-sm truncate">{task.title}</span>
        <EnergyPill energy={task.energy_level} />
        {task.is_shared && <Users className="w-3 h-3 text-primary" />}
      </div>

      {/* Quick schedule buttons */}
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <Button
          variant="ghost"
          size="sm"
          className="h-6 px-2 text-xs"
          onClick={() => handleQuickSchedule(0)}
        >
          Today
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="h-6 px-2 text-xs"
          onClick={() => handleQuickSchedule(1)}
        >
          Tmrw
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="h-6 px-2 text-xs"
          onClick={() => onSchedule(task.id, format(nextMonday, 'yyyy-MM-dd'))}
        >
          Mon
        </Button>

        {/* Full date/time picker */}
        <Popover open={isDatePickerOpen} onOpenChange={setIsDatePickerOpen}>
          <PopoverTrigger asChild>
            <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
              <Calendar className="w-3 h-3" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="end">
            <div className="p-3 space-y-3">
              <CalendarPicker
                mode="single"
                selected={selectedDate}
                onSelect={handleDateSelect}
                initialFocus
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
                      <SelectItem value="">No time</SelectItem>
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
                      <SelectItem value="">No time</SelectItem>
                      {TIME_OPTIONS.filter(t => !selectedStartTime || t > selectedStartTime).map((time) => (
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
                {selectedStartTime && ` at ${format(new Date(`2000-01-01T${selectedStartTime}`), 'h:mm a')}`}
              </Button>
            </div>
          </PopoverContent>
        </Popover>
      </div>
    </div>
  );
};

export default InboxTaskItem;