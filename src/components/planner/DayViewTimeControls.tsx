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
import { Clock, RotateCcw, Settings2 } from 'lucide-react';
import { useDensity } from '@/contexts/DensityContext';
import {
  TimeDisplayMode,
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
  const currentDisplayMode = timeRangeSettings.timeDisplayMode || 'BOTH';

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
              {/* Time Display Mode - Day/Night/Both */}
              <div className="space-y-2">
                <Label className="text-xs text-foreground-muted">Time Display</Label>
                <div className="flex rounded-lg border border-border overflow-hidden">
                  {[
                    { value: 'DAY' as TimeDisplayMode, label: 'Day' },
                    { value: 'NIGHT' as TimeDisplayMode, label: 'Night' },
                    { value: 'BOTH' as TimeDisplayMode, label: 'Both' },
                  ].map((option, index) => (
                    <button
                      key={option.value}
                      onClick={() => updateTimeRangeSetting('timeDisplayMode', option.value)}
                      className={cn(
                        "flex-1 py-1.5 px-2 text-xs font-medium transition-colors",
                        index > 0 && "border-l border-border",
                        currentDisplayMode === option.value
                          ? "bg-highlight text-highlight-foreground"
                          : "bg-secondary hover:bg-secondary/80 text-foreground-muted"
                      )}
                    >
                      {option.label}
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
