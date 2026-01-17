import { useState, useRef, useEffect } from 'react';
import { format, addDays } from 'date-fns';
import { cn } from '@/lib/utils';
import { Plus, Calendar, Clock, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { EnergyLevel } from '@/types';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';

interface QuickAddTaskProps {
  onAdd: (task: {
    title: string;
    energy: EnergyLevel;
    date?: string;
    startTime?: string;
    endTime?: string;
    endDate?: string;
  }) => void;
  defaultEnergy?: EnergyLevel;
  defaultDate?: Date;
  defaultTime?: string;
  compact?: boolean;
}

const ENERGY_OPTIONS: { value: EnergyLevel; label: string; color: string; shortLabel: string }[] = [
  { value: 'high', label: 'High Focus', color: 'bg-energy-high', shortLabel: 'High' },
  { value: 'medium', label: 'Steady', color: 'bg-energy-medium', shortLabel: 'Med' },
  { value: 'low', label: 'Low Energy', color: 'bg-energy-low', shortLabel: 'Low' },
  { value: 'recovery', label: 'Recovery', color: 'bg-energy-recovery', shortLabel: 'Rec' },
];

const TIME_SLOTS = Array.from({ length: 17 }, (_, i) => {
  const hour = i + 6; // 6 AM to 10 PM
  return {
    value: `${hour.toString().padStart(2, '0')}:00`,
    label: format(new Date().setHours(hour, 0), 'h:mm a'),
  };
});

const QuickAddTask = ({
  onAdd,
  defaultEnergy = 'medium',
  defaultDate,
  defaultTime,
  compact = false,
}: QuickAddTaskProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [energy, setEnergy] = useState<EnergyLevel>(defaultEnergy);
  const [date, setDate] = useState<Date | undefined>(defaultDate);
  const [startTime, setStartTime] = useState<string>(defaultTime || '');
  const [endTime, setEndTime] = useState<string>('');
  const [endDate, setEndDate] = useState<Date | undefined>();
  const [showAdvanced, setShowAdvanced] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  useEffect(() => {
    setDate(defaultDate);
  }, [defaultDate]);

  useEffect(() => {
    setStartTime(defaultTime || '');
  }, [defaultTime]);

  const handleSubmit = () => {
    if (!title.trim()) return;

    onAdd({
      title: title.trim(),
      energy,
      date: date ? format(date, 'yyyy-MM-dd') : undefined,
      startTime: startTime || undefined,
      endTime: endTime || undefined,
      endDate: endDate ? format(endDate, 'yyyy-MM-dd') : undefined,
    });

    // Reset form
    setTitle('');
    setEnergy(defaultEnergy);
    setStartTime(defaultTime || '');
    setEndTime('');
    setEndDate(undefined);
    setShowAdvanced(false);
    setIsOpen(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    } else if (e.key === 'Escape') {
      setIsOpen(false);
    }
  };

  const quickDateOptions = [
    { label: 'Today', date: new Date() },
    { label: 'Tomorrow', date: addDays(new Date(), 1) },
    { label: 'Next Week', date: addDays(new Date(), 7) },
  ];

  if (!isOpen) {
    return (
      <Button
        variant="ghost"
        size={compact ? 'sm' : 'default'}
        onClick={() => setIsOpen(true)}
        className={cn(
          "w-full justify-start gap-2 text-foreground-muted hover:text-foreground border border-dashed border-border hover:border-primary/50",
          compact && "h-8 text-xs"
        )}
      >
        <Plus className="w-4 h-4" />
        Add task
      </Button>
    );
  }

  return (
    <div className="rounded-lg border border-primary bg-card p-3 space-y-3 animate-fade-in">
      {/* Title input */}
      <Input
        ref={inputRef}
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="What needs to be done?"
        className="border-0 bg-transparent focus-visible:ring-0 px-0 text-sm"
      />

      {/* Quick energy selection */}
      <div className="flex items-center gap-1 flex-wrap">
        {ENERGY_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            onClick={() => setEnergy(opt.value)}
            className={cn(
              "flex items-center gap-1.5 px-2 py-1 rounded-md text-xs transition-all",
              energy === opt.value
                ? "bg-secondary text-foreground ring-1 ring-primary/30"
                : "text-foreground-muted hover:bg-secondary/50"
            )}
          >
            <span className={cn("w-2 h-2 rounded-full", opt.color)} />
            <span>{opt.shortLabel}</span>
          </button>
        ))}
      </div>

      {/* Date and time row */}
      <div className="flex items-center gap-2 flex-wrap">
        {/* Quick date options */}
        {quickDateOptions.map((opt) => (
          <button
            key={opt.label}
            onClick={() => setDate(opt.date)}
            className={cn(
              "px-2 py-1 rounded-md text-xs transition-all",
              date && format(date, 'yyyy-MM-dd') === format(opt.date, 'yyyy-MM-dd')
                ? "bg-primary text-primary-foreground"
                : "bg-secondary text-foreground-muted hover:text-foreground"
            )}
          >
            {opt.label}
          </button>
        ))}

        {/* Calendar picker */}
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className="h-7 gap-1 text-xs">
              <Calendar className="w-3 h-3" />
              {date && !quickDateOptions.some(o => format(o.date, 'yyyy-MM-dd') === format(date, 'yyyy-MM-dd'))
                ? format(date, 'MMM d')
                : 'Pick date'
              }
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <CalendarComponent
              mode="single"
              selected={date}
              onSelect={setDate}
              initialFocus
              className="p-3 pointer-events-auto"
            />
          </PopoverContent>
        </Popover>

        {/* Time picker */}
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className="h-7 gap-1 text-xs">
              <Clock className="w-3 h-3" />
              {startTime || 'Time'}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-40 p-2 max-h-60 overflow-y-auto" align="start">
            <div className="space-y-1">
              {TIME_SLOTS.map((slot) => (
                <button
                  key={slot.value}
                  onClick={() => {
                    setStartTime(slot.value);
                    // Auto-set end time to 1 hour later
                    const endHour = parseInt(slot.value) + 1;
                    if (endHour <= 22) {
                      setEndTime(`${endHour.toString().padStart(2, '0')}:00`);
                    }
                  }}
                  className={cn(
                    "w-full text-left px-2 py-1 rounded text-sm",
                    startTime === slot.value
                      ? "bg-primary text-primary-foreground"
                      : "hover:bg-secondary"
                  )}
                >
                  {slot.label}
                </button>
              ))}
            </div>
          </PopoverContent>
        </Popover>
      </div>

      {/* Advanced options toggle */}
      <button
        onClick={() => setShowAdvanced(!showAdvanced)}
        className="flex items-center gap-1 text-xs text-foreground-muted hover:text-foreground"
      >
        <ChevronRight className={cn("w-3 h-3 transition-transform", showAdvanced && "rotate-90")} />
        Multi-day & duration
      </button>

      {/* Advanced options */}
      {showAdvanced && (
        <div className="space-y-2 pl-4 border-l-2 border-border">
          {/* End time */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-foreground-muted w-16">End time:</span>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className="h-7 gap-1 text-xs">
                  <Clock className="w-3 h-3" />
                  {endTime || 'Select'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-40 p-2 max-h-60 overflow-y-auto" align="start">
                <div className="space-y-1">
                  {TIME_SLOTS.filter(s => !startTime || s.value > startTime).map((slot) => (
                    <button
                      key={slot.value}
                      onClick={() => setEndTime(slot.value)}
                      className={cn(
                        "w-full text-left px-2 py-1 rounded text-sm",
                        endTime === slot.value
                          ? "bg-primary text-primary-foreground"
                          : "hover:bg-secondary"
                      )}
                    >
                      {slot.label}
                    </button>
                  ))}
                </div>
              </PopoverContent>
            </Popover>
          </div>

          {/* End date for multi-day */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-foreground-muted w-16">End date:</span>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className="h-7 gap-1 text-xs">
                  <Calendar className="w-3 h-3" />
                  {endDate ? format(endDate, 'MMM d') : 'Multi-day'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <CalendarComponent
                  mode="single"
                  selected={endDate}
                  onSelect={setEndDate}
                  disabled={(d) => date ? d < date : false}
                  initialFocus
                  className="p-3 pointer-events-auto"
                />
              </PopoverContent>
            </Popover>
            {endDate && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setEndDate(undefined)}
                className="h-6 px-2 text-xs"
              >
                Clear
              </Button>
            )}
          </div>
        </div>
      )}

      {/* Action buttons */}
      <div className="flex items-center gap-2 pt-2 border-t border-border">
        <Button size="sm" onClick={handleSubmit} disabled={!title.trim()}>
          Add Task
        </Button>
        <Button variant="ghost" size="sm" onClick={() => setIsOpen(false)}>
          Cancel
        </Button>
      </div>
    </div>
  );
};

export default QuickAddTask;