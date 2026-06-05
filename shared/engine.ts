import { equalsFraction, formatFraction, makeFraction, operate } from "./fraction";
import type { CardState, CoachMessage, ExprNode, HintPack, Operator, PlayerMetrics, Puzzle, RuleSet, Solution } from "./types";

const operators: Operator[] = ["+", "-", "*", "/"];
const allOperators: Operator[] = ["+", "-", "*", "/", "concat"];
export const standardRuleSet: RuleSet = {
  id: "standard",
  name: "标准 24 点",
  description: "使用 4 张牌和四则运算得到 24。",
  operators,
  allowNegative: true,
  allowFraction: true,
  cardCount: 4,
  useCount: 4
};
const target24 = makeFraction(24);

export const makeInitialCards = (numbers: number[]): CardState[] =>
  numbers.map((number, index) => {
    const value = makeFraction(number);
    const id = `c${index}-${number}`;
    const expr: ExprNode = { type: "leaf", value, cardId: id, label: String(number) };
    return { id, value, expr };
  });

const opLabel = (op: Operator): string => (op === "*" ? "×" : op === "/" ? "÷" : op === "concat" ? "拼" : op);

const precedence = (op: Operator): number => (op === "+" || op === "-" ? 1 : op === "concat" ? 3 : 2);

export const expressionToString = (node: ExprNode, parentOp?: Operator, isRight = false): string => {
  if (node.type === "leaf") return node.label;
  const left = expressionToString(node.left, node.op, false);
  const right = expressionToString(node.right, node.op, true);
  let text = `${left} ${opLabel(node.op)} ${right}`;
  const needsParens =
    parentOp !== undefined &&
    (precedence(node.op) < precedence(parentOp) || (isRight && (parentOp === "-" || parentOp === "/")));
  if (needsParens) text = `(${text})`;
  return text;
};

export const buildSteps = (node: ExprNode): string[] => {
  if (node.type === "leaf") return [];
  return [
    ...buildSteps(node.left),
    ...buildSteps(node.right),
    `${expressionToString(node.left)} ${opLabel(node.op)} ${expressionToString(node.right)} = ${formatFraction(node.value)}`
  ];
};

const canonical = (node: ExprNode): string => {
  if (node.type === "leaf") return `n${formatFraction(node.value)}`;
  const flatten = (target: Operator, item: ExprNode): string[] => {
    if (item.type === "op" && item.op === target && (target === "+" || target === "*")) {
      return [...flatten(target, item.left), ...flatten(target, item.right)];
    }
    return [canonical(item)];
  };
  if (node.op === "+" || node.op === "*") {
    return `${node.op}(${flatten(node.op, node).sort().join(",")})`;
  }
  return `${node.op}(${canonical(node.left)},${canonical(node.right)})`;
};

const solutionTags = (node: ExprNode): string[] => {
  const tags = new Set<string>();
  const walk = (item: ExprNode) => {
    if (item.type === "leaf") return;
    if (item.op === "concat") tags.add("数字拼接");
    if (item.op === "/") tags.add("除法解");
    if (item.value.d !== 1) tags.add("分数中转");
    if (item.op === "-") tags.add("减法构造");
    if (equalsFraction(item.value, makeFraction(1))) tags.add("先造 1");
    if (equalsFraction(item.value, makeFraction(3))) tags.add("先造 3");
    if (equalsFraction(item.value, makeFraction(4))) tags.add("先造 4");
    if (equalsFraction(item.value, makeFraction(6))) tags.add("先造 6");
    walk(item.left);
    walk(item.right);
  };
  walk(node);
  if (tags.size === 0) tags.add("标准破局");
  return Array.from(tags).slice(0, 3);
};

export const mergeCards = (left: CardState, right: CardState, op: Operator, ruleSet: RuleSet = standardRuleSet): CardState | null => {
  if (!ruleSet.operators.includes(op)) return null;
  const value =
    op === "concat"
      ? left.value.d === 1 && right.value.d === 1 && left.value.n >= 0 && right.value.n >= 0
        ? makeFraction(Number(`${left.value.n}${right.value.n}`))
        : null
      : operate(left.value, right.value, op);
  if (!value) return null;
  if (!ruleSet.allowNegative && value.n < 0) return null;
  if (!ruleSet.allowFraction && value.d !== 1) return null;
  return {
    id: `${left.id}-${op}-${right.id}`,
    value,
    expr: {
      type: "op",
      value,
      op,
      left: left.expr,
      right: right.expr
    }
  };
};

export const solutionFromNode = (node: ExprNode): Solution => ({
  key: canonical(node),
  expression: expressionToString(node),
  steps: buildSteps(node),
  tags: solutionTags(node)
});

const containsOperator = (node: ExprNode, op: Operator): boolean => {
  if (node.type === "leaf") return false;
  return node.op === op || containsOperator(node.left, op) || containsOperator(node.right, op);
};

export const satisfiesRule = (node: ExprNode, ruleSet: RuleSet): boolean => {
  if (ruleSet.requiredOperator && !containsOperator(node, ruleSet.requiredOperator)) return false;
  if (ruleSet.finalOperator && (node.type !== "op" || node.op !== ruleSet.finalOperator)) return false;
  return true;
};

export const isSolved = (cards: CardState[], target = target24, ruleSet: RuleSet = standardRuleSet): boolean =>
  cards.length === 1 && equalsFraction(cards[0].value, target) && satisfiesRule(cards[0].expr, ruleSet);

const combinations = <T,>(items: T[], count: number): T[][] => {
  if (count >= items.length) return [items];
  const result: T[][] = [];
  const walk = (start: number, picked: T[]) => {
    if (picked.length === count) {
      result.push(picked);
      return;
    }
    for (let index = start; index < items.length; index += 1) {
      walk(index + 1, [...picked, items[index]]);
    }
  };
  walk(0, []);
  return result;
};

export const solvePuzzle = (numbers: number[], target = 24, maxSolutions = 80, ruleSet: RuleSet = standardRuleSet): Solution[] => {
  if (numbers.length > ruleSet.useCount) {
    const seen = new Map<string, Solution>();
    combinations(numbers, ruleSet.useCount).forEach((group) => {
      solvePuzzle(group, target, maxSolutions, { ...ruleSet, cardCount: ruleSet.useCount }).forEach((solution) => {
        if (seen.size < maxSolutions) seen.set(`${group.join("-")}:${solution.key}`, solution);
      });
    });
    return Array.from(seen.values());
  }
  const targetValue = makeFraction(target);
  const seen = new Map<string, Solution>();
  const search = (cards: CardState[]) => {
    if (seen.size >= maxSolutions) return;
    if (cards.length === 1) {
      if (equalsFraction(cards[0].value, targetValue) && satisfiesRule(cards[0].expr, ruleSet)) {
        const solution = solutionFromNode(cards[0].expr);
        seen.set(solution.key, solution);
      }
      return;
    }
    for (let i = 0; i < cards.length; i += 1) {
      for (let j = 0; j < cards.length; j += 1) {
        if (i === j) continue;
        const rest = cards.filter((_, index) => index !== i && index !== j);
        for (const op of allOperators) {
          if (!ruleSet.operators.includes(op)) continue;
          if ((op === "+" || op === "*") && j < i) continue;
          const merged = mergeCards(cards[i], cards[j], op, ruleSet);
          if (!merged) continue;
          search([...rest, merged]);
        }
      }
    }
  };
  search(makeInitialCards(numbers));
  return Array.from(seen.values());
};

export const makeHints = (puzzle: Puzzle): HintPack => {
  const first = solvePuzzle(puzzle.cards, puzzle.target, 1, puzzle.ruleSet)[0];
  if (!first) {
    return {
      level1: "这题可能没有标准解，先换个 Seed 试试。",
      level2: "没有找到关键中间值。",
      level3: "没有可推荐的第一步。",
      answer: []
    };
  }
  const keyStep = first.steps.find((step) => / = (1|3|4|6|8|12)$/.test(step)) ?? first.steps[0];
  return {
    level1: `可以从 ${first.tags[0] ?? "一个中间值"} 的方向想。`,
    level2: keyStep ? `关键线索：${keyStep.split(" = ").at(-1)} 会很有用。` : "先观察能否凑出 6、8 或 12。",
    level3: `先试试：${first.steps[0].replace(/ = .+$/, "")}`,
    answer: first.steps
  };
};

export const scoreAttempt = (elapsedMs: number, hintsUsed: number, isNew: boolean): number => {
  const hintWeight = [1, 0.85, 0.65, 0.4, 0][Math.min(hintsUsed, 4)] ?? 0;
  const timeWeight = Math.max(0.35, 1.25 - elapsedMs / 90000);
  const novelty = isNew ? 1.12 : 1;
  return Math.round(1000 * hintWeight * timeWeight * novelty);
};

export const recommendDifficulty = (metrics: PlayerMetrics): { targetDs: number; reason: string } => {
  const recentElapsed = metrics.recentElapsedMs.slice(-5);
  const avgElapsed = recentElapsed.length
    ? recentElapsed.reduce((sum, item) => sum + item, 0) / recentElapsed.length
    : 45000;
  const avgHints = metrics.recentHints.slice(-5).reduce((sum, item) => sum + item, 0) / Math.max(1, metrics.recentHints.slice(-5).length);
  const base = metrics.currentLevel ? Math.min(90, 10 + metrics.currentLevel * 3) : 35;
  if (metrics.failedStreak >= 2 || avgElapsed > 120000 || avgHints >= 2) {
    return { targetDs: Math.max(8, base - 18), reason: "你最近卡题较多，下一题会拉回到更容易破局的区间。" };
  }
  if (metrics.solvedStreak >= 4 && avgElapsed < 30000 && avgHints === 0) {
    return { targetDs: Math.min(95, base + 18), reason: "你连续快速无提示通关，训练会提高一点难度。" };
  }
  return { targetDs: base, reason: "当前表现稳定，保持同一难度带推进。" };
};

export const coachForState = (elapsedMs: number, hintsUsed: number, cardsLeft: number, puzzle: Puzzle): CoachMessage => {
  if (hintsUsed >= 3) {
    return { tone: "nudge", text: "答案已经很近了，先把提示里的第一步打出来，再观察剩下两张牌。" };
  }
  if (elapsedMs > 90000) {
    return { tone: "focus", text: `这题属于 ${puzzle.tags[0] ?? "标准"} 思路，先反推 24 可以拆成 6×4、8×3 还是 12×2。` };
  }
  if (cardsLeft === 2) {
    return { tone: "warning", text: "只剩两张时先别急着点，确认最后一步是否能直接得到 24。" };
  }
  if (elapsedMs < 12000) {
    return { tone: "praise", text: "开局观察很快，可以先锁定一组能凑关键中间值的牌。" };
  }
  return { tone: "focus", text: puzzle.ruleSet.description };
};
