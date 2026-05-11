export type SafeProfile = {
  onboardingComplete: boolean;
  name: string;
  age: string;
  currentHours: number;
  goalHours: number;
  feelings: string[];
  hardestTime: string;
  topApps: string[];
  appleConnected: boolean;
  notificationsAllowed: boolean;
  coins: number;
  streak: number;
  completedActions: string[];
  latchCredits: number;
  unlockMinutes: number;
  brainEnergy: number;
  dailyGoalMinutes: number;
  lastGoalDay: string;
  weeklyPoints: number;
  emergencyPasses: number;
  doomscrollNudges: boolean;
};

export type SafeAccount = {
  id: number;
  username: string;
  name: string;
  age: number;
  profile: SafeProfile;
};

const API_BASE = "__PORT_5000__".startsWith("__") ? "" : "__PORT_5000__";

async function postJson<T>(url: string, body: unknown): Promise<T> {
  const res = await fetch(`${API_BASE}${url}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const message = (data && (data as any).message) || `Request failed (${res.status})`;
    throw new Error(message);
  }
  return data as T;
}

async function patchJson<T>(url: string, body: unknown): Promise<T> {
  const res = await fetch(`${API_BASE}${url}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const message = (data && (data as any).message) || `Request failed (${res.status})`;
    throw new Error(message);
  }
  return data as T;
}

export async function signup(input: {
  username: string;
  password: string;
  name: string;
  age: number;
}): Promise<SafeAccount> {
  const data = await postJson<{ account: SafeAccount }>("/api/auth/signup", input);
  return data.account;
}

export async function login(input: {
  username: string;
  password: string;
}): Promise<SafeAccount> {
  const data = await postJson<{ account: SafeAccount }>("/api/auth/login", input);
  return data.account;
}

export async function logout(): Promise<void> {
  await postJson<{ ok: boolean }>("/api/auth/logout", {});
}

export async function patchProfile(
  accountId: number,
  patch: Partial<SafeProfile>,
): Promise<SafeAccount> {
  const data = await patchJson<{ account: SafeAccount }>(
    `/api/accounts/${accountId}/profile`,
    patch,
  );
  return data.account;
}
