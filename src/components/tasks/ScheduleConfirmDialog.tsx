import { useState } from 'react';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Calendar, Clock } from 'lucide-react';
import EnergyPill from '@/components/shared/EnergyPill';

interface ScheduleConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  task: Task | null;
  targetDate: Date | null;
  targetHour?: number;
  onConfirm: (taskId: string, date: string, startTime?: string, endTime?: string) => void;
}

const TIME_OPTIONS = Array.from({ length: 32 }, (_, i) => {
  const hour = Math.floor(i / 2) + 6;
  const minute = (i % 2) * 30;
  return `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
});

const ScheduleConfirmDialog = ({
  open,
  onOpenChange,
  task,
  targetDate,
  targetHour,
  onConfirm,
}: ScheduleConfirmDialogProps) => {
  const defaultStartTime = targetHour !== undefined 
    ? `${targetHour.toString().padStart(2, '0')}:00` 
    : '';
  const defaultEndTime = targetHour !== undefined 
    ? `${(targetHour + 1).toString().padStart(2, '0')}:00` 
    : '';

  const [startTime, setStartTime] = useState(defaultStartTime);
  const [endTime, setEndTime] = useState(defaultEndTime);

  // Reset times when dialog opens with new values
  useState(() => {
    if (open && targetHour !== undefined) {
      setStartTime(`${targetHour.toString().padStart(2, '0')}:00`);
      setEndTime(`${(targetHour + 1).toString().padStart(2, '0')}:00`);
    }
  });

  const handleConfirm = () => {
    if (task && targetDate) {
      onConfirm(
        task.id,
        format(targetDate, 'yyyy-MM-dd'),
        startTime && startTime !== 'none' ? startTime : undefined,
        endTime && endTime !== 'none' ? endTime : undefined
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
          {/* Task preview */}
          <div className="p-3 rounded-lg bg-secondary flex items-center gap-3">
            <span className="flex-1 font-medium">{task.title}</span>
            <EnergyPill energy={task.energy_level} />
          </div>

          {/* Time selection */}
          <div className="flex gap-3">
            <div className="flex-1">
              <label className="text-sm text-foreground-muted mb-2 block flex items-center gap-1">
                <Clock className="w-3 h-3" />
                Start time
              </label>
              <Select value={startTime} onValueChange={setStartTime}>
                <SelectTrigger>
                  <SelectValue placeholder="Select start time" />
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
              <label className="text-sm text-foreground-muted mb-2 block">
                End time
              </label>
              <Select value={endTime} onValueChange={setEndTime}>
                <SelectTrigger>
                  <SelectValue placeholder="Select end time" />
                </SelectTrigger>
                <SelectContent className="max-h-48">
                  <SelectItem value="none">No specific time</SelectItem>
                  {TIME_OPTIONS.filter(t => !startTime || startTime === 'none' || t > startTime).map((time) => (
                    <SelectItem key={time} value={time}>
                      {format(new Date(`2000-01-01T${time}`), 'h:mm a')}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleConfirm}>
            Schedule Task
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ScheduleConfirmDialog;