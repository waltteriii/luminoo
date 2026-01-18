import { useState, useEffect } from 'react';
import { format, differenceInDays, isBefore } from 'date-fns';
import { Task, EnergyLevel } from '@/types';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Calendar as CalendarIcon, MapPin, Users, CalendarDays } from 'lucide-react';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import EnergyPill from '@/components/shared/EnergyPill';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import TaskTimeSelector from './TaskTimeSelector';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';

interface ScheduleConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  task: Task | null;
  targetDate: Date | null;
  targetHour?: number;
  onConfirm: (
    taskId: string,
    date: string,
    startTime?: string,
    endTime?: string,
    updates?: { 
      title?: string; 
      energy_level?: EnergyLevel; 
      location?: string; 
      is_shared?: boolean;
      end_date?: string;
    }
  ) => void;
}

const ScheduleConfirmDialog = ({
  open,
  onOpenChange,
  task,
  targetDate,
  targetHour,
  onConfirm,
}: ScheduleConfirmDialogProps) => {
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('10:00');
  const [title, setTitle] = useState('');
  const [energy, setEnergy] = useState<EnergyLevel>('medium');
  const [location, setLocation] = useState('');
  const [isShared, setIsShared] = useState(false);
  const [isMultiDay, setIsMultiDay] = useState(false);
  const [endDate, setEndDate] = useState<Date | undefined>(undefined);
  const [useTime, setUseTime] = useState(true);

  // Reset state when dialog opens with new task/values
  useEffect(() => {
    if (open && task) {
      setTitle(task.title);
      setEnergy(task.energy_level);
      setLocation(task.location || '');
      setIsShared(task.is_shared || false);
      setIsMultiDay(!!task.end_date);
      setEndDate(task.end_date ? new Date(task.end_date) : undefined);

      const normalizeTime = (t: string | null | undefined) => {
        if (!t) return null;
        return t.slice(0, 5);
      };

      const taskStart = normalizeTime(task.start_time);
      const taskEnd = normalizeTime(task.end_time);

      if (targetHour !== undefined) {
        setStartTime(`${targetHour.toString().padStart(2, '0')}:00`);
        setEndTime(`${Math.min(23, targetHour + 1).toString().padStart(2, '0')}:00`);
        setUseTime(true);
      } else if (taskStart && taskEnd) {
        setStartTime(taskStart);
        setEndTime(taskEnd);
        setUseTime(true);
      } else if (taskStart && !taskEnd) {
        setStartTime(taskStart);
        const [h] = taskStart.split(':').map(Number);
        setEndTime(`${Math.min(23, h + 1).toString().padStart(2, '0')}:00`);
        setUseTime(true);
      } else {
        setStartTime('09:00');
        setEndTime('10:00');
        setUseTime(false);
      }
    }
  }, [open, task, targetHour]);

  const handleConfirm = () => {
    if (task && targetDate) {
      const updates: { 
        title?: string; 
        energy_level?: EnergyLevel; 
        location?: string; 
        is_shared?: boolean;
        end_date?: string;
      } = {};

      if (title !== task.title) updates.title = title;
      if (energy !== task.energy_level) updates.energy_level = energy;
      if (location !== (task.location || '')) updates.location = location || undefined;
      if (isShared !== task.is_shared) updates.is_shared = isShared;
      if (isMultiDay && endDate) {
        updates.end_date = format(endDate, 'yyyy-MM-dd');
      } else if (!isMultiDay && task.end_date) {
        updates.end_date = undefined;
      }

      onConfirm(
        task.id,
        format(targetDate, 'yyyy-MM-dd'),
        useTime && startTime ? startTime : undefined,
        useTime && endTime ? endTime : undefined,
        Object.keys(updates).length > 0 ? updates : undefined
      );
      onOpenChange(false);
    }
  };

  // Calculate duration for multi-day tasks
  const durationText = isMultiDay && targetDate && endDate
    ? `${differenceInDays(endDate, targetDate) + 1} days`
    : null;

  if (!task || !targetDate) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md p-0 gap-0 overflow-hidden">
        <DialogHeader className="px-6 pt-6 pb-4">
          <DialogTitle className="flex items-center gap-2">
            <CalendarIcon className="w-5 h-5 text-primary" />
            Schedule Task
          </DialogTitle>
          <DialogDescription>
            Add this task to {format(targetDate, 'EEEE, MMMM d, yyyy')}
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[60vh] px-6">
          <div className="space-y-5 pb-6">
            {/* Editable task title */}
            <div className="space-y-2">
              <Label htmlFor="task-title" className="text-foreground-muted">Task</Label>
              <Input
                id="task-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Task title"
                className="focus:ring-1 focus:ring-primary/30 focus:border-primary/50 transition-all"
              />
            </div>

            {/* Energy level selector */}
            <div className="space-y-2.5">
              <Label className="text-foreground-muted">Energy Level</Label>
              <div className="flex gap-2.5">
                {(['high', 'medium', 'low', 'recovery'] as EnergyLevel[]).map((e) => (
                  <button
                    key={e}
                    onClick={() => setEnergy(e)}
                    className={cn(
                      'transition-all rounded-full',
                      energy === e
                        ? 'ring-2 ring-primary/70 ring-offset-2 ring-offset-background'
                        : 'opacity-50 hover:opacity-80'
                    )}
                  >
                    <EnergyPill energy={e} />
                  </button>
                ))}
              </div>
            </div>

            {/* Multi-day toggle */}
            <div className="flex items-center justify-between py-1">
              <Label htmlFor="multi-day" className="flex items-center gap-2 text-foreground-muted cursor-pointer">
                <CalendarDays className="w-4 h-4" />
                Multi-day task
              </Label>
              <Switch
                id="multi-day"
                checked={isMultiDay}
                onCheckedChange={(checked) => {
                  setIsMultiDay(checked);
                  if (checked && !endDate) {
                    setEndDate(targetDate);
                  }
                }}
              />
            </div>

            {/* End date picker for multi-day */}
            {isMultiDay && (
              <div className="space-y-2">
                <Label className="text-foreground-muted">End Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-start text-left font-normal h-10">
                      <CalendarIcon className="w-4 h-4 mr-2 opacity-50" />
                      {endDate ? format(endDate, 'PPP') : 'Pick end date'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={endDate}
                      onSelect={setEndDate}
                      disabled={(date) => isBefore(date, targetDate)}
                      initialFocus
                      className="pointer-events-auto"
                    />
                  </PopoverContent>
                </Popover>
                {durationText && (
                  <p className="text-xs text-foreground-muted">Duration: {durationText}</p>
                )}
              </div>
            )}

            {/* Time toggle */}
            <div className="flex items-center justify-between py-1">
              <Label className="text-foreground-muted">Schedule specific time</Label>
              <Switch
                checked={useTime}
                onCheckedChange={setUseTime}
              />
            </div>

            {/* Time selection - Visual slider with clickable times */}
            {useTime && (
              <div className="rounded-xl border border-border/50 p-4 bg-secondary/20">
                <TaskTimeSelector
                  startTime={startTime}
                  endTime={endTime}
                  onStartTimeChange={setStartTime}
                  onEndTimeChange={setEndTime}
                />
              </div>
            )}

            {/* Location */}
            <div className="space-y-2">
              <Label htmlFor="task-location" className="flex items-center gap-1.5 text-foreground-muted">
                <MapPin className="w-3.5 h-3.5" />
                Location
              </Label>
              <Input
                id="task-location"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="Add a location (optional)"
                className="focus:ring-1 focus:ring-primary/30 focus:border-primary/50 transition-all"
              />
            </div>

            {/* Share toggle */}
            <div className="flex items-center justify-between py-1">
              <Label htmlFor="share-task" className="flex items-center gap-2 text-foreground-muted cursor-pointer">
                <Users className="w-4 h-4" />
                Share this task
              </Label>
              <Switch
                id="share-task"
                checked={isShared}
                onCheckedChange={setIsShared}
              />
            </div>
          </div>
        </ScrollArea>

        <DialogFooter className="px-6 py-4 border-t border-border bg-background">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleConfirm} disabled={!title.trim()}>
            Schedule Task
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ScheduleConfirmDialog;
