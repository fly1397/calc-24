import { useState } from "react";
import { ArrowLeft } from "lucide-react";
import type { Puzzle } from "../../shared/types";
import { loadLocal, saveLocal } from "../utils/storage";

export function Clinic({ puzzles, onBack, onPick }: { puzzles: Puzzle[]; onBack: () => void; onPick: (puzzle: Puzzle) => void }) {
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
