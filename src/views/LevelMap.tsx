import { useState } from "react";
import { ArrowLeft, Trophy } from "lucide-react";
import type { StageDefinition } from "../../shared/puzzles";
import type { Puzzle } from "../../shared/types";

export function LevelMap({
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
