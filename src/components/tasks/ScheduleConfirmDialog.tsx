import { useState, useEffect } from 'react';
import { format } from 'date-fns';
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
import { Calendar, MapPin, Users } from 'lucide-react';
import EnergyPill from '@/components/shared/EnergyPill';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import TimeRangeSlider from './TimeRangeSlider';

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
    updates?: { title?: string; energy_level?: EnergyLevel; location?: string; is_shared?: boolean }
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
  const [startTime, setStartTime] = useState('none');
  const [endTime, setEndTime] = useState('none');
  const [title, setTitle] = useState('');
  const [energy, setEnergy] = useState<EnergyLevel>('medium');
  const [location, setLocation] = useState('');
  const [isShared, setIsShared] = useState(false);

  // Reset state when dialog opens with new task/values
  useEffect(() => {
    if (open && task) {
      setTitle(task.title);
      setEnergy(task.energy_level);
      setLocation(task.location || '');
      setIsShared(task.is_shared || false);

      const normalizeTime = (t: string | null | undefined) => {
        if (!t) return null;
        // Handles both HH:MM and HH:MM:SS
        return t.slice(0, 5);
      };

      const taskStart = normalizeTime(task.start_time);
      const taskEnd = normalizeTime(task.end_time);

      if (targetHour !== undefined) {
        setStartTime(`${targetHour.toString().padStart(2, '0')}:00`);
        setEndTime(`${(targetHour + 1).toString().padStart(2, '0')}:00`);
      } else if (taskStart && taskEnd) {
        setStartTime(taskStart);
        setEndTime(taskEnd);
      } else if (taskStart && !taskEnd) {
        setStartTime(taskStart);
        const [h, m] = taskStart.split(':').map(Number);
        const endH = Math.min(22, h + 1);
        setEndTime(`${endH.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`);
      } else {
        // Default to a visible time range (matches what the slider shows)
        setStartTime('09:00');
        setEndTime('10:00');
      }
    }
  }, [open, task, targetHour]);

  const handleConfirm = () => {
    if (task && targetDate) {
      const updates: { title?: string; energy_level?: EnergyLevel; location?: string; is_shared?: boolean } = {};
      
      if (title !== task.title) updates.title = title;
      if (energy !== task.energy_level) updates.energy_level = energy;
      if (location !== (task.location || '')) updates.location = location || undefined;
      if (isShared !== task.is_shared) updates.is_shared = isShared;
      
      onConfirm(
        task.id,
        format(targetDate, 'yyyy-MM-dd'),
        startTime && startTime !== 'none' ? startTime : undefined,
        endTime && endTime !== 'none' ? endTime : undefined,
        Object.keys(updates).length > 0 ? updates : undefined
      );
      onOpenChange(false);
    }
  };

  if (!task || !targetDate) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            Schedule Task
          </DialogTitle>
          <DialogDescription>
            Add this task to {format(targetDate, 'EEEE, MMMM d, yyyy')}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Editable task title */}
          <div className="space-y-2">
            <Label htmlFor="task-title">Task</Label>
            <Input
              id="task-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Task title"
            />
          </div>

          {/* Energy level selector */}
          <div className="space-y-2">
            <Label>Energy Level</Label>
            <div className="flex gap-2">
              {(['high', 'medium', 'low', 'recovery'] as EnergyLevel[]).map((e) => (
                <button
                  key={e}
                  onClick={() => setEnergy(e)}
                  className={`transition-all ${energy === e ? 'ring-2 ring-primary ring-offset-2 ring-offset-background rounded-full' : 'opacity-60 hover:opacity-100'}`}
                >
                  <EnergyPill energy={e} />
                </button>
              ))}
            </div>
          </div>

          {/* Time selection - Visual slider */}
          <div className="space-y-2">
            <Label>Time</Label>
            <TimeRangeSlider
              startTime={startTime === 'none' ? '09:00' : startTime}
              endTime={endTime === 'none' ? '10:00' : endTime}
              onStartTimeChange={setStartTime}
              onEndTimeChange={setEndTime}
            />
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
            <Label htmlFor="share-task" className="flex items-center gap-2">
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

        <DialogFooter>
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
