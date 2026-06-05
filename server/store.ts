import fs from "node:fs";
import path from "node:path";
import type { StoredAttempt } from "../shared/types";

type StoreShape = {
  attempts: StoredAttempt[];
};

const dataDir = path.resolve(process.cwd(), "data");
const dataFile = path.join(dataDir, "store.json");

const ensureStore = () => {
  if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
  if (!fs.existsSync(dataFile)) fs.writeFileSync(dataFile, JSON.stringify({ attempts: [] }, null, 2));
};

export const readStore = (): StoreShape => {
  ensureStore();
  return JSON.parse(fs.readFileSync(dataFile, "utf8")) as StoreShape;
};

export const writeStore = (store: StoreShape) => {
  ensureStore();
  fs.writeFileSync(dataFile, JSON.stringify(store, null, 2));
};

export const addAttempt = (attempt: StoredAttempt) => {
  const store = readStore();
  store.attempts.push(attempt);
  writeStore(store);
};

export const attemptsForPuzzle = (puzzleId: string): StoredAttempt[] =>
  readStore().attempts.filter((attempt) => attempt.puzzleId === puzzleId);
