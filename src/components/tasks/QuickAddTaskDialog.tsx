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
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { ScrollArea } from '@/components/ui/scroll-area';
import { EnergyLevel } from '@/types';
import EnergyPill from '@/components/shared/EnergyPill';
import TaskTimeSelector from './TaskTimeSelector';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Calendar as CalendarPicker } from '@/components/ui/calendar';
import { Calendar, CalendarDays, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';

interface QuickAddTaskDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
  defaultEnergy?: EnergyLevel;
}

const QuickAddTaskDialog = ({
  open,
  onOpenChange,
  userId,
  defaultEnergy = 'medium',
}: QuickAddTaskDialogProps) => {
  const [title, setTitle] = useState('');
  const [energy, setEnergy] = useState<EnergyLevel>(defaultEnergy);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>();
  const [endDate, setEndDate] = useState<Date | undefined>();
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('10:00');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [useTime, setUseTime] = useState(false);
  const [isMultiDay, setIsMultiDay] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (open) {
      setEnergy(defaultEnergy);
      setTitle('');
      setSelectedDate(undefined);
      setEndDate(undefined);
      setStartTime('09:00');
      setEndTime('10:00');
      setUseTime(false);
      setIsMultiDay(false);
    }
  }, [open, defaultEnergy]);

  const handleConfirm = async () => {
    if (!title.trim()) return;

    setIsSubmitting(true);
    try {
      const { error } = await supabase.from('tasks').insert({
        user_id: userId,
        title: title.trim(),
        energy_level: energy,
        due_date: selectedDate ? format(selectedDate, 'yyyy-MM-dd') : null,
        end_date: isMultiDay && endDate ? format(endDate, 'yyyy-MM-dd') : null,
        start_time: selectedDate && useTime ? startTime : null,
        end_time: selectedDate && useTime ? endTime : null,
      });

      if (error) throw error;

      toast({
        title: 'Task created',
        description: selectedDate ? `Scheduled for ${format(selectedDate, 'MMM d')}` : 'Added to inbox',
      });

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

  // Calculate duration for multi-day tasks
  const durationText = isMultiDay && selectedDate && endDate
    ? `${differenceInDays(endDate, selectedDate) + 1} days`
    : null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md p-0 gap-0 overflow-hidden">
        <DialogHeader className="px-6 pt-6 pb-4">
          <DialogTitle className="flex items-center gap-2">
            <Plus className="w-5 h-5 text-primary" />
            Add Task
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="max-h-[60vh] px-6">
          <div className="space-y-5 pb-6">
            {/* Task title */}
            <div className="space-y-2">
              <Label htmlFor="quick-title" className="text-foreground-muted">Task Name</Label>
              <Input
                id="quick-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="What do you want to do?"
                autoFocus
                className="text-base focus:ring-1 focus:ring-primary/30 focus:border-primary/50 transition-all"
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

            {/* Date picker */}
            <div className="space-y-2">
              <Label className="text-foreground-muted">When</Label>
              <div className="flex gap-2 items-center">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="flex-1 justify-start text-left font-normal h-10">
                      <Calendar className="w-4 h-4 mr-2 opacity-50" />
                      {selectedDate ? format(selectedDate, 'MMM d, yyyy') : 'Pick date (optional)'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <CalendarPicker
                      mode="single"
                      selected={selectedDate}
                      onSelect={(d) => {
                        setSelectedDate(d);
                        if (d && endDate && isBefore(endDate, d)) {
                          setEndDate(d);
                        }
                      }}
                      initialFocus
                      className="pointer-events-auto"
                    />
                  </PopoverContent>
                </Popover>
                {selectedDate && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setSelectedDate(undefined);
                      setEndDate(undefined);
                      setIsMultiDay(false);
                      setUseTime(false);
                    }}
                  >
                    Clear
                  </Button>
                )}
              </div>
            </div>

            {/* Multi-day option (only if date selected) */}
            {selectedDate && (
              <>
                <div className="flex items-center justify-between py-1">
                  <Label htmlFor="quick-multi-day" className="flex items-center gap-2 text-foreground-muted cursor-pointer">
                    <CalendarDays className="w-4 h-4" />
                    Multi-day task
                  </Label>
                  <Switch
                    id="quick-multi-day"
                    checked={isMultiDay}
                    onCheckedChange={(checked) => {
                      setIsMultiDay(checked);
                      if (checked && !endDate) {
                        setEndDate(selectedDate);
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
                          <Calendar className="w-4 h-4 mr-2 opacity-50" />
                          {endDate ? format(endDate, 'PPP') : 'Pick end date'}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <CalendarPicker
                          mode="single"
                          selected={endDate}
                          onSelect={setEndDate}
                          disabled={(date) => selectedDate ? isBefore(date, selectedDate) : false}
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

                {/* Time selector */}
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
              </>
            )}
          </div>
        </ScrollArea>

        <DialogFooter className="px-6 py-4 border-t border-border bg-background">
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
