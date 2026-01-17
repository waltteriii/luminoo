import { useState, useRef, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { EnergyLevel } from '@/types';

interface AddTaskButtonProps {
  onAdd: (title: string, energy: EnergyLevel) => void;
  defaultEnergy?: EnergyLevel;
}

const AddTaskButton = ({ onAdd, defaultEnergy = 'medium' }: AddTaskButtonProps) => {
  const [isAdding, setIsAdding] = useState(false);
  const [text, setText] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isAdding && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isAdding]);

  const handleSubmit = () => {
    if (text.trim()) {
      onAdd(text.trim(), defaultEnergy);
      setText('');
    }
    setIsAdding(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSubmit();
    } else if (e.key === 'Escape') {
      setText('');
      setIsAdding(false);
    }
  };

  if (isAdding) {
    return (
      <div className="flex items-center gap-2 p-2 rounded-lg border border-primary bg-card">
        <input
          ref={inputRef}
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onBlur={handleSubmit}
          onKeyDown={handleKeyDown}
          placeholder="Enter task..."
          className="flex-1 bg-transparent border-none outline-none text-sm text-foreground placeholder:text-foreground-muted"
        />
      </div>
    );
  }

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={() => setIsAdding(true)}
      className="w-full justify-start gap-2 text-foreground-muted hover:text-foreground border border-dashed border-border hover:border-primary/50"
    >
      <Plus className="w-4 h-4" />
      Add task
    </Button>
  );
};

export default AddTaskButton;
