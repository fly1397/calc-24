import { solvePuzzle } from "./engine";
import { scoreDifficulty } from "./generator";
import { puzzles, ruleSets } from "./puzzles";
import type { Puzzle, SpecialCardSpec } from "./types";

export type LabCollectionDefinition = {
  id: string;
  title: string;
  subtitle: string;
  description: string;
  accent: string;
  reward: string;
  unlockHint: string;
  enabled: boolean;
};

export type LabCollectionRuntime = LabCollectionDefinition & {
  weekSeed: string;
  puzzles: Puzzle[];
};

export const labCollectionDefinitions: LabCollectionDefinition[] = [
  {
    id: "poison",
    title: "毒苹果残局",
    subtitle: "5选4 / 6选4",
    description: "先找出真正能成 24 的 4 张牌，再处理干扰项带来的认知压力。",
    accent: "#17b98d",
    reward: "高金币",
    unlockHint: "每周刷新 20 个干扰残局。",
    enabled: true
  },
  {
    id: "grand",
    title: "大满贯挑战",
    subtitle: "5卡 / 6卡全用",
    description: "所有牌都必须消耗，核心技巧是把多余数字抵消成 0 或 1。",
    accent: "#2364ff",
    reward: "智慧星加成",
    unlockHint: "每周刷新 20 个硬算挑战。",
    enabled: true
  },
  {
    id: "concat",
    title: "拼接实验",
    subtitle: "打破次元壁",
    description: "允许把两张牌拼成多位数，改变传统四则运算的破局路径。",
    accent: "#ff6b1a",
    reward: "稀有解法",
    unlockHint: "每周刷新 20 个拼接挑战。",
    enabled: true
  },
  {
    id: "special",
    title: "特殊牌实验",
    subtitle: "冰冻 / 幻影 / 小丑",
    description: "预留给冰冻牌、幻影牌、小丑牌等 Roguelike 机制。",
    accent: "#9b1d2d",
    reward: "深渊印记",
    unlockHint: "地狱模式开放后解锁。",
    enabled: false
  },
  {
    id: "advanced-math",
    title: "高阶符号实验",
    subtitle: "平方 / 开方 / 阶乘",
    description: "预留给进阶数学符号，适合后期高玩挑战和特殊赛季。",
    accent: "#5b45d9",
    reward: "教授徽章",
    unlockHint: "数学之神阶段后解锁。",
    enabled: false
  }
];

const weekSeedForDate = (date = new Date()): string => {
  const start = Date.UTC(2026, 0, 5);
  const today = Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
  return `week-${Math.floor((today - start) / (7 * 86400000))}`;
};

const hash = (text: string): number => {
  let value = 0;
  for (let index = 0; index < text.length; index += 1) value = (value * 31 + text.charCodeAt(index)) >>> 0;
  return value;
};

const pickBase = (weekSeed: string, collectionId: string, level: number): Puzzle => {
  const sorted = [...puzzles].sort((a, b) => {
    const seed = `${weekSeed}-${collectionId}-${level}`;
    return hash(`${seed}-${a.seed}`) - hash(`${seed}-${b.seed}`);
  });
  const targetDs = Math.min(95, 16 + level * 4);
  return sorted.sort((a, b) => Math.abs(a.ds - targetDs) - Math.abs(b.ds - targetDs))[0];
};

const makeRuntimePuzzle = (base: Puzzle, collectionId: string, level: number, weekSeed: string, cards: number[], ruleSet: Puzzle["ruleSet"], variant: Puzzle["variant"], title: string, specialCards: SpecialCardSpec[] = []): Puzzle => {
  const solutions = solvePuzzle(cards, 24, 30, ruleSet);
  const fallback = solutions.length > 0 ? undefined : puzzles.find((candidate) => solvePuzzle(candidate.cards, 24, 2, ruleSet).length > 0);
  const finalCards = fallback?.cards ?? cards;
  const finalSolutions = fallback ? solvePuzzle(finalCards, 24, 30, ruleSet) : solutions;
  const rawDs = scoreDifficulty(finalCards, finalSolutions, ruleSet);
  const solutionRelief = finalSolutions.length >= 30 ? 24 : finalSolutions.length >= 16 ? 14 : finalSolutions.length >= 8 ? 8 : 0;
  const ds = Math.max(1, Math.min(100, rawDs - solutionRelief));
  return {
    ...(fallback ?? base),
    id: `lab-${collectionId}-${weekSeed}-${level}`,
    seed: `LAB-${collectionId.toUpperCase()}-${weekSeed}-${level}`,
    title,
    stage: title.replace(` ${level}`, ""),
    stageIndex: 90,
    level,
    stageLevel: level,
    cards: finalCards,
    ds,
    tags: Array.from(new Set([variant, ...finalSolutions.flatMap((solution) => solution.tags), ...(fallback ?? base).tags])).slice(0, 5),
    boss: level === 20,
    variant,
    ruleSet,
    solutionCount: Math.max(1, finalSolutions.length),
    specialCards
  };
};

let cachedConcatPool: number[][] | undefined;

const concatPool = (): number[][] => {
  if (cachedConcatPool) return cachedConcatPool;
  const result: number[][] = [];
  for (let a = 1; a <= 9; a += 1) {
    for (let b = 1; b <= 9; b += 1) {
      for (let c = 1; c <= 13; c += 1) {
        for (let d = 1; d <= 13; d += 1) {
          const cards = [a, b, c, d].sort((x, y) => x - y);
          const key = cards.join("-");
          if (result.some((item) => item.join("-") === key)) continue;
          const solutions = solvePuzzle(cards, 24, 8, ruleSets.concat);
          if (solutions.some((solution) => solution.tags.includes("数字拼接"))) result.push(cards);
          if (result.length >= 80) {
            cachedConcatPool = result;
            return result;
          }
        }
      }
    }
  }
  cachedConcatPool = result;
  return result;
};

export const generateWeeklyLabPuzzles = (collectionId: string, date = new Date(), count = 20, includeLocked = false): Puzzle[] => {
  const weekSeed = weekSeedForDate(date);
  const definition = labCollectionDefinitions.find((item) => item.id === collectionId);
  if (!definition || (!definition.enabled && !includeLocked)) return [];
  return Array.from({ length: count }, (_, index) => {
    const level = index + 1;
    const base = pickBase(weekSeed, collectionId, level);
    if (collectionId === "poison") {
      const hard = level % 5 === 0;
      const extras = hard ? [((level * 5) % 13) + 1, ((level * 7) % 13) + 1] : [((level * 5) % 13) + 1];
      return makeRuntimePuzzle(base, collectionId, level, weekSeed, [...base.cards, ...extras], hard ? ruleSets.poison6 : ruleSets.poison5, "poison", `${definition.title} ${level}`);
    }
    if (collectionId === "grand") {
      const hard = level % 10 === 0;
      const extra = hard ? [level % 6 + 1, level % 6 + 1] : [1];
      return makeRuntimePuzzle(base, collectionId, level, weekSeed, [...base.cards, ...extra], hard ? ruleSets.grand6 : ruleSets.grand5, "grand", `${definition.title} ${level}`);
    }
    if (collectionId === "special") {
      const type = level % 3 === 0 ? "joker" : level % 3 === 1 ? "frost" : "ghost";
      const index = level % 4;
      const original = base.cards[index];
      const altValues = Array.from(new Set([((level * 7) % 9) + 1, ((level * 5 + 3) % 9) + 1, ((level * 3 + 4) % 9) + 1])).filter((value) => value !== original);
      const fallback = original === 9 ? 8 : 9;
      const specialCards: SpecialCardSpec[] = [{ index, type, altValue: altValues[0] ?? fallback, altValues: altValues.length ? altValues : [fallback] }];
      return makeRuntimePuzzle(base, collectionId, level, weekSeed, base.cards, ruleSets.specialCards, "hell", `${definition.title} ${level}`, specialCards);
    }
    if (collectionId === "advanced-math") {
      const templates = [
        [5, 5, 1, 1],
        [4, 4, 4, 4],
        [3, 4, 5, 6],
        [2, 3, 4, 4],
        [6, 4, 2, 1]
      ];
      const cards = templates[level % templates.length];
      return makeRuntimePuzzle(base, collectionId, level, weekSeed, cards, ruleSets.advancedMath, "hell", `${definition.title} ${level}`);
    }
    const pool = concatPool();
    const cards = pool[hash(`${weekSeed}-${level}`) % pool.length];
    return makeRuntimePuzzle(base, collectionId, level, weekSeed, cards, ruleSets.concat, "concat", `${definition.title} ${level}`);
  });
};

const weeklyCache = new Map<string, LabCollectionRuntime[]>();

export const generateWeeklyLabCollections = (date = new Date(), includeLocked = false): LabCollectionRuntime[] => {
  const weekSeed = weekSeedForDate(date);
  const cacheKey = `${weekSeed}:${includeLocked ? "all" : "normal"}`;
  const cached = weeklyCache.get(cacheKey);
  if (cached) return cached;
  const collections = labCollectionDefinitions.map((definition) => ({
    ...definition,
    weekSeed,
    puzzles: definition.enabled || includeLocked ? generateWeeklyLabPuzzles(definition.id, date, 20, includeLocked) : []
  }));
  weeklyCache.set(cacheKey, collections);
  return collections;
};
