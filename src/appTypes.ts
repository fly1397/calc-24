import type { Puzzle } from "../shared/types";

export type View = "home" | "map" | "game" | "clinic" | "archive" | "lab" | "supply" | "hell" | "settings";
export type Mode = "main" | "daily" | "training" | "lab" | "hell" | "race";
export type HistoryItem = { cards: import("../shared/types").CardState[] };
export type Stats = {
  attempts: number;
  solvedPuzzles: number;
  discoveredSolutions: number;
  archive: Array<{ puzzleId: string; discovered: number }>;
};
export type MergeAnimation = { fromId: string; toId: string; dx: number; dy: number } | null;

export const defaultWallet = { coins: 0, wisdomStars: 0 };
export const defaultInventory = { hintPacks: 0, deathShields: 0, jokers: 0, blindBoxTickets: 0 };
export const defaultDebug = { unlockAll: false, infiniteHints: false, sound: true, vibration: true, eyeCare: false };
export const defaultMetrics = {
  recentElapsedMs: [],
  recentHints: [],
  recentResets: [],
  solvedStreak: 0,
  failedStreak: 0
};

export type PuzzlePicker = (puzzle: Puzzle) => void;
