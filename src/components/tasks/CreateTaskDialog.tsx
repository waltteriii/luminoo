import { useState, useEffect } from 'react';
import { format } from 'date-fns';
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
import { EnergyLevel } from '@/types';
import EnergyPill from '@/components/shared/EnergyPill';
import TimeRangeSlider from '@/components/tasks/TimeRangeSlider';
import { MapPin, Users, Clock } from 'lucide-react';
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
    options?: { description?: string; location?: string; isShared?: boolean }
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

  const formatTimeDisplay = (time: string) => {
    if (!time) return '';
    const [hours] = time.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour % 12 || 12;
    return `${displayHour}:00 ${ampm}`;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Create Task</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Date display */}
          <div className="flex items-center gap-2 text-sm text-foreground-muted">
            <Clock className="w-4 h-4" />
            <span className="font-medium text-foreground">
              {format(targetDate, 'EEEE, MMM d')}
            </span>
          </div>

          {/* Task title */}
          <div className="space-y-2">
            <Label htmlFor="task-title">Task Name</Label>
            <Input
              id="task-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="What do you want to do?"
              autoFocus
              className="text-base"
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="task-description">Description (optional)</Label>
            <Textarea
              id="task-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Add notes or details..."
              className="min-h-[60px]"
            />
          </div>

          {/* Energy selector */}
          <div className="space-y-2">
            <Label>Energy Level</Label>
            <div className="flex gap-2">
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

          {/* Time toggle */}
          <div className="flex items-center justify-between">
            <Label htmlFor="use-time" className="flex items-center gap-2">
              <Clock className="w-4 h-4" />
              Schedule a specific time
            </Label>
            <Switch
              id="use-time"
              checked={useTime}
              onCheckedChange={setUseTime}
            />
          </div>

          {/* Time slider - only show if useTime is enabled */}
          {useTime && (
            <div className="rounded-lg border border-border p-3 bg-secondary/30">
              <TimeRangeSlider
                startTime={localStartTime}
                endTime={localEndTime}
                onStartTimeChange={setLocalStartTime}
                onEndTimeChange={setLocalEndTime}
              />
            </div>
          )}

          {/* Location */}
          <div className="space-y-2">
            <Label htmlFor="task-location" className="flex items-center gap-1">
              <MapPin className="w-3 h-3" />
              Location
            </Label>
            <Input
              id="task-location"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="Add a location (optional)"
            />
          </div>

          {/* Share toggle */}
          <div className="flex items-center justify-between">
            <Label htmlFor="task-share" className="flex items-center gap-2">
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

        <DialogFooter>
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
