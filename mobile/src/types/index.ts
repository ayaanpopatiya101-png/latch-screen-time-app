export type Persona =
  | 'Scroll Drifter'
  | 'Doom Pinger'
  | 'Late Night Owl'
  | 'Productive Procrastinator'
  | 'Calm Operator';

export type RiskBand = 'low' | 'medium' | 'high';

export interface InterviewAnswer {
  questionId: string;
  value: number;
}

export interface PlanScore {
  power: number;
  persona: Persona;
  risk: RiskBand;
  brainEnergy: number;
  rationale: string[];
}

export interface UserAccount {
  id: string;
  email: string;
  displayName: string;
  createdAt: number;
}

export interface CreditEvent {
  id: string;
  delta: number;
  reason: string;
  at: number;
}

export interface FocusPlan {
  id: string;
  title: string;
  window: string;
  difficulty: 'gentle' | 'steady' | 'deep';
  apps: string[];
  reward: number;
  active: boolean;
}

export interface AppUsage {
  bundleId: string;
  displayName: string;
  minutesToday: number;
  category: 'social' | 'video' | 'games' | 'productivity' | 'other';
}
