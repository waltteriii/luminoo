import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { EnergyLevel } from '@/types';
import EnergyPill from '@/components/shared/EnergyPill';

interface CreateTaskDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  targetDate: Date;
  startTime?: string;
  endTime?: string;
  defaultEnergy?: EnergyLevel;
  onConfirm: (title: string, energy: EnergyLevel, startTime?: string, endTime?: string) => void;
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
  const [energy, setEnergy] = useState<EnergyLevel>(defaultEnergy);
  const [localStartTime, setLocalStartTime] = useState(startTime || '');
  const [localEndTime, setLocalEndTime] = useState(endTime || '');

  const handleConfirm = () => {
    if (!title.trim()) return;
    
    onConfirm(title.trim(), energy, localStartTime, localEndTime);
    setTitle('');
    setEnergy(defaultEnergy);
    onOpenChange(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && title.trim()) {
      handleConfirm();
    }
  };

  // Update local times when props change
  if (startTime !== localStartTime && startTime) {
    setLocalStartTime(startTime);
  }
  if (endTime !== localEndTime && endTime) {
    setLocalEndTime(endTime);
  }

  const formatTimeDisplay = (time: string) => {
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
          <div className="flex items-center gap-2 text-sm text-foreground-muted">
            <span>Time:</span>
            <span className="font-medium text-foreground">
              {localStartTime && formatTimeDisplay(localStartTime)}
              {localEndTime && ` - ${formatTimeDisplay(localEndTime)}`}
            </span>
          </div>

          {/* Task title */}
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="What do you want to do?"
            autoFocus
            className="text-base"
          />

          {/* Energy selector */}
          <div className="flex items-center gap-2">
            <span className="text-sm text-foreground-muted">Energy:</span>
            <div className="flex gap-1">
              {(['high', 'medium', 'low', 'recovery'] as EnergyLevel[]).map((e) => (
                <button
                  key={e}
                  onClick={() => setEnergy(e)}
                  className={`transition-transform ${energy === e ? 'scale-110 ring-2 ring-primary ring-offset-2 rounded-full' : 'opacity-60 hover:opacity-100'}`}
                >
                  <EnergyPill energy={e} />
                </button>
              ))}
            </div>
          </div>

          {/* Time adjustment */}
          <div className="flex gap-2">
            <div className="flex-1">
              <label className="text-xs text-foreground-muted mb-1 block">Start</label>
              <Input
                type="time"
                value={localStartTime}
                onChange={(e) => setLocalStartTime(e.target.value)}
                className="h-9"
              />
            </div>
            <div className="flex-1">
              <label className="text-xs text-foreground-muted mb-1 block">End</label>
              <Input
                type="time"
                value={localEndTime}
                onChange={(e) => setLocalEndTime(e.target.value)}
                className="h-9"
              />
            </div>
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
