import { useEffect, useRef, useState } from 'react';
import { MatchController, type HudSnapshot, type MatchResult } from '@/game/matchController';
import { TutorialRunner } from '@/game/tutorial';
import { audio } from '@/game/audio';
import { crestDataURL, coachSprite } from '@/game/sprites';
import { PLAYER_CLUB, type ClubDef, type DivisionDef } from '@/game/constants';
import { SettingsModal } from './SettingsModal';
import type { Settings } from '@/game/save';

interface Props {
  mode: 'ranked' | 'quick' | 'tutorial';
  division: DivisionDef;
  botClub: ClubDef;
  seed: number;
  settings: Settings;
  onSettingsChange: (s: Settings) => void;
  onFinish: (r: MatchResult) => void;
  onForfeit: () => void;
}

export function MatchScreen({ mode, division, botClub, seed, settings, onSettingsChange, onFinish, onForfeit }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const ctlRef = useRef<MatchController | null>(null);
  const [hud, setHud] = useState<HudSnapshot | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const settingsRef = useRef(settings);
  settingsRef.current = settings;
  const coachUrl = useRef('');

  useEffect(() => {
    const cv = document.createElement('canvas');
    cv.width = 72;
    cv.height = 72;
    cv.getContext('2d')!.drawImage(coachSprite(), 0, 0, 72, 72);
    coachUrl.current = cv.toDataURL();
  }, []);

  useEffect(() => {
    audio.unlock();
    audio.setMusic('match');
    audio.setCrowdLevel(0.07);

    const ctl = new MatchController({
      canvas: canvasRef.current!,
      mode,
      division,
      botClub,
      playerClub: PLAYER_CLUB,
      seed,
      goalLimit: mode === 'tutorial' ? 3 : undefined,
      playLimit: mode === 'tutorial' ? 0 : undefined,
      tutorial: mode === 'tutorial' ? new TutorialRunner() : undefined,
      getSettings: () => settingsRef.current,
      onSnapshot: setHud,
      onMatchEnd: (r) => {
        audio.setCrowdLevel(0.04);
        onFinish(r);
      },
    });
    ctlRef.current = ctl;
    // dev/test bridge (also used by automated playtests)
    (window as unknown as { __RUSHLINE__: unknown }).__RUSHLINE__ = ctl;

    document.fonts?.ready.then(() => ctl.resize());
    ctl.start();

    const ro = new ResizeObserver(() => ctl.resize());
    ro.observe(wrapRef.current!);
    const onVis = () => {
      if (document.hidden) audio.setMusic('off');
      else audio.setMusic('match');
    };
    document.addEventListener('visibilitychange', onVis);

    return () => {
      document.removeEventListener('visibilitychange', onVis);
      ro.disconnect();
      ctl.destroy();
      ctlRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, division.id, botClub.id, seed]);

  const playerCrest = crestDataURL(PLAYER_CLUB, 3);
  const botCrest = crestDataURL(botClub, 3);

  return (
    <div className="relative h-full w-full overflow-hidden bg-[#141b2e]" ref={wrapRef}>
      <canvas ref={canvasRef} className="absolute inset-0 h-full w-full touch-none" />
      <div className="crt-lines" />

      {/* ── HUD top ── */}
      <div className="safe-top pointer-events-none absolute inset-x-0 top-0 z-10 flex flex-col gap-1.5 px-2">
        <div className="flex items-center justify-between gap-2">
          <div className="hud-chip flex items-center gap-1.5">
            <img src={playerCrest} alt="" className="h-6 w-6" />
            <span className="text-[#29d3b5]">YOU</span>
            <span className="score-chip !border-0 !p-0 text-[14px]">{hud?.score[0] ?? 0}</span>
          </div>

          <div className="flex flex-col items-center">
            {hud?.suddenDeath ? (
              <span className="hud-chip anim-blink text-[8px] text-[#ffd23f]">GOLDEN GOAL</span>
            ) : mode !== 'tutorial' ? (
              <span className="hud-chip text-[8px] txt-dim">PLAYS {hud?.playsLeft ?? 0}</span>
            ) : (
              <span className="hud-chip text-[8px] text-[#ffd23f]">TRAINING</span>
            )}
          </div>

          <div className="hud-chip flex items-center gap-1.5">
            <span className="score-chip !border-0 !p-0 text-[14px]">{hud?.score[1] ?? 0}</span>
            <span style={{ color: botClub.primary }}>{botClub.name.split(' ')[0].toUpperCase().slice(0, 6)}</span>
            <img src={botCrest} alt="" className="h-6 w-6" />
          </div>
        </div>

        <div className="flex items-center justify-between gap-2">
          {/* AP pips */}
          <div className="hud-chip flex items-center gap-1.5">
            <span className="text-[7px] txt-dim">AP</span>
            {Array.from({ length: hud?.apMax ?? 4 }).map((_, i) => (
              <span key={i} className={`ap-pip !h-[14px] !w-[14px] ${i < (hud?.ap ?? 0) ? 'on' : 'spent'}`} />
            ))}
          </div>

          {/* flow meter */}
          <div className="hud-chip flex flex-1 items-center gap-1.5">
            <span className="text-[7px] text-[#ffd23f]">FLOW</span>
            <div className={`px-meter flow h-[12px] flex-1 ${(hud?.flowMeter ?? 0) >= (hud?.flowMax ?? 6) ? 'full' : ''}`}>
              <div className="fill" style={{ width: `${((hud?.flowMeter ?? 0) / (hud?.flowMax ?? 6)) * 100}%` }} />
            </div>
            {hud?.surgeArmed && <span className="anim-blink text-[7px] text-[#ffd23f]">+AP</span>}
          </div>

          <button
            className="px-btn pointer-events-auto !p-2 text-[9px]"
            onClick={() => setSettingsOpen(true)}
            aria-label="settings"
          >
            ⚙
          </button>
        </div>

        {hud?.botThinking && (
          <div className="self-center">
            <span className="hud-chip anim-blink text-[8px]" style={{ color: botClub.primary }}>
              {botClub.name.toUpperCase()} IS PLANNING…
            </span>
          </div>
        )}
      </div>

      {/* ── selected athlete chip ── */}
      {hud?.selectedLabel && !hud.coachLine && (
        <div className="pointer-events-none absolute inset-x-0 bottom-[calc(76px+env(safe-area-inset-bottom))] z-10 flex justify-center">
          <span className="hud-chip anim-pop text-[8px] text-[#6ef3ff]">{hud.selectedLabel}</span>
        </div>
      )}

      {/* ── coach bubble (tutorial) ── */}
      {hud?.coachLine && (
        <div className="absolute inset-x-0 bottom-0 z-20 px-3 safe-bottom">
          <div className="coach-bubble px-panel ml-[76px] p-3">
            <p className="text-[8px] leading-relaxed">{hud.coachLine}</p>
            {hud.coachContinue && (
              <button
                className="px-btn px-btn-gold mt-3 w-full !py-2 text-[9px]"
                onClick={() => ctlRef.current?.coachContinueRequested()}
              >
                GOT IT ▶
              </button>
            )}
          </div>
          <img
            src={coachUrl.current}
            alt="Coach Pip"
            className="anim-float absolute -top-[76px] left-1 h-[72px] w-[72px] border-4 border-black bg-[#1a2338] shadow-[inset_0_0_0_2px_#3b4f7a]"
          />
        </div>
      )}

      {/* ── END PLAY ── */}
      {hud?.canEndPlay && !hud.coachLine && (
        <div className="absolute bottom-0 right-0 z-10 p-3 safe-bottom">
          <button
            className="px-btn px-btn-gold text-[11px]"
            onClick={() => ctlRef.current?.endPlayRequested()}
          >
            END PLAY ⏭
          </button>
        </div>
      )}

      {settingsOpen && (
        <SettingsModal
          settings={settings}
          inMatch
          onChange={onSettingsChange}
          onClose={() => setSettingsOpen(false)}
          onForfeit={() => {
            setSettingsOpen(false);
            onForfeit();
          }}
        />
      )}
    </div>
  );
}
