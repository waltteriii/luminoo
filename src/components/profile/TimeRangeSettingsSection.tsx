import { memo, useMemo } from 'react';
import { cn } from '@/lib/utils';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Clock, Sun, Moon, Layers } from 'lucide-react';
import { useDensity } from '@/contexts/DensityContext';
import {
  TimeRangeMode,
  DayViewLayout,
  formatHourLabel,
  getTimeOptions,
} from '@/lib/timeRangeConfig';

const timeOptions = getTimeOptions();

// Only full hour options for cleaner UI
const hourOptions = timeOptions.filter(opt => Number.isInteger(opt.value));

const TimeRangeSettingsSection = memo(() => {
  const { timeRangeSettings, updateTimeRangeSetting } = useDensity();

  const modeOptions: { value: TimeRangeMode; label: string; description: string; icon: React.ReactNode }[] = [
    { value: 'FOCUS', label: 'Focus Mode', description: 'Show focus hours with collapsible night sections', icon: <Sun className="w-4 h-4" /> },
    { value: 'FULL_24H', label: '24 Hours', description: 'Show all 24 hours expanded', icon: <Clock className="w-4 h-4" /> },
  ];

  const layoutOptions: { value: DayViewLayout; label: string; description: string }[] = [
    { value: 'BOTH', label: 'Day + Night', description: 'Show focus hours and night sections' },
    { value: 'DAY_ONLY', label: 'Day Only', description: 'Hide night sections completely' },
    { value: 'NIGHT_ONLY', label: 'Night Only', description: 'Show only night hours' },
  ];

  const isFocusMode = timeRangeSettings.dayTimeRangeMode === 'FOCUS';

  return (
    <div className="space-y-4">
      {/* Section Header */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <Clock className="w-3.5 h-3.5 text-highlight" />
          <Label className="text-xs font-medium">Time Range Display</Label>
        </div>
        <p className="text-xs text-foreground-muted">
          Configure how hours are displayed in Day and Week views
        </p>
      </div>

      {/* Time Range Mode Toggle */}
      <div className="space-y-2.5">
        <Label className="text-xs font-medium">Day View Mode</Label>
        <div className="grid grid-cols-2 gap-3">
          {modeOptions.map(option => (
            <button
              key={option.value}
              onClick={() => updateTimeRangeSetting('dayTimeRangeMode', option.value)}
              className={cn(
                "flex flex-col items-start gap-2 p-3 rounded-lg border transition-all text-left",
                timeRangeSettings.dayTimeRangeMode === option.value
                  ? "border-highlight bg-highlight-muted"
                  : "border-border hover:border-foreground-muted/50"
              )}
            >
              <div className="flex items-center gap-2">
                <span className={cn(
                  "w-8 h-8 rounded-md flex items-center justify-center",
                  timeRangeSettings.dayTimeRangeMode === option.value 
                    ? "bg-highlight/20 text-highlight-foreground" 
                    : "bg-secondary text-foreground-muted"
                )}>
                  {option.icon}
                </span>
                <span className={cn(
                  "text-sm font-medium",
                  timeRangeSettings.dayTimeRangeMode === option.value ? "text-highlight-foreground" : "text-foreground"
                )}>{option.label}</span>
              </div>
              <span className={cn(
                "text-xs",
                timeRangeSettings.dayTimeRangeMode === option.value ? "text-highlight-foreground/80" : "text-foreground-muted"
              )}>{option.description}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Focus Hour Selectors (only in FOCUS mode) */}
      {isFocusMode && (
        <>
          <Separator className="my-2" />
          
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Sun className="w-3.5 h-3.5 text-highlight" />
              <Label className="text-xs font-medium">Focus Hours (Default)</Label>
            </div>
            <p className="text-xs text-foreground-muted">
              Set the primary working hours. Hours outside this range appear as collapsible "Night" sections.
            </p>
            
            <div className="grid grid-cols-2 gap-4">
              {/* Focus Start Time */}
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

              {/* Focus End Time */}
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

            {/* Visual preview of focus range */}
            <div className="flex items-center gap-2 p-2 rounded-md bg-secondary/50 border border-border/50">
              <Moon className="w-3 h-3 text-foreground-muted" />
              <span className="text-[10px] text-foreground-muted">
                {formatHourLabel(0)} – {formatHourLabel(timeRangeSettings.focusStartTime)}
              </span>
              <Sun className="w-3 h-3 text-highlight ml-2" />
              <span className="text-[10px] text-highlight-foreground font-medium">
                {formatHourLabel(timeRangeSettings.focusStartTime)} – {formatHourLabel(timeRangeSettings.focusEndTime)}
              </span>
              <Moon className="w-3 h-3 text-foreground-muted ml-2" />
              <span className="text-[10px] text-foreground-muted">
                {formatHourLabel(timeRangeSettings.focusEndTime)} – {formatHourLabel(24)}
              </span>
            </div>
          </div>

          <Separator className="my-2" />

          {/* Day View Layout */}
          <div className="space-y-2.5">
            <div className="flex items-center gap-2">
              <Layers className="w-3.5 h-3.5 text-highlight" />
              <Label className="text-xs font-medium">Day View Layout</Label>
            </div>
            <p className="text-xs text-foreground-muted">
              Choose which sections to display in Day view
            </p>
            <div className="grid grid-cols-3 gap-2">
              {layoutOptions.map(option => (
                <button
                  key={option.value}
                  onClick={() => updateTimeRangeSetting('dayViewLayout', option.value)}
                  className={cn(
                    "flex flex-col items-center gap-1.5 py-2.5 px-2 rounded-lg border transition-all text-center",
                    timeRangeSettings.dayViewLayout === option.value
                      ? "border-highlight bg-highlight-muted text-highlight-foreground"
                      : "border-border hover:border-foreground-muted/50 text-foreground-muted hover:text-foreground"
                  )}
                >
                  <span className="text-[11px] font-medium">{option.label}</span>
                </button>
              ))}
            </div>
          </div>
        </>
      )}

      {/* Week View Mode (secondary) */}
      <Separator className="my-2" />
      
      <div className="space-y-2.5">
        <Label className="text-xs font-medium">Week View Mode</Label>
        <div className="grid grid-cols-2 gap-2">
          {modeOptions.map(option => (
            <button
              key={option.value}
              onClick={() => updateTimeRangeSetting('weekTimeRangeMode', option.value)}
              className={cn(
                "flex items-center gap-2 p-2.5 rounded-lg border transition-all",
                timeRangeSettings.weekTimeRangeMode === option.value
                  ? "border-highlight bg-highlight-muted"
                  : "border-border hover:border-foreground-muted/50"
              )}
            >
              <span className={cn(
                "w-6 h-6 rounded-md flex items-center justify-center",
                timeRangeSettings.weekTimeRangeMode === option.value 
                  ? "bg-highlight/20 text-highlight-foreground" 
                  : "bg-secondary text-foreground-muted"
              )}>
                {option.icon}
              </span>
              <span className={cn(
                "text-sm font-medium",
                timeRangeSettings.weekTimeRangeMode === option.value ? "text-highlight-foreground" : "text-foreground"
              )}>{option.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Per-day override hint */}
      <div className="py-3 px-3 bg-secondary/40 rounded-lg border border-border/50">
        <p className="text-xs text-foreground-muted">
          💡 <strong>Tip:</strong> You can customize focus hours for individual days directly in the Day view header using "Custom hours for this day".
        </p>
      </div>
    </div>
  );
});

TimeRangeSettingsSection.displayName = 'TimeRangeSettingsSection';

export default TimeRangeSettingsSection;
