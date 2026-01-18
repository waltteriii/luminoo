import { memo } from 'react';
import { cn } from '@/lib/utils';
import { User } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { 
  Squirrel, 
  Menu, 
  LogOut, 
  User as UserIcon,
  ChevronDown 
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useToast } from '@/hooks/use-toast';
import { EnergyLevel } from '@/types';
import EnergySelector from '@/components/planner/NewEnergySelector';
import { useState, useEffect, useCallback } from 'react';
import { useIsMobile } from '@/hooks/use-mobile';

interface HeaderProps {
  user: User;
  currentEnergy: EnergyLevel;
  onEnergyChange: (energy: EnergyLevel) => void;
  onToggleSidebar: () => void;
  onProfileClick: () => void;
  onFilterEnergy?: (energy: EnergyLevel) => void;
  onClearFilters?: () => void;
  onViewInbox?: (energy: EnergyLevel) => void;
  activeFilters?: EnergyLevel[];
  avatarUrl?: string | null;
  onAddTask?: () => void;
  onBrainDump?: () => void;
}

const Header = memo(({ 
  user, 
  currentEnergy, 
  onEnergyChange, 
  onToggleSidebar, 
  onProfileClick,
  onFilterEnergy,
  onClearFilters,
  onViewInbox,
  activeFilters = [],
  avatarUrl,
  onAddTask,
  onBrainDump
}: HeaderProps) => {
  const { toast } = useToast();
  const isMobile = useIsMobile();

  const handleSignOut = useCallback(async () => {
    try {
      const { error } = await supabase.auth.signOut({ scope: 'local' });
      if (error) {
        toast({
          title: "Error signing out",
          description: error.message,
          variant: "destructive",
        });
      }
    } catch (err) {
      // Force local signout even if network fails
      await supabase.auth.signOut({ scope: 'local' });
    }
  }, [toast]);

  const displayName = user.email?.split('@')[0] || 'User';

  return (
    <header className={cn(
      "border-b border-border bg-background-elevated flex items-center justify-between",
      isMobile ? "h-[60px] px-3 gap-3" : "h-14 px-4 lg:px-6 gap-2"
    )}>
      {/* Left section - hamburger + logo */}
      <div className="flex items-center gap-2 flex-shrink-0">
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={onToggleSidebar}
          className={cn(
            "text-foreground-muted hover:text-foreground",
            isMobile ? "h-10 w-10" : "h-11 w-11"
          )}
        >
          <Menu className="w-5 h-5" />
        </Button>
        
        {/* Logo - hide on mobile to save space */}
        {!isMobile && (
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-lg bg-primary flex items-center justify-center flex-shrink-0">
              <Squirrel className="w-4 h-4 text-primary-foreground" />
            </div>
            <span className="font-medium text-foreground text-sm hidden md:block">Luminoo</span>
          </div>
        )}
      </div>

      {/* Center section - Energy selector */}
      <div className="flex-1 flex items-center justify-center min-w-0">
        <EnergySelector 
          value={currentEnergy} 
          onChange={onEnergyChange}
          onFilterClick={onFilterEnergy}
          activeFilters={activeFilters}
          onShowAll={onClearFilters}
          onViewInbox={onViewInbox}
          onAddTask={onAddTask}
          onBrainDump={onBrainDump}
        />
      </div>

      {/* Right section - avatar only */}
      <div className="flex items-center flex-shrink-0">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button 
              variant="ghost" 
              className={cn(
                "flex items-center gap-2 text-foreground-muted hover:text-foreground px-2",
                isMobile ? "h-10" : "h-10"
              )}
            >
              <div className="w-7 h-7 rounded-full bg-secondary flex items-center justify-center overflow-hidden flex-shrink-0">
                {avatarUrl ? (
                  <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                ) : (
                  <UserIcon className="w-4 h-4 text-foreground-muted" />
                )}
              </div>
              {!isMobile && (
                <>
                  <span className="text-sm max-w-[80px] truncate">{displayName}</span>
                  <ChevronDown className="w-3.5 h-3.5 flex-shrink-0" />
                </>
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem onClick={onProfileClick} className="text-foreground-muted cursor-pointer min-h-[40px]">
              <UserIcon className="w-4 h-4 mr-2" />
              Profile
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem 
              onClick={handleSignOut}
              className="text-destructive focus:text-destructive min-h-[40px]"
            >
              <LogOut className="w-4 h-4 mr-2" />
              Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
});

Header.displayName = 'Header';

export default Header;
