import { useState } from "react";
import { BellRing } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { SafeAccount } from "@/lib/auth";
import { patchProfile } from "@/lib/auth";

export function DoomscrollNudges({
  account,
  onAccount,
  onToast,
}: {
  account: SafeAccount;
  onAccount: (next: SafeAccount) => void;
  onToast: (m: string) => void;
}) {
  const [busy, setBusy] = useState(false);

  async function toggle() {
    setBusy(true);
    try {
      const next = await patchProfile(account.id, { doomscrollNudges: !account.profile.doomscrollNudges });
      onAccount(next);
      onToast(next.profile.doomscrollNudges ? "Hourly awareness nudges on." : "Hourly awareness nudges paused.");
    } catch (err) {
      onToast(err instanceof Error ? err.message : "Could not save.");
    } finally {
      setBusy(false);
    }
  }

  const on = account.profile.doomscrollNudges;
  return (
    <article className="rounded-[2rem] card-premium p-5" data-testid="card-doomscroll-nudges">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.18em] text-muted-foreground">awareness</p>
          <h2 className="mt-2 font-display text-lg font-extrabold tracking-tight">Hourly doomscroll nudges</h2>
          <p className="mt-1 max-w-md text-sm leading-6 text-muted-foreground">
            BePresent-style. Every hour you scroll past 20 minutes, Lumi softly asks how you feel and offers a swap.
          </p>
        </div>
        <Button type="button" variant={on ? "secondary" : "default"} onClick={toggle} disabled={busy} data-testid="button-toggle-doomscroll">
          <BellRing className="h-4 w-4" aria-hidden="true" />
          {on ? "On" : "Off"}
        </Button>
      </div>
      {on && (
        <div className="mt-3 rounded-2xl panel-inset p-3 text-xs text-muted-foreground" data-testid="card-example-nudge">
          <p className="font-bold text-foreground">Example nudge</p>
          <p className="mt-1">"You've been on TikTok 22 min this hour. Quick check: bored, tired, or stressed? Lumi has a 3-min swap that fits."</p>
        </div>
      )}
    </article>
  );
}
