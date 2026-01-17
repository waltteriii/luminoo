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
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Calendar as CalendarIcon, Clock, MapPin, Users, Trash2 } from 'lucide-react';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import EnergyPill from '@/components/shared/EnergyPill';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';

interface EditTaskDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  task: Task | null;
  onSave: (taskId: string, updates: Partial<Task>) => void;
  onDelete?: (taskId: string) => void;
}

const TIME_OPTIONS = Array.from({ length: 32 }, (_, i) => {
  const hour = Math.floor(i / 2) + 6;
  const minute = (i % 2) * 30;
  return `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
});

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
  const [startTime, setStartTime] = useState('none');
  const [endTime, setEndTime] = useState('none');
  const [location, setLocation] = useState('');
  const [isShared, setIsShared] = useState(false);

  useEffect(() => {
    if (open && task) {
      setTitle(task.title);
      setDescription(task.description || '');
      setEnergy(task.energy_level);
      setDueDate(task.due_date ? new Date(task.due_date) : undefined);
      setStartTime(task.start_time || 'none');
      setEndTime(task.end_time || 'none');
      setLocation(task.location || '');
      setIsShared(task.is_shared || false);
    }
  }, [open, task]);

  const handleSave = () => {
    if (!task || !title.trim()) return;
    
    const updates: Partial<Task> = {
      title: title.trim(),
      description: description.trim() || null,
      energy_level: energy,
      due_date: dueDate ? format(dueDate, 'yyyy-MM-dd') : null,
      start_time: startTime !== 'none' ? startTime : null,
      end_time: endTime !== 'none' ? endTime : null,
      location: location.trim() || null,
      is_shared: isShared,
    };
    
    onSave(task.id, updates);
    onOpenChange(false);
  };

  const handleDelete = () => {
    if (task && onDelete) {
      onDelete(task.id);
      onOpenChange(false);
    }
  };

  if (!task) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Edit Task</DialogTitle>
          <DialogDescription>
            Update task details and scheduling
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4 max-h-[60vh] overflow-y-auto">
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
              className="min-h-[80px]"
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
          <div className="space-y-2">
            <Label className="flex items-center gap-1">
              <CalendarIcon className="w-3 h-3" />
              Due Date
            </Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-full justify-start text-left font-normal">
                  {dueDate ? format(dueDate, 'PPP') : 'Pick a date'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={dueDate}
                  onSelect={setDueDate}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* Time selection */}
          <div className="flex gap-3">
            <div className="flex-1">
              <Label className="flex items-center gap-1 mb-2">
                <Clock className="w-3 h-3" />
                Start time
              </Label>
              <Select value={startTime} onValueChange={setStartTime}>
                <SelectTrigger>
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
              <Label className="mb-2 block">End time</Label>
              <Select value={endTime} onValueChange={setEndTime}>
                <SelectTrigger>
                  <SelectValue placeholder="Select time" />
                </SelectTrigger>
                <SelectContent className="max-h-48">
                  <SelectItem value="none">No specific time</SelectItem>
                  {TIME_OPTIONS.filter(t => startTime === 'none' || t > startTime).map((time) => (
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
            <Label htmlFor="edit-location" className="flex items-center gap-1">
              <MapPin className="w-3 h-3" />
              Location
            </Label>
            <Input
              id="edit-location"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="Add a location (optional)"
            />
          </div>

          {/* Share toggle */}
          <div className="flex items-center justify-between">
            <Label htmlFor="edit-share" className="flex items-center gap-2">
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

        <DialogFooter className="flex-col sm:flex-row gap-2">
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
