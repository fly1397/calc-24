import { useState } from "react";
import { ArrowLeft, Trophy } from "lucide-react";
import type { HellLayer } from "../../shared/modes";
import type { Puzzle } from "../../shared/types";
import { defaultDebug } from "../appTypes";

export function HellView({
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
