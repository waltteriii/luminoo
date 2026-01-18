import { useState, useRef, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { EnergyLevel, ParsedItem, Urgency } from '@/types';
import { X, AlertCircle, Lightbulb, Target, Calendar, Sparkles, Inbox } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarPicker } from '@/components/ui/calendar';
import EnergyPill from '@/components/shared/EnergyPill';
import { Input } from '@/components/ui/input';
import { format } from 'date-fns';

interface ParsedItemCardProps {
  item: ParsedItem;
  onEnergyChange: (energy: EnergyLevel) => void;
  onRemove: () => void;
  onDateChange?: (date: string | null) => void;
  onTextChange?: (text: string) => void;
}

const typeIcons = {
  task: Target,
  campaign: Calendar,
  idea: Lightbulb,
};

const urgencyColors: Record<Urgency, string> = {
  low: 'text-foreground-muted',
  normal: 'text-foreground',
  high: 'text-amber-500',
  critical: 'text-red-500',
};

const ParsedItemCard = ({ item, onEnergyChange, onRemove, onDateChange, onTextChange }: ParsedItemCardProps) => {
  const Icon = typeIcons[item.type];
  const currentEnergy = item.user_override_energy || item.detected_energy;
  // Handle due_date from parsed response - default to null (inbox)
  const dueDate = (item as any).due_date || null;
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(item.text);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const handleDateSelect = (date: Date | undefined) => {
    if (date && onDateChange) {
      onDateChange(format(date, 'yyyy-MM-dd'));
    }
    setCalendarOpen(false);
  };

  const handleClearDate = () => {
    if (onDateChange) {
      onDateChange(null);
    }
    setCalendarOpen(false);
  };

  const handleDoubleClick = () => {
    setEditText(item.text);
    setIsEditing(true);
  };

  const handleSaveEdit = () => {
    if (editText.trim() && onTextChange) {
      onTextChange(editText.trim());
    }
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSaveEdit();
    } else if (e.key === 'Escape') {
      setEditText(item.text);
      setIsEditing(false);
    }
  };

  return (
    <div className={cn(
      "p-3 rounded-lg border border-border bg-card group",
      "hover:border-primary/30 transition-colors"
    )}>
      <div className="flex items-start gap-3">
        <div className={cn(
          "w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0",
          item.type === 'task' && "bg-primary/10 text-primary",
          item.type === 'campaign' && "bg-energy-high/10 text-energy-high",
          item.type === 'idea' && "bg-energy-medium/10 text-energy-medium"
        )}>
          <Icon className="w-3.5 h-3.5" />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            {isEditing ? (
              <Input
                ref={inputRef}
                value={editText}
                onChange={(e) => setEditText(e.target.value)}
                onBlur={handleSaveEdit}
                onKeyDown={handleKeyDown}
                className="text-sm font-medium h-7 py-0"
              />
            ) : (
              <p 
                className="text-sm font-medium text-foreground cursor-text hover:bg-secondary/50 px-1 -mx-1 rounded transition-colors"
                onDoubleClick={handleDoubleClick}
                title="Double-click to edit"
              >
                {item.text}
              </p>
            )}
            <Button
              variant="ghost"
              size="icon"
              className="h-5 w-5 flex-shrink-0 text-foreground-muted hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
              onClick={onRemove}
            >
              <X className="w-3 h-3" />
            </Button>
          </div>

          <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
            <span className={cn(
              "text-xs px-1.5 py-0.5 rounded-full bg-secondary flex items-center gap-1",
              urgencyColors[item.urgency]
            )}>
              {(item.urgency === 'high' || item.urgency === 'critical') && (
                <AlertCircle className="w-3 h-3" />
              )}
              {item.urgency}
            </span>

            {/* Destination indicator - inbox or scheduled */}
            {dueDate ? (
              <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
                <PopoverTrigger asChild>
                  <button className="text-xs px-1.5 py-0.5 rounded bg-primary/20 text-primary flex items-center gap-1 hover:bg-primary/30 transition-colors">
                    <Calendar className="w-3 h-3" />
                    {dueDate}
                  </button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <CalendarPicker
                    mode="single"
                    selected={dueDate ? new Date(dueDate) : undefined}
                    onSelect={handleDateSelect}
                    initialFocus
                  />
                  <div className="p-2 border-t border-border">
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="w-full gap-2 text-foreground-muted"
                      onClick={handleClearDate}
                    >
                      <Inbox className="w-3 h-3" />
                      Move to Inbox
                    </Button>
                  </div>
                </PopoverContent>
              </Popover>
            ) : (
              <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
                <PopoverTrigger asChild>
                  <button className="text-xs px-1.5 py-0.5 rounded bg-secondary text-foreground-muted flex items-center gap-1 hover:bg-secondary/80 transition-colors">
                    <Inbox className="w-3 h-3" />
                    Inbox
                  </button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <CalendarPicker
                    mode="single"
                    onSelect={handleDateSelect}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            )}

            {item.suggested_timeframe && !dueDate && (
              <span className="text-xs text-foreground-muted flex items-center gap-1">
                <Sparkles className="w-3 h-3" />
                AI suggests: {item.suggested_timeframe}
              </span>
            )}

            {item.confidence < 0.9 && (
              <span className="text-xs text-foreground-muted flex items-center gap-1">
                <Sparkles className="w-3 h-3" />
                {Math.round(item.confidence * 100)}%
              </span>
            )}
          </div>

          {item.emotional_note && (
            <p className="text-xs text-foreground-muted mt-1.5 italic">
              💭 {item.emotional_note}
            </p>
          )}

          {/* Related items */}
          {item.related_items && item.related_items.length > 0 && (
            <div className="mt-1.5 flex flex-wrap gap-1">
              {item.related_items.map((rel, idx) => (
                <span key={idx} className="text-xs px-1.5 py-0.5 rounded bg-secondary text-foreground-muted">
                  🔗 {rel}
                </span>
              ))}
            </div>
          )}

          {/* Energy selector */}
          <div className="mt-2 flex items-center gap-2">
            <span className="text-xs text-foreground-muted">Energy:</span>
            <EnergyPill 
              energy={currentEnergy} 
              onChange={onEnergyChange}
              editable 
            />
            {item.user_override_energy && item.user_override_energy !== item.detected_energy && (
              <span className="text-xs text-foreground-muted">(edited)</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ParsedItemCard;
