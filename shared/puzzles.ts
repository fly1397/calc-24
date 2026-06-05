import { solvePuzzle, standardRuleSet } from "./engine";
import type { Operator, Puzzle, RuleSet } from "./types";

export type StageDefinition = {
  name: string;
  theme: string;
  dsMin: number;
  dsMax: number;
  bossRule?: Partial<RuleSet>;
};

export const ruleSets: Record<string, RuleSet> = {
  standard: standardRuleSet,
  addSubMul: {
    ...standardRuleSet,
    id: "add-sub-mul",
    name: "禁用除法",
    description: "只能使用加、减、乘，不能靠除法破局。",
    operators: ["+", "-", "*"]
  },
  mustDivide: {
    ...standardRuleSet,
    id: "must-divide",
    name: "必须除法",
    description: "完整解法中必须至少使用一次除法。",
    requiredOperator: "/"
  },
  finalMultiply: {
    ...standardRuleSet,
    id: "final-multiply",
    name: "乘法收官",
    description: "最后一步必须是乘法。",
    finalOperator: "*"
  },
  finalDivide: {
    ...standardRuleSet,
    id: "final-divide",
    name: "除法收官",
    description: "最后一步必须是除法。",
    finalOperator: "/",
    requiredOperator: "/"
  },
  integerOnly: {
    ...standardRuleSet,
    id: "integer-only",
    name: "整数路线",
    description: "中间结果不能出现分数。",
    allowFraction: false
  },
  noNegative: {
    ...standardRuleSet,
    id: "no-negative",
    name: "不许负数",
    description: "中间结果不能为负数。",
    allowNegative: false
  },
  concat: {
    ...standardRuleSet,
    id: "concat",
    name: "数字拼接",
    description: "允许把两张整数牌按点击顺序拼成多位数。",
    operators: ["+", "-", "*", "/", "concat"],
    allowConcat: true
  },
  poison5: {
    ...standardRuleSet,
    id: "poison-5",
    name: "毒苹果 5选4",
    description: "从 5 张牌里选择 4 张进入计算区，剩下一张是干扰项。",
    cardCount: 5,
    useCount: 4
  },
  poison6: {
    ...standardRuleSet,
    id: "poison-6",
    name: "毒苹果 6选4",
    description: "从 6 张牌里选择 4 张进入计算区，剩下两张是干扰项。",
    cardCount: 6,
    useCount: 4
  },
  grand5: {
    ...standardRuleSet,
    id: "grand-5",
    name: "大满贯 5卡",
    description: "5 张牌必须全部用完，最终得到 24。",
    cardCount: 5,
    useCount: 5
  },
  grand6: {
    ...standardRuleSet,
    id: "grand-6",
    name: "大满贯 6卡",
    description: "6 张牌必须全部用完，依靠抵消策略得到 24。",
    cardCount: 6,
    useCount: 6
  },
  specialCards: {
    ...standardRuleSet,
    id: "special-cards",
    name: "特殊卡牌",
    description: "包含冰冻牌、幻影牌或小丑牌。",
    cardCount: 4,
    useCount: 4
  },
  advancedMath: {
    ...standardRuleSet,
    id: "advanced-math",
    name: "高阶符号",
    description: "允许使用平方、开方、阶乘等一元运算。",
    unaryOperators: ["square", "sqrt", "factorial"],
    requiredUnary: true,
    unaryLimit: 1,
    cardCount: 4,
    useCount: 4
  }
};

export const stages: StageDefinition[] = [
  { name: "入门班", theme: "认识 24 的基本拆法。", dsMin: 1, dsMax: 12, bossRule: { id: "add-sub-mul" } },
  { name: "小学生", theme: "用加减乘稳定凑出 6、8、12。", dsMin: 8, dsMax: 20, bossRule: { id: "final-multiply" } },
  { name: "拆数班", theme: "从 24 反推关键中间值。", dsMin: 16, dsMax: 30, bossRule: { id: "integer-only" } },
  { name: "除法班", theme: "除法开始成为破局工具。", dsMin: 24, dsMax: 42, bossRule: { id: "must-divide" } },
  { name: "分数班", theme: "接受分数中转，不再只找整数。", dsMin: 36, dsMax: 58, bossRule: { id: "must-divide" } },
  { name: "反向构造", theme: "用 25-1、30-6、32-8 靠近目标。", dsMin: 44, dsMax: 64, bossRule: { id: "no-negative" } },
  { name: "多解法馆", theme: "同一题往往存在多条路线。", dsMin: 32, dsMax: 62, bossRule: { id: "final-multiply" } },
  { name: "速度考场", theme: "题目不怪，但要求快速识别结构。", dsMin: 28, dsMax: 56, bossRule: { id: "integer-only" } },
  { name: "分母迷宫", theme: "经典难题开始出现。", dsMin: 58, dsMax: 78, bossRule: { id: "final-divide" } },
  { name: "唯一解区", theme: "解法数量变少，试错成本更高。", dsMin: 68, dsMax: 86, bossRule: { id: "must-divide" } },
  { name: "研究生", theme: "需要组合多个技巧。", dsMin: 70, dsMax: 90, bossRule: { id: "final-divide" } },
  { name: "博士生", theme: "每一步都要有目的。", dsMin: 76, dsMax: 96, bossRule: { id: "no-negative" } },
  { name: "炼狱一层", theme: "规则限制和高难题同时出现。", dsMin: 82, dsMax: 100, bossRule: { id: "final-divide" } },
  { name: "数学之神", theme: "压轴题库，追求稀有解法。", dsMin: 88, dsMax: 100, bossRule: { id: "final-divide" } }
];

const titlePool = ["热身", "凑形", "拆桥", "反推", "换路", "转折", "破局", "双线", "暗门", "收束"];

const estimateDs = (cards: number[], solutionCount: number, firstTags: string[]): number => {
  const spread = Math.max(...cards) - Math.min(...cards);
  const hasRepeat = new Set(cards).size < cards.length;
  const tagBoost = firstTags.includes("分数中转") ? 22 : firstTags.includes("除法解") ? 15 : firstTags.includes("减法构造") ? 8 : 0;
  const scarcity = solutionCount <= 1 ? 38 : solutionCount <= 3 ? 28 : solutionCount <= 8 ? 18 : 8;
  return Math.max(1, Math.min(100, Math.round(spread * 2.2 + scarcity + tagBoost - (hasRepeat ? 4 : 0))));
};

const candidates = (): number[][] => {
  const result: number[][] = [];
  for (let a = 1; a <= 13; a += 1) {
    for (let b = a; b <= 13; b += 1) {
      for (let c = b; c <= 13; c += 1) {
        for (let d = c; d <= 13; d += 1) {
          result.push([a, b, c, d]);
        }
      }
    }
  }
  return result;
};

const shuffleKey = (cards: number[], salt: number): number =>
  cards.reduce((sum, value, index) => sum + value * (index + 3) * (salt + 11), 0) % 997;

const ruleFromPartial = (partial?: Partial<RuleSet>): RuleSet => {
  if (!partial?.id) return ruleSets.standard;
  return Object.values(ruleSets).find((ruleSet) => ruleSet.id === partial.id) ?? ruleSets.standard;
};

const makePuzzleBank = (): Puzzle[] => {
  const source = candidates()
    .map((cards) => {
      const standardSolutions = solvePuzzle(cards, 24, 24, ruleSets.standard);
      if (standardSolutions.length === 0) return null;
      return {
        cards,
        solutionCount: standardSolutions.length,
        tags: standardSolutions[0].tags,
        ds: estimateDs(cards, standardSolutions.length, standardSolutions[0].tags)
      };
    })
    .filter((item): item is { cards: number[]; solutionCount: number; tags: string[]; ds: number } => Boolean(item));

  const used = new Set<string>();
  const bank: Puzzle[] = [];

  stages.forEach((stage, stageIndex) => {
    for (let stageLevel = 1; stageLevel <= 20; stageLevel += 1) {
      const boss = stageLevel === 20;
      const ruleSet = boss ? ruleFromPartial(stage.bossRule) : ruleSets.standard;
      const min = Math.max(1, stage.dsMin - (boss ? 0 : 8));
      const max = Math.min(100, stage.dsMax + (boss ? 8 : 6));
      const sorted = source
        .filter((item) => item.ds >= min && item.ds <= max)
        .sort((a, b) => shuffleKey(a.cards, stageIndex * 20 + stageLevel) - shuffleKey(b.cards, stageIndex * 20 + stageLevel));
      const selected =
        sorted.find((item) => {
          const key = `${item.cards.join("-")}:${ruleSet.id}`;
          if (used.has(key)) return false;
          if (boss && solvePuzzle(item.cards, 24, 3, ruleSet).length === 0) return false;
          return true;
        }) ?? sorted[0] ?? source[(stageIndex * 20 + stageLevel) % source.length];
      const key = `${selected.cards.join("-")}:${ruleSet.id}`;
      used.add(key);
      const ruleSolutions = solvePuzzle(selected.cards, 24, 24, ruleSet);
      const level = stageIndex * 20 + stageLevel;
      bank.push({
        id: `main-${level}`,
        seed: `ABS-${level}-${selected.cards.join("")}-${ruleSet.id}`,
        title: boss ? `${stage.name} 结业考` : titlePool[(stageLevel + stageIndex) % titlePool.length],
        stage: stage.name,
        stageIndex,
        level,
        stageLevel,
        cards: selected.cards,
        target: 24,
        ds: selected.ds,
        tags: Array.from(new Set([...(boss ? ["考试"] : []), ...selected.tags, ...ruleSet.name.split(" ")])),
        boss,
        variant: "standard",
        ruleSet,
        solutionCount: Math.max(1, ruleSolutions.length)
      });
    }
  });

  return bank;
};

export const puzzles: Puzzle[] = makePuzzleBank();

const makeLabPuzzle = (
  index: number,
  title: string,
  cards: number[],
  ruleSet: RuleSet,
  variant: Puzzle["variant"],
  ds: number,
  tags: string[]
): Puzzle => {
  const solutions = solvePuzzle(cards, 24, 40, ruleSet);
  return {
    id: `lab-${index}`,
    seed: `LAB-${index}-${cards.join("")}-${ruleSet.id}`,
    title,
    stage: "异构实验室",
    stageIndex: 99,
    level: index,
    stageLevel: index,
    cards,
    target: 24,
    ds,
    tags,
    boss: false,
    variant,
    ruleSet,
    solutionCount: Math.max(1, solutions.length)
  };
};

export const labPuzzles: Puzzle[] = [
  makeLabPuzzle(1, "毒苹果入门", [10, 1, 5, 6, 9], ruleSets.poison5, "poison", 38, ["5选4", "干扰项"]),
  makeLabPuzzle(2, "毒苹果双干扰", [8, 4, 1, 8, 7, 11], ruleSets.poison6, "poison", 52, ["6选4", "干扰项"]),
  makeLabPuzzle(3, "大满贯入门", [1, 2, 3, 4, 6], ruleSets.grand5, "grand", 58, ["5卡全用", "抵消"]),
  makeLabPuzzle(4, "大满贯抵消", [2, 3, 4, 6, 8], ruleSets.grand5, "grand", 68, ["5卡全用", "抵消"]),
  makeLabPuzzle(5, "六卡硬算", [1, 2, 3, 4, 6, 8], ruleSets.grand6, "grand", 76, ["6卡全用", "高压"]),
  makeLabPuzzle(6, "打破次元壁", [1, 2, 4, 2], ruleSets.concat, "concat", 45, ["数字拼接"]),
  makeLabPuzzle(7, "拼接反推", [1, 2, 3, 6], ruleSets.concat, "concat", 48, ["数字拼接"]),
  makeLabPuzzle(8, "拼接深水", [2, 4, 1, 8], ruleSets.concat, "concat", 62, ["数字拼接", "反向构造"])
];

export type LabCollection = {
  id: string;
  title: string;
  subtitle: string;
  description: string;
  accent: string;
  reward: string;
  unlockHint: string;
  puzzles: Puzzle[];
};

export const labCollections: LabCollection[] = [
  {
    id: "poison",
    title: "毒苹果残局",
    subtitle: "5选4 / 6选4",
    description: "先找出真正能成 24 的 4 张牌，再处理干扰项带来的认知压力。",
    accent: "#17b98d",
    reward: "高金币",
    unlockHint: "主线研究生阶段后自然出现。",
    puzzles: labPuzzles.filter((puzzle) => puzzle.variant === "poison")
  },
  {
    id: "grand",
    title: "大满贯挑战",
    subtitle: "5卡 / 6卡全用",
    description: "所有牌都必须消耗，核心技巧是把多余数字抵消成 0 或 1。",
    accent: "#2364ff",
    reward: "智慧星加成",
    unlockHint: "适合已经熟悉分数和抵消策略的玩家。",
    puzzles: labPuzzles.filter((puzzle) => puzzle.variant === "grand")
  },
  {
    id: "concat",
    title: "拼接实验",
    subtitle: "打破次元壁",
    description: "允许把两张牌拼成多位数，改变传统四则运算的破局路径。",
    accent: "#ff6b1a",
    reward: "稀有解法",
    unlockHint: "后续可作为极品道具或伟人关卡能力。",
    puzzles: labPuzzles.filter((puzzle) => puzzle.variant === "concat")
  },
  {
    id: "special",
    title: "特殊牌实验",
    subtitle: "冰冻 / 幻影 / 小丑",
    description: "预留给冰冻牌、幻影牌、小丑牌等 Roguelike 机制。",
    accent: "#9b1d2d",
    reward: "深渊印记",
    unlockHint: "地狱模式开放后解锁。",
    puzzles: []
  },
  {
    id: "advanced-math",
    title: "高阶符号实验",
    subtitle: "平方 / 开方 / 阶乘",
    description: "预留给进阶数学符号，适合后期高玩挑战和特殊赛季。",
    accent: "#5b45d9",
    reward: "教授徽章",
    unlockHint: "数学之神阶段后解锁。",
    puzzles: []
  }
];

export const allPuzzles: Puzzle[] = [...puzzles, ...labPuzzles];

export const getPuzzleById = (id: string): Puzzle | undefined => allPuzzles.find((puzzle) => puzzle.id === id);

export const getPuzzleBySeed = (seed: string): Puzzle | undefined => allPuzzles.find((puzzle) => puzzle.seed === seed);

export const dailyPuzzleForDate = (date = new Date()): Puzzle => {
  const start = Date.UTC(2026, 0, 1);
  const today = Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
  const index = Math.abs(Math.floor((today - start) / 86400000)) % puzzles.length;
  return { ...puzzles[index], id: `daily-${date.toISOString().slice(0, 10)}`, title: "每日一题" };
};

export const closestPuzzleByDs = (targetDs: number, excludeIds: string[] = []): Puzzle =>
  [...puzzles]
    .filter((puzzle) => !excludeIds.includes(puzzle.id))
    .sort((a, b) => Math.abs(a.ds - targetDs) - Math.abs(b.ds - targetDs))[0] ?? puzzles[0];
