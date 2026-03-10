export * from "./colors";

export const API_URL =
  process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:4000";

export const HABIT_CATEGORY_CONFIG = {
  gym: { label: "Gym", color: "#FF7A00" },
  reading: { label: "Lectura", color: "#FF9A3D" },
  sleep: { label: "Sueño", color: "#9A9A9A" },
  diet: { label: "Dieta", color: "#C8A060" },
  study: { label: "Estudio", color: "#E8A820" },
  custom: { label: "Personalizado", color: "#8A8070" },
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
  if (mins < 1) return "ahora";
  if (mins < 60) return `hace ${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `hace ${hrs}h`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `hace ${days}d`;
  return date.toLocaleDateString();
}

export function formatDaysLeft(endDateStr: string): string {
  const end = new Date(endDateStr);
  const now = new Date();
  const diff = Math.ceil((end.getTime() - now.getTime()) / 86400000);
  if (diff <= 0) return "Terminado";
  if (diff === 1) return "1 día restante";
  return `${diff} días restantes`;
}
