import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Brain, Loader2, Sparkles, Check, History, ArrowLeft, Trash2, Copy, Calendar } from 'lucide-react';
import { cn } from '@/lib/utils';
import { EnergyLevel, ParsedItem, BrainDump } from '@/types';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import ParsedItemCard from './ParsedItemCard';
import { format } from 'date-fns';
import { ScrollArea } from '@/components/ui/scroll-area';

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
  const [step, setStep] = useState<'input' | 'review' | 'history'>('input');
  const [history, setHistory] = useState<BrainDump[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (open && step === 'history') {
      loadHistory();
    }
  }, [open, step]);

  const loadHistory = async () => {
    setLoadingHistory(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('brain_dumps')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) throw error;
      
      // Transform the data to match our BrainDump type
      const transformedData = (data || []).map(item => ({
        ...item,
        ai_parsed_result: item.ai_parsed_result as unknown as BrainDump['ai_parsed_result'],
        user_highlights: (item.user_highlights as unknown as BrainDump['user_highlights']) || [],
        items_added_to_planner: item.items_added_to_planner || []
      }));
      
      setHistory(transformedData);
    } catch (err) {
      console.error('Load history error:', err);
    } finally {
      setLoadingHistory(false);
    }
  };

  const handleParse = async () => {
    if (!text.trim() || parsing) return;

    setParsing(true);

    const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

    const isRetryable = (err: unknown) => {
      const msg = err instanceof Error ? err.message : String(err);
      return msg.toLowerCase().includes('failed to fetch') || msg.toLowerCase().includes('network');
    };

    try {
      const { data: { user } } = await supabase.auth.getUser();

      let data: any = null;
      let invokeError: any = null;

      for (let attempt = 1; attempt <= 2; attempt++) {
        const res = await supabase.functions.invoke('parse-brain-dump', {
          body: { text },
        });

        data = res.data;
        invokeError = res.error;

        if (!invokeError) break;

        if (attempt < 2 && isRetryable(invokeError)) {
          await sleep(500 * attempt);
          continue;
        }
      }

      if (invokeError) {
        const msg = invokeError?.message || 'Could not analyze your brain dump.';
        toast({
          title: 'Failed to parse',
          description: msg,
          variant: 'destructive',
        });
        return;
      }

      if (data?.error) {
        toast({
          title: 'AI Error',
          description: data.error,
          variant: 'destructive',
        });
        return;
      }

      if (!data?.items || !Array.isArray(data.items)) {
        toast({
          title: 'AI Error',
          description: 'Invalid response from AI. Please try again.',
          variant: 'destructive',
        });
        return;
      }

      const items = data.items.map((item: ParsedItem) => ({
        ...item,
        user_override_energy: null,
        // Default to Inbox; user can schedule via the calendar chip
        due_date: null,
      }));

      setParsedItems(items);
      setSummary(data.summary);
      setStep('review');

      // Save brain dump to history (non-blocking)
      if (user) {
        supabase.from('brain_dumps').insert({
          user_id: user.id,
          raw_text: text,
          ai_parsed_result: data,
        });
      }
    } catch (err) {
      console.error('Parse error:', err);
      toast({
        title: 'Failed to parse',
        description: err instanceof Error ? err.message : 'Could not analyze your brain dump. Please try again.',
        variant: 'destructive',
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

  const handleDateChange = (index: number, date: string | null) => {
    setParsedItems(prev => prev.map((item, i) => 
      i === index ? { ...item, due_date: date } : item
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

  const handleCopyFromHistory = (dump: BrainDump) => {
    setText(dump.raw_text);
    setStep('input');
  };

  const handleDeleteFromHistory = async (dumpId: string) => {
    try {
      const { error } = await supabase
        .from('brain_dumps')
        .delete()
        .eq('id', dumpId);

      if (error) throw error;
      setHistory(prev => prev.filter(d => d.id !== dumpId));
      toast({ title: "Deleted", description: "Brain dump removed from history" });
    } catch (err) {
      console.error('Delete error:', err);
      toast({ title: "Error", description: "Could not delete", variant: "destructive" });
    }
  };

  const handleReparseFromHistory = (dump: BrainDump) => {
    setText(dump.raw_text);
    setStep('input');
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl h-[85vh] p-0 gap-0 overflow-hidden flex flex-col"> 
        <DialogHeader className="px-6 pt-6 pb-4 shrink-0">
          <DialogTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Brain className="w-5 h-5 text-primary" />
              Brain Dump
              {step !== 'input' && (
                <span className="text-sm font-normal text-foreground-muted">
                  {step === 'review' ? '• Review' : '• History'}
                </span>
              )}
            </div>
            {step === 'input' && (
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => { setStep('history'); loadHistory(); }}
                className="gap-1"
              >
                <History className="w-4 h-4" />
                History
              </Button>
            )}
          </DialogTitle>
        </DialogHeader>

        {step === 'input' ? (
          <div className="flex-1 flex flex-col gap-4 px-6 pb-6 min-h-0">
            <p className="text-sm text-foreground-muted shrink-0">
              Write everything on your mind. AI will detect tasks, energy levels, dates, and emotional context.
            </p>
            
            <Textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="I need to finish that album artwork by Friday, it's stressing me out. Also should probably do some admin stuff like respond to emails when I'm feeling low energy. And I had this crazy idea for a new series... next tuesday seeing friends for dinner"
              className="flex-1 min-h-[200px] resize-none"
            />

            <div className="flex justify-end gap-2 shrink-0">
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
        ) : step === 'review' ? (
          <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
            {summary && (
              <div className="mx-6 mb-4 p-3 bg-primary/10 rounded-lg text-sm text-foreground-muted shrink-0">
                <span className="font-medium text-foreground">Summary:</span> {summary}
              </div>
            )}

            <div className="flex-1 min-h-0 overflow-y-auto px-6">
              <div className="space-y-2 pb-4">
                {parsedItems.map((item, index) => (
                  <ParsedItemCard
                    key={index}
                    item={item}
                    onEnergyChange={(energy) => handleEnergyChange(index, energy)}
                    onRemove={() => handleRemoveItem(index)}
                    onDateChange={(date) => handleDateChange(index, date)}
                  />
                ))}
              </div>
            </div>

            <div className="flex justify-between items-center px-6 py-4 border-t border-border shrink-0 bg-background">
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
        ) : (
          <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
            <div className="flex items-center gap-2 px-6 pb-4 shrink-0">
              <Button variant="ghost" size="sm" onClick={() => setStep('input')} className="gap-1">
                <ArrowLeft className="w-4 h-4" />
                Back
              </Button>
              <span className="text-sm text-foreground-muted">
                {history.length} past dumps
              </span>
            </div>

            <div className="flex-1 min-h-0 overflow-y-auto px-6 pb-6">
              {loadingHistory ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-5 h-5 animate-spin text-foreground-muted" />
                </div>
              ) : history.length === 0 ? (
                <div className="text-center py-8 text-foreground-muted">
                  <Brain className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p>No brain dumps yet</p>
                  <p className="text-sm">Start dumping your thoughts!</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {history.map((dump) => (
                    <div
                      key={dump.id}
                      className="p-4 rounded-lg border border-border bg-card hover:bg-secondary/50 transition-colors"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 text-xs text-foreground-muted mb-2">
                            <Calendar className="w-3 h-3" />
                            {format(new Date(dump.created_at), 'MMM d, yyyy h:mm a')}
                            {dump.ai_parsed_result?.items && (
                              <span className="px-1.5 py-0.5 rounded bg-primary/20 text-primary">
                                {dump.ai_parsed_result.items.length} items
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-foreground line-clamp-3">
                            {dump.raw_text}
                          </p>
                          {dump.ai_parsed_result?.summary && (
                            <p className="text-xs text-foreground-muted mt-2 italic">
                              {dump.ai_parsed_result.summary}
                            </p>
                          )}
                        </div>
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => handleCopyFromHistory(dump)}
                            title="Copy to editor"
                          >
                            <Copy className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive hover:text-destructive"
                            onClick={() => handleDeleteFromHistory(dump.id)}
                            title="Delete"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default BrainDumpModal;
