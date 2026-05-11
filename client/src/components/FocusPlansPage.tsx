import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { AlarmClock, Hourglass, Lock, Plus, ShieldCheck, Sparkles, Sun, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import type { SafeAccount } from "@/lib/auth";
import {
  createFocusPlan,
  dayMaskToList,
  deleteFocusPlan,
  difficultyCopy,
  difficultyLabel,
  formatMinutes,
  listFocusPlans,
  toggleFocusPlan,
  type FocusPlan,
} from "@/lib/credits";

type PresetPlan = {
  title: string;
  difficulty: FocusPlan["difficulty"];
  startMinute: number;
  endMinute: number;
  daysMask: number;
  apps: string[];
  breakPolicy: FocusPlan["breakPolicy"];
  emergencyPassCount: number;
  blurb: string;
};

const WEEKDAYS_MASK = 0b0111110; // M-F
const ALLDAYS_MASK = 0b1111111;
const WEEKEND_MASK = 0b1000001;

const presetPlans: PresetPlan[] = [
  {
    title: "School day focus",
    difficulty: "friction",
    startMinute: 8 * 60,
    endMinute: 15 * 60,
    daysMask: WEEKDAYS_MASK,
    apps: ["Instagram", "TikTok", "Snapchat"],
    breakPolicy: "five_min",
    emergencyPassCount: 1,
    blurb: "Locks social apps during school hours with a 5 min break window.",
  },
  {
    title: "Bedtime wind-down",
    difficulty: "deep_lock",
    startMinute: 22 * 60,
    endMinute: 24 * 60,
    daysMask: ALLDAYS_MASK,
    apps: ["Instagram", "TikTok", "YouTube", "Snapchat"],
    breakPolicy: "none",
    emergencyPassCount: 0,
    blurb: "Hardcore deep-lock from 10 pm to midnight. Sleep is the goal.",
  },
  {
    title: "Pomodoro study sprint",
    difficulty: "friction",
    startMinute: 16 * 60,
    endMinute: 18 * 60,
    daysMask: ALLDAYS_MASK,
    apps: ["TikTok", "YouTube"],
    breakPolicy: "pomodoro",
    emergencyPassCount: 1,
    blurb: "25 / 5 cycles. Earn credits for each completed Pomodoro.",
  },
  {
    title: "Family time",
    difficulty: "gentle",
    startMinute: 18 * 60,
    endMinute: 19 * 60 + 30,
    daysMask: WEEKEND_MASK,
    apps: ["Instagram", "TikTok"],
    breakPolicy: "none",
    emergencyPassCount: 2,
    blurb: "Soft nudge for weekend dinners. Easy to bypass if you really mean it.",
  },
];

const dayNames = ["S", "M", "T", "W", "T", "F", "S"];

function difficultyTone(d: FocusPlan["difficulty"]): string {
  if (d === "deep_lock") return "border-rose-500/40 bg-rose-500/10";
  if (d === "friction") return "border-amber-500/40 bg-amber-500/10";
  return "border-primary/40 bg-primary/10";
}

export function FocusPlansPage({ account, onToast }: { account: SafeAccount; onToast: (m: string) => void }) {
  const [plans, setPlans] = useState<FocusPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [showCustom, setShowCustom] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Custom plan form state
  const [customTitle, setCustomTitle] = useState("My focus plan");
  const [customDifficulty, setCustomDifficulty] = useState<FocusPlan["difficulty"]>("friction");
  const [customStart, setCustomStart] = useState("09:00");
  const [customEnd, setCustomEnd] = useState("11:00");
  const [customDays, setCustomDays] = useState<number>(WEEKDAYS_MASK);
  const [customApps, setCustomApps] = useState<string[]>(["Instagram", "TikTok"]);
  const [customBreak, setCustomBreak] = useState<FocusPlan["breakPolicy"]>("five_min");
  const [customPass, setCustomPass] = useState(1);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const data = await listFocusPlans(account.id);
        if (!cancelled) setPlans(data.plans);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "Could not load plans.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [account.id]);

  async function addPreset(preset: PresetPlan) {
    setError(null);
    try {
      const result = await createFocusPlan({
        accountId: account.id,
        title: preset.title,
        difficulty: preset.difficulty,
        startMinute: preset.startMinute,
        endMinute: preset.endMinute,
        daysMask: preset.daysMask,
        blockedApps: preset.apps,
        breakPolicy: preset.breakPolicy,
        emergencyPassCount: preset.emergencyPassCount,
        enabled: true,
      });
      setPlans((current) => [...current, result.plan]);
      onToast(`Added "${preset.title}" plan.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not add plan.");
    }
  }

  async function toggle(plan: FocusPlan) {
    setBusyId(plan.id);
    try {
      const result = await toggleFocusPlan(plan.id, !plan.enabled);
      setPlans((current) => current.map((p) => (p.id === plan.id ? result.plan : p)));
      onToast(`${plan.title} ${result.plan.enabled ? "enabled" : "paused"}.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not toggle.");
    } finally {
      setBusyId(null);
    }
  }

  async function removePlan(plan: FocusPlan) {
    setBusyId(plan.id);
    try {
      await deleteFocusPlan(plan.id);
      setPlans((current) => current.filter((p) => p.id !== plan.id));
      onToast(`Removed "${plan.title}".`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not remove.");
    } finally {
      setBusyId(null);
    }
  }

  function toggleDayBit(bit: number) {
    setCustomDays((current) => current ^ (1 << bit));
  }

  function toggleCustomApp(app: string) {
    setCustomApps((current) => (current.includes(app) ? current.filter((a) => a !== app) : [...current, app]));
  }

  function parseTime(value: string): number {
    const [h, m] = value.split(":").map((n) => Number(n));
    if (!Number.isFinite(h) || !Number.isFinite(m)) return 0;
    return Math.max(0, Math.min(1439, h * 60 + m));
  }

  async function submitCustom() {
    setError(null);
    const start = parseTime(customStart);
    const end = parseTime(customEnd);
    if (end <= start) {
      setError("End time must be after start.");
      return;
    }
    try {
      const result = await createFocusPlan({
        accountId: account.id,
        title: customTitle.trim() || "My focus plan",
        difficulty: customDifficulty,
        startMinute: start,
        endMinute: end,
        daysMask: customDays,
        blockedApps: customApps,
        breakPolicy: customBreak,
        emergencyPassCount: customPass,
        enabled: true,
      });
      setPlans((current) => [...current, result.plan]);
      onToast(`Created custom plan "${result.plan.title}".`);
      setShowCustom(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save.");
    }
  }

  const active = useMemo(() => plans.filter((p) => p.enabled).length, [plans]);

  return (
    <section id="plans" className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8" data-testid="section-focus-plans">
      <div className="grid gap-6 lg:grid-cols-[1fr_0.9fr]">
        <article className="rounded-[2rem] bg-card p-5 shadow-sm sm:p-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.18em] text-muted-foreground">scheduled focus plans</p>
              <h1 className="mt-2 font-display text-[2rem] font-extrabold leading-none tracking-tight">Block by schedule, by depth.</h1>
              <p className="mt-3 max-w-xl text-sm leading-6 text-muted-foreground">
                Inspired by Opal-style sessions. Pick a preset or build your own. Choose how hard it should be to break the lock.
              </p>
            </div>
            <div className="rounded-2xl bg-secondary px-4 py-3 text-secondary-foreground" data-testid="card-active-plans">
              <p className="text-[10px] font-black uppercase tracking-[0.16em]">active plans</p>
              <p className="font-display text-xl font-black tabular-nums">{active}</p>
            </div>
          </div>

          <div className="mt-6 grid gap-3" data-testid="list-existing-plans">
            {loading && (
              <p className="rounded-2xl bg-background p-4 text-sm text-muted-foreground">Loading your plans…</p>
            )}
            {!loading && plans.length === 0 && (
              <p className="rounded-2xl bg-background p-4 text-sm text-muted-foreground">
                No focus plans yet. Add a preset on the right, or build a custom one.
              </p>
            )}
            {plans.map((plan) => {
              const apps = (() => {
                try {
                  const parsed = JSON.parse(plan.blockedApps);
                  return Array.isArray(parsed) ? parsed as string[] : [];
                } catch {
                  return [];
                }
              })();
              return (
                <motion.div
                  key={plan.id}
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`rounded-2xl border-2 p-4 ${plan.enabled ? difficultyTone(plan.difficulty) : "border-border bg-background opacity-70"}`}
                  data-testid={`row-focus-plan-${plan.id}`}
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="flex items-center gap-2 font-bold">
                        <Lock className="h-4 w-4" aria-hidden="true" />
                        {plan.title}
                        <span className="rounded-full bg-card px-2 py-0.5 text-[10px] font-black uppercase tracking-[0.16em]">
                          {difficultyLabel(plan.difficulty)}
                        </span>
                      </p>
                      <p className="mt-1 text-xs leading-5 text-muted-foreground">
                        {formatMinutes(plan.startMinute)} – {formatMinutes(plan.endMinute)} · {dayMaskToList(plan.daysMask).join(" ") || "no days"}
                      </p>
                      <p className="mt-1 text-xs leading-5 text-muted-foreground">
                        Blocks: {apps.length > 0 ? apps.join(", ") : "all social"} · break: {plan.breakPolicy} · {plan.emergencyPassCount} emergency pass{plan.emergencyPassCount === 1 ? "" : "es"}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        type="button"
                        size="sm"
                        variant={plan.enabled ? "secondary" : "default"}
                        disabled={busyId === plan.id}
                        onClick={() => toggle(plan)}
                        data-testid={`button-toggle-plan-${plan.id}`}
                      >
                        {plan.enabled ? "Pause" : "Enable"}
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        disabled={busyId === plan.id}
                        onClick={() => removePlan(plan)}
                        data-testid={`button-remove-plan-${plan.id}`}
                      >
                        <Trash2 className="h-4 w-4" aria-hidden="true" />
                      </Button>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>

          <div className="mt-6 rounded-2xl bg-background p-4" data-testid="card-difficulty-help">
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-primary" aria-hidden="true" />
              <p className="text-sm font-bold">Difficulty levels</p>
            </div>
            <div className="mt-3 grid gap-2 text-xs leading-5 text-muted-foreground sm:grid-cols-3">
              <p><strong className="text-foreground">Gentle:</strong> {difficultyCopy("gentle")}</p>
              <p><strong className="text-foreground">Friction:</strong> {difficultyCopy("friction")}</p>
              <p><strong className="text-foreground">Deep Lock:</strong> {difficultyCopy("deep_lock")}</p>
            </div>
            <p className="mt-3 text-[11px] text-muted-foreground">
              Prototype note: the web demo simulates the lock. The iOS app uses Apple's ManagedSettings to enforce it.
            </p>
          </div>

          {error && <p className="mt-3 text-xs font-bold text-rose-500" data-testid="text-plan-error">{error}</p>}
        </article>

        <article className="rounded-[2rem] bg-card p-5 shadow-sm" data-testid="section-plan-presets">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.18em] text-muted-foreground">smart presets</p>
              <h2 className="mt-2 font-display text-xl font-extrabold tracking-tight">Tap to add</h2>
            </div>
            <Sun className="h-5 w-5 text-primary" aria-hidden="true" />
          </div>
          <div className="mt-4 grid gap-3">
            {presetPlans.map((preset) => (
              <button
                key={preset.title}
                type="button"
                onClick={() => addPreset(preset)}
                className="rounded-2xl bg-background p-4 text-left transition hover-elevate active-elevate-2"
                data-testid={`button-preset-${preset.title.toLowerCase().replaceAll(" ", "-")}`}
              >
                <p className="flex items-center gap-2 font-bold">
                  <AlarmClock className="h-4 w-4 text-primary" aria-hidden="true" />
                  {preset.title}
                  <span className="rounded-full bg-secondary px-2 py-0.5 text-[10px] font-black uppercase tracking-[0.16em] text-secondary-foreground">
                    {difficultyLabel(preset.difficulty)}
                  </span>
                </p>
                <p className="mt-2 text-xs leading-5 text-muted-foreground">{preset.blurb}</p>
                <p className="mt-2 text-[11px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
                  {formatMinutes(preset.startMinute)}–{formatMinutes(preset.endMinute)}
                </p>
              </button>
            ))}
          </div>

          <Button
            type="button"
            className="mt-5 w-full"
            variant={showCustom ? "secondary" : "default"}
            onClick={() => setShowCustom((v) => !v)}
            data-testid="button-toggle-custom-plan"
          >
            <Plus className="h-4 w-4" aria-hidden="true" />
            {showCustom ? "Close custom builder" : "Build a custom plan"}
          </Button>

          {showCustom && (
            <motion.div
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-4 space-y-3 rounded-2xl bg-background p-4"
              data-testid="form-custom-plan"
            >
              <label className="text-xs font-bold uppercase tracking-[0.14em] text-muted-foreground">
                Title
                <input
                  value={customTitle}
                  onChange={(e) => setCustomTitle(e.target.value)}
                  className="mt-1 block min-h-10 w-full rounded-xl border border-input bg-card px-3 text-sm outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  data-testid="input-custom-title"
                />
              </label>
              <div className="grid grid-cols-2 gap-3">
                <label className="text-xs font-bold uppercase tracking-[0.14em] text-muted-foreground">
                  Start
                  <input
                    type="time"
                    value={customStart}
                    onChange={(e) => setCustomStart(e.target.value)}
                    className="mt-1 block min-h-10 w-full rounded-xl border border-input bg-card px-3 text-sm outline-none focus-visible:ring-1 focus-visible:ring-ring"
                    data-testid="input-custom-start"
                  />
                </label>
                <label className="text-xs font-bold uppercase tracking-[0.14em] text-muted-foreground">
                  End
                  <input
                    type="time"
                    value={customEnd}
                    onChange={(e) => setCustomEnd(e.target.value)}
                    className="mt-1 block min-h-10 w-full rounded-xl border border-input bg-card px-3 text-sm outline-none focus-visible:ring-1 focus-visible:ring-ring"
                    data-testid="input-custom-end"
                  />
                </label>
              </div>
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.14em] text-muted-foreground">Days</p>
                <div className="mt-2 flex gap-1">
                  {dayNames.map((label, i) => {
                    const on = (customDays & (1 << i)) !== 0;
                    return (
                      <button
                        key={`${label}-${i}`}
                        type="button"
                        onClick={() => toggleDayBit(i)}
                        className={`flex h-9 w-9 items-center justify-center rounded-full text-sm font-black ${
                          on ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground"
                        }`}
                        data-testid={`button-day-bit-${i}`}
                      >
                        {label}
                      </button>
                    );
                  })}
                </div>
              </div>
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.14em] text-muted-foreground">Difficulty</p>
                <div className="mt-2 grid grid-cols-3 gap-2">
                  {(["gentle", "friction", "deep_lock"] as FocusPlan["difficulty"][]).map((d) => (
                    <button
                      key={d}
                      type="button"
                      onClick={() => setCustomDifficulty(d)}
                      className={`rounded-xl px-3 py-2 text-xs font-bold ${
                        customDifficulty === d ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground"
                      }`}
                      data-testid={`button-difficulty-${d}`}
                    >
                      {difficultyLabel(d)}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.14em] text-muted-foreground">Apps to block</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {["Instagram", "TikTok", "YouTube", "Snapchat", "Games"].map((app) => {
                    const on = customApps.includes(app);
                    return (
                      <button
                        key={app}
                        type="button"
                        onClick={() => toggleCustomApp(app)}
                        className={`rounded-full px-3 py-1 text-xs font-bold ${
                          on ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground"
                        }`}
                        data-testid={`button-app-toggle-${app.toLowerCase()}`}
                      >
                        {app}
                      </button>
                    );
                  })}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.14em] text-muted-foreground">Break policy</p>
                  <div className="mt-2 grid gap-1">
                    {(["none", "five_min", "pomodoro"] as FocusPlan["breakPolicy"][]).map((b) => (
                      <button
                        key={b}
                        type="button"
                        onClick={() => setCustomBreak(b)}
                        className={`rounded-xl px-3 py-1.5 text-xs font-bold ${
                          customBreak === b ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground"
                        }`}
                        data-testid={`button-break-${b}`}
                      >
                        {b === "none" ? "None" : b === "five_min" ? "5 min" : "Pomodoro"}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.14em] text-muted-foreground">Emergency passes</p>
                  <input
                    type="number"
                    min={0}
                    max={5}
                    value={customPass}
                    onChange={(e) => setCustomPass(Math.max(0, Math.min(5, Number(e.target.value) || 0)))}
                    className="mt-2 block min-h-10 w-full rounded-xl border border-input bg-card px-3 text-sm outline-none focus-visible:ring-1 focus-visible:ring-ring"
                    data-testid="input-emergency-pass"
                  />
                </div>
              </div>
              <Button type="button" className="w-full" onClick={submitCustom} data-testid="button-submit-custom-plan">
                <Hourglass className="h-4 w-4" aria-hidden="true" />
                Save plan
              </Button>
            </motion.div>
          )}

          <div className="mt-5 rounded-2xl bg-secondary p-3 text-xs text-secondary-foreground" data-testid="card-emergency-pass-info">
            <div className="flex items-start gap-2">
              <Sparkles className="mt-0.5 h-4 w-4" aria-hidden="true" />
              <p>
                <strong>Emergency pass:</strong> a planned, limited bypass for real moments (call from family, work alert). Out of passes = locked.
              </p>
            </div>
          </div>
        </article>
      </div>
    </section>
  );
}
