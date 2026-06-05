import { useRef } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { Brain, CalendarDays, ListRestart, Play, Settings, Timer, Trophy } from "lucide-react";
import type { Stats, View } from "../appTypes";
import { BottomNav } from "../components/BottomNav";

export function Home({
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
  const homeRef = useRef<HTMLElement | null>(null);
  useGSAP(() => {
    gsap.from(".home-top, .brand, .daily-band, .mode-tile, .home-quick, .stats", {
      y: 18,
      autoAlpha: 0,
      duration: 0.45,
      ease: "power3.out",
      stagger: 0.045
    });
  }, { scope: homeRef });

  return (
    <main ref={homeRef} className="screen home">
      <header className="home-top">
        <span>绝对算式</span>
        <button className="icon-button ghost" onClick={() => onNavigate("settings")} aria-label="设置">
          <Settings size={21} />
        </button>
      </header>

      <section className="brand">
        <div className="brand-mark">24</div>
        <div>
          <p className="eyebrow">从幼儿园到数学之神</p>
          <h1>今天也要凑出 24</h1>
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
      </section>

      <section className="home-quick">
        <button onClick={() => onNavigate("clinic")}>
          <ListRestart size={20} />
          <span>残局诊所</span>
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
