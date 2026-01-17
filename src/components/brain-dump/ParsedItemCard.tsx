import { cn } from '@/lib/utils';
import { EnergyLevel, ParsedItem } from '@/types';
import { X, AlertCircle, Lightbulb, Target, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import EnergyPill from '@/components/shared/EnergyPill';

interface ParsedItemCardProps {
  item: ParsedItem;
  onEnergyChange: (energy: EnergyLevel) => void;
  onRemove: () => void;
}

const typeIcons = {
  task: Target,
  campaign: Calendar,
  idea: Lightbulb,
};

const urgencyColors = {
  low: 'text-foreground-muted',
  normal: 'text-foreground',
  high: 'text-energy-medium',
  critical: 'text-destructive',
};

const ParsedItemCard = ({ item, onEnergyChange, onRemove }: ParsedItemCardProps) => {
  const Icon = typeIcons[item.type];
  const currentEnergy = item.user_override_energy || item.detected_energy;

  return (
    <div className={cn(
      "p-4 rounded-lg border border-border bg-card",
      "hover:border-primary/30 transition-colors"
    )}>
      <div className="flex items-start gap-3">
        <div className={cn(
          "w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0",
          item.type === 'task' && "bg-primary/10 text-primary",
          item.type === 'campaign' && "bg-energy-high/10 text-energy-high",
          item.type === 'idea' && "bg-energy-medium/10 text-energy-medium"
        )}>
          <Icon className="w-4 h-4" />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <p className="text-sm font-medium text-foreground">{item.text}</p>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 flex-shrink-0 text-foreground-muted hover:text-destructive"
              onClick={onRemove}
            >
              <X className="w-3 h-3" />
            </Button>
          </div>

          <div className="flex flex-wrap items-center gap-2 mt-2">
            <span className={cn(
              "text-xs px-2 py-0.5 rounded-full bg-secondary",
              urgencyColors[item.urgency]
            )}>
              {item.urgency}
            </span>

            {item.suggested_timeframe && (
              <span className="text-xs text-foreground-muted flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                {item.suggested_timeframe}
              </span>
            )}

            <span className="text-xs text-foreground-muted">
              {Math.round(item.confidence * 100)}% confident
            </span>
          </div>

          {item.emotional_note && (
            <p className="text-xs text-foreground-muted mt-2 italic">
              💭 {item.emotional_note}
            </p>
          )}

          {/* Energy selector */}
          <div className="mt-3 flex items-center gap-2">
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
