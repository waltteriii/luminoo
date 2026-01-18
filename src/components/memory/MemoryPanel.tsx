import { useState, useEffect, useRef } from 'react';
import { useDroppable } from '@dnd-kit/core';
import { supabase } from '@/integrations/supabase/client';
import { Task, EnergyLevel } from '@/types';
import { cn } from '@/lib/utils';
import { Archive, Plus, Search, ChevronDown, ChevronUp, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import MemoryItem from './MemoryItem';

interface MemoryPanelProps {
  userId: string;
  isOpen: boolean;
  onClose: () => void;
}

const MAX_VISIBLE_ITEMS = 8;

const MemoryPanel = ({ userId, isOpen, onClose }: MemoryPanelProps) => {
  const [items, setItems] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [newItemTitle, setNewItemTitle] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const { setNodeRef, isOver } = useDroppable({
    id: 'memory-panel',
    data: { type: 'memory' },
  });

  useEffect(() => {
    if (isOpen) {
      loadItems();
    }
  }, [isOpen, userId]);

  const loadItems = async () => {
    setLoading(true);
    try {
      // Memory items are tasks with a special marker - using location field as "memory"
      const { data, error } = await supabase
        .from('tasks')
        .select('*')
        .eq('user_id', userId)
        .eq('location', 'memory')
        .is('due_date', null)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setItems((data || []) as Task[]);
    } catch (error) {
      console.error('Error loading memory items:', error);
      toast.error('Failed to load memory items');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateItem = async () => {
    if (!newItemTitle.trim()) return;

    try {
      const { error } = await supabase.from('tasks').insert({
        user_id: userId,
        title: newItemTitle.trim(),
        location: 'memory',
        energy_level: 'medium',
      });

      if (error) throw error;

      setNewItemTitle('');
      loadItems();
      toast.success('Memory item created');
    } catch (error) {
      console.error('Error creating memory item:', error);
      toast.error('Failed to create memory item');
    }
  };

  const handleTitleChange = async (itemId: string, title: string) => {
    try {
      const { error } = await supabase
        .from('tasks')
        .update({ title })
        .eq('id', itemId);

      if (error) throw error;

      setItems(prev => prev.map(item => 
        item.id === itemId ? { ...item, title } : item
      ));
    } catch (error) {
      console.error('Error updating memory item:', error);
      toast.error('Failed to update memory item');
    }
  };

  const handleEnergyChange = async (itemId: string, energy: EnergyLevel) => {
    try {
      const { error } = await supabase
        .from('tasks')
        .update({ energy_level: energy })
        .eq('id', itemId);

      if (error) throw error;

      setItems(prev => prev.map(item => 
        item.id === itemId ? { ...item, energy_level: energy } : item
      ));
    } catch (error) {
      console.error('Error updating energy:', error);
    }
  };

  const handleDelete = async (itemId: string) => {
    try {
      const { error } = await supabase
        .from('tasks')
        .delete()
        .eq('id', itemId);

      if (error) throw error;

      setItems(prev => prev.filter(item => item.id !== itemId));
      toast.success('Memory item deleted');
    } catch (error) {
      console.error('Error deleting memory item:', error);
      toast.error('Failed to delete memory item');
    }
  };

  const handleMoveToInbox = async (itemId: string) => {
    try {
      const { error } = await supabase
        .from('tasks')
        .update({ location: null })
        .eq('id', itemId);

      if (error) throw error;

      setItems(prev => prev.filter(item => item.id !== itemId));
      toast.success('Moved to inbox');
    } catch (error) {
      console.error('Error moving to inbox:', error);
      toast.error('Failed to move to inbox');
    }
  };

  const filteredItems = items.filter(item =>
    item.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const visibleItems = expanded ? filteredItems : filteredItems.slice(0, MAX_VISIBLE_ITEMS);
  const hiddenCount = filteredItems.length - MAX_VISIBLE_ITEMS;
  const isOverflowing = filteredItems.length > MAX_VISIBLE_ITEMS;

  if (!isOpen) return null;

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "w-72 border-l border-border bg-sidebar flex flex-col h-full transition-all",
        isOver && "ring-2 ring-highlight ring-inset bg-highlight-muted/30"
      )}
    >
      {/* Header */}
      <div className="p-3 border-b border-border flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Archive className="w-4 h-4 text-foreground-muted" />
          <span className="text-sm font-medium">Memory</span>
          <span className="text-xs text-foreground-muted">({items.length})</span>
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0"
            onClick={() => setShowSearch(!showSearch)}
          >
            <Search className="w-3.5 h-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0"
            onClick={loadItems}
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>

      {/* Search */}
      {showSearch && (
        <div className="p-2 border-b border-border">
          <Input
            placeholder="Search memory..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-8 text-sm"
          />
        </div>
      )}

      {/* New item input */}
      <div className="p-2 border-b border-border">
        <div className="flex gap-1">
          <Input
            ref={inputRef}
            placeholder="Add to memory..."
            value={newItemTitle}
            onChange={(e) => setNewItemTitle(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleCreateItem()}
            className="h-8 text-sm flex-1"
          />
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0"
            onClick={handleCreateItem}
            disabled={!newItemTitle.trim()}
          >
            <Plus className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Items list */}
      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        {loading ? (
          <div className="text-xs text-foreground-muted text-center py-4">
            Loading...
          </div>
        ) : visibleItems.length === 0 ? (
          <div className="text-xs text-foreground-muted text-center py-4">
            {searchQuery ? 'No matching items' : 'Drop tasks here or add new ones'}
          </div>
        ) : (
          visibleItems.map((item) => (
            <MemoryItem
              key={item.id}
              item={item}
              onTitleChange={handleTitleChange}
              onEnergyChange={handleEnergyChange}
              onDelete={handleDelete}
              onMoveToInbox={handleMoveToInbox}
            />
          ))
        )}

        {/* Show more/less toggle */}
        {isOverflowing && (
          <button
            onClick={() => setExpanded(!expanded)}
            className="w-full flex items-center justify-center gap-1 py-1.5 text-xs text-foreground-muted hover:text-foreground transition-colors"
          >
            {expanded ? (
              <>
                <ChevronUp className="w-3 h-3" />
                Show less
              </>
            ) : (
              <>
                <ChevronDown className="w-3 h-3" />
                +{hiddenCount} more
              </>
            )}
          </button>
        )}
      </div>
    </div>
  );
};

export default MemoryPanel;
