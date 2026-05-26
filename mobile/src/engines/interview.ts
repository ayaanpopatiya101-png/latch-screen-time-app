import { InterviewAnswer, PlanScore, Persona, RiskBand } from '@/types';

export interface InterviewQuestion {
  id: string;
  prompt: string;
  hint?: string;
  axis: 'scroll' | 'sleep' | 'work' | 'social' | 'mood' | 'control';
  options: { label: string; value: number }[];
}

export const INTERVIEW_QUESTIONS: InterviewQuestion[] = [
  {
    id: 'morning',
    prompt: 'How does your morning usually start with your phone?',
    axis: 'scroll',
    options: [
      { label: 'I unlock and scroll for 30+ minutes before getting up', value: 4 },
      { label: 'A quick check, then I put it down', value: 1 },
      { label: 'I open one app and lose 10–15 minutes', value: 3 },
      { label: 'I leave it on the side and start my day', value: 0 },
    ],
  },
  {
    id: 'most-used',
    prompt: 'Which kind of app pulls the most time from you?',
    axis: 'social',
    options: [
      { label: 'Short-form video (TikTok, Reels, Shorts)', value: 4 },
      { label: 'Social feeds (Instagram, X, Facebook)', value: 3 },
      { label: 'Messaging or group chats', value: 2 },
      { label: 'Games', value: 3 },
      { label: 'Nothing in particular', value: 1 },
    ],
  },
  {
    id: 'sleep',
    prompt: 'How does your phone affect your sleep?',
    axis: 'sleep',
    options: [
      { label: 'I stay up later than I want because of it most nights', value: 4 },
      { label: 'A few times a week I lose track of time', value: 3 },
      { label: 'Rarely — I usually stop on time', value: 1 },
      { label: 'Never — I put it away at a set time', value: 0 },
    ],
  },
  {
    id: 'work-deep',
    prompt: 'During work or study, how often do you reach for your phone?',
    axis: 'work',
    options: [
      { label: 'Every few minutes', value: 4 },
      { label: 'A few times an hour', value: 3 },
      { label: 'Only on breaks', value: 1 },
      { label: 'I can focus for an hour without checking', value: 0 },
    ],
  },
  {
    id: 'mood-after',
    prompt: 'How do you usually feel after a long scrolling session?',
    axis: 'mood',
    options: [
      { label: 'Drained or low', value: 4 },
      { label: 'Numb or zoned out', value: 3 },
      { label: 'Fine — I enjoyed it', value: 1 },
      { label: 'Energised — I learned something', value: 0 },
    ],
  },
  {
    id: 'attempts',
    prompt: 'Have you tried to cut back before?',
    axis: 'control',
    options: [
      { label: 'Many times. Nothing has stuck.', value: 4 },
      { label: 'A few times — short bursts of success.', value: 3 },
      { label: 'Once or twice. Mixed results.', value: 2 },
      { label: 'No, this is my first try.', value: 1 },
    ],
  },
  {
    id: 'trigger',
    prompt: 'What pulls you back the most?',
    axis: 'mood',
    options: [
      { label: 'Boredom', value: 3 },
      { label: 'Stress or avoidance', value: 4 },
      { label: 'Habit / muscle memory', value: 3 },
      { label: 'Fear of missing out', value: 3 },
      { label: 'I genuinely enjoy it', value: 1 },
    ],
  },
  {
    id: 'goal',
    prompt: 'What would a great month with Latch look like?',
    axis: 'control',
    options: [
      { label: 'Cut my screen time in half', value: 4 },
      { label: 'Stop late-night doomscrolling', value: 3 },
      { label: 'Be present with people I love', value: 3 },
      { label: 'Just understand my patterns', value: 2 },
    ],
  },
];

function pickPersona(axisScores: Record<string, number>): Persona {
  const { scroll = 0, sleep = 0, work = 0, social = 0, mood = 0, control = 0 } = axisScores;
  if (sleep >= 3 && scroll >= 2) return 'Late Night Owl';
  if (social >= 3 && mood >= 3) return 'Doom Pinger';
  if (work >= 3) return 'Productive Procrastinator';
  if (scroll >= 3) return 'Scroll Drifter';
  if (control <= 2 && scroll <= 2) return 'Calm Operator';
  return 'Scroll Drifter';
}

export function scoreInterview(answers: InterviewAnswer[]): PlanScore {
  const byAxis: Record<string, number[]> = {};
  for (const a of answers) {
    const q = INTERVIEW_QUESTIONS.find((q) => q.id === a.questionId);
    if (!q) continue;
    (byAxis[q.axis] ||= []).push(a.value);
  }
  const axisAverages: Record<string, number> = {};
  for (const [k, vs] of Object.entries(byAxis)) {
    axisAverages[k] = vs.reduce((s, v) => s + v, 0) / vs.length;
  }

  const totalAnswered = answers.length || 1;
  const sumAll = answers.reduce((s, a) => s + a.value, 0);
  const avg = sumAll / totalAnswered;

  // Lower raw answers (less impulsive behavior) -> higher plan power
  // Each question maxes around 4. Normalize to 0..100 where 0=very impacted, 100=already calm
  const baselinePower = Math.round(100 - (avg / 4) * 100);
  // Boost a little for completeness (8 questions answered = +8)
  const completenessBoost = Math.min(8, answers.length);
  const power = Math.max(5, Math.min(100, baselinePower + completenessBoost));

  const risk: RiskBand = avg >= 2.8 ? 'high' : avg >= 1.8 ? 'medium' : 'low';
  const persona = pickPersona(axisAverages);
  const brainEnergy = Math.max(15, Math.min(95, 100 - Math.round(avg * 18)));

  const rationale: string[] = [];
  if ((axisAverages.sleep ?? 0) >= 3) rationale.push('Late-night phone use is shortening your sleep — first guardrail will be a night wind-down window.');
  if ((axisAverages.social ?? 0) >= 3) rationale.push('Social and short-form apps are your strongest pull — Friction shield will help slow the open.');
  if ((axisAverages.work ?? 0) >= 3) rationale.push('Focus windows during work hours will protect your deep work.');
  if ((axisAverages.mood ?? 0) >= 3) rationale.push('Mood-aware nudges from Lumi will catch stress-driven opens.');
  if (rationale.length === 0) rationale.push('You already have decent control — Latch will fine-tune the edges.');

  return { power, persona, risk, brainEnergy, rationale };
}

export function suggestNextQuestion(asked: string[]): InterviewQuestion | null {
  const remaining = INTERVIEW_QUESTIONS.filter((q) => !asked.includes(q.id));
  if (remaining.length === 0) return null;
  // Prioritise variety of axes: pick the axis least-covered so far.
  const axisCounts: Record<string, number> = {};
  for (const id of asked) {
    const q = INTERVIEW_QUESTIONS.find((q) => q.id === id);
    if (q) axisCounts[q.axis] = (axisCounts[q.axis] ?? 0) + 1;
  }
  remaining.sort((a, b) => (axisCounts[a.axis] ?? 0) - (axisCounts[b.axis] ?? 0));
  return remaining[0];
}
