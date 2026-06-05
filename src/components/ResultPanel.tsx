import { useRef } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { Medal, Play, Share2, Sparkles } from "lucide-react";
import type { Mode } from "../appTypes";
import type { Solution, StoredAttempt } from "../../shared/types";

export function ResultPanel({
  solution,
  result,
  elapsed,
  hintsUsed,
  seed,
  leaderboard,
  mode,
  onReset,
  onNextTraining,
  onNextRace,
  onNextPuzzle
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
  onNextPuzzle: () => void;
}) {
  const resultRef = useRef<HTMLElement | null>(null);
  useGSAP(() => {
    gsap.fromTo(".result", { y: 16, scale: 0.96, autoAlpha: 0 }, { y: 0, scale: 1, autoAlpha: 1, duration: 0.28, ease: "back.out(1.7)" });
  }, { scope: resultRef });

  const shareText = `我用 ${(elapsed / 1000).toFixed(1)} 秒解开了这道 24 点：${solution.expression} = 24。Seed：${seed}`;
  const copyShare = async () => navigator.clipboard?.writeText(shareText);
  const next = mode === "training" ? onNextTraining : mode === "race" ? onNextRace : onNextPuzzle;

  return (
    <section ref={resultRef} className="result-overlay">
      <div className="result">
        <div className="result-title">
          <Medal />
          <div>
            <p>{result?.isNew ? "发现新解法" : "恭喜通关"}</p>
            <strong>{solution.expression} = 24</strong>
          </div>
        </div>
        <div className="tag-row">
          {solution.tags.map((tag) => <span key={tag}>{tag}</span>)}
          {hintsUsed === 0 && <span>无提示</span>}
          {leaderboard[0] && <span>最快 {(leaderboard[0].elapsedMs / 1000).toFixed(1)}s</span>}
        </div>
        <div className="result-actions">
          <button onClick={next}><Play size={18} />下一关</button>
          <button onClick={onReset}><Sparkles size={18} />再来一次</button>
        </div>
        <button className="text-action" onClick={copyShare}><Share2 size={16} />复制挑战</button>
      </div>
    </section>
  );
}
