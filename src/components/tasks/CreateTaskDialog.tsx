import { useState, useEffect } from 'react';
import { format, isBefore, differenceInDays } from 'date-fns';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { ScrollArea } from '@/components/ui/scroll-area';
import { EnergyLevel } from '@/types';
import EnergyPill from '@/components/shared/EnergyPill';
import TaskTimeSelector from './TaskTimeSelector';
import { Calendar as CalendarIcon, MapPin, Users, CalendarDays, Plus } from 'lucide-react';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';

interface CreateTaskDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  targetDate: Date;
  startTime?: string;
  endTime?: string;
  defaultEnergy?: EnergyLevel;
  onConfirm: (
    title: string,
    energy: EnergyLevel,
    startTime?: string,
    endTime?: string,
    options?: { 
      description?: string; 
      location?: string; 
      isShared?: boolean;
      endDate?: string;
    }
  ) => void;
}

const CreateTaskDialog = ({
  open,
  onOpenChange,
  targetDate,
  startTime,
  endTime,
  defaultEnergy = 'medium',
  onConfirm,
}: CreateTaskDialogProps) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [energy, setEnergy] = useState<EnergyLevel>(defaultEnergy);
  const [localStartTime, setLocalStartTime] = useState(startTime || '09:00');
  const [localEndTime, setLocalEndTime] = useState(endTime || '10:00');
  const [location, setLocation] = useState('');
  const [isShared, setIsShared] = useState(false);
  const [useTime, setUseTime] = useState(!!startTime);
  const [isMultiDay, setIsMultiDay] = useState(false);
  const [taskEndDate, setTaskEndDate] = useState<Date | undefined>(undefined);

  // Reset form when dialog opens
  useEffect(() => {
    if (open) {
      setTitle('');
      setDescription('');
      setEnergy(defaultEnergy);
      setLocalStartTime(startTime || '09:00');
      setLocalEndTime(endTime || '10:00');
      setLocation('');
      setIsShared(false);
      setUseTime(!!startTime);
      setIsMultiDay(false);
      setTaskEndDate(undefined);
    }
  }, [open, startTime, endTime, defaultEnergy]);

  const handleConfirm = () => {
    if (!title.trim()) return;

    onConfirm(
      title.trim(),
      energy,
      useTime ? localStartTime : undefined,
      useTime ? localEndTime : undefined,
      {
        description: description.trim() || undefined,
        location: location.trim() || undefined,
        isShared,
        endDate: isMultiDay && taskEndDate ? format(taskEndDate, 'yyyy-MM-dd') : undefined,
      }
    );
    setTitle('');
    setDescription('');
    setEnergy(defaultEnergy);
    setLocation('');
    setIsShared(false);
    onOpenChange(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey && title.trim()) {
      e.preventDefault();
      handleConfirm();
    }
  };

  // Calculate duration for multi-day tasks
  const durationText = isMultiDay && taskEndDate
    ? `${differenceInDays(taskEndDate, targetDate) + 1} days`
    : null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md p-0 gap-0 overflow-hidden">
        <DialogHeader className="px-6 pt-6 pb-4">
          <DialogTitle className="flex items-center gap-2">
            <Plus className="w-5 h-5 text-primary" />
            Create Task
          </DialogTitle>
          <p className="text-sm text-foreground-muted">
            {format(targetDate, 'EEEE, MMMM d, yyyy')}
          </p>
        </DialogHeader>

        <ScrollArea className="max-h-[60vh] px-6">
          <div className="space-y-5 pb-6">
            {/* Task title */}
            <div className="space-y-2">
              <Label htmlFor="task-title" className="text-foreground-muted">Task Name</Label>
              <Input
                id="task-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="What do you want to do?"
                autoFocus
                className="text-base focus:ring-1 focus:ring-primary/30 focus:border-primary/50 transition-all"
              />
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="task-description" className="text-foreground-muted">Description (optional)</Label>
              <Textarea
                id="task-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Add notes or details..."
                className="min-h-[60px] resize-none focus:ring-1 focus:ring-primary/30 focus:border-primary/50 transition-all"
              />
            </div>

            {/* Energy selector */}
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
              <Label htmlFor="create-multi-day" className="flex items-center gap-2 text-foreground-muted cursor-pointer">
                <CalendarDays className="w-4 h-4" />
                Multi-day task
              </Label>
              <Switch
                id="create-multi-day"
                checked={isMultiDay}
                onCheckedChange={(checked) => {
                  setIsMultiDay(checked);
                  if (checked && !taskEndDate) {
                    setTaskEndDate(targetDate);
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
                      {taskEndDate ? format(taskEndDate, 'PPP') : 'Pick end date'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={taskEndDate}
                      onSelect={setTaskEndDate}
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

            {/* Time slider - only show if useTime is enabled */}
            {useTime && (
              <div className="rounded-xl border border-border/50 p-4 bg-secondary/20">
                <TaskTimeSelector
                  startTime={localStartTime}
                  endTime={localEndTime}
                  onStartTimeChange={setLocalStartTime}
                  onEndTimeChange={setLocalEndTime}
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
              <Label htmlFor="task-share" className="flex items-center gap-2 text-foreground-muted cursor-pointer">
                <Users className="w-4 h-4" />
                Share this task
              </Label>
              <Switch
                id="task-share"
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
            Create Task
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default CreateTaskDialog;
