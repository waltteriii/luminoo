import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { User, Loader2, Save } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { CreatorType, Platform } from '@/types';

interface ProfileModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
}

const creatorTypes: { value: CreatorType; label: string }[] = [
  { value: 'musician', label: 'Musician' },
  { value: 'visual_artist', label: 'Visual Artist' },
  { value: 'writer', label: 'Writer' },
  { value: 'coach', label: 'Coach' },
  { value: 'content_creator', label: 'Content Creator' },
  { value: 'entrepreneur', label: 'Entrepreneur' },
  { value: 'other', label: 'Other' },
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

const ProfileModal = ({ open, onOpenChange, userId }: ProfileModalProps) => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [displayName, setDisplayName] = useState('');
  const [creatorType, setCreatorType] = useState<CreatorType | ''>('');
  const [audienceDescription, setAudienceDescription] = useState('');
  const [nicheKeywords, setNicheKeywords] = useState('');
  const [selectedPlatforms, setSelectedPlatforms] = useState<Platform[]>([]);
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
        setCreatorType(data.creator_type || '');
        setAudienceDescription(data.audience_description || '');
        setNicheKeywords((data.niche_keywords || []).join(', '));
        setSelectedPlatforms((data.platforms || []) as Platform[]);
      }
    } catch (err) {
      console.error('Load profile error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          display_name: displayName || null,
          creator_type: creatorType || null,
          audience_description: audienceDescription || null,
          niche_keywords: nicheKeywords.split(',').map(k => k.trim()).filter(Boolean),
          platforms: selectedPlatforms,
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
      <DialogContent className="max-w-md">
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
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="displayName">Display Name</Label>
              <Input
                id="displayName"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Your name"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="creatorType">Creator Type</Label>
              <Select value={creatorType} onValueChange={(v) => setCreatorType(v as CreatorType)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select your type" />
                </SelectTrigger>
                <SelectContent>
                  {creatorTypes.map(type => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Platforms</Label>
              <div className="flex flex-wrap gap-2">
                {platformOptions.map(platform => (
                  <Button
                    key={platform.value}
                    variant={selectedPlatforms.includes(platform.value) ? "default" : "outline"}
                    size="sm"
                    onClick={() => togglePlatform(platform.value)}
                    className="text-xs"
                  >
                    {platform.label}
                  </Button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="nicheKeywords">Niche Keywords</Label>
              <Input
                id="nicheKeywords"
                value={nicheKeywords}
                onChange={(e) => setNicheKeywords(e.target.value)}
                placeholder="e.g., indie music, watercolor, self-help"
              />
              <p className="text-xs text-foreground-muted">Comma-separated keywords for AI personalization</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="audienceDescription">About You & Your Audience</Label>
              <Textarea
                id="audienceDescription"
                value={audienceDescription}
                onChange={(e) => setAudienceDescription(e.target.value)}
                placeholder="Tell us about yourself and your audience to get better AI suggestions..."
                className="min-h-[100px]"
              />
            </div>

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
        )}
      </DialogContent>
    </Dialog>
  );
};

export default ProfileModal;
