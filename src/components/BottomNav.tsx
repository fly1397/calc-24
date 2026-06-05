import { Archive, FlaskConical, Play, Sparkles } from "lucide-react";
import type { View } from "../appTypes";

export function BottomNav({ active, onNavigate }: { active: View; onNavigate: (view: View) => void }) {
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
