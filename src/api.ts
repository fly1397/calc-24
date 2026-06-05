import type { CoachMessage, HintPack, PlayerMetrics, Puzzle, StoredAttempt } from "../shared/types";
import type { LabCollectionRuntime } from "../shared/lab";
import type { HellLayer } from "../shared/modes";
import type { StageDefinition } from "../shared/puzzles";
import type { GeneratePuzzleConfig, GeneratedPuzzleResult } from "../shared/generator";

export type PuzzlePayload = {
  puzzle: Puzzle;
  hints: HintPack;
  solutionCount: number;
};

const request = async <T>(url: string, options?: RequestInit): Promise<T> => {
  const response = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options?.headers ?? {})
    }
  });
  if (!response.ok) {
    throw new Error(await response.text());
  }
  return (await response.json()) as T;
};

export const api = {
  puzzles: () => request<{ puzzles: Puzzle[] }>("/api/puzzles"),
  puzzleIndex: () => request<{ puzzles: Puzzle[]; stages: StageDefinition[] }>("/api/puzzles"),
  lab: (unlockAll = false) => request<{ collections: LabCollectionRuntime[]; puzzles: Puzzle[] }>(`/api/lab${unlockAll ? "?unlockAll=1" : ""}`),
  hell: () => request<{ layers: HellLayer[] }>("/api/hell"),
  race: () => request<{ puzzles: Puzzle[] }>("/api/race"),
  generate: (body: GeneratePuzzleConfig) =>
    request<GeneratedPuzzleResult>("/api/generate", {
      method: "POST",
      body: JSON.stringify(body)
    }),
  puzzle: (id: string) => request<PuzzlePayload>(`/api/puzzles/${id}`),
  daily: () => request<PuzzlePayload>("/api/daily"),
  seed: (seed: string) => request<PuzzlePayload>(`/api/seed/${encodeURIComponent(seed)}`),
  attempts: (puzzleId: string) =>
    request<{ attempts: StoredAttempt[]; discoveredKeys: string[] }>(`/api/attempts/${puzzleId}`),
  submitAttempt: (body: {
    puzzleId: string;
    solutionKey: string;
    expression: string;
    elapsedMs: number;
    hintsUsed: number;
  }) =>
    request<{ isNew: boolean; score: number; discoveredCount: number }>("/api/attempts", {
      method: "POST",
      body: JSON.stringify(body)
    }),
  leaderboard: (puzzleId: string) =>
    request<{ rows: Array<StoredAttempt & { score: number }> }>(`/api/leaderboard/${puzzleId}`),
  trainingNext: (body: PlayerMetrics & { excludeIds?: string[] }) =>
    request<PuzzlePayload & { recommendation: { targetDs: number; reason: string } }>("/api/training/next", {
      method: "POST",
      body: JSON.stringify(body)
    }),
  coach: (body: { puzzleId: string; elapsedMs: number; hintsUsed: number; cardsLeft: number }) =>
    request<{ message: CoachMessage }>("/api/coach", {
      method: "POST",
      body: JSON.stringify(body)
    }),
  stats: () =>
    request<{
      attempts: number;
      solvedPuzzles: number;
      discoveredSolutions: number;
      archive: Array<{ puzzleId: string; discovered: number }>;
    }>("/api/stats")
};
