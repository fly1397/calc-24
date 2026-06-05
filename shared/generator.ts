import { solvePuzzle, standardRuleSet } from "./engine";
import type { Operator, Puzzle, RuleSet, Solution } from "./types";

export type GeneratePuzzleConfig = {
  target?: number;
  cardCount: number;
  useCount: number;
  numberRange: [number, number];
  operators: Operator[];
  allowFraction: boolean;
  allowNegative: boolean;
  allowConcat?: boolean;
  dsRange?: [number, number];
  minSolutionCount?: number;
  maxSolutionCount?: number;
  requiredTags?: string[];
  forbiddenTags?: string[];
  requireUniqueSolution?: boolean;
  variant: Puzzle["variant"];
  seed: string;
};

export type GeneratedPuzzleResult = {
  puzzle: Puzzle;
  solutions: Solution[];
};

const hash = (text: string): number => {
  let value = 2166136261;
  for (let index = 0; index < text.length; index += 1) {
    value ^= text.charCodeAt(index);
    value = Math.imul(value, 16777619);
  }
  return value >>> 0;
};

const combinationsWithReplacement = (min: number, max: number, count: number): number[][] => {
  const result: number[][] = [];
  const walk = (start: number, picked: number[]) => {
    if (picked.length === count) {
      result.push(picked);
      return;
    }
    for (let value = start; value <= max; value += 1) {
      walk(value, [...picked, value]);
    }
  };
  walk(min, []);
  return result;
};

export const makeRuleSetFromConfig = (config: GeneratePuzzleConfig): RuleSet => ({
  ...standardRuleSet,
  id: `generated-${config.variant}-${hash(JSON.stringify(config)).toString(36)}`,
  name: config.allowConcat ? "动态拼接规则" : "动态生成规则",
  description: `${config.cardCount} 张牌，使用 ${config.useCount} 张，目标 ${config.target ?? 24}。`,
  operators: config.operators,
  allowNegative: config.allowNegative,
  allowFraction: config.allowFraction,
  allowConcat: config.allowConcat,
  cardCount: config.cardCount,
  useCount: config.useCount
});

export const scoreDifficulty = (cards: number[], solutions: Solution[], ruleSet: RuleSet): number => {
  const solutionCount = solutions.length;
  const tags = new Set(solutions.flatMap((solution) => solution.tags));
  const spread = Math.max(...cards) - Math.min(...cards);
  const scarcity = solutionCount <= 1 ? 38 : solutionCount <= 3 ? 30 : solutionCount <= 8 ? 20 : 8;
  const fraction = tags.has("分数中转") ? 20 : 0;
  const division = tags.has("除法解") ? 12 : 0;
  const subtraction = tags.has("减法构造") ? 8 : 0;
  const concat = ruleSet.allowConcat ? 10 : 0;
  const poison = ruleSet.cardCount > ruleSet.useCount ? (ruleSet.cardCount - ruleSet.useCount) * 8 : 0;
  const grand = ruleSet.useCount > 4 ? (ruleSet.useCount - 4) * 12 : 0;
  const restriction = ruleSet.operators.length < 4 ? 10 : 0;
  return Math.max(1, Math.min(100, Math.round(spread * 1.8 + scarcity + fraction + division + subtraction + concat + poison + grand + restriction)));
};

const matchesTags = (solutions: Solution[], required: string[] = [], forbidden: string[] = []): boolean => {
  const tags = new Set(solutions.flatMap((solution) => solution.tags));
  return required.every((tag) => tags.has(tag)) && forbidden.every((tag) => !tags.has(tag));
};

export const generatePuzzle = (config: GeneratePuzzleConfig): GeneratedPuzzleResult => {
  const target = config.target ?? 24;
  const ruleSet = makeRuleSetFromConfig(config);
  const [min, max] = config.numberRange;
  const ordered = combinationsWithReplacement(min, max, config.cardCount).sort(
    (a, b) => hash(`${config.seed}:${a.join("-")}`) - hash(`${config.seed}:${b.join("-")}`)
  );

  for (const cards of ordered) {
    const solutions = solvePuzzle(cards, target, 80, ruleSet);
    if (solutions.length === 0) continue;
    if (config.requireUniqueSolution && solutions.length !== 1) continue;
    if (solutions.length < (config.minSolutionCount ?? 1)) continue;
    if (config.maxSolutionCount && solutions.length > config.maxSolutionCount) continue;
    if (!matchesTags(solutions, config.requiredTags, config.forbiddenTags)) continue;
    const ds = scoreDifficulty(cards, solutions, ruleSet);
    if (config.dsRange && (ds < config.dsRange[0] || ds > config.dsRange[1])) continue;
    return {
      puzzle: {
        id: `gen-${hash(`${config.seed}:${cards.join("-")}`).toString(36)}`,
        seed: config.seed,
        title: "动态方程式",
        stage: "种子引擎",
        stageIndex: 100,
        level: 0,
        stageLevel: 0,
        cards,
        target,
        ds,
        tags: Array.from(new Set(solutions.flatMap((solution) => solution.tags))).slice(0, 5),
        boss: false,
        variant: config.variant,
        ruleSet,
        solutionCount: solutions.length
      },
      solutions
    };
  }

  throw new Error("No puzzle matched the generation config");
};
