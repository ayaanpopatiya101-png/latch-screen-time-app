import { useEffect, useState } from "react";
import { Calendar, ChartLine, Sparkles } from "lucide-react";
import type { SafeAccount } from "@/lib/auth";
import { fetchDailyReport, type DailyReport } from "@/lib/credits";

export function DailyReportCard({ account }: { account: SafeAccount }) {
  const [report, setReport] = useState<DailyReport | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const r = await fetchDailyReport(account.id);
        if (!cancelled) setReport(r.report);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "Could not load report.");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [account.id, account.profile.latchCredits, account.profile.unlockMinutes]);

  return (
    <article className="rounded-[2rem] bg-card p-5 shadow-sm" data-testid="card-daily-report">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.18em] text-muted-foreground">daily / weekly report</p>
          <h2 className="mt-2 font-display text-lg font-extrabold tracking-tight">Your numbers, simply</h2>
        </div>
        <ChartLine className="h-5 w-5 text-primary" aria-hidden="true" />
      </div>
      {!report && !error && (
        <p className="mt-3 text-sm text-muted-foreground">Loading report…</p>
      )}
      {error && <p className="mt-3 text-sm text-rose-500">{error}</p>}
      {report && (
        <div className="mt-4 grid gap-3 sm:grid-cols-3" data-testid="grid-report-stats">
          <div className="rounded-2xl bg-background p-3">
            <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.16em] text-muted-foreground">
              <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
              earned today
            </p>
            <p className="mt-1 font-mono text-lg font-black tabular-nums">+{report.earnedToday}</p>
            <p className="text-[11px] text-muted-foreground">credits banked</p>
          </div>
          <div className="rounded-2xl bg-background p-3">
            <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.16em] text-muted-foreground">
              <Calendar className="h-3.5 w-3.5" aria-hidden="true" />
              this week
            </p>
            <p className="mt-1 font-mono text-lg font-black tabular-nums">+{report.earnedThisWeek}</p>
            <p className="text-[11px] text-muted-foreground">7-day credits</p>
          </div>
          <div className="rounded-2xl bg-background p-3">
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-muted-foreground">minutes saved</p>
            <p className="mt-1 font-mono text-lg font-black tabular-nums">{report.minutesSavedToday}m</p>
            <p className="text-[11px] text-muted-foreground">est. today</p>
          </div>
        </div>
      )}
    </article>
  );
}
