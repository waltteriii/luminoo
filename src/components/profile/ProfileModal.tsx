import { useState, useEffect, useRef, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { User, Loader2, Save, Camera, Music, Palette, PenTool, Heart, Video, Briefcase, Plus, Clock, Search, X, Shield, CreditCard, Users, Key, Share2, LayoutGrid, Calendar, CalendarDays, Maximize2, Minimize2, SlidersHorizontal, MessageSquare } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { CreatorType, Platform, ZoomLevel } from '@/types';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { supabase } from '@/integrations/supabase/client';

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

const PRESET_PLATFORMS = [
  'Instagram', 'YouTube', 'TikTok', 'Spotify', 'Newsletter', 'Blog', 'Twitter/X', 'LinkedIn', 'Podcast', 'Twitch', 'Discord', 'Substack'
];

// Comprehensive timezone list with search keywords
const ALL_TIMEZONES = [
  { value: 'UTC', label: 'UTC', keywords: ['utc', 'coordinated universal time'] },
  { value: 'America/New_York', label: 'New York (EST)', keywords: ['usa', 'us', 'eastern', 'new york', 'america'] },
  // ... Simplified list for demo
];

type HighlightColor = 'blue' | 'teal' | 'pink' | 'amber' | 'purple';

const ProfileModal = ({ open, onOpenChange, userId, onDefaultViewChange }: ProfileModalProps) => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [displayName, setDisplayName] = useState('');
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [creatorType, setCreatorType] = useState<CreatorType | ''>('content_creator');
  const [audienceDescription, setAudienceDescription] = useState('');
  const [nicheKeywords, setNicheKeywords] = useState<string[]>([]);
  const [newKeyword, setNewKeyword] = useState('');
  const [platforms, setPlatforms] = useState<string[]>([]);
  const [newPlatform, setNewPlatform] = useState('');
  const [moreAboutYou, setMoreAboutYou] = useState('');
  const [timezone, setTimezone] = useState('UTC');
  const [timezoneSearch, setTimezoneSearch] = useState('');
  const [timezonePopoverOpen, setTimezonePopoverOpen] = useState(false);
  const [currentTime, setCurrentTime] = useState('');
  const [defaultView, setDefaultView] = useState<ZoomLevel>('year');
  const [highlightColor, setHighlightColor] = useState<HighlightColor>('blue');
  const [defaultInboxEnergy, setDefaultInboxEnergy] = useState<'high' | 'medium' | 'low' | 'recovery'>('high');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (open && userId) {
      loadProfile();
    }
  }, [open, userId]);

  const loadProfile = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) {
        // If 406 (Not Acceptable) - maybe no profile? But wait, .single() might error if none. 
        // Or if we just signed up, maybe profile wasn't created yet (trigger issues? or manual insertion missing?)
        // For new projects, trigger is usually essential.
        console.error('Error fetching profile:', error);
      }

      if (data) {
        setDisplayName(data.display_name || '');
        setAvatarUrl(data.avatar_url);
        setCreatorType(data.creator_type as CreatorType || 'content_creator');
        setAudienceDescription(data.audience_description || '');
        setNicheKeywords(data.niche_keywords || []);
        setDefaultView(data.default_view as ZoomLevel || 'year');
        setHighlightColor(data.highlight_color as HighlightColor || 'blue');

        // Apply highlight color on load
        if (data.highlight_color) {
          document.documentElement.setAttribute('data-highlight', data.highlight_color);
        }
      }
    } catch (err) {
      console.error('Load profile error:', err);
    } finally {
      setLoading(false);
    }
  };

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

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingAvatar(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${userId}-${Math.random()}.${fileExt}`;
      const filePath = `${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      setAvatarUrl(publicUrl);

      // Update profile immediately with new avatar
      await supabase
        .from('profiles')
        .update({ avatar_url: publicUrl })
        .eq('id', userId);

      toast({ title: "Avatar updated" });
    } catch (error: any) {
      console.error('Avatar upload error:', error);
      toast({
        title: "Error uploading avatar",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const updates = {
        id: userId,
        display_name: displayName,
        creator_type: creatorType,
        audience_description: audienceDescription,
        niche_keywords: nicheKeywords,
        default_view: defaultView,
        highlight_color: highlightColor,
        updated_at: new Date().toISOString(),
      };

      const { error } = await supabase
        .from('profiles')
        .upsert(updates);

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
    } catch (error: any) {
      console.error('Save profile error:', error);
      toast({
        title: "Error saving profile",
        description: error.message,
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl max-h-[85vh] flex flex-col p-0 gap-0 overflow-hidden">
        <DialogHeader className="px-6 py-4 border-b border-border flex-shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <User className="w-5 h-5 text-highlight" />
            Settings
          </DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-foreground-muted" />
          </div>
        ) : (
          <Tabs defaultValue="profile" className="flex-1 min-h-0 flex flex-col">
            <TabsList className="mx-6 mt-4 grid grid-cols-5 w-auto flex-shrink-0">
              <TabsTrigger value="profile" className="text-xs gap-1">
                <User className="w-3 h-3" />
                Profile
              </TabsTrigger>
              <TabsTrigger value="interface" className="text-xs gap-1">
                <SlidersHorizontal className="w-3 h-3" />
                Interface
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
                                  ? "bg-highlight text-highlight-foreground"
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
                            ? "border-highlight bg-highlight/10 text-highlight"
                            : "border-border hover:border-highlight/50 text-foreground-muted"
                        )}
                      >
                        {type.icon}
                        <span className="text-2xs">{type.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Save Button */}
                <div className="flex justify-end pt-4">
                  <Button onClick={handleSave} disabled={saving}>
                    {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                    Save Changes
                  </Button>
                </div>

              </TabsContent>
            </div>
          </Tabs>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default ProfileModal;
