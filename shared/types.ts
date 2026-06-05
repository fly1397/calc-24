export type Operator = "+" | "-" | "*" | "/" | "concat";

export type RuleSet = {
  id: string;
  name: string;
  description: string;
  operators: Operator[];
  allowNegative: boolean;
  allowFraction: boolean;
  allowConcat?: boolean;
  cardCount: number;
  useCount: number;
  requiredOperator?: Operator;
  finalOperator?: Operator;
};

export type Fraction = {
  n: number;
  d: number;
};

export type ExprNode =
  | {
      type: "leaf";
      value: Fraction;
      cardId: string;
      label: string;
    }
  | {
      type: "op";
      value: Fraction;
      op: Operator;
      left: ExprNode;
      right: ExprNode;
    };

export type CardState = {
  id: string;
  value: Fraction;
  expr: ExprNode;
};

export type Puzzle = {
  id: string;
  seed: string;
  title: string;
  stage: string;
  stageIndex: number;
  level: number;
  stageLevel: number;
  cards: number[];
  target: number;
  ds: number;
  tags: string[];
  boss: boolean;
  variant: "standard" | "poison" | "grand" | "concat" | "hell";
  ruleSet: RuleSet;
  solutionCount: number;
};

export type Wallet = {
  coins: number;
  wisdomStars: number;
};

export type Inventory = {
  hintPacks: number;
  deathShields: number;
  jokers: number;
  blindBoxTickets: number;
};

export type Solution = {
  key: string;
  expression: string;
  steps: string[];
  tags: string[];
};

export type HintPack = {
  level1: string;
  level2: string;
  level3: string;
  answer: string[];
};

export type StoredAttempt = {
  puzzleId: string;
  solutionKey: string;
  expression: string;
  elapsedMs: number;
  hintsUsed: number;
  createdAt: string;
};

export type PlayerMetrics = {
  recentElapsedMs: number[];
  recentHints: number[];
  recentResets: number[];
  solvedStreak: number;
  failedStreak: number;
  currentLevel?: number;
};

export type CoachMessage = {
  tone: "focus" | "praise" | "nudge" | "warning";
  text: string;
};
