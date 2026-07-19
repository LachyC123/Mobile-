import { useEffect, useState } from 'react';
import { CrowdBackdrop } from '@/components/CrowdBackdrop';
import { coreSprite, crestDataURL } from '@/game/sprites';
import { DIVISIONS, PLAYER_CLUB } from '@/game/constants';
import type { SaveData } from '@/game/save';
import { audio } from '@/game/audio';

interface Props {
  save: SaveData;
  onRanked: () => void;
  onQuickPlay: () => void;
  onTutorial: () => void;
  onSettings: () => void;
}

export function TitleScreen({ save, onRanked, onQuickPlay, onTutorial, onSettings }: Props) {
  const [coreUrl, setCoreUrl] = useState('');

  useEffect(() => {
    const cv = document.createElement('canvas');
    cv.width = 32;
    cv.height = 32;
    cv.getContext('2d')!.drawImage(coreSprite(), 0, 0, 32, 32);
    setCoreUrl(cv.toDataURL());
    audio.setMusic('menu');
  }, []);

  const div = DIVISIONS[save.rank.division];
  const crest = crestDataURL(PLAYER_CLUB, 4);

  return (
    <div className="relative flex h-full flex-col overflow-hidden">
      <CrowdBackdrop />
      <div className="crt-lines" />

      <div className="safe-top relative z-10 flex flex-1 flex-col items-center justify-between px-5 pb-6">
        <div className="flex w-full items-center justify-between">
          <div className="hud-chip anim-pop flex items-center gap-2">
            <img src={crest} alt="club crest" className="h-8 w-8" />
            <div>
              <div className="text-[8px] txt-dim">YOUR CLUB</div>
              <div className="text-[10px]">{save.clubName}</div>
            </div>
          </div>
          <button className="px-btn !p-3 text-[10px]" onClick={onSettings} aria-label="settings">⚙</button>
        </div>

        <div className="flex flex-col items-center">
          <div className="anim-float mb-2 flex items-end gap-3">
            {coreUrl && <img src={coreUrl} alt="the Core" className="mb-2 h-10 w-10" />}
            <h1 className="px-title text-center text-[34px] leading-none tracking-wider">RUSHLINE</h1>
          </div>
          <p className="px-shadow mt-3 text-center text-[9px] leading-relaxed text-[#e8f4e4]">
            A NEW SPORT. A REAL TACTICIAN.
          </p>
          <p className="mt-2 text-center text-[8px] leading-relaxed txt-dim">
            Carry the Core into the glowing row. First to 3.
          </p>
        </div>

        <div className="flex w-full max-w-xs flex-col gap-3">
          <button className="px-btn px-btn-gold w-full" onClick={onRanked}>
            ▶ RANKED MATCH
          </button>
          <button className="px-btn px-btn-teal w-full" onClick={onQuickPlay}>QUICK PLAY</button>
          <button className="px-btn w-full" onClick={onTutorial}>
            {save.tutorialDone ? 'REPLAY TUTORIAL' : 'HOW TO PLAY'}
          </button>

          <div className="px-panel mt-2 flex items-center justify-between px-4 py-3">
            <div className="flex items-center gap-2">
              <span className="inline-block h-5 w-5 border-2 border-black" style={{ background: div.color }} />
              <span className="text-[10px]">{div.name.toUpperCase()}</span>
              <span className="text-[9px] txt-dim">{save.rank.lp} LP</span>
            </div>
            <span className="text-[9px] txt-dim">
              {save.rank.wins}W · {save.rank.losses}L
            </span>
          </div>
        </div>

        <p className="text-[7px] txt-dim">v1.0 · season one · all rivals are league bots</p>
      </div>
    </div>
  );
}
