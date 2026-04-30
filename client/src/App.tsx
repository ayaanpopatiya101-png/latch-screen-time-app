import { useEffect, useMemo, useState } from "react";
import { Switch, Route, Router } from "wouter";
import { useHashLocation } from "wouter/use-hash-location";
import { QueryClientProvider } from "@tanstack/react-query";
import { AnimatePresence, motion } from "framer-motion";
import {
  AlarmClock,
  ArrowRight,
  BadgeCheck,
  Brain,
  Check,
  ChevronRight,
  Flame,
  Gift,
  Lock,
  Moon,
  Shield,
  Sparkles,
  Sprout,
  Sun,
  Target,
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

type Mode = "soft" | "focus" | "hard";

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

const appRules: AppRule[] = [
  { id: "tiktok", name: "TikTok", category: "short video", opens: 18, minutes: 74, delay: 8, limit: 7, mode: "focus" },
  { id: "instagram", name: "Instagram", category: "social", opens: 23, minutes: 62, delay: 5, limit: 6, mode: "soft" },
  { id: "youtube", name: "YouTube Shorts", category: "video", opens: 11, minutes: 46, delay: 10, limit: 8, mode: "focus" },
  { id: "snap", name: "Snapchat", category: "messages", opens: 14, minutes: 28, delay: 4, limit: 4, mode: "soft" },
];

const initialQuests: Quest[] = [
  {
    id: "morning",
    title: "No-scroll first hour",
    description: "Keep socials locked until your day has momentum.",
    progress: 60,
    target: 60,
    reward: 18,
    claimed: false,
  },
  {
    id: "study",
    title: "Deep-work double",
    description: "Finish two protected focus blocks before opening entertainment.",
    progress: 1,
    target: 2,
    reward: 30,
    claimed: false,
  },
  {
    id: "bed",
    title: "Phone sleeps outside",
    description: "Beat bedtime scroll by logging an offline wind-down.",
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

function Logo() {
  return (
    <div className="flex items-center gap-3" data-testid="brand-logo">
      <svg
        aria-label="Latch logo"
        viewBox="0 0 48 48"
        className="h-10 w-10 text-lime-300"
        fill="none"
      >
        <path d="M15 26V15.5C15 10.25 19.25 6 24.5 6S34 10.25 34 15.5V26" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
        <path d="M11 23h26v13a7 7 0 0 1-7 7H18a7 7 0 0 1-7-7V23Z" fill="currentColor" />
        <circle cx="24" cy="32" r="3" className="fill-background" />
      </svg>
      <div>
        <p className="font-display text-lg font-extrabold leading-none tracking-tight">Latch</p>
        <p className="text-xs font-medium text-muted-foreground">Hooked on real life</p>
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  detail,
  icon: Icon,
}: {
  label: string;
  value: string;
  detail: string;
  icon: typeof AlarmClock;
}) {
  return (
    <article className="rounded-lg bg-card p-4 text-card-foreground shadow-sm" data-testid={`card-stat-${label.toLowerCase().replaceAll(" ", "-")}`}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">{label}</p>
          <p className="mt-2 font-display text-xl font-extrabold tabular-nums">{value}</p>
        </div>
        <Icon className="h-5 w-5 text-primary" aria-hidden="true" />
      </div>
      <p className="mt-3 text-sm text-muted-foreground">{detail}</p>
    </article>
  );
}

function ModePill({ mode }: { mode: Mode }) {
  const copy = {
    soft: "pause",
    focus: "earn",
    hard: "locked",
  };

  return (
    <span className="rounded-full bg-secondary px-2.5 py-1 text-xs font-bold uppercase tracking-[0.16em] text-secondary-foreground" data-testid={`pill-mode-${mode}`}>
      {copy[mode]}
    </span>
  );
}

function Home() {
  const [theme, setTheme] = useState<"light" | "dark">(() =>
    typeof window !== "undefined" && window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light",
  );
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
  const [toast, setToast] = useState("Choose a shielded app to see the anti-scroll flow.");

  const screenTimePercent = 62;
  const shieldProgress = shieldOpen ? ((selectedApp.delay - countdown) / selectedApp.delay) * 100 : 0;
  const focusProgress = focusActive ? ((15 - focusSeconds) / 15) * 100 : focusMinutes;

  const activeQuestCount = useMemo(() => quests.filter((quest) => !quest.claimed).length, [quests]);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
  }, [theme]);

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
          setCoins((currentCoins) => currentCoins + 22);
          setStreak((currentStreak) => currentStreak + 1);
          setToast("Focus complete: +22 coins, streak extended, and the feed stays locked.");
          return 15;
        }
        return current - 1;
      });
    }, 1000);
    return () => window.clearInterval(id);
  }, [focusActive]);

  function openShield(app: AppRule) {
    setSelectedApp(app);
    setShieldStep("pause");
    setCountdown(app.delay);
    setMathAnswer("");
    setShieldOpen(true);
    setToast(`${app.name} shield opened. Latch is interrupting autopilot before the feed loads.`);
  }

  function skipApp() {
    setShieldStep("saved");
    setCoins((current) => current + 6);
    setFocusMinutes((minutes) => Math.min(100, minutes + 6));
    setToast("Nice save: you skipped the impulse and earned 6 coins.");
  }

  function buySession() {
    if (coins < 10) {
      setToast("Not enough coins yet. Finish a focus block or quest to earn access.");
      return;
    }
    setCoins((current) => current - 10);
    setShieldStep("math");
    setToast("Coins spent. Solve the final friction check before opening.");
  }

  function submitMath() {
    if (mathAnswer.trim() === "13") {
      setShieldStep("unlocked");
      setToast(`${selectedApp.name} unlocked for ${selectedApp.limit} mindful minutes.`);
    } else {
      setToast("That answer did not pass the shield. The point is to slow the habit loop down.");
    }
  }

  function startFocus() {
    setFocusSeconds(15);
    setFocusActive(true);
    setCrewLive(true);
    setToast("Focus sprint started. The prototype runs a 15-second demo for a 25-minute session.");
  }

  function claimQuest(id: string) {
    setQuests((current) =>
      current.map((quest) => {
        if (quest.id !== id || quest.progress < quest.target || quest.claimed) return quest;
        setCoins((coinTotal) => coinTotal + quest.reward);
        setToast(`Quest claimed: +${quest.reward} coins.`);
        return { ...quest, claimed: true };
      }),
    );
  }

  return (
    <main className="min-h-screen overflow-hidden bg-background text-foreground">
      <div className="fixed inset-0 -z-10 bg-[radial-gradient(circle_at_top_left,hsl(var(--primary)/0.16),transparent_34%),radial-gradient(circle_at_80%_20%,hsl(var(--chart-4)/0.18),transparent_24%)]" />

      <header className="sticky top-0 z-50 border-b border-border/70 bg-background/88 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6 lg:px-8">
          <Logo />
          <nav className="hidden items-center gap-2 md:flex" aria-label="Primary navigation">
            {["Shield", "Focus", "Quests", "Crew"].map((item) => (
              <button
                key={item}
                type="button"
                className="rounded-md px-3 py-2 text-sm font-semibold text-muted-foreground hover-elevate active-elevate-2"
                data-testid={`button-nav-${item.toLowerCase()}`}
                onClick={() => document.getElementById(item.toLowerCase())?.scrollIntoView({ behavior: "smooth", block: "start" })}
              >
                {item}
              </button>
            ))}
          </nav>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setTheme((current) => (current === "dark" ? "light" : "dark"))}
            data-testid="button-theme-toggle"
            aria-label="Toggle color theme"
          >
            {theme === "dark" ? <Sun className="h-4 w-4" aria-hidden="true" /> : <Moon className="h-4 w-4" aria-hidden="true" />}
            {theme === "dark" ? "Light" : "Dark"}
          </Button>
        </div>
      </header>

      <section className="mx-auto grid max-w-7xl gap-6 px-4 py-6 sm:px-6 lg:grid-cols-[1.05fr_0.95fr] lg:px-8 lg:py-10">
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.45 }} className="rounded-xl bg-card p-5 shadow-sm sm:p-6">
          <div className="flex flex-wrap items-center gap-3">
            <span className="rounded-full bg-primary px-3 py-1 text-xs font-black uppercase tracking-[0.18em] text-primary-foreground" data-testid="text-product-tagline">
              anti-feed engine
            </span>
            <span className="text-sm font-medium text-muted-foreground">Built to use social-app psychology in reverse</span>
          </div>
          <div className="mt-8 max-w-2xl">
            <h1 className="font-display text-xl font-extrabold tracking-tight sm:text-[2.2rem]" data-testid="text-hero-title">
              The app that makes staying off your phone feel as addictive as checking it.
            </h1>
            <p className="mt-4 text-base leading-7 text-muted-foreground" data-testid="text-hero-description">
              Latch turns screen-time reduction into a reward loop: intentional delays, earnable unlocks, friend streaks, offline quests, and satisfying progress instead of guilt-based blocking.
            </p>
          </div>
          <div className="mt-7 flex flex-wrap items-center gap-3">
            <Button type="button" onClick={startFocus} data-testid="button-start-focus-hero">
              Start a focus sprint
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Button>
            <Button type="button" variant="outline" onClick={() => openShield(selectedApp)} data-testid="button-open-shield-hero">
              Test the shield
            </Button>
          </div>
          <div className="mt-8 grid gap-3 sm:grid-cols-3">
            <div className="rounded-lg bg-secondary p-4" data-testid="card-loop-friction">
              <Brain className="h-5 w-5 text-primary" aria-hidden="true" />
              <p className="mt-3 text-sm font-bold">Interrupt autopilot</p>
              <p className="mt-1 text-sm text-muted-foreground">A short pause appears before the addictive app opens.</p>
            </div>
            <div className="rounded-lg bg-secondary p-4" data-testid="card-loop-reward">
              <Gift className="h-5 w-5 text-primary" aria-hidden="true" />
              <p className="mt-3 text-sm font-bold">Reward the skip</p>
              <p className="mt-1 text-sm text-muted-foreground">Coins, streaks, and XP come from not scrolling.</p>
            </div>
            <div className="rounded-lg bg-secondary p-4" data-testid="card-loop-social">
              <Users className="h-5 w-5 text-primary" aria-hidden="true" />
              <p className="mt-3 text-sm font-bold">Make it social</p>
              <p className="mt-1 text-sm text-muted-foreground">Friends compete on reclaimed minutes, not usage.</p>
            </div>
          </div>
        </motion.div>

        <aside className="grid gap-4">
          <div className="grid grid-cols-2 gap-4">
            <StatCard label="Recovered" value="2h 41m" detail="Projected time back today" icon={AlarmClock} />
            <StatCard label="Streak" value={`${streak} days`} detail="No missed goal this week" icon={Flame} />
            <StatCard label="Coins" value={String(coins)} detail="Earned through offline action" icon={Zap} />
            <StatCard label="Shield saves" value="17" detail="Autopilot opens interrupted" icon={Shield} />
          </div>
          <div className="rounded-xl bg-card p-5 shadow-sm" data-testid="panel-screen-time">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-bold">Today’s screen budget</p>
                <p className="text-sm text-muted-foreground">3h 06m used of 5h goal</p>
              </div>
              <span className="font-mono text-sm font-bold tabular-nums">{screenTimePercent}%</span>
            </div>
            <Progress className="mt-4 h-3" value={screenTimePercent} data-testid="progress-screen-time" />
            <p className="mt-4 rounded-md bg-secondary p-3 text-sm text-secondary-foreground" data-testid="text-toast-status">
              {toast}
            </p>
          </div>
        </aside>
      </section>

      <section id="shield" className="mx-auto grid max-w-7xl gap-6 px-4 pb-6 sm:px-6 lg:grid-cols-[0.9fr_1.1fr] lg:px-8">
        <article className="rounded-xl bg-card p-5 shadow-sm" data-testid="section-shield">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.18em] text-muted-foreground">Shield rules</p>
              <h2 className="mt-2 font-display text-xl font-extrabold tracking-tight">Friction before feeds</h2>
            </div>
            <Lock className="h-5 w-5 text-primary" aria-hidden="true" />
          </div>
          <div className="mt-5 space-y-3">
            {appRules.map((app) => (
              <button
                type="button"
                key={app.id}
                onClick={() => setSelectedApp(app)}
                className={`w-full rounded-lg p-4 text-left transition ${
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

        <article className="rounded-xl bg-card p-5 shadow-sm" data-testid="panel-selected-app">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.18em] text-muted-foreground">selected shield</p>
              <h2 className="mt-2 font-display text-xl font-extrabold tracking-tight">{selectedApp.name}</h2>
              <p className="mt-2 max-w-xl text-sm text-muted-foreground">
                {selectedApp.delay} second pause, {selectedApp.limit} minute session cap, and a coin gate that makes every open intentional.
              </p>
            </div>
            <Button type="button" onClick={() => openShield(selectedApp)} data-testid="button-open-selected-shield">
              Open shield
            </Button>
          </div>

          <AnimatePresence mode="wait">
            {shieldOpen ? (
              <motion.div
                key={shieldStep}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.2 }}
                className="mt-6 rounded-xl bg-background p-5"
                data-testid="panel-shield-flow"
              >
                {shieldStep === "pause" && (
                  <div>
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-bold">Pause shield active</p>
                        <p className="text-sm text-muted-foreground">The feed is blocked while your brain catches up.</p>
                      </div>
                      <span className="font-mono text-xl font-black tabular-nums" data-testid="text-shield-countdown">
                        {countdown}s
                      </span>
                    </div>
                    <Progress className="mt-5 h-3" value={shieldProgress} data-testid="progress-shield-countdown" />
                  </div>
                )}

                {shieldStep === "choice" && (
                  <div>
                    <p className="text-sm font-bold">Do you still want {selectedApp.name}?</p>
                    <p className="mt-2 text-sm text-muted-foreground">Social apps win when opening is automatic. Latch makes you choose.</p>
                    <div className="mt-5 grid gap-3 sm:grid-cols-2">
                      <Button type="button" onClick={skipApp} data-testid="button-skip-app">
                        Stay offline, earn coins
                      </Button>
                      <Button type="button" variant="outline" onClick={buySession} data-testid="button-buy-session">
                        Spend 10 coins to continue
                      </Button>
                    </div>
                  </div>
                )}

                {shieldStep === "math" && (
                  <div>
                    <p className="text-sm font-bold">Final friction check</p>
                    <label htmlFor="math-answer" className="mt-2 block text-sm text-muted-foreground">
                      What is 7 + 6?
                    </label>
                    <div className="mt-4 flex flex-wrap gap-3">
                      <input
                        id="math-answer"
                        value={mathAnswer}
                        onChange={(event) => setMathAnswer(event.target.value)}
                        className="min-h-10 rounded-md border border-input bg-background px-3 text-sm outline-none focus-visible:ring-1 focus-visible:ring-ring"
                        data-testid="input-math-answer"
                      />
                      <Button type="button" onClick={submitMath} data-testid="button-submit-math">
                        Unlock mindful session
                      </Button>
                    </div>
                  </div>
                )}

                {shieldStep === "unlocked" && (
                  <div className="flex items-start gap-3">
                    <BadgeCheck className="mt-0.5 h-5 w-5 text-primary" aria-hidden="true" />
                    <div>
                      <p className="text-sm font-bold" data-testid="text-unlocked-session">
                        {selectedApp.name} unlocked for {selectedApp.limit} minutes.
                      </p>
                      <p className="mt-1 text-sm text-muted-foreground">The session will close automatically when time is up.</p>
                    </div>
                  </div>
                )}

                {shieldStep === "saved" && (
                  <div className="flex items-start gap-3">
                    <Sprout className="mt-0.5 h-5 w-5 text-primary" aria-hidden="true" />
                    <div>
                      <p className="text-sm font-bold" data-testid="text-saved-session">
                        You skipped the feed and banked the reward.
                      </p>
                      <p className="mt-1 text-sm text-muted-foreground">This is the reverse dopamine hit: satisfaction for not opening.</p>
                    </div>
                  </div>
                )}
              </motion.div>
            ) : (
              <motion.div
                key="empty"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="mt-6 rounded-xl bg-background p-5"
                data-testid="panel-shield-empty"
              >
                <p className="text-sm font-bold">Ready to interrupt a habit loop?</p>
                <p className="mt-2 text-sm text-muted-foreground">Pick an app, then open the shield to preview Latch’s anti-scroll flow.</p>
              </motion.div>
            )}
          </AnimatePresence>
        </article>
      </section>

      <section id="focus" className="mx-auto grid max-w-7xl gap-6 px-4 pb-6 sm:px-6 lg:grid-cols-[1.05fr_0.95fr] lg:px-8">
        <article className="rounded-xl bg-card p-5 shadow-sm" data-testid="section-focus">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.18em] text-muted-foreground">present session</p>
              <h2 className="mt-2 font-display text-xl font-extrabold tracking-tight">Earn your scroll time</h2>
              <p className="mt-2 max-w-xl text-sm text-muted-foreground">
                Complete offline blocks to refill coins. Scrolling becomes a limited reward, not the default behavior.
              </p>
            </div>
            <Button type="button" onClick={startFocus} disabled={focusActive} data-testid="button-start-focus-panel">
              {focusActive ? "Running" : "Start 25 min"}
            </Button>
          </div>
          <div className="mt-6 rounded-xl bg-background p-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-bold">Study sprint</p>
                <p className="text-sm text-muted-foreground">Prototype demo completes in 15 seconds.</p>
              </div>
              <span className="font-mono text-xl font-black tabular-nums" data-testid="text-focus-timer">
                {focusActive ? `00:${String(focusSeconds).padStart(2, "0")}` : "25:00"}
              </span>
            </div>
            <Progress className="mt-5 h-3" value={focusProgress} data-testid="progress-focus-session" />
            <div className="mt-5 grid gap-3 sm:grid-cols-3">
              <div className="rounded-lg bg-secondary p-3">
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-muted-foreground">reward</p>
                <p className="mt-1 font-mono text-lg font-black">+22</p>
              </div>
              <div className="rounded-lg bg-secondary p-3">
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-muted-foreground">blocked</p>
                <p className="mt-1 font-mono text-lg font-black">4 apps</p>
              </div>
              <div className="rounded-lg bg-secondary p-3">
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-muted-foreground">crew</p>
                <p className="mt-1 font-mono text-lg font-black">{crewLive ? "live" : "ready"}</p>
              </div>
            </div>
          </div>
        </article>

        <article className="rounded-xl bg-card p-5 shadow-sm" data-testid="section-weekly">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.18em] text-muted-foreground">momentum</p>
              <h2 className="mt-2 font-display text-xl font-extrabold tracking-tight">Offline XP trend</h2>
            </div>
            <Target className="h-5 w-5 text-primary" aria-hidden="true" />
          </div>
          <div className="mt-6 flex h-52 items-end gap-2 rounded-xl bg-background p-4" data-testid="chart-weekly-progress">
            {weeklyBars.map((height, index) => (
              <div key={height + index} className="flex flex-1 flex-col items-center gap-2">
                <div className="w-full rounded-t-md bg-primary" style={{ height: `${height}%` }} data-testid={`bar-weekly-${index}`} />
                <span className="text-xs font-bold text-muted-foreground">{["M", "T", "W", "T", "F", "S", "S"][index]}</span>
              </div>
            ))}
          </div>
        </article>
      </section>

      <section id="quests" className="mx-auto grid max-w-7xl gap-6 px-4 pb-6 sm:px-6 lg:grid-cols-[0.95fr_1.05fr] lg:px-8">
        <article className="rounded-xl bg-card p-5 shadow-sm" data-testid="section-quests">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.18em] text-muted-foreground">quests</p>
              <h2 className="mt-2 font-display text-xl font-extrabold tracking-tight">{activeQuestCount} active habit hooks</h2>
            </div>
            <Trophy className="h-5 w-5 text-primary" aria-hidden="true" />
          </div>
          <div className="mt-5 space-y-4">
            {quests.map((quest) => {
              const percent = Math.min(100, (quest.progress / quest.target) * 100);
              const complete = quest.progress >= quest.target;
              return (
                <article key={quest.id} className="rounded-lg bg-background p-4" data-testid={`card-quest-${quest.id}`}>
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="font-bold">{quest.title}</p>
                      <p className="mt-1 text-sm text-muted-foreground">{quest.description}</p>
                    </div>
                    <span className="rounded-full bg-secondary px-2.5 py-1 text-xs font-bold text-secondary-foreground">+{quest.reward}</span>
                  </div>
                  <Progress className="mt-4 h-2.5" value={percent} data-testid={`progress-quest-${quest.id}`} />
                  <div className="mt-4 flex items-center justify-between gap-3">
                    <span className="text-sm font-medium text-muted-foreground">
                      {quest.progress}/{quest.target}
                    </span>
                    <Button
                      type="button"
                      size="sm"
                      variant={quest.claimed ? "secondary" : complete ? "default" : "outline"}
                      disabled={!complete || quest.claimed}
                      onClick={() => claimQuest(quest.id)}
                      data-testid={`button-claim-quest-${quest.id}`}
                    >
                      {quest.claimed ? "Claimed" : complete ? "Claim" : "In progress"}
                    </Button>
                  </div>
                </article>
              );
            })}
          </div>
        </article>

        <article className="rounded-xl bg-card p-5 shadow-sm" data-testid="section-psychology">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.18em] text-muted-foreground">psychology stack</p>
              <h2 className="mt-2 font-display text-xl font-extrabold tracking-tight">Social media tactics, inverted</h2>
            </div>
            <Sparkles className="h-5 w-5 text-primary" aria-hidden="true" />
          </div>
          <div className="mt-6 grid gap-3">
            {[
              ["Variable rewards", "Coins and rare badges drop after offline wins, not after scrolling."],
              ["Streak pressure", "Momentum is attached to sleep, study, and morning routines."],
              ["Social proof", "Leaderboards rank reclaimed time instead of screen time."],
              ["Friction design", "Delays, math checks, and hard locks break impulsive openings."],
              ["Replacement behavior", "Focus, walking, journaling, and group sessions become the new tap target."],
            ].map(([title, description], index) => (
              <div key={title} className="flex gap-3 rounded-lg bg-background p-4" data-testid={`row-psychology-${index}`}>
                <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-black text-primary-foreground">
                  {index + 1}
                </div>
                <div>
                  <p className="font-bold">{title}</p>
                  <p className="mt-1 text-sm text-muted-foreground">{description}</p>
                </div>
              </div>
            ))}
          </div>
        </article>
      </section>

      <section id="crew" className="mx-auto grid max-w-7xl gap-6 px-4 pb-10 sm:px-6 lg:grid-cols-[1.05fr_0.95fr] lg:px-8">
        <article className="rounded-xl bg-card p-5 shadow-sm" data-testid="section-crew">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.18em] text-muted-foreground">crew room</p>
              <h2 className="mt-2 font-display text-xl font-extrabold tracking-tight">Make presence competitive</h2>
              <p className="mt-2 max-w-xl text-sm text-muted-foreground">
                Group sessions create accountability. Everyone wins when the room stays off their phones.
              </p>
            </div>
            <Button type="button" variant={crewLive ? "secondary" : "default"} onClick={() => setCrewLive((current) => !current)} data-testid="button-toggle-crew">
              {crewLive ? "Crew live" : "Start crew"}
            </Button>
          </div>
          <div className="mt-6 space-y-3">
            {crew.map((person, index) => (
              <div
                key={person.name}
                className={`flex items-center justify-between gap-4 rounded-lg p-4 ${person.current ? "bg-primary text-primary-foreground" : "bg-background"}`}
                data-testid={`row-crew-${person.name.toLowerCase()}`}
              >
                <div className="flex items-center gap-3">
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-secondary text-sm font-black text-secondary-foreground">{index + 1}</span>
                  <div>
                    <p className="font-bold">{person.name}</p>
                    <p className={`text-sm ${person.current ? "text-primary-foreground/80" : "text-muted-foreground"}`}>reclaimed today</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-mono text-lg font-black tabular-nums">{person.minutes}m</p>
                  <p className={`text-sm ${person.current ? "text-primary-foreground/80" : "text-muted-foreground"}`}>{person.delta} vs avg</p>
                </div>
              </div>
            ))}
          </div>
        </article>

        <article className="rounded-xl bg-card p-5 shadow-sm" data-testid="section-roadmap">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.18em] text-muted-foreground">next build</p>
              <h2 className="mt-2 font-display text-xl font-extrabold tracking-tight">What becomes real on mobile</h2>
            </div>
            <ChevronRight className="h-5 w-5 text-primary" aria-hidden="true" />
          </div>
          <div className="mt-6 space-y-3">
            {[
              "Screen Time API integration for actual app blocking and usage stats",
              "Friend rooms, group focus sessions, and weekly leagues",
              "Reward marketplace for gym passes, books, merch, and local experiences",
              "Adaptive shield difficulty based on relapse patterns",
              "Parent and coach dashboards for accountability without surveillance",
            ].map((item) => (
              <div key={item} className="flex gap-3 rounded-lg bg-background p-4" data-testid={`row-roadmap-${item.slice(0, 8).toLowerCase().replaceAll(" ", "-")}`}>
                <Check className="mt-0.5 h-5 w-5 shrink-0 text-primary" aria-hidden="true" />
                <p className="text-sm text-muted-foreground">{item}</p>
              </div>
            ))}
          </div>
        </article>
      </section>
    </main>
  );
}

function AppRouter() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route component={NotFound} />
    </Switch>
  );
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
