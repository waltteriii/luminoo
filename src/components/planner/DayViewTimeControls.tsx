import { memo, useState, useCallback } from 'react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Clock, Sun, Moon, Layers, Settings2, RotateCcw } from 'lucide-react';
import { useDensity } from '@/contexts/DensityContext';
import {
  DayViewLayout,
  TimeRangeMode,
  formatHourLabel,
  getEffectiveFocusTimes,
  DayTimeOverride,
} from '@/lib/timeRangeConfig';

interface DayViewTimeControlsProps {
  date: Date;
  className?: string;
}

const hourOptions = Array.from({ length: 24 }, (_, i) => ({
  value: i,
  label: formatHourLabel(i),
}));
// Add midnight end option
hourOptions.push({ value: 24, label: '12 AM (end)' });

const DayViewTimeControls = memo(({ date, className }: DayViewTimeControlsProps) => {
  const { timeRangeSettings, updateTimeRangeSetting, setTimeRangeSettings } = useDensity();
  const [popoverOpen, setPopoverOpen] = useState(false);
  
  const dateStr = format(date, 'yyyy-MM-dd');
  const hasCustomHours = dateStr in timeRangeSettings.perDayOverrides;
  const effectiveTimes = getEffectiveFocusTimes(timeRangeSettings, dateStr);
  
  const isFocusMode = timeRangeSettings.dayTimeRangeMode === 'FOCUS';

  const layoutOptions: { value: DayViewLayout; label: string; icon: React.ReactNode }[] = [
    { value: 'BOTH', label: 'Day + Night', icon: <Layers className="w-3 h-3" /> },
    { value: 'DAY_ONLY', label: 'Day Only', icon: <Sun className="w-3 h-3" /> },
    { value: 'NIGHT_ONLY', label: 'Night Only', icon: <Moon className="w-3 h-3" /> },
  ];

  const handleToggleCustomHours = useCallback((enabled: boolean) => {
    if (enabled) {
      // Enable custom hours for this day with current defaults
      const newOverrides = {
        ...timeRangeSettings.perDayOverrides,
        [dateStr]: {
          focusStartTime: timeRangeSettings.focusStartTime,
          focusEndTime: timeRangeSettings.focusEndTime,
        },
      };
      setTimeRangeSettings({
        ...timeRangeSettings,
        perDayOverrides: newOverrides,
      });
    } else {
      // Remove custom hours for this day
      const { [dateStr]: removed, ...rest } = timeRangeSettings.perDayOverrides;
      setTimeRangeSettings({
        ...timeRangeSettings,
        perDayOverrides: rest,
      });
    }
  }, [dateStr, timeRangeSettings, setTimeRangeSettings]);

  const updateDayOverride = useCallback((key: keyof DayTimeOverride, value: number) => {
    if (!hasCustomHours) return;
    const newOverrides = {
      ...timeRangeSettings.perDayOverrides,
      [dateStr]: {
        ...timeRangeSettings.perDayOverrides[dateStr],
        [key]: value,
      },
    };
    setTimeRangeSettings({
      ...timeRangeSettings,
      perDayOverrides: newOverrides,
    });
  }, [dateStr, hasCustomHours, timeRangeSettings, setTimeRangeSettings]);

  const handleResetToDefault = useCallback(() => {
    const { [dateStr]: removed, ...rest } = timeRangeSettings.perDayOverrides;
    setTimeRangeSettings({
      ...timeRangeSettings,
      perDayOverrides: rest,
    });
  }, [dateStr, timeRangeSettings, setTimeRangeSettings]);

  return (
    <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className={cn(
            "gap-1.5 h-8 px-2.5",
            hasCustomHours && "border-highlight text-highlight-foreground",
            className
          )}
        >
          <Settings2 className="w-3.5 h-3.5" />
          <span className="hidden sm:inline text-xs">
            {hasCustomHours ? 'Custom' : 'Hours'}
          </span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-4" align="end">
        <div className="space-y-4">
          {/* Header */}
          <div>
            <h4 className="text-sm font-medium">Time Display</h4>
            <p className="text-xs text-foreground-muted mt-0.5">
              Quick settings for {format(date, 'MMM d')}
            </p>
          </div>

          {/* Mode Quick Toggle */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock className="w-3.5 h-3.5 text-foreground-muted" />
              <span className="text-sm">24-Hour View</span>
            </div>
            <Switch
              checked={timeRangeSettings.dayTimeRangeMode === 'FULL_24H'}
              onCheckedChange={(checked) => 
                updateTimeRangeSetting('dayTimeRangeMode', checked ? 'FULL_24H' : 'FOCUS')
              }
            />
          </div>

          {/* Focus Mode Options */}
          {isFocusMode && (
            <>
              {/* Layout Toggle */}
              <div className="space-y-2">
                <Label className="text-xs text-foreground-muted">Layout</Label>
                <div className="grid grid-cols-3 gap-1.5">
                  {layoutOptions.map(opt => (
                    <button
                      key={opt.value}
                      onClick={() => updateTimeRangeSetting('dayViewLayout', opt.value)}
                      className={cn(
                        "flex items-center justify-center gap-1 py-1.5 px-2 rounded-md border text-xs transition-all",
                        timeRangeSettings.dayViewLayout === opt.value
                          ? "border-highlight bg-highlight-muted text-highlight-foreground"
                          : "border-border hover:border-foreground-muted/50 text-foreground-muted"
                      )}
                    >
                      {opt.icon}
                      <span className="hidden sm:inline">{opt.label.split(' ')[0]}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Custom Hours Toggle */}
              <div className="space-y-3 pt-2 border-t border-border">
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-sm">Custom hours for this day</Label>
                    <p className="text-[10px] text-foreground-muted">
                      Override default focus hours
                    </p>
                  </div>
                  <Switch
                    checked={hasCustomHours}
                    onCheckedChange={handleToggleCustomHours}
                  />
                </div>

                {hasCustomHours && (
                  <div className="space-y-3 p-3 bg-secondary/50 rounded-lg border border-border/50">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <Label className="text-[10px] text-foreground-muted">Start</Label>
                        <Select
                          value={effectiveTimes.focusStartTime.toString()}
                          onValueChange={(val) => updateDayOverride('focusStartTime', parseInt(val))}
                        >
                          <SelectTrigger className="h-8 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {hourOptions
                              .filter(opt => opt.value < effectiveTimes.focusEndTime && opt.value < 24)
                              .map(opt => (
                                <SelectItem key={opt.value} value={opt.value.toString()}>
                                  {opt.label}
                                </SelectItem>
                              ))
                            }
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-[10px] text-foreground-muted">End</Label>
                        <Select
                          value={effectiveTimes.focusEndTime.toString()}
                          onValueChange={(val) => updateDayOverride('focusEndTime', parseInt(val))}
                        >
                          <SelectTrigger className="h-8 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {hourOptions
                              .filter(opt => opt.value > effectiveTimes.focusStartTime)
                              .map(opt => (
                                <SelectItem key={opt.value} value={opt.value.toString()}>
                                  {opt.label}
                                </SelectItem>
                              ))
                            }
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleResetToDefault}
                      className="w-full h-7 text-xs text-foreground-muted gap-1"
                    >
                      <RotateCcw className="w-3 h-3" />
                      Reset to default
                    </Button>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
});

DayViewTimeControls.displayName = 'DayViewTimeControls';

export default DayViewTimeControls;
