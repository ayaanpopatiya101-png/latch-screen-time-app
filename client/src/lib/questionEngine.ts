// Lumi question engine.
//
// Picks the next-best question to ask during conversational onboarding.
// Uses a rule/scoring system (no ML) that combines:
//   * base information gain for each question
//   * boosts when the answer is likely high-signal given current risk markers
//   * decay once a related field is already answered
//   * required-question pinning (e.g. screen-time hours)
//   * a stopping rule based on cumulative "plan power" (confidence)
//
// The engine outputs an evolving InterviewProfile that the rest of the app
// can read to make the plan smarter.

export type QuestionType =
  | "single_choice"
  | "multi_choice"
  | "scale"
  | "short_text"
  | "hours_slider"
  | "time_picker";

export type QuestionOption = {
  value: string;
  label: string;
  emoji?: string;
  // Lumi reaction shown immediately after this option is picked.
  reaction?: string;
};

export type Question = {
  id: string;
  type: QuestionType;
  prompt: string;
  // One-line context shown above the prompt.
  topic: string;
  // Information-gain weight. Higher = more impact on the personalized plan.
  weight: number;
  // Optional bounds for sliders.
  min?: number;
  max?: number;
  step?: number;
  unit?: string;
  // Options for choice questions.
  options?: QuestionOption[];
  // Lumi's coaching line after any answer (fallback if no per-option reaction).
  reaction?: string;
  // Field on the InterviewProfile this answer writes into.
  writesTo: keyof InterviewProfile;
  // Optional max number of selections for multi_choice.
  maxSelect?: number;
  // Mark a question as required: cannot be skipped by stop rule.
  required?: boolean;
  // A short why-this-question-matters explanation.
  why: string;
};

export type InterviewProfile = {
  // Required identity (mirrors legacy onboarding).
  name?: string;
  age?: string;
  currentHours?: number;
  goalHours?: number;
  feelings?: string[];
  hardestTime?: string;
  topApps?: string[];
  // Richer signals collected by the interview.
  whyScroll?: string[];
  appCategoryTraps?: string[];
  hardestTimeWindows?: string[];
  notificationTriggers?: string[];
  motivationStyle?: string;
  replacementHabits?: string[];
  accountabilityPref?: string;
  difficultyTolerance?: string;
  emergencyPassPref?: string;
  bedtimeScroll?: string;
  schoolFocus?: string;
  socialPressure?: string;
  videoAppDepth?: string;
  gamingDepth?: string;
  stressLevel?: number;
  // What user wants to improve, free text.
  improvementGoal?: string;
};

export type AnswerMap = Record<string, unknown>;

export type EngineState = {
  profile: InterviewProfile;
  answers: AnswerMap;
  askedIds: string[];
};

export const STOP_THRESHOLD = 78; // plan power % that triggers "ready to launch"
export const MIN_QUESTIONS = 6;
export const MAX_QUESTIONS = 14;

// ---- Question bank ----

export const QUESTION_BANK: Question[] = [
  {
    id: "name",
    type: "short_text",
    topic: "intro",
    prompt: "What should I call you?",
    weight: 6,
    writesTo: "name",
    required: true,
    reaction: "Awesome, nice to meet you.",
    why: "So I can cheer you on by name and tune the voice for your age.",
  },
  {
    id: "age",
    type: "short_text",
    topic: "intro",
    prompt: "How old are you?",
    weight: 5,
    writesTo: "age",
    required: true,
    reaction: "Got it. I'll keep my tone friendly and fair for your age.",
    why: "Helps me pick the right wording and reward style.",
  },
  {
    id: "currentHours",
    type: "hours_slider",
    topic: "screen time",
    prompt: "About how many hours a day do you spend on your phone?",
    weight: 14,
    min: 0.5,
    max: 12,
    step: 0.5,
    unit: "h/day",
    writesTo: "currentHours",
    required: true,
    reaction: "Thanks for being honest. The first real number is the hardest one.",
    why: "Your baseline drives how much friction I add and how big rewards feel.",
  },
  {
    id: "goalHours",
    type: "hours_slider",
    topic: "your goal",
    prompt: "What would feel like a healthy daily total?",
    weight: 12,
    min: 0.5,
    max: 8,
    step: 0.5,
    unit: "h/day",
    writesTo: "goalHours",
    required: true,
    reaction: "Nice goal. I'll plan rewards around the time you save.",
    why: "Sets the win line so I know when to celebrate.",
  },
  {
    id: "hardestTime",
    type: "single_choice",
    topic: "danger zones",
    prompt: "When is scrolling hardest to stop?",
    weight: 11,
    writesTo: "hardestTime",
    options: [
      { value: "Morning", label: "Morning", emoji: "☀️", reaction: "Mornings are sneaky — I'll add a soft delay before your first feed." },
      { value: "School break", label: "School break", emoji: "🎒", reaction: "Got it. I'll guard your break time with a quick swap." },
      { value: "After homework", label: "After homework", emoji: "📚", reaction: "Smart catch. I'll reward focus before the unwind." },
      { value: "Night", label: "Night", emoji: "🌙", reaction: "Night is the big one. I'll make bedtime rewards bigger." },
      { value: "When bored", label: "When bored", emoji: "😴", reaction: "Boredom is the secret trigger. I'll have a swap ready." },
    ],
    reaction: "I'll add extra nudges around that window.",
    why: "Knowing the hard window lets me nudge before the scroll, not after.",
  },
  {
    id: "topApps",
    type: "multi_choice",
    topic: "app traps",
    prompt: "Which apps pull you in the most?",
    weight: 12,
    writesTo: "topApps",
    maxSelect: 4,
    options: [
      { value: "Instagram", label: "Instagram", emoji: "📸" },
      { value: "TikTok", label: "TikTok", emoji: "🎵" },
      { value: "YouTube", label: "YouTube", emoji: "▶️" },
      { value: "Snapchat", label: "Snapchat", emoji: "👻" },
      { value: "Games", label: "Games", emoji: "🎮" },
      { value: "Messages", label: "Messages", emoji: "💬" },
      { value: "Reddit", label: "Reddit", emoji: "🟧" },
      { value: "X", label: "X / Twitter", emoji: "✖️" },
    ],
    reaction: "Great — these get the strongest shields first.",
    why: "Your top apps set where the shields go first.",
  },
  {
    id: "feelings",
    type: "multi_choice",
    topic: "after-scroll feel",
    prompt: "How do you usually feel right after scrolling?",
    weight: 10,
    writesTo: "feelings",
    maxSelect: 4,
    options: [
      { value: "Tired", label: "Tired", emoji: "😪" },
      { value: "Happy", label: "Happy", emoji: "😊" },
      { value: "Stressed", label: "Stressed", emoji: "😰" },
      { value: "Bored", label: "Bored", emoji: "🥱" },
      { value: "Focused", label: "Focused", emoji: "🎯" },
      { value: "Regretful", label: "Regretful", emoji: "😔" },
      { value: "Lonely", label: "Lonely", emoji: "🥺" },
      { value: "Hyped", label: "Hyped", emoji: "🔥" },
    ],
    reaction: "Your feelings tell me what to reward, not just what to block.",
    why: "Feelings predict scrolling more than apps do.",
  },
  {
    id: "whyScroll",
    type: "multi_choice",
    topic: "the why",
    prompt: "Why do you usually pick up the phone?",
    weight: 9,
    writesTo: "whyScroll",
    maxSelect: 3,
    options: [
      { value: "boredom", label: "I'm bored", emoji: "🥱" },
      { value: "stress", label: "To stop stress", emoji: "😮‍💨" },
      { value: "habit", label: "Pure habit", emoji: "🔁" },
      { value: "fomo", label: "Don't want to miss out", emoji: "📡" },
      { value: "social", label: "Talk to friends", emoji: "💬" },
      { value: "delay", label: "Avoid something hard", emoji: "🙈" },
      { value: "fun", label: "Just for fun", emoji: "🎉" },
    ],
    reaction: "Now I know what to swap in. The why beats the what.",
    why: "Same scroll, different reasons. Lumi swaps in matching real-life moves.",
  },
  {
    id: "bedtimeScroll",
    type: "single_choice",
    topic: "bedtime",
    prompt: "Do you scroll in bed before sleep?",
    weight: 9,
    writesTo: "bedtimeScroll",
    options: [
      { value: "never", label: "Never", emoji: "🛌" },
      { value: "sometimes", label: "Sometimes", emoji: "🌙" },
      { value: "every_night", label: "Every night", emoji: "🌌", reaction: "That's the biggest single fix. I'll guard bedtime hard." },
    ],
    reaction: "I'll line up a bedtime shield + bonus.",
    why: "Bedtime scrolling steals sleep and grows the next day's urges.",
  },
  {
    id: "schoolFocus",
    type: "single_choice",
    topic: "school focus",
    prompt: "How often does your phone break school focus?",
    weight: 8,
    writesTo: "schoolFocus",
    options: [
      { value: "rarely", label: "Rarely", emoji: "💪" },
      { value: "weekly", label: "A few times a week", emoji: "📚" },
      { value: "daily", label: "Almost every day", emoji: "⏰", reaction: "Daily — I'll build a study focus plan as your first quest." },
    ],
    reaction: "Focus protection is a top priority for your plan.",
    why: "School focus loss compounds fast. Worth a real shield.",
  },
  {
    id: "notificationTriggers",
    type: "multi_choice",
    topic: "notifications",
    prompt: "Which notifications make you grab your phone the most?",
    weight: 7,
    writesTo: "notificationTriggers",
    maxSelect: 4,
    options: [
      { value: "likes", label: "Likes / hearts", emoji: "❤️" },
      { value: "dm", label: "DMs", emoji: "💌" },
      { value: "group", label: "Group chats", emoji: "👥" },
      { value: "news", label: "News / updates", emoji: "📰" },
      { value: "games", label: "Game alerts", emoji: "🎮" },
      { value: "stories", label: "Stories / lives", emoji: "🎥" },
    ],
    reaction: "I'll suggest muting these inside Latch when the time fits.",
    why: "Knowing the loudest dot tells Lumi exactly which to dim.",
  },
  {
    id: "videoAppDepth",
    type: "scale",
    topic: "video apps",
    prompt: "How deep do you get into TikTok / Reels / Shorts?",
    weight: 9,
    writesTo: "videoAppDepth",
    min: 1,
    max: 5,
    unit: "deep",
    reaction: "I'll calibrate friction for short-video traps.",
    why: "Short video is the deepest rabbit hole. Lumi adds extra delay if it's a 4 or 5.",
  },
  {
    id: "socialPressure",
    type: "scale",
    topic: "social pressure",
    prompt: "How much do likes or comments shape your mood?",
    weight: 7,
    writesTo: "socialPressure",
    min: 1,
    max: 5,
    unit: "pressure",
    reaction: "I'll show less of the count and more of the gain.",
    why: "If social validation is high, Latch hides counters in the dashboard.",
  },
  {
    id: "stressLevel",
    type: "scale",
    topic: "stress",
    prompt: "How stressed have you been this week, 1 to 5?",
    weight: 6,
    writesTo: "stressLevel",
    min: 1,
    max: 5,
    unit: "stress",
    reaction: "Stress and scroll feed each other. I've got a breath swap ready.",
    why: "When stress is high, breath/walk swaps work better than focus sprints.",
  },
  {
    id: "gamingDepth",
    type: "single_choice",
    topic: "games",
    prompt: "Mobile games — quick play or all-night runs?",
    weight: 5,
    writesTo: "gamingDepth",
    options: [
      { value: "none", label: "I don't play", emoji: "🚫" },
      { value: "quick", label: "Quick sessions", emoji: "⚡" },
      { value: "long", label: "Long sessions", emoji: "🌀", reaction: "I'll add a session limit to games specifically." },
    ],
    reaction: "Got it.",
    why: "Long game sessions need a session cap, not a delay.",
  },
  {
    id: "replacementHabits",
    type: "multi_choice",
    topic: "swaps you'd try",
    prompt: "If you had 10 free minutes, what real-life thing sounds good?",
    weight: 9,
    writesTo: "replacementHabits",
    maxSelect: 4,
    options: [
      { value: "walk", label: "Walk outside", emoji: "🚶" },
      { value: "read", label: "Read a few pages", emoji: "📖" },
      { value: "workout", label: "Quick workout", emoji: "💪" },
      { value: "music", label: "Music + chill", emoji: "🎧" },
      { value: "friend", label: "Text a real friend", emoji: "💞" },
      { value: "draw", label: "Draw / create", emoji: "🎨" },
      { value: "snack", label: "Water + snack", emoji: "🍎" },
      { value: "stretch", label: "Stretch / breathe", emoji: "🧘" },
    ],
    reaction: "Perfect — these become your offline feed.",
    why: "These power your Swaps page rewards.",
  },
  {
    id: "motivationStyle",
    type: "single_choice",
    topic: "motivation",
    prompt: "What makes you stick to a habit?",
    weight: 8,
    writesTo: "motivationStyle",
    options: [
      { value: "streak", label: "Streaks I don't want to break", emoji: "🔥" },
      { value: "reward", label: "Cool rewards", emoji: "🎁" },
      { value: "friends", label: "Friends doing it with me", emoji: "🤝" },
      { value: "progress", label: "Seeing progress numbers", emoji: "📈" },
      { value: "challenge", label: "A hard challenge", emoji: "🏆" },
    ],
    reaction: "I'll lean your plan toward that style.",
    why: "Your motivation style decides whether streaks, coins, or crew win for you.",
  },
  {
    id: "accountabilityPref",
    type: "single_choice",
    topic: "accountability",
    prompt: "Want a friend to see your wins?",
    weight: 6,
    writesTo: "accountabilityPref",
    options: [
      { value: "solo", label: "Solo for now", emoji: "🧘" },
      { value: "buddy", label: "One buddy", emoji: "🤝" },
      { value: "crew", label: "Small crew", emoji: "👥" },
      { value: "leaderboard", label: "Leaderboard", emoji: "🏆" },
    ],
    reaction: "I'll set crew features to that level.",
    why: "Controls how loud the Crew page is for you.",
  },
  {
    id: "difficultyTolerance",
    type: "single_choice",
    topic: "difficulty",
    prompt: "How hard should the app shields be at first?",
    weight: 8,
    writesTo: "difficultyTolerance",
    options: [
      { value: "gentle", label: "Gentle pause", emoji: "🪶", reaction: "Soft start. I'll grow with you." },
      { value: "friction", label: "Real friction", emoji: "🛑" },
      { value: "deep_lock", label: "Deep lock", emoji: "🔐", reaction: "You're serious — I love that. Deep lock it is." },
    ],
    reaction: "Friction set.",
    why: "Too hard and you'll bypass. Too soft and you won't feel it.",
  },
  {
    id: "emergencyPassPref",
    type: "single_choice",
    topic: "emergency passes",
    prompt: "If you really need to open a blocked app, what should I do?",
    weight: 6,
    writesTo: "emergencyPassPref",
    options: [
      { value: "two_passes", label: "Give me 2 passes a day", emoji: "🎟️" },
      { value: "one_pass", label: "Just 1 pass a day", emoji: "🎫" },
      { value: "earn_it", label: "Make me earn it", emoji: "💪" },
      { value: "no_pass", label: "No passes — be strict", emoji: "🛡️" },
    ],
    reaction: "Got it. Passes set.",
    why: "An emergency-pass policy prevents the 'I'll just delete the app' moment.",
  },
  {
    id: "improvementGoal",
    type: "short_text",
    topic: "your why",
    prompt: "In one sentence, what would feel like a real win in a month?",
    weight: 7,
    writesTo: "improvementGoal",
    reaction: "I'll put that on your home screen as your North Star.",
    why: "Your sentence shows up on the home page as your North Star.",
  },
];

// ---- Helpers ----

function isAnswered(value: unknown): boolean {
  if (value === undefined || value === null) return false;
  if (typeof value === "string") return value.trim().length > 0;
  if (Array.isArray(value)) return value.length > 0;
  if (typeof value === "number") return Number.isFinite(value);
  return true;
}

export function fieldAnswered(
  profile: InterviewProfile,
  field: keyof InterviewProfile,
): boolean {
  return isAnswered(profile[field]);
}

// Risk signal score, 0..1. Combines hours over goal, hardest-time night,
// bedtime scroll, social pressure, video depth.
export function riskSignal(profile: InterviewProfile): number {
  let score = 0;
  const cur = profile.currentHours ?? 0;
  const goal = profile.goalHours ?? 0;
  if (cur && goal && cur > goal) score += Math.min(0.4, (cur - goal) * 0.08);
  if (profile.hardestTime === "Night") score += 0.15;
  if (profile.bedtimeScroll === "every_night") score += 0.2;
  else if (profile.bedtimeScroll === "sometimes") score += 0.08;
  if (profile.schoolFocus === "daily") score += 0.15;
  else if (profile.schoolFocus === "weekly") score += 0.06;
  if (typeof profile.videoAppDepth === "number" && profile.videoAppDepth >= 4) score += 0.12;
  if (typeof profile.socialPressure === "number" && profile.socialPressure >= 4) score += 0.08;
  if (typeof profile.stressLevel === "number" && profile.stressLevel >= 4) score += 0.06;
  return Math.min(1, score);
}

// Per-question boost based on what the current profile already says.
// e.g. if hours over goal is big, screen-time / hardestTime questions matter more.
// If user picked TikTok, videoAppDepth question gets a boost.
function contextBoost(question: Question, profile: InterviewProfile): number {
  const apps = profile.topApps ?? [];
  const why = profile.whyScroll ?? [];
  const feelings = profile.feelings ?? [];
  switch (question.id) {
    case "hardestTime":
      return profile.currentHours && profile.goalHours && profile.currentHours - profile.goalHours >= 3 ? 1.4 : 1;
    case "bedtimeScroll":
      return profile.hardestTime === "Night" ? 1.6 : 1;
    case "videoAppDepth":
      return apps.some((a) => ["TikTok", "YouTube", "Snapchat"].includes(a)) ? 1.5 : 0.7;
    case "gamingDepth":
      return apps.includes("Games") ? 1.6 : 0.5;
    case "socialPressure":
      return apps.some((a) => ["Instagram", "Snapchat", "X"].includes(a)) ? 1.3 : 0.8;
    case "stressLevel":
      return feelings.includes("Stressed") || why.includes("stress") ? 1.6 : 0.8;
    case "schoolFocus": {
      const ageNum = Number.parseInt(profile.age ?? "", 10);
      return Number.isFinite(ageNum) && ageNum >= 10 && ageNum <= 22 ? 1.4 : 0.4;
    }
    case "notificationTriggers":
      return apps.length >= 2 ? 1.3 : 1;
    case "replacementHabits":
      return why.length > 0 ? 1.4 : 1;
    case "accountabilityPref":
      return profile.motivationStyle === "friends" || profile.motivationStyle === "challenge" ? 1.4 : 0.9;
    case "difficultyTolerance":
      return riskSignal(profile) > 0.45 ? 1.4 : 1;
    case "emergencyPassPref":
      return profile.difficultyTolerance === "deep_lock" || profile.difficultyTolerance === "friction" ? 1.3 : 0.7;
    case "improvementGoal":
      return riskSignal(profile) > 0.35 ? 1.3 : 1;
    default:
      return 1;
  }
}

// Compute the next-best question score for a candidate.
// Higher = ask sooner.
export function scoreQuestion(question: Question, state: EngineState): number {
  if (state.askedIds.includes(question.id)) return -Infinity;
  if (fieldAnswered(state.profile, question.writesTo)) {
    // Allow re-asking if explicitly required (e.g. user came back to fill gaps).
    if (!question.required) return -Infinity;
  }
  const base = question.weight;
  const boost = contextBoost(question, state.profile);
  // Slight ordering preference for required questions early.
  const requiredBias = question.required ? 4 : 0;
  // Lightweight novelty: penalize same topic right after the last asked.
  const lastAsked = state.askedIds[state.askedIds.length - 1];
  const lastTopic = QUESTION_BANK.find((q) => q.id === lastAsked)?.topic;
  const noveltyPenalty = lastTopic && lastTopic === question.topic ? 1.5 : 0;
  return base * boost + requiredBias - noveltyPenalty;
}

// Pick the next question to ask, or null when the engine should stop.
export function pickNextQuestion(state: EngineState): Question | null {
  // 1. Always pin required questions first if any remain unanswered.
  const missingRequired = QUESTION_BANK.find(
    (q) => q.required && !state.askedIds.includes(q.id) && !fieldAnswered(state.profile, q.writesTo),
  );
  if (missingRequired) return missingRequired;

  // 2. If plan power is high enough and we've asked enough, stop.
  const power = planPower(state);
  if (state.askedIds.length >= MIN_QUESTIONS && power >= STOP_THRESHOLD) {
    return null;
  }
  if (state.askedIds.length >= MAX_QUESTIONS) return null;

  // 3. Otherwise pick highest-scoring candidate.
  let best: Question | null = null;
  let bestScore = -Infinity;
  for (const q of QUESTION_BANK) {
    const s = scoreQuestion(q, state);
    if (s > bestScore) {
      bestScore = s;
      best = q;
    }
  }
  if (!best || bestScore === -Infinity) return null;
  return best;
}

// Plan power 0..100: how confident the engine is in the plan,
// weighted by the questions actually answered.
export function planPower(state: EngineState): number {
  let total = 0;
  for (const q of QUESTION_BANK) total += q.weight;
  let earned = 0;
  for (const q of QUESTION_BANK) {
    if (fieldAnswered(state.profile, q.writesTo)) earned += q.weight;
  }
  // Bonus once core signals are present.
  if (
    state.profile.currentHours !== undefined &&
    state.profile.goalHours !== undefined &&
    state.profile.hardestTime
  ) {
    earned += 8;
  }
  // Small bonus when persona is identifiable (top apps + a why).
  if ((state.profile.topApps?.length ?? 0) >= 2 && (state.profile.whyScroll?.length ?? 0) >= 1) {
    earned += 4;
  }
  // Bonus when difficulty + emergency-pass policy is set — these directly tune shields.
  if (state.profile.difficultyTolerance && state.profile.emergencyPassPref) {
    earned += 4;
  }
  return Math.max(0, Math.min(100, Math.round((earned / total) * 100)));
}

export function applyAnswer(
  state: EngineState,
  questionId: string,
  answer: unknown,
): EngineState {
  const question = QUESTION_BANK.find((q) => q.id === questionId);
  if (!question) return state;
  let typed: unknown = answer;
  if (question.type === "hours_slider" || question.type === "scale") {
    typed = typeof answer === "number" ? answer : Number(answer);
  }
  const profile: InterviewProfile = {
    ...state.profile,
    [question.writesTo]: typed as InterviewProfile[typeof question.writesTo],
  };
  const answers: AnswerMap = { ...state.answers, [questionId]: typed };
  const askedIds = state.askedIds.includes(questionId)
    ? state.askedIds
    : [...state.askedIds, questionId];
  return { profile, answers, askedIds };
}

export function initialState(seed: Partial<InterviewProfile> = {}): EngineState {
  return { profile: { ...seed }, answers: {}, askedIds: [] };
}

// Derive Lumi mood from current answer for richer reactions.
export function lumiMoodForAnswer(question: Question, answer: unknown): "happy" | "celebrate" | "coach" | "thinking" {
  if (question.id === "currentHours" && typeof answer === "number" && answer >= 6) return "coach";
  if (question.id === "bedtimeScroll" && answer === "every_night") return "coach";
  if (question.id === "schoolFocus" && answer === "daily") return "coach";
  if (question.id === "difficultyTolerance" && answer === "deep_lock") return "celebrate";
  if (question.type === "multi_choice" && Array.isArray(answer) && answer.length >= 3) return "celebrate";
  return "happy";
}

// Build a one-line "great answer" celebration string for hi-signal answers.
export function celebrationFor(question: Question, answer: unknown, state: EngineState): string | null {
  if (question.id === "currentHours" && typeof answer === "number" && answer >= 6) {
    return `Big honest number — that's where the real wins live.`;
  }
  if (question.id === "bedtimeScroll" && answer === "every_night") {
    return "Bedtime is the #1 fix. We'll start there.";
  }
  if (question.id === "topApps" && Array.isArray(answer) && answer.length >= 3) {
    return "Got your top traps. Shields locked and loaded.";
  }
  if (question.id === "replacementHabits" && Array.isArray(answer) && answer.length >= 3) {
    return "Your offline feed just got stacked.";
  }
  if (planPower(state) >= STOP_THRESHOLD) {
    return "Plan power is high enough to launch. Let's go!";
  }
  return null;
}

// Compact ready-to-render snapshot for the dashboard.
export type InterviewSummary = {
  planPower: number;
  riskSignal: number;
  persona: "balanced" | "night_scroller" | "boredom_scroller" | "stress_scroller" | "social_validator";
  topShields: string[];
  recommendedReplacements: string[];
  difficultyTolerance: string;
  emergencyPassPref: string;
  motivationStyle: string;
  accountabilityPref: string;
};

export function summarize(state: EngineState): InterviewSummary {
  const p = state.profile;
  let persona: InterviewSummary["persona"] = "balanced";
  const why = p.whyScroll ?? [];
  if (p.bedtimeScroll === "every_night" || p.hardestTime === "Night") persona = "night_scroller";
  else if (why.includes("boredom") || p.hardestTime === "When bored") persona = "boredom_scroller";
  else if (why.includes("stress") || (p.feelings ?? []).includes("Stressed")) persona = "stress_scroller";
  else if ((typeof p.socialPressure === "number" && p.socialPressure >= 4) || why.includes("fomo")) {
    persona = "social_validator";
  }
  return {
    planPower: planPower(state),
    riskSignal: riskSignal(state.profile),
    persona,
    topShields: (p.topApps ?? []).slice(0, 3),
    recommendedReplacements: (p.replacementHabits ?? []).slice(0, 3),
    difficultyTolerance: p.difficultyTolerance ?? "friction",
    emergencyPassPref: p.emergencyPassPref ?? "two_passes",
    motivationStyle: p.motivationStyle ?? "reward",
    accountabilityPref: p.accountabilityPref ?? "buddy",
  };
}
