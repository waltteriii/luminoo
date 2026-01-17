import { useState, useEffect } from 'react';
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
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Calendar as CalendarPicker } from '@/components/ui/calendar';
import { Calendar, Clock } from 'lucide-react';
import { format } from 'date-fns';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface QuickAddTaskDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
  defaultEnergy?: EnergyLevel;
}

const TIME_OPTIONS = Array.from({ length: 32 }, (_, i) => {
  const hour = Math.floor(i / 2) + 6;
  const minute = (i % 2) * 30;
  return `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
});

const QuickAddTaskDialog = ({
  open,
  onOpenChange,
  userId,
  defaultEnergy = 'medium',
}: QuickAddTaskDialogProps) => {
  const [title, setTitle] = useState('');
  const [energy, setEnergy] = useState<EnergyLevel>(defaultEnergy);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>();
  const [startTime, setStartTime] = useState<string>('');
  const [endTime, setEndTime] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    setEnergy(defaultEnergy);
  }, [defaultEnergy]);

  const handleConfirm = async () => {
    if (!title.trim()) return;
    
    setIsSubmitting(true);
    try {
      const { error } = await supabase.from('tasks').insert({
        user_id: userId,
        title: title.trim(),
        energy_level: energy,
        due_date: selectedDate ? format(selectedDate, 'yyyy-MM-dd') : null,
        start_time: startTime && startTime !== 'none' ? startTime : null,
        end_time: endTime && endTime !== 'none' ? endTime : null,
      });

      if (error) throw error;

      toast({
        title: 'Task created',
        description: selectedDate ? `Scheduled for ${format(selectedDate, 'MMM d')}` : 'Added to inbox',
      });

      setTitle('');
      setEnergy(defaultEnergy);
      setSelectedDate(undefined);
      setStartTime('');
      setEndTime('');
      onOpenChange(false);
    } catch (err) {
      console.error('Create task error:', err);
      toast({
        title: 'Error',
        description: 'Failed to create task',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && title.trim()) {
      handleConfirm();
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add Task</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
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

          {/* Date picker */}
          <div className="flex items-center gap-2">
            <span className="text-sm text-foreground-muted">When:</span>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className="gap-2">
                  <Calendar className="w-4 h-4" />
                  {selectedDate ? format(selectedDate, 'MMM d, yyyy') : 'Pick date (optional)'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <CalendarPicker
                  mode="single"
                  selected={selectedDate}
                  onSelect={setSelectedDate}
                  initialFocus
                  className="pointer-events-auto"
                />
              </PopoverContent>
            </Popover>
            {selectedDate && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedDate(undefined)}
                className="text-xs"
              >
                Clear
              </Button>
            )}
          </div>

          {/* Time selectors (only if date is selected) */}
          {selectedDate && (
            <div className="flex gap-2">
              <div className="flex-1">
                <label className="text-xs text-foreground-muted mb-1 flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  Start
                </label>
                <Select value={startTime} onValueChange={setStartTime}>
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue placeholder="Start time" />
                  </SelectTrigger>
                  <SelectContent className="max-h-48">
                    <SelectItem value="none">No time</SelectItem>
                    {TIME_OPTIONS.map((time) => (
                      <SelectItem key={time} value={time}>
                        {format(new Date(`2000-01-01T${time}`), 'h:mm a')}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex-1">
                <label className="text-xs text-foreground-muted mb-1 block">End</label>
                <Select value={endTime} onValueChange={setEndTime}>
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue placeholder="End time" />
                  </SelectTrigger>
                  <SelectContent className="max-h-48">
                    <SelectItem value="none">No time</SelectItem>
                    {TIME_OPTIONS.filter(t => !startTime || startTime === 'none' || t > startTime).map((time) => (
                      <SelectItem key={time} value={time}>
                        {format(new Date(`2000-01-01T${time}`), 'h:mm a')}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleConfirm} disabled={!title.trim() || isSubmitting}>
            {selectedDate ? 'Schedule Task' : 'Add to Inbox'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default QuickAddTaskDialog;