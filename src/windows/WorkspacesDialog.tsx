import { useMemo, useState } from 'react';
import { Pencil, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { cn } from '@/lib/utils';
import { useWorkspace } from './WorkspaceContext';

export default function WorkspacesDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const {
    templates,
    applyTemplate,
    saved,
    applySaved,
    saveCurrent,
    renameSaved,
    deleteSaved,
    restoreLastGood,
    hasLastGood,
    locked,
    setLocked,
  } = useWorkspace();

  const [name, setName] = useState('');
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');

  const sortedSaved = useMemo(() => saved.slice().sort((a, b) => b.updatedAt - a.updatedAt), [saved]);

  const startRename = (id: string, currentName: string) => {
    setRenamingId(id);
    setRenameValue(currentName);
  };

  const commitRename = () => {
    if (!renamingId) return;
    renameSaved(renamingId, renameValue);
    setRenamingId(null);
    setRenameValue('');
  };

  const commitSave = () => {
    saveCurrent(name);
    setName('');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Workspaces</DialogTitle>
          <DialogDescription>Apply a template, or save your current layout as a named workspace.</DialogDescription>
        </DialogHeader>

        <div className="flex items-center justify-between gap-3 rounded-lg border border-border p-3">
          <div className="min-w-0">
            <div className="text-sm font-medium">Lock layout</div>
            <div className="text-xs text-muted-foreground">
              When locked, windows can’t be moved or resized (task drag-and-drop still works).
            </div>
          </div>
          <Switch checked={locked} onCheckedChange={(v) => setLocked(v)} />
        </div>

        <div className="grid gap-4">
          <div>
            <div className="text-sm font-semibold mb-2">Built-in templates</div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {templates.map((t) => (
                <Button
                  key={t.id}
                  variant="outline"
                  className="justify-start"
                  onClick={() => {
                    applyTemplate(t.id);
                    onOpenChange(false);
                  }}
                >
                  {t.name}
                </Button>
              ))}
            </div>
          </div>

          <div>
            <div className="text-sm font-semibold mb-2">Saved workspaces</div>

            <div className="flex gap-2 mb-3">
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Workspace name…"
                className="h-10"
              />
              <Button className="h-10" onClick={commitSave} disabled={!name.trim()}>
                Save
              </Button>
            </div>

            <div className="space-y-2">
              {sortedSaved.length === 0 ? (
                <div className="text-sm text-muted-foreground">No saved workspaces yet.</div>
              ) : (
                sortedSaved.map((w) => (
                  <div
                    key={w.id}
                    className={cn('flex items-center gap-2 rounded-lg border border-border p-2')}
                  >
                    <div className="min-w-0 flex-1">
                      {renamingId === w.id ? (
                        <div className="flex gap-2">
                          <Input
                            value={renameValue}
                            onChange={(e) => setRenameValue(e.target.value)}
                            className="h-9"
                          />
                          <Button className="h-9" onClick={commitRename} disabled={!renameValue.trim()}>
                            Save
                          </Button>
                          <Button
                            className="h-9"
                            variant="ghost"
                            onClick={() => {
                              setRenamingId(null);
                              setRenameValue('');
                            }}
                          >
                            Cancel
                          </Button>
                        </div>
                      ) : (
                        <div className="text-sm font-medium truncate">{w.name}</div>
                      )}
                    </div>

                    {renamingId !== w.id && (
                      <>
                        <Button
                          variant="secondary"
                          className="h-9"
                          onClick={() => {
                            applySaved(w.id);
                            onOpenChange(false);
                          }}
                        >
                          Apply
                        </Button>
                        <Button variant="ghost" size="icon" className="h-9 w-9" onClick={() => startRename(w.id, w.name)}>
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-9 w-9 text-destructive">
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete workspace?</AlertDialogTitle>
                              <AlertDialogDescription>
                                This will permanently remove “{w.name}”.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                onClick={() => deleteSaved(w.id)}
                              >
                                Delete
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-2">
          <Button
            variant="outline"
            onClick={() => {
              restoreLastGood();
              onOpenChange(false);
            }}
            disabled={!hasLastGood}
          >
            Restore last good
          </Button>
          <Button variant="secondary" onClick={() => onOpenChange(false)}>
            Done
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

