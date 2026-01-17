import { useState, useEffect, useRef, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { User, Loader2, Save, Camera, ChevronDown, ChevronUp, Music, Palette, PenTool, Heart, Video, Briefcase, Plus, Clock, Search } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { CreatorType, Platform } from '@/types';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';

interface ProfileModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
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

const platformOptions: { value: Platform; label: string }[] = [
  { value: 'instagram', label: 'Instagram' },
  { value: 'youtube', label: 'YouTube' },
  { value: 'tiktok', label: 'TikTok' },
  { value: 'spotify', label: 'Spotify' },
  { value: 'newsletter', label: 'Newsletter' },
  { value: 'blog', label: 'Blog' },
  { value: 'twitter', label: 'Twitter/X' },
  { value: 'linkedin', label: 'LinkedIn' },
  { value: 'podcast', label: 'Podcast' },
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

const ProfileModal = ({ open, onOpenChange, userId }: ProfileModalProps) => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [displayName, setDisplayName] = useState('');
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [creatorType, setCreatorType] = useState<CreatorType | ''>('');
  const [audienceDescription, setAudienceDescription] = useState('');
  const [nicheKeywords, setNicheKeywords] = useState('');
  const [selectedPlatforms, setSelectedPlatforms] = useState<Platform[]>([]);
  const [interests, setInterests] = useState('');
  const [favoriteCreators, setFavoriteCreators] = useState('');
  const [timezone, setTimezone] = useState('UTC');
  const [moreInfoOpen, setMoreInfoOpen] = useState(false);
  const [timezoneSearch, setTimezoneSearch] = useState('');
  const [timezonePopoverOpen, setTimezonePopoverOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  // Current time based on selected timezone
  const currentTime = useMemo(() => {
    try {
      return new Date().toLocaleTimeString('en-US', {
        timeZone: timezone,
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
      });
    } catch {
      return new Date().toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
      });
    }
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
        setNicheKeywords((data.niche_keywords || []).join(', '));
        setSelectedPlatforms((data.platforms || []) as Platform[]);
        setTimezone((data as any).timezone || 'UTC');
      }
    } catch (err) {
      console.error('Load profile error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check file size (max 2MB)
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
      // Create a unique file path
      const fileExt = file.name.split('.').pop();
      const filePath = `${userId}/avatar.${fileExt}`;

      // Upload to storage
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file, { upsert: true });

      if (uploadError) {
        // If bucket doesn't exist, we'll store as base64
        console.warn('Storage upload failed, using base64:', uploadError);
        
        // Convert to base64
        const reader = new FileReader();
        reader.onload = async (event) => {
          const base64 = event.target?.result as string;
          setAvatarUrl(base64);
        };
        reader.readAsDataURL(file);
      } else {
        // Get public URL
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
      // Combine interests and favorite creators into audience description
      let fullDescription = audienceDescription;
      if (interests) {
        fullDescription += `\n\nInterests & Inspirations: ${interests}`;
      }
      if (favoriteCreators) {
        fullDescription += `\n\nFavorite Creators/Brands: ${favoriteCreators}`;
      }

      const { error } = await supabase
        .from('profiles')
        .update({
          display_name: displayName || null,
          avatar_url: avatarUrl,
          creator_type: creatorType || null,
          audience_description: fullDescription || null,
          niche_keywords: nicheKeywords.split(',').map(k => k.trim()).filter(Boolean),
          platforms: selectedPlatforms,
          timezone: timezone,
          updated_at: new Date().toISOString(),
        })
        .eq('id', userId);

      if (error) throw error;

      toast({
        title: "Profile saved",
        description: "Your profile has been updated successfully."
      });
      onOpenChange(false);
    } catch (err) {
      console.error('Save profile error:', err);
      toast({
        title: "Failed to save",
        description: "Could not update your profile. Please try again.",
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  };

  const togglePlatform = (platform: Platform) => {
    setSelectedPlatforms(prev => 
      prev.includes(platform)
        ? prev.filter(p => p !== platform)
        : [...prev, platform]
    );
  };

  const handleTimezoneSelect = (tz: string) => {
    setTimezone(tz);
    setTimezonePopoverOpen(false);
    setTimezoneSearch('');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <User className="w-5 h-5 text-primary" />
            Edit Profile
          </DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-foreground-muted" />
          </div>
        ) : (
          <ScrollArea className="flex-1 -mx-6 px-6">
            <div className="space-y-5 pb-4">
              {/* Clock and Timezone - Compact header */}
              <div className="flex items-center justify-between p-3 bg-secondary/50 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="text-2xl font-light text-foreground">{currentTime}</div>
                </div>
                <Popover open={timezonePopoverOpen} onOpenChange={setTimezonePopoverOpen}>
                  <PopoverTrigger asChild>
                    <button className="flex items-center gap-1.5 text-sm text-foreground-muted hover:text-foreground transition-colors">
                      <Clock className="w-4 h-4" />
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

              {/* Avatar */}
              <div className="flex items-center gap-4">
                <div 
                  className="relative w-16 h-16 rounded-full bg-secondary flex items-center justify-center overflow-hidden cursor-pointer group"
                  onClick={() => fileInputRef.current?.click()}
                >
                  {avatarUrl ? (
                    <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                  ) : (
                    <User className="w-8 h-8 text-foreground-muted" />
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
                  <Input
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="Your name"
                    className="font-medium"
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

              {/* Creator Type - Visual Selector */}
              <div className="space-y-2">
                <Label>Creator Type</Label>
                <div className="grid grid-cols-4 gap-2">
                  {creatorTypes.slice(0, 4).map(type => (
                    <button
                      key={type.value}
                      onClick={() => setCreatorType(type.value)}
                      className={cn(
                        "flex flex-col items-center gap-1 p-2 rounded-lg border transition-all",
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
                <div className="grid grid-cols-3 gap-2">
                  {creatorTypes.slice(4).map(type => (
                    <button
                      key={type.value}
                      onClick={() => setCreatorType(type.value)}
                      className={cn(
                        "flex flex-col items-center gap-1 p-2 rounded-lg border transition-all",
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

              {/* Platforms */}
              <div className="space-y-2">
                <Label>Platforms</Label>
                <div className="flex flex-wrap gap-1.5">
                  {platformOptions.map(platform => (
                    <Button
                      key={platform.value}
                      variant={selectedPlatforms.includes(platform.value) ? "default" : "outline"}
                      size="sm"
                      onClick={() => togglePlatform(platform.value)}
                      className="text-xs h-7"
                    >
                      {platform.label}
                    </Button>
                  ))}
                </div>
              </div>

              {/* Niche Keywords */}
              <div className="space-y-2">
                <Label htmlFor="nicheKeywords">Niche Keywords</Label>
                <Input
                  id="nicheKeywords"
                  value={nicheKeywords}
                  onChange={(e) => setNicheKeywords(e.target.value)}
                  placeholder="e.g., indie music, watercolor, self-help"
                />
                <p className="text-2xs text-foreground-muted">Comma-separated keywords for better AI suggestions</p>
              </div>

              {/* More About You - Collapsible */}
              <Collapsible open={moreInfoOpen} onOpenChange={setMoreInfoOpen}>
                <CollapsibleTrigger asChild>
                  <Button variant="ghost" size="sm" className="w-full justify-between text-foreground-muted">
                    More about you (for better AI results)
                    {moreInfoOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent className="space-y-4 pt-2">
                  <div className="space-y-2">
                    <Label htmlFor="audienceDescription">About Your Audience</Label>
                    <Textarea
                      id="audienceDescription"
                      value={audienceDescription}
                      onChange={(e) => setAudienceDescription(e.target.value)}
                      placeholder="Who is your audience? What do they care about?"
                      className="min-h-[80px]"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="interests">Interests & Inspirations</Label>
                    <Input
                      id="interests"
                      value={interests}
                      onChange={(e) => setInterests(e.target.value)}
                      placeholder="e.g., Nine Inch Nails, minimalism, meditation"
                    />
                    <p className="text-2xs text-foreground-muted">Things you're into - helps AI find relevant trends</p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="favoriteCreators">Favorite Creators/Brands</Label>
                    <Input
                      id="favoriteCreators"
                      value={favoriteCreators}
                      onChange={(e) => setFavoriteCreators(e.target.value)}
                      placeholder="e.g., Gary Vee, Apple, MKBHD"
                    />
                  </div>
                </CollapsibleContent>
              </Collapsible>

              {/* Actions */}
              <div className="flex justify-end gap-2 pt-2">
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
            </div>
          </ScrollArea>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default ProfileModal;
