import { memo } from 'react';
import { cn } from '@/lib/utils';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Clock, Sun } from 'lucide-react';
import { useDensity } from '@/contexts/DensityContext';
import {
  TimeRangeMode,
  DayViewLayout,
  getTimeOptions,
} from '@/lib/timeRangeConfig';

const timeOptions = getTimeOptions();

// Only full hour options for cleaner UI
const hourOptions = timeOptions.filter(opt => Number.isInteger(opt.value));

const TimeRangeSettingsSection = memo(() => {
  const { timeRangeSettings, updateTimeRangeSetting } = useDensity();

  const isFocusMode = timeRangeSettings.dayTimeRangeMode === 'FOCUS';

  return (
    <div className="space-y-5">
      {/* Section Header */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <Clock className="w-3.5 h-3.5 text-highlight" />
          <Label className="text-xs font-medium">Day & Night Time Range</Label>
        </div>
        <p className="text-xs text-foreground-muted">
          Configure how your day is displayed in Day and Week views
        </p>
      </div>

      {/* 1) Time Mode Toggle */}
      <div className="space-y-2">
        <Label className="text-xs font-medium">Time Mode</Label>
        <p className="text-xs text-foreground-muted mb-2">
          Choose whether your day shows focus hours or the full 24-hour timeline.
        </p>
        <div className="flex rounded-lg border border-border overflow-hidden">
          <button
            onClick={() => updateTimeRangeSetting('dayTimeRangeMode', 'FOCUS')}
            className={cn(
              "flex-1 py-2.5 px-4 text-sm font-medium transition-colors",
              isFocusMode
                ? "bg-highlight text-highlight-foreground"
                : "bg-secondary hover:bg-secondary/80 text-foreground-muted"
            )}
          >
            Focus Hours
          </button>
          <button
            onClick={() => updateTimeRangeSetting('dayTimeRangeMode', 'FULL_24H')}
            className={cn(
              "flex-1 py-2.5 px-4 text-sm font-medium transition-colors border-l border-border",
              !isFocusMode
                ? "bg-highlight text-highlight-foreground"
                : "bg-secondary hover:bg-secondary/80 text-foreground-muted"
            )}
          >
            Full 24 Hours
          </button>
        </div>
      </div>

      {/* 2) Focus Hours - only visible in Focus mode */}
      {isFocusMode && (
        <>
          <Separator />
          
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Sun className="w-3.5 h-3.5 text-highlight" />
              <Label className="text-xs font-medium">Primary Daytime Hours</Label>
            </div>
            <p className="text-xs text-foreground-muted">
              These hours define your daytime. All other hours are treated as Night.
            </p>
            
            <div className="grid grid-cols-2 gap-4">
              {/* Start Time */}
              <div className="space-y-1.5">
                <Label className="text-[11px] text-foreground-muted">Start Time</Label>
                <Select
                  value={timeRangeSettings.focusStartTime.toString()}
                  onValueChange={(val) => updateTimeRangeSetting('focusStartTime', parseInt(val))}
                >
                  <SelectTrigger className="h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {hourOptions
                      .filter(opt => opt.value < timeRangeSettings.focusEndTime && opt.value < 24)
                      .map(opt => (
                        <SelectItem key={opt.value} value={opt.value.toString()}>
                          {opt.label}
                        </SelectItem>
                      ))
                    }
                  </SelectContent>
                </Select>
              </div>

              {/* End Time */}
              <div className="space-y-1.5">
                <Label className="text-[11px] text-foreground-muted">End Time</Label>
                <Select
                  value={timeRangeSettings.focusEndTime.toString()}
                  onValueChange={(val) => updateTimeRangeSetting('focusEndTime', parseInt(val))}
                >
                  <SelectTrigger className="h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {hourOptions
                      .filter(opt => opt.value > timeRangeSettings.focusStartTime)
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
          </div>

          <Separator />

          {/* 3) Day View Display Mode */}
          <div className="space-y-2">
            <Label className="text-xs font-medium">Day View Display Mode</Label>
            <p className="text-xs text-foreground-muted mb-2">
              Choose what you want to see in Day view.
            </p>
            <div className="flex rounded-lg border border-border overflow-hidden">
              {[
                { value: 'BOTH' as DayViewLayout, label: 'Day + Night' },
                { value: 'DAY_ONLY' as DayViewLayout, label: 'Day only' },
                { value: 'NIGHT_ONLY' as DayViewLayout, label: 'Night only' },
              ].map((option, index) => (
                <button
                  key={option.value}
                  onClick={() => updateTimeRangeSetting('dayViewLayout', option.value)}
                  className={cn(
                    "flex-1 py-2 px-3 text-xs font-medium transition-colors",
                    index > 0 && "border-l border-border",
                    timeRangeSettings.dayViewLayout === option.value
                      ? "bg-highlight text-highlight-foreground"
                      : "bg-secondary hover:bg-secondary/80 text-foreground-muted"
                  )}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>
        </>
      )}

      {/* Week View Mode - separate section */}
      <Separator />
      
      <div className="space-y-2">
        <Label className="text-xs font-medium">Week View Mode</Label>
        <p className="text-xs text-foreground-muted mb-2">
          Same time mode options for Week view.
        </p>
        <div className="flex rounded-lg border border-border overflow-hidden">
          <button
            onClick={() => updateTimeRangeSetting('weekTimeRangeMode', 'FOCUS')}
            className={cn(
              "flex-1 py-2.5 px-4 text-sm font-medium transition-colors",
              timeRangeSettings.weekTimeRangeMode === 'FOCUS'
                ? "bg-highlight text-highlight-foreground"
                : "bg-secondary hover:bg-secondary/80 text-foreground-muted"
            )}
          >
            Focus Hours
          </button>
          <button
            onClick={() => updateTimeRangeSetting('weekTimeRangeMode', 'FULL_24H')}
            className={cn(
              "flex-1 py-2.5 px-4 text-sm font-medium transition-colors border-l border-border",
              timeRangeSettings.weekTimeRangeMode === 'FULL_24H'
                ? "bg-highlight text-highlight-foreground"
                : "bg-secondary hover:bg-secondary/80 text-foreground-muted"
            )}
          >
            Full 24 Hours
          </button>
        </div>
      </div>

      {/* Per-day override hint */}
      <div className="py-3 px-3 bg-secondary/40 rounded-lg border border-border/50">
        <p className="text-xs text-foreground-muted">
          💡 <strong>Tip:</strong> You can customize focus hours for individual days directly in the Day view header.
        </p>
      </div>
    </div>
  );
});

TimeRangeSettingsSection.displayName = 'TimeRangeSettingsSection';

export default TimeRangeSettingsSection;
