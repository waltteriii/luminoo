import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2, TrendingUp, Sparkles, Plus, Clock, Zap, Calendar, ChevronDown, ChevronUp, Bookmark, BookmarkCheck, Trash2 } from 'lucide-react';
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
    aiProfileSummary?: string | null;
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

interface BookmarkedTrend extends Trend {
  id: string;
  created_at: string;
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
  const [bookmarks, setBookmarks] = useState<BookmarkedTrend[]>([]);
  const [loadingBookmarks, setLoadingBookmarks] = useState(false);
  const [expandedTrend, setExpandedTrend] = useState<number | null>(null);
  const [expandedBookmark, setExpandedBookmark] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'discover' | 'saved'>('discover');
  const { toast } = useToast();

  useEffect(() => {
    if (open) {
      if (trends.length === 0) {
        fetchTrends();
      }
      fetchBookmarks();
    }
  }, [open]);

  const fetchTrends = async () => {
    setLoading(true);
    // Mock trends
    setTimeout(() => {
      setTrends([
        {
          title: "AI Integration in Daily Tasks",
          description: "Growing interest in how small creators use AI for mundane tasks.",
          content_ideas: ["Show how you use ChatGPT for emails", "Compare tools"],
          platform: "TikTok",
          urgency: "now",
          energy_level: "medium",
          category: "industry"
        },
        {
          title: "Slow Living Aesthetics",
          description: "Shift towards cozy, low-stress content consumption.",
          content_ideas: ["Morning routine", "Desk setup tour"],
          platform: "Instagram",
          urgency: "ongoing",
          energy_level: "low",
          category: "evergreen"
        }
      ]);
      setLoading(false);
    }, 1500);
  };

  const fetchBookmarks = async () => {
    setLoadingBookmarks(true);
    setTimeout(() => {
      setBookmarks([]);
      setLoadingBookmarks(false);
    }, 500);
  };

  const isBookmarked = (trend: Trend) => {
    return bookmarks.some(b => b.title === trend.title && b.description === trend.description);
  };

  const handleBookmark = async (trend: Trend) => {
    // Mock bookmark
    if (isBookmarked(trend)) {
      setBookmarks(prev => prev.filter(b => b.title !== trend.title));
      toast({ title: "Bookmark removed" });
    } else {
      setBookmarks(prev => [...prev, { ...trend, id: Math.random().toString(), created_at: new Date().toISOString() }]);
      toast({ title: "Trend bookmarked!" });
    }
  };

  const handleDeleteBookmark = async (id: string) => {
    setBookmarks(prev => prev.filter(b => b.id !== id));
    toast({ title: "Bookmark removed" });
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

  const toggleBookmarkExpand = (id: string) => {
    setExpandedBookmark(expandedBookmark === id ? null : id);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-w-2xl max-h-[80vh] flex flex-col"
        onKeyDown={(e) => {
          if (e.key === 'Enter' && !e.shiftKey && !loading && trends.length === 0) {
            e.preventDefault();
            fetchTrends();
          }
        }}
      >
        <DialogHeader className="pb-0">
          <DialogTitle className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-primary" />
            Trending Topics
          </DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'discover' | 'saved')} className="flex-1 flex flex-col min-h-0">
          <TabsList className="grid w-full grid-cols-2 mb-3">
            <TabsTrigger value="discover" className="gap-1.5">
              <Sparkles className="w-3.5 h-3.5" />
              Discover
            </TabsTrigger>
            <TabsTrigger value="saved" className="gap-1.5">
              <Bookmark className="w-3.5 h-3.5" />
              Saved {bookmarks.length > 0 && `(${bookmarks.length})`}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="discover" className="flex-1 flex flex-col min-h-0 mt-0">
            {loading ? (
              <div className="flex-1 overflow-y-auto pr-2 -mr-2">
                <div className="space-y-3 pb-4 pr-2">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <div key={i} className="border border-border rounded-lg p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 space-y-2">
                          <Skeleton className="h-5 w-16 rounded-full" />
                          <Skeleton className="h-4 w-3/4" />
                        </div>
                        <Skeleton className="h-8 w-8 rounded-md" />
                      </div>
                    </div>
                  ))}
                </div>
                <div className="flex items-center justify-center py-3">
                  <div className="flex items-center gap-2 text-xs text-foreground-muted">
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    Analyzing trends for your niche…
                  </div>
                </div>
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
                      const bookmarked = isBookmarked(trend);

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
                                <Badge variant="secondary" className={cn("text-2xs", urgencyConfig[trend.urgency]?.color)}>
                                  {urgencyConfig[trend.urgency]?.label}
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
                            <div className="flex items-center gap-1 flex-shrink-0 ml-2">
                              <Button
                                variant="ghost"
                                size="icon"
                                className={cn(bookmarked && "text-primary")}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleBookmark(trend);
                                }}
                              >
                                {bookmarked ? (
                                  <BookmarkCheck className="w-4 h-4" />
                                ) : (
                                  <Bookmark className="w-4 h-4" />
                                )}
                              </Button>
                              <Button variant="ghost" size="icon">
                                {isExpanded ? (
                                  <ChevronUp className="w-4 h-4" />
                                ) : (
                                  <ChevronDown className="w-4 h-4" />
                                )}
                              </Button>
                            </div>
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
          </TabsContent>

          <TabsContent value="saved" className="flex-1 flex flex-col min-h-0 mt-0">
            {bookmarks.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 gap-4">
                <Bookmark className="w-12 h-12 text-foreground-subtle" />
                <p className="text-foreground-muted">No bookmarked trends yet</p>
                <p className="text-xs text-foreground-muted/70">Click the bookmark icon on any trend to save it here</p>
              </div>
            ) : (
              <div className="p-4 text-center">Bookmarks here</div>
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};

export default TrendingTopicsModal;
