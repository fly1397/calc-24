import { solvePuzzle } from "./engine";
import { scoreDifficulty } from "./generator";
import { puzzles, ruleSets } from "./puzzles";
import type { Puzzle, RuleSet } from "./types";

export type HellLayer = {
  id: string;
  name: string;
  subtitle: string;
  ruleSet: RuleSet;
  puzzles: Puzzle[];
};

const hellNames = [
  "算术盲区",
  "逻辑死结",
  "迷失坐标",
  "变量深渊",
  "无理数沼泽",
  "薛定谔陷阱",
  "芝诺之龟",
  "彭罗斯阶梯",
  "莫比乌斯环",
  "拓扑死局",
  "哥德尔极限",
  "绝对零度",
  "量子坍缩",
  "引力撕裂",
  "混沌分形",
  "熵增末日",
  "维度剥离",
  "真理虚无"
];

const hellRules = [ruleSets.addSubMul, ruleSets.noNegative, ruleSets.integerOnly, ruleSets.mustDivide, ruleSets.finalMultiply, ruleSets.finalDivide];

const hash = (text: string): number => {
  let value = 0;
  for (let index = 0; index < text.length; index += 1) value = (value * 33 + text.charCodeAt(index)) >>> 0;
  return value;
};

const makePuzzle = (base: Puzzle, layerIndex: number, level: number, ruleSet: RuleSet): Puzzle => {
  const solutions = solvePuzzle(base.cards, 24, 30, ruleSet);
  const usableBase = solutions.length > 0 ? base : puzzles.find((candidate) => solvePuzzle(candidate.cards, 24, 2, ruleSet).length > 0) ?? base;
  const usableSolutions = solvePuzzle(usableBase.cards, 24, 30, ruleSet);
  const rawDs = scoreDifficulty(usableBase.cards, usableSolutions, ruleSet) + layerIndex * 2;
  const solutionRelief = usableSolutions.length >= 30 ? 22 : usableSolutions.length >= 16 ? 12 : usableSolutions.length >= 8 ? 6 : 0;
  return {
    ...usableBase,
    id: `hell-${layerIndex + 1}-${level}`,
    seed: `HELL-${layerIndex + 1}-${level}-${usableBase.cards.join("")}-${ruleSet.id}`,
    title: `${hellNames[layerIndex]} ${level}`,
    stage: hellNames[layerIndex],
    stageIndex: 200 + layerIndex,
    level,
    stageLevel: level,
    ds: Math.max(1, Math.min(100, rawDs - solutionRelief)),
    tags: Array.from(new Set(["地狱", ruleSet.name, ...usableBase.tags])).slice(0, 5),
    boss: level === 10,
    variant: "hell",
    ruleSet,
    solutionCount: Math.max(1, usableSolutions.length)
  };
};

let hellCache: HellLayer[] | undefined;

export const generateHellLayers = (): HellLayer[] => {
  if (hellCache) return hellCache;
  hellCache = hellNames.map((name, layerIndex) => {
    const ruleSet = hellRules[layerIndex % hellRules.length];
    const candidates = [...puzzles].sort((a, b) => hash(`${name}-${a.seed}`) - hash(`${name}-${b.seed}`));
    return {
      id: `hell-${layerIndex + 1}`,
      name,
      subtitle: layerIndex === hellNames.length - 1 ? "最终关卡：认知崩塌" : ruleSet.description,
      ruleSet,
      puzzles: Array.from({ length: 10 }, (_, index) => makePuzzle(candidates[(layerIndex * 10 + index) % candidates.length], layerIndex, index + 1, ruleSet))
    };
  });
  return hellCache;
};

export const generateRacePack = (seed = new Date().toISOString().slice(0, 10), count = 10): Puzzle[] =>
  [...puzzles]
    .sort((a, b) => hash(`${seed}-${a.seed}`) - hash(`${seed}-${b.seed}`))
    .filter((puzzle) => puzzle.ds >= 15 && puzzle.ds <= 75)
    .slice(0, count)
    .map((puzzle, index) => ({
      ...puzzle,
      id: `race-${seed}-${index + 1}`,
      seed: `RACE-${seed}-${index + 1}-${puzzle.seed}`,
      title: `竞速题 ${index + 1}`,
      stage: "竞速模式",
      level: index + 1,
      stageLevel: index + 1
    }));

export const findModePuzzle = (id: string): Puzzle | undefined => {
  const hell = generateHellLayers().flatMap((layer) => layer.puzzles).find((puzzle) => puzzle.id === id);
  if (hell) return hell;
  if (id.startsWith("race-")) return generateRacePack().find((puzzle) => puzzle.id === id);
  return undefined;
};
