import { useState } from "react";
import { Button } from "@/components/ui/button";
import { login, signup, type SafeAccount } from "@/lib/auth";

type Mode = "signup" | "login";

export function AccountGate({ onAuthed }: { onAuthed: (account: SafeAccount) => void }) {
  const [mode, setMode] = useState<Mode>("signup");
  const [name, setName] = useState("");
  const [age, setAge] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  function clearForm() {
    setName("");
    setAge("");
    setUsername("");
    setPassword("");
    setError(null);
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setBusy(true);
    try {
      if (mode === "signup") {
        const ageNum = Number.parseInt(age, 10);
        if (!Number.isFinite(ageNum)) {
          throw new Error("Enter a valid age.");
        }
        const account = await signup({ username, password, name, age: ageNum });
        onAuthed(account);
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

  return (
    <main className="min-h-screen overflow-hidden bg-background text-foreground" data-testid="screen-account-gate">
      <div className="fixed inset-0 -z-10 bg-[radial-gradient(circle_at_10%_15%,hsl(var(--latch-yellow)/0.32),transparent_24%),radial-gradient(circle_at_90%_25%,hsl(var(--latch-lime)/0.26),transparent_28%),radial-gradient(circle_at_50%_95%,hsl(var(--latch-purple)/0.18),transparent_30%),linear-gradient(135deg,hsl(var(--background)),hsl(var(--latch-cream-soft)))]" />
      <section className="mx-auto flex max-w-3xl flex-col gap-6 px-4 py-10 sm:px-6 lg:px-8">
        <header className="rounded-[2rem] border border-border/70 bg-card/88 p-6 shadow-sm backdrop-blur">
          <p className="text-xs font-black uppercase tracking-[0.18em] text-muted-foreground">welcome to latch</p>
          <h1 className="mt-3 font-display text-[2rem] font-extrabold leading-none tracking-tight">
            {mode === "signup" ? "Create your Latch account." : "Welcome back."}
          </h1>
          <p className="mt-3 text-base leading-7 text-muted-foreground">
            {mode === "signup"
              ? "We use your account to save your plan, coins, and streak so it’s ready next time you sign in."
              : "Sign in to pick up your saved plan, streak, and coins."}
          </p>
        </header>

        <form
          onSubmit={submit}
          className="rounded-[2rem] border border-border/70 bg-card/92 p-6 shadow-sm backdrop-blur sm:p-7"
          data-testid={`form-account-${mode}`}
        >
          <div className="grid gap-4">
            {mode === "signup" && (
              <>
                <label className="text-sm font-bold">
                  Name
                  <input
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    className="mt-2 min-h-12 w-full rounded-xl border border-input bg-background px-4 text-base outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    placeholder="Ayaan"
                    required
                    autoComplete="given-name"
                    data-testid="input-signup-name"
                  />
                </label>
                <label className="text-sm font-bold">
                  Age
                  <input
                    value={age}
                    onChange={(event) => setAge(event.target.value.replace(/[^0-9]/g, ""))}
                    className="mt-2 min-h-12 w-full rounded-xl border border-input bg-background px-4 text-base outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    placeholder="17"
                    inputMode="numeric"
                    required
                    data-testid="input-signup-age"
                  />
                </label>
              </>
            )}
            <label className="text-sm font-bold">
              Email or username
              <input
                value={username}
                onChange={(event) => setUsername(event.target.value)}
                className="mt-2 min-h-12 w-full rounded-xl border border-input bg-background px-4 text-base outline-none focus-visible:ring-2 focus-visible:ring-ring"
                placeholder="ayaan@latch.app"
                autoComplete="username"
                required
                data-testid={`input-${mode}-username`}
              />
            </label>
            <label className="text-sm font-bold">
              Password
              <input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="mt-2 min-h-12 w-full rounded-xl border border-input bg-background px-4 text-base outline-none focus-visible:ring-2 focus-visible:ring-ring"
                placeholder="At least 6 characters"
                autoComplete={mode === "signup" ? "new-password" : "current-password"}
                required
                minLength={6}
                data-testid={`input-${mode}-password`}
              />
            </label>
          </div>

          {error && (
            <p className="mt-4 rounded-xl bg-destructive/10 px-4 py-3 text-sm font-medium text-destructive" data-testid="text-account-error">
              {error}
            </p>
          )}

          <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
            <Button type="submit" disabled={busy} data-testid={`button-account-${mode}-submit`}>
              {busy ? "Working..." : mode === "signup" ? "Create account" : "Log in"}
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

          <p className="mt-6 text-xs leading-5 text-muted-foreground">
            Demo auth only. Latch saves your data to a local SQLite database. Closing the tab signs you out because we don’t use cookies or local storage.
          </p>
        </form>
      </section>
    </main>
  );
}
