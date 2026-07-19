# ⚽ GOLAZO DECK

**A portrait, pixel-art football game where every card you collect is a physics modifier.**
Flick real shots through tense match moments — the player cards you pull from packs and
train literally bend how the ball moves.

## Play it

Static HTML5 — no build step, no dependencies.

- **Phone (recommended):** host the repo with GitHub Pages (Settings → Pages → deploy from
  branch) and open the URL on your phone. Add to home screen for fullscreen.
- **Local:** `python3 -m http.server` in the repo root, then open `http://localhost:8000`.

Progress saves automatically to your device (localStorage).

## The game

> Golazo Deck is a portrait-mode pixel-art football game where the player flick-shoots
> through 5 key moments per match, while the cards they collect and upgrade physically
> change ball flight, slow-motion, curl and glove reach.

### How a match works

Every match is **5 moments** — open play, free kicks, volleys, 1-on-1s, penalties, and
**defend moments** where you dive as the keeper. Before each moment you pick which card
takes it (stamina forces rotation — your star can't take everything).

### Shooting (the core flick)

- **Pull back from the ball and release** — direction and power in one gesture.
- The **spread ring is honest**: more power = bigger spread; higher ACC = tighter.
- **Swipe during slow-mo flight to curl** the ball. CUR raises your curl cap, COM extends
  the slow-mo window.
- Free-kick walls **jump** — a low daisy-cutter can sneak underneath.
- In 1-on-1s the keeper rushes out: shoot early (more open goal, less accuracy) or late
  (closer, but he smothers you).

### Defending

Drag your gloves to cover the blinking **X** before the shot arrives. GK stats are the
physics: REF = how early you see the marker, DIV = glove speed, HAN = catch radius.

### Cards, packs, training

- Fixed **96-player roster** to collect (Common → Rare → Epic → Icon).
- Duplicates convert to **training cones**; training levels a card and lets you pick a
  **focus stat** (+3) — build the shooter you want.
- **Traits are mechanics, not text**: CHIP lets you tap mid-flight to dink the keeper,
  TRIVELA raises the curl cap, KNUCKLE makes keepers misread you, SPIDER grows your gloves…

### The climb

Division 5 → Division 1 → Legend League. Higher divisions mean faster keepers, tighter
reaction windows, curling opponent shots and night floodlit stadiums.

## Tech

- Pure canvas at 216×384 internal resolution, nearest-neighbour scaled — all art is
  authored pixel maps and a 3×5 bitmap font, one fixed palette.
- WebAudio synth SFX + crowd ambience + chiptune menu loop (no audio files).
- `js/core.js` engine · `js/art.js` sprites/stadium · `js/data.js` roster/economy/save ·
  `js/match.js` gameplay · `js/ui.js` menus · `js/audio.js` sound.
