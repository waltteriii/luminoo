import { useState, useEffect, memo } from 'react';
import { cn } from '@/lib/utils';
import { Brain, TrendingUp, ChevronDown, ChevronRight, Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useIsMobile } from '@/hooks/use-mobile';

interface HeroWidgetsProps {
  onBrainDumpClick: () => void;
  onTrendingClick: () => void;
}

const STORAGE_KEY = 'luminoo-hero-widgets-visible';

const HeroWidgets = memo(({ onBrainDumpClick, onTrendingClick }: HeroWidgetsProps) => {
  const isMobile = useIsMobile();
  const [isVisible, setIsVisible] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved !== null ? JSON.parse(saved) : true;
    } catch {
      return true;
    }
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(isVisible));
  }, [isVisible]);

  if (!isVisible) {
    return (
      <div className="border-b border-border bg-background-elevated/50">
        <button
          onClick={() => setIsVisible(true)}
          className="w-full flex items-center justify-center gap-2 py-2 text-xs text-foreground-muted hover:text-foreground transition-colors"
        >
          <Eye className="w-3.5 h-3.5" />
          <span>Show quick actions</span>
        </button>
      </div>
    );
  }

  return (
    <div className="border-b border-border bg-background-elevated/50 px-3 sm:px-4 lg:px-6 py-3 lg:py-4">
      {/* Header with hide option */}
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-xs font-medium text-foreground-muted uppercase tracking-wide">
          Quick Actions
        </h3>
        <button
          onClick={() => setIsVisible(false)}
          className="flex items-center gap-1.5 text-xs text-foreground-muted hover:text-foreground transition-colors"
        >
          <EyeOff className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Hide</span>
        </button>
      </div>

      {/* Widgets grid - 2 columns on desktop, 1 on mobile */}
      <div className={cn(
        "grid gap-3",
        isMobile ? "grid-cols-1" : "grid-cols-2"
      )}>
        {/* Brain Dump Widget */}
        <button
          onClick={onBrainDumpClick}
          className={cn(
            "group relative flex items-center gap-4 p-4 rounded-xl",
            "bg-gradient-to-br from-card to-card/80",
            "border border-border hover:border-highlight/50",
            "transition-all duration-200 hover:shadow-lg hover:shadow-highlight/10",
            "text-left overflow-hidden"
          )}
        >
          {/* Glow effect on hover */}
          <div className="absolute inset-0 bg-gradient-to-br from-highlight/0 to-highlight/5 opacity-0 group-hover:opacity-100 transition-opacity" />
          
          <div className={cn(
            "flex-shrink-0 w-12 h-12 rounded-xl flex items-center justify-center",
            "bg-gradient-to-br from-highlight/20 to-highlight/10",
            "group-hover:scale-110 transition-transform duration-200"
          )}>
            <Brain className="w-6 h-6 text-highlight" />
          </div>
          
          <div className="relative z-10 min-w-0">
            <h4 className="font-semibold text-foreground group-hover:text-highlight transition-colors">
              Brain Dump
            </h4>
            <p className="text-xs text-foreground-muted line-clamp-1">
              Quickly capture thoughts & ideas
            </p>
          </div>
          
          <ChevronRight className="w-5 h-5 text-foreground-muted group-hover:text-highlight group-hover:translate-x-1 transition-all flex-shrink-0 ml-auto" />
        </button>

        {/* Trending Topics Widget */}
        <button
          onClick={onTrendingClick}
          className={cn(
            "group relative flex items-center gap-4 p-4 rounded-xl",
            "bg-gradient-to-br from-card to-card/80",
            "border border-border hover:border-highlight/50",
            "transition-all duration-200 hover:shadow-lg hover:shadow-highlight/10",
            "text-left overflow-hidden"
          )}
        >
          {/* Glow effect on hover */}
          <div className="absolute inset-0 bg-gradient-to-br from-highlight/0 to-highlight/5 opacity-0 group-hover:opacity-100 transition-opacity" />
          
          <div className={cn(
            "flex-shrink-0 w-12 h-12 rounded-xl flex items-center justify-center",
            "bg-gradient-to-br from-energy-high/20 to-energy-high/10",
            "group-hover:scale-110 transition-transform duration-200"
          )}>
            <TrendingUp className="w-6 h-6 text-energy-high" />
          </div>
          
          <div className="relative z-10 min-w-0">
            <h4 className="font-semibold text-foreground group-hover:text-energy-high transition-colors">
              Trending Topics
            </h4>
            <p className="text-xs text-foreground-muted line-clamp-1">
              Discover what's popular now
            </p>
          </div>
          
          <ChevronRight className="w-5 h-5 text-foreground-muted group-hover:text-energy-high group-hover:translate-x-1 transition-all flex-shrink-0 ml-auto" />
        </button>
      </div>
    </div>
  );
});

HeroWidgets.displayName = 'HeroWidgets';

export default HeroWidgets;
