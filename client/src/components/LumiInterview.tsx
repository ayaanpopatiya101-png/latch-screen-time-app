import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  Sparkles,
  Send,
  ChevronRight,
  SkipForward,
  Trophy,
  Wand2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { LumiAvatar, type LumiMood } from "@/components/LumiAvatar";
import {
  QUESTION_BANK,
  applyAnswer,
  celebrationFor,
  initialState,
  lumiMoodForAnswer,
  pickNextQuestion,
  planPower,
  riskSignal,
  summarize,
  type EngineState,
  type InterviewProfile,
  type Question,
} from "@/lib/questionEngine";

type Bubble =
  | { kind: "lumi"; id: string; text: string; mood?: LumiMood }
  | { kind: "user"; id: string; text: string }
  | { kind: "system"; id: string; text: string };

type LumiInterviewProps = {
  initialProfile: Partial<InterviewProfile>;
  initialAnswers?: Record<string, unknown>;
  onComplete: (state: EngineState, summary: ReturnType<typeof summarize>) => void;
  onProgress?: (state: EngineState, power: number) => void;
  onSkipToClassic?: () => void;
  introOverride?: string;
};

export function LumiInterview({
  initialProfile,
  initialAnswers,
  onComplete,
  onProgress,
  onSkipToClassic,
  introOverride,
}: LumiInterviewProps) {
  const [state, setState] = useState<EngineState>(() => {
    const base = initialState(initialProfile);
    // Seed previously answered ids so we don't re-ask them.
    if (initialAnswers) {
      let next = base;
      for (const [qid, ans] of Object.entries(initialAnswers)) {
        const q = QUESTION_BANK.find((qq) => qq.id === qid);
        if (q && ans !== undefined && ans !== null) {
          next = applyAnswer(next, qid, ans);
        }
      }
      return next;
    }
    return base;
  });

  const [bubbles, setBubbles] = useState<Bubble[]>(() => [
    {
      kind: "lumi",
      id: "intro",
      mood: "wave",
      text:
        introOverride ??
        `Hi! I'm Lumi. I'll ask you a few quick questions so I can build a phone plan that actually fits you. Honest answers = stronger plan. Ready?`,
    },
  ]);

  const [current, setCurrent] = useState<Question | null>(() => pickNextQuestion(state));
  const [draftText, setDraftText] = useState("");
  const [draftMulti, setDraftMulti] = useState<string[]>([]);
  const [draftSingle, setDraftSingle] = useState<string>("");
  const [draftSlider, setDraftSlider] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [completed, setCompleted] = useState(false);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const mountedRef = useRef(false);

  const power = useMemo(() => planPower(state), [state]);
  const risk = useMemo(() => riskSignal(state.profile), [state.profile]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [bubbles.length]);

  useEffect(() => {
    onProgress?.(state, power);
  }, [state, power, onProgress]);

  // Push the first real question after a small intro tick.
  useEffect(() => {
    if (mountedRef.current) return;
    mountedRef.current = true;
    if (current) {
      const q = current;
      window.setTimeout(() => {
        setBubbles((prev) => [
          ...prev,
          { kind: "lumi", id: `q-${q.id}`, mood: "coach", text: q.prompt },
        ]);
      }, 350);
    }
  }, [current]);

  // Reset draft when the active question changes.
  useEffect(() => {
    setDraftText("");
    setDraftMulti([]);
    setDraftSingle("");
    if (current?.type === "hours_slider") {
      setDraftSlider(current.id === "currentHours" ? 5 : current.id === "goalHours" ? 2 : (current.min ?? 1));
    } else if (current?.type === "scale") {
      setDraftSlider(Math.round(((current.min ?? 1) + (current.max ?? 5)) / 2));
    } else {
      setDraftSlider(null);
    }
  }, [current?.id]);

  const askNext = useCallback(
    (next: Question | null) => {
      if (!next) {
        setCurrent(null);
        return;
      }
      window.setTimeout(() => {
        setBubbles((prev) => [
          ...prev,
          { kind: "lumi", id: `q-${next.id}-${prev.length}`, mood: "coach", text: next.prompt },
        ]);
        setCurrent(next);
        setBusy(false);
      }, 480);
    },
    [],
  );

  function answerLabel(question: Question, answer: unknown): string {
    if (Array.isArray(answer)) {
      const labels = answer.map((value) => {
        const opt = question.options?.find((o) => o.value === value);
        return opt?.label ?? String(value);
      });
      return labels.join(", ") || "—";
    }
    if (question.options) {
      const opt = question.options.find((o) => o.value === answer);
      if (opt) return opt.label;
    }
    if (question.type === "hours_slider") {
      const num = Number(answer);
      if (Number.isFinite(num)) return `${num} hours / day`;
    }
    if (question.type === "scale") {
      const num = Number(answer);
      return `${num} / ${question.max ?? 5}`;
    }
    return String(answer ?? "");
  }

  function submitAnswer(question: Question, answer: unknown) {
    if (busy) return;
    setBusy(true);
    const userLabel = answerLabel(question, answer);
    const reaction =
      (question.options && !Array.isArray(answer)
        ? question.options.find((o) => o.value === answer)?.reaction
        : null) ?? question.reaction ?? "Got it.";

    const nextState = applyAnswer(state, question.id, answer);
    const celebration = celebrationFor(question, answer, nextState);
    const mood = lumiMoodForAnswer(question, answer);

    setBubbles((prev) => {
      const additions: Bubble[] = [
        { kind: "user", id: `a-${question.id}-${prev.length}`, text: userLabel },
        { kind: "lumi", id: `r-${question.id}-${prev.length}`, mood, text: reaction },
      ];
      if (celebration) {
        additions.push({
          kind: "system",
          id: `c-${question.id}-${prev.length}`,
          text: celebration,
        });
      }
      return [...prev, ...additions];
    });

    setState(nextState);
    const next = pickNextQuestion(nextState);
    if (!next) {
      // Finish.
      window.setTimeout(() => {
        const finalPower = planPower(nextState);
        setBubbles((prev) => [
          ...prev,
          {
            kind: "lumi",
            id: "done",
            mood: "celebrate",
            text: `Plan locked at ${finalPower}% power. Your shields, swaps, and bedtime rules are tuned to your answers. Tap the badge to launch.`,
          },
        ]);
        setCurrent(null);
        setCompleted(true);
        setBusy(false);
      }, 480);
      return;
    }
    askNext(next);
  }

  function handleSubmitCurrent() {
    if (!current) return;
    if (current.type === "short_text") {
      const value = draftText.trim();
      if (current.required && value.length === 0) return;
      if (value.length === 0 && !current.required) return;
      submitAnswer(current, current.id === "age" ? value.replace(/[^0-9]/g, "") : value);
      return;
    }
    if (current.type === "single_choice") {
      if (!draftSingle) return;
      submitAnswer(current, draftSingle);
      return;
    }
    if (current.type === "multi_choice") {
      if (draftMulti.length === 0) return;
      submitAnswer(current, draftMulti);
      return;
    }
    if (current.type === "hours_slider" || current.type === "scale") {
      if (draftSlider == null) return;
      submitAnswer(current, draftSlider);
      return;
    }
  }

  function toggleMulti(value: string) {
    if (!current) return;
    setDraftMulti((prev) => {
      if (prev.includes(value)) return prev.filter((v) => v !== value);
      if (current.maxSelect && prev.length >= current.maxSelect) return prev;
      return [...prev, value];
    });
  }

  function handleFinish() {
    onComplete(state, summarize(state));
  }

  const summary = summarize(state);

  return (
    <main
      className="min-h-screen overflow-hidden bg-mesh text-foreground"
      data-testid="screen-lumi-interview"
    >
      <div className="pointer-events-none fixed inset-0 -z-10 opacity-70 mix-blend-overlay bg-[radial-gradient(circle_at_15%_15%,hsl(var(--latch-yellow)/0.45),transparent_28%),radial-gradient(circle_at_88%_18%,hsl(var(--latch-lime)/0.36),transparent_28%),radial-gradient(circle_at_50%_100%,hsl(var(--latch-purple)/0.30),transparent_36%)]" />
      <section className="mx-auto grid max-w-5xl gap-6 px-4 py-6 sm:px-6 lg:grid-cols-[0.95fr_1.05fr] lg:px-8">
        <aside
          className="rounded-[2rem] card-premium p-5 backdrop-blur lg:sticky lg:top-6 lg:self-start"
          data-testid="panel-interview-progress"
        >
          <div className="flex items-start gap-3">
            <LumiAvatar mood={completed ? "celebrate" : "coach"} size="md" />
            <div className="rounded-2xl panel-inset p-3 text-sm font-medium leading-6">
              <p className="text-xs font-black uppercase tracking-[0.18em] text-muted-foreground">
                lumi mission
              </p>
              <p className="mt-1">
                Honest answers grow your plan power. Lumi only asks what makes the plan smarter.
              </p>
            </div>
          </div>
          <div className="mt-6">
            <div className="flex items-center justify-between text-xs font-black uppercase tracking-[0.18em] text-muted-foreground">
              <span>Plan power</span>
              <span data-testid="text-plan-power">{power}%</span>
            </div>
            <Progress value={power} className="mt-3 h-3" data-testid="progress-plan-power" />
            <p className="mt-2 text-xs font-medium text-muted-foreground">
              {power < 35
                ? "Just getting started."
                : power < 60
                  ? "Plan is taking shape."
                  : power < 78
                    ? "Almost ready to launch."
                    : "Ready when you are."}
            </p>
          </div>
          <div className="mt-5 grid gap-3">
            <div className="rounded-2xl panel-inset p-3" data-testid="card-interview-stats">
              <p className="text-xs font-black uppercase tracking-[0.18em] text-muted-foreground">
                signals so far
              </p>
              <div className="mt-2 flex flex-wrap gap-2 text-[11px] font-bold">
                <span
                  className="rounded-full bg-primary/15 px-2 py-0.5 text-primary"
                  data-testid="chip-summary-questions"
                >
                  {state.askedIds.length} answered
                </span>
                <span
                  className="rounded-full bg-secondary px-2 py-0.5 text-secondary-foreground"
                  data-testid="chip-summary-risk"
                >
                  risk {Math.round(risk * 100)}%
                </span>
                <span
                  className="rounded-full bg-[hsl(var(--latch-yellow)/0.35)] px-2 py-0.5 text-foreground"
                  data-testid="chip-summary-persona"
                >
                  {summary.persona.replaceAll("_", " ")}
                </span>
              </div>
              {summary.topShields.length > 0 && (
                <p className="mt-3 text-xs text-muted-foreground" data-testid="text-summary-shields">
                  Top shields: <strong>{summary.topShields.join(", ")}</strong>
                </p>
              )}
              {summary.recommendedReplacements.length > 0 && (
                <p className="mt-1 text-xs text-muted-foreground" data-testid="text-summary-replacements">
                  Offline feed: <strong>{summary.recommendedReplacements.join(", ")}</strong>
                </p>
              )}
            </div>
            <div className="rounded-2xl panel-inset p-3">
              <div className="flex items-center gap-2 text-sm font-bold">
                <Trophy className="h-4 w-4 text-[hsl(var(--latch-yellow))]" aria-hidden="true" />
                Mission rewards
              </div>
              <ul className="mt-2 space-y-1 text-xs text-muted-foreground">
                <li>+10 Latch Credits when your plan is ready</li>
                <li>Badge: <strong>Plan Builder</strong></li>
                <li>Unlock the Bridge + Swaps tuned to you</li>
              </ul>
            </div>
            {current?.why && (
              <div className="rounded-2xl border border-[hsl(var(--latch-purple))]/25 bg-[hsl(var(--latch-purple)/0.08)] p-3 text-sm text-foreground" data-testid="text-question-why">
                <p className="text-xs font-black uppercase tracking-[0.18em] text-muted-foreground">
                  why this matters
                </p>
                <p className="mt-1 text-sm leading-6">{current.why}</p>
              </div>
            )}
          </div>
          {onSkipToClassic && !completed && (
            <button
              type="button"
              onClick={onSkipToClassic}
              className="mt-5 inline-flex items-center gap-1 text-xs font-bold text-muted-foreground underline hover:text-foreground"
              data-testid="button-interview-skip-classic"
            >
              <SkipForward className="h-3 w-3" aria-hidden="true" />
              Use the classic setup instead
            </button>
          )}
        </aside>

        <article
          className="flex h-[78vh] min-h-[520px] flex-col overflow-hidden rounded-[2rem] card-premium backdrop-blur"
          data-testid="panel-interview-chat"
        >
          <header className="flex items-center justify-between gap-3 border-b border-[hsl(var(--latch-night))]/8 bg-[hsl(var(--latch-cream-light))]/60 px-5 py-3 backdrop-blur">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" aria-hidden="true" />
              <p className="text-xs font-black uppercase tracking-[0.18em] text-muted-foreground">
                interview · plan power {power}%
              </p>
            </div>
            <div className="flex items-center gap-2 text-xs font-bold text-muted-foreground">
              <Wand2 className="h-4 w-4 text-primary" aria-hidden="true" />
              <span>{state.askedIds.length} / ~10</span>
            </div>
          </header>
          <div
            ref={scrollRef}
            className="flex-1 space-y-3 overflow-y-auto px-5 py-4"
            data-testid="list-chat-bubbles"
          >
            <AnimatePresence initial={false}>
              {bubbles.map((bubble) => (
                <ChatBubble key={bubble.id} bubble={bubble} />
              ))}
            </AnimatePresence>
          </div>

          <footer className="border-t border-[hsl(var(--latch-night))]/8 bg-[hsl(var(--latch-cream-light))]/60 px-5 py-4 backdrop-blur">
            {completed ? (
              <CompletedFooter onFinish={handleFinish} summary={summary} />
            ) : current ? (
              <AnswerControls
                question={current}
                draftText={draftText}
                setDraftText={setDraftText}
                draftMulti={draftMulti}
                toggleMulti={toggleMulti}
                draftSingle={draftSingle}
                setDraftSingle={setDraftSingle}
                draftSlider={draftSlider}
                setDraftSlider={setDraftSlider}
                onSubmit={handleSubmitCurrent}
                busy={busy}
              />
            ) : (
              <p className="text-sm text-muted-foreground">Lumi is thinking…</p>
            )}
          </footer>
        </article>
      </section>
    </main>
  );
}

function ChatBubble({ bubble }: { bubble: Bubble }) {
  if (bubble.kind === "system") {
    return (
      <motion.div
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -6 }}
        className="mx-auto inline-flex w-full justify-center"
        data-testid="bubble-system"
      >
        <span className="rounded-full border border-[hsl(var(--latch-lime))]/40 bg-[hsl(var(--latch-lime)/0.18)] px-3 py-1 text-xs font-black uppercase tracking-wider text-[hsl(var(--latch-lime-deep))]">
          ★ {bubble.text}
        </span>
      </motion.div>
    );
  }
  if (bubble.kind === "user") {
    return (
      <motion.div
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -6 }}
        className="flex justify-end"
        data-testid="bubble-user"
      >
        <p className="max-w-[80%] rounded-2xl rounded-tr-sm bg-[hsl(var(--latch-night))] px-4 py-2 text-sm font-medium text-[hsl(var(--latch-lime))] shadow-md">
          {bubble.text}
        </p>
      </motion.div>
    );
  }
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -6 }}
      className="flex items-start gap-2"
      data-testid="bubble-lumi"
    >
      <div className="mt-0.5">
        <LumiAvatar mood={bubble.mood ?? "happy"} size="sm" />
      </div>
      <p className="max-w-[80%] rounded-2xl rounded-tl-sm border border-card-border/60 bg-[hsl(var(--latch-cream-light))] px-4 py-2 text-sm font-medium leading-6 shadow-sm">
        {bubble.text}
      </p>
    </motion.div>
  );
}

function AnswerControls({
  question,
  draftText,
  setDraftText,
  draftMulti,
  toggleMulti,
  draftSingle,
  setDraftSingle,
  draftSlider,
  setDraftSlider,
  onSubmit,
  busy,
}: {
  question: Question;
  draftText: string;
  setDraftText: (value: string) => void;
  draftMulti: string[];
  toggleMulti: (value: string) => void;
  draftSingle: string;
  setDraftSingle: (value: string) => void;
  draftSlider: number | null;
  setDraftSlider: (value: number) => void;
  onSubmit: () => void;
  busy: boolean;
}) {
  if (question.type === "short_text") {
    return (
      <form
        onSubmit={(event) => {
          event.preventDefault();
          onSubmit();
        }}
        className="flex flex-wrap items-center gap-2"
        data-testid={`form-answer-${question.id}`}
      >
        <input
          autoFocus
          value={draftText}
          onChange={(event) => setDraftText(event.target.value)}
          className="min-h-12 flex-1 rounded-xl border border-input bg-background px-4 text-base outline-none focus-visible:ring-2 focus-visible:ring-ring"
          placeholder={question.id === "age" ? "17" : "Type your answer…"}
          inputMode={question.id === "age" ? "numeric" : "text"}
          aria-label={question.prompt}
          data-testid={`input-answer-${question.id}`}
          maxLength={question.id === "age" ? 3 : 160}
        />
        <Button type="submit" disabled={busy || draftText.trim().length === 0} data-testid={`button-send-${question.id}`}>
          <Send className="h-4 w-4" aria-hidden="true" />
          Send
        </Button>
      </form>
    );
  }
  if (question.type === "single_choice") {
    return (
      <div className="grid gap-2" data-testid={`controls-${question.id}`}>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {question.options?.map((opt) => (
            <button
              key={opt.value}
              type="button"
              className={`rounded-xl border px-3 py-2 text-left text-sm font-bold transition hover-elevate active-elevate-2 ${
                draftSingle === opt.value
                  ? "border-[hsl(var(--latch-night))] bg-[hsl(var(--latch-night))] text-[hsl(var(--latch-lime))] shadow-md"
                  : "border-card-border/70 bg-[hsl(var(--latch-cream-light))] text-foreground"
              }`}
              onClick={() => setDraftSingle(opt.value)}
              data-testid={`option-${question.id}-${opt.value}`}
              aria-pressed={draftSingle === opt.value}
            >
              {opt.emoji && <span className="mr-1.5">{opt.emoji}</span>}
              {opt.label}
            </button>
          ))}
        </div>
        <Button
          type="button"
          onClick={onSubmit}
          disabled={busy || !draftSingle}
          className="justify-self-end"
          data-testid={`button-send-${question.id}`}
        >
          Send
          <ChevronRight className="h-4 w-4" aria-hidden="true" />
        </Button>
      </div>
    );
  }
  if (question.type === "multi_choice") {
    return (
      <div className="grid gap-2" data-testid={`controls-${question.id}`}>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
          {question.options?.map((opt) => {
            const selected = draftMulti.includes(opt.value);
            return (
              <button
                key={opt.value}
                type="button"
                className={`rounded-xl border px-3 py-2 text-left text-sm font-bold transition hover-elevate active-elevate-2 ${
                  selected
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-background text-foreground"
                }`}
                onClick={() => toggleMulti(opt.value)}
                aria-pressed={selected}
                data-testid={`option-${question.id}-${opt.value}`}
              >
                {opt.emoji && <span className="mr-1.5">{opt.emoji}</span>}
                {opt.label}
              </button>
            );
          })}
        </div>
        <div className="flex items-center justify-between gap-2 text-xs font-bold text-muted-foreground">
          <span>
            {draftMulti.length} picked{question.maxSelect ? ` / ${question.maxSelect}` : ""}
          </span>
          <Button
            type="button"
            onClick={onSubmit}
            disabled={busy || draftMulti.length === 0}
            data-testid={`button-send-${question.id}`}
          >
            Send
            <ChevronRight className="h-4 w-4" aria-hidden="true" />
          </Button>
        </div>
      </div>
    );
  }
  if (question.type === "hours_slider" || question.type === "scale") {
    const min = question.min ?? (question.type === "scale" ? 1 : 0.5);
    const max = question.max ?? (question.type === "scale" ? 5 : 12);
    const step = question.step ?? (question.type === "scale" ? 1 : 0.5);
    const value = draftSlider ?? (question.type === "scale" ? Math.round((min + max) / 2) : Math.round((min + max) / 2));
    return (
      <div className="grid gap-3" data-testid={`controls-${question.id}`}>
        <div className="flex items-center justify-between text-sm font-bold">
          <span>{question.prompt}</span>
          <span className="font-mono tabular-nums" data-testid={`text-slider-${question.id}`}>
            {value}
            {question.unit ? ` ${question.unit}` : ""}
          </span>
        </div>
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(event) => setDraftSlider(Number(event.target.value))}
          className="w-full accent-lime-400"
          aria-label={question.prompt}
          data-testid={`input-slider-${question.id}`}
        />
        <div className="flex justify-end">
          <Button type="button" onClick={onSubmit} disabled={busy} data-testid={`button-send-${question.id}`}>
            Send
            <ChevronRight className="h-4 w-4" aria-hidden="true" />
          </Button>
        </div>
      </div>
    );
  }
  return null;
}

function CompletedFooter({
  onFinish,
  summary,
}: {
  onFinish: () => void;
  summary: ReturnType<typeof summarize>;
}) {
  return (
    <div className="grid gap-3" data-testid="panel-interview-complete">
      <div className="rounded-2xl surface-lime p-4 text-sm leading-6 glow-lime">
        <p className="text-xs font-black uppercase tracking-[0.18em] text-[hsl(var(--latch-night))]/80">badge unlocked</p>
        <p className="mt-1 font-black text-[hsl(var(--latch-night))]">Plan Builder · {summary.persona.replaceAll("_", " ")}</p>
        <p className="text-[hsl(var(--latch-night))]/80">
          Shields will start on {summary.topShields.join(", ") || "your top apps"}. Your offline feed picks: {summary.recommendedReplacements.join(", ") || "walk, read, friend"}.
        </p>
      </div>
      <Button type="button" onClick={onFinish} className="w-full" data-testid="button-interview-finish">
        Launch my Latch plan
        <ChevronRight className="h-4 w-4" aria-hidden="true" />
      </Button>
    </div>
  );
}
