import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Plus, Trophy, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { SafeAccount } from "@/lib/auth";
import { createBuddyChallenge, listBuddies, type AccountabilityBuddy } from "@/lib/credits";

export function AccountabilityLeaderboard({
  account,
  onToast,
}: {
  account: SafeAccount;
  onToast: (m: string) => void;
}) {
  const [buddies, setBuddies] = useState<AccountabilityBuddy[]>([]);
  const [loading, setLoading] = useState(true);
  const [showInvite, setShowInvite] = useState(false);
  const [buddyName, setBuddyName] = useState("");
  const [challengeTitle, setChallengeTitle] = useState("Stay under daily limit");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const data = await listBuddies(account.id);
        if (!cancelled) setBuddies(data.buddies);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [account.id]);

  async function addBuddy() {
    if (!buddyName.trim()) return;
    setBusy(true);
    try {
      const result = await createBuddyChallenge({
        accountId: account.id,
        buddyName: buddyName.trim(),
        challengeTitle: challengeTitle.trim() || "Stay under daily limit",
      });
      setBuddies((current) => [...current, result.buddy]);
      onToast(`Invited ${result.buddy.buddyName}. Challenge: ${result.buddy.challengeTitle}.`);
      setBuddyName("");
      setShowInvite(false);
    } catch (err) {
      onToast(err instanceof Error ? err.message : "Could not invite buddy.");
    } finally {
      setBusy(false);
    }
  }

  const ranked = useMemo(() => {
    const me: AccountabilityBuddy = {
      id: -1,
      accountId: account.id,
      buddyName: account.profile.name || account.name,
      challengeTitle: "You",
      minutesSaved: 182 + account.profile.streak * 4,
      pointsThisWeek: account.profile.weeklyPoints,
      active: true,
      createdAt: new Date().toISOString(),
    };
    return [me, ...buddies].sort((a, b) => b.pointsThisWeek - a.pointsThisWeek);
  }, [buddies, account]);

  return (
    <article className="rounded-[2rem] bg-card p-5 shadow-sm" data-testid="section-accountability">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.18em] text-muted-foreground">accountability</p>
          <h2 className="mt-2 font-display text-xl font-extrabold tracking-tight">Weekly leaderboard</h2>
          <p className="mt-1 text-sm leading-6 text-muted-foreground">
            BePresent-style. Win the week by stacking offline points with friends.
          </p>
        </div>
        <div className="flex items-center gap-2 rounded-full bg-primary px-3 py-1 text-primary-foreground">
          <Trophy className="h-4 w-4" aria-hidden="true" />
          <span className="text-xs font-black uppercase tracking-[0.18em]">live</span>
        </div>
      </div>

      <div className="mt-4 space-y-2" data-testid="list-buddies">
        {loading && <p className="text-sm text-muted-foreground">Loading crew…</p>}
        {!loading && ranked.map((b, index) => {
          const isMe = b.id === -1;
          return (
            <motion.div
              key={b.id}
              initial={{ opacity: 0, x: -4 }}
              animate={{ opacity: 1, x: 0 }}
              className={`flex items-center justify-between gap-3 rounded-2xl p-3 ${isMe ? "bg-primary text-primary-foreground" : "bg-background"}`}
              data-testid={`row-buddy-${isMe ? "you" : b.id}`}
            >
              <div className="flex items-center gap-3">
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-card text-xs font-black text-foreground">
                  {index + 1}
                </span>
                <div>
                  <p className="font-bold">{b.buddyName}{isMe && " (you)"}</p>
                  <p className={`text-xs ${isMe ? "text-primary-foreground/80" : "text-muted-foreground"}`}>{b.challengeTitle}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="font-mono text-base font-black tabular-nums">{b.pointsThisWeek} pts</p>
                <p className={`text-[11px] ${isMe ? "text-primary-foreground/80" : "text-muted-foreground"}`}>{b.minutesSaved}m saved</p>
              </div>
            </motion.div>
          );
        })}
      </div>

      <Button
        type="button"
        variant={showInvite ? "secondary" : "default"}
        className="mt-4 w-full"
        onClick={() => setShowInvite((v) => !v)}
        data-testid="button-toggle-invite"
      >
        <Plus className="h-4 w-4" aria-hidden="true" />
        {showInvite ? "Close" : "Invite an accountability buddy"}
      </Button>

      {showInvite && (
        <div className="mt-3 space-y-2 rounded-2xl bg-background p-3" data-testid="form-invite-buddy">
          <input
            value={buddyName}
            onChange={(e) => setBuddyName(e.target.value)}
            placeholder="Friend's name"
            className="min-h-10 w-full rounded-xl border border-input bg-card px-3 text-sm outline-none focus-visible:ring-1 focus-visible:ring-ring"
            data-testid="input-buddy-name"
          />
          <input
            value={challengeTitle}
            onChange={(e) => setChallengeTitle(e.target.value)}
            placeholder="Challenge title"
            className="min-h-10 w-full rounded-xl border border-input bg-card px-3 text-sm outline-none focus-visible:ring-1 focus-visible:ring-ring"
            data-testid="input-challenge-title"
          />
          <Button type="button" className="w-full" disabled={busy} onClick={addBuddy} data-testid="button-invite-buddy">
            <Users className="h-4 w-4" aria-hidden="true" />
            Send simulated invite
          </Button>
        </div>
      )}
      <p className="mt-3 text-[11px] text-muted-foreground">
        Prototype note: invites are simulated in this web app. The mobile build uses real push and a shared room ID.
      </p>
    </article>
  );
}
