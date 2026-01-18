import { useState, useEffect, useRef } from 'react';
import { format, isBefore, differenceInDays } from 'date-fns';
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
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Calendar as CalendarIcon, MapPin, Users, Trash2, CalendarDays, Pencil } from 'lucide-react';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import EnergyPill from '@/components/shared/EnergyPill';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';
import TaskTimeSelector from './TaskTimeSelector';

interface EditTaskDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  task: Task | null;
  onSave: (taskId: string, updates: Partial<Task>) => void;
  onDelete?: (taskId: string) => void;
}

const EditTaskDialog = ({
  open,
  onOpenChange,
  task,
  onSave,
  onDelete,
}: EditTaskDialogProps) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [energy, setEnergy] = useState<EnergyLevel>('medium');
  const [dueDate, setDueDate] = useState<Date | undefined>(undefined);
  const [endDate, setEndDate] = useState<Date | undefined>(undefined);
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('10:00');
  const [location, setLocation] = useState('');
  const [isShared, setIsShared] = useState(false);
  const [useTime, setUseTime] = useState(false);
  const [isMultiDay, setIsMultiDay] = useState(false);
  const loadedTaskIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (!open || !task) {
      loadedTaskIdRef.current = null;
      return;
    }

    // IMPORTANT: Don't reset local edits just because the parent re-rendered
    // with a new object reference for the same task.
    if (loadedTaskIdRef.current === task.id) return;
    loadedTaskIdRef.current = task.id;

    setTitle(task.title);
    setDescription(task.description || '');
    setEnergy(task.energy_level);
    setDueDate(task.due_date ? new Date(task.due_date) : undefined);
    setEndDate(task.end_date ? new Date(task.end_date) : undefined);
    setLocation(task.location || '');
    setIsShared(task.is_shared || false);
    setIsMultiDay(!!task.end_date);

    const hasTime = !!(task.start_time && task.start_time !== 'none');
    setUseTime(hasTime);

    if (hasTime) {
      setStartTime(task.start_time?.slice(0, 5) || '09:00');
      setEndTime(task.end_time?.slice(0, 5) || '10:00');
    } else {
      setStartTime('09:00');
      setEndTime('10:00');
    }
  }, [open, task?.id]);

  const handleSave = () => {
    if (!task || !title.trim()) return;

    const updates: Partial<Task> = {
      title: title.trim(),
      description: description.trim() || null,
      energy_level: energy,
      due_date: dueDate ? format(dueDate, 'yyyy-MM-dd') : null,
      end_date: isMultiDay && endDate ? format(endDate, 'yyyy-MM-dd') : null,
      start_time: (useTime || isMultiDay) ? startTime : null,
      end_time: (useTime || isMultiDay) ? endTime : null,
      location: location.trim() || null,
      is_shared: isShared,
    };

    onSave(task.id, updates);
    onOpenChange(false);
  };

  // Calculate duration for multi-day tasks
  const durationText = isMultiDay && dueDate && endDate
    ? `${differenceInDays(endDate, dueDate) + 1} days`
    : null;

  const handleDelete = () => {
    if (task && onDelete) {
      onDelete(task.id);
      onOpenChange(false);
    }
  };

  if (!task) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg p-0 gap-0 overflow-hidden">
          <DialogHeader className="px-6 pt-6 pb-4">
            <DialogTitle className="flex items-center gap-2">
              <Pencil className="w-5 h-5 text-highlight" />
              Edit Task
          </DialogTitle>
          <DialogDescription>
            Update task details and scheduling
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[60vh] px-6">
          <div className="space-y-5 pb-6">
            {/* Task title */}
            <div className="space-y-2">
              <Label htmlFor="edit-title" className="text-foreground-muted">Title</Label>
              <Input
                id="edit-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Task title"
                className="focus:ring-1 focus:ring-highlight/30 focus:border-highlight/50 transition-all"
              />
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="edit-description" className="text-foreground-muted">Description (optional)</Label>
              <Textarea
                id="edit-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Add notes or details..."
                className="min-h-[80px] resize-none focus:ring-1 focus:ring-highlight/30 focus:border-highlight/50 transition-all"
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
                        ? 'ring-2 ring-highlight/70 ring-offset-2 ring-offset-background'
                        : 'opacity-50 hover:opacity-80'
                    )}
                  >
                    <EnergyPill energy={e} />
                  </button>
                ))}
              </div>
            </div>

            {/* Date picker with multi-day option */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="flex items-center gap-1.5 text-foreground-muted">
                  <CalendarIcon className="w-3.5 h-3.5" />
                  Start Date
                </Label>
                <div className="flex items-center gap-2">
                  <Label htmlFor="multi-day" className="text-xs text-foreground-muted cursor-pointer flex items-center gap-1.5">
                    <CalendarDays className="w-3.5 h-3.5" />
                    Multi-day
                  </Label>
                  <Switch
                    id="multi-day"
                    checked={isMultiDay}
                    onCheckedChange={(checked) => {
                      setIsMultiDay(checked);
                      if (!checked) setEndDate(undefined);
                      else if (dueDate && !endDate) setEndDate(dueDate);
                    }}
                  />
                </div>
              </div>
              <div className={cn('grid gap-2', isMultiDay && 'grid-cols-2')}>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-start text-left font-normal h-10">
                      <CalendarIcon className="w-4 h-4 mr-2 opacity-50" />
                      {dueDate ? format(dueDate, 'PPP') : 'Pick start date'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={dueDate}
                      onSelect={(d) => {
                        setDueDate(d);
                        if (d && endDate && isBefore(endDate, d)) {
                          setEndDate(d);
                        }
                      }}
                      initialFocus
                      className="pointer-events-auto"
                    />
                  </PopoverContent>
                </Popover>
                {isMultiDay && (
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
                        disabled={(date) => dueDate ? isBefore(date, dueDate) : false}
                        initialFocus
                        className="pointer-events-auto"
                      />
                    </PopoverContent>
                  </Popover>
                )}
              </div>
              {durationText && (
                <p className="text-xs text-foreground-muted">Duration: {durationText}</p>
              )}
            </div>

            {/* Time selection toggle - only show when not multi-day */}
            {!isMultiDay && (
              <div className="flex items-center justify-between py-1">
                <Label className="text-foreground-muted">Schedule specific time</Label>
                <Switch
                  checked={useTime}
                  onCheckedChange={(checked) => {
                    setUseTime(checked);
                    if (!checked) {
                      setStartTime('09:00');
                      setEndTime('10:00');
                    }
                  }}
                />
              </div>
            )}

            {/* Time slider - only for single-day tasks with time enabled */}
            {!isMultiDay && useTime && (
              <div className="rounded-xl border border-border/50 p-4 bg-secondary/20">
                <TaskTimeSelector
                  startTime={startTime}
                  endTime={endTime}
                  onStartTimeChange={setStartTime}
                  onEndTimeChange={setEndTime}
                />
              </div>
            )}

            {/* Multi-day time pickers */}
            {isMultiDay && (
              <div className="space-y-4 rounded-xl border border-border/50 p-4 bg-secondary/20">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-xs text-foreground-muted">Start Time</Label>
                    <Input
                      type="time"
                      value={startTime}
                      onChange={(e) => setStartTime(e.target.value)}
                      className="h-10"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs text-foreground-muted">End Time</Label>
                    <Input
                      type="time"
                      value={endTime}
                      onChange={(e) => setEndTime(e.target.value)}
                      className="h-10"
                    />
                  </div>
                </div>
                <p className="text-xs text-foreground-muted text-center">
                  Times apply to start and end dates respectively
                </p>
              </div>
            )}

            {/* Location */}
            <div className="space-y-2">
              <Label htmlFor="edit-location" className="flex items-center gap-1.5 text-foreground-muted">
                <MapPin className="w-3.5 h-3.5" />
                Location
              </Label>
              <Input
                id="edit-location"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="Add a location (optional)"
                className="h-10 focus:ring-1 focus:ring-highlight/30 focus:border-highlight/50 transition-all"
              />
            </div>

            {/* Share toggle */}
            <div className="flex items-center justify-between py-1">
              <Label htmlFor="edit-share" className="flex items-center gap-2 text-foreground-muted cursor-pointer">
                <Users className="w-4 h-4" />
                Share this task
              </Label>
              <Switch
                id="edit-share"
                checked={isShared}
                onCheckedChange={setIsShared}
              />
            </div>
          </div>
        </ScrollArea>

        <DialogFooter className="flex-col sm:flex-row gap-2 px-6 py-4 border-t border-border bg-background">
          {onDelete && (
            <Button
              variant="destructive"
              onClick={handleDelete}
              className="gap-2 sm:mr-auto"
            >
              <Trash2 className="w-4 h-4" />
              Delete
            </Button>
          )}
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={!title.trim()}>
            Save Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default EditTaskDialog;
