import { useEffect, useMemo, useState } from "react";
import { Router, useLocation } from "wouter";
import { useHashLocation } from "wouter/use-hash-location";
import { QueryClientProvider } from "@tanstack/react-query";
import { AnimatePresence, motion } from "framer-motion";
import {
  AlarmClock,
  ArrowRight,
  BadgeCheck,
  Bell,
  BookOpen,
  Brain,
  Check,
  ChevronLeft,
  ChevronRight,
  Dumbbell,
  Flame,
  Gift,
  Heart,
  Lock,
  Moon,
  ShoppingBag,
  Smartphone,
  Sparkles,
  Sprout,
  Star,
  Sun,
  Target,
  TimerReset,
  Trophy,
  Users,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { queryClient } from "./lib/queryClient";
import NotFound from "@/pages/not-found";
import {
  fetchPlan,
  fallbackPlan,
  postEvent,
  profileToPayload,
  type PersonalizationPlan,
  type EventType,
} from "@/lib/personalization";
import { AccountGate } from "@/components/AccountGate";
import { PatternsPage } from "@/components/PatternsPage";
import { EarnUnlockPage } from "@/components/EarnUnlockPage";
import { FocusPlansPage } from "@/components/FocusPlansPage";
import { DailyGoalCard } from "@/components/DailyGoalCard";
import { AccountabilityLeaderboard } from "@/components/AccountabilityLeaderboard";
import { DoomscrollNudges } from "@/components/DoomscrollNudges";
import { DailyReportCard } from "@/components/DailyReportCard";
import { logout as apiLogout, patchProfile, type SafeAccount } from "@/lib/auth";

type Mode = "soft" | "focus" | "hard";
type OnboardingStep = 0 | 1 | 2 | 3 | 4 | 5 | 6;

type AppRule = {
  id: string;
  name: string;
  category: string;
  opens: number;
  minutes: number;
  delay: number;
  limit: number;
  mode: Mode;
};

type Quest = {
  id: string;
  title: string;
  description: string;
  progress: number;
  target: number;
  reward: number;
  claimed: boolean;
};

type OnboardingData = {
  name: string;
  age: string;
  currentHours: number;
  goalHours: number;
  feelings: string[];
  hardestTime: string;
  topApps: string[];
  appleConnected: boolean;
  notificationsAllowed: boolean;
};

type OfflineAction = {
  id: string;
  title: string;
  minutes: number;
  rewardRange: [number, number];
  icon: typeof Sprout;
  swapFor: string;
};

type RewardItem = {
  id: string;
  title: string;
  cost: number;
  description: string;
};

const defaultProfile: OnboardingData = {
  name: "",
  age: "",
  currentHours: 5,
  goalHours: 2,
  feelings: [],
  hardestTime: "Night",
  topApps: ["Instagram"],
  appleConnected: false,
  notificationsAllowed: false,
};

const appRules: AppRule[] = [
  { id: "instagram", name: "Instagram", category: "social", opens: 23, minutes: 62, delay: 5, limit: 6, mode: "soft" },
  { id: "tiktok", name: "TikTok", category: "short video", opens: 18, minutes: 74, delay: 8, limit: 7, mode: "focus" },
  { id: "youtube", name: "YouTube Shorts", category: "video", opens: 11, minutes: 46, delay: 10, limit: 8, mode: "focus" },
  { id: "snap", name: "Snapchat", category: "messages", opens: 14, minutes: 28, delay: 4, limit: 4, mode: "soft" },
];

const initialQuests: Quest[] = [
  {
    id: "morning",
    title: "No-scroll first hour",
    description: "Keep fun apps locked until your day has momentum.",
    progress: 60,
    target: 60,
    reward: 18,
    claimed: false,
  },
  {
    id: "study",
    title: "Two focus rounds",
    description: "Finish two phone-free blocks before entertainment.",
    progress: 1,
    target: 2,
    reward: 30,
    claimed: false,
  },
  {
    id: "bed",
    title: "Phone sleeps away",
    description: "Put your phone away before bed for five nights.",
    progress: 4,
    target: 5,
    reward: 24,
    claimed: false,
  },
];

const crew = [
  { name: "Ayaan", minutes: 182, delta: "+41", current: true },
  { name: "Maya", minutes: 151, delta: "+27", current: false },
  { name: "Jay", minutes: 133, delta: "+19", current: false },
  { name: "Noah", minutes: 98, delta: "+12", current: false },
];

const weeklyBars = [46, 64, 58, 79, 72, 87, 91];
const feelings = ["Tired", "Happy", "Stressed", "Bored", "Focused", "Regretful"];
const appChoices = ["Instagram", "TikTok", "YouTube", "Snapchat", "Games", "Messages"];
const hardTimes = ["Morning", "School break", "After homework", "Night", "When bored"];

const offlineActions: OfflineAction[] = [
  { id: "walk", title: "Take a 10-minute walk", minutes: 10, rewardRange: [8, 20], icon: Sprout, swapFor: "bored scroll" },
  { id: "read", title: "Read 5 pages", minutes: 12, rewardRange: [10, 24], icon: BookOpen, swapFor: "bedtime scroll" },
  { id: "workout", title: "Do a quick workout", minutes: 15, rewardRange: [12, 28], icon: Dumbbell, swapFor: "after-school scroll" },
  { id: "friend", title: "Text a real friend", minutes: 5, rewardRange: [6, 18], icon: Heart, swapFor: "lonely scroll" },
];

const rewardShop: RewardItem[] = [
  { id: "theme", title: "Lumi theme pack", cost: 35, description: "Make the app feel new without opening socials." },
  { id: "unlock", title: "5 mindful minutes", cost: 45, description: "Earn a tiny, timed app unlock." },
  { id: "badge", title: "Rare streak badge", cost: 60, description: "Show off a real-life win." },
];

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function formatHours(hours: number) {
  const whole = Math.floor(hours);
  const minutes = Math.round((hours - whole) * 60);
  if (minutes === 0) return `${whole}h`;
  return `${whole}h ${minutes}m`;
}

function Logo() {
  return (
    <div className="flex items-center gap-3" data-testid="brand-logo">
      <div className="flex h-11 w-11 items-center justify-center rounded-2xl surface-night shadow-sm">
        <svg aria-label="Latch logo" viewBox="0 0 48 48" className="h-7 w-7 text-lime-reward" fill="none">
          <path d="M15 26V15.5C15 10.25 19.25 6 24.5 6S34 10.25 34 15.5V26" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
          <path d="M11 23h26v13a7 7 0 0 1-7 7H18a7 7 0 0 1-7-7V23Z" fill="currentColor" />
          <circle cx="24" cy="32" r="3" fill="#1b1828" />
        </svg>
      </div>
      <div>
        <p className="font-display text-lg font-extrabold leading-none tracking-tight">Latch</p>
        <p className="text-xs font-medium text-muted-foreground">Hooked on real life</p>
      </div>
    </div>
  );
}

function Mascot({ mood = "happy", message, compact = false }: { mood?: "happy" | "coach" | "celebrate"; message?: string; compact?: boolean }) {
  const eyeY = mood === "celebrate" ? 17 : 18;
  return (
    <div className={`flex ${compact ? "items-center" : "items-start"} gap-3`} data-testid="mascot-lumi">
      <motion.div
        animate={{ y: [0, -5, 0], rotate: mood === "celebrate" ? [0, -4, 4, 0] : [0, 0] }}
        transition={{ duration: 2.8, repeat: Infinity, ease: "easeInOut" }}
        className="relative shrink-0"
      >
        <svg viewBox="0 0 96 96" className={compact ? "h-14 w-14" : "h-24 w-24"} aria-label="Lumi mascot">
          <defs>
            <linearGradient id="lumiBody" x1="15" x2="84" y1="12" y2="82">
              <stop stopColor="#D8F16A" />
              <stop offset="1" stopColor="#7DE2C2" />
            </linearGradient>
          </defs>
          <path d="M25 45V30c0-12 9-21 23-21s23 9 23 21v15" fill="none" stroke="#102F2D" strokeWidth="8" strokeLinecap="round" />
          <rect x="16" y="35" width="64" height="48" rx="20" fill="url(#lumiBody)" stroke="#102F2D" strokeWidth="5" />
          <circle cx="37" cy={eyeY} r="4" fill="#102F2D" />
          <circle cx="59" cy={eyeY} r="4" fill="#102F2D" />
          <path d={mood === "coach" ? "M38 63h20" : "M36 61c6 7 18 7 24 0"} stroke="#102F2D" strokeWidth="5" strokeLinecap="round" fill="none" />
          <path d="M17 51c-8 1-13 5-13 11 0 7 6 11 13 11" stroke="#102F2D" strokeWidth="5" strokeLinecap="round" fill="none" />
          <path d="M79 51c8 1 13 5 13 11 0 7-6 11-13 11" stroke="#102F2D" strokeWidth="5" strokeLinecap="round" fill="none" />
        </svg>
        <span className="absolute -right-1 top-1 rounded-full bg-background px-2 py-1 text-xs font-black shadow-sm">Lumi</span>
      </motion.div>
      {message && (
        <div className="rounded-xl bg-card p-4 text-sm font-medium leading-6 shadow-sm" data-testid="mascot-message">
          {message}
        </div>
      )}
    </div>
  );
}

function TinyBarChart({ currentHours, goalHours }: { currentHours: number; goalHours: number }) {
  const daily = currentHours;
  const weekly = currentHours * 7;
  const yearlyDays = (currentHours * 365) / 24;
  const goalWeekly = goalHours * 7;
  const values = [
    { label: "Today", value: daily, goal: goalHours, unit: "hours" },
    { label: "Week", value: weekly, goal: goalWeekly, unit: "hours" },
    { label: "Year", value: yearlyDays, goal: (goalHours * 365) / 24, unit: "days" },
  ];
  const max = Math.max(...values.map((item) => item.value), 1);

  return (
    <div className="space-y-4" data-testid="chart-screen-time-impact">
      {values.map((item) => (
        <div key={item.label}>
          <div className="mb-2 flex items-center justify-between gap-3 text-sm">
            <span className="font-bold">{item.label}</span>
            <span className="font-mono font-black tabular-nums">
              {item.unit === "days" ? `${item.value.toFixed(0)} days` : `${item.value.toFixed(0)}h`}
            </span>
          </div>
          <div className="grid grid-cols-[1fr_auto] items-center gap-3">
            <div className="h-4 overflow-hidden rounded-full bg-secondary">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${(item.value / max) * 100}%` }}
                className="h-full rounded-full bg-primary"
                data-testid={`bar-impact-${item.label.toLowerCase()}`}
              />
            </div>
            <span className="text-xs text-muted-foreground">goal {item.unit === "days" ? `${item.goal.toFixed(0)}d` : `${item.goal.toFixed(0)}h`}</span>
          </div>
        </div>
      ))}
    </div>
  );
}

function StepButton({ selected, children, onClick, testId }: { selected: boolean; children: React.ReactNode; onClick: () => void; testId: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-xl border px-4 py-3 text-left text-sm font-bold transition hover-elevate active-elevate-2 ${
        selected ? "border-primary bg-primary text-primary-foreground" : "border-border bg-background text-foreground"
      }`}
      data-testid={testId}
    >
      {children}
    </button>
  );
}

function Onboarding({
  profile,
  setProfile,
  onFinish,
  theme,
  setTheme,
}: {
  profile: OnboardingData;
  setProfile: React.Dispatch<React.SetStateAction<OnboardingData>>;
  onFinish: () => void;
  theme: "light" | "dark";
  setTheme: React.Dispatch<React.SetStateAction<"light" | "dark">>;
}) {
  const [step, setStep] = useState<OnboardingStep>(0);
  const [permissionNote, setPermissionNote] = useState("");
  const progress = ((step + 1) / 7) * 100;
  const savedHours = Math.max(0, profile.currentHours - profile.goalHours);

  const mascotMessages = [
    `Hi, I’m Lumi. I’ll help you make your phone less sticky.`,
    "First, I’ll show you the trick apps use: they make the next swipe feel exciting.",
    "Now tell me your real number. No judging. We just need a starting point.",
    "This chart shows how small daily numbers become huge over time.",
    "Your feelings matter. Latch changes based on why you scroll.",
    "A real mobile app would ask Apple for Screen Time access and notification permission here.",
    `${profile.name || "You"} are ready. I made your first plan simple.`,
  ];

  function toggleArray(field: "feelings" | "topApps", value: string) {
    setProfile((current) => {
      const list = current[field];
      const next = list.includes(value) ? list.filter((item) => item !== value) : [...list, value];
      return { ...current, [field]: next };
    });
  }

  async function requestNotifications() {
    if (!("Notification" in window)) {
      setProfile((current) => ({ ...current, notificationsAllowed: true }));
      setPermissionNote("Notifications are shown as connected in this demo.");
      return;
    }

    try {
      const result = await Notification.requestPermission();
      setProfile((current) => ({ ...current, notificationsAllowed: result === "granted" || result === "default" }));
      setPermissionNote(result === "granted" ? "Notifications allowed." : "Demo mode: we will show reminders inside the app.");
    } catch {
      setProfile((current) => ({ ...current, notificationsAllowed: true }));
      setPermissionNote("Demo mode: notifications are shown as connected.");
    }
  }

  function next() {
    if (step < 6) {
      setStep((current) => (current + 1) as OnboardingStep);
      return;
    }
    onFinish();
  }

  const canContinue =
    step === 0 ? profile.name.trim().length > 0 && profile.age.trim().length > 0 : step === 4 ? profile.feelings.length > 0 : true;

  return (
    <main className="min-h-screen overflow-hidden bg-background text-foreground">
      <div className="fixed inset-0 -z-10 bg-[radial-gradient(circle_at_10%_15%,hsl(var(--latch-yellow)/0.32),transparent_24%),radial-gradient(circle_at_90%_25%,hsl(var(--latch-lime)/0.26),transparent_28%),radial-gradient(circle_at_50%_95%,hsl(var(--latch-purple)/0.18),transparent_30%),linear-gradient(135deg,hsl(var(--background)),hsl(var(--latch-cream-soft)))]" />
      <div className="pointer-events-none fixed inset-x-0 bottom-0 -z-10 hidden h-72 bg-[linear-gradient(90deg,hsl(var(--primary)/0.08)_1px,transparent_1px),linear-gradient(0deg,hsl(var(--primary)/0.08)_1px,transparent_1px)] bg-[size:42px_42px] lg:block" />
      <header className="mx-auto flex max-w-6xl items-center justify-between px-4 py-5 sm:px-6 lg:px-8">
        <Logo />
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setTheme((current) => (current === "dark" ? "light" : "dark"))}
          data-testid="button-onboarding-theme"
        >
          {theme === "dark" ? <Sun className="h-4 w-4" aria-hidden="true" /> : <Moon className="h-4 w-4" aria-hidden="true" />}
          {theme === "dark" ? "Light" : "Dark"}
        </Button>
      </header>

      <section className="mx-auto grid max-w-6xl gap-6 px-4 pb-8 sm:px-6 lg:grid-cols-[0.85fr_1.15fr] lg:px-8">
        <aside className="rounded-[2rem] border border-border/70 bg-card/88 p-5 shadow-sm backdrop-blur" data-testid="panel-onboarding-mascot">
          <Mascot mood={step === 6 ? "celebrate" : step === 5 ? "coach" : "happy"} message={mascotMessages[step]} />
          <div className="mt-6">
            <div className="flex items-center justify-between text-xs font-black uppercase tracking-[0.18em] text-muted-foreground">
              <span>setup</span>
              <span>{step + 1}/7</span>
            </div>
            <Progress value={progress} className="mt-3 h-3" data-testid="progress-onboarding" />
          </div>
          <div className="mt-6 rounded-2xl bg-background p-4">
            <p className="text-sm font-bold">What Latch is doing</p>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              We learn your habits, then turn scrolling into a choice. The goal is not “never use your phone.” The goal is “you control it.”
            </p>
          </div>
        </aside>

        <motion.article layout className="rounded-[2rem] border border-border/70 bg-card/92 p-5 shadow-sm backdrop-blur sm:p-7" data-testid="panel-onboarding-step">
          <AnimatePresence mode="wait">
            {step === 0 && (
              <motion.div key="basic" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }}>
                <p className="text-xs font-black uppercase tracking-[0.18em] text-muted-foreground">welcome</p>
                <h1 className="mt-3 font-display text-[2rem] font-extrabold leading-none tracking-tight sm:text-[2.8rem]">Let’s build your phone plan.</h1>
                <p className="mt-4 text-base leading-7 text-muted-foreground">Answer a few quick questions. Then Latch will make the app easier for you.</p>
                <div className="mt-7 grid gap-4 sm:grid-cols-2">
                  <label className="text-sm font-bold">
                    Name
                    <input
                      value={profile.name}
                      onChange={(event) => setProfile((current) => ({ ...current, name: event.target.value }))}
                      className="mt-2 min-h-12 w-full rounded-xl border border-input bg-background px-4 text-base outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      placeholder="Ayaan"
                      data-testid="input-name"
                    />
                  </label>
                  <label className="text-sm font-bold">
                    Age
                    <input
                      value={profile.age}
                      onChange={(event) => setProfile((current) => ({ ...current, age: event.target.value.replace(/[^0-9]/g, "") }))}
                      className="mt-2 min-h-12 w-full rounded-xl border border-input bg-background px-4 text-base outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      placeholder="17"
                      data-testid="input-age"
                    />
                  </label>
                </div>
              </motion.div>
            )}

            {step === 1 && (
              <motion.div key="education" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }}>
                <p className="text-xs font-black uppercase tracking-[0.18em] text-muted-foreground">quick lesson</p>
                <h1 className="mt-3 font-display text-[2rem] font-extrabold leading-none tracking-tight">Why scrolling feels hard to stop</h1>
                <div className="mt-6 grid gap-3">
                  {[
                    ["Infinite scroll", "There is no clear finish line, so your brain keeps asking for one more swipe."],
                    ["Likes and comments", "Social rewards feel good, so you want to check again."],
                    ["Notifications", "A red dot or buzz says, “Something might be waiting.”"],
                    ["Personal feeds", "Apps learn what you pause on, then show more of it."],
                  ].map(([title, copy], index) => (
                    <div key={title} className="rounded-2xl bg-background p-4" data-testid={`card-education-${index}`}>
                      <p className="font-bold">{title}</p>
                      <p className="mt-1 text-sm leading-6 text-muted-foreground">{copy}</p>
                    </div>
                  ))}
                </div>
                <p className="mt-5 rounded-2xl bg-secondary p-4 text-sm leading-6 text-secondary-foreground">
                  Simple version: the app is not “stronger” than you. It is designed to keep attention. Latch adds design in the other direction.
                </p>
              </motion.div>
            )}

            {step === 2 && (
              <motion.div key="hours" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }}>
                <p className="text-xs font-black uppercase tracking-[0.18em] text-muted-foreground">your numbers</p>
                <h1 className="mt-3 font-display text-[2rem] font-extrabold leading-none tracking-tight">How much time do you spend?</h1>
                <div className="mt-7 grid gap-5 sm:grid-cols-2">
                  <label className="rounded-2xl bg-background p-5 text-sm font-bold">
                    Current screen time
                    <span className="mt-3 block font-display text-xl font-black tabular-nums">{formatHours(profile.currentHours)} / day</span>
                    <input
                      type="range"
                      min="0.5"
                      max="12"
                      step="0.5"
                      value={profile.currentHours}
                      onChange={(event) => setProfile((current) => ({ ...current, currentHours: Number(event.target.value) }))}
                      className="mt-5 w-full accent-lime-400"
                      data-testid="input-current-hours"
                    />
                  </label>
                  <label className="rounded-2xl bg-background p-5 text-sm font-bold">
                    Goal screen time
                    <span className="mt-3 block font-display text-xl font-black tabular-nums">{formatHours(profile.goalHours)} / day</span>
                    <input
                      type="range"
                      min="0.5"
                      max="8"
                      step="0.5"
                      value={profile.goalHours}
                      onChange={(event) => setProfile((current) => ({ ...current, goalHours: Number(event.target.value) }))}
                      className="mt-5 w-full accent-lime-400"
                      data-testid="input-goal-hours"
                    />
                  </label>
                </div>
                <p className="mt-5 text-sm leading-6 text-muted-foreground" data-testid="text-saved-hours">
                  If you hit this goal, you get back about <strong>{formatHours(savedHours)}</strong> every day.
                </p>
              </motion.div>
            )}

            {step === 3 && (
              <motion.div key="chart" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }}>
                <p className="text-xs font-black uppercase tracking-[0.18em] text-muted-foreground">impact chart</p>
                <h1 className="mt-3 font-display text-[2rem] font-extrabold leading-none tracking-tight">Small hours become big time.</h1>
                <p className="mt-4 text-base leading-7 text-muted-foreground">
                  At {formatHours(profile.currentHours)} a day, your phone can take about {(profile.currentHours * 7).toFixed(0)} hours each week.
                </p>
                <div className="mt-7 rounded-2xl bg-background p-5">
                  <TinyBarChart currentHours={profile.currentHours} goalHours={profile.goalHours} />
                </div>
                <p className="mt-5 rounded-2xl bg-secondary p-4 text-sm leading-6 text-secondary-foreground">
                  Research often links heavy recreational screen use with less sleep, less movement, and feeling less rested. Latch focuses on swapping some scroll time for real-life time.
                </p>
              </motion.div>
            )}

            {step === 4 && (
              <motion.div key="feelings" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }}>
                <p className="text-xs font-black uppercase tracking-[0.18em] text-muted-foreground">make it personal</p>
                <h1 className="mt-3 font-display text-[2rem] font-extrabold leading-none tracking-tight">How do you feel after scrolling?</h1>
                <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3">
                  {feelings.map((feeling) => (
                    <StepButton
                      key={feeling}
                      selected={profile.feelings.includes(feeling)}
                      onClick={() => toggleArray("feelings", feeling)}
                      testId={`button-feeling-${feeling.toLowerCase()}`}
                    >
                      {feeling}
                    </StepButton>
                  ))}
                </div>
                <h2 className="mt-7 font-display text-xl font-extrabold">Which apps pull you in most?</h2>
                <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
                  {appChoices.map((app) => (
                    <StepButton
                      key={app}
                      selected={profile.topApps.includes(app)}
                      onClick={() => toggleArray("topApps", app)}
                      testId={`button-app-choice-${app.toLowerCase().replaceAll(" ", "-")}`}
                    >
                      {app}
                    </StepButton>
                  ))}
                </div>
                <h2 className="mt-7 font-display text-xl font-extrabold">When is scrolling hardest?</h2>
                <div className="mt-4 grid gap-3 sm:grid-cols-3">
                  {hardTimes.map((time) => (
                    <StepButton
                      key={time}
                      selected={profile.hardestTime === time}
                      onClick={() => setProfile((current) => ({ ...current, hardestTime: time }))}
                      testId={`button-hard-time-${time.toLowerCase().replaceAll(" ", "-")}`}
                    >
                      {time}
                    </StepButton>
                  ))}
                </div>
              </motion.div>
            )}

            {step === 5 && (
              <motion.div key="permissions" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }}>
                <p className="text-xs font-black uppercase tracking-[0.18em] text-muted-foreground">connect</p>
                <h1 className="mt-3 font-display text-[2rem] font-extrabold leading-none tracking-tight">Connect your phone tools.</h1>
                <div className="mt-7 grid gap-4">
                  <div className="rounded-2xl bg-background p-5">
                    <div className="flex items-start gap-4">
                      <Smartphone className="mt-1 h-6 w-6 text-primary" aria-hidden="true" />
                      <div className="flex-1">
                        <p className="font-bold">Apple Screen Time</p>
                        <p className="mt-1 text-sm leading-6 text-muted-foreground">
                          In a real iPhone app, this opens Apple’s Screen Time permission. In this web demo, we mark it connected.
                        </p>
                        <Button
                          type="button"
                          className="mt-4"
                          variant={profile.appleConnected ? "secondary" : "default"}
                          onClick={() => setProfile((current) => ({ ...current, appleConnected: true }))}
                          data-testid="button-connect-apple"
                        >
                          {profile.appleConnected ? "Screen Time connected" : "Connect Apple Screen Time"}
                        </Button>
                      </div>
                    </div>
                  </div>
                  <div className="rounded-2xl bg-background p-5">
                    <div className="flex items-start gap-4">
                      <Bell className="mt-1 h-6 w-6 text-primary" aria-hidden="true" />
                      <div className="flex-1">
                        <p className="font-bold">Helpful notifications</p>
                        <p className="mt-1 text-sm leading-6 text-muted-foreground">
                          Lumi can nudge you before night scrolling, cheer when you save time, and remind you when a focus room starts.
                        </p>
                        <Button
                          type="button"
                          className="mt-4"
                          variant={profile.notificationsAllowed ? "secondary" : "default"}
                          onClick={requestNotifications}
                          data-testid="button-allow-notifications"
                        >
                          {profile.notificationsAllowed ? "Notifications ready" : "Allow notifications"}
                        </Button>
                        {permissionNote && <p className="mt-3 text-sm text-muted-foreground">{permissionNote}</p>}
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {step === 6 && (
              <motion.div key="plan" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }}>
                <p className="text-xs font-black uppercase tracking-[0.18em] text-muted-foreground">your plan</p>
                <h1 className="mt-3 font-display text-[2rem] font-extrabold leading-none tracking-tight">Ready, {profile.name || "friend"}.</h1>
                <p className="mt-4 text-base leading-7 text-muted-foreground">I made Latch match your answers. You can change anything later.</p>
                <div className="mt-7 grid gap-3 sm:grid-cols-3">
                  <div className="rounded-2xl bg-background p-4">
                    <p className="text-sm font-bold">Goal</p>
                    <p className="mt-2 font-display text-xl font-black">{formatHours(profile.goalHours)}</p>
                    <p className="mt-1 text-sm text-muted-foreground">per day</p>
                  </div>
                  <div className="rounded-2xl bg-background p-4">
                    <p className="text-sm font-bold">Main shield</p>
                    <p className="mt-2 font-display text-xl font-black">{profile.topApps[0] || "Instagram"}</p>
                    <p className="mt-1 text-sm text-muted-foreground">highest pull</p>
                  </div>
                  <div className="rounded-2xl bg-background p-4">
                    <p className="text-sm font-bold">Hard time</p>
                    <p className="mt-2 font-display text-xl font-black">{profile.hardestTime}</p>
                    <p className="mt-1 text-sm text-muted-foreground">extra nudge</p>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="mt-8 flex flex-wrap items-center justify-between gap-3">
            <Button type="button" variant="outline" onClick={() => setStep((current) => Math.max(0, current - 1) as OnboardingStep)} disabled={step === 0} data-testid="button-onboarding-back">
              <ChevronLeft className="h-4 w-4" aria-hidden="true" />
              Back
            </Button>
            <Button type="button" onClick={next} disabled={!canContinue} data-testid="button-onboarding-next">
              {step === 6 ? "Enter Latch" : "Next"}
              <ChevronRight className="h-4 w-4" aria-hidden="true" />
            </Button>
          </div>
        </motion.article>
      </section>

      <section className="mx-auto hidden max-w-6xl grid-cols-3 gap-4 px-4 pb-10 sm:px-6 lg:grid lg:px-8" aria-label="Latch preview cards">
        {[
          ["Pause", "Wait 8 seconds before Instagram opens."],
          ["Swap", "Try water, walk, stretch, or text a friend."],
          ["Win", "Earn coins when you choose real life."],
        ].map(([title, copy], index) => (
          <motion.div
            key={title}
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.08 * index }}
            className="rounded-[1.5rem] border border-border/70 bg-card/70 p-4 shadow-sm backdrop-blur"
            data-testid={`card-onboarding-preview-${index}`}
          >
            <p className="font-display text-xl font-black">{title}</p>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">{copy}</p>
          </motion.div>
        ))}
      </section>
    </main>
  );
}

function StatCard({ label, value, detail, icon: Icon, accent }: { label: string; value: string; detail: string; icon: typeof AlarmClock; accent?: "reward" | "energy" | "streak" | "focus" }) {
  const surface =
    accent === "reward" ? "surface-lime"
    : accent === "energy" ? "surface-yellow"
    : accent === "streak" ? "surface-night text-cream"
    : accent === "focus" ? "surface-purple"
    : "bg-card text-card-foreground";
  const labelTone =
    accent === "reward" || accent === "energy"
      ? "text-[hsl(var(--latch-night))]/70"
      : accent === "streak" || accent === "focus"
        ? "text-cream-muted"
        : "text-muted-foreground";
  const detailTone =
    accent === "reward" || accent === "energy"
      ? "text-[hsl(var(--latch-night))]/80"
      : accent === "streak" || accent === "focus"
        ? "text-cream-muted"
        : "text-muted-foreground";
  const iconTone =
    accent === "streak" || accent === "focus"
      ? "text-lime-reward"
      : accent === "reward" || accent === "energy"
        ? "text-[hsl(var(--latch-night))]"
        : "text-primary";
  return (
    <article className={`rounded-2xl p-4 shadow-sm ${surface}`} data-testid={`card-stat-${label.toLowerCase().replaceAll(" ", "-")}`}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className={`text-xs font-semibold uppercase tracking-[0.18em] ${labelTone}`}>{label}</p>
          <p className="mt-2 font-display text-xl font-extrabold tabular-nums">{value}</p>
        </div>
        <Icon className={`h-5 w-5 ${iconTone}`} aria-hidden="true" />
      </div>
      <p className={`mt-3 text-sm ${detailTone}`}>{detail}</p>
    </article>
  );
}

function ModePill({ mode }: { mode: Mode }) {
  const copy = { soft: "pause", focus: "earn", hard: "locked" };
  return (
    <span className="rounded-full bg-secondary px-2.5 py-1 text-xs font-bold uppercase tracking-[0.16em] text-secondary-foreground" data-testid={`pill-mode-${mode}`}>
      {copy[mode]}
    </span>
  );
}

const pageLinks = [
  { label: "Home", path: "/" },
  { label: "Earn", path: "/earn" },
  { label: "Plans", path: "/plans" },
  { label: "Bridge", path: "/bridge" },
  { label: "Shield", path: "/shield" },
  { label: "Patterns", path: "/patterns" },
  { label: "Swaps", path: "/swaps" },
  { label: "Shop", path: "/shop" },
  { label: "Focus", path: "/focus" },
  { label: "Quests", path: "/quests" },
  { label: "Crew", path: "/crew" },
];

function AppHeader({
  theme,
  setTheme,
  account,
  onLogout,
}: {
  theme: "light" | "dark";
  setTheme: React.Dispatch<React.SetStateAction<"light" | "dark">>;
  account: SafeAccount | null;
  onLogout: () => void;
}) {
  const [location, setLocation] = useLocation();

  return (
    <header className="sticky top-0 z-50 border-b border-border/70 bg-background/88 backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6 lg:px-8">
        <button type="button" onClick={() => setLocation("/")} className="text-left" data-testid="button-home-logo">
          <Logo />
        </button>
        <nav className="hidden items-center gap-1 md:flex" aria-label="Primary navigation">
          {pageLinks.map((item) => (
            <button
              key={item.path}
              type="button"
              className={`rounded-xl px-3 py-2 text-sm font-semibold transition hover-elevate active-elevate-2 ${
                location === item.path ? "bg-primary text-primary-foreground" : "text-muted-foreground"
              }`}
              data-testid={`button-nav-${item.label.toLowerCase()}`}
              onClick={() => setLocation(item.path)}
            >
              {item.label}
            </button>
          ))}
        </nav>
        <div className="flex items-center gap-2">
          {account && (
            <span className="hidden text-xs font-bold text-muted-foreground sm:inline" data-testid="text-account-username">
              {account.username}
            </span>
          )}
          <Button type="button" variant="outline" size="sm" onClick={() => setLocation("/bridge")} data-testid="button-open-bridge">
            Bridge
          </Button>
          <Button type="button" variant="outline" size="sm" onClick={() => setTheme((current) => (current === "dark" ? "light" : "dark"))} data-testid="button-theme-toggle">
            {theme === "dark" ? <Sun className="h-4 w-4" aria-hidden="true" /> : <Moon className="h-4 w-4" aria-hidden="true" />}
            {theme === "dark" ? "Light" : "Dark"}
          </Button>
          {account && (
            <Button type="button" variant="secondary" size="sm" onClick={onLogout} data-testid="button-logout">
              Log out
            </Button>
          )}
        </div>
      </div>
      <nav className="mx-auto flex max-w-7xl gap-2 overflow-x-auto px-4 pb-3 sm:px-6 md:hidden" aria-label="Mobile navigation">
        {pageLinks.map((item) => (
          <button
            key={item.path}
            type="button"
            className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-bold ${location === item.path ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground"}`}
            data-testid={`button-mobile-nav-${item.label.toLowerCase()}`}
            onClick={() => setLocation(item.path)}
          >
            {item.label}
          </button>
        ))}
      </nav>
    </header>
  );
}

function Home() {
  const [theme, setTheme] = useState<"light" | "dark">(() =>
    typeof window !== "undefined" && window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light",
  );
  const [account, setAccount] = useState<SafeAccount | null>(null);
  const [onboarded, setOnboarded] = useState(false);
  const [profile, setProfile] = useState<OnboardingData>(defaultProfile);
  const [selectedApp, setSelectedApp] = useState<AppRule>(appRules[0]);
  const [shieldOpen, setShieldOpen] = useState(false);
  const [shieldStep, setShieldStep] = useState<"pause" | "choice" | "math" | "unlocked" | "saved">("pause");
  const [countdown, setCountdown] = useState(selectedApp.delay);
  const [coins, setCoins] = useState(84);
  const [focusActive, setFocusActive] = useState(false);
  const [focusSeconds, setFocusSeconds] = useState(15);
  const [focusMinutes, setFocusMinutes] = useState(48);
  const [streak, setStreak] = useState(9);
  const [crewLive, setCrewLive] = useState(false);
  const [mathAnswer, setMathAnswer] = useState("");
  const [quests, setQuests] = useState(initialQuests);
  const [toast, setToast] = useState("Lumi is ready. Pick a shielded app to test the anti-scroll flow.");
  const [surpriseReward, setSurpriseReward] = useState<{ title: string; coins: number } | null>(null);
  const [completedActions, setCompletedActions] = useState<string[]>([]);
  const [shopMessage, setShopMessage] = useState("Spend coins on rewards that still keep you in control.");
  const [bridgeCharge, setBridgeCharge] = useState(38);
  const [bridgeMessage, setBridgeMessage] = useState("Build the bridge from phone mode to real-life mode.");
  const [plan, setPlan] = useState<PersonalizationPlan | null>(null);
  const [planError, setPlanError] = useState<string | null>(null);
  const [location, setLocation] = useLocation();
  const rawPage = location === "/" ? "home" : location.replace("/", "");
  const currentPage = ["home", "earn", "plans", "bridge", "shield", "patterns", "swaps", "shop", "focus", "quests", "crew"].includes(rawPage) ? rawPage : "home";

  const adaptiveAppRules = useMemo<AppRule[]>(() => {
    if (!plan) return appRules;
    return appRules.map((rule) => {
      const shield = plan.shields.find(
        (s) => s.appName.toLowerCase() === rule.name.toLowerCase(),
      );
      if (!shield) return rule;
      return {
        ...rule,
        delay: shield.delaySeconds,
        limit: shield.sessionLimitMinutes,
        mode: shield.mode,
      };
    });
  }, [plan]);

  useEffect(() => {
    setSelectedApp((current) => {
      const updated = adaptiveAppRules.find((rule) => rule.id === current.id);
      return updated ?? current;
    });
  }, [adaptiveAppRules]);

  const recoveredHours = Math.max(0.5, profile.currentHours - profile.goalHours);
  const screenTimePercent = clamp((profile.currentHours / Math.max(1, profile.currentHours + recoveredHours)) * 100, 10, 92);
  const shieldProgress = shieldOpen ? ((selectedApp.delay - countdown) / selectedApp.delay) * 100 : 0;
  const focusProgress = focusActive ? ((15 - focusSeconds) / 15) * 100 : focusMinutes;
  const activeQuestCount = useMemo(() => quests.filter((quest) => !quest.claimed).length, [quests]);
  const savedMinutes = Math.round(recoveredHours * 60) + completedActions.length * 8;
  const lifeEquivalent = savedMinutes >= 90 ? "a full workout plus homework time" : savedMinutes >= 45 ? "a workout, walk, or focused study block" : "a walk, stretch, or quick reset";
  const riskNudge = plan?.nudge.windows[0]?.message
    ?? (profile.hardestTime === "Night"
      ? "Smart nudge: At night, Lumi will ask you to park your phone before the feed starts."
      : profile.hardestTime === "When bored"
        ? "Smart nudge: When boredom hits, Lumi will offer swaps before opening the feed."
        : `Smart nudge: Around ${profile.hardestTime.toLowerCase()}, Lumi will make the first open slower.`);
  const personalizedNudge = plan?.coachLine
    ?? (profile.feelings.includes("Tired") || profile.hardestTime === "Night"
      ? "Lumi will make night scrolling harder and bedtime rewards bigger."
      : profile.feelings.includes("Bored")
        ? "Lumi will suggest quick swaps when boredom scrolling starts."
        : "Lumi will keep your shields light and reward your focus wins.");

  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
  }, [theme]);

  const behaviorPayload = useMemo(
    () => ({
      completedOfflineActions: completedActions.length,
      shieldSkips: 0,
      shieldUnlocks: 0,
      focusCompletions: 0,
      coins,
      streak,
      minutesSavedToday: 0,
    }),
    [completedActions.length, coins, streak],
  );

  async function refreshPlan() {
    try {
      const next = await fetchPlan(profileToPayload(profile), behaviorPayload);
      setPlan(next);
      setPlanError(null);
    } catch (err) {
      setPlan(fallbackPlan(profileToPayload(profile)));
      setPlanError(err instanceof Error ? err.message : "Plan offline.");
    }
  }

  async function recordEvent(type: EventType, extra: { appName?: string; minutes?: number } = {}) {
    try {
      const result = await postEvent(type, profileToPayload(profile), behaviorPayload, extra);
      setPlan(result.plan);
      setPlanError(null);
      if (result.feedback) setToast(result.feedback);
    } catch (err) {
      setPlanError(err instanceof Error ? err.message : "Plan offline.");
    }
  }

  useEffect(() => {
    if (!onboarded) return;
    void refreshPlan();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onboarded, profile.name, profile.currentHours, profile.goalHours, profile.hardestTime, profile.topApps.join(","), profile.feelings.join(",")]);

  useEffect(() => {
    if (!shieldOpen || shieldStep !== "pause") return;
    setCountdown(selectedApp.delay);
    const id = window.setInterval(() => {
      setCountdown((current) => {
        if (current <= 1) {
          window.clearInterval(id);
          setShieldStep("choice");
          return 0;
        }
        return current - 1;
      });
    }, 1000);
    return () => window.clearInterval(id);
  }, [shieldOpen, shieldStep, selectedApp.delay]);

  useEffect(() => {
    if (!focusActive) return;
    const id = window.setInterval(() => {
      setFocusSeconds((current) => {
        if (current <= 1) {
          window.clearInterval(id);
          setFocusActive(false);
          setFocusMinutes((minutes) => Math.min(100, minutes + 18));
          const reward = plan?.rewardTuning.focusReward ?? 22;
          setCoins((currentCoins) => currentCoins + reward);
          setStreak((currentStreak) => currentStreak + 1);
          setToast(`Great job. You earned ${reward} coins and kept the feed locked.`);
          void recordEvent("focus_complete", { minutes: 25 });
          return 15;
        }
        return current - 1;
      });
    }, 1000);
    return () => window.clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusActive]);

  function openShield(app: AppRule) {
    setSelectedApp(app);
    setShieldStep("pause");
    setCountdown(app.delay);
    setMathAnswer("");
    setShieldOpen(true);
    setToast(`Lumi paused ${app.name}. Take a breath before the feed opens.`);
  }

  function skipApp() {
    setShieldStep("saved");
    const range = plan?.rewardTuning.skipBonusRange ?? [6, 21];
    const spread = Math.max(1, range[1] - range[0]);
    const coinsWon = range[0] + ((completedActions.length + selectedApp.opens) % spread);
    setSurpriseReward({ title: "Mystery skip bonus", coins: coinsWon });
    setCoins((current) => current + coinsWon);
    setFocusMinutes((minutes) => Math.min(100, minutes + 6));
    setToast(`Surprise reward. You skipped the impulse and earned ${coinsWon} coins.`);
    void recordEvent("shield_skip", { appName: selectedApp.name });
  }

  function buySession() {
    const cost = plan?.shields.find(
      (s) => s.appName.toLowerCase() === selectedApp.name.toLowerCase(),
    )?.coinCost ?? 10;
    if (coins < cost) {
      setToast(`Not enough coins yet. ${selectedApp.name} costs ${cost}. Finish a focus round first.`);
      return;
    }
    setCoins((current) => current - cost);
    setShieldStep("math");
    setToast(`Coins spent (${cost}). One tiny brain check before opening.`);
    void recordEvent("shield_unlock", { appName: selectedApp.name });
  }

  function submitMath() {
    if (mathAnswer.trim() === "13") {
      setShieldStep("unlocked");
      setToast(`${selectedApp.name} unlocked for ${selectedApp.limit} mindful minutes.`);
    } else {
      setToast("Try again. The point is to slow the habit down.");
    }
  }

  function startFocus() {
    setFocusSeconds(15);
    setFocusActive(true);
    setCrewLive(true);
    setToast("Focus sprint started. Demo mode finishes in 15 seconds.");
  }

  function completeOfflineAction(action: OfflineAction) {
    if (completedActions.includes(action.id)) {
      setToast(`${action.title} is already counted. Pick a new real-life action.`);
      return;
    }
    const range = plan?.rewardTuning.offlineActionRange ?? action.rewardRange;
    const rewardSpread = Math.max(1, range[1] - range[0]);
    const coinsWon = range[0] + ((completedActions.length * 7 + action.minutes) % (rewardSpread + 1));
    setCompletedActions((current) => [...current, action.id]);
    setCoins((current) => current + coinsWon);
    setFocusMinutes((minutes) => Math.min(100, minutes + action.minutes / 2));
    setSurpriseReward({ title: action.title, coins: coinsWon });
    setToast(`Real-life swap complete. Lumi gave you a mystery reward: ${coinsWon} coins.`);
    void recordEvent("offline_action", { minutes: action.minutes });
  }

  function buyReward(item: RewardItem) {
    const discount = plan?.rewardTuning.shopDiscountPercent ?? 0;
    const finalCost = Math.max(1, Math.round(item.cost * (1 - discount / 100)));
    if (coins < finalCost) {
      setShopMessage(`You need ${finalCost - coins} more coins for ${item.title}. Try a swap or focus sprint.`);
      return;
    }
    setCoins((current) => current - finalCost);
    setShopMessage(
      discount > 0
        ? `${item.title} unlocked at a ${discount}% streak discount.`
        : `${item.title} unlocked. Rewards are earned, not endless.`,
    );
    setToast(`Reward shop win: ${item.title} unlocked.`);
  }

  function claimQuestEvent() {
    void recordEvent("quest_claim");
  }

  function claimQuest(id: string) {
    setQuests((current) =>
      current.map((quest) => {
        if (quest.id !== id || quest.progress < quest.target || quest.claimed) return quest;
        setCoins((coinTotal) => coinTotal + quest.reward);
        setToast(`Quest claimed. Lumi added ${quest.reward} coins.`);
        claimQuestEvent();
        return { ...quest, claimed: true };
      }),
    );
  }

  function boostBridge(kind: "breath" | "shake" | "mission") {
    const boosts = { breath: 18, shake: 12, mission: 25 };
    const copy = {
      breath: "Breathing boost added. Your brain gets a pause before the feed.",
      shake: "Pattern break added. Move your body before opening the app.",
      mission: "Mini mission loaded. Real life gets the next tap.",
    };
    setBridgeCharge((current) => Math.min(100, current + boosts[kind]));
    const multiplier = plan?.rewardTuning.baseCoinMultiplier ?? 1;
    const baseCoins = kind === "mission" ? 12 : 6;
    setCoins((current) => current + Math.round(baseCoins * multiplier));
    setBridgeMessage(copy[kind]);
    setToast(`Bridge boost: ${copy[kind]}`);
    void recordEvent("bridge_boost");
  }

  function handleAuthed(authed: SafeAccount) {
    setAccount(authed);
    const saved = authed.profile;
    setProfile({
      name: saved.name || authed.name,
      age: saved.age || String(authed.age ?? ""),
      currentHours: saved.currentHours,
      goalHours: saved.goalHours,
      feelings: saved.feelings,
      hardestTime: saved.hardestTime,
      topApps: saved.topApps.length > 0 ? saved.topApps : ["Instagram"],
      appleConnected: saved.appleConnected,
      notificationsAllowed: saved.notificationsAllowed,
    });
    setCoins(saved.coins);
    setStreak(saved.streak);
    setCompletedActions(saved.completedActions);
    setOnboarded(saved.onboardingComplete);
  }

  async function handleLogout() {
    try {
      await apiLogout();
    } catch {
      // logout is local-state only; ignore network errors
    }
    setAccount(null);
    setOnboarded(false);
    setProfile(defaultProfile);
    setCoins(84);
    setStreak(9);
    setCompletedActions([]);
    setPlan(null);
    setPlanError(null);
    setSurpriseReward(null);
    setShieldOpen(false);
    setFocusActive(false);
    setQuests(initialQuests);
    setLocation("/");
  }

  function persistProfile(patch: Partial<SafeAccount["profile"]>) {
    if (!account) return;
    void patchProfile(account.id, patch).then((updated) => {
      setAccount(updated);
    }).catch(() => {
      // best-effort persistence; UI keeps working
    });
  }

  // Save important progress whenever it changes after login.
  useEffect(() => {
    if (!account) return;
    persistProfile({ coins, streak, completedActions });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [account?.id, coins, streak, completedActions.join(",")]);

  function finishOnboarding() {
    setOnboarded(true);
    if (account) {
      persistProfile({
        onboardingComplete: true,
        name: profile.name,
        age: profile.age,
        currentHours: profile.currentHours,
        goalHours: profile.goalHours,
        feelings: profile.feelings,
        hardestTime: profile.hardestTime,
        topApps: profile.topApps,
        appleConnected: profile.appleConnected,
        notificationsAllowed: profile.notificationsAllowed,
        coins,
        streak,
        completedActions,
      });
    }
  }

  if (!account) {
    return <AccountGate onAuthed={handleAuthed} />;
  }

  if (!onboarded) {
    return <Onboarding profile={profile} setProfile={setProfile} onFinish={finishOnboarding} theme={theme} setTheme={setTheme} />;
  }

  return (
    <main className="min-h-screen overflow-hidden bg-background text-foreground">
      <div className="fixed inset-0 -z-10 bg-[radial-gradient(circle_at_top_left,hsl(var(--latch-lime)/0.22),transparent_36%),radial-gradient(circle_at_80%_18%,hsl(var(--latch-yellow)/0.30),transparent_28%),radial-gradient(circle_at_70%_90%,hsl(var(--latch-purple)/0.18),transparent_30%)]" />

      <AppHeader theme={theme} setTheme={setTheme} account={account} onLogout={handleLogout} />

      {currentPage === "home" && <section className="mx-auto grid max-w-7xl gap-6 px-4 py-6 sm:px-6 lg:grid-cols-[1.05fr_0.95fr] lg:px-8 lg:py-10">
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.45 }} className="rounded-[2rem] bg-card p-5 shadow-sm sm:p-6">
          <div className="flex flex-wrap items-center gap-3">
            <span className="rounded-full bg-primary px-3 py-1 text-xs font-black uppercase tracking-[0.18em] text-primary-foreground" data-testid="text-product-tagline">
              your phone coach
            </span>
            <span className="text-sm font-medium text-muted-foreground">Made for {profile.name || "you"}</span>
          </div>
          <div className="mt-7 grid gap-5 lg:grid-cols-[1fr_auto]">
            <div className="max-w-2xl">
              <h1 className="font-display text-[2rem] font-extrabold leading-none tracking-tight sm:text-[2.6rem]" data-testid="text-hero-title">
                Make your phone easier to control.
              </h1>
              <p className="mt-4 text-base leading-7 text-muted-foreground" data-testid="text-hero-description">
                Lumi learned that your goal is {formatHours(profile.goalHours)} a day. Latch now adds friendly friction, rewards, and reminders around your hardest moments.
              </p>
            </div>
            <Mascot mood="happy" compact message={personalizedNudge} />
          </div>
          <div className="mt-7 flex flex-wrap items-center gap-3">
            <Button type="button" onClick={startFocus} data-testid="button-start-focus-hero">
              Start focus
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Button>
            <Button type="button" variant="outline" onClick={() => setLocation("/bridge")} data-testid="button-open-bridge-hero">
              Cross the bridge
            </Button>
            <Button type="button" variant="secondary" onClick={() => setOnboarded(false)} data-testid="button-edit-onboarding">
              Edit answers
            </Button>
          </div>
          <div className="mt-8 grid gap-3 sm:grid-cols-3">
            <div className="rounded-2xl bg-secondary p-4" data-testid="card-loop-friction">
              <Brain className="h-5 w-5 text-primary" aria-hidden="true" />
              <p className="mt-3 text-sm font-bold">Pause first</p>
              <p className="mt-1 text-sm text-muted-foreground">A short stop breaks autopilot.</p>
            </div>
            <div className="rounded-2xl bg-secondary p-4" data-testid="card-loop-reward">
              <Gift className="h-5 w-5 text-primary" aria-hidden="true" />
              <p className="mt-3 text-sm font-bold">Mystery rewards</p>
              <p className="mt-1 text-sm text-muted-foreground">Skipping can unlock surprise coins.</p>
            </div>
            <div className="rounded-2xl bg-secondary p-4" data-testid="card-loop-social">
              <Users className="h-5 w-5 text-primary" aria-hidden="true" />
              <p className="mt-3 text-sm font-bold">Bring friends</p>
              <p className="mt-1 text-sm text-muted-foreground">Compete on time saved.</p>
            </div>
          </div>
        </motion.div>

        <aside className="grid gap-4">
          <div className="grid grid-cols-2 gap-4">
            <StatCard label="Back today" value={formatHours(recoveredHours)} detail="Time you can win back" icon={AlarmClock} />
            <StatCard label="Streak" value={`${streak} days`} detail="Goal days in a row" icon={Flame} accent="streak" />
            <StatCard label="Credits" value={String(account.profile.latchCredits)} detail="Earned by real life" icon={Sparkles} accent="reward" />
            <StatCard label="Brain energy" value={`${account.profile.brainEnergy}%`} detail="Lumi's health meter" icon={Brain} accent="energy" />
          </div>
          <div className="rounded-[2rem] bg-card p-5 shadow-sm" data-testid="panel-screen-time">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-bold">Today’s screen budget</p>
                <p className="text-sm text-muted-foreground">{formatHours(profile.currentHours)} now · goal {formatHours(profile.goalHours)}</p>
              </div>
              <span className="font-mono text-sm font-bold tabular-nums">{screenTimePercent.toFixed(0)}%</span>
            </div>
            <Progress className="mt-4 h-3" value={screenTimePercent} data-testid="progress-screen-time" />
            <div className="mt-4 rounded-2xl bg-secondary p-3 text-sm text-secondary-foreground" data-testid="text-toast-status">
              <Mascot compact mood="coach" message={toast} />
            </div>
            {surpriseReward && (
              <motion.div
                initial={{ scale: 0.96, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="mt-3 rounded-2xl border border-primary/30 bg-primary p-3 text-primary-foreground"
                data-testid="card-surprise-reward"
              >
                <div className="flex items-center gap-2">
                  <Star className="h-4 w-4" aria-hidden="true" />
                  <p className="text-sm font-black">{surpriseReward.title}: +{surpriseReward.coins} coins</p>
                </div>
              </motion.div>
            )}
          </div>
        </aside>
      </section>}

      {currentPage === "home" && <section className="mx-auto max-w-7xl px-4 pb-6 sm:px-6 lg:px-8">
        <article className="rounded-[2rem] bg-card p-5 shadow-sm" data-testid="section-personal-plan">
          <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.18em] text-muted-foreground">your setup</p>
              <h2 className="mt-2 font-display text-xl font-extrabold tracking-tight">
                {plan ? plan.personaLabel : "Personal plan from your login"}
              </h2>
              <p className="mt-3 text-sm leading-6 text-muted-foreground" data-testid="text-persona-copy">
                {plan ? plan.personaCopy : (
                  <>
                    You said scrolling is hardest around <strong>{profile.hardestTime}</strong>. Your top app shield starts with <strong>{profile.topApps[0] || "Instagram"}</strong>.
                  </>
                )}
              </p>
              {plan && (
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <div className="rounded-2xl bg-background p-3" data-testid="card-risk-tier">
                    <p className="text-xs font-bold uppercase tracking-[0.16em] text-muted-foreground">risk tier</p>
                    <p className="mt-1 font-display text-lg font-black capitalize">{plan.riskTier}</p>
                    <p className="text-xs text-muted-foreground">score {plan.riskScore}/100</p>
                  </div>
                  <div className="rounded-2xl bg-background p-3" data-testid="card-weekly-forecast">
                    <p className="text-xs font-bold uppercase tracking-[0.16em] text-muted-foreground">weekly forecast</p>
                    <p className="mt-1 font-display text-lg font-black tabular-nums">
                      {plan.weeklyForecast.reclaimedHoursPerWeek}h back / week
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {plan.weeklyForecast.reclaimedHoursPerYear}h reclaimed / year
                    </p>
                  </div>
                </div>
              )}
              <div className="mt-5 flex flex-wrap gap-2">
                {profile.feelings.map((feeling) => (
                  <span key={feeling} className="rounded-full bg-secondary px-3 py-1 text-xs font-bold text-secondary-foreground">
                    feels {feeling.toLowerCase()}
                  </span>
                ))}
              </div>
              {plan && plan.recommendations[0] && (
                <div className="mt-5 rounded-2xl bg-secondary p-4 text-sm leading-6 text-secondary-foreground" data-testid="card-recommendation-top">
                  <p className="font-bold">{plan.recommendations[0].title}</p>
                  <p className="mt-1 text-sm">{plan.recommendations[0].body}</p>
                </div>
              )}
              {planError && (
                <p className="mt-3 text-xs text-muted-foreground" data-testid="text-plan-fallback">
                  Latch is using offline defaults. {planError}
                </p>
              )}
            </div>
            <TinyBarChart currentHours={profile.currentHours} goalHours={profile.goalHours} />
          </div>
          {plan && plan.recommendations.length > 1 && (
            <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3" data-testid="grid-recommendations">
              {plan.recommendations.slice(1).map((rec) => (
                <div key={rec.id} className="rounded-2xl bg-background p-4">
                  <p className="text-sm font-bold">{rec.title}</p>
                  <p className="mt-1 text-sm leading-6 text-muted-foreground">{rec.body}</p>
                </div>
              ))}
            </div>
          )}
        </article>
      </section>}

      {currentPage === "home" && (
        <section className="mx-auto max-w-7xl px-4 pb-6 sm:px-6 lg:px-8">
          <div className="grid gap-6 lg:grid-cols-[1fr_1fr]" data-testid="section-home-engagement">
            <DailyGoalCard
              account={account}
              onAccount={(next) => {
                setAccount(next);
                setCoins(next.profile.coins);
                setStreak(next.profile.streak);
              }}
              onToast={setToast}
              estimatedMinutesUsed={Math.round(profile.currentHours * 60)}
            />
            <DailyReportCard account={account} />
          </div>
          <div className="mt-6">
            <DoomscrollNudges
              account={account}
              onAccount={(next) => setAccount(next)}
              onToast={setToast}
            />
          </div>
        </section>
      )}

      {currentPage === "home" && <section className="mx-auto max-w-7xl px-4 pb-10 sm:px-6 lg:px-8">
        <div className="grid gap-3 md:grid-cols-3" data-testid="section-page-launcher">
          {[
            ["Earn", "/earn", "Do real things, earn Latch Credits, unlock app time."],
            ["Plans", "/plans", "Scheduled focus plans with gentle, friction, or deep-lock depth."],
            ["Bridge", "/bridge", "Fun transition from phone mode to real-life mode."],
            ["Shield", "/shield", "Slow down apps before they hook you."],
            ["Patterns", "/patterns", "See repeated app habits and schedule next-month blocks."],
            ["Swaps", "/swaps", "Pick real-life actions for mystery rewards."],
            ["Shop", "/shop", "Spend coins on earned rewards."],
            ["Focus", "/focus", "Run phone-free sprints."],
            ["Crew", "/crew", "Compete on time saved with friends."],
          ].map(([label, path, copy]) => (
            <button key={path} type="button" onClick={() => setLocation(path)} className="rounded-[1.5rem] bg-card p-4 text-left shadow-sm transition hover-elevate active-elevate-2" data-testid={`button-launch-${label.toLowerCase()}`}>
              <p className="font-display text-xl font-black">{label}</p>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">{copy}</p>
            </button>
          ))}
        </div>
      </section>}

      {currentPage === "bridge" && <section id="bridge" className="mx-auto grid max-w-7xl gap-6 px-4 py-6 sm:px-6 lg:grid-cols-[0.9fr_1.1fr] lg:px-8">
        <article className="rounded-[2rem] bg-card p-5 shadow-sm" data-testid="section-bridge">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.18em] text-muted-foreground">bridge mode</p>
              <h1 className="mt-2 font-display text-[2.4rem] font-black leading-none tracking-tight">Cross out of scroll mode.</h1>
              <p className="mt-4 text-sm leading-6 text-muted-foreground">The Bridge is a playful transition screen. Use it when you feel the urge to open a feed.</p>
            </div>
            <Mascot compact mood="celebrate" message={bridgeMessage} />
          </div>
          <div className="mt-7 rounded-[1.5rem] bg-background p-5">
            <div className="flex items-center justify-between">
              <p className="font-bold">Bridge charge</p>
              <p className="font-mono font-black tabular-nums" data-testid="text-bridge-charge">{bridgeCharge}%</p>
            </div>
            <Progress className="mt-4 h-4" value={bridgeCharge} data-testid="progress-bridge-charge" />
            <div className="mt-5 grid gap-3 sm:grid-cols-3">
              {Array.from({ length: 7 }).map((_, index) => (
                <div key={index} className={`h-12 rounded-2xl border ${index < Math.ceil(bridgeCharge / 15) ? "border-primary bg-primary" : "border-border bg-secondary"}`} data-testid={`tile-bridge-${index}`} />
              ))}
            </div>
          </div>
        </article>
        <article className="rounded-[2rem] bg-card p-5 shadow-sm" data-testid="section-bridge-games">
          <p className="text-xs font-black uppercase tracking-[0.18em] text-muted-foreground">fun tools</p>
          <h2 className="mt-2 font-display text-xl font-extrabold tracking-tight">Tap a bridge boost</h2>
          <div className="mt-5 grid gap-3">
            <button type="button" onClick={() => boostBridge("breath")} className="rounded-2xl bg-background p-4 text-left transition hover-elevate active-elevate-2" data-testid="button-bridge-breath">
              <p className="font-bold">10-second breath gate</p>
              <p className="mt-1 text-sm text-muted-foreground">Pause your body before the app loads. +6 coins.</p>
            </button>
            <button type="button" onClick={() => boostBridge("shake")} className="rounded-2xl bg-background p-4 text-left transition hover-elevate active-elevate-2" data-testid="button-bridge-shake">
              <p className="font-bold">Pattern breaker</p>
              <p className="mt-1 text-sm text-muted-foreground">Stand, stretch, or move for 20 seconds. +6 coins.</p>
            </button>
            <button type="button" onClick={() => boostBridge("mission")} className="rounded-2xl bg-background p-4 text-left transition hover-elevate active-elevate-2" data-testid="button-bridge-mission">
              <p className="font-bold">Mini mission card</p>
              <p className="mt-1 text-sm text-muted-foreground">Lumi gives a real-life challenge before the feed. +12 coins.</p>
            </button>
          </div>
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <Button type="button" onClick={() => setLocation("/swaps")} data-testid="button-bridge-to-swaps">Go to swaps</Button>
            <Button type="button" variant="outline" onClick={() => setLocation("/shield")} data-testid="button-bridge-to-shield">Test shield</Button>
          </div>
        </article>
      </section>}

      {currentPage === "swaps" && <section id="swaps" className="mx-auto grid max-w-7xl gap-6 px-4 py-6 sm:px-6 lg:grid-cols-[0.82fr_1.18fr] lg:px-8">
        <article className="rounded-[2rem] bg-card p-5 shadow-sm" data-testid="section-fomo">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.18em] text-muted-foreground">fomo flipped</p>
              <h2 className="mt-2 font-display text-xl font-extrabold tracking-tight">You could get this time back</h2>
            </div>
            <TimerReset className="h-5 w-5 text-primary" aria-hidden="true" />
          </div>
          <div className="mt-6 rounded-[1.5rem] bg-background p-5">
            <p className="font-display text-[2.4rem] font-black leading-none tabular-nums" data-testid="text-saved-minutes">{savedMinutes}m</p>
            <p className="mt-3 text-sm leading-6 text-muted-foreground">
              That is enough for <strong>{lifeEquivalent}</strong>. Social apps create fear of missing out. Latch shows what you miss when you keep scrolling.
            </p>
          </div>
          <div className="mt-4 rounded-[1.5rem] bg-secondary p-4" data-testid="text-smart-nudge">
            <Mascot compact mood="coach" message={riskNudge} />
          </div>
        </article>

        <article className="rounded-[2rem] bg-card p-5 shadow-sm" data-testid="section-offline-feed">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.18em] text-muted-foreground">offline feed</p>
              <h2 className="mt-2 font-display text-xl font-extrabold tracking-tight">Scroll this instead</h2>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                This is the anti-infinite feed: small real-life actions with surprise rewards.
              </p>
            </div>
            <Sparkles className="h-5 w-5 text-primary" aria-hidden="true" />
          </div>
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            {(() => {
              const personaPriorityById: Record<string, string[]> = {
                night_scroller: ["read", "friend"],
                boredom_scroller: ["walk", "workout"],
                stress_scroller: ["walk", "friend"],
                social_validation_seeker: ["friend", "read"],
                balanced_user: [],
              };
              const priority = plan ? personaPriorityById[plan.persona] ?? [] : [];
              const sorted = [...offlineActions].sort((a, b) => {
                const aIdx = priority.indexOf(a.id);
                const bIdx = priority.indexOf(b.id);
                const aRank = aIdx === -1 ? 99 : aIdx;
                const bRank = bIdx === -1 ? 99 : bIdx;
                return aRank - bRank;
              });
              const range = plan?.rewardTuning.offlineActionRange;
              return sorted.map((action) => {
                const Icon = action.icon;
                const done = completedActions.includes(action.id);
                const lowHigh = range ? `${range[0]}-${range[1]}` : `${action.rewardRange[0]}-${action.rewardRange[1]}`;
                const recommended = priority.includes(action.id);
                return (
                  <button
                    key={action.id}
                    type="button"
                    onClick={() => completeOfflineAction(action)}
                    className={`rounded-2xl p-4 text-left transition hover-elevate active-elevate-2 ${done ? "bg-primary text-primary-foreground" : "bg-background"}`}
                    data-testid={`button-offline-action-${action.id}`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <Icon className="h-5 w-5 text-current" aria-hidden="true" />
                      <span className="rounded-full bg-secondary px-2.5 py-1 text-xs font-black text-secondary-foreground">
                        {done ? "done" : `${lowHigh} coins`}
                      </span>
                    </div>
                    <p className="mt-4 font-bold">
                      {action.title}
                      {recommended && !done && (
                        <span className="ml-2 rounded-full bg-secondary px-2 py-0.5 text-[10px] font-black uppercase tracking-[0.16em] text-secondary-foreground">
                          for you
                        </span>
                      )}
                    </p>
                    <p className={`mt-1 text-sm ${done ? "text-primary-foreground/80" : "text-muted-foreground"}`}>
                      {action.minutes} min · replaces {action.swapFor}
                    </p>
                  </button>
                );
              });
            })()}
          </div>
        </article>
      </section>}

      {currentPage === "shop" && <section id="shop" className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <article className="rounded-[2rem] bg-card p-5 shadow-sm" data-testid="section-reward-shop">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.18em] text-muted-foreground">reward shop</p>
              <h2 className="mt-2 font-display text-xl font-extrabold tracking-tight">Make rewards earned</h2>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">{shopMessage}</p>
            </div>
            <div className="rounded-2xl bg-primary px-4 py-3 text-primary-foreground">
              <p className="text-xs font-black uppercase tracking-[0.16em]">coins</p>
              <p className="font-display text-xl font-black tabular-nums" data-testid="text-shop-coins">{coins}</p>
            </div>
          </div>
          <div className="mt-5 grid gap-3 md:grid-cols-3">
            {rewardShop.map((item) => (
              <div key={item.id} className="rounded-2xl bg-background p-4" data-testid={`card-reward-${item.id}`}>
                <ShoppingBag className="h-5 w-5 text-primary" aria-hidden="true" />
                <p className="mt-3 font-bold">{item.title}</p>
                <p className="mt-1 min-h-12 text-sm leading-6 text-muted-foreground">{item.description}</p>
                <Button type="button" className="mt-4 w-full" variant={coins >= item.cost ? "default" : "outline"} onClick={() => buyReward(item)} data-testid={`button-buy-reward-${item.id}`}>
                  Buy for {item.cost}
                </Button>
              </div>
            ))}
          </div>
        </article>
      </section>}

      {currentPage === "shield" && <section id="shield" className="mx-auto grid max-w-7xl gap-6 px-4 py-6 sm:px-6 lg:grid-cols-[0.9fr_1.1fr] lg:px-8">
        <article className="rounded-[2rem] bg-card p-5 shadow-sm" data-testid="section-shield">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.18em] text-muted-foreground">shield rules</p>
              <h2 className="mt-2 font-display text-xl font-extrabold tracking-tight">Friction before feeds</h2>
            </div>
            <Lock className="h-5 w-5 text-primary" aria-hidden="true" />
          </div>
          <div className="mt-5 space-y-3">
            {adaptiveAppRules.map((app) => (
              <button
                type="button"
                key={app.id}
                onClick={() => setSelectedApp(app)}
                className={`w-full rounded-2xl p-4 text-left transition ${
                  selectedApp.id === app.id ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground hover-elevate active-elevate-2"
                }`}
                data-testid={`button-select-app-${app.id}`}
              >
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="font-bold">{app.name}</p>
                    <p className={`text-sm ${selectedApp.id === app.id ? "text-primary-foreground/80" : "text-muted-foreground"}`}>
                      {app.opens} opens · {app.minutes} min today · {app.category}
                    </p>
                  </div>
                  <ModePill mode={app.mode} />
                </div>
              </button>
            ))}
          </div>
        </article>

        <article className="rounded-[2rem] bg-card p-5 shadow-sm" data-testid="panel-selected-app">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.18em] text-muted-foreground">selected shield</p>
              <h2 className="mt-2 font-display text-xl font-extrabold tracking-tight">{selectedApp.name}</h2>
              <p className="mt-2 max-w-xl text-sm text-muted-foreground">
                {selectedApp.delay} second pause, {selectedApp.limit} minute limit, and a {plan?.shields.find((s) => s.appName.toLowerCase() === selectedApp.name.toLowerCase())?.coinCost ?? 10} coin gate before opening.
              </p>
              {plan && (
                <p className="mt-2 max-w-xl text-xs text-muted-foreground" data-testid="text-shield-reason">
                  {plan.shields.find((s) => s.appName.toLowerCase() === selectedApp.name.toLowerCase())?.reason ?? plan.coachLine}
                </p>
              )}
            </div>
            <Button type="button" onClick={() => openShield(selectedApp)} data-testid="button-open-selected-shield">
              Open shield
            </Button>
          </div>

          <AnimatePresence mode="wait">
            {shieldOpen ? (
              <motion.div key={shieldStep} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.2 }} className="mt-6 rounded-[1.5rem] surface-night p-5 shadow-[0_8px_24px_-12px_rgba(27,24,40,0.55)]" data-testid="panel-shield-flow">
                {shieldStep === "pause" && (
                  <div>
                    <div className="flex items-center justify-between gap-3">
                      <Mascot compact mood="coach" message="Pause. Ask: do I really want this, or is it just habit?" />
                      <span className="font-mono text-xl font-black tabular-nums text-lime-reward" data-testid="text-shield-countdown">{countdown}s</span>
                    </div>
                    <Progress className="mt-5 h-3" value={shieldProgress} data-testid="progress-shield-countdown" />
                  </div>
                )}

                {shieldStep === "choice" && (
                  <div>
                    <p className="text-sm font-bold text-cream">Still want {selectedApp.name}?</p>
                    <p className="mt-2 text-sm text-cream-muted">Choose on purpose. No autopilot.</p>
                    <div className="mt-5 grid gap-3 sm:grid-cols-2">
                      <Button type="button" onClick={skipApp} data-testid="button-skip-app">Stay off, earn coins</Button>
                      <Button type="button" variant="outline" onClick={buySession} data-testid="button-buy-session">Spend 10 coins</Button>
                    </div>
                  </div>
                )}

                {shieldStep === "math" && (
                  <div>
                    <p className="text-sm font-bold text-cream">Tiny brain check</p>
                    <label htmlFor="math-answer" className="mt-2 block text-sm text-cream-muted">What is 7 + 6?</label>
                    <div className="mt-4 flex flex-wrap gap-3">
                      <input id="math-answer" value={mathAnswer} onChange={(event) => setMathAnswer(event.target.value)} className="min-h-10 rounded-xl border border-input bg-background px-3 text-sm text-foreground outline-none focus-visible:ring-1 focus-visible:ring-ring" data-testid="input-math-answer" />
                      <Button type="button" onClick={submitMath} data-testid="button-submit-math">Unlock</Button>
                    </div>
                  </div>
                )}

                {shieldStep === "unlocked" && (
                  <div className="flex items-start gap-3">
                    <BadgeCheck className="mt-0.5 h-5 w-5 text-lime-reward" aria-hidden="true" />
                    <div>
                      <p className="text-sm font-bold text-cream" data-testid="text-unlocked-session">{selectedApp.name} unlocked for {selectedApp.limit} minutes.</p>
                      <p className="mt-1 text-sm text-cream-muted">Lumi will close it when time is up.</p>
                    </div>
                  </div>
                )}

                {shieldStep === "saved" && (
                  <Mascot compact mood="celebrate" message="You skipped the feed and banked the reward. That is a real win." />
                )}
              </motion.div>
            ) : (
              <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-6 rounded-[1.5rem] bg-background p-5" data-testid="panel-shield-empty">
                <Mascot compact mood="coach" message="Pick an app, then test the shield. I’ll slow the scroll before it starts." />
              </motion.div>
            )}
          </AnimatePresence>
        </article>
      </section>}

      {currentPage === "patterns" && <PatternsPage accountId={account.id} />}

      {currentPage === "earn" && (
        <EarnUnlockPage
          account={account}
          onAccount={(next) => {
            setAccount(next);
            setCoins(next.profile.coins);
            setStreak(next.profile.streak);
            setCompletedActions(next.profile.completedActions);
          }}
          onToast={(message) => setToast(message)}
        />
      )}

      {currentPage === "plans" && (
        <FocusPlansPage account={account} onToast={(message) => setToast(message)} />
      )}

      {currentPage === "focus" && <section id="focus" className="mx-auto grid max-w-7xl gap-6 px-4 py-6 sm:px-6 lg:grid-cols-[1.05fr_0.95fr] lg:px-8">
        <article className="rounded-[2rem] bg-card p-5 shadow-sm" data-testid="section-focus">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.18em] text-muted-foreground">focus</p>
              <h2 className="mt-2 font-display text-xl font-extrabold tracking-tight">Earn your scroll time</h2>
              <p className="mt-2 max-w-xl text-sm text-muted-foreground">Finish a phone-free block to refill coins.</p>
            </div>
            <Button type="button" onClick={startFocus} disabled={focusActive} data-testid="button-start-focus-panel">{focusActive ? "Running" : "Start 25 min"}</Button>
          </div>
          <div className={`mt-6 rounded-[1.5rem] p-5 ${focusActive ? "surface-purple shadow-[0_8px_24px_-12px_rgba(122,77,255,0.55)]" : "bg-background"}`}>
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className={`text-sm font-bold ${focusActive ? "text-cream" : ""}`}>Study sprint</p>
                <p className={`text-sm ${focusActive ? "text-cream-muted" : "text-muted-foreground"}`}>Demo completes in 15 seconds.</p>
              </div>
              <span className={`font-mono text-xl font-black tabular-nums ${focusActive ? "text-lime-reward" : ""}`} data-testid="text-focus-timer">{focusActive ? `00:${String(focusSeconds).padStart(2, "0")}` : "25:00"}</span>
            </div>
            <Progress className="mt-5 h-3" value={focusProgress} data-testid="progress-focus-session" />
            <div className="mt-5 grid gap-3 sm:grid-cols-3">
              <div className={`rounded-2xl p-3 ${focusActive ? "surface-lime" : "bg-secondary"}`}><p className={`text-xs font-bold uppercase tracking-[0.16em] ${focusActive ? "text-[hsl(var(--latch-night))]/70" : "text-muted-foreground"}`}>reward</p><p className="mt-1 font-mono text-lg font-black">+22</p></div>
              <div className={`rounded-2xl p-3 ${focusActive ? "bg-[hsl(var(--latch-night))] text-cream" : "bg-secondary"}`}><p className={`text-xs font-bold uppercase tracking-[0.16em] ${focusActive ? "text-cream-muted" : "text-muted-foreground"}`}>blocked</p><p className="mt-1 font-mono text-lg font-black">4 apps</p></div>
              <div className={`rounded-2xl p-3 ${focusActive ? "surface-yellow" : "bg-secondary"}`}><p className={`text-xs font-bold uppercase tracking-[0.16em] ${focusActive ? "text-[hsl(var(--latch-night))]/70" : "text-muted-foreground"}`}>crew</p><p className="mt-1 font-mono text-lg font-black">{crewLive ? "live" : "ready"}</p></div>
            </div>
          </div>
        </article>

        <article className="rounded-[2rem] bg-card p-5 shadow-sm" data-testid="section-weekly">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.18em] text-muted-foreground">progress</p>
              <h2 className="mt-2 font-display text-xl font-extrabold tracking-tight">Offline XP trend</h2>
            </div>
            <Target className="h-5 w-5 text-primary" aria-hidden="true" />
          </div>
          <div className="mt-6 flex h-52 items-end gap-2 rounded-[1.5rem] bg-background p-4" data-testid="chart-weekly-progress">
            {weeklyBars.map((height, index) => (
              <div key={height + index} className="flex flex-1 flex-col items-center gap-2">
                <div className="w-full rounded-t-xl bg-primary" style={{ height: `${height}%` }} data-testid={`bar-weekly-${index}`} />
                <span className="text-xs font-bold text-muted-foreground">{["M", "T", "W", "T", "F", "S", "S"][index]}</span>
              </div>
            ))}
          </div>
        </article>
      </section>}

      {currentPage === "quests" && <section id="quests" className="mx-auto grid max-w-7xl gap-6 px-4 py-6 sm:px-6 lg:grid-cols-[0.95fr_1.05fr] lg:px-8">
        <article className="rounded-[2rem] bg-card p-5 shadow-sm" data-testid="section-quests">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.18em] text-muted-foreground">quests</p>
              <h2 className="mt-2 font-display text-xl font-extrabold tracking-tight">{activeQuestCount} active challenges</h2>
            </div>
            <Trophy className="h-5 w-5 text-primary" aria-hidden="true" />
          </div>
          <div className="mt-5 space-y-4">
            {quests.map((quest) => {
              const percent = Math.min(100, (quest.progress / quest.target) * 100);
              const complete = quest.progress >= quest.target;
              return (
                <article key={quest.id} className="rounded-2xl bg-background p-4" data-testid={`card-quest-${quest.id}`}>
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div><p className="font-bold">{quest.title}</p><p className="mt-1 text-sm text-muted-foreground">{quest.description}</p></div>
                    <span className="rounded-full bg-secondary px-2.5 py-1 text-xs font-bold text-secondary-foreground">+{quest.reward}</span>
                  </div>
                  <Progress className="mt-4 h-2.5" value={percent} data-testid={`progress-quest-${quest.id}`} />
                  <div className="mt-4 flex items-center justify-between gap-3">
                    <span className="text-sm font-medium text-muted-foreground">{quest.progress}/{quest.target}</span>
                    <Button type="button" size="sm" variant={quest.claimed ? "secondary" : complete ? "default" : "outline"} disabled={!complete || quest.claimed} onClick={() => claimQuest(quest.id)} data-testid={`button-claim-quest-${quest.id}`}>
                      {quest.claimed ? "Claimed" : complete ? "Claim" : "In progress"}
                    </Button>
                  </div>
                </article>
              );
            })}
          </div>
        </article>

        <article className="rounded-[2rem] bg-card p-5 shadow-sm" data-testid="section-psychology">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.18em] text-muted-foreground">simple science</p>
              <h2 className="mt-2 font-display text-xl font-extrabold tracking-tight">Tricks, flipped around</h2>
            </div>
            <Sparkles className="h-5 w-5 text-primary" aria-hidden="true" />
          </div>
          <div className="mt-6 grid gap-3">
            {[
              ["App trick", "Endless feeds keep giving you another chance for something good."],
              ["Latch flip", "Rewards come when you stop, focus, or choose on purpose."],
              ["App trick", "Notifications pull you back at random times."],
              ["Latch flip", "Lumi sends reminders only when they help your goal."],
              ["App trick", "Streaks make you return every day."],
              ["Latch flip", "Your streak grows when you protect real-life time."],
            ].map(([title, description], index) => (
              <div key={title + index} className="flex gap-3 rounded-2xl bg-background p-4" data-testid={`row-psychology-${index}`}>
                <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-black text-primary-foreground">{index + 1}</div>
                <div><p className="font-bold">{title}</p><p className="mt-1 text-sm text-muted-foreground">{description}</p></div>
              </div>
            ))}
          </div>
        </article>
      </section>}

      {currentPage === "crew" && (
        <section className="mx-auto max-w-7xl px-4 pt-6 sm:px-6 lg:px-8">
          <AccountabilityLeaderboard account={account} onToast={setToast} />
        </section>
      )}

      {currentPage === "crew" && <section id="crew" className="mx-auto grid max-w-7xl gap-6 px-4 py-6 sm:px-6 lg:grid-cols-[1.05fr_0.95fr] lg:px-8">
        <article className="rounded-[2rem] bg-card p-5 shadow-sm" data-testid="section-crew">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.18em] text-muted-foreground">crew</p>
              <h2 className="mt-2 font-display text-xl font-extrabold tracking-tight">Make presence competitive</h2>
              <p className="mt-2 max-w-xl text-sm text-muted-foreground">Friends win when everyone stays off their phone.</p>
            </div>
            <Button type="button" variant={crewLive ? "secondary" : "default"} onClick={() => setCrewLive((current) => !current)} data-testid="button-toggle-crew">{crewLive ? "Crew live" : "Start crew"}</Button>
          </div>
          <div className="mt-6 space-y-3">
            {crew.map((person, index) => (
              <div key={person.name} className={`flex items-center justify-between gap-4 rounded-2xl p-4 ${person.current ? "bg-primary text-primary-foreground" : "bg-background"}`} data-testid={`row-crew-${person.name.toLowerCase()}`}>
                <div className="flex items-center gap-3">
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-secondary text-sm font-black text-secondary-foreground">{index + 1}</span>
                  <div><p className="font-bold">{person.name}</p><p className={`text-sm ${person.current ? "text-primary-foreground/80" : "text-muted-foreground"}`}>saved today</p></div>
                </div>
                <div className="text-right"><p className="font-mono text-lg font-black tabular-nums">{person.minutes}m</p><p className={`text-sm ${person.current ? "text-primary-foreground/80" : "text-muted-foreground"}`}>{person.delta} vs avg</p></div>
              </div>
            ))}
          </div>
        </article>

        <article className="rounded-[2rem] bg-card p-5 shadow-sm" data-testid="section-roadmap">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.18em] text-muted-foreground">mobile version</p>
              <h2 className="mt-2 font-display text-xl font-extrabold tracking-tight">What comes next</h2>
            </div>
            <ChevronRight className="h-5 w-5 text-primary" aria-hidden="true" />
          </div>
          <div className="mt-6 space-y-3">
            {[
              "Real Apple Screen Time connection",
              "Real phone notifications",
              "Friend rooms and weekly leagues",
              "Harder shields when relapse patterns show up",
              "Parent or coach view without spying",
            ].map((item) => (
              <div key={item} className="flex gap-3 rounded-2xl bg-background p-4" data-testid={`row-roadmap-${item.slice(0, 8).toLowerCase().replaceAll(" ", "-")}`}>
                <Check className="mt-0.5 h-5 w-5 shrink-0 text-primary" aria-hidden="true" />
                <p className="text-sm text-muted-foreground">{item}</p>
              </div>
            ))}
          </div>
        </article>
      </section>}
    </main>
  );
}

function AppRouter() {
  return <Home />;
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router hook={useHashLocation}>
          <AppRouter />
        </Router>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
