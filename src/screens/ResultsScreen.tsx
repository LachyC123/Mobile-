import { useEffect, useRef, useState } from 'react';
import { CrowdBackdrop } from '@/components/CrowdBackdrop';
import { crestDataURL } from '@/game/sprites';
import { DIVISIONS, PLAYER_CLUB, type ClubDef } from '@/game/constants';
import type { SaveData } from '@/game/save';
import { audio } from '@/game/audio';

export interface RankDelta {
  before: SaveData['rank'];
  after: SaveData['rank'];
  lpDelta: number;
  promoted: boolean;
  demoted: boolean;
}

interface Props {
  playerWon: boolean;
  score: [number, number];
  botClub: ClubDef;
  ranked: boolean;
  rankDelta: RankDelta | null;
  tutorial: boolean;
  onRematch: () => void;
  onContinue: () => void;
}

export function ResultsScreen({ playerWon, score, botClub, ranked, rankDelta, tutorial, onRematch, onContinue }: Props) {
  const [shownLp, setShownLp] = useState(rankDelta?.before.lp ?? 0);
  const promoted = rankDelta?.promoted ?? false;
  const demoted = rankDelta?.demoted ?? false;
  const animRef = useRef(0);

  useEffect(() => {
    audio.setMusic('menu');
    if (promoted) audio.sfx('promote');
  }, [promoted]);

  useEffect(() => {
    if (!rankDelta) return;
    const from = rankDelta.before.lp;
    const to = rankDelta.after.lp;
    const start = performance.now();
    const dur = 900;
    const tick = (ts: number) => {
      const k = Math.min(1, (ts - start) / dur);
      setShownLp(Math.round(from + (to - from) * k));
      if (k < 1) animRef.current = requestAnimationFrame(tick);
    };
    animRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animRef.current);
  }, [rankDelta]);

  const divBefore = rankDelta ? DIVISIONS[rankDelta.before.division] : null;
  const divAfter = rankDelta ? DIVISIONS[rankDelta.after.division] : null;

  return (
    <div className="relative flex h-full flex-col overflow-hidden">
      <CrowdBackdrop />
      <div className="crt-lines" />

      <div className="safe-top relative z-10 flex flex-1 flex-col items-center justify-between px-6 pb-8">
        <div />

        <div className="flex w-full max-w-sm flex-col items-center gap-5">
          <h1
            className={`px-title anim-pop text-[30px] ${playerWon ? '' : 'text-[#ff6b6b]'}`}
            style={playerWon ? {} : { color: '#ff6b6b' }}
          >
            {tutorial ? 'LESSON DONE!' : playerWon ? 'VICTORY!' : 'DEFEAT'}
          </h1>

          <div className="px-panel flex w-full items-center justify-between p-4">
            <div className="flex flex-col items-center gap-1">
              <img src={crestDataURL(PLAYER_CLUB, 4)} alt="your crest" className="h-14 w-14" />
              <span className="text-[7px] text-[#29d3b5]">YOU</span>
            </div>
            <div className="score-chip text-[26px]">
              {score[0]} — {score[1]}
            </div>
            <div className="flex flex-col items-center gap-1">
              <img src={crestDataURL(botClub, 4)} alt="rival crest" className="h-14 w-14" />
              <span className="text-[7px]" style={{ color: botClub.primary }}>{botClub.name.split(' ')[0].toUpperCase()}</span>
            </div>
          </div>

          {tutorial && (
            <div className="px-panel-inset w-full p-4 text-center text-[9px] leading-relaxed text-[#7dff8a]">
              Coach Pip is proud of you. The Rookie division is unlocked — go climb.
            </div>
          )}

          {ranked && rankDelta && divBefore && divAfter && (
            <div className="px-panel w-full p-4">
              <div className="mb-2 flex items-center justify-between">
                <span className="text-[9px]" style={{ color: divAfter.color }}>
                  {divAfter.name.toUpperCase()} DIVISION
                </span>
                <span
                  className="text-[10px]"
                  style={{ color: rankDelta.lpDelta >= 0 ? '#7dff8a' : '#ff8080' }}
                >
                  {rankDelta.lpDelta >= 0 ? '+' : ''}{rankDelta.lpDelta} LP
                </span>
              </div>
              <div className="px-meter">
                <div
                  className="fill"
                  style={{
                    width: `${shownLp}%`,
                    background: `repeating-linear-gradient(90deg, ${divAfter.color} 0 8px, rgba(0,0,0,0.25) 8px 10px)`,
                  }}
                />
              </div>
              <div className="mt-1 text-right text-[8px] txt-dim">{shownLp} / 100 LP</div>

              {promoted && (
                <div className="anim-pop mt-3 border-4 border-black bg-[#ffd23f] p-3 text-center text-[10px] text-black">
                  ★ PROMOTED TO {divAfter.name.toUpperCase()}! ★
                </div>
              )}
              {demoted && (
                <div className="anim-pop mt-3 border-4 border-black bg-[#ff4d4d] p-3 text-center text-[10px] text-white">
                  DEMOTED TO {divAfter.name.toUpperCase()} — WIN IT BACK
                </div>
              )}
            </div>
          )}

          {!ranked && !tutorial && (
            <div className="text-[8px] txt-dim">friendly match — no LP on the line</div>
          )}
        </div>

        <div className="flex w-full max-w-sm flex-col gap-3">
          {!tutorial && (
            <button className="px-btn px-btn-teal w-full" onClick={onRematch}>REMATCH</button>
          )}
          <button className="px-btn px-btn-gold w-full" onClick={onContinue}>
            {tutorial ? 'ENTER THE LADDER ▶' : 'CONTINUE ▶'}
          </button>
        </div>
      </div>
    </div>
  );
}
