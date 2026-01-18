import { useState, useEffect, useRef, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { User, Loader2, Save, Camera, Music, Palette, PenTool, Heart, Video, Briefcase, Plus, Clock, Search, X, Shield, CreditCard, Users, Key, Share2, LayoutGrid, Calendar, CalendarDays, Sparkles } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { CreatorType, Platform, ZoomLevel } from '@/types';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';

interface ProfileModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
  onDefaultViewChange?: (view: ZoomLevel) => void;
}

interface SharedCalendar {
  id: string;
  shared_with_id: string;
  can_edit: boolean;
  created_at: string;
  shared_with_profile?: {
    display_name?: string;
    email?: string;
  };
}

const creatorTypes: { value: CreatorType; label: string; icon: React.ReactNode }[] = [
  { value: 'musician', label: 'Musician', icon: <Music className="w-4 h-4" /> },
  { value: 'visual_artist', label: 'Visual Artist', icon: <Palette className="w-4 h-4" /> },
  { value: 'writer', label: 'Writer', icon: <PenTool className="w-4 h-4" /> },
  { value: 'coach', label: 'Coach', icon: <Heart className="w-4 h-4" /> },
  { value: 'content_creator', label: 'Content Creator', icon: <Video className="w-4 h-4" /> },
  { value: 'entrepreneur', label: 'Entrepreneur', icon: <Briefcase className="w-4 h-4" /> },
  { value: 'other', label: 'Other', icon: <Plus className="w-4 h-4" /> },
];

const defaultViews: { value: ZoomLevel; label: string; icon: React.ReactNode }[] = [
  { value: 'year', label: 'Year', icon: <LayoutGrid className="w-4 h-4" /> },
  { value: 'month', label: 'Month', icon: <Calendar className="w-4 h-4" /> },
  { value: 'week', label: 'Week', icon: <CalendarDays className="w-4 h-4" /> },
  { value: 'day', label: 'Day', icon: <Clock className="w-4 h-4" /> },
];

type HighlightColor = 'blue' | 'teal' | 'pink' | 'amber' | 'purple';

const highlightColors: { value: HighlightColor; label: string; colorClass: string }[] = [
  { value: 'blue', label: 'Calm Blue', colorClass: 'bg-[hsl(210,100%,52%)]' },
  { value: 'teal', label: 'Teal', colorClass: 'bg-[hsl(174,72%,46%)]' },
  { value: 'pink', label: 'Soft Pink', colorClass: 'bg-[hsl(330,70%,60%)]' },
  { value: 'amber', label: 'Warm Amber', colorClass: 'bg-[hsl(38,92%,50%)]' },
  { value: 'purple', label: 'Purple', colorClass: 'bg-[hsl(270,60%,60%)]' },
];

const PRESET_PLATFORMS = [
  'Instagram', 'YouTube', 'TikTok', 'Spotify', 'Newsletter', 'Blog', 'Twitter/X', 'LinkedIn', 'Podcast', 'Twitch', 'Discord', 'Substack'
];

// Comprehensive timezone list with search keywords
const ALL_TIMEZONES = [
  { value: 'UTC', label: 'UTC', keywords: ['utc', 'coordinated universal time'] },
  { value: 'America/New_York', label: 'New York (EST)', keywords: ['usa', 'us', 'eastern', 'new york', 'america'] },
  { value: 'America/Chicago', label: 'Chicago (CST)', keywords: ['usa', 'us', 'central', 'chicago', 'america'] },
  { value: 'America/Denver', label: 'Denver (MST)', keywords: ['usa', 'us', 'mountain', 'denver', 'america'] },
  { value: 'America/Los_Angeles', label: 'Los Angeles (PST)', keywords: ['usa', 'us', 'pacific', 'los angeles', 'california', 'america'] },
  { value: 'America/Anchorage', label: 'Anchorage (AKST)', keywords: ['usa', 'us', 'alaska', 'america'] },
  { value: 'Pacific/Honolulu', label: 'Honolulu (HST)', keywords: ['usa', 'us', 'hawaii', 'pacific'] },
  { value: 'America/Toronto', label: 'Toronto', keywords: ['canada', 'toronto'] },
  { value: 'America/Vancouver', label: 'Vancouver', keywords: ['canada', 'vancouver'] },
  { value: 'America/Mexico_City', label: 'Mexico City', keywords: ['mexico'] },
  { value: 'America/Sao_Paulo', label: 'São Paulo', keywords: ['brazil', 'brasil', 'sao paulo'] },
  { value: 'America/Buenos_Aires', label: 'Buenos Aires', keywords: ['argentina'] },
  { value: 'Europe/London', label: 'London (GMT)', keywords: ['uk', 'england', 'britain', 'london'] },
  { value: 'Europe/Paris', label: 'Paris (CET)', keywords: ['france', 'paris', 'europe'] },
  { value: 'Europe/Berlin', label: 'Berlin (CET)', keywords: ['germany', 'berlin', 'europe'] },
  { value: 'Europe/Amsterdam', label: 'Amsterdam', keywords: ['netherlands', 'amsterdam', 'europe'] },
  { value: 'Europe/Brussels', label: 'Brussels', keywords: ['belgium', 'brussels', 'europe'] },
  { value: 'Europe/Rome', label: 'Rome', keywords: ['italy', 'rome', 'europe'] },
  { value: 'Europe/Madrid', label: 'Madrid', keywords: ['spain', 'madrid', 'europe'] },
  { value: 'Europe/Zurich', label: 'Zurich', keywords: ['switzerland', 'zurich', 'europe'] },
  { value: 'Europe/Vienna', label: 'Vienna', keywords: ['austria', 'vienna', 'europe'] },
  { value: 'Europe/Stockholm', label: 'Stockholm', keywords: ['sweden', 'stockholm', 'europe'] },
  { value: 'Europe/Oslo', label: 'Oslo', keywords: ['norway', 'oslo', 'europe'] },
  { value: 'Europe/Copenhagen', label: 'Copenhagen', keywords: ['denmark', 'copenhagen', 'europe'] },
  { value: 'Europe/Helsinki', label: 'Helsinki (EET)', keywords: ['finland', 'helsinki', 'europe'] },
  { value: 'Europe/Warsaw', label: 'Warsaw', keywords: ['poland', 'warsaw', 'europe'] },
  { value: 'Europe/Prague', label: 'Prague', keywords: ['czech', 'prague', 'europe'] },
  { value: 'Europe/Athens', label: 'Athens', keywords: ['greece', 'athens', 'europe'] },
  { value: 'Europe/Moscow', label: 'Moscow', keywords: ['russia', 'moscow', 'europe'] },
  { value: 'Europe/Istanbul', label: 'Istanbul', keywords: ['turkey', 'istanbul'] },
  { value: 'Asia/Dubai', label: 'Dubai', keywords: ['uae', 'emirates', 'dubai', 'middle east'] },
  { value: 'Asia/Riyadh', label: 'Riyadh', keywords: ['saudi', 'arabia', 'riyadh', 'middle east'] },
  { value: 'Asia/Jerusalem', label: 'Jerusalem', keywords: ['israel', 'jerusalem', 'middle east'] },
  { value: 'Asia/Kolkata', label: 'Mumbai/Delhi (IST)', keywords: ['india', 'mumbai', 'delhi', 'kolkata'] },
  { value: 'Asia/Bangkok', label: 'Bangkok', keywords: ['thailand', 'bangkok'] },
  { value: 'Asia/Singapore', label: 'Singapore', keywords: ['singapore'] },
  { value: 'Asia/Hong_Kong', label: 'Hong Kong', keywords: ['hong kong', 'china'] },
  { value: 'Asia/Shanghai', label: 'Shanghai/Beijing', keywords: ['china', 'shanghai', 'beijing'] },
  { value: 'Asia/Tokyo', label: 'Tokyo (JST)', keywords: ['japan', 'tokyo'] },
  { value: 'Asia/Seoul', label: 'Seoul', keywords: ['korea', 'seoul'] },
  { value: 'Asia/Manila', label: 'Manila', keywords: ['philippines', 'manila'] },
  { value: 'Asia/Jakarta', label: 'Jakarta', keywords: ['indonesia', 'jakarta'] },
  { value: 'Australia/Perth', label: 'Perth', keywords: ['australia', 'perth'] },
  { value: 'Australia/Sydney', label: 'Sydney (AEDT)', keywords: ['australia', 'sydney'] },
  { value: 'Australia/Melbourne', label: 'Melbourne', keywords: ['australia', 'melbourne'] },
  { value: 'Pacific/Auckland', label: 'Auckland', keywords: ['new zealand', 'auckland'] },
  { value: 'Africa/Cairo', label: 'Cairo', keywords: ['egypt', 'cairo', 'africa'] },
  { value: 'Africa/Lagos', label: 'Lagos', keywords: ['nigeria', 'lagos', 'africa'] },
  { value: 'Africa/Johannesburg', label: 'Johannesburg', keywords: ['south africa', 'johannesburg', 'africa'] },
];

const ProfileModal = ({ open, onOpenChange, userId, onDefaultViewChange }: ProfileModalProps) => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [displayName, setDisplayName] = useState('');
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [creatorType, setCreatorType] = useState<CreatorType | ''>('');
  const [audienceDescription, setAudienceDescription] = useState('');
  const [nicheKeywords, setNicheKeywords] = useState<string[]>([]);
  const [newKeyword, setNewKeyword] = useState('');
  const [platforms, setPlatforms] = useState<string[]>([]);
  const [newPlatform, setNewPlatform] = useState('');
  const [moreAboutYou, setMoreAboutYou] = useState('');
  const [timezone, setTimezone] = useState('UTC');
  const [timezoneSearch, setTimezoneSearch] = useState('');
  const [timezonePopoverOpen, setTimezonePopoverOpen] = useState(false);
  const [sharedCalendars, setSharedCalendars] = useState<SharedCalendar[]>([]);
  const [currentTime, setCurrentTime] = useState('');
  const [defaultView, setDefaultView] = useState<ZoomLevel>('year');
  const [highlightColor, setHighlightColor] = useState<HighlightColor>('blue');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  // Update current time every second
  useEffect(() => {
    const updateTime = () => {
      try {
        const time = new Date().toLocaleTimeString('en-US', {
          timeZone: timezone,
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: true,
        });
        setCurrentTime(time);
      } catch {
        setCurrentTime(new Date().toLocaleTimeString());
      }
    };
    
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, [timezone]);

  // Filter timezones based on search
  const filteredTimezones = useMemo(() => {
    const search = timezoneSearch.toLowerCase();
    if (!search) return ALL_TIMEZONES;
    return ALL_TIMEZONES.filter(tz => 
      tz.label.toLowerCase().includes(search) ||
      tz.value.toLowerCase().includes(search) ||
      tz.keywords.some(k => k.includes(search))
    );
  }, [timezoneSearch]);

  const selectedTimezoneLabel = ALL_TIMEZONES.find(tz => tz.value === timezone)?.label || timezone;

  useEffect(() => {
    if (open && userId) {
      loadProfile();
      loadSharedCalendars();
    }
  }, [open, userId]);

  const loadProfile = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      if (error) throw error;
      
      if (data) {
        setDisplayName(data.display_name || '');
        setAvatarUrl(data.avatar_url);
        setCreatorType(data.creator_type || '');
        setAudienceDescription(data.audience_description || '');
        setNicheKeywords(data.niche_keywords || []);
        setPlatforms(data.platforms || []);
        setTimezone((data as any).timezone || 'UTC');
        setDefaultView(((data as any).default_view as ZoomLevel) || 'year');
        const loadedHighlight = ((data as any).highlight_color as HighlightColor) || 'blue';
        setHighlightColor(loadedHighlight);
        // Apply highlight color to document
        document.documentElement.setAttribute('data-highlight', loadedHighlight);
        // Extract "More about you" from audience description if it exists
        const desc = data.audience_description || '';
        if (desc.includes('\n\nMore about me:')) {
          const parts = desc.split('\n\nMore about me:');
          setAudienceDescription(parts[0]);
          setMoreAboutYou(parts[1]?.trim() || '');
        }
      }
    } catch (err) {
      console.error('Load profile error:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadSharedCalendars = async () => {
    try {
      const { data, error } = await supabase
        .from('shared_calendars')
        .select('*')
        .eq('owner_id', userId);

      if (error) throw error;
      setSharedCalendars(data || []);
    } catch (err) {
      console.error('Load shared calendars error:', err);
    }
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: "Please select an image under 2MB",
        variant: "destructive"
      });
      return;
    }

    setUploadingAvatar(true);
    try {
      const fileExt = file.name.split('.').pop();
      const filePath = `${userId}/avatar.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file, { upsert: true });

      if (uploadError) {
        const reader = new FileReader();
        reader.onload = async (event) => {
          const base64 = event.target?.result as string;
          setAvatarUrl(base64);
        };
        reader.readAsDataURL(file);
      } else {
        const { data: { publicUrl } } = supabase.storage
          .from('avatars')
          .getPublicUrl(filePath);
        
        setAvatarUrl(publicUrl);
      }
    } catch (err) {
      console.error('Avatar upload error:', err);
      toast({
        title: "Upload failed",
        description: "Could not upload avatar. Please try again.",
        variant: "destructive"
      });
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      let fullDescription = audienceDescription;
      if (moreAboutYou.trim()) {
        fullDescription += `\n\nMore about me: ${moreAboutYou}`;
      }

      const { error } = await supabase
        .from('profiles')
        .update({
          display_name: displayName || null,
          avatar_url: avatarUrl,
          creator_type: creatorType || null,
          audience_description: fullDescription || null,
          niche_keywords: nicheKeywords,
          platforms: platforms,
          timezone: timezone,
          default_view: defaultView,
          highlight_color: highlightColor,
          updated_at: new Date().toISOString(),
        } as any)
        .eq('id', userId);

      if (error) throw error;

      // Apply highlight color immediately
      document.documentElement.setAttribute('data-highlight', highlightColor);

      // Notify parent about default view change
      if (onDefaultViewChange) {
        onDefaultViewChange(defaultView);
      }

      toast({
        title: "Profile saved",
        description: "Your profile has been updated successfully."
      });
      onOpenChange(false);
    } catch (err: any) {
      console.error('Save profile error:', err);
      toast({
        title: "Failed to save",
        description: err?.message || "Could not update your profile. Please try again.",
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  };

  const addKeyword = () => {
    const keyword = newKeyword.trim();
    if (keyword && !nicheKeywords.includes(keyword)) {
      setNicheKeywords([...nicheKeywords, keyword]);
      setNewKeyword('');
    }
  };

  const removeKeyword = (keyword: string) => {
    setNicheKeywords(nicheKeywords.filter(k => k !== keyword));
  };

  const addPlatform = (platform: string) => {
    if (platform && !platforms.includes(platform)) {
      setPlatforms([...platforms, platform]);
      setNewPlatform('');
    }
  };

  const removePlatform = (platform: string) => {
    setPlatforms(platforms.filter(p => p !== platform));
  };

  const handleTimezoneSelect = (tz: string) => {
    setTimezone(tz);
    setTimezonePopoverOpen(false);
    setTimezoneSearch('');
  };

  const revokeShare = async (shareId: string) => {
    try {
      const { error } = await supabase
        .from('shared_calendars')
        .delete()
        .eq('id', shareId);

      if (error) throw error;
      setSharedCalendars(prev => prev.filter(s => s.id !== shareId));
      toast({ title: "Access revoked" });
    } catch (err) {
      console.error('Revoke share error:', err);
      toast({ title: "Failed to revoke access", variant: "destructive" });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl max-h-[85vh] flex flex-col p-0 gap-0 overflow-hidden">
        <DialogHeader className="px-6 py-4 border-b border-border flex-shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <User className="w-5 h-5 text-primary" />
            Settings
          </DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-foreground-muted" />
          </div>
        ) : (
          <Tabs defaultValue="profile" className="flex-1 min-h-0 flex flex-col">
            <TabsList className="mx-6 mt-4 grid grid-cols-4 w-auto flex-shrink-0">
              <TabsTrigger value="profile" className="text-xs gap-1">
                <User className="w-3 h-3" />
                Profile
              </TabsTrigger>
              <TabsTrigger value="sharing" className="text-xs gap-1">
                <Share2 className="w-3 h-3" />
                Sharing
              </TabsTrigger>
              <TabsTrigger value="account" className="text-xs gap-1">
                <Shield className="w-3 h-3" />
                Account
              </TabsTrigger>
              <TabsTrigger value="billing" className="text-xs gap-1">
                <CreditCard className="w-3 h-3" />
                Billing
              </TabsTrigger>
            </TabsList>

            <div className="flex-1 min-h-0 overflow-y-auto scrollbar-thin scrollbar-thumb-foreground/15 hover:scrollbar-thumb-foreground/25 scrollbar-track-transparent">
              {/* Profile Tab */}
              <TabsContent value="profile" className="px-6 py-8 space-y-8 mt-0 pr-8">
                {/* Avatar and Name - FIRST */}
                <div className="flex items-center gap-5">
                  <div 
                    className="relative w-20 h-20 rounded-full bg-secondary flex items-center justify-center overflow-hidden cursor-pointer group"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    {avatarUrl ? (
                      <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                    ) : (
                      <User className="w-10 h-10 text-foreground-muted" />
                    )}
                    <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      {uploadingAvatar ? (
                        <Loader2 className="w-5 h-5 animate-spin text-white" />
                      ) : (
                        <Camera className="w-5 h-5 text-white" />
                      )}
                    </div>
                  </div>
                  <div className="flex-1">
                    <Label className="text-xs text-foreground-muted mb-1.5 block">Display Name</Label>
                    <Input
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      placeholder="Your name"
                      className="font-medium h-11"
                    />
                  </div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleAvatarUpload}
                    className="hidden"
                  />
                </div>

                {/* Clock and Timezone - Compact, secondary */}
                <div className="flex items-center justify-between px-4 py-3 bg-secondary/30 rounded-lg">
                  <div className="text-sm font-medium text-foreground tabular-nums">{currentTime}</div>
                  <Popover open={timezonePopoverOpen} onOpenChange={setTimezonePopoverOpen}>
                    <PopoverTrigger asChild>
                      <button className="flex items-center gap-1.5 text-xs text-foreground-muted hover:text-foreground transition-colors">
                        <Clock className="w-3.5 h-3.5" />
                        <span className="truncate max-w-[120px]">{selectedTimezoneLabel}</span>
                      </button>
                    </PopoverTrigger>
                    <PopoverContent className="w-72 p-0" align="end">
                      <div className="p-2 border-b border-border">
                        <div className="relative">
                          <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-foreground-muted" />
                          <Input
                            value={timezoneSearch}
                            onChange={(e) => setTimezoneSearch(e.target.value)}
                            placeholder="Search city or country..."
                            className="pl-8 h-9"
                            autoFocus
                          />
                        </div>
                      </div>
                      <ScrollArea className="h-64">
                        <div className="p-1">
                          {filteredTimezones.map(tz => (
                            <button
                              key={tz.value}
                              onClick={() => handleTimezoneSelect(tz.value)}
                              className={cn(
                                "w-full text-left px-3 py-2 text-sm rounded-md transition-colors",
                                timezone === tz.value
                                  ? "bg-primary text-primary-foreground"
                                  : "hover:bg-secondary"
                              )}
                            >
                              {tz.label}
                            </button>
                          ))}
                          {filteredTimezones.length === 0 && (
                            <div className="px-3 py-4 text-sm text-foreground-muted text-center">
                              No timezones found
                            </div>
                          )}
                        </div>
                      </ScrollArea>
                    </PopoverContent>
                  </Popover>
                </div>

                {/* Default View Preference */}
                <div className="space-y-3">
                  <Label>Default View on Login</Label>
                  <p className="text-xs text-foreground-muted -mt-1">
                    Choose which calendar view to show when you open the app
                  </p>
                  <div className="grid grid-cols-4 gap-2">
                    {defaultViews.map(view => (
                      <button
                        key={view.value}
                        onClick={() => setDefaultView(view.value)}
                        className={cn(
                          "flex flex-col items-center gap-1.5 p-3 rounded-lg border transition-all",
                          defaultView === view.value
                            ? "border-primary bg-primary/10 text-primary"
                            : "border-border hover:border-primary/50 text-foreground-muted"
                        )}
                      >
                        {view.icon}
                        <span className="text-xs">{view.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Highlight Color Preference - for ADHD/Autism friendly customization */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-highlight" />
                    <Label>Highlight Color</Label>
                  </div>
                  <p className="text-xs text-foreground-muted -mt-1">
                    Choose a calming accent color that works best for you
                  </p>
                  <div className="grid grid-cols-5 gap-2">
                    {highlightColors.map(color => (
                      <button
                        key={color.value}
                        onClick={() => {
                          setHighlightColor(color.value);
                          // Preview immediately
                          document.documentElement.setAttribute('data-highlight', color.value);
                        }}
                        className={cn(
                          "flex flex-col items-center gap-1.5 p-3 rounded-lg border transition-all",
                          highlightColor === color.value
                            ? "border-highlight bg-highlight-muted ring-1 ring-highlight/30"
                            : "border-border hover:border-foreground-muted"
                        )}
                      >
                        <div className={cn("w-5 h-5 rounded-full", color.colorClass)} />
                        <span className="text-2xs text-foreground-muted">{color.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Creator Type */}
                <div className="space-y-3">
                  <Label>Creator Type</Label>
                  <div className="grid grid-cols-4 gap-3">
                    {creatorTypes.slice(0, 4).map(type => (
                      <button
                        key={type.value}
                        onClick={() => setCreatorType(type.value)}
                        className={cn(
                          "flex flex-col items-center gap-1.5 p-3 rounded-lg border transition-all",
                          creatorType === type.value
                            ? "border-primary bg-primary/10 text-primary"
                            : "border-border hover:border-primary/50 text-foreground-muted"
                        )}
                      >
                        {type.icon}
                        <span className="text-2xs">{type.label}</span>
                      </button>
                    ))}
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    {creatorTypes.slice(4).map(type => (
                      <button
                        key={type.value}
                        onClick={() => setCreatorType(type.value)}
                        className={cn(
                          "flex flex-col items-center gap-1.5 p-3 rounded-lg border transition-all",
                          creatorType === type.value
                            ? "border-primary bg-primary/10 text-primary"
                            : "border-border hover:border-primary/50 text-foreground-muted"
                        )}
                      >
                        {type.icon}
                        <span className="text-2xs">{type.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Platforms - Dynamic */}
                <div className="space-y-3">
                  <Label>Platforms</Label>
                  <div className="flex flex-wrap gap-2">
                    {platforms.map(platform => (
                      <Badge 
                        key={platform} 
                        variant="secondary"
                        className="gap-1.5 pr-1.5 py-1"
                      >
                        {platform}
                        <button
                          onClick={() => removePlatform(platform)}
                          className="ml-1 hover:text-destructive"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                  <div className="flex gap-2 flex-wrap">
                    {PRESET_PLATFORMS.filter(p => !platforms.includes(p)).slice(0, 6).map(platform => (
                      <Button
                        key={platform}
                        variant="outline"
                        size="sm"
                        onClick={() => addPlatform(platform)}
                        className="text-xs h-8"
                      >
                        <Plus className="w-3 h-3 mr-1" />
                        {platform}
                      </Button>
                    ))}
                  </div>
                  <div className="flex gap-3">
                    <Input
                      value={newPlatform}
                      onChange={(e) => setNewPlatform(e.target.value)}
                      placeholder="Add custom platform"
                      className="flex-1 h-10 text-sm"
                      onKeyDown={(e) => e.key === 'Enter' && addPlatform(newPlatform)}
                    />
                    <Button size="sm" variant="secondary" onClick={() => addPlatform(newPlatform)} className="h-10">
                      Add
                    </Button>
                  </div>
                </div>

                {/* Niche Keywords - Dynamic */}
                <div className="space-y-3">
                  <Label>Niche Keywords</Label>
                  <div className="flex flex-wrap gap-2">
                    {nicheKeywords.map(keyword => (
                      <Badge 
                        key={keyword} 
                        variant="outline"
                        className="gap-1.5 pr-1.5 py-1"
                      >
                        {keyword}
                        <button
                          onClick={() => removeKeyword(keyword)}
                          className="ml-1 hover:text-destructive"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                  <div className="flex gap-3">
                    <Input
                      value={newKeyword}
                      onChange={(e) => setNewKeyword(e.target.value)}
                      placeholder="Add keyword (e.g., indie music, watercolor)"
                      className="flex-1 h-10 text-sm"
                      onKeyDown={(e) => e.key === 'Enter' && addKeyword()}
                    />
                    <Button size="sm" variant="secondary" onClick={addKeyword} className="h-10">
                      Add
                    </Button>
                  </div>
                  <p className="text-xs text-foreground-muted">Keywords help AI provide better suggestions</p>
                </div>

                {/* About Audience */}
                <div className="space-y-3">
                  <Label htmlFor="audienceDescription">About Your Audience</Label>
                  <Textarea
                    id="audienceDescription"
                    value={audienceDescription}
                    onChange={(e) => setAudienceDescription(e.target.value)}
                    placeholder="Who is your audience? What do they care about?"
                    className="min-h-[100px] resize-none"
                  />
                </div>

                {/* More About You - Enhanced AI personalization */}
                <div className="space-y-3 p-4 bg-secondary/20 rounded-lg border border-border/50">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <User className="w-4 h-4 text-primary" />
                    </div>
                    <div className="flex-1">
                      <Label htmlFor="moreAboutYou" className="text-sm font-medium">Tell AI More About You</Label>
                      <p className="text-xs text-foreground-muted mt-0.5">
                        Share your creative journey, interests, inspirations, and goals. This helps AI suggest better trends and content ideas.
                      </p>
                    </div>
                  </div>
                  <Textarea
                    id="moreAboutYou"
                    value={moreAboutYou}
                    onChange={(e) => setMoreAboutYou(e.target.value)}
                    placeholder="Example: I'm a visual artist exploring the intersection of traditional watercolor and digital art. I'm inspired by nature, Japanese aesthetics, and mid-century design. My goal is to build a sustainable creative practice and connect with collectors who appreciate handmade work..."
                    className="min-h-[140px] resize-none"
                  />
                  <p className="text-xs text-foreground-muted">
                    ✨ The more detail you share, the better AI can personalize suggestions for you
                  </p>
                </div>
              </TabsContent>

              {/* Sharing Tab */}
              <TabsContent value="sharing" className="px-6 py-8 space-y-6 mt-0">
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Users className="w-4 h-4" />
                      Shared Access
                    </CardTitle>
                    <CardDescription>
                      People who can view or edit your calendar and tasks
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {sharedCalendars.length === 0 ? (
                      <p className="text-sm text-foreground-muted py-6 text-center">
                        You haven't shared your calendar with anyone yet
                      </p>
                    ) : (
                      <div className="space-y-3">
                        {sharedCalendars.map(share => (
                          <div key={share.id} className="flex items-center justify-between p-4 bg-secondary/50 rounded-lg">
                            <div>
                              <p className="text-sm font-medium">
                                {share.shared_with_profile?.display_name || share.shared_with_profile?.email || 'User'}
                              </p>
                              <p className="text-xs text-foreground-muted">
                                {share.can_edit ? 'Can edit' : 'View only'}
                              </p>
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => revokeShare(share.id)}
                              className="text-destructive hover:text-destructive"
                            >
                              Revoke
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Share2 className="w-4 h-4" />
                      Shared Tasks
                    </CardTitle>
                    <CardDescription>
                      Tasks you've shared with others will appear with a shared indicator
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-foreground-muted py-4">
                      Enable sharing on individual tasks to collaborate with others
                    </p>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Account Tab */}
              <TabsContent value="account" className="px-6 py-8 space-y-6 mt-0">
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Key className="w-4 h-4" />
                      Password & Security
                    </CardTitle>
                    <CardDescription>
                      Manage your account security settings
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <Button variant="outline" className="w-full justify-start h-11">
                      Change Password
                    </Button>
                    <Separator />
                    <div className="text-sm text-foreground-muted py-2">
                      <p className="mb-2">Account created with email authentication</p>
                      <p className="text-xs">Two-factor authentication coming soon</p>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base text-destructive">Danger Zone</CardTitle>
                    <CardDescription>
                      Irreversible account actions
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Button variant="destructive" size="sm">
                      Delete Account
                    </Button>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Billing Tab */}
              <TabsContent value="billing" className="px-6 py-8 space-y-6 mt-0">
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                      <CreditCard className="w-4 h-4" />
                      Current Plan
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between p-5 bg-primary/10 rounded-lg">
                      <div>
                        <p className="font-medium">Free Plan</p>
                        <p className="text-sm text-foreground-muted">Basic features included</p>
                      </div>
                      <Button variant="default" size="sm">
                        Upgrade
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base">Payment Methods</CardTitle>
                    <CardDescription>
                      Add or manage payment methods
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Button variant="outline" className="w-full justify-start h-11">
                      <Plus className="w-4 h-4 mr-2" />
                      Add Payment Method
                    </Button>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base">Billing History</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-foreground-muted py-6 text-center">
                      No billing history yet
                    </p>
                  </CardContent>
                </Card>
              </TabsContent>
            </div>

            {/* Save Button - Fixed at bottom */}
            <div className="flex justify-end gap-2 px-6 py-4 border-t border-border bg-background">
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button onClick={handleSave} disabled={saving} className="gap-2">
                {saving ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Save className="w-4 h-4" />
                )}
                Save
              </Button>
            </div>
          </Tabs>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default ProfileModal;
