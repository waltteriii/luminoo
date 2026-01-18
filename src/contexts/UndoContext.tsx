import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { useToast } from '@/hooks/use-toast';

interface UndoAction {
  description: string;
  undoFn: () => Promise<void>;
  timestamp: number;
}

interface UndoContextValue {
  pushUndo: (description: string, undoFn: () => Promise<void>) => void;
  undo: () => Promise<void>;
  canUndo: boolean;
  lastActionDescription: string | null;
}

const UndoContext = createContext<UndoContextValue | null>(null);

export const useUndo = () => {
  const context = useContext(UndoContext);
  if (!context) {
    throw new Error('useUndo must be used within an UndoProvider');
  }
  return context;
};

// Optional hook that doesn't throw if context is missing
export const useUndoOptional = () => {
  return useContext(UndoContext);
};

interface UndoProviderProps {
  children: React.ReactNode;
}

const MAX_UNDO_STACK = 20;

export const UndoProvider: React.FC<UndoProviderProps> = ({ children }) => {
  const [undoStack, setUndoStack] = useState<UndoAction[]>([]);
  const { toast } = useToast();
  const isUndoingRef = useRef(false);

  const pushUndo = useCallback((description: string, undoFn: () => Promise<void>) => {
    setUndoStack(prev => {
      const newStack = [...prev, { description, undoFn, timestamp: Date.now() }];
      // Keep only last MAX_UNDO_STACK items
      return newStack.slice(-MAX_UNDO_STACK);
    });
  }, []);

  const undo = useCallback(async () => {
    if (isUndoingRef.current) return;
    
    const action = undoStack[undoStack.length - 1];
    if (!action) {
      toast({
        title: "Nothing to undo",
        description: "No recent actions to undo",
      });
      return;
    }

    isUndoingRef.current = true;
    
    try {
      // Remove from stack first
      setUndoStack(prev => prev.slice(0, -1));
      
      // Execute undo
      await action.undoFn();
      
      toast({
        title: "Undone",
        description: action.description,
      });
    } catch (error) {
      console.error('Undo failed:', error);
      toast({
        title: "Undo failed",
        description: "Could not undo the last action",
        variant: "destructive",
      });
    } finally {
      isUndoingRef.current = false;
    }
  }, [undoStack, toast]);

  // Global keyboard listener for Ctrl+Z / Cmd+Z
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Check for Ctrl+Z (Windows/Linux) or Cmd+Z (Mac)
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
        // Don't intercept if user is typing in an input/textarea
        const target = e.target as HTMLElement;
        if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
          return;
        }
        
        e.preventDefault();
        undo();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [undo]);

  const value: UndoContextValue = {
    pushUndo,
    undo,
    canUndo: undoStack.length > 0,
    lastActionDescription: undoStack.length > 0 ? undoStack[undoStack.length - 1].description : null,
  };

  return <UndoContext.Provider value={value}>{children}</UndoContext.Provider>;
};
