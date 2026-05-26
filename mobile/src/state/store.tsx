import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { UserAccount, CreditEvent, PlanScore, FocusPlan } from '@/types';
import { authService } from '@/services/authService';
import { balance, earnedToday, spentToday, makeEvent, EARN_RULES } from '@/engines/credits';

interface AppState {
  hydrated: boolean;
  user: UserAccount | null;
  interviewAnswers: { questionId: string; value: number }[];
  planScore: PlanScore | null;
  credits: CreditEvent[];
  focusPlans: FocusPlan[];
  shieldMode: 'gentle' | 'friction' | 'deep-lock';
  shieldActive: boolean;
}

interface AppActions {
  signUp: (email: string, displayName: string) => Promise<void>;
  signOut: () => Promise<void>;
  recordAnswer: (questionId: string, value: number) => void;
  finalizeInterview: (score: PlanScore) => void;
  earn: (delta: number, reason: string) => void;
  spend: (delta: number, reason: string) => boolean;
  toggleFocus: (id: string) => void;
  setShieldMode: (m: AppState['shieldMode']) => void;
  setShieldActive: (b: boolean) => void;
}

const Ctx = createContext<(AppState & AppActions & {
  derived: { balance: number; earnedToday: number; spentToday: number };
}) | null>(null);

const STORAGE_KEY = 'latch:state:v1';

const defaultPlans: FocusPlan[] = [
  { id: 'morning', title: 'Morning Calm', window: '7:00 – 9:00 AM', difficulty: 'gentle', apps: ['TikTok', 'Instagram', 'X'], reward: 20, active: false },
  { id: 'deep-work', title: 'Deep Work Block', window: '10:00 AM – 12:30 PM', difficulty: 'deep', apps: ['Instagram', 'YouTube', 'Reddit', 'X', 'TikTok'], reward: 40, active: false },
  { id: 'wind-down', title: 'Wind Down', window: '9:30 – 11:00 PM', difficulty: 'steady', apps: ['TikTok', 'YouTube', 'Instagram'], reward: 25, active: false },
];

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AppState>({
    hydrated: false,
    user: null,
    interviewAnswers: [],
    planScore: null,
    credits: [],
    focusPlans: defaultPlans,
    shieldMode: 'friction',
    shieldActive: false,
  });

  useEffect(() => {
    (async () => {
      const [raw, user] = await Promise.all([AsyncStorage.getItem(STORAGE_KEY), authService.load()]);
      let restored: Partial<AppState> = {};
      if (raw) {
        try { restored = JSON.parse(raw); } catch {}
      }
      setState((s) => ({
        ...s,
        ...restored,
        user,
        focusPlans: restored.focusPlans ?? s.focusPlans,
        hydrated: true,
      }));
    })();
  }, []);

  useEffect(() => {
    if (!state.hydrated) return;
    const { hydrated: _h, user: _u, ...persistable } = state;
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(persistable)).catch(() => {});
  }, [state]);

  const signUp = useCallback(async (email: string, displayName: string) => {
    const user = await authService.signUp(email, displayName);
    setState((s) => ({ ...s, user }));
  }, []);

  const signOut = useCallback(async () => {
    await authService.signOut();
    setState((s) => ({ ...s, user: null }));
  }, []);

  const recordAnswer = useCallback((questionId: string, value: number) => {
    setState((s) => ({
      ...s,
      interviewAnswers: [...s.interviewAnswers.filter((a) => a.questionId !== questionId), { questionId, value }],
    }));
  }, []);

  const finalizeInterview = useCallback((score: PlanScore) => {
    setState((s) => ({
      ...s,
      planScore: score,
      credits: [...s.credits, makeEvent(EARN_RULES.interviewComplete.delta, EARN_RULES.interviewComplete.reason)],
    }));
  }, []);

  const earn = useCallback((delta: number, reason: string) => {
    setState((s) => ({ ...s, credits: [...s.credits, makeEvent(Math.abs(delta), reason)] }));
  }, []);

  const spend = useCallback((delta: number, reason: string) => {
    let success = false;
    setState((s) => {
      const cost = Math.abs(delta);
      const current = balance({ events: s.credits });
      if (current < cost) return s;
      success = true;
      return { ...s, credits: [...s.credits, makeEvent(-cost, reason)] };
    });
    return success;
  }, []);

  const toggleFocus = useCallback((id: string) => {
    setState((s) => ({
      ...s,
      focusPlans: s.focusPlans.map((p) => (p.id === id ? { ...p, active: !p.active } : p)),
    }));
  }, []);

  const setShieldMode = useCallback((m: AppState['shieldMode']) => setState((s) => ({ ...s, shieldMode: m })), []);
  const setShieldActive = useCallback((b: boolean) => setState((s) => ({ ...s, shieldActive: b })), []);

  const derived = useMemo(() => {
    const ledger = { events: state.credits };
    return {
      balance: balance(ledger),
      earnedToday: earnedToday(ledger),
      spentToday: spentToday(ledger),
    };
  }, [state.credits]);

  const value = useMemo(
    () => ({ ...state, derived, signUp, signOut, recordAnswer, finalizeInterview, earn, spend, toggleFocus, setShieldMode, setShieldActive }),
    [state, derived, signUp, signOut, recordAnswer, finalizeInterview, earn, spend, toggleFocus, setShieldMode, setShieldActive],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useStore() {
  const v = useContext(Ctx);
  if (!v) throw new Error('useStore outside provider');
  return v;
}
