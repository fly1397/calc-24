import { ArrowLeft } from "lucide-react";
import type { Puzzle } from "../../shared/types";
import type { Stats, View } from "../appTypes";
import { BottomNav } from "../components/BottomNav";

export function ArchiveView({
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
