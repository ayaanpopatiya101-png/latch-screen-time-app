import { useEffect, useState } from "react";
import { CheckCircle2, Flame, Target } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import type { SafeAccount } from "@/lib/auth";
import { dailyGoalCheckIn, fetchDailyReport, type DailyReport } from "@/lib/credits";

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

export function DailyGoalCard({
  account,
  onAccount,
  onToast,
  estimatedMinutesUsed,
}: {
  account: SafeAccount;
  onAccount: (next: SafeAccount) => void;
  onToast: (m: string) => void;
  estimatedMinutesUsed: number;
}) {
  const [busy, setBusy] = useState(false);
  const [report, setReport] = useState<DailyReport | null>(null);
  const checkedInToday = account.profile.lastGoalDay === todayISO();
  const goal = account.profile.dailyGoalMinutes;
  const usedPercent = Math.min(100, Math.round((estimatedMinutesUsed / goal) * 100));

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const r = await fetchDailyReport(account.id);
        if (!cancelled) setReport(r.report);
      } catch {
        // best-effort
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [account.id, account.profile.weeklyPoints]);

  async function handleCheckIn() {
    setBusy(true);
    try {
      const result = await dailyGoalCheckIn(account.id, estimatedMinutesUsed);
      onAccount(result.account);
      onToast(
        result.alreadyCheckedIn
          ? "You already checked in today."
          : result.met
            ? `Goal met. +10 credits, streak ${result.account.profile.streak}.`
            : `Over goal today. Streak nudged. Try a focus sprint to recover.`,
      );
    } catch (err) {
      onToast(err instanceof Error ? err.message : "Could not check in.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <article className="rounded-[2rem] card-premium p-5" data-testid="card-daily-goal">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.18em] text-muted-foreground">daily goal</p>
          <h2 className="mt-2 font-display text-lg font-extrabold tracking-tight">Stay under {goal} min today</h2>
        </div>
        <div className="flex items-center gap-2 rounded-full border border-[hsl(var(--latch-yellow))]/55 bg-[hsl(var(--latch-yellow)/0.25)] px-3 py-1 text-foreground shadow-[0_8px_18px_-12px_hsl(38_80%_38%/0.4)]" data-testid="badge-streak">
          <Flame className="h-4 w-4 text-[hsl(var(--latch-yellow))]" aria-hidden="true" />
          <span className="text-sm font-black tabular-nums">{account.profile.streak} day streak</span>
        </div>
      </div>
      <div className="mt-4 flex items-end justify-between gap-3 text-sm">
        <span className="font-bold">{estimatedMinutesUsed} min used</span>
        <span className="text-muted-foreground">{usedPercent}%</span>
      </div>
      <Progress className="mt-2 h-3" value={usedPercent} data-testid="progress-daily-goal" />
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <Button
          type="button"
          variant={checkedInToday ? "secondary" : "default"}
          onClick={handleCheckIn}
          disabled={busy}
          data-testid="button-daily-checkin"
        >
          <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
          {checkedInToday ? "Checked in" : "Check in for today"}
        </Button>
        <div className="rounded-2xl panel-inset p-3 text-xs text-muted-foreground" data-testid="card-weekly-points">
          <p className="flex items-center gap-2 font-bold text-foreground">
            <Target className="h-4 w-4 text-primary" aria-hidden="true" />
            Weekly points
          </p>
          <p className="mt-1 font-mono text-lg font-black text-foreground tabular-nums">
            {account.profile.weeklyPoints}
          </p>
          {report && (
            <p className="mt-1 text-[11px]">
              +{report.earnedToday} earned today · {report.offlineActionsToday} offline acts
            </p>
          )}
        </div>
      </div>
    </article>
  );
}
