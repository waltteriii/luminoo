import { useState, useEffect, useRef, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { User, Loader2, Save, Camera, Music, Palette, PenTool, Heart, Video, Briefcase, Plus, Clock, Search, X, Shield, CreditCard, Users, Key, Share2, LayoutGrid, Calendar, CalendarDays, Maximize2, Minimize2, SlidersHorizontal, MessageSquare, Check } from 'lucide-react';
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
  userEmail?: string;
  onDefaultViewChange?: (view: ZoomLevel) => void;
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

const ALL_TIMEZONES = [
  { value: 'UTC', label: 'UTC', keywords: ['utc', 'coordinated universal time'] },
  { value: 'Europe/Helsinki', label: 'Helsinki (EET)', keywords: ['finland', 'helsinki', 'europe'] },
  { value: 'America/New_York', label: 'New York (EST)', keywords: ['usa', 'us', 'eastern', 'new york', 'america'] },
];

type HighlightColor = 'blue' | 'teal' | 'pink' | 'amber' | 'purple';

const ProfileModal = ({ open, onOpenChange, userId, userEmail, onDefaultViewChange }: ProfileModalProps) => {
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
  const [timezone, setTimezone] = useState('UTC');
  const [timezoneSearch, setTimezoneSearch] = useState('');
  const [timezonePopoverOpen, setTimezonePopoverOpen] = useState(false);
  const [currentTime, setCurrentTime] = useState('');
  const [defaultView, setDefaultView] = useState<ZoomLevel>('year');
  const [highlightColor, setHighlightColor] = useState<HighlightColor>('blue');
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

      if (data) {
        setDisplayName(data.display_name || '');
        setAvatarUrl(data.avatar_url);
        setCreatorType(data.creator_type as CreatorType || 'content_creator');
        setAudienceDescription(data.audience_description || '');
        setNicheKeywords(data.niche_keywords || []);
        setDefaultView(data.default_view as ZoomLevel || 'year');
        setHighlightColor(data.highlight_color as HighlightColor || 'blue');
      }
    } catch (err) {
      console.error('Load profile error:', err);
    } finally {
      setLoading(false);
    }
  };

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

  // Live preview for highlight color
  useEffect(() => {
    if (highlightColor) {
      document.documentElement.setAttribute('data-highlight', highlightColor);
    }
  }, [highlightColor]);

  const filteredTimezones = useMemo(() => {
    const search = timezoneSearch.toLowerCase();
    if (!search) return ALL_TIMEZONES;
    return ALL_TIMEZONES.filter(tz =>
      tz.label.toLowerCase().includes(search) ||
      tz.value.toLowerCase().includes(search) ||
      tz.keywords.some(k => k.includes(search))
    );
  }, [timezoneSearch]);

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
      await supabase.from('profiles').update({ avatar_url: publicUrl }).eq('id', userId);
      toast({ title: "Avatar updated" });
    } catch (error: any) {
      console.error('Avatar upload error:', error);
      toast({ title: "Error uploading avatar", description: error.message, variant: "destructive" });
    } finally { setUploadingAvatar(false); }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const updates = {
        id: userId,
        email: userEmail,
        display_name: displayName,
        creator_type: creatorType,
        audience_description: audienceDescription,
        niche_keywords: nicheKeywords,
        default_view: defaultView,
        highlight_color: highlightColor,
        updated_at: new Date().toISOString(),
      };
      const { error } = await supabase.from('profiles').upsert(updates);
      if (error) throw error;
      document.documentElement.setAttribute('data-highlight', highlightColor);
      if (onDefaultViewChange) onDefaultViewChange(defaultView);
      toast({ title: "Profile saved", description: "Your profile has been updated successfully." });
      onOpenChange(false);
    } catch (error: any) {
      console.error('Save profile error:', error);
      toast({ title: "Error saving profile", description: error.message, variant: "destructive" });
    } finally { setSaving(false); }
  };

  const selectedTimezoneLabel = ALL_TIMEZONES.find(tz => tz.value === timezone)?.label || timezone;

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
              <TabsContent value="profile" className="px-6 py-8 space-y-8 mt-0 pr-8">
                <div className="flex items-center gap-5">
                  <div className="relative w-20 h-20 rounded-full bg-secondary flex items-center justify-center overflow-hidden cursor-pointer group" onClick={() => fileInputRef.current?.click()}>
                    {avatarUrl ? <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" /> : <User className="w-10 h-10 text-foreground-muted" />}
                    <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      {uploadingAvatar ? <Loader2 className="w-5 h-5 animate-spin text-white" /> : <Camera className="w-5 h-5 text-white" />}
                    </div>
                  </div>
                  <div className="flex-1">
                    <Label className="text-xs text-foreground-muted mb-1.5 block">Display Name</Label>
                    <Input value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="Your name" className="font-medium h-11" />
                  </div>
                  <input ref={fileInputRef} type="file" accept="image/*" onChange={handleAvatarUpload} className="hidden" />
                </div>

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
                          <Input value={timezoneSearch} onChange={(e) => setTimezoneSearch(e.target.value)} placeholder="Search city or country..." className="pl-8 h-9" autoFocus />
                        </div>
                      </div>
                      <ScrollArea className="h-64">
                        <div className="p-1">
                          {filteredTimezones.map(tz => (
                            <button key={tz.value} onClick={() => { setTimezone(tz.value); setTimezonePopoverOpen(false); setTimezoneSearch(''); }} className={cn("w-full text-left px-3 py-2 text-sm rounded-md transition-colors", timezone === tz.value ? "bg-highlight text-highlight-foreground" : "hover:bg-secondary")}>{tz.label}</button>
                          ))}
                        </div>
                      </ScrollArea>
                    </PopoverContent>
                  </Popover>
                </div>

                <div className="space-y-3">
                  <Label>Creator Type</Label>
                  <div className="grid grid-cols-4 gap-3">
                    {creatorTypes.slice(0, 4).map(type => (
                      <button key={type.value} onClick={() => setCreatorType(type.value)} className={cn("flex flex-col items-center gap-1.5 p-3 rounded-lg border transition-all", creatorType === type.value ? "border-highlight bg-highlight/10 text-highlight" : "border-border hover:border-highlight/50 text-foreground-muted")}>
                        {type.icon}
                        <span className="text-2xs">{type.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex justify-end pt-4">
                  <Button onClick={handleSave} disabled={saving}>{saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}Save Changes</Button>
                </div>
              </TabsContent>

              <TabsContent value="interface" className="px-6 py-8 space-y-8 mt-0 pr-8">
                <div className="space-y-6">
                  <div>
                    <Label className="text-sm font-medium mb-3 block">Accent Color</Label>
                    <div className="flex flex-wrap gap-3">
                      {(['blue', 'teal', 'pink', 'amber', 'purple'] as HighlightColor[]).map((color) => (
                        <button key={color} onClick={() => setHighlightColor(color)} className={cn("w-12 h-12 rounded-full border-2 transition-all flex items-center justify-center relative", highlightColor === color ? "border-foreground scale-110 shadow-md" : "border-transparent opacity-80 hover:opacity-100")} style={{ backgroundColor: `var(--${color}-500, ${color})` }}>
                          {highlightColor === color && <Check className="w-5 h-5 text-white" />}
                          <span className={cn("absolute -bottom-6 text-[10px] uppercase font-medium tracking-tight", highlightColor === color ? "text-foreground" : "text-muted-foreground")}>{color}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="pt-4">
                    <Label className="text-sm font-medium mb-3 block">Default View</Label>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      {(['year', 'month', 'week', 'day'] as ZoomLevel[]).map((view) => (
                        <button key={view} onClick={() => setDefaultView(view)} className={cn("flex flex-col items-center gap-2 p-3 rounded-lg border transition-all", defaultView === view ? "border-highlight bg-highlight/10 text-highlight" : "border-border hover:border-highlight/50 text-foreground-muted")}>
                          {view === 'year' && <LayoutGrid className="w-5 h-5" />}
                          {view === 'month' && <Calendar className="w-5 h-5" />}
                          {view === 'week' && <CalendarDays className="w-5 h-5" />}
                          {view === 'day' && <Clock className="w-5 h-5" />}
                          <span className="text-xs capitalize">{view}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="flex justify-end pt-8">
                  <Button onClick={handleSave} disabled={saving}>{saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}Save Changes</Button>
                </div>
              </TabsContent>

              <TabsContent value="sharing" className="px-6 py-8 space-y-8 mt-0 pr-8">
                <div className="p-6 rounded-xl border border-dashed border-border bg-secondary/20 text-center">
                  <Share2 className="w-12 h-12 mx-auto mb-4 text-foreground-muted opacity-50" />
                  <h3 className="text-lg font-medium mb-2">Collaboration & Sharing</h3>
                  <p className="text-sm text-foreground-muted max-w-sm mx-auto mb-6">Connect with other creators to share calendars, coordinate launches, and plan collaborations.</p>
                  <Button variant="outline" className="gap-2" onClick={() => { onOpenChange(false); (document.querySelector('[data-trigger-friends]') as HTMLButtonElement)?.click(); }}>
                    <Users className="w-4 h-4" />Open Friends & Sharing
                  </Button>
                </div>
              </TabsContent>

              <TabsContent value="account" className="px-6 py-8 space-y-8 mt-0 pr-8">
                <div className="space-y-6">
                  <div>
                    <Label className="text-xs text-foreground-muted mb-1.5 block">Email Address</Label>
                    <Input value={userEmail || ''} disabled className="bg-secondary/50" />
                  </div>
                  <div className="pt-6 border-t border-border">
                    <h4 className="text-sm font-medium text-destructive mb-3">Danger Zone</h4>
                    <Button variant="outline" className="justify-start gap-2 border-destructive/20 hover:bg-destructive/10 hover:text-destructive" onClick={async () => { await supabase.auth.signOut(); onOpenChange(false); }}>
                      <X className="w-4 h-4" />Sign Out
                    </Button>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="billing" className="px-6 py-8 space-y-8 mt-0 pr-8">
                <div className="space-y-6">
                  <div className="p-4 rounded-lg bg-highlight/5 border border-highlight/20 flex items-center justify-between">
                    <div><h4 className="text-sm font-semibold text-highlight">Free Beta</h4><p className="text-xs text-foreground-muted">Early access contributor</p></div>
                    <Badge variant="outline" className="bg-highlight/10 text-highlight border-highlight/20">Active</Badge>
                  </div>
                  <div className="space-y-4">
                    <h4 className="text-sm font-medium">Included Features</h4>
                    <ul className="space-y-2">
                      {['Full annual planning views', 'Unlimited tasks & campaigns', 'Base AI brain dump parsing', 'Social sharing'].map(f => (
                        <li key={f} className="flex items-center gap-2 text-xs text-foreground-muted"><Check className="w-3.5 h-3.5 text-highlight" />{f}</li>
                      ))}
                    </ul>
                  </div>
                  <Button className="w-full" variant="outline" disabled>Upgrade to Pro (Coming Soon)</Button>
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
