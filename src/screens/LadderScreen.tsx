import { CrowdBackdrop } from '@/components/CrowdBackdrop';
import { DIVISIONS, LP_WIN, LP_LOSS, LP_LOSS_ROOKIE } from '@/game/constants';
import { crestDataURL } from '@/game/sprites';
import type { SaveData } from '@/game/save';

interface Props {
  save: SaveData;
  onPlay: () => void;
  onBack: () => void;
}

export function LadderScreen({ save, onPlay, onBack }: Props) {
  const div = DIVISIONS[save.rank.division];
  const next = DIVISIONS[Math.min(save.rank.division + 1, DIVISIONS.length - 1)];
  const isTop = save.rank.division === DIVISIONS.length - 1;

  return (
    <div className="relative flex h-full flex-col overflow-hidden">
      <CrowdBackdrop />
      <div className="crt-lines" />

      <div className="safe-top relative z-10 flex flex-1 flex-col gap-4 overflow-y-auto px-5 pb-6">
        <div className="flex items-center justify-between">
          <button className="px-btn !px-3 !py-2 text-[10px]" onClick={onBack}>◀</button>
          <h2 className="px-title text-[14px]">RANKED LADDER</h2>
          <div className="w-10" />
        </div>

        {/* current division */}
        <div className="px-panel anim-pop flex flex-col items-center gap-3 p-5">
          <div
            className="div-shield border-4 border-black"
            style={{ background: div.color, boxShadow: 'inset 0 0 0 3px rgba(255,255,255,0.35), 0 6px 0 rgba(0,0,0,0.4)' }}
          >
            <span className="text-[26px] text-black/70" style={{ textShadow: '1px 1px 0 rgba(255,255,255,0.4)' }}>
              {div.icon}
            </span>
          </div>
          <div className="text-[13px]" style={{ color: div.color }}>{div.name.toUpperCase()} DIVISION</div>
          <div className="w-full">
            <div className="mb-1 flex justify-between text-[8px] txt-dim">
              <span>{save.rank.lp} LP</span>
              <span>{isTop ? 'TOP DIVISION' : `${next.name.toUpperCase()} AT 100`}</span>
            </div>
            <div className="px-meter">
              <div className="fill" style={{ width: `${save.rank.lp}%`, background: `repeating-linear-gradient(90deg, ${div.color} 0 8px, rgba(0,0,0,0.25) 8px 10px)` }} />
            </div>
          </div>
          <div className="flex gap-4 text-[9px]">
            <span className="text-[#7dff8a]">{save.rank.wins} WINS</span>
            <span className="text-[#ff8080]">{save.rank.losses} LOSSES</span>
            {save.rank.streak >= 2 && <span className="text-[#ffd23f]">▲ {save.rank.streak} STREAK</span>}
            {save.rank.streak <= -2 && <span className="text-[#ff8080]">▼ {Math.abs(save.rank.streak)} SKID</span>}
          </div>
        </div>

        {/* stakes */}
        <div className="px-panel-inset flex justify-around p-3 text-[8px]">
          <span className="text-[#7dff8a]">WIN +{LP_WIN} LP</span>
          <span className="text-[#ff8080]">LOSS {save.rank.division === 0 ? LP_LOSS_ROOKIE : LP_LOSS} LP</span>
        </div>

        {/* rival clubs */}
        <div className="px-panel p-4">
          <div className="mb-3 text-[9px] txt-dim">CLUBS IN THIS DIVISION</div>
          <div className="flex flex-col gap-3">
            {div.clubs.map((club) => (
              <div key={club.id} className="flex items-center gap-3">
                <img src={crestDataURL(club, 3)} alt={`${club.name} crest`} className="h-10 w-10" />
                <div>
                  <div className="text-[10px]">{club.name}</div>
                  <div className="text-[7px] txt-dim">
                    {div.botAP} AP · {div.noise >= 4 ? 'erratic' : div.noise >= 2 ? 'steady' : div.noise >= 1 ? 'sharp' : 'ruthless'}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <button className="px-btn px-btn-gold safe-bottom w-full" onClick={onPlay}>
          FIND MATCH ▶
        </button>
      </div>
    </div>
  );
}
