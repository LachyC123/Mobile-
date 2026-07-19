import { useEffect, useMemo, useState } from 'react';
import { CrowdBackdrop } from '@/components/CrowdBackdrop';
import { crestDataURL } from '@/game/sprites';
import { LOADING_TIPS, type ClubDef, type DivisionDef, PLAYER_CLUB } from '@/game/constants';
import { audio } from '@/game/audio';

interface Props {
  division: DivisionDef;
  botClub: ClubDef;
  modeLabel: string;
  onReady: () => void;
}

export function LoadingScreen({ division, botClub, modeLabel, onReady }: Props) {
  const [progress, setProgress] = useState(0);
  const [tipIdx, setTipIdx] = useState(() => Math.floor(Math.random() * LOADING_TIPS.length));

  const playerCrest = useMemo(() => crestDataURL(PLAYER_CLUB, 5), []);
  const botCrest = useMemo(() => crestDataURL(botClub, 5), [botClub]);

  useEffect(() => {
    audio.setMusic('menu');
    const start = performance.now();
    const MIN = 2300;
    let raf = 0;
    const tick = (ts: number) => {
      const k = Math.min(1, (ts - start) / MIN);
      setProgress(k);
      if (k >= 1) {
        onReady();
        return;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    const tipTimer = window.setInterval(() => setTipIdx((i) => (i + 1) % LOADING_TIPS.length), 1400);
    return () => {
      cancelAnimationFrame(raf);
      clearInterval(tipTimer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="relative flex h-full flex-col overflow-hidden">
      <CrowdBackdrop />
      <div className="crt-lines" />

      <div className="safe-top relative z-10 flex flex-1 flex-col items-center justify-between px-6 pb-8">
        <div className="mt-2 text-center">
          <div className="text-[9px] txt-dim">{modeLabel}</div>
          <div className="text-[12px]" style={{ color: division.color }}>{division.name.toUpperCase()} DIVISION</div>
        </div>

        {/* matchup card */}
        <div className="flex w-full max-w-sm items-center justify-between gap-2">
          <div className="anim-pop flex flex-1 flex-col items-center gap-2">
            <img src={playerCrest} alt="your crest" className="h-20 w-20" />
            <div className="text-center text-[9px] leading-relaxed text-[#29d3b5]">{PLAYER_CLUB.name.toUpperCase()}</div>
            <div className="hud-chip text-[7px]">YOU</div>
          </div>

          <div className="px-title anim-blink text-[18px]">VS</div>

          <div className="anim-pop flex flex-1 flex-col items-center gap-2" style={{ animationDelay: '0.15s' }}>
            <img src={botCrest} alt="rival crest" className="h-20 w-20" />
            <div className="text-center text-[9px] leading-relaxed" style={{ color: botClub.primary }}>
              {botClub.name.toUpperCase()}
            </div>
            <div className="hud-chip text-[7px]">RIVAL BOT</div>
          </div>
        </div>

        {/* tip + progress */}
        <div className="flex w-full max-w-sm flex-col gap-4">
          <div className="px-panel-inset min-h-[64px] p-3">
            <div className="mb-1 text-[7px] text-[#ffd23f]">COACH PIP'S TIP</div>
            <div key={tipIdx} className="anim-pop text-[8px] leading-relaxed text-[#f2f6ff]">
              {LOADING_TIPS[tipIdx]}
            </div>
          </div>
          <div>
            <div className="mb-1 flex justify-between text-[7px] txt-dim">
              <span>WARMING UP THE FLOODLIGHTS…</span>
              <span>{Math.round(progress * 100)}%</span>
            </div>
            <div className="px-loadingbar">
              <div className="fill" style={{ width: `${progress * 100}%` }} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
