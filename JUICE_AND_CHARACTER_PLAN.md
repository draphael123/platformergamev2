# Blade Quest: Juice & Character Plan

A structured plan to make the game feel better (juice) and more memorable (character) so it stands out for players.

---

## What You Already Have (Keep Building On)

- **Juice:** Hit stop, screen shake, damage numbers, combos, slash trails, run dust, landing squash/stretch, jump stretch, parry slow-mo, victory flash, boss phase flash, speed lines, coin magnet, coyote time, jump buffer, wall slide/jump, dash, dodge roll.
- **Character:** Six heroes with stats and short bios, Lyra’s quote, realm names and boss lines, lore scrolls, level intros, “REALM CONQUERED” transition.
- **Feel:** Warm muted palette, parallax, surface footsteps, telegraphs, progress bar, cleared-realm checkmarks, pause menu.

---

## Pillar 1: More Juice (Game Feel)

Goal: Every input and outcome should feel satisfying and readable.

| Idea | What it is | Why it helps |
|------|------------|--------------|
| **Anticipation on heavy/special** | Short freeze or slight pull-back (2–4 frames) before Slow/Special hit frame | Makes big hits feel heavy and intentional. |
| **Hit flash on enemy** | Brief white/color flash on the sprite when hit (you have `enemy.hit`; lean into it) | Clear “I hit them” feedback. |
| **Stronger kill feedback** | Extra particles + small screen shake + optional “DEFEATED” pop on last enemy in a group | Rewards clearing a room. |
| **Charge attack wind-up** | Visual (e.g. glow or line growing) while holding Z for charge | Communicates charge without reading the HUD. |
| **Dodge / dash “whoosh”** | Short trail or blur frames behind the player during dodge/dash | Reinforces speed and invincibility. |
| **Landing “thud”** | Slightly heavier land sound for big drops (you have `playLand(impactVy)`; tune by impact) | Big drops feel weighty. |
| **Boss phase change** | Clear moment: brief pause, different color flash, maybe one bar of different music or a sting | Boss fights feel like distinct acts. |
| **Collectible “pop”** | Coin/scroll/heart: scale up then settle + small burst of particles (you already have some; make it consistent) | Every pickup feels rewarding. |
| **Low HP pulse** | Heart bar or screen edge pulse when HP is critical (you have low-HP stroke; add subtle screen tint or heartbeat) | Tension without being annoying. |
| **Perfect dodge** | If player dodges through a hitbox, brief slow-mo + “NARROW!” or “CLOSE!” text | Rewards skill and adds a moment of character. |

---

## Pillar 2: Character (Personality & Identity)

Goal: The game should feel like *Blade Quest*, not “generic platformer.”

| Idea | What it is | Why it helps |
|------|------------|--------------|
| **Hero one-liners** | Short line per hero on level start, death, or boss kill (e.g. Knight: “For the realm.” Lyra: “That’s what you get.”) | Makes heroes feel like people. |
| **Contextual death lines** | Rotate death screen text: “You fell.” “The realm claims another.” “Not this time.” + hero-specific line | Reduces repetition, adds tone. |
| **Boss personality** | 1–2 extra lines per boss (taunt when player enters, or on phase 2) shown as floating text | Bosses feel like characters. |
| **Realm “vibe” text** | 2–3 possible intro lines per realm (e.g. Forest: “The trees watch.” / “Something stirs ahead.”) | Levels feel distinct. |
| **Lore that connects** | A few scrolls that reference the Blight, the fallen realms, or the chosen blade so the world feels consistent | Builds a tiny narrative. |
| **Title screen tagline** | Replace or add to “CHRONICLES OF THE FALLEN REALMS” with a punchy line (e.g. “Ten realms. One blade.”) | Sets tone in 5 seconds. |
| **Victory personality** | Different victory line or pose per hero (e.g. Berserker: “Again!” Paladin: “The light endures.”) | Replayability and identity. |
| **Character select flair** | On hover/select: show quote or a second line of personality, not just stats | Picking a hero feels meaningful. |

---

## Pillar 3: Variety & Surprise

Goal: Same actions feel fresh across realms and runs.

| Idea | What it is | Why it helps |
|------|------------|--------------|
| **Realm-specific hazard tweaks** | Per hazard type: different damage, speed, or pattern (e.g. ice slows, lava adds burn DoT) | Each realm has a distinct “rule.” |
| **One unique mechanic per realm** | e.g. Forest: hidden platforms. Caves: crystals that reflect. Volcanic: geysers. (Start with 1–2 realms.) | Levels are memorable. |
| **Boss phase 2 behavior** | Each boss gets a second phase: new attack, faster, or different pattern (you have phaseTriggered; extend it) | Boss fights feel like climaxes. |
| **Randomized intro/outro** | Pick randomly from 2–3 intros per level and 2–3 “realm conquered” lines | Less repetition. |
| **Enemy variety per realm** | Slightly different stats or behavior per level (e.g. Caves: more ranged; Marsh: poison) | Combat stays interesting. |
| **Secret or bonus** | One optional “challenge” per realm (e.g. “No damage,” “Under 60s”) with a small reward or line | Gives experts a goal. |

---

## Pillar 4: Audio & Visual Identity

Goal: Recognizable look and sound.

| Idea | What it is | Why it helps |
|------|------------|--------------|
| **Signature hit sound** | One memorable hit sound (pitch/timbre) used for all melee, with variation by attack type | “That’s the Blade Quest hit.” |
| **Hero-specific strike** | Slight pitch or filter difference per hero when attacking | Reinforces who you’re playing. |
| **Realm motif** | Short 2–4 note motif per realm in the music (melody or bass) so each level has a hook | Music supports the world. |
| **UI sound identity** | Consistent style for menu select, confirm, cancel (e.g. soft click vs. sword clink) | Menus feel part of the game. |
| **Critical hit “sting”** | Distinct sound + maybe a different damage number color/shape for crits | Crits feel like events. |
| **One strong visual motif** | e.g. a recurring shape (blade, crest) in HUD, title, or transitions | Cohesive brand. |

---

## Suggested Phases

**Phase 1 – Quick wins (1–2 sessions)**  
- Hero one-liners (level start + death).  
- 2–3 death screen lines (rotating).  
- Charge attack wind-up (glow or line).  
- Hit flash on enemy (stronger use of `enemy.hit`).  
- Low HP pulse (bar or subtle screen).

**Phase 2 – Character & clarity**  
- Boss 1–2 extra lines (taunt / phase).  
- 2–3 intro lines per realm (random pick).  
- Title tagline + character select quote on hover.  
- Lore scrolls that reference the Blight/chosen blade.

**Phase 3 – Juice depth**  
- Anticipation on heavy/special.  
- Perfect dodge “NARROW!” + brief slow-mo.  
- Stronger kill feedback (last enemy in group).  
- Collectible “pop” (unify coin/scroll/heart).

**Phase 4 – Variety & identity**  
- Boss phase 2 (one new attack or pattern per boss).  
- One realm-specific mechanic (e.g. Forest + Caves).  
- Realm motif in music.  
- Signature hit sound + hero variant.

---

## Metrics of Success

- **Juice:** “Every hit and dodge feels good.” (Playtest: do people notice hit stop, charge, and dodge?)  
- **Character:** “I remember the Knight’s line” / “That boss felt different.” (Playtest: quote one line or one boss.)  
- **Variety:** “Level 3 felt different from Level 1.” (Playtest: describe each realm in one word.)  

Start with Phase 1; ship one pillar at a time so the game stays stable while gaining more character and juice.
