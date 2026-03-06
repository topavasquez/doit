export * from "./colors";

export const API_URL =
  process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:4000";

export const HABIT_CATEGORY_CONFIG = {
  gym: { label: "Gym", color: "#fe7d1b" },
  reading: { label: "Reading", color: "#3B82F6" },
  sleep: { label: "Sleep", color: "#8B5CF6" },
  diet: { label: "Diet", color: "#22C55E" },
  study: { label: "Study", color: "#f0a500" },
  custom: { label: "Custom", color: "#EC4899" },
} as const;

export const QUICK_REACTIONS = ["+1", "strong", "clap", "fire", "let's go"] as const;

export const LEVEL_THRESHOLDS = [
  0, 100, 300, 600, 1000, 1500, 2100, 2800, 3600, 4500, 5500,
];

export function getLevel(xp: number): number {
  let level = 1;
  for (let i = 0; i < LEVEL_THRESHOLDS.length; i++) {
    if (xp >= LEVEL_THRESHOLDS[i]) level = i + 1;
    else break;
  }
  return level;
}

export function formatRelativeTime(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diff = now.getTime() - date.getTime();

  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return date.toLocaleDateString();
}

export function formatDaysLeft(endDateStr: string): string {
  const end = new Date(endDateStr);
  const now = new Date();
  const diff = Math.ceil((end.getTime() - now.getTime()) / 86400000);
  if (diff <= 0) return "Ended";
  if (diff === 1) return "1 day left";
  return `${diff} days left`;
}
