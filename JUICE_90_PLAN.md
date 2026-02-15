# Plan: Juice Score 70 → 90+

Target: **90+ / 100** by closing the four biggest gaps: **Audio**, **Motion**, **Boss/UI**, and **Time/Moment**.

All work is in **`src/Game.jsx`** unless noted.

---

## Current state (~70)

- Tier 1 done: hitstop, shake, camera look-ahead, HP ghost bar, landing dust, coin magnet + burst, squash/stretch.
- Extra polish: damage flash, vignette, floaters, tree sway, platform edges, combo glow.
- **Missing:** Audio (no footsteps/land/layered hits), coyote time & variable jump, boss bar animation, damage numbers, level title intro, time slow.

---

## Phase A: Audio (+8–10 points)

**Goal:** Every key action has sound; SFX feel varied and responsive.

### A1. Land sound
- **Where:** `MusicEngine` in Game.jsx (~264).
- **Add:** `playLand(impactStrength)`.
  - Use a short noise or `Tone.Synth` (e.g. triangle, volume -18, attack 0.01, decay 0.1).
  - Pitch: map `impactStrength` (e.g. 5–15) to a note or frequency (e.g. C3 + scale); higher impact = slightly lower pitch + louder.
  - Call from the **platform collision** block where you already spawn landing dust: `if (musicOn) g.music.playLand(impactVy);` (use the same `impactVy` used for dust threshold).

### A2. Footsteps
- **Where:** `MusicEngine`; call from game loop when moving on ground.
- **Add:** `playFootstep()` — short click or soft synth (noise burst or "16n" note, pitch 0.9–1.1 random).
- **Trigger:** When `p.grounded && Math.abs(p.vx) > 0.3` and `g.frame % 8 === 0` (or use a `stepTimer` that decrements and resets when stepping). Only play when the timer hits 0 so you get one step every N frames.

### A3. Pitch variation on existing SFX
- **Where:** `playJump`, `playHit`, `playCoin` in MusicEngine.
- **Change:** For each, compute a slight pitch multiplier, e.g. `0.96 + Math.random() * 0.08`, and pass it to the synth (e.g. `detune` in cents: `(mult - 1) * 100`, or use a different note from a small array). Prevents every jump/hit from sounding identical.

### A4. Layered hit sound
- **Where:** `playHit()`.
- **Add:** Trigger two layers: (1) current “slice” (high, short), (2) a second, lower “crunch” note (e.g. C4 or from scale) 20–40 ms later, slightly longer. Use two synths or one with two `triggerAttackRelease` calls. Gives a heavier, more satisfying hit.

---

## Phase B: Motion (+5–7 points)

**Goal:** Jump and movement feel more forgiving and expressive.

### B1. Coyote time
- **Where:** Game loop, **after** platform collision (where `p.grounded` is set).
- **Add:** `coyoteTimer` on player (frames left after leaving ledge).
  - When `p.grounded` is true: set `p.coyoteTimer = 8` (or 6–10).
  - When not grounded: each frame `if (p.coyoteTimer > 0) p.coyoteTimer--`.
  - In the **jump** condition: allow jump if `(p.jumpsLeft > 0) || (p.coyoteTimer > 0 && p.maxJumps > 0)`. When jumping on coyote, use `p.jumpsLeft = p.maxJumps - 1` (or 1 for single-jump chars) so you get one normal jump after leaving the ledge.

### B2. Variable jump height
- **Where:** Game loop, **physics** section (where `p.vy` is applied).
- **Add:** `jumpHeld` or track “jump key was released this frame.”
  - When jump is pressed and you apply `p.vy = p.jumpPower`, set `p.jumpHeld = true`.
  - When jump key is released (in keyup handler, store in `g.keys` or a ref), set `p.jumpHeld = false`.
  - In physics: if `!p.grounded && p.vy < 0 && !p.jumpHeld` (moving up and key released), multiply `p.vy` by a cut factor each frame, e.g. `p.vy *= 0.75` (or clamp upward vy to a lower value). So short tap = short hop, hold = full jump.

---

## Phase C: Boss bar + damage numbers + level title (+5–6 points)

**Goal:** Boss and UI feel as polished as player HP and combos.

### C1. Boss bar smooth drain + ghost
- **Where:** Same pattern as player HP. In `gameRef` add `bossDisplayedHp`, `bossGhostHp`. When boss is first damaged or when `g.bossActive` becomes true, init both to `boss.maxHealth` (or current health).
- **Each frame** (when boss is active and alive):  
  `g.bossDisplayedHp += (boss.health - g.bossDisplayedHp) * 0.12;`  
  `if (g.bossGhostHp < g.bossDisplayedHp) g.bossGhostHp = g.bossDisplayedHp;`  
  `g.bossGhostHp += (g.bossDisplayedHp - g.bossGhostHp) * 0.06;`
- **Draw:** In the boss HUD block, draw a dark red ghost bar (width from `bossGhostHp`), then the main red bar (width from `bossDisplayedHp`). Optionally: when boss takes damage this frame, add a small shake to the bar (e.g. add to `addShake(g, 2)` on sword hit to boss).

### C2. Floating damage numbers
- **Where:** New lightweight system: array `g.damageNumbers` of `{ x, y, value, life, vy }`. Spawn when player hits enemy/boss (and optionally when player is hit).
- **Spawn:** On enemy hit (where you do `enemy.health -= p.attack`): push `{ x: enemy.x + 16, y: enemy.y - 10, value: p.attack, life: 45, vy: -1.5 }`. On boss hit: same with `dmg`. World position so you draw with `x - camX`.
- **Update:** In the same place you update particles: for each entry, `y += vy; vy += 0.08; life--`; filter out when `life <= 0`.
- **Draw:** After particles (or in HUD section), for each entry with `life > 0`: draw text at `(x - camX, y)` with font size 14–18, color white or yellow, `ctx.globalAlpha = life / 45`. Optionally scale size by damage (e.g. boss hits slightly bigger).

### C3. Level title entrance
- **Where:** HUD section where you draw "Level N: LevelName".
- **Add:** A `levelTitleTimer` in gameRef, set to `120` (or 90) when the level starts (in `startGame` or first frame of game). Each frame decrement.
- **Draw:** Only draw the level title when `levelTitleTimer > 0`. Use `alpha = Math.min(1, (120 - levelTitleTimer) / 30)` for fade-in and optionally `scale = 0.8 + 0.2 * (1 - levelTitleTimer/120)` so it scales up slightly. Draw centered; optionally add a subtle drop shadow.

---

## Phase D: Time and moment (+2–3 points)

**Goal:** Big moments feel heavier.

### D1. Time scale on big hits
- **Where:** `gameRef` add `timeScale = 1`, `timeScaleTimer = 0`. In game loop (when not in hitstop), if `timeScaleTimer > 0`: decrement it and set `timeScale` toward 1 (e.g. `g.timeScale += (1 - g.timeScale) * 0.15`). When you want a slow-mo moment, set `g.timeScale = 0.4` and `g.timeScaleTimer = 12` (frames).
- **Apply:** Multiply movement deltas by `g.timeScale` where it matters: e.g. `p.x += p.vx * g.timeScale`, `p.y += p.vy * g.timeScale`, and same for enemies/boss/projectiles. Or only apply to player and camera for simplicity. When you apply hitstop, you already freeze; for a “soft” slow (e.g. boss phase at 50% HP), set `timeScale = 0.4` for ~0.5 s instead of full freeze.

### D2. Boss phase moment (optional)
- When boss health crosses below 50%: set `g.timeScale = 0.4`, `g.timeScaleTimer = 18`, `addShake(g, 8)`, and optionally set a one-off `g.bossPhaseFlash = 5`. Draw a full-screen white flash when `bossPhaseFlash > 0` (like damage flash), then decrement. Gives a clear “phase change” without new mechanics.

---

## Implementation order

1. **A1 + A2** — Land and footsteps (fast, high impact).
2. **B1 + B2** — Coyote time and variable jump (no new assets).
3. **C1** — Boss bar smooth + ghost (mirror existing HP logic).
4. **A3 + A4** — Pitch variation and layered hit (quick MusicEngine tweaks).
5. **C2** — Damage numbers (small new system).
6. **C3** — Level title entrance (timer + alpha/scale).
7. **D1** — Time scale (optional D2 for boss phase).

---

## Constants to add (top of Game.jsx)

```js
// Phase B
const COYOTE_FRAMES = 8;
const JUMP_CUT_MULT = 0.75;        // when jump released early

// Phase C
const BOSS_HP_DRAIN_RATE = 0.12;
const BOSS_GHOST_HP_RATE = 0.06;
const LEVEL_TITLE_DURATION = 120;

// Phase D
const TIME_SCALE_SLOW = 0.4;
const TIME_SCALE_DURATION = 18;
```

---

## Success criteria (90+)

- **Audio:** Land and footsteps in place; hit has two layers; jump/hit/coin have pitch variation.
- **Motion:** Coyote time and variable jump height both working.
- **Boss/UI:** Boss bar drains smoothly with ghost; damage numbers appear on hit; level title has a short entrance.
- **Moment:** Optional time slow on boss phase or big hit.

After this, reassess: you should be in the **90–92** range. The last 5–8 points would come from Tier 4 (chromatic aberration, orb glow, musical coin sequence, etc.) if you want to push further.
