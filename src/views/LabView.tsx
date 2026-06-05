import { useState } from "react";
import { ArrowLeft } from "lucide-react";
import type { LabCollectionRuntime } from "../../shared/lab";
import type { Puzzle } from "../../shared/types";
import type { View } from "../appTypes";
import { BottomNav } from "../components/BottomNav";

export function LabView({
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
