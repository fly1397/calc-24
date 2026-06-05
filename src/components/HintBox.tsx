import { Lightbulb } from "lucide-react";
import type { HintPack } from "../../shared/types";

export function HintBox({ hints, level }: { hints: HintPack; level: number }) {
  const text = level === 1 ? hints.level1 : level === 2 ? hints.level2 : level === 3 ? hints.level3 : hints.answer.join("；");
  return <section className="hint-box"><Lightbulb size={18} />{text}</section>;
}
