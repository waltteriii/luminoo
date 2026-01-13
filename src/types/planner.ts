export type ZoomLevel = 'year' | 'quarter' | 'month';

export type EnergyState = 'high' | 'medium' | 'low' | 'recovery';

export type PhaseType = 'planning' | 'creation' | 'launch' | 'reflection';

export type TimeModel = 'event-based' | 'state-based';

export interface Phase {
  id: string;
  name: string;
  type: PhaseType;
  startMonth: number; // 0-11
  endMonth: number; // 0-11
  description?: string;
}

export interface Campaign {
  id: string;
  name: string;
  phaseId: string;
  month: number;
  week?: number;
  energyRequired?: EnergyState;
}

export interface Task {
  id: string;
  title: string;
  campaignId?: string;
  energyLevel: EnergyState;
  timeModel: TimeModel;
  // Event-based properties
  dependsOn?: string[];
  duration?: string;
  // State-based properties
  suitableStates?: EnergyState[];
  completed?: boolean;
}

export interface UserState {
  currentEnergy: EnergyState;
  zoomLevel: ZoomLevel;
  focusedQuarter?: number; // 1-4
  focusedMonth?: number; // 0-11
  timeModel: TimeModel;
  showCompleted: boolean;
  informationDensity: 'minimal' | 'balanced' | 'detailed';
}

export const MONTHS = [
  'January', 'February', 'March', 'April',
  'May', 'June', 'July', 'August',
  'September', 'October', 'November', 'December'
] as const;

export const QUARTERS = [
  { label: 'Q1', months: [0, 1, 2] },
  { label: 'Q2', months: [3, 4, 5] },
  { label: 'Q3', months: [6, 7, 8] },
  { label: 'Q4', months: [9, 10, 11] },
] as const;

export const ENERGY_LABELS: Record<EnergyState, string> = {
  high: 'High Focus',
  medium: 'Steady',
  low: 'Low Energy',
  recovery: 'Recovery',
};

export const PHASE_LABELS: Record<PhaseType, string> = {
  planning: 'Planning',
  creation: 'Creation',
  launch: 'Launch',
  reflection: 'Reflection',
};
