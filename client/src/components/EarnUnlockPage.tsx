import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  Activity,
  BookOpen,
  Coffee,
  Dumbbell,
  Heart,
  Pencil,
  Smile,
  Sparkles,
  Sprout,
  Unlock,
  Wind,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import type { SafeAccount } from "@/lib/auth";
import {
  earnCredits,
  fetchDailyReport,
  listLedger,
  spendCredits,
  type CreditSource,
  type DailyReport,
  type LedgerEntry,
} from "@/lib/credits";

type EarnActivity = {
  id: CreditSource;
  title: string;
  description: string;
  credits: number;
  icon: typeof Sprout;
  minutes: number;
};

const earnActivities: EarnActivity[] = [
  { id: "walk", title: "Take a 10 min walk", description: "Real-world dopamine. Eyes off the screen.", credits: 10, icon: Sprout, minutes: 10 },
  { id: "breathing", title: "60-sec breathing", description: "Slow inhale for 4, hold 4, out 6. Reset your nervous system.", credits: 6, icon: Wind, minutes: 1 },
  { id: "journal", title: "Two-line journal", description: "Write what felt good and what felt hard.", credits: 8, icon: Pencil, minutes: 3 },
  { id: "workout", title: "Quick workout", description: "Push-ups, squats, or a stretch flow.", credits: 14, icon: Dumbbell, minutes: 12 },
  { id: "gratitude", title: "Three thank-yous", description: "Name three small things you appreciate today.", credits: 6, icon: Smile, minutes: 2 },
  { id: "homework", title: "Homework block", description: "Knock out one assignment without your phone.", credits: 18, icon: BookOpen, minutes: 25 },
  { id: "read", title: "Read 5 pages", description: "Switch from infinite scroll to a finite story.", credits: 10, icon: Coffee, minutes: 10 },
  { id: "friend", title: "Text a real friend", description: "One real connection beats a hundred likes.", credits: 8, icon: Heart, minutes: 4 },
];

const unlockBundles = [
  { id: "5min", minutes: 5, label: "5 mindful minutes" },
  { id: "10min", minutes: 10, label: "10 minute window" },
  { id: "20min", minutes: 20, label: "20 minute reset" },
];

function sourceLabel(source: string): string {
  const map: Record<string, string> = {
    walk: "Walk",
    workout: "Workout",
    breathing: "Breathing",
    journal: "Journal",
    gratitude: "Gratitude",
    homework: "Homework",
    read: "Reading",
    friend: "Real friend",
    focus_complete: "Focus block",
    shield_skip: "Shield skip",
    daily_goal: "Daily goal",
    unlock: "App unlock",
  };
  return map[source] || source;
}

function timeAgo(iso: string): string {
  const now = Date.now();
  const then = new Date(iso).getTime();
  const sec = Math.max(0, Math.round((now - then) / 1000));
  if (sec < 60) return `${sec}s`;
  const min = Math.round(sec / 60);
  if (min < 60) return `${min}m`;
  const hr = Math.round(min / 60);
  if (hr < 24) return `${hr}h`;
  const day = Math.round(hr / 24);
  return `${day}d`;
}

export function EarnUnlockPage({
  account,
  onAccount,
  onToast,
}: {
  account: SafeAccount;
  onAccount: (next: SafeAccount) => void;
  onToast: (message: string) => void;
}) {
  const [busy, setBusy] = useState<string | null>(null);
  const [ledger, setLedger] = useState<LedgerEntry[]>([]);
  const [report, setReport] = useState<DailyReport | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const [l, r] = await Promise.all([listLedger(account.id, 12), fetchDailyReport(account.id)]);
        if (cancelled) return;
        setLedger(l.ledger);
        setReport(r.report);
        onAccount(r.account);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "Could not load credits.");
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [account.id]);

  async function refresh() {
    try {
      const [l, r] = await Promise.all([listLedger(account.id, 12), fetchDailyReport(account.id)]);
      setLedger(l.ledger);
      setReport(r.report);
      onAccount(r.account);
    } catch {
      // ignore — UI continues
    }
  }

  async function handleEarn(activity: EarnActivity) {
    setBusy(activity.id);
    setError(null);
    try {
      const result = await earnCredits({
        accountId: account.id,
        source: activity.id,
        amount: activity.credits,
        note: activity.title,
      });
      onAccount(result.account);
      onToast(`+${activity.credits} Latch Credits for ${activity.title.toLowerCase()}.`);
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Earn failed.");
    } finally {
      setBusy(null);
    }
  }

  async function handleSpend(minutes: number) {
    const id = `spend-${minutes}`;
    setBusy(id);
    setError(null);
    try {
      const result = await spendCredits({ accountId: account.id, minutes });
      onAccount(result.account);
      onToast(`Unlocked ${minutes} guilt-free minutes. Use them on purpose.`);
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Not enough credits.");
    } finally {
      setBusy(null);
    }
  }

  const credits = account.profile.latchCredits;
  const unlockMinutes = account.profile.unlockMinutes;
  const energy = account.profile.brainEnergy;
  const energyColor = energy >= 70 ? "text-green-reward" : energy >= 40 ? "text-yellow-energy" : "text-rose-500";
  const energyLabel = energy >= 70 ? "Charged" : energy >= 40 ? "Recovering" : "Drained";

  const todayEarned = report?.earnedToday ?? 0;
  const todaySpent = report?.spentToday ?? 0;
  const offlineCount = report?.offlineActionsToday ?? 0;

  const recommended = useMemo(() => {
    const completedSources = new Set(
      ledger.filter((e) => e.kind === "earn").map((e) => e.source).slice(0, 6),
    );
    return earnActivities.filter((a) => !completedSources.has(a.id)).slice(0, 2).map((a) => a.id);
  }, [ledger]);

  return (
    <section id="earn" className="mx-auto grid max-w-7xl gap-6 px-4 py-6 sm:px-6 lg:grid-cols-[1.05fr_0.95fr] lg:px-8" data-testid="section-earn-unlock">
      <article className="rounded-[2rem] bg-card p-5 shadow-sm sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.18em] text-muted-foreground">earn &amp; unlock</p>
            <h1 className="mt-2 font-display text-[2rem] font-extrabold leading-none tracking-tight">Real life pays for screen time.</h1>
            <p className="mt-3 max-w-xl text-sm leading-6 text-muted-foreground">
              Latch Credits are earned by doing offline things your brain likes. Spend them for guilt-free, capped app windows.
            </p>
          </div>
          <div className="grid gap-2 text-right">
            <div className="rounded-2xl surface-lime px-4 py-3 shadow-sm" data-testid="card-latch-credits">
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[hsl(var(--latch-night))]/70">credits</p>
              <p className="font-display text-2xl font-black tabular-nums">{credits}</p>
            </div>
            <div className="rounded-2xl surface-purple px-4 py-2 shadow-sm" data-testid="card-unlock-minutes">
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-cream-muted">banked unlock</p>
              <p className="font-mono text-lg font-black tabular-nums">{unlockMinutes} min</p>
            </div>
          </div>
        </div>

        <div className="mt-6 rounded-[1.5rem] surface-night p-5 shadow-sm" data-testid="card-brain-energy">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Zap className={`h-5 w-5 ${energyColor}`} aria-hidden="true" />
              <p className="font-bold text-cream">Brain energy</p>
            </div>
            <span className={`font-mono text-lg font-black tabular-nums ${energyColor}`} data-testid="text-brain-energy">{energy}%</span>
          </div>
          <Progress className="mt-3 h-3" value={energy} data-testid="progress-brain-energy" />
          <p className="mt-3 text-xs text-cream-muted">
            {energyLabel}. Offline actions charge you up. Long unlock spends drain you a little — by design.
          </p>
        </div>

        <div className="mt-6 grid gap-3 sm:grid-cols-3" data-testid="card-earn-summary">
          <div className="rounded-2xl bg-secondary p-3 text-secondary-foreground">
            <p className="text-xs font-black uppercase tracking-[0.16em]">earned today</p>
            <p className="mt-1 font-mono text-lg font-black tabular-nums">+{todayEarned}</p>
          </div>
          <div className="rounded-2xl bg-secondary p-3 text-secondary-foreground">
            <p className="text-xs font-black uppercase tracking-[0.16em]">spent today</p>
            <p className="mt-1 font-mono text-lg font-black tabular-nums">-{todaySpent}</p>
          </div>
          <div className="rounded-2xl bg-secondary p-3 text-secondary-foreground">
            <p className="text-xs font-black uppercase tracking-[0.16em]">offline acts</p>
            <p className="mt-1 font-mono text-lg font-black tabular-nums">{offlineCount}</p>
          </div>
        </div>

        <p className="mt-6 text-xs font-black uppercase tracking-[0.18em] text-muted-foreground">earn credits</p>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          {earnActivities.map((activity) => {
            const Icon = activity.icon;
            const isBusy = busy === activity.id;
            const recommend = recommended.includes(activity.id);
            return (
              <button
                key={activity.id}
                type="button"
                disabled={isBusy}
                onClick={() => handleEarn(activity)}
                className="group rounded-2xl bg-background p-4 text-left transition hover-elevate active-elevate-2 disabled:opacity-60"
                data-testid={`button-earn-${activity.id}`}
              >
                <div className="flex items-start justify-between gap-3">
                  <Icon className="h-5 w-5 text-primary" aria-hidden="true" />
                  <span className="rounded-full bg-secondary px-2.5 py-1 text-xs font-black text-secondary-foreground">
                    +{activity.credits}
                  </span>
                </div>
                <p className="mt-4 font-bold">
                  {activity.title}
                  {recommend && (
                    <span className="ml-2 rounded-full bg-primary/15 px-2 py-0.5 text-[10px] font-black uppercase tracking-[0.16em] text-primary">
                      for you
                    </span>
                  )}
                </p>
                <p className="mt-1 text-xs leading-5 text-muted-foreground">{activity.description}</p>
                <p className="mt-2 text-[11px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
                  {activity.minutes} min · simulated proof
                </p>
              </button>
            );
          })}
        </div>
        <p className="mt-3 text-[11px] leading-5 text-muted-foreground">
          Prototype note: the mobile app proves activities with motion + camera. The web prototype trusts your tap.
        </p>
      </article>

      <aside className="grid gap-4">
        <article className="rounded-[2rem] bg-card p-5 shadow-sm" data-testid="section-spend-unlock">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.18em] text-muted-foreground">spend credits</p>
              <h2 className="mt-2 font-display text-xl font-extrabold tracking-tight">Unlock on purpose</h2>
            </div>
            <Unlock className="h-5 w-5 text-primary" aria-hidden="true" />
          </div>
          <p className="mt-3 text-sm leading-6 text-muted-foreground">
            Each minute costs <strong>2 credits</strong>. When the timer ends, the app closes. Guilt-free, on your terms.
          </p>
          <div className="mt-4 grid gap-3">
            {unlockBundles.map((bundle) => {
              const cost = bundle.minutes * 2;
              const canAfford = credits >= cost;
              const isBusy = busy === `spend-${bundle.minutes}`;
              return (
                <div key={bundle.id} className="rounded-2xl bg-background p-4" data-testid={`card-unlock-${bundle.id}`}>
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="font-bold">{bundle.label}</p>
                      <p className="text-xs text-muted-foreground">{cost} credits</p>
                    </div>
                    <Button
                      type="button"
                      size="sm"
                      variant={canAfford ? "default" : "outline"}
                      disabled={!canAfford || isBusy}
                      onClick={() => handleSpend(bundle.minutes)}
                      data-testid={`button-spend-${bundle.id}`}
                    >
                      {canAfford ? "Spend" : "Locked"}
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
          {error && (
            <p className="mt-3 text-xs font-bold text-rose-500" data-testid="text-earn-error">{error}</p>
          )}
        </article>

        <article className="rounded-[2rem] bg-card p-5 shadow-sm" data-testid="section-ledger">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.18em] text-muted-foreground">ledger</p>
              <h2 className="mt-2 font-display text-xl font-extrabold tracking-tight">Earn / spend history</h2>
            </div>
            <Activity className="h-5 w-5 text-primary" aria-hidden="true" />
          </div>
          <div className="mt-4 space-y-2" data-testid="list-ledger">
            {ledger.length === 0 && (
              <p className="rounded-2xl bg-background p-4 text-sm text-muted-foreground">
                No activity yet. Earn one credit and the loop starts here.
              </p>
            )}
            {ledger.map((entry) => (
              <motion.div
                key={entry.id}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center justify-between gap-3 rounded-2xl bg-background p-3"
                data-testid={`row-ledger-${entry.id}`}
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold">
                    {entry.kind === "earn" ? "+" : ""}
                    {entry.amount} · {sourceLabel(entry.source)}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">{entry.note || "Latch loop"}</p>
                </div>
                <span className="shrink-0 text-xs font-bold text-muted-foreground">{timeAgo(entry.createdAt)} ago</span>
              </motion.div>
            ))}
          </div>
        </article>

        <article className="rounded-[2rem] bg-card p-5 shadow-sm" data-testid="section-loop-diagram">
          <p className="text-xs font-black uppercase tracking-[0.18em] text-muted-foreground">how the loop works</p>
          <h2 className="mt-2 font-display text-xl font-extrabold tracking-tight">Live first, scroll second</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <div className="rounded-2xl bg-background p-3 text-center">
              <Sparkles className="mx-auto h-5 w-5 text-primary" aria-hidden="true" />
              <p className="mt-2 text-sm font-bold">Do a thing</p>
              <p className="mt-1 text-xs text-muted-foreground">Walk, breathe, study, journal.</p>
            </div>
            <div className="rounded-2xl bg-background p-3 text-center">
              <Zap className="mx-auto h-5 w-5 text-primary" aria-hidden="true" />
              <p className="mt-2 text-sm font-bold">Earn credits</p>
              <p className="mt-1 text-xs text-muted-foreground">Real-life action becomes points.</p>
            </div>
            <div className="rounded-2xl bg-background p-3 text-center">
              <Unlock className="mx-auto h-5 w-5 text-primary" aria-hidden="true" />
              <p className="mt-2 text-sm font-bold">Spend on time</p>
              <p className="mt-1 text-xs text-muted-foreground">Buy short, capped app windows.</p>
            </div>
          </div>
        </article>
      </aside>
    </section>
  );
}
