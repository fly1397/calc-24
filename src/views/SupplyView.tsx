import { ArrowLeft } from "lucide-react";
import type { View } from "../appTypes";
import { defaultInventory, defaultWallet } from "../appTypes";
import { BottomNav } from "../components/BottomNav";

export function SupplyView({
  wallet,
  inventory,
  onBack,
  onChange,
  onNavigate
}: {
  wallet: typeof defaultWallet;
  inventory: typeof defaultInventory;
  onBack: () => void;
  onChange: (wallet: typeof defaultWallet, inventory: typeof defaultInventory) => void;
  onNavigate: (view: View) => void;
}) {
  const buy = (price: number, patch: Partial<typeof defaultInventory>) => {
    if (wallet.coins < price) return;
    onChange(
      { ...wallet, coins: wallet.coins - price },
      {
        hintPacks: inventory.hintPacks + (patch.hintPacks ?? 0),
        deathShields: inventory.deathShields + (patch.deathShields ?? 0),
        jokers: inventory.jokers + (patch.jokers ?? 0),
        blindBoxTickets: inventory.blindBoxTickets + (patch.blindBoxTickets ?? 0)
      }
    );
  };

  const draw = () => {
    if (wallet.wisdomStars < 5) return;
    const roll = (wallet.wisdomStars + wallet.coins + inventory.jokers * 7) % 3;
    const prize = roll === 0 ? { hintPacks: 2 } : roll === 1 ? { jokers: 1 } : { deathShields: 1 };
    onChange(
      { ...wallet, wisdomStars: wallet.wisdomStars - 5 },
      {
        hintPacks: inventory.hintPacks + (prize.hintPacks ?? 0),
        deathShields: inventory.deathShields + (prize.deathShields ?? 0),
        jokers: inventory.jokers + (prize.jokers ?? 0),
        blindBoxTickets: inventory.blindBoxTickets
      }
    );
  };

  return (
    <main className="screen">
      <header className="topbar">
        <button className="icon-button ghost" onClick={onBack} aria-label="返回"><ArrowLeft /></button>
        <div><p className="eyebrow">补给站</p><h2>金币商店与科研盲盒</h2></div>
      </header>
      <section className="archive-summary">
        <div><strong>{wallet.coins}</strong><span>金币</span></div>
        <div><strong>{wallet.wisdomStars}</strong><span>智慧星</span></div>
      </section>
      <section className="inventory-row">
        <span>锦囊 {inventory.hintPacks}</span>
        <span>免死 {inventory.deathShields}</span>
        <span>小丑 {inventory.jokers}</span>
      </section>
      <section className="shop-grid">
        <button onClick={() => buy(100, { hintPacks: 1 })} disabled={wallet.coins < 100}>
          <strong>初级思路锦囊</strong>
          <span>100 金币 · 额外线索储备</span>
        </button>
        <button onClick={() => buy(500, { deathShields: 1 })} disabled={wallet.coins < 500}>
          <strong>地狱免死金牌</strong>
          <span>500 金币 · 地狱关失败保护</span>
        </button>
        <button onClick={() => buy(800, { jokers: 1 })} disabled={wallet.coins < 800}>
          <strong>万能小丑牌</strong>
          <span>800 金币 · 后续可替换数字</span>
        </button>
      </section>
      <section className="blind-box">
        <div>
          <p>科研盲盒</p>
          <strong>消耗 5 智慧星抽取稀有补给</strong>
        </div>
        <button onClick={draw} disabled={wallet.wisdomStars < 5}>抽 1 次</button>
      </section>
      <BottomNav active="supply" onNavigate={onNavigate} />
    </main>
  );
}
