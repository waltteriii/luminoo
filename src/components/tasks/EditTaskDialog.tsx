import { useState, useEffect } from 'react';
import { format, isBefore, isAfter, differenceInDays } from 'date-fns';
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
import { Calendar as CalendarIcon, MapPin, Users, Trash2, CalendarDays } from 'lucide-react';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import EnergyPill from '@/components/shared/EnergyPill';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';
import TimeRangeSlider from './TimeRangeSlider';

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
  const [startTime, setStartTime] = useState('none');
  const [endTime, setEndTime] = useState('none');
  const [location, setLocation] = useState('');
  const [isShared, setIsShared] = useState(false);
  const [useTime, setUseTime] = useState(false);
  const [isMultiDay, setIsMultiDay] = useState(false);

  useEffect(() => {
    if (open && task) {
      setTitle(task.title);
      setDescription(task.description || '');
      setEnergy(task.energy_level);
      setDueDate(task.due_date ? new Date(task.due_date) : undefined);
      setEndDate(task.end_date ? new Date(task.end_date) : undefined);
      setStartTime(task.start_time || 'none');
      setEndTime(task.end_time || 'none');
      setLocation(task.location || '');
      setIsShared(task.is_shared || false);
      setUseTime(!!(task.start_time && task.start_time !== 'none'));
      setIsMultiDay(!!task.end_date);
    }
  }, [open, task]);

  const handleSave = () => {
    if (!task || !title.trim()) return;
    
    const updates: Partial<Task> = {
      title: title.trim(),
      description: description.trim() || null,
      energy_level: energy,
      due_date: dueDate ? format(dueDate, 'yyyy-MM-dd') : null,
      end_date: isMultiDay && endDate ? format(endDate, 'yyyy-MM-dd') : null,
      start_time: useTime && startTime !== 'none' ? startTime : null,
      end_time: useTime && endTime !== 'none' ? endTime : null,
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
          <DialogTitle>Edit Task</DialogTitle>
          <DialogDescription>
            Update task details and scheduling
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[60vh] px-6">
          <div className="space-y-6 pb-6">
            {/* Task title */}
            <div className="space-y-2">
              <Label htmlFor="edit-title">Title</Label>
              <Input
                id="edit-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Task title"
              />
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="edit-description">Description (optional)</Label>
              <Textarea
                id="edit-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Add notes or details..."
                className="min-h-[80px] resize-none"
              />
            </div>

            {/* Energy level selector */}
            <div className="space-y-3">
              <Label>Energy Level</Label>
              <div className="flex gap-3">
                {(['high', 'medium', 'low', 'recovery'] as EnergyLevel[]).map((e) => (
                  <button
                    key={e}
                    onClick={() => setEnergy(e)}
                    className={cn(
                      "transition-all rounded-full",
                      energy === e 
                        ? "ring-2 ring-primary ring-offset-2 ring-offset-background" 
                        : "opacity-60 hover:opacity-100"
                    )}
                  >
                    <EnergyPill energy={e} />
                  </button>
                ))}
              </div>
            </div>

            {/* Date picker */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="flex items-center gap-1.5">
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
                    }}
                  />
                </div>
              </div>
              <div className={cn("grid gap-2", isMultiDay && "grid-cols-2")}>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-start text-left font-normal h-11">
                      {dueDate ? format(dueDate, 'PPP') : 'Pick start date'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={dueDate}
                      onSelect={(d) => {
                        setDueDate(d);
                        // If end date is before start date, update it
                        if (d && endDate && isBefore(endDate, d)) {
                          setEndDate(d);
                        }
                      }}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
                {isMultiDay && (
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="w-full justify-start text-left font-normal h-11">
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
                      />
                    </PopoverContent>
                  </Popover>
                )}
              </div>
              {durationText && (
                <p className="text-xs text-foreground-muted">Duration: {durationText}</p>
              )}
            </div>

            {/* Time selection - Visual slider */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>Time</Label>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-foreground-muted">Schedule time</span>
                  <Switch
                    checked={useTime}
                    onCheckedChange={(checked) => {
                      setUseTime(checked);
                      if (!checked) {
                        setStartTime('none');
                        setEndTime('none');
                      } else {
                        setStartTime('09:00');
                        setEndTime('10:00');
                      }
                    }}
                  />
                </div>
              </div>
              {useTime && (
                <TimeRangeSlider
                  startTime={startTime === 'none' ? '09:00' : startTime}
                  endTime={endTime === 'none' ? '10:00' : endTime}
                  onStartTimeChange={setStartTime}
                  onEndTimeChange={setEndTime}
                />
              )}
            </div>

            {/* Location */}
            <div className="space-y-2">
              <Label htmlFor="edit-location" className="flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5" />
                Location
              </Label>
              <Input
                id="edit-location"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="Add a location (optional)"
                className="h-11"
              />
            </div>

            {/* Share toggle */}
            <div className="flex items-center justify-between py-2">
              <Label htmlFor="edit-share" className="flex items-center gap-2 cursor-pointer">
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
