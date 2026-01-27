export type WindowId = 'inbox' | 'calendar' | 'notes' | 'now';

export interface WindowDefinition {
  id: WindowId;
  title: string;
  defaultVisible: boolean;
  description?: string;
}

export const WINDOW_REGISTRY: Record<WindowId, WindowDefinition> = {
  inbox: {
    id: 'inbox',
    title: 'Inbox',
    defaultVisible: true,
    description: 'Unscheduled tasks',
  },
  calendar: {
    id: 'calendar',
    title: 'Calendar',
    defaultVisible: true,
    description: 'Schedule view',
  },
  notes: {
    id: 'notes',
    title: 'Notes',
    defaultVisible: true,
    description: 'Pinned task stash',
  },
  now: {
    id: 'now',
    title: 'Now',
    defaultVisible: true,
    description: 'Today’s focus',
  },
};

export function getWindowDefinition(id: WindowId): WindowDefinition {
  return WINDOW_REGISTRY[id];
}

export function getAllWindows(): WindowDefinition[] {
  return Object.values(WINDOW_REGISTRY);
}
