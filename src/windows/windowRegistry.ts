export type WindowId = 'inbox' | 'calendar' | 'unfold';

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
  unfold: {
    id: 'unfold',
    title: 'Unfold',
    defaultVisible: false,
    description: 'Multi-time view (Offset Layer)',
  },
};

export function getWindowDefinition(id: WindowId): WindowDefinition {
  return WINDOW_REGISTRY[id];
}

export function getAllWindows(): WindowDefinition[] {
  return Object.values(WINDOW_REGISTRY);
}
