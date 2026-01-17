import { useState, useEffect, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { User, Loader2, Save, Camera, ChevronDown, ChevronUp, Music, Palette, PenTool, Heart, Video, Briefcase, Plus, X } from 'lucide-react';
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

const COMMON_TIMEZONES = [
  { value: 'UTC', label: 'UTC' },
  { value: 'America/New_York', label: 'Eastern Time (US)' },
  { value: 'America/Chicago', label: 'Central Time (US)' },
  { value: 'America/Denver', label: 'Mountain Time (US)' },
  { value: 'America/Los_Angeles', label: 'Pacific Time (US)' },
  { value: 'Europe/London', label: 'London' },
  { value: 'Europe/Paris', label: 'Paris/Berlin' },
  { value: 'Europe/Helsinki', label: 'Helsinki' },
  { value: 'Asia/Tokyo', label: 'Tokyo' },
  { value: 'Asia/Shanghai', label: 'Shanghai' },
  { value: 'Asia/Dubai', label: 'Dubai' },
  { value: 'Australia/Sydney', label: 'Sydney' },
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

              {/* Timezone */}
              <div className="space-y-2">
                <Label>Timezone</Label>
                <Select value={timezone} onValueChange={setTimezone}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select timezone" />
                  </SelectTrigger>
                  <SelectContent>
                    {COMMON_TIMEZONES.map(tz => (
                      <SelectItem key={tz.value} value={tz.value}>
                        {tz.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
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
