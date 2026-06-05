import {
  ArrowLeft,
  Archive,
  Brain,
  CalendarDays,
  FlaskConical,
  Lightbulb,
  ListRestart,
  Medal,
  Play,
  RotateCcw,
  Share2,
  Settings,
  Sparkles,
  Timer,
  Trophy,
  Undo2
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { applyUnaryCard, makeInitialCards, mergeCards, isSolved, solutionFromNode } from "../shared/engine";
import { equalsFraction, formatFraction, makeFraction } from "../shared/fraction";
import type { LabCollectionRuntime } from "../shared/lab";
import type { HellLayer } from "../shared/modes";
import type { StageDefinition } from "../shared/puzzles";
import type { CardState, CoachMessage, HintPack, Operator, PlayerMetrics, Puzzle, Solution, StoredAttempt, UnaryOperator } from "../shared/types";
import { api, type PuzzlePayload } from "./api";

type View = "home" | "map" | "game" | "clinic" | "archive" | "lab" | "supply" | "hell" | "settings";
type Mode = "main" | "daily" | "training" | "lab" | "hell" | "race";
type HistoryItem = { cards: CardState[] };
type Stats = { attempts: number; solvedPuzzles: number; discoveredSolutions: number; archive: Array<{ puzzleId: string; discovered: number }> };

const opText: Record<Operator, string> = { "+": "+", "-": "-", "*": "×", "/": "÷", concat: "拼" };
const unaryText: Record<UnaryOperator, string> = { square: "x²", sqrt: "√x", factorial: "x!" };

const saveLocal = (key: string, value: unknown) => localStorage.setItem(key, JSON.stringify(value));
const loadLocal = <T,>(key: string, fallback: T): T => {
  const raw = localStorage.getItem(key);
  return raw ? (JSON.parse(raw) as T) : fallback;
};

const defaultMetrics: PlayerMetrics = {
  recentElapsedMs: [],
  recentHints: [],
  recentResets: [],
  solvedStreak: 0,
  failedStreak: 0
};

const defaultWallet = { coins: 0, wisdomStars: 0 };
const defaultInventory = { hintPacks: 0, deathShields: 0, jokers: 0, blindBoxTickets: 0 };
const defaultDebug = { unlockAll: false, infiniteHints: false, sound: true, vibration: true, eyeCare: false };

const useClock = (running: boolean, startedAt: number | null) => {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    if (!running) return;
    const timer = window.setInterval(() => setNow(Date.now()), 200);
    return () => window.clearInterval(timer);
  }, [running]);
  return startedAt ? now - startedAt : 0;
};

function BottomNav({ active, onNavigate }: { active: View; onNavigate: (view: View) => void }) {
  const tabs: Array<{ id: View; label: string; icon: typeof Play }> = [
    { id: "home", label: "首页", icon: Play },
    { id: "lab", label: "实验室", icon: FlaskConical },
    { id: "supply", label: "补给站", icon: Sparkles },
    { id: "archive", label: "档案馆", icon: Archive }
  ];
  return (
    <nav className="bottom-nav">
      {tabs.map((tab) => {
        const Icon = tab.icon;
        return (
          <button key={tab.id} className={active === tab.id ? "active" : ""} onClick={() => onNavigate(tab.id)}>
            <Icon size={19} />
            <span>{tab.label}</span>
          </button>
        );
      })}
    </nav>
  );
}

function Home({
  onNavigate,
  onStartDaily,
  onStartTraining,
  onStartRace,
  stats
}: {
  onNavigate: (view: View) => void;
  onStartDaily: () => void;
  onStartTraining: () => void;
  onStartRace: () => void;
  stats?: Stats;
}) {
  return (
    <main className="screen home">
      <section className="brand">
        <div className="brand-mark">24</div>
        <div>
          <p className="eyebrow">绝对算式</p>
          <h1>找到你的神仙解法</h1>
        </div>
      </section>

      <section className="daily-band">
        <div>
          <p>今日同题</p>
          <strong>全服一题，比速度也比思路</strong>
        </div>
        <button className="icon-button solid" onClick={onStartDaily} aria-label="开始每日一题">
          <CalendarDays size={20} />
        </button>
      </section>

      <section className="mode-grid">
        <button className="mode-tile primary" onClick={() => onNavigate("map")}>
          <Play size={24} />
          <strong>主线闯关</strong>
          <span>14 阶段 280 关</span>
        </button>
        <button className="mode-tile" onClick={onStartTraining}>
          <Brain size={24} />
          <strong>智能训练</strong>
          <span>根据表现动态调难</span>
        </button>
        <button className="mode-tile" onClick={onStartRace}>
          <Timer size={24} />
          <strong>竞速排位</strong>
          <span>10 题连战，秒表不中断</span>
        </button>
        <button className="mode-tile danger" onClick={() => onNavigate("hell")}>
          <Trophy size={24} />
          <strong>地狱模式</strong>
          <span>18 层规则压迫</span>
        </button>
        <button className="mode-tile" onClick={() => onNavigate("lab")}>
          <FlaskConical size={24} />
          <strong>异构实验室</strong>
          <span>规则限制挑战</span>
        </button>
        <button className="mode-tile" onClick={() => onNavigate("archive")}>
          <Archive size={24} />
          <strong>解法档案</strong>
          <span>查看点亮进度</span>
        </button>
        <button className="mode-tile" onClick={() => onNavigate("supply")}>
          <Sparkles size={24} />
          <strong>补给站</strong>
          <span>金币商店与科研盲盒</span>
        </button>
        <button className="mode-tile" onClick={() => onNavigate("settings")}>
          <Settings size={24} />
          <strong>设置</strong>
          <span>调试开关与辅助选项</span>
        </button>
      </section>

      <section className="actions">
        <button className="secondary-action" onClick={() => onNavigate("clinic")}>
          <ListRestart size={20} />
          残局诊所
        </button>
      </section>

      <section className="stats">
        <div><strong>{stats?.solvedPuzzles ?? 0}</strong><span>已通关</span></div>
        <div><strong>{stats?.discoveredSolutions ?? 0}</strong><span>解法</span></div>
        <div><strong>{stats?.attempts ?? 0}</strong><span>记录</span></div>
      </section>
      <BottomNav active="home" onNavigate={onNavigate} />
    </main>
  );
}

function LevelMap({
  puzzles,
  stages,
  solved,
  onBack,
  onPick
}: {
  puzzles: Puzzle[];
  stages: StageDefinition[];
  solved: string[];
  onBack: () => void;
  onPick: (puzzle: Puzzle) => void;
}) {
  const [stageIndex, setStageIndex] = useState(0);
  const stagePuzzles = puzzles.filter((puzzle) => puzzle.stageIndex === stageIndex);
  const stage = stages[stageIndex];
  return (
    <main className="screen">
      <header className="topbar">
        <button className="icon-button ghost" onClick={onBack} aria-label="返回"><ArrowLeft /></button>
        <div><p className="eyebrow">主线闯关</p><h2>{stage?.name ?? "阶段"}</h2></div>
      </header>
      <section className="stage-tabs">
        {stages.map((item, index) => (
          <button key={item.name} className={stageIndex === index ? "active" : ""} onClick={() => setStageIndex(index)}>
            {index + 1}
          </button>
        ))}
      </section>
      <p className="stage-theme">{stage?.theme}</p>
      <section className="level-grid">
        {stagePuzzles.map((puzzle) => {
          const done = solved.includes(puzzle.id);
          return (
            <button key={puzzle.id} className={`level-cell ${done ? "done" : ""} ${puzzle.boss ? "exam" : ""}`} onClick={() => onPick(puzzle)}>
              {puzzle.boss ? <Trophy size={22} /> : puzzle.stageLevel}
              <small>DS {puzzle.ds}</small>
            </button>
          );
        })}
      </section>
    </main>
  );
}

function Game({
  payload,
  mode,
  recommendation,
  onBack,
  onSolved,
  onNextTraining,
  onNextRace,
  raceProgress,
  debug
}: {
  payload: PuzzlePayload;
  mode: Mode;
  recommendation?: string;
  onBack: () => void;
  onSolved: (puzzleId: string, elapsedMs: number, hintsUsed: number, resets: number) => void;
  onNextTraining: () => void;
  onNextRace: () => void;
  raceProgress?: string;
  debug: typeof defaultDebug;
}) {
  const { puzzle, hints, solutionCount } = payload;
  const initialCards = useMemo(() => makeInitialCards(puzzle.cards, puzzle.specialCards), [puzzle.cards, puzzle.specialCards]);
  const [cards, setCards] = useState<CardState[]>(() => initialCards.slice(0, puzzle.ruleSet.useCount));
  const [reserveCards, setReserveCards] = useState<CardState[]>(() => initialCards.slice(puzzle.ruleSet.useCount));
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [selectedCards, setSelectedCards] = useState<string[]>([]);
  const [selectedOp, setSelectedOp] = useState<Operator | null>(null);
  const [startedAt, setStartedAt] = useState<number | null>(Date.now());
  const [hintsUsed, setHintsUsed] = useState(0);
  const [resets, setResets] = useState(0);
  const [solution, setSolution] = useState<Solution | null>(null);
  const [result, setResult] = useState<{ isNew: boolean; score: number; discoveredCount: number } | null>(null);
  const [leaderboard, setLeaderboard] = useState<Array<StoredAttempt & { score: number }>>([]);
  const [coach, setCoach] = useState<CoachMessage | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const elapsed = useClock(!solution, startedAt);

  useEffect(() => {
    const nextInitial = makeInitialCards(puzzle.cards, puzzle.specialCards);
    setCards(nextInitial.slice(0, puzzle.ruleSet.useCount));
    setReserveCards(nextInitial.slice(puzzle.ruleSet.useCount));
    setHistory([]);
    setSelectedCards([]);
    setSelectedOp(null);
    setStartedAt(Date.now());
    setHintsUsed(0);
    setResets(0);
    setSolution(null);
    setResult(null);
    setCoach(null);
    setNotice(null);
    api.leaderboard(puzzle.id).then((data) => setLeaderboard(data.rows)).catch(() => setLeaderboard([]));
  }, [puzzle.id, puzzle.cards, puzzle.specialCards, puzzle.ruleSet.useCount]);

  useEffect(() => {
    if (solution || elapsed < 15000) return;
    const bucket = Math.floor(elapsed / 20000);
    api.coach({ puzzleId: puzzle.id, elapsedMs: elapsed, hintsUsed, cardsLeft: cards.length })
      .then((data) => setCoach(data.message))
      .catch(() => undefined);
  }, [Math.floor(elapsed / 20000), solution, hintsUsed, cards.length, puzzle.id]);

  const completeIfSolved = async (nextCards: CardState[]) => {
    if (!isSolved(nextCards, undefined, puzzle.ruleSet)) {
      if (nextCards.length === 1 && equalsFraction(nextCards[0].value, makeFraction(puzzle.target))) {
        setNotice(puzzle.ruleSet.requiredUnary ? "已经得到 24，但本关必须使用至少一个高阶符号。" : "已经得到 24，但还没有满足本关限制规则。");
      }
      return;
    }
    const solved = solutionFromNode(nextCards[0].expr);
    setSolution(solved);
    const elapsedMs = Date.now() - (startedAt ?? Date.now());
    const response = await api.submitAttempt({
      puzzleId: puzzle.id,
      solutionKey: solved.key,
      expression: solved.expression,
      elapsedMs,
      hintsUsed
    });
    setResult(response);
    onSolved(puzzle.id, elapsedMs, hintsUsed, resets);
  };

  const applyMerge = (leftId: string, rightId: string, op: Operator) => {
    const left = resolveCard(cards.find((card) => card.id === leftId));
    const right = resolveCard(cards.find((card) => card.id === rightId));
    if (!left || !right) return;
    if (history.length < 2 && (left.special?.type === "frost" || right.special?.type === "frost")) {
      setNotice("冰冻牌前两步不能参与运算，请先处理其他牌。");
      return;
    }
    const merged = mergeCards(left, right, op, puzzle.ruleSet);
    if (!merged) return;
    const next = [...cards.filter((card) => card.id !== leftId && card.id !== rightId), merged];
    setHistory((items) => [...items, { cards }]);
    setCards(next);
    setSelectedCards([merged.id]);
    setSelectedOp(null);
    void completeIfSolved(next);
  };

  const resolveCard = (card?: CardState): CardState | undefined => {
    if (!card) return undefined;
    if (card.special?.type !== "ghost" || !card.special.altValue) return card;
    const useAlt = Math.floor(elapsed / 3000) % 2 === 1;
    const value = useAlt ? card.special.altValue : card.value.n / card.value.d;
    return {
      ...card,
      value: makeFraction(value),
      expr: { type: "leaf", value: makeFraction(value), cardId: card.id, label: String(value) }
    };
  };

  const applyUnary = (op: UnaryOperator) => {
    if (solution || selectedCards.length !== 1) return;
    const current = resolveCard(cards.find((card) => card.id === selectedCards[0]));
    if (!current) return;
    if (history.length < 2 && current.special?.type === "frost") {
      setNotice("冰冻牌前两步不能参与运算，请先处理其他牌。");
      return;
    }
    const nextCard = applyUnaryCard(current, op, puzzle.ruleSet);
    if (!nextCard) return;
    const next = cards.map((card) => (card.id === selectedCards[0] ? nextCard : card));
    setHistory((items) => [...items, { cards }]);
    setCards(next);
    setSelectedCards([nextCard.id]);
    void completeIfSolved(next);
  };

  const cycleJoker = () => {
    if (solution || history.length > 0 || selectedCards.length !== 1) return;
    const selected = cards.find((card) => card.id === selectedCards[0]);
    if (selected?.special?.type !== "joker") return;
    const nextValue = selected.value.n >= 9 ? 1 : selected.value.n + 1;
    const value = makeFraction(nextValue);
    setCards(cards.map((card) => card.id === selected.id ? { ...card, value, expr: { type: "leaf", value, cardId: card.id, label: String(nextValue) } } : card));
  };

  const pickCard = (id: string) => {
    if (solution) return;
    if (selectedCards.includes(id)) {
      setSelectedCards(selectedCards.filter((item) => item !== id));
      return;
    }
    const next = [...selectedCards, id].slice(-2);
    setSelectedCards(next);
    if (next.length === 2 && selectedOp) applyMerge(next[0], next[1], selectedOp);
  };

  const pickOp = (op: Operator) => {
    if (solution || !puzzle.ruleSet.operators.includes(op)) return;
    if (selectedCards.length === 2) {
      applyMerge(selectedCards[0], selectedCards[1], op);
      return;
    }
    setSelectedOp(op);
  };

  const undo = () => {
    const last = history.at(-1);
    if (!last || solution) return;
    setCards(last.cards);
    setHistory(history.slice(0, -1));
    setSelectedCards([]);
    setSelectedOp(null);
  };

  const reset = () => {
    const nextInitial = makeInitialCards(puzzle.cards, puzzle.specialCards);
    setCards(nextInitial.slice(0, puzzle.ruleSet.useCount));
    setReserveCards(nextInitial.slice(puzzle.ruleSet.useCount));
    setHistory([]);
    setSelectedCards([]);
    setSelectedOp(null);
    setSolution(null);
    setResult(null);
    setStartedAt(Date.now());
    setResets((value) => value + 1);
  };

  const addToClinic = () => {
    const clinic = loadLocal<string[]>("clinic", []);
    saveLocal("clinic", Array.from(new Set([puzzle.id, ...clinic])));
    onBack();
  };

  const swapReserve = (reserveId: string) => {
    if (history.length > 0 || solution || puzzle.variant !== "poison") return;
    const incoming = reserveCards.find((card) => card.id === reserveId);
    const outgoing = selectedCards[0] ? cards.find((card) => card.id === selectedCards[0]) : cards.at(-1);
    if (!incoming || !outgoing) return;
    setCards(cards.map((card) => (card.id === outgoing.id ? incoming : card)));
    setReserveCards(reserveCards.map((card) => (card.id === incoming.id ? outgoing : card)));
    setSelectedCards([incoming.id]);
  };

  return (
    <main className="screen game">
      <header className="topbar">
        <button className="icon-button ghost" onClick={onBack} aria-label="返回"><ArrowLeft /></button>
        <div>
          <p className="eyebrow">{mode === "daily" ? "每日一题" : mode === "training" ? "智能训练" : mode === "race" ? `竞速 ${raceProgress ?? ""}` : puzzle.stage}</p>
          <h2>{puzzle.title} <span>{puzzle.level}/280</span></h2>
        </div>
        <div className="timer">{(elapsed / 1000).toFixed(1)}s</div>
      </header>

      <section className="puzzle-info">
        <span>目标 {puzzle.target}</span>
        <span>{puzzle.ruleSet.name}</span>
        <span>DS {puzzle.ds}</span>
        <span>{solutionCount} 种参考解</span>
      </section>
      {puzzle.specialCards?.length ? (
        <section className="rule-note">
          {puzzle.specialCards.map((card) => (
            <span key={`${card.index}-${card.type}`}>
              {card.type === "frost" ? "冰冻：前两步禁用" : card.type === "ghost" ? `幻影：每3秒切换为 ${card.altValue}` : "小丑：选中后可变 1-9"}
            </span>
          ))}
        </section>
      ) : null}
      {puzzle.ruleSet.requiredUnary && <section className="rule-note"><span>本关必须使用平方、开方或阶乘。</span></section>}
      {notice && <section className="hint-box warning">{notice}</section>}
      {recommendation && <section className="coach-box focus"><Brain size={18} />{recommendation}</section>}
      {coach && !solution && <section className={`coach-box ${coach.tone}`}><Brain size={18} />{coach.text}</section>}

      <section className="card-board">
        {cards.map((card) => (
          <button key={card.id} className={`number-card ${selectedCards.includes(card.id) ? "selected" : ""}`} onClick={() => pickCard(card.id)}>
            <span>{formatFraction(resolveCard(card)?.value ?? card.value)}</span>
            {card.special && <small>{card.special.type === "frost" ? "冰" : card.special.type === "ghost" ? "幻" : "J"}</small>}
          </button>
        ))}
      </section>

      {reserveCards.length > 0 && (
        <section className="reserve-zone">
          <p>毒苹果干扰区</p>
          <div>
            {reserveCards.map((card) => (
              <button key={card.id} disabled={history.length > 0 || Boolean(solution)} onClick={() => swapReserve(card.id)}>
                {formatFraction(card.value)}
              </button>
            ))}
          </div>
        </section>
      )}

      <section className="ops">
        {(["+", "-", "*", "/", "concat"] as Operator[]).map((op) => (
          <button key={op} disabled={!puzzle.ruleSet.operators.includes(op)} className={`op-button ${selectedOp === op ? "active" : ""}`} onClick={() => pickOp(op)}>
            {opText[op]}
          </button>
        ))}
      </section>

      {puzzle.ruleSet.unaryOperators && (
        <section className="ops unary-ops">
          {puzzle.ruleSet.unaryOperators.map((op) => (
            <button key={op} className="op-button" onClick={() => applyUnary(op)}>{unaryText[op]}</button>
          ))}
        </section>
      )}

      <section className="tools">
        <button onClick={undo} disabled={!history.length || Boolean(solution)}><Undo2 size={18} />撤销</button>
        <button onClick={reset}><RotateCcw size={18} />重来</button>
        <button onClick={() => setHintsUsed((value) => Math.min(value + 1, debug.infiniteHints ? 99 : 4))}><Lightbulb size={18} />线索</button>
        <button onClick={cycleJoker} disabled={!selectedCards.some((id) => cards.find((card) => card.id === id)?.special?.type === "joker")}><Sparkles size={18} />小丑</button>
      </section>

      {hintsUsed > 0 && !solution && <HintBox hints={hints} level={hintsUsed} />}
      {!solution && elapsed > 45000 && <button className="clinic-button" onClick={addToClinic}>先收进残局诊所</button>}
      {solution && (
        <ResultPanel
          solution={solution}
          result={result}
          elapsed={elapsed}
          hintsUsed={hintsUsed}
          seed={puzzle.seed}
          leaderboard={leaderboard}
          mode={mode}
          onReset={reset}
          onNextTraining={onNextTraining}
          onNextRace={onNextRace}
        />
      )}
    </main>
  );
}

function HintBox({ hints, level }: { hints: HintPack; level: number }) {
  const text = level === 1 ? hints.level1 : level === 2 ? hints.level2 : level === 3 ? hints.level3 : hints.answer.join("；");
  return <section className="hint-box"><Lightbulb size={18} />{text}</section>;
}

function ResultPanel({
  solution,
  result,
  elapsed,
  hintsUsed,
  seed,
  leaderboard,
  mode,
  onReset,
  onNextTraining,
  onNextRace
}: {
  solution: Solution;
  result: { isNew: boolean; score: number; discoveredCount: number } | null;
  elapsed: number;
  hintsUsed: number;
  seed: string;
  leaderboard: Array<StoredAttempt & { score: number }>;
  mode: Mode;
  onReset: () => void;
  onNextTraining: () => void;
  onNextRace: () => void;
}) {
  const shareText = `我用 ${(elapsed / 1000).toFixed(1)} 秒解开了这道 24 点：${solution.expression} = 24。Seed：${seed}`;
  const copyShare = async () => navigator.clipboard?.writeText(shareText);
  return (
    <section className="result">
      <div className="result-title">
        <Medal />
        <div>
          <p>{result?.isNew ? "发现新解法" : "通关成功"}</p>
          <strong>{solution.expression} = 24</strong>
        </div>
      </div>
      <div className="tag-row">
        {solution.tags.map((tag) => <span key={tag}>{tag}</span>)}
        {hintsUsed === 0 && <span>无提示</span>}
      </div>
      <div className="score-row">
        <div><strong>{result?.score ?? 0}</strong><span>得分</span></div>
        <div><strong>{result?.discoveredCount ?? 1}</strong><span>已发现解法</span></div>
      </div>
      <ol className="steps">{solution.steps.map((step) => <li key={step}>{step}</li>)}</ol>
      <div className="result-actions">
        <button onClick={onReset}><Sparkles size={18} />再找一种</button>
        <button onClick={copyShare}><Share2 size={18} />复制挑战</button>
        {mode === "training" && <button onClick={onNextTraining}><Brain size={18} />下一题</button>}
        {mode === "race" && <button onClick={onNextRace}><Timer size={18} />下一题</button>}
      </div>
      {leaderboard.length > 0 && (
        <div className="leaderboard">
          <p>本题最快记录</p>
          {leaderboard.slice(0, 3).map((row, index) => (
            <span key={`${row.createdAt}-${row.solutionKey}`}>{index + 1}. {(row.elapsedMs / 1000).toFixed(1)}s · {row.hintsUsed ? `${row.hintsUsed} 线索` : "无提示"}</span>
          ))}
        </div>
      )}
    </section>
  );
}

function Clinic({ puzzles, onBack, onPick }: { puzzles: Puzzle[]; onBack: () => void; onPick: (puzzle: Puzzle) => void }) {
  const [items, setItems] = useState(() => loadLocal<string[]>("clinic", []));
  const clinicPuzzles = puzzles.filter((puzzle) => items.includes(puzzle.id));
  const clear = () => {
    saveLocal("clinic", []);
    setItems([]);
  };
  return (
    <main className="screen">
      <header className="topbar">
        <button className="icon-button ghost" onClick={onBack} aria-label="返回"><ArrowLeft /></button>
        <div><p className="eyebrow">残局诊所</p><h2>回来复仇</h2></div>
      </header>
      {clinicPuzzles.length === 0 ? <p className="empty">还没有收治的难题。</p> : (
        <section className="clinic-list">
          {clinicPuzzles.map((puzzle) => (
            <button key={puzzle.id} onClick={() => onPick(puzzle)}>
              <strong>{puzzle.title}</strong>
              <span>{puzzle.cards.join("  ")} · DS {puzzle.ds} · {puzzle.ruleSet.name}</span>
            </button>
          ))}
        </section>
      )}
      {clinicPuzzles.length > 0 && <button className="secondary-action" onClick={clear}>清空诊所</button>}
    </main>
  );
}

function ArchiveView({
  puzzles,
  stats,
  onBack,
  onPick,
  onNavigate
}: {
  puzzles: Puzzle[];
  stats?: Stats;
  onBack: () => void;
  onPick: (puzzle: Puzzle) => void;
  onNavigate: (view: View) => void;
}) {
  const archive = new Map((stats?.archive ?? []).map((item) => [item.puzzleId, item.discovered]));
  const active = puzzles.filter((puzzle) => archive.has(puzzle.id)).slice(0, 60);
  return (
    <main className="screen">
      <header className="topbar">
        <button className="icon-button ghost" onClick={onBack} aria-label="返回"><ArrowLeft /></button>
        <div><p className="eyebrow">解法档案</p><h2>已点亮思路</h2></div>
      </header>
      <section className="archive-summary">
        <div><strong>{stats?.discoveredSolutions ?? 0}</strong><span>总解法</span></div>
        <div><strong>{active.length}</strong><span>有关卡记录</span></div>
      </section>
      {active.length === 0 ? <p className="empty">先通关几题，这里会展示你的解法图鉴。</p> : (
        <section className="clinic-list">
          {active.map((puzzle) => (
            <button key={puzzle.id} onClick={() => onPick(puzzle)}>
              <strong>{puzzle.stage} · {puzzle.title}</strong>
              <span>已发现 {archive.get(puzzle.id)} / {puzzle.solutionCount} · {puzzle.tags.slice(0, 3).join(" / ")}</span>
            </button>
          ))}
        </section>
      )}
      <BottomNav active="archive" onNavigate={onNavigate} />
    </main>
  );
}

function LabView({
  collections,
  onBack,
  onPick,
  onNavigate
}: {
  collections: LabCollectionRuntime[];
  onBack: () => void;
  onPick: (puzzle: Puzzle) => void;
  onNavigate: (view: View) => void;
}) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = collections.find((collection) => collection.id === selectedId);
  if (selected) {
    return (
      <main className="screen">
        <header className="topbar">
          <button className="icon-button ghost" onClick={() => setSelectedId(null)} aria-label="返回"><ArrowLeft /></button>
          <div><p className="eyebrow">异构实验室</p><h2>{selected.title}</h2></div>
        </header>
        <section className="lab-brief" style={{ borderColor: selected.accent }}>
          <strong>{selected.subtitle}</strong>
          <span>{selected.description}</span>
          <em>奖励：{selected.reward}</em>
        </section>
        {selected.puzzles.length === 0 ? <p className="empty">{selected.unlockHint}</p> : (
          <section className="level-grid lab-level-grid">
            {selected.puzzles.map((puzzle) => (
              <button key={puzzle.id} className="level-cell" onClick={() => onPick(puzzle)}>
                {puzzle.stageLevel}
                <small>DS {puzzle.ds}</small>
              </button>
            ))}
          </section>
        )}
        <BottomNav active="lab" onNavigate={onNavigate} />
      </main>
    );
  }
  return (
    <main className="screen">
      <header className="topbar">
        <button className="icon-button ghost" onClick={onBack} aria-label="返回"><ArrowLeft /></button>
        <div><p className="eyebrow">异构实验室</p><h2>规则挑战</h2></div>
      </header>
      <section className="lab-grid">
        {collections.map((collection) => (
          <button key={collection.id} onClick={() => setSelectedId(collection.id)} style={{ borderColor: collection.accent }}>
            <strong>{collection.title}</strong>
            <span>{collection.subtitle}</span>
            <small>{collection.description}</small>
            <em>{collection.puzzles.length ? `${collection.puzzles.length} 个挑战` : collection.unlockHint}</em>
          </button>
        ))}
      </section>
      <BottomNav active="lab" onNavigate={onNavigate} />
    </main>
  );
}

function SupplyView({
  wallet,
  inventory,
  onBack,
  onChange,
  onNavigate
}: {
  wallet: typeof defaultWallet;
  inventory: typeof defaultInventory;
  onBack: () => void;
  onChange: (wallet: typeof defaultWallet, inventory: typeof defaultInventory) => void;
  onNavigate: (view: View) => void;
}) {
  const buy = (price: number, patch: Partial<typeof defaultInventory>) => {
    if (wallet.coins < price) return;
    onChange(
      { ...wallet, coins: wallet.coins - price },
      {
        hintPacks: inventory.hintPacks + (patch.hintPacks ?? 0),
        deathShields: inventory.deathShields + (patch.deathShields ?? 0),
        jokers: inventory.jokers + (patch.jokers ?? 0),
        blindBoxTickets: inventory.blindBoxTickets + (patch.blindBoxTickets ?? 0)
      }
    );
  };
  const draw = () => {
    if (wallet.wisdomStars < 5) return;
    const roll = (wallet.wisdomStars + wallet.coins + inventory.jokers * 7) % 3;
    const prize =
      roll === 0
        ? { hintPacks: 2 }
        : roll === 1
          ? { jokers: 1 }
          : { deathShields: 1 };
    onChange(
      { ...wallet, wisdomStars: wallet.wisdomStars - 5 },
      {
        hintPacks: inventory.hintPacks + (prize.hintPacks ?? 0),
        deathShields: inventory.deathShields + (prize.deathShields ?? 0),
        jokers: inventory.jokers + (prize.jokers ?? 0),
        blindBoxTickets: inventory.blindBoxTickets
      }
    );
  };
  return (
    <main className="screen">
      <header className="topbar">
        <button className="icon-button ghost" onClick={onBack} aria-label="返回"><ArrowLeft /></button>
        <div><p className="eyebrow">补给站</p><h2>金币商店与科研盲盒</h2></div>
      </header>
      <section className="archive-summary">
        <div><strong>{wallet.coins}</strong><span>金币</span></div>
        <div><strong>{wallet.wisdomStars}</strong><span>智慧星</span></div>
      </section>
      <section className="inventory-row">
        <span>锦囊 {inventory.hintPacks}</span>
        <span>免死 {inventory.deathShields}</span>
        <span>小丑 {inventory.jokers}</span>
      </section>
      <section className="shop-grid">
        <button onClick={() => buy(100, { hintPacks: 1 })} disabled={wallet.coins < 100}>
          <strong>初级思路锦囊</strong>
          <span>100 金币 · 额外线索储备</span>
        </button>
        <button onClick={() => buy(500, { deathShields: 1 })} disabled={wallet.coins < 500}>
          <strong>地狱免死金牌</strong>
          <span>500 金币 · 地狱关失败保护</span>
        </button>
        <button onClick={() => buy(800, { jokers: 1 })} disabled={wallet.coins < 800}>
          <strong>万能小丑牌</strong>
          <span>800 金币 · 后续可替换数字</span>
        </button>
      </section>
      <section className="blind-box">
        <div>
          <p>科研盲盒</p>
          <strong>消耗 5 智慧星抽取稀有补给</strong>
        </div>
        <button onClick={draw} disabled={wallet.wisdomStars < 5}>抽 1 次</button>
      </section>
      <BottomNav active="supply" onNavigate={onNavigate} />
    </main>
  );
}

function HellView({
  layers,
  solved,
  debug,
  onBack,
  onPick
}: {
  layers: HellLayer[];
  solved: string[];
  debug: typeof defaultDebug;
  onBack: () => void;
  onPick: (puzzle: Puzzle) => void;
}) {
  const [layerIndex, setLayerIndex] = useState(0);
  const layer = layers[layerIndex];
  const unlockedLayer = debug.unlockAll || layerIndex === 0 || layers[layerIndex - 1]?.puzzles.some((puzzle) => solved.includes(puzzle.id));
  return (
    <main className="screen hell-screen">
      <header className="topbar">
        <button className="icon-button ghost" onClick={onBack} aria-label="返回"><ArrowLeft /></button>
        <div><p className="eyebrow">地狱模式</p><h2>{layer?.name ?? "深渊"}</h2></div>
      </header>
      <section className="stage-tabs hell-tabs">
        {layers.map((item, index) => (
          <button key={item.id} className={layerIndex === index ? "active" : ""} onClick={() => setLayerIndex(index)}>
            {index + 1}
          </button>
        ))}
      </section>
      <p className="stage-theme">{layer?.subtitle}</p>
      {!unlockedLayer ? <p className="empty">战争迷雾尚未散去。通关上一层后解锁。</p> : (
        <section className="level-grid">
          {layer?.puzzles.map((puzzle) => (
            <button key={puzzle.id} className={`level-cell hell-cell ${solved.includes(puzzle.id) ? "done" : ""} ${puzzle.boss ? "exam" : ""}`} onClick={() => onPick(puzzle)}>
              {puzzle.boss ? <Trophy size={22} /> : puzzle.stageLevel}
              <small>DS {puzzle.ds}</small>
            </button>
          ))}
        </section>
      )}
    </main>
  );
}

function SettingsView({
  debug,
  wallet,
  onBack,
  onChange,
  onWalletChange
}: {
  debug: typeof defaultDebug;
  wallet: typeof defaultWallet;
  onBack: () => void;
  onChange: (debug: typeof defaultDebug) => void;
  onWalletChange: (wallet: typeof defaultWallet) => void;
}) {
  const toggle = (key: keyof typeof defaultDebug) => onChange({ ...debug, [key]: !debug[key] });
  return (
    <main className="screen">
      <header className="topbar">
        <button className="icon-button ghost" onClick={onBack} aria-label="返回"><ArrowLeft /></button>
        <div><p className="eyebrow">设置</p><h2>调试与辅助</h2></div>
      </header>
      <section className="settings-list">
        <button onClick={() => toggle("unlockAll")}><strong>解锁全部关卡</strong><span>{debug.unlockAll ? "已开启" : "已关闭"}</span></button>
        <button onClick={() => toggle("infiniteHints")}><strong>无限提示</strong><span>{debug.infiniteHints ? "已开启" : "已关闭"}</span></button>
        <button onClick={() => onWalletChange({ ...wallet, coins: wallet.coins + 5000 })}><strong>增加 5000 金币</strong><span>当前 {wallet.coins}</span></button>
        <button onClick={() => onWalletChange({ ...wallet, wisdomStars: wallet.wisdomStars + 50 })}><strong>增加 50 智慧星</strong><span>当前 {wallet.wisdomStars}</span></button>
        <button onClick={() => toggle("sound")}><strong>音效</strong><span>{debug.sound ? "已开启" : "已关闭"}</span></button>
        <button onClick={() => toggle("vibration")}><strong>震动</strong><span>{debug.vibration ? "已开启" : "已关闭"}</span></button>
        <button onClick={() => toggle("eyeCare")}><strong>护眼模式</strong><span>{debug.eyeCare ? "已开启" : "已关闭"}</span></button>
      </section>
    </main>
  );
}

export function App() {
  const [view, setView] = useState<View>("home");
  const [puzzles, setPuzzles] = useState<Puzzle[]>([]);
  const [labPuzzles, setLabPuzzles] = useState<Puzzle[]>([]);
  const [labCollections, setLabCollections] = useState<LabCollectionRuntime[]>([]);
  const [hellLayers, setHellLayers] = useState<HellLayer[]>([]);
  const [racePack, setRacePack] = useState<Puzzle[]>([]);
  const [raceIndex, setRaceIndex] = useState(0);
  const [stages, setStages] = useState<StageDefinition[]>([]);
  const [payload, setPayload] = useState<PuzzlePayload | null>(null);
  const [mode, setMode] = useState<Mode>("main");
  const [recommendation, setRecommendation] = useState<string>();
  const [solved, setSolved] = useState(() => loadLocal<string[]>("solved", []));
  const [metrics, setMetrics] = useState(() => loadLocal<PlayerMetrics>("metrics", defaultMetrics));
  const [wallet, setWallet] = useState(() => loadLocal("wallet", defaultWallet));
  const [inventory, setInventory] = useState(() => loadLocal("inventory", defaultInventory));
  const [debug, setDebug] = useState(() => loadLocal("debug", defaultDebug));
  const [stats, setStats] = useState<Stats>();

  useEffect(() => {
    api.puzzleIndex().then((data) => {
      setPuzzles(data.puzzles);
      setStages(data.stages);
    });
    api.lab(debug.unlockAll).then((data) => {
      setLabPuzzles(data.puzzles);
      setLabCollections(data.collections);
    });
    api.hell().then((data) => setHellLayers(data.layers));
    api.stats().then(setStats).catch(() => undefined);
  }, [debug.unlockAll]);

  const refreshStats = () => api.stats().then(setStats).catch(() => undefined);

  const startPuzzle = async (puzzle: Puzzle, nextMode: Mode = "main") => {
    const data = await api.puzzle(puzzle.id);
    setPayload(data);
    setMode(nextMode);
    setRecommendation(undefined);
    setView("game");
  };

  const startDaily = async () => {
    const data = await api.daily();
    setPayload(data);
    setMode("daily");
    setRecommendation(undefined);
    setView("game");
  };

  const startRace = async () => {
    const data = await api.race();
    setRacePack(data.puzzles);
    setRaceIndex(0);
    const first = data.puzzles[0];
    if (!first) return;
    const payload = await api.puzzle(first.id);
    setPayload(payload);
    setMode("race");
    setRecommendation("随机 10 题，秒表不中断。答完后点击下一题继续。");
    setView("game");
  };

  const startTraining = async () => {
    const data = await api.trainingNext({ ...metrics, excludeIds: solved });
    setPayload(data);
    setMode("training");
    setRecommendation(data.recommendation.reason);
    setView("game");
  };

  const nextRace = async () => {
    const nextIndex = raceIndex + 1;
    setRaceIndex(nextIndex);
    const next = racePack[nextIndex];
    if (!next) {
      setView("home");
      return;
    }
    const data = await api.puzzle(next.id);
    setPayload(data);
    setMode("race");
    setRecommendation(`竞速进度 ${nextIndex + 1}/${racePack.length}`);
  };

  const markSolved = (puzzleId: string, elapsedMs: number, hintsUsed: number, resets: number) => {
    const nextSolved = Array.from(new Set([...solved, puzzleId]));
    const nextMetrics: PlayerMetrics = {
      recentElapsedMs: [...metrics.recentElapsedMs.slice(-9), elapsedMs],
      recentHints: [...metrics.recentHints.slice(-9), hintsUsed],
      recentResets: [...metrics.recentResets.slice(-9), resets],
      solvedStreak: metrics.solvedStreak + 1,
      failedStreak: 0,
      currentLevel: Math.max(metrics.currentLevel ?? 0, Number(puzzleId.replace(/\D/g, "")) || 0)
    };
    setSolved(nextSolved);
    setMetrics(nextMetrics);
    const coinReward = Math.max(30, Math.round(80 + elapsedMs / 3000 - hintsUsed * 15));
    const starReward = hintsUsed === 0 ? 1 : 0;
    const nextWallet = { coins: wallet.coins + coinReward, wisdomStars: wallet.wisdomStars + starReward };
    setWallet(nextWallet);
    saveLocal("solved", nextSolved);
    saveLocal("metrics", nextMetrics);
    saveLocal("wallet", nextWallet);
    void refreshStats();
  };

  const currentGame = useMemo(() => {
    if (!payload) return null;
    return (
      <Game
        payload={payload}
        mode={mode}
        recommendation={recommendation}
        raceProgress={mode === "race" ? `${raceIndex + 1}/${racePack.length || 10}` : undefined}
        debug={debug}
        onBack={() => setView(mode === "main" ? "map" : "home")}
        onSolved={markSolved}
        onNextTraining={startTraining}
        onNextRace={nextRace}
      />
    );
  }, [payload, mode, recommendation, solved, metrics, wallet, debug, raceIndex, racePack]);

  if (view === "game" && currentGame) return currentGame;
  if (view === "map") return <LevelMap puzzles={puzzles} stages={stages} solved={solved} onBack={() => setView("home")} onPick={startPuzzle} />;
  if (view === "clinic") return <Clinic puzzles={puzzles} onBack={() => setView("home")} onPick={startPuzzle} />;
  if (view === "archive") return <ArchiveView puzzles={[...puzzles, ...labPuzzles]} stats={stats} onBack={() => setView("home")} onPick={startPuzzle} onNavigate={setView} />;
  if (view === "lab") return <LabView collections={labCollections} onBack={() => setView("home")} onPick={(puzzle) => startPuzzle(puzzle, "lab")} onNavigate={setView} />;
  if (view === "hell") return <HellView layers={hellLayers} solved={solved} debug={debug} onBack={() => setView("home")} onPick={(puzzle) => startPuzzle(puzzle, "hell")} />;
  if (view === "settings") {
    return (
      <SettingsView
        debug={debug}
        wallet={wallet}
        onBack={() => setView("home")}
        onChange={(next) => {
          setDebug(next);
          saveLocal("debug", next);
        }}
        onWalletChange={(nextWallet) => {
          setWallet(nextWallet);
          saveLocal("wallet", nextWallet);
        }}
      />
    );
  }
  if (view === "supply") {
    return (
      <SupplyView
        wallet={wallet}
        inventory={inventory}
        onBack={() => setView("home")}
        onNavigate={setView}
        onChange={(nextWallet, nextInventory) => {
          setWallet(nextWallet);
          setInventory(nextInventory);
          saveLocal("wallet", nextWallet);
          saveLocal("inventory", nextInventory);
        }}
      />
    );
  }
  return <Home onNavigate={setView} onStartDaily={startDaily} onStartTraining={startTraining} onStartRace={startRace} stats={stats} />;
}
