import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Sparkles, Shield, Coins, Wand2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { LumiAvatar, type LumiMood } from "@/components/LumiAvatar";
import { login, signup, type SafeAccount } from "@/lib/auth";

type Mode = "signup" | "login";

type LumiState = {
  mood: LumiMood;
  message: string;
};

export function AccountGate({ onAuthed }: { onAuthed: (account: SafeAccount) => void }) {
  const [mode, setMode] = useState<Mode>("signup");
  const [name, setName] = useState("");
  const [age, setAge] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [focused, setFocused] = useState<"name" | "age" | "username" | "password" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [celebrating, setCelebrating] = useState<SafeAccount | null>(null);

  function clearForm() {
    setName("");
    setAge("");
    setUsername("");
    setPassword("");
    setError(null);
    setFocused(null);
  }

  const completed = useMemo(() => {
    if (mode === "signup") {
      const steps = [name.trim().length > 0, age.trim().length > 0, username.trim().length > 0, password.length >= 6];
      return steps;
    }
    return [username.trim().length > 0, password.length >= 6];
  }, [mode, name, age, username, password]);

  const completedCount = completed.filter(Boolean).length;
  const progress = Math.round((completedCount / completed.length) * 100);

  const lumi: LumiState = useMemo(() => {
    if (error) {
      return { mood: "thinking", message: "Hmm, that didn’t work. Read the note and try one more time. I’m right here." };
    }
    if (busy) {
      return { mood: "thinking", message: mode === "signup" ? "Mixing your starter plan…" : "Loading your saved plan…" };
    }
    if (mode === "login") {
      if (focused === "username") return { mood: "happy", message: "Welcome back. Type the username or email you used last time." };
      if (focused === "password") return { mood: "coach", message: "Your password stays private — I never see what you type." };
      if (username.trim().length > 0) return { mood: "wave", message: `Hi again, ${username.split("@")[0]}! Tap log in when ready.` };
      return { mood: "wave", message: "Good to see you. Sign in to pick up your coins, streak, and plan." };
    }
    if (focused === "name") {
      return { mood: "happy", message: name.trim().length > 0 ? `Nice to meet you, ${name.trim().split(" ")[0]}! I’ll use your name to cheer you on.` : "What should I call you? Your first name works." };
    }
    if (focused === "age") {
      return { mood: "coach", message: "Age helps me pick the right tone. I’ll keep things fair and friendly." };
    }
    if (focused === "username") {
      return { mood: "happy", message: "Pick a username or email. It’s how you’ll log back in next time." };
    }
    if (focused === "password") {
      return { mood: "coach", message: "Six characters or more. Use something only you would guess — I’ll never peek." };
    }
    if (completedCount === completed.length) {
      return { mood: "celebrate", message: "Mission ready! Tap Start my plan to claim your first Latch Credits." };
    }
    if (completedCount > 0) {
      return { mood: "happy", message: `Great start, ${name.trim().split(" ")[0] || "friend"}. ${completed.length - completedCount} more to launch.` };
    }
    return { mood: "wave", message: "Hi, I’m Lumi! Let’s set up your account so I can build your phone plan." };
  }, [mode, focused, name, age, username, password, error, busy, completedCount, completed.length]);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setBusy(true);
    try {
      if (mode === "signup") {
        const ageNum = Number.parseInt(age, 10);
        if (!Number.isFinite(ageNum) || ageNum < 1 || ageNum > 120) {
          throw new Error("Please enter a valid age.");
        }
        const account = await signup({ username, password, name, age: ageNum });
        setCelebrating(account);
      } else {
        const account = await login({ username, password });
        onAuthed(account);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Try again.");
    } finally {
      setBusy(false);
    }
  }

  const stepLabels = mode === "signup" ? ["Name", "Age", "Login", "Password"] : ["Login", "Password"];

  return (
    <main className="min-h-screen overflow-hidden bg-background text-foreground" data-testid="screen-account-gate">
      <div className="fixed inset-0 -z-10 bg-[radial-gradient(circle_at_10%_15%,hsl(var(--latch-yellow)/0.32),transparent_24%),radial-gradient(circle_at_90%_25%,hsl(var(--latch-lime)/0.26),transparent_28%),radial-gradient(circle_at_50%_95%,hsl(var(--latch-purple)/0.18),transparent_30%),linear-gradient(135deg,hsl(var(--background)),hsl(var(--latch-cream-soft)))]" />

      <AnimatePresence>
        {celebrating && (
          <motion.div
            key="celebration"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-30 flex items-center justify-center bg-background/70 backdrop-blur-sm"
            data-testid="overlay-account-celebration"
          >
            <motion.div
              initial={{ scale: 0.85, y: 24, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              transition={{ type: "spring", stiffness: 220, damping: 18 }}
              className="mx-4 w-full max-w-md rounded-[2rem] border border-border/70 bg-card p-7 text-center shadow-xl"
            >
              <div className="flex justify-center">
                <LumiAvatar mood="celebrate" size="lg" />
              </div>
              <p className="mt-4 text-xs font-black uppercase tracking-[0.18em] text-muted-foreground">mission unlocked</p>
              <h2 className="mt-2 font-display text-3xl font-extrabold leading-tight">Welcome, {celebrating.name.split(" ")[0]}!</h2>
              <p className="mt-3 text-base leading-7 text-muted-foreground">
                You just earned <strong>+10 Latch Credits</strong>. Next I’ll show you the trick your apps use — and we’ll build your plan together.
              </p>
              <div className="mt-6 flex flex-wrap items-center justify-center gap-2 text-xs font-bold">
                <span className="rounded-full bg-secondary px-3 py-1 text-secondary-foreground">+10 credits</span>
                <span className="rounded-full bg-primary/15 px-3 py-1 text-primary">Lumi unlocked</span>
                <span className="rounded-full bg-[hsl(var(--latch-yellow)/0.35)] px-3 py-1 text-foreground">Day 1 ready</span>
              </div>
              <Button
                type="button"
                className="mt-7 w-full"
                onClick={() => onAuthed(celebrating)}
                data-testid="button-celebration-continue"
              >
                Let’s build my plan
              </Button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <section className="mx-auto grid max-w-5xl gap-6 px-4 py-8 sm:px-6 lg:grid-cols-[0.9fr_1.1fr] lg:px-8">
        <aside
          className="order-2 rounded-[2rem] border border-border/70 bg-card/88 p-5 shadow-sm backdrop-blur lg:order-1 lg:sticky lg:top-6 lg:self-start"
          data-testid="panel-account-mascot"
        >
          <div className="flex items-start gap-3">
            <LumiAvatar mood={lumi.mood} size="md" />
            <AnimatePresence mode="wait">
              <motion.div
                key={lumi.message}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.22 }}
                className="relative rounded-2xl bg-background p-4 text-sm font-medium leading-6 shadow-sm"
                data-testid="text-lumi-message"
              >
                <span aria-hidden="true" className="absolute -left-2 top-5 h-3 w-3 rotate-45 bg-background" />
                {lumi.message}
              </motion.div>
            </AnimatePresence>
          </div>

          <div className="mt-6">
            <div className="flex items-center justify-between text-xs font-black uppercase tracking-[0.18em] text-muted-foreground">
              <span>mission setup</span>
              <span data-testid="text-account-progress">{completedCount}/{completed.length}</span>
            </div>
            <Progress value={progress} className="mt-3 h-3" data-testid="progress-account" />
            <div className="mt-3 flex flex-wrap gap-2">
              {stepLabels.map((label, index) => (
                <span
                  key={label}
                  className={`rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-wide transition ${
                    completed[index]
                      ? "bg-primary text-primary-foreground"
                      : "bg-background text-muted-foreground border border-border"
                  }`}
                  data-testid={`chip-step-${label.toLowerCase()}`}
                >
                  {completed[index] ? "✓ " : ""}
                  {label}
                </span>
              ))}
            </div>
          </div>

          <div className="mt-6 grid gap-3">
            <div className="flex items-start gap-3 rounded-2xl bg-background p-3">
              <Coins className="mt-0.5 h-5 w-5 text-primary" aria-hidden="true" />
              <div className="text-sm leading-5">
                <p className="font-bold">First reward</p>
                <p className="text-muted-foreground">Earn <strong>+10 Latch Credits</strong> the moment your account is ready.</p>
              </div>
            </div>
            <div className="flex items-start gap-3 rounded-2xl bg-background p-3">
              <Shield className="mt-0.5 h-5 w-5 text-primary" aria-hidden="true" />
              <div className="text-sm leading-5">
                <p className="font-bold">Private by default</p>
                <p className="text-muted-foreground">No cookies, no local storage. Closing the tab signs you out.</p>
              </div>
            </div>
            <div className="flex items-start gap-3 rounded-2xl bg-background p-3">
              <Wand2 className="mt-0.5 h-5 w-5 text-primary" aria-hidden="true" />
              <div className="text-sm leading-5">
                <p className="font-bold">A plan made for you</p>
                <p className="text-muted-foreground">Lumi turns your answers into shields, swaps, and rewards.</p>
              </div>
            </div>
          </div>
        </aside>

        <div className="order-1 lg:order-2">
          <header className="rounded-[2rem] border border-border/70 bg-card/92 p-6 shadow-sm backdrop-blur">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" aria-hidden="true" />
              <p className="text-xs font-black uppercase tracking-[0.18em] text-muted-foreground">
                {mode === "signup" ? "mission · day 1" : "welcome back"}
              </p>
            </div>
            <h1 className="mt-3 font-display text-[2rem] font-extrabold leading-none tracking-tight sm:text-[2.4rem]">
              {mode === "signup" ? "Start your Latch mission." : "Pick up where you left off."}
            </h1>
            <p className="mt-3 text-base leading-7 text-muted-foreground">
              {mode === "signup"
                ? "Answer four quick things. Lumi will use them to build your phone plan and unlock your first credits."
                : "Sign in to load your streak, coins, and Lumi’s plan from last time."}
            </p>
          </header>

          <form
            onSubmit={submit}
            className="mt-5 rounded-[2rem] border border-border/70 bg-card/92 p-6 shadow-sm backdrop-blur sm:p-7"
            data-testid={`form-account-${mode}`}
          >
            <div className="grid gap-4">
              {mode === "signup" && (
                <>
                  <FormField
                    label="Your name"
                    hint="So Lumi can cheer you on by name."
                    completed={completed[0]}
                  >
                    <input
                      value={name}
                      onChange={(event) => setName(event.target.value)}
                      onFocus={() => setFocused("name")}
                      onBlur={() => setFocused(null)}
                      className="mt-2 min-h-12 w-full rounded-xl border border-input bg-background px-4 text-base outline-none transition focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-ring"
                      placeholder="Ayaan"
                      required
                      autoComplete="given-name"
                      data-testid="input-signup-name"
                    />
                  </FormField>
                  <FormField
                    label="Your age"
                    hint="Helps Lumi keep the tone right."
                    completed={completed[1]}
                  >
                    <input
                      value={age}
                      onChange={(event) => setAge(event.target.value.replace(/[^0-9]/g, ""))}
                      onFocus={() => setFocused("age")}
                      onBlur={() => setFocused(null)}
                      className="mt-2 min-h-12 w-full rounded-xl border border-input bg-background px-4 text-base outline-none transition focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-ring"
                      placeholder="17"
                      inputMode="numeric"
                      required
                      data-testid="input-signup-age"
                    />
                  </FormField>
                </>
              )}
              <FormField
                label="Email or username"
                hint="You’ll use this to log back in."
                completed={mode === "signup" ? completed[2] : completed[0]}
              >
                <input
                  value={username}
                  onChange={(event) => setUsername(event.target.value)}
                  onFocus={() => setFocused("username")}
                  onBlur={() => setFocused(null)}
                  className="mt-2 min-h-12 w-full rounded-xl border border-input bg-background px-4 text-base outline-none transition focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-ring"
                  placeholder="ayaan@latch.app"
                  autoComplete="username"
                  required
                  data-testid={`input-${mode}-username`}
                />
              </FormField>
              <FormField
                label="Password"
                hint="Six or more characters. Lumi never sees it."
                completed={mode === "signup" ? completed[3] : completed[1]}
              >
                <input
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  onFocus={() => setFocused("password")}
                  onBlur={() => setFocused(null)}
                  className="mt-2 min-h-12 w-full rounded-xl border border-input bg-background px-4 text-base outline-none transition focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-ring"
                  placeholder="At least 6 characters"
                  autoComplete={mode === "signup" ? "new-password" : "current-password"}
                  required
                  minLength={6}
                  data-testid={`input-${mode}-password`}
                />
              </FormField>
            </div>

            <AnimatePresence>
              {error && (
                <motion.p
                  key={error}
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  className="mt-4 rounded-xl bg-destructive/10 px-4 py-3 text-sm font-medium text-destructive"
                  data-testid="text-account-error"
                  role="alert"
                  aria-live="polite"
                >
                  {error}
                </motion.p>
              )}
            </AnimatePresence>

            <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
              <Button
                type="submit"
                disabled={busy}
                className="hover-elevate active-elevate-2"
                data-testid={`button-account-${mode}-submit`}
              >
                {busy ? "Working..." : mode === "signup" ? "Start my plan" : "Log in"}
              </Button>
              <button
                type="button"
                onClick={() => {
                  setMode((current) => (current === "signup" ? "login" : "signup"));
                  clearForm();
                }}
                className="text-sm font-bold text-primary hover:underline"
                data-testid="button-account-toggle-mode"
              >
                {mode === "signup" ? "I already have an account" : "Create a new account"}
              </button>
            </div>

            {mode === "signup" && (
              <p className="mt-5 rounded-2xl bg-secondary px-4 py-3 text-xs font-medium leading-5 text-secondary-foreground">
                Finish all four steps to earn your first <strong>10 Latch Credits</strong>. You can spend credits to unlock rewards later.
              </p>
            )}

            <p className="mt-4 text-xs leading-5 text-muted-foreground">
              Demo auth only. Latch saves your data to a local SQLite database. Closing the tab signs you out because we don’t use cookies or local storage.
            </p>
          </form>
        </div>
      </section>
    </main>
  );
}

function FormField({
  label,
  hint,
  completed,
  children,
}: {
  label: string;
  hint: string;
  completed: boolean;
  children: React.ReactNode;
}) {
  return (
    <label className="block text-sm font-bold">
      <span className="flex items-center justify-between gap-2">
        <span>{label}</span>
        <AnimatePresence>
          {completed && (
            <motion.span
              key="done"
              initial={{ opacity: 0, scale: 0.7 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.7 }}
              className="rounded-full bg-primary/15 px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-primary"
            >
              ✓ ready
            </motion.span>
          )}
        </AnimatePresence>
      </span>
      {children}
      <span className="mt-1.5 block text-xs font-medium text-muted-foreground">{hint}</span>
    </label>
  );
}
