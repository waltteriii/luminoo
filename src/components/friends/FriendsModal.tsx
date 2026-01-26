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
  const [loading, setLoading] = useState(false);
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
    // Mock friends
    setTimeout(() => {
      setLoading(false);
      setFriends([]);
    }, 500);
  };

  const loadSharedCalendars = async () => {
    // Mock only
    setSharedCalendars([]);
  };

  const handleSendInvite = async () => {
    if (!inviteEmail.trim()) return;

    setSending(true);
    setTimeout(() => {
      setSending(false);
      setInviteEmail('');
      toast({ title: "Invite sent (demo)", description: "This is a frontend demo." });
    }, 1000);
  };

  const handleAcceptRequest = async (friendshipId: string) => {
    // Mock
    toast({ title: "Friend added!" });
  };

  const handleDeclineRequest = async (friendshipId: string) => {
    // Mock
    toast({ title: "Request declined" });
  };

  const handleRemoveFriend = async (friendshipId: string) => {
    // Mock
    toast({ title: "Friend removed" });
  };

  const handleShareCalendar = async (friendId: string, share: boolean) => {
    // Mock
    toast({ title: share ? "Calendar shared!" : "Calendar unshared" });
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
            <p className="text-sm text-foreground-muted py-2">Not sharing with anyone yet</p>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};

export default FriendsModal;