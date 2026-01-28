import { useState, useEffect, useRef, useMemo, useCallback, memo } from 'react';
import { cn } from '@/lib/utils';
import { EnergyLevel } from '@/types';
import { InboxIcon, ChevronRight, ChevronDown, Plus, Search, ChevronUp, AlertTriangle, Check, Calendar, Clock, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import InboxTaskItem from '@/components/tasks/InboxTaskItem';
import { useToast } from '@/hooks/use-toast';
import { useIsMobile } from '@/hooks/use-mobile';
import { useTasksContext, type TaskUpdate } from '@/contexts/TasksContext';
import { useContainerSize } from '@/hooks/useContainerSize';

import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Calendar as CalendarPicker } from '@/components/ui/calendar';
import { format } from 'date-fns';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface UnscheduledTasksProps {
  energyFilter: EnergyLevel[];
  onScheduleTask: (taskId: string, date: Date) => void;
}

// Smart grid: show complete rows only (accounting for new task input taking 1 slot)
const ROWS_MOBILE = 4;
const ROWS_TABLET = 3;
const ROWS_DESKTOP = 3;

const UnscheduledTasks = memo(({ energyFilter }: UnscheduledTasksProps) => {
  const { inboxTasks: tasks, loading, addInboxTask, updateTask, deleteTask } = useTasksContext();
  const [collapsed, setCollapsed] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearch, setShowSearch] = useState(false);

  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [defaultInboxEnergy, setDefaultInboxEnergy] = useState<EnergyLevel>('high');
  const [selectedEnergy, setSelectedEnergy] = useState<EnergyLevel | null>(null);
  const [energyPickerOpen, setEnergyPickerOpen] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>();
  const [selectedStartTime, setSelectedStartTime] = useState<string>('');
  const [selectedEndTime, setSelectedEndTime] = useState<string>('');
  const newTaskInputRef = useRef<HTMLInputElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const TIME_OPTIONS = useMemo(() => Array.from({ length: 32 }, (_, i) => {
    const hour = Math.floor(i / 2) + 6;
    const minute = (i % 2) * 30;
    return `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
  }), []);
  const isMobile = useIsMobile();

  // tasks already scoped to inboxTasks from context

  // Fetch user's default inbox energy setting
  useEffect(() => {
    // Stub: use default 'high'
    setDefaultInboxEnergy('high');
  }, []);

  // Responsive columns and max visible tasks
  const { ref: containerRef, width: containerWidth } = useContainerSize<HTMLDivElement>();

  // Calculate columns and max visible to fill complete rows
  const { columns, maxVisible } = useMemo(() => {
    let cols: number;
    let rows: number;

    if (containerWidth >= 1536) {
      cols = 3;
      rows = ROWS_DESKTOP;
    } else if (containerWidth >= 1024) {
      cols = 2;
      rows = ROWS_TABLET;
    } else {
      cols = 1;
      rows = ROWS_MOBILE;
    }

    // Total slots minus 1 for the new task input
    const totalSlots = cols * rows;
    const maxTasks = totalSlots - 1;

    return { columns: cols, maxVisible: maxTasks };
  }, [containerWidth]);

  useEffect(() => {
    if (showSearch && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [showSearch]);

  const handleScheduleTask = useCallback(async (
    taskId: string,
    dueDate: string,
    startTime?: string,
    endTime?: string
  ) => {
    const updates: TaskUpdate = { due_date: dueDate };

    if (startTime !== undefined) {
      if (startTime === 'none' || startTime === '') {
        updates.start_time = null;
        updates.end_time = null;
      } else {
        updates.start_time = startTime;
      }
    }

    if (endTime !== undefined && startTime !== 'none' && startTime !== '') {
      updates.end_time = endTime === 'none' || endTime === '' ? null : endTime;
    }

    await updateTask(taskId, updates);
  }, [updateTask]);

  const handleEnergyChange = useCallback(async (taskId: string, energy: EnergyLevel) => {
    await updateTask(taskId, { energy_level: energy });
  }, [updateTask]);

  const handleTitleChange = useCallback(async (taskId: string, title: string) => {
    await updateTask(taskId, { title });
  }, [updateTask]);

  const handleDeleteTask = useCallback(async (taskId: string) => {
    const success = await deleteTask(taskId);
    if (success) {
      toast({ title: 'Deleted', description: 'Task removed from inbox' });
    } else {
      toast({ title: 'Error', description: 'Could not delete task', variant: 'destructive' });
    }
  }, [deleteTask, toast]);

  const createNewTask = useCallback(async (withSchedule = false) => {
    const title = newTaskTitle.trim();
    if (!title) return;

    const energy = selectedEnergy || defaultInboxEnergy;
    const dueDate = withSchedule && selectedDate ? format(selectedDate, 'yyyy-MM-dd') : null;
    const startTime = withSchedule && selectedStartTime && selectedStartTime !== 'none' ? selectedStartTime : null;
    const endTime = withSchedule && selectedEndTime && selectedEndTime !== 'none' ? selectedEndTime : null;

    await addInboxTask({
      title,
      energy_level: energy,
      due_date: dueDate,
      start_time: startTime,
      end_time: endTime,
      completed: false,
      detected_from_brain_dump: false,
    });

    setNewTaskTitle('');
    setSelectedEnergy(null);
    setSelectedDate(undefined);
    setSelectedStartTime('');
    setSelectedEndTime('');
    setShowDatePicker(false);
  }, [newTaskTitle, addInboxTask, defaultInboxEnergy, selectedEnergy, selectedDate, selectedStartTime, selectedEndTime]);

  const energyFilteredTasks = useMemo(() =>
    energyFilter.length > 0
      ? tasks.filter(t => energyFilter.includes(t.energy_level))
      : tasks,
    [tasks, energyFilter]
  );

  const filteredTasks = useMemo(() => {
    if (!searchQuery.trim()) return energyFilteredTasks;
    const query = searchQuery.toLowerCase();
    return energyFilteredTasks.filter(t =>
      t.title.toLowerCase().includes(query) ||
      t.description?.toLowerCase().includes(query)
    );
  }, [energyFilteredTasks, searchQuery]);

  const visibleTasks = useMemo(() =>
    expanded ? filteredTasks : filteredTasks.slice(0, maxVisible),
    [expanded, filteredTasks, maxVisible]
  );

  const hiddenCount = filteredTasks.length - maxVisible;
  const isOverflowing = filteredTasks.length > maxVisible;

  if (loading) return null;

  const showInbox = filteredTasks.length > 0 || tasks.length === 0;
  if (!showInbox) return null;

  return (
    <div ref={containerRef} className={cn(
      "border-b border-border bg-secondary/30"
    )}>
      <div
        role="button"
        tabIndex={0}
        aria-expanded={!collapsed}
        onClick={() => setCollapsed(!collapsed)}
        className="w-full flex items-center justify-between px-3 sm:px-4 lg:px-6 py-2 lg:py-2.5 hover:bg-secondary/50 transition-colors min-h-[44px] lg:min-h-[48px]"
      >
        <div className="flex items-center gap-2 min-w-0">
          <InboxIcon className="w-4 h-4 text-foreground-muted flex-shrink-0" />
          <span className="text-sm font-medium text-foreground">Inbox</span>
          {filteredTasks.length > 0 && (
            <span className={cn(
              "text-xs px-2 py-0.5 rounded-full flex-shrink-0",
              isOverflowing
                ? "bg-highlight-muted text-highlight-foreground"
                : "bg-secondary text-foreground-muted"
            )}>
              {filteredTasks.length}
              {isOverflowing && !expanded && (
                <AlertTriangle className="w-3 h-3 inline ml-1 -mt-0.5" />
              )}
            </span>
          )}
          {!isMobile && (
            <span className="text-xs text-foreground-muted opacity-60 hidden lg:inline">
              • Drag tasks to calendar
            </span>
          )}
        </div>

        <div className="flex items-center gap-1 flex-shrink-0">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 opacity-60 hover:opacity-100 hover:bg-secondary"
            onClick={(e) => {
              e.stopPropagation();
              setShowSearch(v => !v);
              if (showSearch) setSearchQuery('');
            }}
            title="Search inbox"
          >
            <Search className={cn("w-4 h-4", showSearch && "text-primary")} />
          </Button>

          {collapsed ? (
            <ChevronRight className="w-4 h-4 text-foreground-muted" />
          ) : (
            <ChevronDown className="w-4 h-4 text-foreground-muted" />
          )}
        </div>
      </div>

      {!collapsed && (
        <div className="px-3 sm:px-4 lg:px-6 pb-3 lg:pb-4 space-y-2">
          {showSearch && (
            <div className="relative max-w-md">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-foreground-muted" />
              <input
                ref={searchInputRef}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Filter tasks..."
                className="w-full pl-9 pr-3 py-2 rounded-lg bg-card border border-border text-sm text-foreground placeholder:text-foreground-muted/60 focus:outline-none focus:ring-2 focus:ring-primary/50 min-h-[44px]"
                onClick={(e) => e.stopPropagation()}
              />
            </div>
          )}

          <div
            className={cn(
              "grid gap-2",
              columns === 3 ? "grid-cols-3" : columns === 2 ? "grid-cols-2" : "grid-cols-1"
            )}
          >
            <div className="flex flex-col sm:flex-row sm:items-center gap-2 p-2.5 rounded-lg bg-card border border-border hover:border-highlight focus-within:border-highlight transition-colors min-h-[48px] group">
              <div className="flex items-center gap-2 min-w-0 w-full">
                <Plus className="w-4 h-4 text-foreground-muted group-focus-within:text-highlight flex-shrink-0 transition-colors" />
                <input
                  ref={newTaskInputRef}
                  value={newTaskTitle}
                  onChange={(e) => setNewTaskTitle(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') createNewTask(false);
                    if (e.key === 'Escape') {
                      setNewTaskTitle('');
                      setSelectedEnergy(null);
                      newTaskInputRef.current?.blur();
                    }
                  }}
                  placeholder="New task…"
                  className="w-full sm:flex-1 bg-transparent border-none outline-none text-sm text-foreground placeholder:text-foreground-muted/60 focus:ring-0 focus:outline-none p-0 min-w-0"
                />
              </div>

              <div className="flex items-center gap-1.5 flex-wrap w-full sm:w-auto justify-end">
                <Popover open={energyPickerOpen} onOpenChange={setEnergyPickerOpen}>
                  <PopoverTrigger asChild>
                    <button
                      className="w-8 h-8 rounded-full flex items-center justify-center transition-all hover:bg-foreground/5 flex-shrink-0"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <span
                        className={cn(
                          "w-3 h-3 rounded-full transition-colors",
                          (selectedEnergy || defaultInboxEnergy) === 'high' && "bg-energy-high",
                          (selectedEnergy || defaultInboxEnergy) === 'medium' && "bg-energy-medium",
                          (selectedEnergy || defaultInboxEnergy) === 'low' && "bg-energy-low",
                          (selectedEnergy || defaultInboxEnergy) === 'recovery' && "bg-energy-recovery"
                        )}
                      />
                    </button>
                  </PopoverTrigger>
                  <PopoverContent className="w-40 p-1" align="end" onClick={(e) => e.stopPropagation()}>
                    <div className="space-y-0.5">
                      {([
                        { value: 'high' as EnergyLevel, label: 'High Focus', color: 'bg-energy-high' },
                        { value: 'medium' as EnergyLevel, label: 'Steady', color: 'bg-energy-medium' },
                        { value: 'low' as EnergyLevel, label: 'Low Energy', color: 'bg-energy-low' },
                        { value: 'recovery' as EnergyLevel, label: 'Recovery', color: 'bg-energy-recovery' },
                      ] as const).map((option) => (
                        <button
                          key={option.value}
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedEnergy(option.value);
                            setEnergyPickerOpen(false);
                          }}
                          className={cn(
                            "w-full flex items-center gap-2 px-2 py-1.5 rounded text-sm hover:bg-secondary transition-colors",
                            (selectedEnergy || defaultInboxEnergy) === option.value && "bg-secondary"
                          )}
                        >
                          <span className={cn("w-3 h-3 rounded-full", option.color)} />
                          <span>{option.label}</span>
                          {(selectedEnergy || defaultInboxEnergy) === option.value && (
                            <Check className="w-3 h-3 ml-auto text-primary" />
                          )}
                        </button>
                      ))}
                    </div>
                  </PopoverContent>
                </Popover>

                <Popover open={showDatePicker} onOpenChange={setShowDatePicker}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className={cn(
                        "h-8 w-8 p-0 flex-shrink-0 transition-colors",
                        selectedDate ? "text-highlight bg-highlight/10" : "text-foreground-muted hover:text-foreground"
                      )}
                      onClick={(e) => {
                        e.stopPropagation();
                        if (selectedDate) {
                          e.preventDefault();
                          setSelectedDate(undefined);
                          setSelectedStartTime('');
                          setSelectedEndTime('');
                          setShowDatePicker(false);
                        }
                      }}
                    >
                      <Calendar className="w-4 h-4" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-3 space-y-3" align="end" onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-foreground">Schedule Task</span>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0"
                        onClick={() => {
                          setSelectedDate(undefined);
                          setSelectedStartTime('');
                          setSelectedEndTime('');
                          setShowDatePicker(false);
                        }}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>

                  <CalendarPicker
                    mode="single"
                    selected={selectedDate}
                    onSelect={setSelectedDate}
                    className="pointer-events-auto"
                  />
                  <div className="flex gap-2">
                    <div className="flex-1">
                      <label className="text-xs text-foreground-muted mb-1 block">
                        <Clock className="w-3 h-3 inline mr-1" />
                        Start
                      </label>
                      <Select value={selectedStartTime} onValueChange={setSelectedStartTime}>
                        <SelectTrigger className="h-9 text-xs">
                          <SelectValue placeholder="Time" />
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
                      <Select value={selectedEndTime} onValueChange={setSelectedEndTime}>
                        <SelectTrigger className="h-9 text-xs">
                          <SelectValue placeholder="Time" />
                        </SelectTrigger>
                        <SelectContent className="max-h-48">
                          <SelectItem value="none">No time</SelectItem>
                          {TIME_OPTIONS.filter(t => !selectedStartTime || selectedStartTime === 'none' || t > selectedStartTime).map((time) => (
                            <SelectItem key={time} value={time}>
                              {format(new Date(`2000-01-01T${time}`), 'h:mm a')}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  {/* Confirm button */}
                  <Button
                    size="sm"
                    className="w-full h-9 gap-1.5"
                    onClick={() => setShowDatePicker(false)}
                    disabled={!selectedDate}
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span className="text-xs">Confirm</span>
                  </Button>
                  </PopoverContent>
                </Popover>

                {newTaskTitle.trim() && (
                  <Button
                    size="sm"
                    className="h-8 px-3 gap-1.5 w-full sm:w-auto"
                    onClick={(e) => {
                      e.stopPropagation();
                      createNewTask(!!selectedDate);
                    }}
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span className="text-xs">{selectedDate ? 'Schedule' : 'Add'}</span>
                  </Button>
                )}
              </div>
            </div>

            {visibleTasks.map(task => (
              <InboxTaskItem
                key={task.id}
                task={task}
                fromZone="inbox"
                onSchedule={handleScheduleTask}
                onEnergyChange={handleEnergyChange}
                onTitleChange={handleTitleChange}
                onDelete={handleDeleteTask}
              />
            ))}
          </div>

          {isOverflowing && (
            <button
              onClick={() => setExpanded(v => !v)}
              className="w-full flex items-center justify-center gap-1 py-2 text-xs text-highlight hover:text-highlight/80 transition-colors"
            >
              {expanded ? (
                <>
                  <ChevronUp className="w-3.5 h-3.5" />
                  <span>Show less</span>
                </>
              ) : (
                <>
                  <span>+{hiddenCount} more · clean your inbox</span>
                  <ChevronDown className="w-3.5 h-3.5" />
                </>
              )}
            </button>
          )}
        </div>
      )}
    </div>
  );
});

UnscheduledTasks.displayName = 'UnscheduledTasks';

export default UnscheduledTasks;
