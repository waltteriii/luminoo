import { useState, useRef, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Brain, Loader2, Sparkles, Check, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { EnergyLevel, ParsedItem } from '@/types';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import ParsedItemCard from './ParsedItemCard';

interface BrainDumpModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onItemsAdded: (items: ParsedItem[]) => void;
}

const BrainDumpModal = ({ open, onOpenChange, onItemsAdded }: BrainDumpModalProps) => {
  const [text, setText] = useState('');
  const [parsing, setParsing] = useState(false);
  const [parsedItems, setParsedItems] = useState<ParsedItem[]>([]);
  const [summary, setSummary] = useState<string | null>(null);
  const [step, setStep] = useState<'input' | 'review'>('input');
  const { toast } = useToast();

  const handleParse = async () => {
    if (!text.trim()) return;
    
    setParsing(true);
    try {
      const { data, error } = await supabase.functions.invoke('parse-brain-dump', {
        body: { text }
      });

      if (error) throw error;
      
      if (data.error) {
        toast({
          title: "AI Error",
          description: data.error,
          variant: "destructive"
        });
        return;
      }

      setParsedItems(data.items.map((item: ParsedItem, idx: number) => ({
        ...item,
        user_override_energy: null
      })));
      setSummary(data.summary);
      setStep('review');
    } catch (err) {
      console.error('Parse error:', err);
      toast({
        title: "Failed to parse",
        description: "Could not analyze your brain dump. Please try again.",
        variant: "destructive"
      });
    } finally {
      setParsing(false);
    }
  };

  const handleEnergyChange = (index: number, energy: EnergyLevel) => {
    setParsedItems(prev => prev.map((item, i) => 
      i === index ? { ...item, user_override_energy: energy } : item
    ));
  };

  const handleRemoveItem = (index: number) => {
    setParsedItems(prev => prev.filter((_, i) => i !== index));
  };

  const handleAddToPlanner = () => {
    onItemsAdded(parsedItems);
    toast({
      title: "Items added",
      description: `${parsedItems.length} items added to your planner`
    });
    handleClose();
  };

  const handleClose = () => {
    setText('');
    setParsedItems([]);
    setSummary(null);
    setStep('input');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Brain className="w-5 h-5 text-primary" />
            Brain Dump
          </DialogTitle>
        </DialogHeader>

        {step === 'input' ? (
          <div className="flex-1 flex flex-col gap-4">
            <p className="text-sm text-foreground-muted">
              Write everything on your mind. AI will detect tasks, energy levels, dates, and emotional context.
            </p>
            
            <Textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="I need to finish that album artwork by Friday, it's stressing me out. Also should probably do some admin stuff like respond to emails when I'm feeling low energy. And I had this crazy idea for a new series..."
              className="flex-1 min-h-[200px] resize-none"
            />

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={handleClose}>
                Cancel
              </Button>
              <Button 
                onClick={handleParse} 
                disabled={!text.trim() || parsing}
                className="gap-2"
              >
                {parsing ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Analyzing...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    Parse with AI
                  </>
                )}
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex flex-col gap-4 overflow-hidden">
            {summary && (
              <div className="p-3 bg-primary/10 rounded-lg text-sm text-foreground-muted">
                <span className="font-medium text-foreground">Summary:</span> {summary}
              </div>
            )}

            <div className="flex-1 overflow-y-auto space-y-3 pr-2">
              {parsedItems.map((item, index) => (
                <ParsedItemCard
                  key={index}
                  item={item}
                  onEnergyChange={(energy) => handleEnergyChange(index, energy)}
                  onRemove={() => handleRemoveItem(index)}
                />
              ))}
            </div>

            <div className="flex justify-between items-center pt-2 border-t border-border">
              <Button variant="ghost" onClick={() => setStep('input')}>
                ← Back to edit
              </Button>
              <div className="flex gap-2">
                <Button variant="outline" onClick={handleClose}>
                  Cancel
                </Button>
                <Button onClick={handleAddToPlanner} className="gap-2">
                  <Check className="w-4 h-4" />
                  Add {parsedItems.length} items
                </Button>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default BrainDumpModal;
