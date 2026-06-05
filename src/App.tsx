import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { useEffect, useMemo, useState } from "react";
import type { LabCollectionRuntime } from "../shared/lab";
import type { HellLayer } from "../shared/modes";
import type { StageDefinition } from "../shared/puzzles";
import type { PlayerMetrics, Puzzle } from "../shared/types";
import { api, type PuzzlePayload } from "./api";
import type { Mode, Stats, View } from "./appTypes";
import { defaultDebug, defaultInventory, defaultMetrics, defaultWallet } from "./appTypes";
import { loadLocal, saveLocal } from "./utils/storage";
import { Home } from "./views/Home";
import { LevelMap } from "./views/LevelMap";
import { SettingsView } from "./views/SettingsView";
import { Clinic } from "./views/Clinic";
import { ArchiveView } from "./views/ArchiveView";
import { LabView } from "./views/LabView";
import { GameView } from "./views/GameView";
import { HellView } from "./views/HellView";
import { SupplyView } from "./views/SupplyView";

gsap.registerPlugin(useGSAP);

export function App() {
  const [view, setView] = useState<View>("home");
  const [puzzles, setPuzzles] = useState<Puzzle[]>([]);
  const [labPuzzles, setLabPuzzles] = useState<Puzzle[]>([]);
  const [labCollections, setLabCollections] = useState<LabCollectionRuntime[]>([]);
  const [hellLayers, setHellLayers] = useState<HellLayer[]>([]);
  const [racePack, setRacePack] = useState<Puzzle[]>([]);
  const [raceIndex, setRaceIndex] = useState(0);
  const [stages, setStages] = useState<StageDefinition[]>([]);
  const [payload, setPayload] = useState<PuzzlePayload | null>(null);
  const [mode, setMode] = useState<Mode>("main");
  const [recommendation, setRecommendation] = useState<string>();
  const [solved, setSolved] = useState(() => loadLocal<string[]>("solved", []));
  const [metrics, setMetrics] = useState(() => loadLocal<PlayerMetrics>("metrics", defaultMetrics));
  const [wallet, setWallet] = useState(() => loadLocal("wallet", defaultWallet));
  const [inventory, setInventory] = useState(() => loadLocal("inventory", defaultInventory));
  const [debug, setDebug] = useState(() => loadLocal("debug", defaultDebug));
  const [stats, setStats] = useState<Stats>();

  useEffect(() => {
    api.puzzleIndex().then((data) => {
      setPuzzles(data.puzzles);
      setStages(data.stages);
    });
    api.lab(debug.unlockAll).then((data) => {
      setLabPuzzles(data.puzzles);
      setLabCollections(data.collections);
    });
    api.hell().then((data) => setHellLayers(data.layers));
    api.stats().then(setStats).catch(() => undefined);
  }, [debug.unlockAll]);

  const refreshStats = () => api.stats().then(setStats).catch(() => undefined);

  const startPuzzle = async (puzzle: Puzzle, nextMode: Mode = "main") => {
    const data = await api.puzzle(puzzle.id);
    setPayload(data);
    setMode(nextMode);
    setRecommendation(undefined);
    setView("game");
  };

  const startDaily = async () => {
    const data = await api.daily();
    setPayload(data);
    setMode("daily");
    setRecommendation(undefined);
    setView("game");
  };

  const startRace = async () => {
    const data = await api.race();
    setRacePack(data.puzzles);
    setRaceIndex(0);
    const first = data.puzzles[0];
    if (!first) return;
    const payload = await api.puzzle(first.id);
    setPayload(payload);
    setMode("race");
    setRecommendation("随机 10 题，秒表不中断。答完后点击下一题继续。");
    setView("game");
  };

  const startTraining = async () => {
    const data = await api.trainingNext({ ...metrics, excludeIds: solved });
    setPayload(data);
    setMode("training");
    setRecommendation(data.recommendation.reason);
    setView("game");
  };

  const startNextPuzzle = async () => {
    if (!payload) return;
    const current = payload.puzzle;
    const pools = [
      puzzles,
      labCollections.find((collection) => collection.puzzles.some((puzzle) => puzzle.id === current.id))?.puzzles ?? [],
      hellLayers.find((layer) => layer.puzzles.some((puzzle) => puzzle.id === current.id))?.puzzles ?? []
    ];
    const pool = pools.find((items) => items.some((item) => item.id === current.id)) ?? [];
    const index = pool.findIndex((item) => item.id === current.id);
    const next = pool[index + 1];
    if (!next) {
      setView("home");
      return;
    }
    await startPuzzle(next, mode === "hell" ? "hell" : mode === "lab" ? "lab" : "main");
  };

  const nextRace = async () => {
    const nextIndex = raceIndex + 1;
    setRaceIndex(nextIndex);
    const next = racePack[nextIndex];
    if (!next) {
      setView("home");
      return;
    }
    const data = await api.puzzle(next.id);
    setPayload(data);
    setMode("race");
    setRecommendation(`竞速进度 ${nextIndex + 1}/${racePack.length}`);
  };

  const markSolved = (puzzleId: string, elapsedMs: number, hintsUsed: number, resets: number) => {
    const nextSolved = Array.from(new Set([...solved, puzzleId]));
    const nextMetrics: PlayerMetrics = {
      recentElapsedMs: [...metrics.recentElapsedMs.slice(-9), elapsedMs],
      recentHints: [...metrics.recentHints.slice(-9), hintsUsed],
      recentResets: [...metrics.recentResets.slice(-9), resets],
      solvedStreak: metrics.solvedStreak + 1,
      failedStreak: 0,
      currentLevel: Math.max(metrics.currentLevel ?? 0, Number(puzzleId.replace(/\D/g, "")) || 0)
    };
    setSolved(nextSolved);
    setMetrics(nextMetrics);
    const coinReward = Math.max(30, Math.round(80 + elapsedMs / 3000 - hintsUsed * 15));
    const starReward = hintsUsed === 0 ? 1 : 0;
    const nextWallet = { coins: wallet.coins + coinReward, wisdomStars: wallet.wisdomStars + starReward };
    setWallet(nextWallet);
    saveLocal("solved", nextSolved);
    saveLocal("metrics", nextMetrics);
    saveLocal("wallet", nextWallet);
    void refreshStats();
  };

  const currentGame = useMemo(() => {
    if (!payload) return null;
    return (
      <GameView
        payload={payload}
        mode={mode}
        recommendation={recommendation}
        raceProgress={mode === "race" ? `${raceIndex + 1}/${racePack.length || 10}` : undefined}
        debug={debug}
        onBack={() => setView(mode === "main" ? "map" : "home")}
        onSolved={markSolved}
        onNextTraining={startTraining}
        onNextRace={nextRace}
        onNextPuzzle={startNextPuzzle}
      />
    );
  }, [payload, mode, recommendation, solved, metrics, wallet, debug, raceIndex, racePack]);

  if (view === "game" && currentGame) return currentGame;
  if (view === "map") return <LevelMap puzzles={puzzles} stages={stages} solved={solved} onBack={() => setView("home")} onPick={startPuzzle} />;
  if (view === "clinic") return <Clinic puzzles={puzzles} onBack={() => setView("home")} onPick={startPuzzle} />;
  if (view === "archive") return <ArchiveView puzzles={[...puzzles, ...labPuzzles]} stats={stats} onBack={() => setView("home")} onPick={startPuzzle} onNavigate={setView} />;
  if (view === "lab") return <LabView collections={labCollections} onBack={() => setView("home")} onPick={(puzzle) => startPuzzle(puzzle, "lab")} onNavigate={setView} />;
  if (view === "hell") return <HellView layers={hellLayers} solved={solved} debug={debug} onBack={() => setView("home")} onPick={(puzzle) => startPuzzle(puzzle, "hell")} />;
  if (view === "settings") {
    return (
      <SettingsView
        debug={debug}
        wallet={wallet}
        onBack={() => setView("home")}
        onChange={(next) => {
          setDebug(next);
          saveLocal("debug", next);
        }}
        onWalletChange={(nextWallet) => {
          setWallet(nextWallet);
          saveLocal("wallet", nextWallet);
        }}
      />
    );
  }
  if (view === "supply") {
    return (
      <SupplyView
        wallet={wallet}
        inventory={inventory}
        onBack={() => setView("home")}
        onNavigate={setView}
        onChange={(nextWallet, nextInventory) => {
          setWallet(nextWallet);
          setInventory(nextInventory);
          saveLocal("wallet", nextWallet);
          saveLocal("inventory", nextInventory);
        }}
      />
    );
  }
  return <Home onNavigate={setView} onStartDaily={startDaily} onStartTraining={startTraining} onStartRace={startRace} stats={stats} />;
}
