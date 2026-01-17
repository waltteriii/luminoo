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
import { MapPin, Users, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

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

const TIME_OPTIONS = Array.from({ length: 32 }, (_, i) => {
  const hour = Math.floor(i / 2) + 6;
  const minute = (i % 2) * 30;
  return `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
});

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
  const [localStartTime, setLocalStartTime] = useState(startTime || '');
  const [localEndTime, setLocalEndTime] = useState(endTime || '');
  const [location, setLocation] = useState('');
  const [isShared, setIsShared] = useState(false);

  // Reset form when dialog opens
  useEffect(() => {
    if (open) {
      setTitle('');
      setDescription('');
      setEnergy(defaultEnergy);
      setLocalStartTime(startTime || '');
      setLocalEndTime(endTime || '');
      setLocation('');
      setIsShared(false);
    }
  }, [open, startTime, endTime, defaultEnergy]);

  const handleConfirm = () => {
    if (!title.trim()) return;
    
    onConfirm(
      title.trim(),
      energy,
      localStartTime || undefined,
      localEndTime || undefined,
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
          {/* Time display */}
          {(localStartTime || localEndTime) && (
            <div className="flex items-center gap-2 text-sm text-foreground-muted">
              <Clock className="w-4 h-4" />
              <span className="font-medium text-foreground">
                {localStartTime && formatTimeDisplay(localStartTime)}
                {localEndTime && ` - ${formatTimeDisplay(localEndTime)}`}
              </span>
              <span className="text-xs">on {format(targetDate, 'MMM d')}</span>
            </div>
          )}

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

          {/* Time adjustment */}
          <div className="flex gap-2">
            <div className="flex-1">
              <Label className="text-xs mb-1 block">Start Time</Label>
              <Select value={localStartTime || 'none'} onValueChange={(v) => setLocalStartTime(v === 'none' ? '' : v)}>
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="Select time" />
                </SelectTrigger>
                <SelectContent className="max-h-48">
                  <SelectItem value="none">No specific time</SelectItem>
                  {TIME_OPTIONS.map((time) => (
                    <SelectItem key={time} value={time}>
                      {format(new Date(`2000-01-01T${time}`), 'h:mm a')}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex-1">
              <Label className="text-xs mb-1 block">End Time</Label>
              <Select value={localEndTime || 'none'} onValueChange={(v) => setLocalEndTime(v === 'none' ? '' : v)}>
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="Select time" />
                </SelectTrigger>
                <SelectContent className="max-h-48">
                  <SelectItem value="none">No specific time</SelectItem>
                  {TIME_OPTIONS.filter(t => !localStartTime || t > localStartTime).map((time) => (
                    <SelectItem key={time} value={time}>
                      {format(new Date(`2000-01-01T${time}`), 'h:mm a')}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

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
