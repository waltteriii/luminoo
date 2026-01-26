import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Users, UserPlus, Check, X, Calendar, Loader2, Mail, Share2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';

interface FriendsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
}

interface Friend {
  id: string;
  friendId: string;
  displayName: string | null;
  email: string | null;
  avatarUrl: string | null;
  status: string;
  isIncoming: boolean;
}

interface SharedCalendar {
  id: string;
  friendId: string;
  displayName: string | null;
  canEdit: boolean;
  isOwner: boolean;
}

const FriendsModal = ({ open, onOpenChange, userId }: FriendsModalProps) => {
  const [loading, setLoading] = useState(true);
  const [friends, setFriends] = useState<Friend[]>([]);
  const [sharedCalendars, setSharedCalendars] = useState<SharedCalendar[]>([]);
  const [inviteEmail, setInviteEmail] = useState('');
  const [sending, setSending] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (open) {
      loadFriends();
      loadSharedCalendars();
    }
  }, [open, userId]);

  const loadFriends = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('friendships')
        .select('id, user_id, friend_id, status')
        .or(`user_id.eq.${userId},friend_id.eq.${userId}`);

      if (error) throw error;

      const friendsList: Friend[] = await Promise.all(
        (data || []).map(async (f: any) => {
          const isIncoming = f.friend_id === userId;
          const friendId = isIncoming ? f.user_id : f.friend_id;

          const { data: profile } = await supabase
            .from('profiles')
            .select('display_name, avatar_url')
            .eq('id', friendId)
            .maybeSingle();

          return {
            id: f.id,
            friendId,
            displayName: profile?.display_name || null,
            email: null,
            avatarUrl: profile?.avatar_url || null,
            status: f.status,
            isIncoming
          };
        })
      );

      setFriends(friendsList);
    } catch (err) {
      console.error('Load friends error:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadSharedCalendars = async () => {
    try {
      const { data, error } = await supabase
        .from('shared_calendars')
        .select('id, owner_id, shared_with_id, can_edit')
        .or(`owner_id.eq.${userId},shared_with_id.eq.${userId}`);

      if (error) throw error;

      const calendars: SharedCalendar[] = await Promise.all(
        (data || []).map(async (c: any) => {
          const isOwner = c.owner_id === userId;
          const friendId = isOwner ? c.shared_with_id : c.owner_id;

          const { data: profile } = await supabase
            .from('profiles')
            .select('display_name')
            .eq('id', friendId)
            .maybeSingle();

          return {
            id: c.id,
            friendId,
            displayName: profile?.display_name || null,
            canEdit: c.can_edit,
            isOwner
          };
        })
      );

      setSharedCalendars(calendars);
    } catch (err) {
      console.error('Load shared calendars error:', err);
    }
  };

  const handleSendInvite = async () => {
    if (!inviteEmail.trim()) return;

    setSending(true);
    try {
      const { data: result, error: functionError } = await supabase.functions.invoke(
        'find-user-by-email',
        { body: { email: inviteEmail.toLowerCase().trim() } }
      );

      if (functionError) throw functionError;

      const profile = result?.profile;

      if (!profile) {
        toast({
          title: "User not found",
          description: "No user found with that email address.",
          variant: "destructive"
        });
        return;
      }

      if (profile.id === userId) {
        toast({
          title: "Cannot add yourself",
          description: "You cannot send a friend request to yourself.",
          variant: "destructive"
        });
        return;
      }

      const { data: existing } = await supabase
        .from('friendships')
        .select('id')
        .or(`and(user_id.eq.${userId},friend_id.eq.${profile.id}),and(user_id.eq.${profile.id},friend_id.eq.${userId})`)
        .maybeSingle();

      if (existing) {
        toast({
          title: "Already connected",
          description: "You already have a friendship with this user.",
          variant: "destructive"
        });
        return;
      }

      const { error } = await supabase
        .from('friendships')
        .insert({
          user_id: userId,
          friend_id: profile.id,
          status: 'pending'
        });

      if (error) throw error;

      toast({
        title: "Request sent!",
        description: `Friend request sent to ${inviteEmail}`
      });

      setInviteEmail('');
      loadFriends();
    } catch (err) {
      console.error('Send invite error:', err);
      toast({
        title: "Failed to send",
        description: "Could not send friend request. Please try again.",
        variant: "destructive"
      });
    } finally {
      setSending(false);
    }
  };

  const handleAcceptRequest = async (friendshipId: string) => {
    try {
      const { error } = await supabase
        .from('friendships')
        .update({ status: 'accepted' })
        .eq('id', friendshipId);

      if (error) throw error;

      toast({ title: "Friend added!" });
      loadFriends();
    } catch (err) {
      console.error('Accept request error:', err);
    }
  };

  const handleDeclineRequest = async (friendshipId: string) => {
    try {
      const { error } = await supabase
        .from('friendships')
        .update({ status: 'declined' })
        .eq('id', friendshipId);

      if (error) throw error;

      toast({ title: "Request declined" });
      loadFriends();
    } catch (err) {
      console.error('Decline request error:', err);
    }
  };

  const handleRemoveFriend = async (friendshipId: string) => {
    try {
      const { error } = await supabase
        .from('friendships')
        .delete()
        .eq('id', friendshipId);

      if (error) throw error;

      const friend = friends.find(f => f.id === friendshipId);
      if (friend) {
        await supabase
          .from('shared_calendars')
          .delete()
          .or(`and(owner_id.eq.${userId},shared_with_id.eq.${friend.friendId}),and(owner_id.eq.${friend.friendId},shared_with_id.eq.${userId})`);
      }

      toast({ title: "Friend removed" });
      loadFriends();
      loadSharedCalendars();
    } catch (err) {
      console.error('Remove friend error:', err);
    }
  };

  const handleShareCalendar = async (friendId: string, share: boolean) => {
    try {
      if (share) {
        const { error } = await supabase
          .from('shared_calendars')
          .insert({
            owner_id: userId,
            shared_with_id: friendId,
            can_edit: false
          });

        if (error) throw error;
        toast({ title: "Calendar shared!" });
      } else {
        const { error } = await supabase
          .from('shared_calendars')
          .delete()
          .eq('owner_id', userId)
          .eq('shared_with_id', friendId);

        if (error) throw error;
        toast({ title: "Calendar unshared" });
      }
      loadSharedCalendars();
    } catch (err) {
      console.error('Share calendar error:', err);
    }
  };

  const acceptedFriends = friends.filter(f => f.status === 'accepted');
  const pendingRequests = friends.filter(f => f.status === 'pending' && f.isIncoming);
  const sentRequests = friends.filter(f => f.status === 'pending' && !f.isIncoming);

  const getInitials = (name: string | null, email: string | null) => {
    if (name) return name.slice(0, 2).toUpperCase();
    if (email) return email.slice(0, 2).toUpperCase();
    return '??';
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="w-5 h-5 text-primary" />
            Friends & Sharing
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="friends" className="flex-1 flex flex-col overflow-hidden">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="friends" className="gap-2">
              <UserPlus className="w-4 h-4" />
              Friends
            </TabsTrigger>
            <TabsTrigger value="calendars" className="gap-2">
              <Calendar className="w-4 h-4" />
              Shared Calendars
            </TabsTrigger>
          </TabsList>

          <TabsContent value="friends" className="flex-1 overflow-auto space-y-4 mt-4">
            {/* Add Friend */}
            <div className="flex gap-2">
              <Input
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                placeholder="Friend's email address"
                type="email"
                onKeyDown={(e) => e.key === 'Enter' && handleSendInvite()}
              />
              <Button onClick={handleSendInvite} disabled={sending || !inviteEmail.trim()}>
                {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Mail className="w-4 h-4" />}
              </Button>
            </div>

            {loading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-foreground-muted" />
              </div>
            ) : (
              <div className="space-y-4">
                {/* Pending Requests */}
                {pendingRequests.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="text-sm font-medium text-foreground-muted">Pending Requests</h4>
                    {pendingRequests.map(friend => (
                      <div key={friend.id} className="flex items-center justify-between p-3 rounded-lg bg-secondary/50 border border-primary/20">
                        <div className="flex items-center gap-3">
                          <Avatar className="w-10 h-10">
                            <AvatarImage src={friend.avatarUrl || undefined} />
                            <AvatarFallback>{getInitials(friend.displayName, null)}</AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium text-sm">{friend.displayName || 'Unknown User'}</p>
                            <p className="text-xs text-foreground-muted">Wants to connect</p>
                          </div>
                        </div>
                        <div className="flex gap-1">
                          <Button size="icon" variant="ghost" className="text-green-500 hover:text-green-600" onClick={() => handleAcceptRequest(friend.id)}>
                            <Check className="w-4 h-4" />
                          </Button>
                          <Button size="icon" variant="ghost" className="text-red-500 hover:text-red-600" onClick={() => handleDeclineRequest(friend.id)}>
                            <X className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Accepted Friends */}
                {acceptedFriends.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="text-sm font-medium text-foreground-muted">Friends</h4>
                    {acceptedFriends.map(friend => {
                      const isSharing = sharedCalendars.some(c => c.friendId === friend.friendId && c.isOwner);
                      return (
                        <div key={friend.id} className="flex items-center justify-between p-3 rounded-lg bg-card border border-border">
                          <div className="flex items-center gap-3">
                            <Avatar className="w-10 h-10">
                              <AvatarImage src={friend.avatarUrl || undefined} />
                              <AvatarFallback>{getInitials(friend.displayName, null)}</AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="font-medium text-sm">{friend.displayName || 'Unknown User'}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <div className="flex items-center gap-2">
                              <Share2 className={cn("w-4 h-4", isSharing ? "text-primary" : "text-foreground-muted")} />
                              <Switch
                                checked={isSharing}
                                onCheckedChange={(checked) => handleShareCalendar(friend.friendId, checked)}
                              />
                            </div>
                            <Button size="icon" variant="ghost" className="text-foreground-muted hover:text-destructive" onClick={() => handleRemoveFriend(friend.id)}>
                              <X className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Sent Requests */}
                {sentRequests.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="text-sm font-medium text-foreground-muted">Sent Requests</h4>
                    {sentRequests.map(friend => (
                      <div key={friend.id} className="flex items-center justify-between p-3 rounded-lg bg-card border border-border opacity-70">
                        <div className="flex items-center gap-3">
                          <Avatar className="w-10 h-10">
                            <AvatarImage src={friend.avatarUrl || undefined} />
                            <AvatarFallback>{getInitials(friend.displayName, null)}</AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium text-sm">{friend.displayName || 'Unknown User'}</p>
                            <Badge variant="secondary" className="text-2xs">Pending</Badge>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {friends.length === 0 && (
                  <div className="text-center py-8 text-foreground-muted">
                    <Users className="w-12 h-12 mx-auto mb-2 opacity-50" />
                    <p>No friends yet</p>
                    <p className="text-sm">Add friends by their email address</p>
                  </div>
                )}
              </div>
            )}
          </TabsContent>

          <TabsContent value="calendars" className="flex-1 overflow-auto space-y-4 mt-4">
            {/* Calendars I'm sharing */}
            <div className="space-y-2">
              <h4 className="text-sm font-medium text-foreground-muted">Your Shared Calendar</h4>
              <p className="text-xs text-foreground-muted">Toggle sharing in the Friends tab to share your calendar.</p>

              {sharedCalendars.filter(c => c.isOwner).length > 0 ? (
                <div className="space-y-2">
                  {sharedCalendars.filter(c => c.isOwner).map(cal => (
                    <div key={cal.id} className="flex items-center justify-between p-3 rounded-lg bg-card border border-border">
                      <span className="text-sm">{cal.displayName || 'Unknown'}</span>
                      <Badge variant="secondary">Can view</Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-foreground-muted py-2">Not sharing with anyone yet</p>
              )}
            </div>

            {/* Calendars shared with me */}
            <div className="space-y-2">
              <h4 className="text-sm font-medium text-foreground-muted">Shared With You</h4>

              {sharedCalendars.filter(c => !c.isOwner).length > 0 ? (
                <div className="space-y-2">
                  {sharedCalendars.filter(c => !c.isOwner).map(cal => (
                    <div key={cal.id} className="flex items-center justify-between p-3 rounded-lg bg-card border border-border">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-primary" />
                        <span className="text-sm">{cal.displayName || 'Unknown'}'s calendar</span>
                      </div>
                      <Badge variant="outline">View only</Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-foreground-muted py-2">No one has shared their calendar with you yet</p>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};

export default FriendsModal;