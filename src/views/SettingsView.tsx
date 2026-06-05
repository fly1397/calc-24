import { ArrowLeft } from "lucide-react";
import type { defaultDebug, defaultWallet } from "../appTypes";

export function SettingsView({
  debug,
  wallet,
  onBack,
  onChange,
  onWalletChange
}: {
  debug: typeof defaultDebug;
  wallet: typeof defaultWallet;
  onBack: () => void;
  onChange: (debug: typeof defaultDebug) => void;
  onWalletChange: (wallet: typeof defaultWallet) => void;
}) {
  const toggle = (key: keyof typeof defaultDebug) => onChange({ ...debug, [key]: !debug[key] });

  return (
    <main className="screen">
      <header className="topbar">
        <button className="icon-button ghost" onClick={onBack} aria-label="返回"><ArrowLeft /></button>
        <div><p className="eyebrow">设置</p><h2>调试与辅助</h2></div>
      </header>
      <section className="settings-list">
        <button onClick={() => toggle("unlockAll")}><strong>解锁全部关卡</strong><span>{debug.unlockAll ? "已开启" : "已关闭"}</span></button>
        <button onClick={() => toggle("infiniteHints")}><strong>无限提示</strong><span>{debug.infiniteHints ? "已开启" : "已关闭"}</span></button>
        <button onClick={() => onWalletChange({ ...wallet, coins: wallet.coins + 5000 })}><strong>增加 5000 金币</strong><span>当前 {wallet.coins}</span></button>
        <button onClick={() => onWalletChange({ ...wallet, wisdomStars: wallet.wisdomStars + 50 })}><strong>增加 50 智慧星</strong><span>当前 {wallet.wisdomStars}</span></button>
        <button onClick={() => toggle("sound")}><strong>音效</strong><span>{debug.sound ? "已开启" : "已关闭"}</span></button>
        <button onClick={() => toggle("vibration")}><strong>震动</strong><span>{debug.vibration ? "已开启" : "已关闭"}</span></button>
        <button onClick={() => toggle("eyeCare")}><strong>护眼模式</strong><span>{debug.eyeCare ? "已开启" : "已关闭"}</span></button>
      </section>
    </main>
  );
}
