import { useCallback, useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Activity, Lock, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  fetchPatterns,
  formatRange,
  reviewPattern,
  seedDemoEvents,
  type BlockRule,
  type DetectedPattern,
  type PeriodType,
} from "@/lib/patterns";

type Props = {
  accountId: number;
};

const PERIOD_OPTIONS: { label: string; value: PeriodType }[] = [
  { label: "Week", value: "week" },
  { label: "Month", value: "month" },
  { label: "Year", value: "year" },
];

function periodLabel(period: PeriodType): string {
  if (period === "week") return "past week";
  if (period === "month") return "past month";
  return "past year";
}

export function PatternsPage({ accountId }: Props) {
  const [period, setPeriod] = useState<PeriodType>("month");
  const [patterns, setPatterns] = useState<DetectedPattern[]>([]);
  const [blockRules, setBlockRules] = useState<BlockRule[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [seeding, setSeeding] = useState(false);
  const [seedNote, setSeedNote] = useState<string | null>(null);

  const loadPatterns = useCallback(
    async (selectedPeriod: PeriodType) => {
      setLoading(true);
      setError(null);
      try {
        const data = await fetchPatterns(accountId, selectedPeriod);
        setPatterns(data.patterns);
        setBlockRules(data.blockRules);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Could not load patterns.");
      } finally {
        setLoading(false);
      }
    },
    [accountId],
  );

  useEffect(() => {
    void loadPatterns(period);
  }, [period, loadPatterns]);

  async function handleSeed() {
    setSeeding(true);
    setSeedNote(null);
    try {
      const { inserted } = await seedDemoEvents(accountId);
      setSeedNote(`Added ${inserted} demo app open events. Refreshing patterns…`);
      await loadPatterns(period);
    } catch (err) {
      setSeedNote(err instanceof Error ? err.message : "Could not seed demo data.");
    } finally {
      setSeeding(false);
    }
  }

  async function handleReview(
    pattern: DetectedPattern,
    answer: "productive" | "unproductive",
  ) {
    try {
      await reviewPattern(accountId, pattern.patternKey, answer);
      await loadPatterns(period);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save your answer.");
    }
  }

  const sortedPatterns = useMemo(() => patterns, [patterns]);
  const hasAny = sortedPatterns.length > 0;

  return (
    <section className="mx-auto grid max-w-7xl gap-6 px-4 py-6 sm:px-6 lg:grid-cols-[0.85fr_1.15fr] lg:px-8">
      <article className="rounded-[2rem] card-premium p-5" data-testid="section-patterns-intro">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.18em] text-muted-foreground">habit patterns</p>
            <h1 className="mt-2 font-display text-[1.9rem] font-extrabold leading-none tracking-tight">
              When your apps pull you in
            </h1>
            <p className="mt-3 text-sm leading-6 text-muted-foreground">
              Latch watches when you open each app over a week, month, or year. Repeated patterns
              get flagged. Lumi asks you whether the time felt productive. If you say no, Latch
              schedules a block at that same time for the next month.
            </p>
          </div>
          <Activity className="h-5 w-5 text-primary" aria-hidden="true" />
        </div>
        <div className="mt-5 flex flex-wrap gap-2" role="tablist" aria-label="Time window">
          {PERIOD_OPTIONS.map((option) => (
            <button
              key={option.value}
              type="button"
              role="tab"
              aria-selected={period === option.value}
              onClick={() => setPeriod(option.value)}
              className={`rounded-full px-3 py-1.5 text-xs font-bold transition hover-elevate active-elevate-2 ${
                period === option.value
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary text-secondary-foreground"
              }`}
              data-testid={`button-period-${option.value}`}
            >
              {option.label}
            </button>
          ))}
        </div>
        <div className="mt-5 rounded-2xl panel-inset p-4">
          <p className="text-sm font-bold">Need example data?</p>
          <p className="mt-1 text-sm leading-6 text-muted-foreground">
            The web prototype can't read real iPhone or Android app opens. Seed a demo to see how
            this looks once your phone forwards events to Latch.
          </p>
          <Button
            type="button"
            size="sm"
            className="mt-3"
            onClick={handleSeed}
            disabled={seeding}
            data-testid="button-seed-patterns"
          >
            {seeding ? "Seeding…" : "Seed demo opens"}
          </Button>
          {seedNote && (
            <p className="mt-3 text-xs text-muted-foreground" data-testid="text-seed-note">
              {seedNote}
            </p>
          )}
        </div>
        <div className="mt-5 rounded-2xl border border-[hsl(var(--latch-purple))]/25 bg-[hsl(var(--latch-purple)/0.08)] p-4 text-sm leading-6 text-foreground">
          <p className="font-bold">How Latch decides</p>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            <li>Week: opens on at least 4 of the last 7 days at the same 3-hour window.</li>
            <li>Month: opens on 60% of days, or at least 15 days.</li>
            <li>Year: at least 120 days, or 32% of days.</li>
          </ul>
        </div>
      </article>

      <article className="rounded-[2rem] card-premium p-5" data-testid="section-patterns-list">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.18em] text-muted-foreground">
              {periodLabel(period)}
            </p>
            <h2 className="mt-2 font-display text-xl font-extrabold tracking-tight">
              {hasAny ? `${sortedPatterns.length} repeated patterns` : "No patterns yet"}
            </h2>
          </div>
          <Sparkles className="h-5 w-5 text-primary" aria-hidden="true" />
        </div>

        {error && (
          <p className="mt-4 rounded-2xl panel-inset p-4 text-sm text-destructive" data-testid="text-patterns-error">
            {error}
          </p>
        )}

        {!loading && !hasAny && !error && (
          <div className="mt-5 rounded-2xl panel-inset p-5" data-testid="panel-patterns-empty">
            <p className="text-sm font-bold">Nothing repeats yet for the {periodLabel(period)}.</p>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              Once your phone forwards real app open events to Latch (or once you seed demo data),
              Lumi will list the apps you keep opening at the same time each day.
            </p>
          </div>
        )}

        <div className="mt-5 space-y-4">
          {sortedPatterns.map((pattern) => {
            const percent = Math.min(100, (pattern.daysOpened / pattern.totalDays) * 100);
            const blockedRule = blockRules.find(
              (rule) => rule.sourcePatternKey === pattern.patternKey,
            );
            const isBlocked = pattern.status === "blocked" || Boolean(blockedRule);
            const isProductive = pattern.status === "productive";
            const askUser =
              !isBlocked && !isProductive && pattern.productivityUnknown;
            return (
              <motion.div
                key={pattern.patternKey}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="rounded-2xl panel-inset p-4"
                data-testid={`card-pattern-${pattern.patternKey}`}
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-display text-lg font-black tracking-tight">
                      {pattern.appName}
                    </p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {pattern.daysOpened}/{pattern.totalDays} days, usually {formatRange(pattern.hourStart, pattern.hourEnd)}
                    </p>
                  </div>
                  <span
                    className={`rounded-full px-2.5 py-1 text-xs font-black uppercase tracking-[0.16em] ${
                      isBlocked
                        ? "bg-destructive text-destructive-foreground"
                        : isProductive
                          ? "bg-primary text-primary-foreground"
                          : "bg-secondary text-secondary-foreground"
                    }`}
                  >
                    {isBlocked ? "block scheduled" : isProductive ? "productive" : "needs review"}
                  </span>
                </div>
                <Progress className="mt-3 h-2.5" value={percent} data-testid={`progress-pattern-${pattern.patternKey}`} />
                <p className="mt-3 text-sm leading-6 text-muted-foreground">
                  {pattern.explanation}
                </p>
                {pattern.sampleContent.length > 0 && (
                  <p className="mt-2 text-xs text-muted-foreground">
                    Lately: {pattern.sampleContent.slice(0, 3).join(", ")}
                  </p>
                )}

                {askUser && (
                  <div className="mt-4 rounded-2xl border border-[hsl(var(--latch-yellow))]/55 bg-[hsl(var(--latch-yellow)/0.20)] p-3" data-testid={`prompt-pattern-${pattern.patternKey}`}>
                    <p className="text-sm font-bold text-secondary-foreground">
                      {pattern.suggestedQuestion}
                    </p>
                    <p className="mt-1 text-xs text-secondary-foreground/80">
                      Lumi can't tell from this app whether the time was useful. You decide.
                    </p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <Button
                        type="button"
                        size="sm"
                        onClick={() => handleReview(pattern, "productive")}
                        data-testid={`button-review-productive-${pattern.patternKey}`}
                      >
                        Yes, productive
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => handleReview(pattern, "unproductive")}
                        data-testid={`button-review-block-${pattern.patternKey}`}
                      >
                        No, block next month
                      </Button>
                    </div>
                  </div>
                )}

                {!askUser &&
                  !isBlocked &&
                  !isProductive &&
                  pattern.productivity === "unproductive" && (
                    <div className="mt-4 flex flex-wrap gap-2">
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => handleReview(pattern, "productive")}
                        data-testid={`button-review-productive-${pattern.patternKey}`}
                      >
                        Mark productive
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        onClick={() => handleReview(pattern, "unproductive")}
                        data-testid={`button-review-block-${pattern.patternKey}`}
                      >
                        Block next month
                      </Button>
                    </div>
                  )}

                {isBlocked && blockedRule && (
                  <div
                    className="mt-4 flex items-start gap-3 rounded-2xl border border-destructive/30 bg-background p-3"
                    data-testid={`card-block-${pattern.patternKey}`}
                  >
                    <Lock className="mt-0.5 h-4 w-4 text-destructive" aria-hidden="true" />
                    <div>
                      <p className="text-sm font-bold">
                        {pattern.appName} blocked {formatRange(blockedRule.hourStart, blockedRule.hourEnd)}
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        Active until {new Date(blockedRule.activeUntil).toLocaleDateString()}. {blockedRule.reason}
                      </p>
                    </div>
                  </div>
                )}
              </motion.div>
            );
          })}
        </div>

        {blockRules.length > 0 && (
          <div className="mt-6 rounded-2xl panel-inset p-4" data-testid="section-active-blocks">
            <p className="text-sm font-bold">All active block rules</p>
            <ul className="mt-2 space-y-2">
              {blockRules.map((rule) => (
                <li key={rule.id} className="text-xs text-muted-foreground">
                  {rule.appName} · {formatRange(rule.hourStart, rule.hourEnd)} · until{" "}
                  {new Date(rule.activeUntil).toLocaleDateString()}
                </li>
              ))}
            </ul>
          </div>
        )}
      </article>
    </section>
  );
}
