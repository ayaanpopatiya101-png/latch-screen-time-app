/**
 * Anti-Addiction page: surfaces the research-backed tactic library, a
 * personalized plan, and the supporting tools (batch windows, reflection,
 * detox plans, feed audit, bedroom charger, autoplay checklist).
 *
 * Each section maps to one of the ten platform tactics covered in
 * server/antiAddiction.ts. Copy is intentionally concise so users finish
 * each card in under 30 seconds.
 */
import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  Activity,
  AlarmClock,
  BedDouble,
  Book,
  Brain,
  CheckCircle2,
  Circle,
  Clock,
  Filter,
  Lightbulb,
  Lock,
  PauseCircle,
  Sparkles,
  Timer,
  Wind,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import type { SafeAccount } from "@/lib/auth";
import {
  fetchAutoplayChecklist,
  fetchBatchWindows,
  fetchBedroomChargerStreak,
  fetchDetoxPlans,
  fetchPlan,
  fetchReference,
  postBedroomCharger,
  postFeedAudit,
  postReflection,
  saveAutoplayChecklist,
  saveBatchWindows,
  startDetox,
  type AntiAddictionPlan,
  type AutoplayKey,
  type BookRecommendation,
  type DetoxFramework,
  type TacticCard,
} from "@/lib/antiAddiction";

const ALL_AUTOPLAY_KEYS: { key: AutoplayKey; label: string }[] = [
  { key: "notifications_off_non_essential", label: "Turn off all non-essential notifications" },
  { key: "youtube_autoplay_off", label: "YouTube autoplay OFF" },
  { key: "youtube_shorts_hidden", label: "Hide YouTube Shorts shelf" },
  { key: "instagram_reels_muted", label: "Mute Instagram Reels suggestions" },
  { key: "tiktok_restricted_mode", label: "TikTok restricted / digital wellbeing mode" },
  { key: "snapchat_stories_muted", label: "Mute Snapchat For You / Discover" },
  { key: "remove_home_screen_icons", label: "Remove social app icons from home screen" },
  { key: "grayscale_enabled", label: "Enable grayscale mode" },
];

const DETOX_OPTIONS: { value: DetoxFramework; label: string; days: number; description: string }[] = [
  {
    value: "primer_3",
    label: "3-day weekend primer",
    days: 3,
    description: "Friday night to Monday morning. The smallest dose that still shifts your baseline.",
  },
  {
    value: "primer_7",
    label: "7-day starter primer",
    days: 7,
    description: "A full week. Long enough to feel the urge die down without disrupting school or work.",
  },
  {
    value: "lembke_30",
    label: "Lembke 30-day dopamine reset",
    days: 30,
    description: "Stanford psychiatrist Dr. Anna Lembke's clinical protocol from Dopamine Nation.",
  },
  {
    value: "newport_30",
    label: "Newport Digital Minimalism",
    days: 30,
    description: "Eliminate optional tech for 30 days, then reintroduce only what genuinely adds value.",
  },
  {
    value: "price_30",
    label: "Price 30-day phone breakup",
    days: 30,
    description: "Catherine Price's structured 30-day action plan with daily habit techniques.",
  },
];

function minutesToHHMM(m: number): string {
  const h = Math.floor(m / 60);
  const mm = m % 60;
  return `${String(h).padStart(2, "0")}:${String(mm).padStart(2, "0")}`;
}

type Props = {
  account: SafeAccount;
  onClose: () => void;
};

export function AntiAddictionPage({ account, onClose }: Props) {
  const accountId = account.id;
  const [plan, setPlan] = useState<AntiAddictionPlan | null>(null);
  const [tactics, setTactics] = useState<TacticCard[]>([]);
  const [books, setBooks] = useState<BookRecommendation[]>([]);
  const [autoplay, setAutoplay] = useState<Record<AutoplayKey, boolean>>(() => {
    const init: Record<string, boolean> = {};
    for (const a of ALL_AUTOPLAY_KEYS) init[a.key] = false;
    return init as Record<AutoplayKey, boolean>;
  });
  const [autoplayScore, setAutoplayScore] = useState(0);
  const [chargerStreak, setChargerStreak] = useState(0);
  const [detoxPlans, setDetoxPlans] = useState<
    Array<{ id: number; label: string; active: boolean; progress: { dayNumber: number; totalDays: number; ratio: number; complete: boolean } }>
  >([]);
  const [batchWindowsMsg, setBatchWindowsMsg] = useState("");
  const [reflectionResult, setReflectionResult] = useState<null | {
    question: string;
    offlineSwap: { activity: string; minutes: number; reason: string };
  }>(null);
  const [auditStatus, setAuditStatus] = useState("");
  const [feedAuditCount, setFeedAuditCount] = useState(5);
  const [feedAuditPlatform, setFeedAuditPlatform] = useState("Instagram");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [p, ref, ap, st, dp] = await Promise.all([
          fetchPlan(accountId),
          fetchReference(),
          fetchAutoplayChecklist(accountId),
          fetchBedroomChargerStreak(accountId),
          fetchDetoxPlans(accountId),
        ]);
        if (cancelled) return;
        setPlan(p);
        setTactics(ref.tactics);
        setBooks(ref.books);
        if (ap.checklist) {
          const init: Record<string, boolean> = { ...autoplay };
          for (const t of ap.checklist.toggles) init[t.key] = t.done;
          setAutoplay(init as Record<AutoplayKey, boolean>);
          setAutoplayScore(ap.checklist.scorePercent);
        }
        setChargerStreak(st.currentStreak);
        setDetoxPlans(dp.plans);
      } catch (err) {
        console.warn("AntiAddictionPage load error", err);
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accountId]);

  async function handleAutoplayToggle(key: AutoplayKey) {
    const next = { ...autoplay, [key]: !autoplay[key] };
    setAutoplay(next);
    const toggles = ALL_AUTOPLAY_KEYS.map((a) => ({ key: a.key, done: next[a.key] }));
    try {
      const result = await saveAutoplayChecklist({ accountId, toggles });
      setAutoplayScore(result.scorePercent);
    } catch (err) {
      console.warn("autoplay save failed", err);
    }
  }

  async function handleStartDetox(framework: DetoxFramework) {
    try {
      await startDetox({
        accountId,
        framework,
        startedAt: new Date().toISOString(),
        bannedApps: account.profile.topApps,
      });
      const dp = await fetchDetoxPlans(accountId);
      setDetoxPlans(dp.plans);
    } catch (err) {
      console.warn("start detox failed", err);
    }
  }

  async function handleChargerPledge(yes: boolean) {
    try {
      await postBedroomCharger({
        accountId,
        chargedOutsideBedroom: yes,
        bedtimeIso: new Date().toISOString(),
      });
      const st = await fetchBedroomChargerStreak(accountId);
      setChargerStreak(st.currentStreak);
    } catch (err) {
      console.warn("charger pledge failed", err);
    }
  }

  async function handleFeedAudit() {
    try {
      const result = await postFeedAudit({
        accountId,
        action: "unfollow",
        platform: feedAuditPlatform,
        count: feedAuditCount,
      });
      setAuditStatus(`+${result.creditsAwarded} Latch Credits for ${feedAuditCount} unfollows on ${feedAuditPlatform}.`);
    } catch (err) {
      console.warn("feed audit failed", err);
      setAuditStatus("Could not record audit. Please try again.");
    }
  }

  async function handleSaveDefaultWindows() {
    try {
      // Default = the Scripps "check apps at set times" recommendation: 12:00
      // and 18:00, 30 minutes each.
      await saveBatchWindows(
        accountId,
        [
          { startMinute: 12 * 60, endMinute: 12 * 60 + 30, label: "Lunch check-in" },
          { startMinute: 18 * 60, endMinute: 18 * 60 + 30, label: "Evening check-in" },
        ],
        account.profile.topApps,
      );
      setBatchWindowsMsg("Saved. Apps will be locked outside 12:00-12:30 and 18:00-18:30.");
    } catch (err) {
      console.warn("save windows failed", err);
      setBatchWindowsMsg("Could not save windows. Please try again.");
    }
  }

  async function handleReflection() {
    try {
      const res = await postReflection({
        accountId,
        appName: account.profile.topApps[0] ?? "Instagram",
        intention: "Quick check, then close.",
        breathSeconds: 8,
      });
      setReflectionResult(res);
    } catch (err) {
      console.warn("reflection failed", err);
    }
  }

  const detoxOption = useMemo(
    () => DETOX_OPTIONS.find((o) => o.value === plan?.recommendedDetox.framework) ?? null,
    [plan],
  );

  return (
    <div className="min-h-screen bg-[#0E1A14] text-stone-100">
      <div className="mx-auto max-w-4xl px-4 py-8">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight">Why apps hook you</h1>
            <p className="mt-1 text-sm text-stone-400">
              Ten tactics platforms use, plus the exact counter-move for each. Backed by Stanford psychiatry, AAP guidance, and the Crisis Text Line research base.
            </p>
          </div>
          <Button variant="ghost" onClick={onClose}>
            Back
          </Button>
        </div>

        {plan && (
          <motion.section
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8 rounded-2xl bg-gradient-to-br from-emerald-900/40 to-amber-900/20 p-6 ring-1 ring-emerald-700/30"
          >
            <div className="mb-2 flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-amber-300" />
              <h2 className="text-lg font-medium">Today&apos;s tactic</h2>
            </div>
            <p className="text-xl font-semibold">{plan.tacticOfTheDay.tactic}</p>
            <p className="mt-2 text-sm text-stone-300">{plan.tacticOfTheDay.description}</p>
            <p className="mt-3 rounded-lg bg-black/30 p-3 text-sm">
              <span className="font-medium text-emerald-300">Counter:</span> {plan.tacticOfTheDay.counter}
            </p>
            <p className="mt-2 text-xs text-stone-500">Source: {plan.tacticOfTheDay.sourceHint}</p>
          </motion.section>
        )}

        {plan && (
          <section className="mb-8 rounded-2xl bg-stone-900/60 p-6 ring-1 ring-stone-700/40">
            <div className="mb-2 flex items-center gap-2">
              <Lightbulb className="h-5 w-5 text-amber-300" />
              <h2 className="text-lg font-medium">Reflection</h2>
            </div>
            <p className="text-sm text-stone-300">{plan.reflectionQuestion}</p>
            <Button onClick={handleReflection} className="mt-3 bg-amber-500 text-stone-900 hover:bg-amber-400">
              <PauseCircle className="mr-2 h-4 w-4" /> Log my intention
            </Button>
            {reflectionResult && (
              <div className="mt-3 rounded-lg bg-black/30 p-3 text-sm">
                <p className="font-medium">{reflectionResult.question}</p>
                <p className="mt-2 text-stone-300">
                  Try instead: <span className="text-emerald-300">{reflectionResult.offlineSwap.activity}</span> ({reflectionResult.offlineSwap.minutes} min).
                </p>
                <p className="mt-1 text-xs text-stone-500">{reflectionResult.offlineSwap.reason}</p>
              </div>
            )}
          </section>
        )}

        {detoxOption && plan && (
          <section className="mb-8 rounded-2xl bg-stone-900/60 p-6 ring-1 ring-stone-700/40">
            <div className="mb-2 flex items-center gap-2">
              <Brain className="h-5 w-5 text-fuchsia-300" />
              <h2 className="text-lg font-medium">Recommended for you</h2>
            </div>
            <p className="text-base font-semibold">{detoxOption.label}</p>
            <p className="mt-2 text-sm text-stone-300">{plan.recommendedDetox.rationale}</p>
            <Button
              onClick={() => handleStartDetox(detoxOption.value)}
              className="mt-3 bg-fuchsia-500 text-white hover:bg-fuchsia-400"
            >
              Start {detoxOption.days}-day plan
            </Button>
            {detoxPlans.filter((p) => p.active).map((p) => (
              <div key={p.id} className="mt-4 rounded-lg bg-black/30 p-3">
                <div className="flex items-center justify-between text-sm">
                  <span>{p.label}</span>
                  <span className="text-stone-400">
                    Day {p.progress.dayNumber} of {p.progress.totalDays}
                  </span>
                </div>
                <Progress value={Math.round(p.progress.ratio * 100)} className="mt-2" />
              </div>
            ))}
          </section>
        )}

        <section className="mb-8 grid gap-4 md:grid-cols-2">
          {/* Batch windows */}
          <div className="rounded-2xl bg-stone-900/60 p-5 ring-1 ring-stone-700/40">
            <div className="mb-2 flex items-center gap-2">
              <AlarmClock className="h-5 w-5 text-cyan-300" />
              <h3 className="font-medium">Batch-check windows</h3>
            </div>
            <p className="text-sm text-stone-300">
              Removes the variable-reward loop by checking apps only at set times. Default: 12:00 and 18:00, 30 minutes each.
            </p>
            <Button
              onClick={handleSaveDefaultWindows}
              className="mt-3 bg-cyan-500 text-stone-900 hover:bg-cyan-400"
            >
              <Clock className="mr-2 h-4 w-4" /> Use default windows
            </Button>
            {batchWindowsMsg && <p className="mt-2 text-xs text-stone-400">{batchWindowsMsg}</p>}
          </div>

          {/* Bedroom charger */}
          <div className="rounded-2xl bg-stone-900/60 p-5 ring-1 ring-stone-700/40">
            <div className="mb-2 flex items-center gap-2">
              <BedDouble className="h-5 w-5 text-indigo-300" />
              <h3 className="font-medium">Bedroom charger pledge</h3>
            </div>
            <p className="text-sm text-stone-300">
              Charging your phone outside the bedroom kills the late-night scroll loop. Streak:{" "}
              <span className="font-medium text-emerald-300">{chargerStreak} nights</span>.
            </p>
            <div className="mt-3 flex gap-2">
              <Button onClick={() => handleChargerPledge(true)} className="bg-emerald-500 text-stone-900 hover:bg-emerald-400">
                Yes, tonight
              </Button>
              <Button variant="ghost" onClick={() => handleChargerPledge(false)}>
                Not tonight
              </Button>
            </div>
          </div>

          {/* Feed audit */}
          <div className="rounded-2xl bg-stone-900/60 p-5 ring-1 ring-stone-700/40">
            <div className="mb-2 flex items-center gap-2">
              <Filter className="h-5 w-5 text-rose-300" />
              <h3 className="font-medium">Feed audit</h3>
            </div>
            <p className="text-sm text-stone-300">
              Unfollow accounts that don&apos;t serve you. Earn Latch Credits for every batch.
            </p>
            <div className="mt-3 flex items-end gap-2">
              <label className="flex-1 text-xs text-stone-400">
                Platform
                <select
                  value={feedAuditPlatform}
                  onChange={(e) => setFeedAuditPlatform(e.target.value)}
                  className="mt-1 w-full rounded-md bg-stone-800 p-2 text-sm text-stone-100"
                >
                  <option>Instagram</option>
                  <option>TikTok</option>
                  <option>YouTube</option>
                  <option>Snapchat</option>
                  <option>X</option>
                </select>
              </label>
              <label className="w-24 text-xs text-stone-400">
                Count
                <input
                  type="number"
                  min={1}
                  max={500}
                  value={feedAuditCount}
                  onChange={(e) => setFeedAuditCount(Number(e.target.value) || 0)}
                  className="mt-1 w-full rounded-md bg-stone-800 p-2 text-sm text-stone-100"
                />
              </label>
            </div>
            <Button onClick={handleFeedAudit} className="mt-3 bg-rose-500 text-white hover:bg-rose-400">
              Log unfollows
            </Button>
            {auditStatus && <p className="mt-2 text-xs text-emerald-300">{auditStatus}</p>}
          </div>

          {/* Autoplay checklist */}
          <div className="rounded-2xl bg-stone-900/60 p-5 ring-1 ring-stone-700/40">
            <div className="mb-2 flex items-center gap-2">
              <Lock className="h-5 w-5 text-amber-300" />
              <h3 className="font-medium">Autoplay-off checklist</h3>
            </div>
            <p className="text-sm text-stone-300">
              Each toggle disables a rabbit-hole feature inside a real social app.
            </p>
            <ul className="mt-3 space-y-2">
              {ALL_AUTOPLAY_KEYS.map((a) => (
                <li key={a.key}>
                  <button
                    onClick={() => handleAutoplayToggle(a.key)}
                    className="flex w-full items-center gap-2 rounded-md p-2 text-left text-sm hover:bg-stone-800"
                  >
                    {autoplay[a.key] ? (
                      <CheckCircle2 className="h-4 w-4 flex-shrink-0 text-emerald-400" />
                    ) : (
                      <Circle className="h-4 w-4 flex-shrink-0 text-stone-500" />
                    )}
                    <span className={autoplay[a.key] ? "text-stone-200" : "text-stone-400"}>{a.label}</span>
                  </button>
                </li>
              ))}
            </ul>
            <div className="mt-3">
              <Progress value={autoplayScore} />
              <p className="mt-1 text-xs text-stone-500">{autoplayScore}% complete</p>
            </div>
          </div>
        </section>

        {/* Quick wins */}
        {plan && (
          <section className="mb-8 rounded-2xl bg-stone-900/60 p-6 ring-1 ring-stone-700/40">
            <div className="mb-2 flex items-center gap-2">
              <Activity className="h-5 w-5 text-emerald-300" />
              <h2 className="text-lg font-medium">Quick wins (start here)</h2>
            </div>
            <ol className="ml-4 list-decimal space-y-2 text-sm text-stone-300">
              {plan.quickWins.map((q, idx) => (
                <li key={idx}>{q}</li>
              ))}
            </ol>
          </section>
        )}

        {/* Tactic library */}
        <section className="mb-8">
          <div className="mb-3 flex items-center gap-2">
            <Brain className="h-5 w-5 text-amber-300" />
            <h2 className="text-lg font-medium">Full tactic library</h2>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            {tactics.map((t) => (
              <div key={t.id} className="rounded-2xl bg-stone-900/60 p-5 ring-1 ring-stone-700/40">
                <p className="font-medium">{t.tactic}</p>
                <p className="mt-2 text-sm text-stone-300">{t.description}</p>
                <p className="mt-3 rounded-md bg-black/30 p-2 text-sm">
                  <span className="font-medium text-emerald-300">Counter:</span> {t.counter}
                </p>
                <p className="mt-2 text-xs text-stone-500">{t.sourceHint}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Book recommendations */}
        <section className="mb-12">
          <div className="mb-3 flex items-center gap-2">
            <Book className="h-5 w-5 text-amber-300" />
            <h2 className="text-lg font-medium">Recommended books</h2>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            {books.map((b) => (
              <div key={b.id} className="rounded-2xl bg-stone-900/60 p-5 ring-1 ring-stone-700/40">
                <p className="font-medium">{b.title}</p>
                <p className="text-xs text-stone-500">{b.author}</p>
                <p className="mt-2 text-sm text-stone-300">{b.why}</p>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
