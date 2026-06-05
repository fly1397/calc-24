import { useEffect, useMemo, useRef, useState } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { ArrowLeft, Brain, Lightbulb, RotateCcw, Sparkles, Undo2 } from "lucide-react";
import { applyUnaryCard, isSolved, makeInitialCards, mergeCards, solutionFromNode } from "../../shared/engine";
import { equalsFraction, formatFraction, makeFraction } from "../../shared/fraction";
import type { CardState, CoachMessage, Operator, Solution, StoredAttempt, UnaryOperator } from "../../shared/types";
import { api, type PuzzlePayload } from "../api";
import type { MergeAnimation, Mode } from "../appTypes";
import { defaultDebug } from "../appTypes";
import { HintBox } from "../components/HintBox";
import { ResultPanel } from "../components/ResultPanel";
import { useClock } from "../hooks/useClock";
import { loadLocal, saveLocal } from "../utils/storage";

type HistoryItem = { cards: CardState[] };

const opText: Record<Operator, string> = { "+": "+", "-": "-", "*": "×", "/": "÷", concat: "拼" };
const unaryText: Record<UnaryOperator, string> = { square: "x²", sqrt: "√x", factorial: "x!" };

export function GameView({
  payload,
  mode,
  recommendation,
  onBack,
  onSolved,
  onNextTraining,
  onNextRace,
  onNextPuzzle,
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
  onNextPuzzle: () => void;
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
  const [mergeAnimation, setMergeAnimation] = useState<MergeAnimation>(null);
  const [startedAt, setStartedAt] = useState<number | null>(Date.now());
  const [hintsUsed, setHintsUsed] = useState(0);
  const [unaryUsed, setUnaryUsed] = useState(0);
  const [resets, setResets] = useState(0);
  const [solution, setSolution] = useState<Solution | null>(null);
  const [result, setResult] = useState<{ isNew: boolean; score: number; discoveredCount: number } | null>(null);
  const [leaderboard, setLeaderboard] = useState<Array<StoredAttempt & { score: number }>>([]);
  const [coach, setCoach] = useState<CoachMessage | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const cardRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const elapsed = useClock(!solution, startedAt);
  const gameRef = useRef<HTMLElement | null>(null);

  useGSAP(() => {
    gsap.from(".topbar, .puzzle-info, .selection-guide, .number-card, .op-button, .tools button", {
      y: 14,
      autoAlpha: 0,
      duration: 0.36,
      ease: "power2.out",
      stagger: 0.025
    });
  }, { scope: gameRef, dependencies: [puzzle.id], revertOnUpdate: true });

  useEffect(() => {
    const nextInitial = makeInitialCards(puzzle.cards, puzzle.specialCards);
    setCards(nextInitial.slice(0, puzzle.ruleSet.useCount));
    setReserveCards(nextInitial.slice(puzzle.ruleSet.useCount));
    setHistory([]);
    setSelectedCards([]);
    setSelectedOp(null);
    setMergeAnimation(null);
    setStartedAt(Date.now());
    setHintsUsed(0);
    setUnaryUsed(0);
    setResets(0);
    setSolution(null);
    setResult(null);
    setCoach(null);
    setNotice(null);
    api.leaderboard(puzzle.id).then((data) => setLeaderboard(data.rows)).catch(() => setLeaderboard([]));
  }, [puzzle.id, puzzle.cards, puzzle.specialCards, puzzle.ruleSet.useCount]);

  useEffect(() => {
    if (solution || elapsed < 15000) return;
    api.coach({ puzzleId: puzzle.id, elapsedMs: elapsed, hintsUsed, cardsLeft: cards.length })
      .then((data) => setCoach(data.message))
      .catch(() => undefined);
  }, [Math.floor(elapsed / 20000), solution, hintsUsed, cards.length, puzzle.id]);

  const resolveCard = (card?: CardState): CardState | undefined => {
    if (!card) return undefined;
    if (card.special?.type !== "ghost") return card;
    const values = [card.value.n / card.value.d, ...(card.special.altValues?.length ? card.special.altValues : card.special.altValue ? [card.special.altValue] : [])];
    const value = values[Math.floor(elapsed / 3000) % values.length];
    return {
      ...card,
      value: makeFraction(value),
      expr: { type: "leaf", value: makeFraction(value), cardId: card.id, label: String(value) }
    };
  };

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
    const fromRect = cardRefs.current[leftId]?.getBoundingClientRect();
    const toRect = cardRefs.current[rightId]?.getBoundingClientRect();
    const dx = fromRect && toRect ? toRect.left + toRect.width / 2 - (fromRect.left + fromRect.width / 2) : -80;
    const dy = fromRect && toRect ? toRect.top + toRect.height / 2 - (fromRect.top + fromRect.height / 2) : -24;
    setMergeAnimation({ fromId: leftId, toId: rightId, dx, dy });
    const fromEl = cardRefs.current[leftId];
    const toEl = cardRefs.current[rightId];
    const tl = gsap.timeline({
      defaults: { duration: 0.22, ease: "power3.inOut" },
      onComplete: () => {
        setHistory((items) => [...items, { cards }]);
        setCards(next);
        setSelectedCards([merged.id]);
        setSelectedOp(null);
        setMergeAnimation(null);
        void completeIfSolved(next);
      }
    });
    if (fromEl) tl.to(fromEl, { x: dx, y: dy, scale: 0.2, autoAlpha: 0 }, 0);
    if (toEl) tl.to(toEl, { scale: 1.08, duration: 0.12, ease: "back.out(2)" }, 0.08).to(toEl, { scale: 1, duration: 0.12 }, ">");
  };

  const applyUnary = (op: UnaryOperator) => {
    if (solution || selectedCards.length !== 1) return;
    const limit = puzzle.ruleSet.unaryLimit ?? 1;
    if (unaryUsed >= limit) {
      setNotice(`本关高阶符号最多使用 ${limit} 次。`);
      return;
    }
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
    setUnaryUsed((value) => value + 1);
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
    setMergeAnimation(null);
  };

  const reset = () => {
    const nextInitial = makeInitialCards(puzzle.cards, puzzle.specialCards);
    setCards(nextInitial.slice(0, puzzle.ruleSet.useCount));
    setReserveCards(nextInitial.slice(puzzle.ruleSet.useCount));
    setHistory([]);
    setSelectedCards([]);
    setSelectedOp(null);
    setMergeAnimation(null);
    setSolution(null);
    setResult(null);
    setStartedAt(Date.now());
    setHintsUsed(0);
    setUnaryUsed(0);
    setNotice(null);
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
    <main ref={gameRef} className="screen game">
      <header className="topbar game-hud">
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
      <section className="selection-guide">
        {selectedCards.length === 0 && "先点一张数字牌"}
        {selectedCards.length === 1 && !selectedOp && "再点运算符，或再选一张牌"}
        {selectedCards.length === 1 && selectedOp && `已选择 ${opText[selectedOp]}，再点第二张牌`}
        {selectedCards.length === 2 && "选择运算符完成合并"}
      </section>
      {puzzle.specialCards?.length ? (
        <section className="rule-note">
          {puzzle.specialCards.map((card) => (
            <span key={`${card.index}-${card.type}`}>
              {card.type === "frost" ? "冰冻：前两步禁用" : card.type === "ghost" ? `幻影：每3秒循环 ${[puzzle.cards[card.index], ...(card.altValues ?? (card.altValue ? [card.altValue] : []))].join("/")}` : "小丑：选中后可变 1-9"}
            </span>
          ))}
        </section>
      ) : null}
      {puzzle.ruleSet.requiredUnary && <section className="rule-note"><span>本关必须使用平方、开方或阶乘，最多 {puzzle.ruleSet.unaryLimit ?? 1} 次。</span></section>}
      {notice && <section className="hint-box warning">{notice}</section>}
      {recommendation && <section className="coach-box focus"><Brain size={18} />{recommendation}</section>}
      {coach && !solution && <section className={`coach-box ${coach.tone}`}><Brain size={18} />{coach.text}</section>}

      <section className="card-board">
        {cards.map((card) => (
          <button
            key={card.id}
            ref={(node) => {
              cardRefs.current[card.id] = node;
            }}
            className={`number-card ${selectedCards.includes(card.id) ? "selected" : ""} ${mergeAnimation?.fromId === card.id ? "merge-from" : ""} ${mergeAnimation?.toId === card.id ? "merge-to" : ""}`}
            onClick={() => pickCard(card.id)}
          >
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
          onNextPuzzle={onNextPuzzle}
        />
      )}
    </main>
  );
}
