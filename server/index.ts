import express from "express";
import path from "node:path";
import { generatePuzzle } from "../shared/generator";
import { closestPuzzleByDs, dailyPuzzleForDate, getPuzzleById, getPuzzleBySeed, labCollections, labPuzzles, puzzles, stages } from "../shared/puzzles";
import { coachForState, makeHints, recommendDifficulty, scoreAttempt } from "../shared/engine";
import { addAttempt, attemptsForPuzzle, readStore } from "./store";
import type { PlayerMetrics, StoredAttempt } from "../shared/types";

const app = express();
const port = Number(process.env.PORT ?? 8787);
const distDir = path.resolve(process.cwd(), "dist");

app.use(express.json());

app.get("/api/health", (_req, res) => {
  res.json({ ok: true });
});

app.get("/api/puzzles", (_req, res) => {
  res.json({ puzzles, stages });
});

app.get("/api/lab", (_req, res) => {
  res.json({ collections: labCollections, puzzles: labPuzzles });
});

app.post("/api/generate", (req, res) => {
  try {
    res.json(generatePuzzle(req.body));
  } catch (error) {
    res.status(404).json({ error: error instanceof Error ? error.message : "Generation failed" });
  }
});

app.get("/api/puzzles/:id", (req, res) => {
  const puzzle = getPuzzleById(req.params.id);
  if (!puzzle) {
    res.status(404).json({ error: "Puzzle not found" });
    return;
  }
  res.json({ puzzle, hints: makeHints(puzzle), solutionCount: puzzle.solutionCount });
});

app.get("/api/daily", (_req, res) => {
  const puzzle = dailyPuzzleForDate(new Date());
  res.json({ puzzle, hints: makeHints(puzzle), solutionCount: puzzle.solutionCount });
});

app.get("/api/seed/:seed", (req, res) => {
  const puzzle = getPuzzleBySeed(req.params.seed);
  if (!puzzle) {
    res.status(404).json({ error: "Seed not found" });
    return;
  }
  res.json({ puzzle, hints: makeHints(puzzle), solutionCount: puzzle.solutionCount });
});

app.post("/api/training/next", (req, res) => {
  const metrics = req.body as PlayerMetrics & { excludeIds?: string[] };
  const recommendation = recommendDifficulty(metrics);
  const puzzle = closestPuzzleByDs(recommendation.targetDs, metrics.excludeIds ?? []);
  res.json({ puzzle, hints: makeHints(puzzle), solutionCount: puzzle.solutionCount, recommendation });
});

app.post("/api/coach", (req, res) => {
  const { puzzleId, elapsedMs, hintsUsed, cardsLeft } = req.body as {
    puzzleId?: string;
    elapsedMs?: number;
    hintsUsed?: number;
    cardsLeft?: number;
  };
  const puzzle = puzzleId ? getPuzzleById(puzzleId) : undefined;
  if (!puzzle || typeof elapsedMs !== "number" || typeof hintsUsed !== "number" || typeof cardsLeft !== "number") {
    res.status(400).json({ error: "Invalid coach request" });
    return;
  }
  res.json({ message: coachForState(elapsedMs, hintsUsed, cardsLeft, puzzle) });
});

app.post("/api/attempts", (req, res) => {
  const { puzzleId, solutionKey, expression, elapsedMs, hintsUsed } = req.body as Partial<StoredAttempt>;
  if (!puzzleId || !solutionKey || !expression || typeof elapsedMs !== "number" || typeof hintsUsed !== "number") {
    res.status(400).json({ error: "Invalid attempt" });
    return;
  }
  const existing = attemptsForPuzzle(puzzleId);
  const isNew = !existing.some((attempt) => attempt.solutionKey === solutionKey);
  const attempt: StoredAttempt = {
    puzzleId,
    solutionKey,
    expression,
    elapsedMs,
    hintsUsed,
    createdAt: new Date().toISOString()
  };
  addAttempt(attempt);
  res.json({
    attempt,
    isNew,
    score: scoreAttempt(elapsedMs, hintsUsed, isNew),
    discoveredCount: new Set([...existing.map((item) => item.solutionKey), solutionKey]).size
  });
});

app.get("/api/attempts/:puzzleId", (req, res) => {
  const attempts = attemptsForPuzzle(req.params.puzzleId);
  res.json({
    attempts,
    discoveredKeys: Array.from(new Set(attempts.map((attempt) => attempt.solutionKey)))
  });
});

app.get("/api/leaderboard/:puzzleId", (req, res) => {
  const rows = attemptsForPuzzle(req.params.puzzleId)
    .map((attempt) => ({
      ...attempt,
      score: scoreAttempt(attempt.elapsedMs, attempt.hintsUsed, false)
    }))
    .sort((a, b) => a.elapsedMs - b.elapsedMs)
    .slice(0, 20);
  res.json({ rows });
});

app.get("/api/stats", (_req, res) => {
  const attempts = readStore().attempts;
  const byPuzzle = new Map<string, Set<string>>();
  attempts.forEach((attempt) => {
    if (!byPuzzle.has(attempt.puzzleId)) byPuzzle.set(attempt.puzzleId, new Set());
    byPuzzle.get(attempt.puzzleId)!.add(attempt.solutionKey);
  });
  res.json({
    attempts: attempts.length,
    solvedPuzzles: new Set(attempts.map((attempt) => attempt.puzzleId)).size,
    discoveredSolutions: new Set(attempts.map((attempt) => `${attempt.puzzleId}:${attempt.solutionKey}`)).size,
    archive: Array.from(byPuzzle.entries()).map(([puzzleId, keys]) => ({ puzzleId, discovered: keys.size }))
  });
});

app.use(express.static(distDir));
app.get(/^\/(?!api).*/, (_req, res) => {
  res.sendFile(path.join(distDir, "index.html"));
});

app.listen(port, "0.0.0.0", () => {
  console.log(`API listening on http://0.0.0.0:${port}`);
});
