# DEV_NOTE — Luminoo Window Manager + DnD + Workspaces

## Window drag handle rule (critical)
- **Windows can only be moved by dragging the explicit handle** in the window titlebar: the element marked with `data-window-drag-handle`.
- Window content **never** starts a window move.
- Any pointerdown that starts on interactive/task elements is blocked from initiating window drag:
  - `button, a, input, textarea, select, [role="button"], [contenteditable="true"], [data-task-draggable], [data-dnd-item], [data-window-no-drag]`

Implementation:
- `src/windows/WindowFrame.tsx`: marks the handle and gates propagation.
- `src/windows/WindowLayout.tsx`: `draggableHandle="[data-window-drag-handle]"` + `draggableCancel="... [data-task-draggable], [data-dnd-item] ..."`

## Task DnD routes between windows
All task drag/drop is handled by a single root `@dnd-kit` context (`src/components/dnd/DndProvider.tsx`).

### Window-level droppable zones
- Inbox: `zone:inbox`
- Notes: `zone:notes`
- Calendar surface (fallback for “untimed” drops): `zone:calendar`
- NOW is **view-only** (no droppable zone, no drag start)

### Outcomes
- **Inbox → Notes**: `location = "notes"`, clear schedule fields
- **Calendar → Notes**: `location = "notes"`, clear schedule fields
- **Notes → Inbox**: `location = null`, clear schedule fields
- **Notes/Inbox → Calendar slot/day**: schedule via existing calendar drop logic
- **Any → Calendar surface** (`zone:calendar`): set `due_date` to the provided date, clear times (untimed)

## Workspace persistence locations
### LocalStorage (always available)
- Current layout: `ui.workspace.layout.v1.<userId|anonymous>`
- Saved workspaces: `ui.workspaces.v1.<userId|anonymous>`
- Last-good snapshot: `ui.workspaces.lastGood.v1.<userId|anonymous>`
- Lock state: `ui.workspace.lock.v1.<userId|anonymous>`
- Mobile active tab: `ui.workspace.mobile.activeTab.v1.<userId|anonymous>`

### Supabase (preferred when authenticated; best-effort)
- `profiles.workspace_state` (JSON) is used if available.
  - The code attempts to `select('workspace_state')` and `upsert({ id, workspace_state })`.
  - If the column is missing or blocked by RLS, it silently falls back to localStorage.

