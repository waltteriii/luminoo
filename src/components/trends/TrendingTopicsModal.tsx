import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, TrendingUp, Sparkles, Plus, Clock, Zap, Calendar, ChevronDown, ChevronUp } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { EnergyLevel, Platform } from '@/types';
import { cn } from '@/lib/utils';

interface TrendingTopicsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userProfile: {
    creatorType: string | null;
    platforms: Platform[];
    nicheKeywords: string[];
    audienceDescription: string | null;
  } | null;
  onAddTask: (title: string, energy: EnergyLevel) => void;
}

interface Trend {
  title: string;
  description: string;
  content_ideas: string[];
  platform: string;
  urgency: 'now' | 'this_week' | 'this_month' | 'ongoing';
  energy_level: EnergyLevel;
  category: 'news' | 'seasonal' | 'industry' | 'viral' | 'evergreen';
}

const urgencyConfig = {
  now: { label: 'Act Now', color: 'bg-destructive text-destructive-foreground' },
  this_week: { label: 'This Week', color: 'bg-energy-high text-white' },
  this_month: { label: 'This Month', color: 'bg-energy-medium text-white' },
  ongoing: { label: 'Ongoing', color: 'bg-energy-low text-white' },
};

const categoryConfig = {
  news: { label: 'Breaking', icon: Zap },
  seasonal: { label: 'Seasonal', icon: Calendar },
  industry: { label: 'Industry', icon: TrendingUp },
  viral: { label: 'Viral', icon: Sparkles },
  evergreen: { label: 'Evergreen', icon: Clock },
};

const TrendingTopicsModal = ({ open, onOpenChange, userProfile, onAddTask }: TrendingTopicsModalProps) => {
  const [loading, setLoading] = useState(false);
  const [trends, setTrends] = useState<Trend[]>([]);
  const [expandedTrend, setExpandedTrend] = useState<number | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (open && trends.length === 0) {
      fetchTrends();
    }
  }, [open]);

  const fetchTrends = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('get-trending-topics', {
        body: { userProfile }
      });

      if (error) throw error;
      
      if (data.error) {
        throw new Error(data.error);
      }

      setTrends(data.trends || []);
    } catch (err) {
      console.error('Fetch trends error:', err);
      toast({
        title: "Failed to fetch trends",
        description: err instanceof Error ? err.message : "Could not get trending topics. Please try again.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAddAsTask = (idea: string, energy: EnergyLevel) => {
    onAddTask(idea, energy);
    toast({
      title: "Task added",
      description: "Content idea added to your planner"
    });
  };

  const toggleExpand = (index: number) => {
    setExpandedTrend(expandedTrend === index ? null : index);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-primary" />
            Trending Topics
          </DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-12 gap-3">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
            <p className="text-sm text-foreground-muted">Analyzing trends for your niche...</p>
          </div>
        ) : trends.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 gap-4">
            <TrendingUp className="w-12 h-12 text-foreground-subtle" />
            <p className="text-foreground-muted">No trends loaded yet</p>
            <Button onClick={fetchTrends} className="gap-2">
              <Sparkles className="w-4 h-4" />
              Generate Trends
            </Button>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs text-foreground-muted">
                {trends.length} trends tailored to your profile
              </p>
              <Button variant="ghost" size="sm" onClick={fetchTrends} className="text-xs">
                Refresh
              </Button>
            </div>
            
            <div className="flex-1 overflow-y-auto pr-2 -mr-2 scrollbar-thin scrollbar-thumb-foreground/20 scrollbar-track-transparent hover:scrollbar-thumb-foreground/30">
              <div className="space-y-3 pb-4 pr-2">
                {trends.map((trend, index) => {
                  const CategoryIcon = categoryConfig[trend.category]?.icon || TrendingUp;
                  const isExpanded = expandedTrend === index;
                  
                  return (
                    <div
                      key={index}
                      className={cn(
                        "border border-border rounded-lg p-4 transition-all",
                        isExpanded && "ring-1 ring-primary/30"
                      )}
                    >
                      <div 
                        className="flex items-start justify-between cursor-pointer"
                        onClick={() => toggleExpand(index)}
                      >
                        <div className="flex-1">
                          <div className="flex items-center gap-2 flex-wrap mb-1">
                            <Badge variant="secondary" className={cn("text-2xs", urgencyConfig[trend.urgency].color)}>
                              {urgencyConfig[trend.urgency].label}
                            </Badge>
                            <Badge variant="outline" className="text-2xs gap-1">
                              <CategoryIcon className="w-3 h-3" />
                              {categoryConfig[trend.category]?.label}
                            </Badge>
                            <span className="text-2xs text-foreground-muted">{trend.platform}</span>
                          </div>
                          <h3 className="font-medium text-foreground">{trend.title}</h3>
                          <p className="text-sm text-foreground-muted mt-1 line-clamp-2">
                            {trend.description}
                          </p>
                        </div>
                        <Button variant="ghost" size="icon" className="flex-shrink-0 ml-2">
                          {isExpanded ? (
                            <ChevronUp className="w-4 h-4" />
                          ) : (
                            <ChevronDown className="w-4 h-4" />
                          )}
                        </Button>
                      </div>

                      {isExpanded && (
                        <div className="mt-4 pt-3 border-t border-border space-y-3">
                          <div>
                            <span className="caption">Content Ideas</span>
                            <div className="space-y-2 mt-2">
                              {trend.content_ideas.map((idea, ideaIndex) => (
                                <div 
                                  key={ideaIndex}
                                  className="flex items-center justify-between gap-3 p-2 bg-secondary/50 rounded-lg"
                                >
                                  <span className="text-sm flex-1">{idea}</span>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleAddAsTask(idea, trend.energy_level);
                                    }}
                                    className="text-xs gap-1 flex-shrink-0"
                                  >
                                    <Plus className="w-3 h-3" />
                                    Add Task
                                  </Button>
                                </div>
                              ))}
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-foreground-muted">Energy:</span>
                            <Badge variant="outline" className={cn(
                              "text-2xs",
                              trend.energy_level === 'high' && "border-energy-high text-energy-high",
                              trend.energy_level === 'medium' && "border-energy-medium text-energy-medium",
                              trend.energy_level === 'low' && "border-energy-low text-energy-low",
                              trend.energy_level === 'recovery' && "border-energy-recovery text-energy-recovery",
                            )}>
                              {trend.energy_level}
                            </Badge>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default TrendingTopicsModal;
