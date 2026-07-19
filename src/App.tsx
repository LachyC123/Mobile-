import { useCallback, useEffect, useRef, useState } from 'react';
import './App.css';
import { TitleScreen } from '@/screens/TitleScreen';
import { LadderScreen } from '@/screens/LadderScreen';
import { LoadingScreen } from '@/screens/LoadingScreen';
import { MatchScreen } from '@/screens/MatchScreen';
import { ResultsScreen, type RankDelta } from '@/screens/ResultsScreen';
import { SettingsModal } from '@/screens/SettingsModal';
import {
  DIVISIONS, LP_WIN, LP_LOSS, LP_LOSS_ROOKIE, LP_MAX,
  type ClubDef, type DivisionDef,
} from '@/game/constants';
import { loadSave, persist, type SaveData } from '@/game/save';
import { audio } from '@/game/audio';
import type { MatchResult } from '@/game/matchController';

type Screen = 'title' | 'ladder' | 'loading' | 'match' | 'results';

interface MatchCfg {
  mode: 'ranked' | 'quick' | 'tutorial';
  division: DivisionDef;
  botClub: ClubDef;
  seed: number;
}

interface ResultBundle {
  playerWon: boolean;
  score: [number, number];
  rankDelta: RankDelta | null;
  tutorial: boolean;
  ranked: boolean;
}

function pickClub(division: DivisionDef, seed: number): ClubDef {
  return division.clubs[seed % division.clubs.length];
}

/** Apply ranked LP math; returns the updated rank + delta descriptor. */
function applyResult(save: SaveData, playerWon: boolean): RankDelta {
  const before = { ...save.rank };
  const r = save.rank;
  const divIdx = r.division;

  let delta: number;
  if (playerWon) {
    delta = LP_WIN;
    r.wins++;
    r.streak = Math.max(1, r.streak + 1);
  } else {
    delta = divIdx === 0 ? LP_LOSS_ROOKIE : LP_LOSS;
    r.losses++;
    r.streak = Math.min(-1, r.streak - 1);
  }
  r.lp += delta;

  let promoted = false;
  let demoted = false;
  if (r.lp >= LP_MAX && r.division < DIVISIONS.length - 1) {
    r.division++;
    r.lp = Math.max(0, r.lp - LP_MAX);
    promoted = true;
  } else if (r.lp >= LP_MAX) {
    r.lp = LP_MAX; // top division cap
  }
  if (r.lp < 0) {
    if (r.division > 0) {
      r.division--;
      r.lp = 60;
      demoted = true;
    } else {
      r.lp = 0;
    }
  }
  r.bestDivision = Math.max(r.bestDivision, r.division);
  return { before, after: { ...r }, lpDelta: delta, promoted, demoted };
}

export default function App() {
  const [save, setSave] = useState<SaveData>(() => loadSave());
  const [screen, setScreen] = useState<Screen>('title');
  const [cfg, setCfg] = useState<MatchCfg | null>(null);
  const [result, setResult] = useState<ResultBundle | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const saveRef = useRef(save);
  saveRef.current = save;
  const cfgRef = useRef(cfg);
  cfgRef.current = cfg;

  // unlock audio on the first real gesture anywhere
  useEffect(() => {
    const unlock = () => audio.unlock();
    window.addEventListener('pointerdown', unlock, { once: true });
    return () => window.removeEventListener('pointerdown', unlock);
  }, []);

  useEffect(() => {
    audio.applySettings({
      master: save.settings.master, music: save.settings.music, sfx: save.settings.sfx, muted: save.settings.muted,
    });
    persist(save);
  }, [save]);

  const updateSettings = useCallback((s: SaveData['settings']) => {
    setSave((prev) => ({ ...prev, settings: s }));
  }, []);

  const launchMatch = useCallback((mode: MatchCfg['mode']) => {
    const s = saveRef.current;
    const division = DIVISIONS[s.rank.division];
    const seed = (Date.now() % 100000) + s.rank.wins * 7 + s.rank.losses * 13;
    const botClub = pickClub(division, seed);
    setCfg({ mode, division, botClub, seed });
    setScreen('loading');
  }, []);

  const handleFinish = useCallback((r: MatchResult) => {
    setCfg((current) => {
      const isRanked = current?.mode === 'ranked';
      const isTutorial = current?.mode === 'tutorial';
      let rankDelta: RankDelta | null = null;
      setSave((prev) => {
        const next: SaveData = {
          ...prev,
          rank: { ...prev.rank },
          tutorialDone: prev.tutorialDone || isTutorial,
        };
        if (isRanked) {
          rankDelta = applyResult(next, r.playerWon);
        }
        return next;
      });
      // rankDelta is set synchronously inside setSave's updater in React 18 (updater runs during setState)
      setResult({
        playerWon: r.playerWon,
        score: r.score,
        rankDelta,
        tutorial: isTutorial ?? false,
        ranked: isRanked ?? false,
      });
      return current;
    });
    setScreen('results');
  }, []);

  const handleForfeit = useCallback(() => {
    if (cfg?.mode === 'ranked') {
      handleFinish({ winner: 1, score: [0, 1], playerWon: false });
    } else {
      setScreen(cfg?.mode === 'tutorial' ? 'title' : 'title');
    }
  }, [cfg, handleFinish]);

  return (
    <div className="mx-auto h-full w-full max-w-[520px] bg-[#141b2e]">
      {screen === 'title' && (
        <TitleScreen
          save={save}
          onRanked={() => setScreen('ladder')}
          onQuickPlay={() => launchMatch('quick')}
          onTutorial={() => launchMatch('tutorial')}
          onSettings={() => setSettingsOpen(true)}
        />
      )}

      {screen === 'ladder' && (
        <LadderScreen save={save} onPlay={() => launchMatch('ranked')} onBack={() => setScreen('title')} />
      )}

      {screen === 'loading' && cfg && (
        <LoadingScreen
          division={cfg.division}
          botClub={cfg.botClub}
          modeLabel={cfg.mode === 'ranked' ? 'RANKED MATCH' : cfg.mode === 'quick' ? 'FRIENDLY' : 'TRAINING GROUND'}
          onReady={() => setScreen('match')}
        />
      )}

      {screen === 'match' && cfg && (
        <MatchScreen
          mode={cfg.mode}
          division={cfg.division}
          botClub={cfg.botClub}
          seed={cfg.seed}
          settings={save.settings}
          onSettingsChange={updateSettings}
          onFinish={handleFinish}
          onForfeit={handleForfeit}
        />
      )}

      {screen === 'results' && cfg && result && (
        <ResultsScreen
          playerWon={result.playerWon}
          score={result.score}
          botClub={cfg.botClub}
          ranked={result.ranked}
          rankDelta={result.rankDelta}
          tutorial={result.tutorial}
          onRematch={() => launchMatch(cfg.mode === 'tutorial' ? 'quick' : cfg.mode)}
          onContinue={() => setScreen(result.tutorial ? 'ladder' : 'ladder')}
        />
      )}

      {settingsOpen && (
        <SettingsModal
          settings={save.settings}
          inMatch={false}
          onChange={updateSettings}
          onClose={() => setSettingsOpen(false)}
        />
      )}
    </div>
  );
}
