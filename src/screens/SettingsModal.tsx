import type { Settings } from '@/game/save';
import { audio } from '@/game/audio';

interface Props {
  settings: Settings;
  inMatch: boolean;
  onChange: (s: Settings) => void;
  onClose: () => void;
  onForfeit?: () => void;
}

export function SettingsModal({ settings, inMatch, onChange, onClose, onForfeit }: Props) {
  const set = <K extends keyof Settings>(k: K, v: Settings[K]) => {
    const next = { ...settings, [k]: v };
    onChange(next);
    audio.applySettings({ master: next.master, music: next.music, sfx: next.sfx, muted: next.muted });
  };

  const slider = (label: string, key: 'master' | 'music' | 'sfx') => (
    <label className="flex flex-col gap-2">
      <span className="text-[8px] txt-dim">{label}</span>
      <input
        type="range"
        min={0}
        max={100}
        value={Math.round(settings[key] * 100)}
        className="px-range w-full"
        onChange={(e) => set(key, Number(e.target.value) / 100)}
      />
    </label>
  );

  const toggle = (label: string, key: 'muted' | 'haptics' | 'reducedShake') => (
    <button className="flex items-center justify-between gap-3" onClick={() => set(key, !settings[key])}>
      <span className="text-[8px]">{label}</span>
      <span className={`px-toggle ${settings[key] ? 'on' : ''}`} />
    </button>
  );

  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/70 p-5" onClick={onClose}>
      <div className="px-panel anim-pop w-full max-w-xs p-5" onClick={(e) => e.stopPropagation()}>
        <h3 className="px-title mb-5 text-center text-[12px]">SETTINGS</h3>
        <div className="flex flex-col gap-4">
          {slider('MASTER VOLUME', 'master')}
          {slider('MUSIC', 'music')}
          {slider('SOUND FX + CROWD', 'sfx')}
          <div className="my-1 h-1 bg-[#3b4f7a]" />
          {toggle('MUTE ALL', 'muted')}
          {toggle('HAPTICS (VIBRATION)', 'haptics')}
          {toggle('REDUCE SCREEN SHAKE', 'reducedShake')}
        </div>

        <div className="mt-6 flex flex-col gap-3">
          <button className="px-btn px-btn-teal w-full" onClick={onClose}>DONE</button>
          {inMatch && onForfeit && (
            <button className="px-btn px-btn-danger w-full text-[10px]" onClick={onForfeit}>
              FORFEIT MATCH
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
