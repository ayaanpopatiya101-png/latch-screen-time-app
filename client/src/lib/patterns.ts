export type PeriodType = "week" | "month" | "year";

export type DetectedPattern = {
  patternKey: string;
  appName: string;
  periodType: PeriodType;
  daysOpened: number;
  totalDays: number;
  hourStart: number;
  hourEnd: number;
  confidence: number;
  suggestedQuestion: string;
  productivityUnknown: boolean;
  productivity: "productive" | "unproductive" | "unknown";
  recommendedAction: "ask_user" | "no_block" | "block_next_month";
  sampleContent: string[];
  explanation: string;
  status?: "pending" | "productive" | "unproductive" | "blocked";
  userAnswer?: string | null;
};

export type BlockRule = {
  id: number;
  accountId: number;
  appName: string;
  hourStart: number;
  hourEnd: number;
  activeFrom: string;
  activeUntil: string;
  reason: string;
  sourcePatternKey: string;
  enabled: boolean;
  createdAt: string;
};

const API_BASE = "__PORT_5000__".startsWith("__") ? "" : "__PORT_5000__";

async function jsonRequest<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${url}`, init);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const message = (data && (data as any).message) || `Request failed (${res.status})`;
    throw new Error(message);
  }
  return data as T;
}

export async function fetchPatterns(
  accountId: number,
  period: PeriodType,
): Promise<{
  patterns: DetectedPattern[];
  blockRules: BlockRule[];
  periodType: PeriodType;
  totalDays: number;
}> {
  return jsonRequest(`/api/app-patterns/${accountId}?period=${period}`);
}

export async function reviewPattern(
  accountId: number,
  patternKey: string,
  answer: "productive" | "unproductive",
): Promise<{ pattern: { status: string }; blockRule: BlockRule | null }> {
  return jsonRequest(`/api/app-patterns/review`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ accountId, patternKey, answer }),
  });
}

export async function seedDemoEvents(accountId: number): Promise<{ inserted: number }> {
  return jsonRequest(`/api/app-patterns/demo-seed`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ accountId }),
  });
}

export function formatHour(hour: number): string {
  const h = ((hour + 24) % 24);
  if (h === 0) return "12 AM";
  if (h === 12) return "12 PM";
  if (h < 12) return `${h} AM`;
  return `${h - 12} PM`;
}

export function formatRange(hourStart: number, hourEnd: number): string {
  return `${formatHour(hourStart)}–${formatHour(hourEnd)}`;
}
