import { CreditEvent } from '@/types';

export interface CreditsLedger {
  events: CreditEvent[];
}

export function balance(ledger: CreditsLedger): number {
  return ledger.events.reduce((s, e) => s + e.delta, 0);
}

export function earnedToday(ledger: CreditsLedger, now = Date.now()): number {
  const startOfDay = new Date(now);
  startOfDay.setHours(0, 0, 0, 0);
  return ledger.events
    .filter((e) => e.delta > 0 && e.at >= startOfDay.getTime())
    .reduce((s, e) => s + e.delta, 0);
}

export function spentToday(ledger: CreditsLedger, now = Date.now()): number {
  const startOfDay = new Date(now);
  startOfDay.setHours(0, 0, 0, 0);
  return ledger.events
    .filter((e) => e.delta < 0 && e.at >= startOfDay.getTime())
    .reduce((s, e) => s + Math.abs(e.delta), 0);
}

export function makeEvent(delta: number, reason: string): CreditEvent {
  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    delta,
    reason,
    at: Date.now(),
  };
}

export const EARN_RULES = {
  completedFocus: { delta: 30, reason: 'Completed a Focus window' },
  dailyCheckin: { delta: 5, reason: 'Daily Lumi check-in' },
  underLimit: { delta: 20, reason: 'Stayed under daily limit' },
  interviewComplete: { delta: 50, reason: 'Completed your Lumi interview' },
  permissionGranted: { delta: 15, reason: 'Granted a Latch permission' },
} as const;

export const SPEND_RULES = {
  unlockApp15: { delta: -25, reason: 'Unlocked a blocked app for 15 min' },
  skipFriction: { delta: -10, reason: 'Skipped Friction prompt' },
  pauseShield10: { delta: -50, reason: 'Paused Shield for 10 minutes' },
} as const;
