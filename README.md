# RUSHLINE — Pixel Tactical Sports

A mobile-first, turn-based tactical sports game. Carry the **Core** into the
glowing goal row, first to 3 goals. Every pixel, sprite, and sound is generated
in code — no asset files.

Built with React 19 + TypeScript + Vite. The match itself runs on a raw
`<canvas>` with a deterministic, presentation-free rules engine underneath.

## How to play

- **Move** — tap an athlete, then a glowing tile. Rushers run 3 tiles, everyone else 2.
- **Pass** — the carrier can zip the Core in straight lines (rows, columns, diagonals). A rival standing *next to* the lane steals it — lanes are drawn gold (safe) or red (risky). The Captain's threaded passes can never be intercepted.
- **Shove** — Guards knock adjacent rivals back a tile; a shoved carrier drops the Core.
- **Flow** — caught passes and shoves fill the meter; a full meter arms a **Surge**: 5 AP next play instead of 4.
- **Clock** — 12 plays per team. Tied at the end? Golden goal.

Climb six ranked divisions (Rookie → Diamond) against progressively sharper league bots.

## Run it

```bash
npm install
npm run dev      # dev server on :3000
npm test         # rules-engine unit tests (vitest)
npm run lint     # eslint
npm run build    # typecheck + production build
```

## Architecture

```
src/game/
  rules.ts            pure rules engine — all legality + resolution, zero DOM
  types.ts            state + the GameEvent stream (rules → presentation)
  constants.ts        every tuning number in one place
  ai.ts               utility-scoring bot, difficulty via division profiles
  matchController.ts  game loop: state → events → animation/vfx/audio → input
  renderer.ts         canvas renderer (cached stadium layer + dynamic passes)
  sprites.ts          pixel-art foundry (athletes, crests, ball — all authored in code)
  vfx.ts              pooled particles, banners, shake, hit-stop
  audio.ts            synthesized chiptune + SFX + crowd (Web Audio, no files)
  save.ts             versioned localStorage save
  tutorial.ts         Coach Pip's scripted lesson
  rules.test.ts       vitest suite for the engine
src/screens/          React shell: title, ladder, loading, match HUD, results
```

The rules engine emits `GameEvent`s as the only channel to the presentation
layer, and all randomness flows through a seeded RNG — matches are fully
deterministic and testable.

## Changelog — improvements over the original build

**Bug fixes**
1. Ranked LP was applied inside a React `setState` updater — under StrictMode
   the updater double-runs, silently doubling every LP gain/loss, and the
   result screen could read the delta before it existed. Rank math now runs
   exactly once, outside React state.
2. During a Flow Surge play the HUD showed 4 AP pips for 5 AP — the pip count
   now tracks the AP granted at play start.
3. The "reduce screen shake" setting existed but was never wired to the VFX
   system — it now actually reduces shake.
4. Audio (including the crowd-noise bed) kept playing when the tab was
   hidden — the AudioContext now suspends/resumes on visibility change.
5. Removed template leftovers that shipped in the build: unused router +
   demo page, a dev-only inspection plugin in the production Vite config,
   and dead code paths in the engine.

**Gameplay & UX improvements**
1. **Pass-lane visualization** — selecting a carrier now draws every lane on
   the pitch: gold dots for safe passes, pulsing red for interceptable ones,
   with a bracket on the receiver. Interceptions stop feeling like ambushes.
2. **Undo** — one-level undo of your last action (button or `U`), disabled
   once the action revealed hidden information (turnover, loose-ball bounce,
   goal) so it can't be abused.
3. **Match stats** — passes, steals, and shoves are tallied per side and shown
   on the results screen.
4. **Win-streak bonus** — 3+ consecutive ranked wins pay +6 bonus LP, called
   out on the results screen. Losing streaks still sting.
5. **Smarter bots** — the AI now respects adjacent enemy Guards when carrying
   (shove threat), prefers knocking carriers backward, avoids popping the
   Core loose on the rival goal line, and looks for pass-then-score setups.
6. **Golden-goal ceremony** — sudden death opens with a proper banner, flash,
   and crowd swell; the final regulation play is announced too.
7. **Keyboard support** — Space/Enter ends the play, Esc deselects, U undoes.
8. **Self-hosted pixel font** — Press Start 2P is bundled via Fontsource
   instead of Google Fonts CDN: no network dependency, no flash of wrong font
   in the canvas.
9. **Rules-engine test suite** — 15 vitest cases covering movement, passing,
   interception geometry, threaded passes, shoves, scoring, kickoffs, Flow
   surges, the play clock, and sudden death.
10. **Project hygiene** — real package name/version, `npm test` script, and
    this README.
