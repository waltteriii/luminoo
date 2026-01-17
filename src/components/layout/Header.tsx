import { User } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { 
  Sparkles, 
  Menu, 
  Sun, 
  Moon, 
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
import EnergySelector from '@/components/planner/EnergySelector';
import { useState, useEffect } from 'react';

interface HeaderProps {
  user: User;
  currentEnergy: EnergyLevel;
  onEnergyChange: (energy: EnergyLevel) => void;
  onToggleSidebar: () => void;
}

const Header = ({ user, currentEnergy, onEnergyChange, onToggleSidebar }: HeaderProps) => {
  const { toast } = useToast();
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');

  useEffect(() => {
    // Check if light theme is set
    const isLight = document.documentElement.classList.contains('light');
    setTheme(isLight ? 'light' : 'dark');
  }, []);

  const toggleTheme = () => {
    const newTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(newTheme);
    
    if (newTheme === 'light') {
      document.documentElement.classList.add('light');
    } else {
      document.documentElement.classList.remove('light');
    }
  };

  const handleSignOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      toast({
        title: "Error signing out",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const displayName = user.email?.split('@')[0] || 'User';

  return (
    <header className="h-14 border-b border-border bg-background-elevated flex items-center justify-between px-4">
      {/* Left section */}
      <div className="flex items-center gap-3">
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={onToggleSidebar}
          className="text-foreground-muted hover:text-foreground"
        >
          <Menu className="w-5 h-5" />
        </Button>
        
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
            <Sparkles className="w-4 h-4 text-primary-foreground" />
          </div>
          <span className="font-medium text-foreground hidden sm:block">Planner</span>
        </div>
      </div>

      {/* Center section - Energy selector */}
      <div className="flex items-center">
        <EnergySelector 
          value={currentEnergy} 
          onChange={onEnergyChange} 
        />
      </div>

      {/* Right section */}
      <div className="flex items-center gap-2">
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={toggleTheme}
          className="text-foreground-muted hover:text-foreground"
        >
          {theme === 'dark' ? (
            <Sun className="w-4 h-4" />
          ) : (
            <Moon className="w-4 h-4" />
          )}
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button 
              variant="ghost" 
              className="flex items-center gap-2 text-foreground-muted hover:text-foreground"
            >
              <div className="w-7 h-7 rounded-full bg-secondary flex items-center justify-center">
                <UserIcon className="w-4 h-4 text-foreground-muted" />
              </div>
              <span className="hidden sm:block text-sm">{displayName}</span>
              <ChevronDown className="w-4 h-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem className="text-foreground-muted">
              <UserIcon className="w-4 h-4 mr-2" />
              Profile
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem 
              onClick={handleSignOut}
              className="text-destructive focus:text-destructive"
            >
              <LogOut className="w-4 h-4 mr-2" />
              Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
};

export default Header;
