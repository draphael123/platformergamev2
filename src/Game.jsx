import { useState, useEffect, useRef, useCallback } from "react";
import * as Tone from "tone";

// ============================================================
// CONSTANTS & CONFIG
// ============================================================
const GRAVITY = 0.6;
const FRICTION = 0.85;
const TILE = 40;
const CANVAS_W = 960;
const CANVAS_H = 540;

// Juice / game feel
const HITSTOP_ENEMY = 4;
const HITSTOP_BOSS = 6;
const LAND_DUST_VY_THRESHOLD = 5;
const COIN_MAGNET_RANGE = 80;
const COIN_COLLECT_RANGE = 24;
const COIN_MAGNET_SPEED = 3;
const CAMERA_LOOKAHEAD = 50;
const CAMERA_LERP = 0.07;
const HP_DRAIN_RATE = 0.15;
const GHOST_HP_RATE = 0.08;
const SHAKE_DECAY = 0.92;
const SHAKE_MAX_OFFSET = 12;

// Juice 90+ plan
const COYOTE_FRAMES = 8;
const JUMP_CUT_MULT = 0.75;
const BOSS_HP_DRAIN_RATE = 0.12;
const BOSS_GHOST_HP_RATE = 0.06;
const LEVEL_TITLE_DURATION = 120;
const TIME_SCALE_SLOW = 0.4;
const TIME_SCALE_DURATION = 18;

// Extra juice
const RUN_DUST_INTERVAL = 5;
const CRITICAL_HIT_CHANCE = 0.15;
const CRITICAL_HITSTOP_EXTRA = 2;
const SLASH_TRAIL_LENGTH = 6;
const SLASH_TRAIL_DECAY = 0.22;
const SPEED_LINE_VX_THRESHOLD = 3.5;
const VICTORY_FLASH_FRAMES = 12;
const DEATH_SHAKE_EXTRA = 8;
const DEATH_PARTICLES_EXTRA = 25;
const DODGE_ROLL_FRAMES = 18;
const DODGE_ROLL_SPEED = 6.5;
const DODGE_ROLL_COOLDOWN = 50;
const CHARGE_ATTACK_FRAMES = 20;
const CHARGE_DAMAGE_MULT = 1.8;
const PLATFORM_BOUNCE_VY = -5;
const LOW_HP_THRESHOLD = 0.25;
const PARRY_SLOWMO_FRAMES = 25;
const PARRY_SLOWMO_SCALE = 0.35;

// Shantae-style feel
const AIR_CONTROL = 0.82;
const DASH_SPEED = 11;
const DASH_FRAMES = 10;
const DASH_COOLDOWN = 22;
const JUMP_BUFFER_FRAMES = 8;
const WALL_SLIDE_SPEED = 0.8;
const WALL_JUMP_VX = 7;
const WALL_JUMP_VY = -10.5;
const WALL_GRAB_MARGIN = 6;
const TELEGRAPH_FRAMES = 25;
const UNLOCK_DOUBLE_JUMP_AFTER_LEVEL = 1;

// Attack types: 0 = fast, 1 = slow, 2 = special (cooldown)
const ATTACK_TYPES = [
  { id: 0, name: "Fast", duration: 10, hitFrame: 7, cooldown: 12, dmgMult: 0.7, swordW: 28 },
  { id: 1, name: "Slow", duration: 26, hitFrame: 20, cooldown: 36, dmgMult: 1.5, swordW: 42 },
  { id: 2, name: "Special", duration: 18, hitFrame: 12, cooldown: 0, specialCooldownMax: 180, dmgMult: 2, swordW: 38 },
];

const CHARACTERS = [
  { id: 0, name: "Knight", color: "#4A90D9", accent: "#FFD700", speed: 4, jump: -12, health: 100, attack: 15, desc: "Balanced warrior", icon: "⚔️" },
  { id: 1, name: "Rogue", color: "#8B45A6", accent: "#00FF88", speed: 6, jump: -11, health: 70, attack: 12, desc: "Swift & deadly", icon: "🗡️" },
  {
    id: 2,
    name: "Lyra",
    title: "the Starweaver",
    color: "#2ECFCF",
    accent: "#FF6B9D",
    speed: 3.5,
    jump: -11.5,
    health: 75,
    attack: 20,
    desc: "Chaos mage. Book-smart, battle-crazy. Fires first, asks questions never.",
    quote: "\"If it's not on fire, I'm not trying hard enough.\"",
    personality: "Sarcastic, curious, and utterly convinced that every problem is just a spell away from being someone else's problem. Collects rare teas and enemy tears.",
    icon: "🔮",
  },
  { id: 3, name: "Berserker", color: "#E74C3C", accent: "#FF8C00", speed: 3, jump: -10.5, health: 120, attack: 25, desc: "Raw strength", icon: "🪓" },
  { id: 4, name: "Ranger", color: "#27AE60", accent: "#F1C40F", speed: 5, jump: -13, health: 80, attack: 13, desc: "Double jump", icon: "🏹" },
  { id: 5, name: "Paladin", color: "#F39C12", accent: "#ECF0F1", speed: 3.5, jump: -11, health: 140, attack: 18, desc: "Holy shield", icon: "🛡️" },
];

const LEVELS = [
  { id: 0, name: "Enchanted Forest", bg1: "#0a1628", bg2: "#1a3a2a", bg3: "#2d5a3d", platform: "#3E7B4E", accent: "#7CFC00", hazard: "thorns", bossName: "Treant King", bossColor: "#2E7D32", bossLine: "The Treant King blocks your path!" },
  { id: 1, name: "Crystal Caves", bg1: "#0d0d2b", bg2: "#1a1a4e", bg3: "#2d2d6b", platform: "#5C6BC0", accent: "#E040FB", hazard: "crystals", bossName: "Crystal Golem", bossColor: "#7E57C2", bossLine: "The Crystal Golem awakens!" },
  { id: 2, name: "Volcanic Wastes", bg1: "#1a0a00", bg2: "#3d1a00", bg3: "#5a2d0a", platform: "#8D6E63", accent: "#FF5722", hazard: "lava", bossName: "Magma Wyrm", bossColor: "#D84315", bossLine: "The Magma Wyrm rises from the flames!" },
  { id: 3, name: "Frozen Peaks", bg1: "#0a1a2e", bg2: "#1a3a5e", bg3: "#3a6a8e", platform: "#B0BEC5", accent: "#00BCD4", hazard: "ice", bossName: "Frost Giant", bossColor: "#0097A7", bossLine: "The Frost Giant stirs!" },
  { id: 4, name: "Ancient Ruins", bg1: "#1a1a0a", bg2: "#3d3a1a", bg3: "#5a5a3d", platform: "#A1887F", accent: "#FFD54F", hazard: "traps", bossName: "Stone Guardian", bossColor: "#795548", bossLine: "The Stone Guardian awakens!" },
  { id: 5, name: "Shadow Marsh", bg1: "#0a0a1a", bg2: "#1a1a2d", bg3: "#2d2d3a", platform: "#546E7A", accent: "#76FF03", hazard: "poison", bossName: "Swamp Hydra", bossColor: "#37474F", bossLine: "The Swamp Hydra emerges!" },
  { id: 6, name: "Sky Citadel", bg1: "#1a2a4e", bg2: "#3a5a8e", bg3: "#5a8abe", platform: "#90CAF9", accent: "#FFF176", hazard: "wind", bossName: "Storm Lord", bossColor: "#1565C0", bossLine: "The Storm Lord commands the skies!" },
  { id: 7, name: "Desert Temple", bg1: "#2a1a0a", bg2: "#5a3a1a", bg3: "#8a6a3a", platform: "#D4A056", accent: "#FF7043", hazard: "sand", bossName: "Pharaoh Lich", bossColor: "#BF8C3E", bossLine: "The Pharaoh Lich defies death!" },
  { id: 8, name: "Abyssal Depths", bg1: "#000a1a", bg2: "#001a3a", bg3: "#002a4a", platform: "#37474F", accent: "#18FFFF", hazard: "water", bossName: "Leviathan", bossColor: "#00695C", bossLine: "The Leviathan hungers!" },
  { id: 9, name: "Dragon's Keep", bg1: "#1a0000", bg2: "#3d0a0a", bg3: "#5a1a1a", platform: "#4E342E", accent: "#FF1744", hazard: "fire", bossName: "Elder Dragon", bossColor: "#B71C1C", bossLine: "The Elder Dragon awaits!" },
];

const LEVEL_INTRO_LINES = [
  "The forest holds many secrets...",
  "Crystals hum with ancient power.",
  "Only the bold dare tread here.",
  "Cold winds bite deep.",
  "Ruins remember the old wars.",
  "The marsh breathes poison.",
  "The sky citadel looms.",
  "Sands hide more than treasure.",
  "The depths swallow the light.",
  "The final trial begins.",
];

// ============================================================
// LEVEL GENERATION
// ============================================================
function generateLevel(levelId) {
  const lvl = LEVELS[levelId];
  const platforms = [];
  const enemies = [];
  const hazards = [];
  const coins = [];
  const hearts = [];
  const width = 4800 + levelId * 400;

  // Ground
  for (let x = 0; x < width; x += TILE) {
    if (Math.random() > 0.06 || x < 200 || x > width - 400) {
      platforms.push({ x, y: CANVAS_H - TILE, w: TILE, h: TILE, type: "ground" });
    }
  }

  // Floating platforms
  const seed = levelId * 137;
  for (let i = 0; i < 30 + levelId * 5; i++) {
    const px = 300 + ((seed + i * 173) % (width - 600));
    const py = 160 + ((seed + i * 91) % 280);
    const pw = TILE * (2 + (i % 3));
    platforms.push({ x: px, y: py, w: pw, h: TILE / 2, type: "float" });
  }

  // Moving platforms
  for (let i = 0; i < 5 + levelId; i++) {
    const px = 500 + ((seed + i * 211) % (width - 800));
    const py = 200 + ((seed + i * 67) % 240);
    platforms.push({ x: px, y: py, w: TILE * 3, h: TILE / 2, type: "moving", originX: px, moveRange: 120, moveSpeed: 0.5 + (i % 3) * 0.3 });
  }

  // Enemies (fewer)
  const enemyCount = 4 + levelId;
  for (let i = 0; i < enemyCount; i++) {
    const ex = 400 + ((seed + i * 197) % (width - 800));
    enemies.push({
      x: ex, y: CANVAS_H - TILE - 36, w: 32, h: 36,
      vx: (i % 2 === 0 ? 1 : -1) * (1 + levelId * 0.15),
      health: 20 + levelId * 5,
      maxHealth: 20 + levelId * 5,
      type: i % 4 === 0 ? "archer" : i % 5 === 0 ? "flyer" : "walker",
      alive: true, hit: 0, facing: 1, attackTimer: 0,
      originY: CANVAS_H - TILE - 36,
    });
  }

  // Ground hazards (more, varied width)
  for (let i = 0; i < 12 + levelId * 3; i++) {
    const hx = 400 + ((seed + i * 157) % (width - 700));
    const hw = (i % 3 === 0 ? TILE * 3 : TILE * 2);
    hazards.push({
      x: hx, y: CANVAS_H - TILE - 12, w: hw, h: 12,
      type: lvl.hazard, damage: 8 + levelId * 2, timer: 0,
    });
  }

  // Ceiling spikes (environmental)
  for (let i = 0; i < 6 + levelId; i++) {
    const cx = 350 + ((seed + i * 211 + 100) % (width - 700));
    hazards.push({
      x: cx, y: 0, w: TILE * 2, h: 52,
      shape: "ceiling", type: lvl.hazard, damage: 10 + levelId * 2, timer: 0,
    });
  }

  // Moving hazards (patrol)
  for (let i = 0; i < 4 + levelId; i++) {
    const mx = 600 + ((seed + i * 263) % (width - 1000));
    const mw = TILE * 2;
    hazards.push({
      x: mx, y: CANVAS_H - TILE - 12, w: mw, h: 12,
      type: lvl.hazard, damage: 8 + levelId * 2, timer: 0,
      originX: mx, moveRange: 80 + (i % 3) * 40, moveSpeed: 0.4 + (i % 4) * 0.2,
    });
  }

  // Lore scrolls
  const LORE_TEXTS = [
    "The realms fell one by one to the Blight.",
    "Only the chosen blade can restore the balance.",
    "Crystals here remember the old kings.",
    "Fire and ice have met in this place before.",
    "These ruins hold more than bones.",
    "The marsh does not forgive the careless.",
    "The citadel was built on sacrifice.",
    "Gold and sand hide the same thirst.",
    "The deep has no memory of the sun.",
    "The dragon remembers when the world was young.",
  ];
  const scrolls = [];
  for (let i = 0; i < 3 + Math.min(levelId, 4); i++) {
    const sx = 500 + ((seed + i * 311) % (width - 1000));
    const sy = 80 + ((seed + i * 127) % 300);
    scrolls.push({
      x: sx, y: sy, w: 24, h: 32,
      text: LORE_TEXTS[(levelId * 2 + i) % LORE_TEXTS.length],
      collected: false,
    });
  }

  // Coins
  for (let i = 0; i < 40 + levelId * 5; i++) {
    const cx = 200 + ((seed + i * 113) % (width - 400));
    const cy = 100 + ((seed + i * 79) % 360);
    coins.push({ x: cx, y: cy, collected: false, bobOffset: Math.random() * Math.PI * 2 });
  }

  // Healing items (hearts)
  const heartCount = 8 + levelId * 2;
  for (let i = 0; i < heartCount; i++) {
    const hx = 350 + ((seed + i * 241) % (width - 650));
    const hy = 120 + ((seed + i * 89) % 320);
    hearts.push({
      x: hx, y: hy, collected: false, bobOffset: Math.random() * Math.PI * 2,
      healAmount: 20 + levelId * 4,
    });
  }

  // Boss area at end
  const bossX = width - 350;
  platforms.push({ x: bossX - 200, y: CANVAS_H - TILE, w: 600, h: TILE, type: "ground" });
  platforms.push({ x: bossX - 100, y: 300, w: TILE * 4, h: TILE / 2, type: "float" });
  platforms.push({ x: bossX + 100, y: 200, w: TILE * 3, h: TILE / 2, type: "float" });

  const boss = {
    x: bossX, y: CANVAS_H - TILE - 80,
    w: 64 + levelId * 4, h: 80 + levelId * 4,
    health: 150 + levelId * 50,
    maxHealth: 150 + levelId * 50,
    phase: 0, alive: true, phaseTriggered: false,
    attackTimer: 0, pattern: 0,
    vx: 0, vy: 0, facing: -1, hit: 0,
    name: lvl.bossName, color: lvl.bossColor,
    projectiles: [],
    telegraphTimer: 0,
  };

  return { platforms, enemies, hazards, coins, hearts, scrolls, boss, width, levelId };
}

// ============================================================
// MUSIC ENGINE
// ============================================================
class MusicEngine {
  constructor() {
    this.playing = false;
    this.synths = [];
    this.loops = [];
    this.currentLevel = -1;
  }

  async start(levelId) {
    if (this.currentLevel === levelId && this.playing) return;
    this.stop();
    this.currentLevel = levelId;

    try {
      await Tone.start();
      Tone.getTransport().bpm.value = 70 + levelId * 3;

      const reverb = new Tone.Reverb({ decay: 4, wet: 0.5 }).toDestination();
      const delay = new Tone.FeedbackDelay({ delayTime: "8n", feedback: 0.2, wet: 0.15 }).connect(reverb);

      const scales = [
        ["C3", "D3", "E3", "G3", "A3", "C4", "D4", "E4"],
        ["C3", "Eb3", "F3", "G3", "Bb3", "C4", "Eb4", "F4"],
        ["D3", "F3", "G3", "A3", "Bb3", "D4", "F4", "G4"],
        ["A2", "B2", "D3", "E3", "F#3", "A3", "B3", "D4"],
        ["E3", "F#3", "G#3", "A3", "B3", "C#4", "E4", "F#4"],
        ["C3", "Db3", "E3", "F3", "Ab3", "Bb3", "C4", "E4"],
        ["G3", "A3", "B3", "C4", "D4", "E4", "F#4", "G4"],
        ["D3", "E3", "F3", "A3", "Bb3", "C4", "D4", "F4"],
        ["C3", "D3", "Eb3", "G3", "Ab3", "Bb3", "C4", "Eb4"],
        ["D3", "E3", "F#3", "G3", "A3", "B3", "C#4", "D4"],
      ];

      const scale = scales[levelId] || scales[0];

      const pad = new Tone.PolySynth(Tone.FMSynth, {
        volume: -18, harmonicity: 2, modulationIndex: 1.5,
        envelope: { attack: 2, decay: 1, sustain: 0.8, release: 3 },
        modulation: { type: "sine" },
      }).connect(reverb);
      this.synths.push(pad);

      const padLoop = new Tone.Loop((time) => {
        const note = scale[Math.floor(Math.random() * 3)];
        pad.triggerAttackRelease(note, "2n", time);
      }, "1m");
      padLoop.start(0);
      this.loops.push(padLoop);

      const melody = new Tone.Synth({
        volume: -14,
        oscillator: { type: levelId > 6 ? "sawtooth" : "triangle" },
        envelope: { attack: 0.1, decay: 0.3, sustain: 0.4, release: 1.5 },
      }).connect(delay);
      this.synths.push(melody);

      let noteIdx = 0;
      const melodyLoop = new Tone.Loop((time) => {
        if (Math.random() > 0.35) {
          const note = scale[noteIdx % scale.length];
          melody.triggerAttackRelease(note, Math.random() > 0.5 ? "4n" : "8n", time);
        }
        noteIdx = (noteIdx + 1 + Math.floor(Math.random() * 3)) % scale.length;
      }, "4n");
      melodyLoop.start(0);
      this.loops.push(melodyLoop);

      const bass = new Tone.MonoSynth({
        volume: -16, oscillator: { type: "square" },
        envelope: { attack: 0.05, decay: 0.3, sustain: 0.5, release: 0.8 },
        filterEnvelope: { attack: 0.05, decay: 0.2, sustain: 0.3, release: 0.5, baseFrequency: 100, octaves: 2 },
      }).connect(reverb);
      this.synths.push(bass);

      const bassLoop = new Tone.Loop((time) => {
        const note = scale[Math.floor(Math.random() * 2)];
        const lowNote = note.replace(/\d/, (d) => Math.max(1, parseInt(d) - 1));
        bass.triggerAttackRelease(lowNote, "2n", time);
      }, "1m");
      bassLoop.start(0);
      this.loops.push(bassLoop);

      if (levelId >= 5) {
        const kick = new Tone.MembraneSynth({ volume: -20, pitchDecay: 0.05, octaves: 4 }).connect(reverb);
        this.synths.push(kick);
        const kickLoop = new Tone.Loop((time) => {
          kick.triggerAttackRelease("C1", "8n", time);
        }, "2n");
        kickLoop.start(0);
        this.loops.push(kickLoop);
      }

      const arp = new Tone.Synth({
        volume: -22, oscillator: { type: "sine" },
        envelope: { attack: 0.01, decay: 0.1, sustain: 0.1, release: 0.5 },
      }).connect(delay);
      this.synths.push(arp);

      let arpIdx = 0;
      const arpLoop = new Tone.Loop((time) => {
        if (Math.random() > 0.5) {
          const note = scale[(arpIdx * 2) % scale.length];
          const highNote = note.replace(/\d/, (d) => parseInt(d) + 1);
          arp.triggerAttackRelease(highNote, "16n", time);
        }
        arpIdx++;
      }, "8n");
      arpLoop.start(0);
      this.loops.push(arpLoop);

      Tone.getTransport().start();
      this.playing = true;
    } catch (e) {
      console.warn("Music failed:", e);
    }
  }

  stop() {
    this.loops.forEach((l) => l.stop().dispose());
    this.synths.forEach((s) => s.dispose());
    this.loops = [];
    this.synths = [];
    if (this.playing) Tone.getTransport().stop();
    this.playing = false;
    this.currentLevel = -1;
  }

  playHit() {
    try {
      const s = new Tone.Synth({ volume: -10, oscillator: { type: "square" }, envelope: { attack: 0.01, decay: 0.1, sustain: 0, release: 0.1 } }).toDestination();
      s.detune.value = (Math.random() - 0.5) * 80;
      s.triggerAttackRelease("C5", "32n");
      setTimeout(() => s.dispose(), 500);
      const crunch = new Tone.Synth({ volume: -14, oscillator: { type: "triangle" }, envelope: { attack: 0.01, decay: 0.08, sustain: 0, release: 0.06 } }).toDestination();
      setTimeout(() => {
        crunch.detune.value = (Math.random() - 0.5) * 100;
        crunch.triggerAttackRelease("C4", "16n");
        setTimeout(() => crunch.dispose(), 300);
      }, 25);
    } catch (e) {}
  }

  playJump() {
    try {
      const s = new Tone.Synth({ volume: -15, oscillator: { type: "sine" }, envelope: { attack: 0.01, decay: 0.15, sustain: 0, release: 0.1 } }).toDestination();
      s.detune.value = (Math.random() - 0.5) * 80;
      s.triggerAttackRelease("E5", "16n");
      setTimeout(() => s.dispose(), 500);
    } catch (e) {}
  }

  playLand(impactStrength) {
    try {
      const t = Math.min(1, (impactStrength - 3) / 12);
      const freq = 120 + (1 - t) * 80;
      const vol = -18 + t * 4;
      const s = new Tone.Synth({ volume: vol, oscillator: { type: "triangle" }, envelope: { attack: 0.01, decay: 0.08, sustain: 0, release: 0.05 } }).toDestination();
      s.triggerAttackRelease(freq, "16n");
      setTimeout(() => s.dispose(), 200);
    } catch (e) {}
  }

  playFootstep(surface = "ground", volume = 1) {
    try {
      const pitchBySurface = { ground: "G4", float: "A4", moving: "Bb4" };
      const note = pitchBySurface[surface] || "G4";
      const volDb = volume <= 0 ? -60 : -22 + Math.log10(Math.max(0.01, volume)) * 20;
      const s = new Tone.Synth({ volume: volDb, oscillator: { type: "sine" }, envelope: { attack: 0.01, decay: 0.04, sustain: 0, release: 0.02 } }).toDestination();
      s.detune.value = (Math.random() - 0.5) * 120;
      s.triggerAttackRelease(note, "32n");
      setTimeout(() => s.dispose(), 150);
    } catch (e) {}
  }

  playCoin() {
    try {
      const s = new Tone.Synth({ volume: -12, oscillator: { type: "triangle" }, envelope: { attack: 0.01, decay: 0.15, sustain: 0, release: 0.2 } }).toDestination();
      s.detune.value = (Math.random() - 0.5) * 60;
      s.triggerAttackRelease("A5", "16n");
      setTimeout(() => { s.triggerAttackRelease("C6", "16n"); setTimeout(() => s.dispose(), 500); }, 80);
    } catch (e) {}
  }

  playHeal() {
    try {
      const s = new Tone.Synth({ volume: -10, oscillator: { type: "sine" }, envelope: { attack: 0.02, decay: 0.2, sustain: 0.3, release: 0.3 } }).toDestination();
      s.triggerAttackRelease("E5", "8n");
      setTimeout(() => { s.triggerAttackRelease("G5", "8n"); setTimeout(() => { s.triggerAttackRelease("C6", "8n"); setTimeout(() => s.dispose(), 400); }, 80); }, 80);
    } catch (e) {}
  }

  playBossDeath() {
    try {
      const s = new Tone.Synth({ volume: -8, oscillator: { type: "sawtooth" }, envelope: { attack: 0.01, decay: 1, sustain: 0, release: 0.5 } }).toDestination();
      s.triggerAttackRelease("C3", "2n");
      setTimeout(() => s.dispose(), 3000);
    } catch (e) {}
  }

  playParry() {
    try {
      const s = new Tone.Synth({ volume: -6, oscillator: { type: "sine" }, envelope: { attack: 0.01, decay: 0.1, sustain: 0, release: 0.2 } }).toDestination();
      s.triggerAttackRelease("E6", "16n");
      setTimeout(() => { s.triggerAttackRelease("G6", "16n"); setTimeout(() => s.dispose(), 300); }, 50);
    } catch (e) {}
  }
}

// ============================================================
// PARTICLE SYSTEM
// ============================================================
class Particle {
  constructor(x, y, color, vx, vy, life, size) {
    this.x = x; this.y = y; this.color = color;
    this.vx = vx; this.vy = vy;
    this.life = life; this.maxLife = life;
    this.size = size || 3;
  }
  update() {
    this.x += this.vx; this.y += this.vy;
    this.vy += 0.05; this.life--;
  }
  draw(ctx, camX) {
    const alpha = this.life / this.maxLife;
    ctx.globalAlpha = alpha;
    ctx.fillStyle = this.color;
    ctx.fillRect(this.x - camX - this.size / 2, this.y - this.size / 2, this.size, this.size);
    ctx.globalAlpha = 1;
  }
}

// ============================================================
// SCREEN SHAKE (juice)
// ============================================================
function addShake(g, intensity, durationFrames = null, dirX = 0, dirY = 0) {
  const dur = durationFrames ?? Math.ceil(intensity);
  g.shakeEntries = g.shakeEntries || [];
  g.shakeEntries.push({
    intensity,
    duration: dur,
    dirX: dirX || (Math.random() - 0.5) * 2,
    dirY: dirY || (Math.random() - 0.5) * 2,
  });
}

function updateShake(g) {
  if (!g.shakeEntries || !g.shakeEntries.length) return { x: 0, y: 0 };
  let totalX = 0, totalY = 0;
  g.shakeEntries = g.shakeEntries.filter((e) => {
    const mult = e.intensity / 10;
    totalX += e.dirX * mult;
    totalY += e.dirY * mult;
    e.intensity *= SHAKE_DECAY;
    e.duration--;
    return e.duration > 0 && e.intensity > 0.3;
  });
  const cap = SHAKE_MAX_OFFSET;
  totalX = Math.max(-cap, Math.min(cap, totalX));
  totalY = Math.max(-cap, Math.min(cap, totalY));
  return { x: totalX, y: totalY };
}

// ============================================================
// DRAWING HELPERS
// ============================================================
function drawCharacter(ctx, x, y, char, facing, frame, attacking, hurt, landSquashFrames = 0, jumpStretchFrames = 0, dodgeRollFrames = 0) {
  const c = CHARACTERS[char];
  const bob = Math.sin(frame * 0.15) * 2;
  const atkAnim = attacking > 0 ? Math.sin(attacking * 0.5) * 20 : 0;

  ctx.save();
  ctx.translate(x + 16, y + 18);
  if (facing < 0) ctx.scale(-1, 1);
  if (hurt > 0 && Math.floor(hurt) % 4 < 2) ctx.globalAlpha = 0.5;

  // Dodge roll: squash into a roll
  if (dodgeRollFrames > 0) {
    ctx.translate(0, 18);
    ctx.scale(1.4, 0.45);
    ctx.translate(0, -18);
    ctx.globalAlpha = 0.85;
  }

  // Squash on land (scale from feet)
  if (landSquashFrames > 0 && dodgeRollFrames <= 0) {
    ctx.translate(0, 18);
    ctx.scale(0.85 + (1 - 0.85) * (1 - landSquashFrames / 8), 1.2 - (1.2 - 1) * (1 - landSquashFrames / 8));
    ctx.translate(0, -18);
  }
  // Stretch on jump
  if (jumpStretchFrames > 0 && landSquashFrames <= 0) {
    const t = jumpStretchFrames / 3;
    ctx.translate(0, 18);
    ctx.scale(0.95 + 0.05 * t, 1.1 - 0.1 * t);
    ctx.translate(0, -18);
  }

  ctx.fillStyle = "rgba(0,0,0,0.3)";
  ctx.beginPath();
  ctx.ellipse(0, 18, 12, 4, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = c.color;
  ctx.fillRect(-10, -6 + bob, 20, 22);
  ctx.fillStyle = c.accent;
  ctx.fillRect(-8, 0 + bob, 16, 4);

  ctx.fillStyle = c.color;
  ctx.beginPath();
  ctx.arc(0, -10 + bob, 10, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#FFF";
  ctx.fillRect(2, -12 + bob, 5, 4);
  ctx.fillStyle = "#222";
  ctx.fillRect(4, -11 + bob, 3, 3);

  ctx.fillStyle = c.accent;
  ctx.fillRect(-8, -18 + bob, 16, 5);

  const legAnim = Math.sin(frame * 0.2) * 6;
  ctx.fillStyle = c.color;
  ctx.fillRect(-8, 16 + bob, 6, 10 + legAnim);
  ctx.fillRect(2, 16 + bob, 6, 10 - legAnim);

  if (attacking > 0) {
    ctx.save();
    ctx.translate(12, -2 + bob);
    ctx.rotate((atkAnim * Math.PI) / 180 - 0.5);
    ctx.fillStyle = "#C0C0C0";
    ctx.fillRect(0, -2, 24, 4);
    ctx.fillStyle = c.accent;
    ctx.fillRect(-4, -4, 6, 8);
    ctx.shadowColor = c.accent;
    ctx.shadowBlur = 8;
    ctx.fillStyle = "rgba(255,255,255,0.5)";
    ctx.fillRect(8, -1, 16, 2);
    ctx.shadowBlur = 0;
    ctx.restore();
  } else {
    ctx.fillStyle = "#999";
    ctx.fillRect(10, 2 + bob, 3, 16);
    ctx.fillStyle = c.accent;
    ctx.fillRect(8, 0 + bob, 7, 4);
  }

  ctx.globalAlpha = 1;
  ctx.restore();
}

function drawEnemy(ctx, enemy, camX, frame, levelId) {
  if (!enemy.alive) return;
  const lvl = LEVELS[levelId];
  const x = enemy.x - camX;
  const y = enemy.y;
  const bob = Math.sin(frame * 0.1 + enemy.x) * 2;

  ctx.save();
  ctx.translate(x + 16, y + 18);
  if (enemy.facing < 0) ctx.scale(-1, 1);
  if (enemy.hit > 0) ctx.globalAlpha = 0.6;

  if (enemy.type === "flyer") {
    const wingAnim = Math.sin(frame * 0.3) * 15;
    ctx.fillStyle = lvl.accent;
    ctx.beginPath();
    ctx.ellipse(-14, -5, 10, 6 + wingAnim * 0.3, -0.3, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(14, -5, 10, 6 - wingAnim * 0.3, 0.3, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.fillStyle = enemy.type === "archer" ? "#8B4513" : lvl.accent;
  ctx.fillRect(-10, -4 + bob, 20, 20);
  ctx.beginPath();
  ctx.arc(0, -8 + bob, 8, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#FF0000";
  ctx.fillRect(2, -10 + bob, 4, 3);
  ctx.fillStyle = "#FFF";
  ctx.fillRect(3, -9 + bob, 2, 1);

  const hpPct = enemy.health / enemy.maxHealth;
  ctx.fillStyle = "#333";
  ctx.fillRect(-12, -22, 24, 4);
  ctx.fillStyle = hpPct > 0.5 ? "#4CAF50" : hpPct > 0.25 ? "#FF9800" : "#F44336";
  ctx.fillRect(-12, -22, 24 * hpPct, 4);

  ctx.globalAlpha = 1;
  ctx.restore();
}

function drawBoss(ctx, boss, camX, frame, levelId) {
  if (!boss.alive) return;
  const lvl = LEVELS[levelId];
  const x = boss.x - camX;
  const y = boss.y;
  const bob = Math.sin(frame * 0.05) * 3;
  const breathe = Math.sin(frame * 0.08) * 2;

  ctx.save();
  ctx.translate(x + boss.w / 2, y + boss.h / 2);
  if (boss.facing < 0) ctx.scale(-1, 1);
  if (boss.hit > 0) ctx.globalAlpha = 0.6;

  ctx.shadowColor = lvl.accent;
  ctx.shadowBlur = 20 + Math.sin(frame * 0.1) * 10;

  ctx.fillStyle = boss.color;
  ctx.fillRect(-boss.w / 2, -boss.h / 2 + bob, boss.w, boss.h + breathe);

  ctx.fillStyle = lvl.accent;
  for (let i = 0; i < 3; i++) {
    ctx.fillRect(-boss.w / 2 + 5, -boss.h / 2 + 15 + i * 18 + bob, boss.w - 10, 8);
  }

  ctx.fillStyle = boss.color;
  ctx.beginPath();
  ctx.arc(0, -boss.h / 2 - 10 + bob, boss.w / 3, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = lvl.accent;
  ctx.beginPath();
  ctx.moveTo(-15, -boss.h / 2 - 10 + bob);
  ctx.lineTo(-10, -boss.h / 2 - 30 + bob);
  ctx.lineTo(-5, -boss.h / 2 - 10 + bob);
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(5, -boss.h / 2 - 10 + bob);
  ctx.lineTo(10, -boss.h / 2 - 30 + bob);
  ctx.lineTo(15, -boss.h / 2 - 10 + bob);
  ctx.fill();

  const eyeGlow = Math.sin(frame * 0.15) * 0.3 + 0.7;
  ctx.fillStyle = `rgba(255, 0, 0, ${eyeGlow})`;
  ctx.shadowColor = "#FF0000";
  ctx.shadowBlur = 10;
  ctx.fillRect(3, -boss.h / 2 - 14 + bob, 6, 5);
  ctx.fillRect(-9, -boss.h / 2 - 14 + bob, 6, 5);
  ctx.shadowBlur = 0;

  const hpPct = boss.health / boss.maxHealth;
  ctx.shadowBlur = 0;
  ctx.shadowColor = "transparent";
  ctx.fillStyle = "#222";
  ctx.fillRect(-40, -boss.h / 2 - 40, 80, 8);
  ctx.fillStyle = hpPct > 0.5 ? "#F44336" : hpPct > 0.25 ? "#FF5722" : "#D50000";
  ctx.fillRect(-40, -boss.h / 2 - 40, 80 * hpPct, 8);
  ctx.strokeStyle = "#FFF";
  ctx.lineWidth = 1;
  ctx.strokeRect(-40, -boss.h / 2 - 40, 80, 8);

  if (boss.telegraphTimer > 0) {
    ctx.fillStyle = "#FFD700";
    ctx.font = "bold 28px monospace";
    ctx.textAlign = "center";
    ctx.fillText("!", 0, -boss.h / 2 - 55);
    ctx.textAlign = "left";
  }

  ctx.globalAlpha = 1;
  ctx.restore();

  boss.projectiles.forEach((p) => {
    ctx.fillStyle = lvl.accent;
    ctx.shadowColor = lvl.accent;
    ctx.shadowBlur = 8;
    ctx.beginPath();
    ctx.arc(p.x - camX, p.y, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
  });
}

function drawBackground(ctx, lvl, camX, frame) {
  const grad = ctx.createLinearGradient(0, 0, 0, CANVAS_H);
  grad.addColorStop(0, lvl.bg1);
  grad.addColorStop(0.5, lvl.bg2);
  grad.addColorStop(1, lvl.bg3);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

  ctx.fillStyle = lvl.accent + "40";
  for (let i = 0; i < 50; i++) {
    const sx = ((i * 137 + 50) % CANVAS_W) + ((camX * 0.1) % CANVAS_W);
    const sy = (i * 91 + 20) % (CANVAS_H - 100);
    const ss = 1 + (i % 3);
    const twinkle = Math.sin(frame * 0.05 + i) * 0.5 + 0.5;
    ctx.globalAlpha = twinkle * 0.6;
    ctx.fillRect(sx % CANVAS_W, sy, ss, ss);
  }
  ctx.globalAlpha = 1;

  // Ambient floaters (fireflies / leaves)
  for (let i = 0; i < 28; i++) {
    const fx = ((i * 97 + camX * 0.05) % (CANVAS_W + 100)) - 50;
    const fy = (i * 73 + 40) % (CANVAS_H - 80) + 30;
    const drift = Math.sin(frame * 0.04 + i * 0.7) * 8 + Math.cos(frame * 0.03 + i * 0.5) * 5;
    const alpha = 0.4 + Math.sin(frame * 0.06 + i) * 0.25;
    ctx.fillStyle = lvl.accent;
    ctx.globalAlpha = alpha;
    ctx.beginPath();
    ctx.arc(fx + drift, fy + Math.sin(frame * 0.05 + i * 1.3) * 4, 2, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;

  const sway = Math.sin(camX * 0.02 + frame * 0.03) * 3;
  ctx.fillStyle = lvl.bg2 + "80";
  for (let i = 0; i < 8; i++) {
    const mx = (i * 200 - (camX * 0.15) % 1600 + 1600) % 1600 - 200;
    const mh = 80 + (i * 37) % 120;
    const s = sway + (i % 2 === 0 ? 1 : -1) * 2;
    ctx.beginPath();
    ctx.moveTo(mx, CANVAS_H);
    ctx.lineTo(mx + 60 + s, CANVAS_H - mh);
    ctx.lineTo(mx + 120, CANVAS_H);
    ctx.fill();
  }

  ctx.fillStyle = lvl.bg3 + "60";
  for (let i = 0; i < 12; i++) {
    const mx = (i * 150 - (camX * 0.35) % 1800 + 1800) % 1800 - 150;
    const mh = 40 + (i * 29) % 80;
    const s = sway * 0.8 + (i % 3 - 1) * 1.5;
    ctx.beginPath();
    ctx.moveTo(mx, CANVAS_H);
    ctx.lineTo(mx + 40 + s, CANVAS_H - mh);
    ctx.lineTo(mx + 80, CANVAS_H);
    ctx.fill();
  }
  ctx.fillStyle = lvl.bg3 + "40";
  for (let i = 0; i < 10; i++) {
    const mx = (i * 220 - (camX * 0.55) % 2200 + 2200) % 2200 - 220;
    const mh = 30 + (i * 19) % 50;
    ctx.beginPath();
    ctx.moveTo(mx, CANVAS_H);
    ctx.lineTo(mx + 35, CANVAS_H - mh);
    ctx.lineTo(mx + 70, CANVAS_H);
    ctx.fill();
  }

  if (lvl.hazard === "lava" || lvl.hazard === "fire") {
    ctx.fillStyle = "#FF6600";
    for (let i = 0; i < 20; i++) {
      const ex = (i * 97 + frame * 0.5) % CANVAS_W;
      const ey = CANVAS_H - 60 - ((i * 73 + frame * 0.8) % 200);
      ctx.globalAlpha = Math.sin(frame * 0.1 + i) * 0.4 + 0.3;
      ctx.fillRect(ex, ey, 2, 2);
    }
    ctx.globalAlpha = 1;
  } else if (lvl.hazard === "ice") {
    ctx.fillStyle = "#FFFFFF";
    for (let i = 0; i < 30; i++) {
      const sx = (i * 73 + frame * 0.3) % CANVAS_W;
      const sy = (i * 47 + frame * 1.2) % CANVAS_H;
      ctx.globalAlpha = 0.4 + Math.sin(i) * 0.2;
      ctx.fillRect(sx, sy, 2, 2);
    }
    ctx.globalAlpha = 1;
  } else if (lvl.hazard === "water") {
    ctx.fillStyle = "#18FFFF";
    for (let i = 0; i < 15; i++) {
      const bx = (i * 83 + frame * 0.2) % CANVAS_W;
      const by = CANVAS_H - 50 - ((i * 59 + frame * 0.6) % 300);
      const br = 2 + (i % 3);
      ctx.globalAlpha = 0.3;
      ctx.beginPath();
      ctx.arc(bx, by, br, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  }
}

function drawHazard(ctx, hazard, camX, frame, lvl) {
  const x = hazard.x - camX;
  const y = hazard.y;

  if (hazard.shape === "ceiling") {
    ctx.fillStyle = lvl.accent;
    const spikeH = 12;
    const step = 14;
    for (let i = 0; i < hazard.w / step; i++) {
      const sx = x + i * step + step / 2;
      const bob = Math.sin(frame * 0.08 + i) * 2;
      ctx.beginPath();
      ctx.moveTo(sx + bob, y + hazard.h);
      ctx.lineTo(sx - 6 + bob, y + 4);
      ctx.lineTo(sx + 6 + bob, y + 4);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = "rgba(0,0,0,0.3)";
      ctx.lineWidth = 1;
      ctx.stroke();
    }
    return;
  }

  ctx.fillStyle = lvl.accent;
  if (lvl.hazard === "thorns" || lvl.hazard === "crystals") {
    for (let i = 0; i < hazard.w / 8; i++) {
      ctx.beginPath();
      ctx.moveTo(x + i * 8, y + hazard.h);
      ctx.lineTo(x + i * 8 + 4, y - 8 + Math.sin(frame * 0.1 + i) * 2);
      ctx.lineTo(x + i * 8 + 8, y + hazard.h);
      ctx.fill();
    }
  } else if (lvl.hazard === "lava" || lvl.hazard === "fire") {
    ctx.fillStyle = "#FF4500";
    ctx.fillRect(x, y, hazard.w, hazard.h);
    ctx.fillStyle = "#FFAA00";
    for (let i = 0; i < hazard.w / 10; i++) {
      const fh = 6 + Math.sin(frame * 0.2 + i * 2) * 6;
      ctx.fillRect(x + i * 10, y - fh, 8, fh);
    }
  } else if (lvl.hazard === "poison") {
    ctx.fillStyle = "#76FF03";
    ctx.fillRect(x, y, hazard.w, hazard.h);
    ctx.fillStyle = "#00E676";
    for (let i = 0; i < 3; i++) {
      const bx = x + (frame * 0.5 + i * 25) % hazard.w;
      const by = y - 4 - Math.sin(frame * 0.15 + i) * 4;
      ctx.beginPath();
      ctx.arc(bx, by, 3, 0, Math.PI * 2);
      ctx.fill();
    }
  } else {
    ctx.fillRect(x, y, hazard.w, hazard.h);
    ctx.fillStyle = lvl.accent + "80";
    ctx.fillRect(x, y - 4, hazard.w, 4);
  }
}

function drawPlatform(ctx, plat, camX, lvl, frame) {
  const x = plat.x - camX;
  if (x > CANVAS_W + 50 || x + plat.w < -50) return;

  if (plat.type === "ground") {
    ctx.fillStyle = "rgba(0,0,0,0.25)";
    ctx.fillRect(x, plat.y + plat.h, plat.w, 2);
    ctx.fillStyle = lvl.platform;
    ctx.fillRect(x, plat.y, plat.w, plat.h);
    ctx.fillStyle = lvl.accent + "60";
    ctx.fillRect(x, plat.y, plat.w, 3);
    ctx.fillStyle = lvl.accent + "99";
    ctx.fillRect(x, plat.y, plat.w, 2);
  } else if (plat.type === "float") {
    ctx.fillStyle = "rgba(0,0,0,0.2)";
    ctx.fillRect(x, plat.y + plat.h, plat.w, 2);
    ctx.fillStyle = lvl.platform;
    ctx.fillRect(x, plat.y, plat.w, plat.h);
    ctx.fillStyle = lvl.accent + "40";
    ctx.fillRect(x + 2, plat.y + 2, plat.w - 4, 3);
    ctx.fillStyle = lvl.accent + "99";
    ctx.fillRect(x + 2, plat.y + 2, plat.w - 4, 2);
    ctx.shadowColor = lvl.accent;
    ctx.shadowBlur = 6;
    ctx.fillStyle = lvl.accent + "20";
    ctx.fillRect(x, plat.y - 2, plat.w, 2);
    ctx.shadowBlur = 0;
  } else if (plat.type === "moving") {
    ctx.fillStyle = lvl.accent;
    ctx.fillRect(x, plat.y, plat.w, plat.h);
    ctx.fillStyle = "#FFF3";
    ctx.fillRect(x + 4, plat.y + 3, plat.w - 8, 3);
    ctx.fillStyle = "#FFF6";
    const arrowBob = Math.sin(frame * 0.1) * 3;
    ctx.beginPath();
    ctx.moveTo(x + plat.w / 2 - 10 + arrowBob, plat.y + plat.h / 2);
    ctx.lineTo(x + plat.w / 2 - 5 + arrowBob, plat.y + 2);
    ctx.lineTo(x + plat.w / 2 + arrowBob, plat.y + plat.h / 2);
    ctx.fill();
  }
}

function drawCoin(ctx, coin, camX, frame, lvl) {
  if (coin.collected && (!coin.collectAnim || coin.collectAnim <= 0)) return;
  const x = coin.x - camX;
  if (x > CANVAS_W + 20 || x < -20) return;
  const y = coin.y + (coin.collectAnim ? 0 : Math.sin(frame * 0.08 + coin.bobOffset) * 4);

  let scale = 1;
  if (coin.collected && coin.collectAnim > 0) {
    scale = 1.2 + (1 - coin.collectAnim / 5) * 1.0;
  }

  ctx.save();
  ctx.translate(x, y);
  ctx.scale(scale, scale);
  ctx.translate(-x, -y);

  ctx.globalAlpha = coin.collectAnim ? coin.collectAnim / 5 : 1;
  ctx.fillStyle = "#FFD700";
  ctx.shadowColor = "#FFD700";
  ctx.shadowBlur = 8;
  ctx.beginPath();
  ctx.arc(x, y, 8, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#FFF8DC";
  ctx.beginPath();
  ctx.arc(x - 2, y - 2, 3, 0, Math.PI * 2);
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.globalAlpha = 1;
  ctx.restore();
}

function drawScroll(ctx, scroll, camX, frame, lvl) {
  if (scroll.collected) return;
  const x = scroll.x - camX + scroll.w / 2;
  const y = scroll.y + scroll.h / 2 + Math.sin(frame * 0.06) * 2;
  if (x > CANVAS_W + 30 || x < -30) return;
  ctx.save();
  ctx.fillStyle = lvl.accent + "40";
  ctx.strokeStyle = lvl.accent;
  ctx.lineWidth = 2;
  ctx.fillRect(scroll.x - camX, scroll.y, scroll.w, scroll.h);
  ctx.strokeRect(scroll.x - camX, scroll.y, scroll.w, scroll.h);
  ctx.fillStyle = "#FFF";
  ctx.font = "10px monospace";
  ctx.textAlign = "center";
  ctx.fillText("?", x, y + 4);
  ctx.restore();
}

function drawHeart(ctx, heart, camX, frame, lvl) {
  if (heart.collected) return;
  const x = heart.x - camX + 12;
  const y = heart.y + 12 + Math.sin(frame * 0.06 + heart.bobOffset) * 3;
  if (x > CANVAS_W + 24 || x < -24) return;

  ctx.save();
  ctx.translate(x, y);
  ctx.fillStyle = "#E53935";
  ctx.strokeStyle = "#B71C1C";
  ctx.lineWidth = 2;
  ctx.shadowColor = "#FF6B6B";
  ctx.shadowBlur = 6;
  ctx.beginPath();
  ctx.moveTo(0, 6);
  ctx.bezierCurveTo(-10, -8, -10, -14, 0, -6);
  ctx.bezierCurveTo(10, -14, 10, -8, 0, 6);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.shadowBlur = 0;
  ctx.fillStyle = "#FFCDD2";
  ctx.globalAlpha = 0.9;
  ctx.beginPath();
  ctx.arc(-4, -2, 3, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;
  ctx.restore();
}

// ============================================================
// MAIN GAME COMPONENT
// ============================================================
export default function Game() {
  const canvasRef = useRef(null);
  const [screen, setScreen] = useState("title");
  const [selectedChar, setSelectedChar] = useState(0);
  const [currentLevel, setCurrentLevel] = useState(0);
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(3);
  const [musicOn, setMusicOn] = useState(true);
  const [hoveredChar, setHoveredChar] = useState(null);
  const [clearedLevels, setClearedLevels] = useState(() => new Set());
  const [paused, setPaused] = useState(false);
  const [sfxVolume, setSfxVolume] = useState(1);
  const [musicVolume, setMusicVolume] = useState(1);
  const [reduceShake, setReduceShake] = useState(1);

  const gameRef = useRef({
    keys: {},
    player: null,
    level: null,
    camX: 0,
    camY: 0,
    frame: 0,
    particles: [],
    music: new MusicEngine(),
    screenShake: 0,
    shakeEntries: [],
    hitStopFrames: 0,
    damageFlashFrames: 0,
    displayedHp: 100,
    ghostHp: 100,
    prevVy: 0,
    comboCount: 0,
    comboTimer: 0,
    levelTimer: 0,
    bossActive: false,
    transitioning: false,
    jumpKeyReleased: false,
    stepTimer: 0,
    damageNumbers: [],
    levelTitleTimer: LEVEL_TITLE_DURATION,
    bossDisplayedHp: 0,
    bossGhostHp: 0,
    timeScale: 1,
    timeScaleTimer: 0,
    bossPhaseFlash: 0,
    slashTrail: [],
    runDustTimer: 0,
    victoryFlashFrames: 0,
    lastDashTime: 0,
    lastDashDir: 0,
    jumpBufferTimer: 0,
    dashFrames: 0,
    dashCooldown: 0,
    bossIntroTimer: 0,
    levelIntroLineTimer: 0,
    loreLine: null,
    loreLineTimer: 0,
    lastSurface: "ground",
  });

  const initPlayer = useCallback((charId, levelId) => {
    const c = CHARACTERS[charId];
    const hasDoubleJumpUnlock = levelId > UNLOCK_DOUBLE_JUMP_AFTER_LEVEL;
    const maxJumps = (hasDoubleJumpUnlock || charId === 4) ? 2 : 1;
    return {
      x: 80, y: CANVAS_H - TILE - 40,
      w: 32, h: 36,
      vx: 0, vy: 0,
      speed: c.speed,
      jumpPower: c.jump,
      health: c.health,
      maxHealth: c.health,
      attack: c.attack,
      charId,
      grounded: false,
      facing: 1,
      attacking: 0,
      attackCooldown: 0,
      hurt: 0,
      invincible: 0,
      jumpsLeft: maxJumps,
      maxJumps,
      frame: 0,
      shieldActive: false,
      shieldCooldown: 0,
      landSquashFrames: 0,
      jumpStretchFrames: 0,
      coyoteTimer: 0,
      jumpHeld: false,
      attackCharge: 0,
      dodgeRollFrames: 0,
      dodgeRollCooldown: 0,
      attackType: 0,
      attackHitFrame: ATTACK_TYPES[0].hitFrame,
      attackTypeUsed: 0,
      attackDmgMult: ATTACK_TYPES[0].dmgMult,
      specialCooldown: 0,
      specialCooldownMax: ATTACK_TYPES[2].specialCooldownMax,
      wallSlideLeft: false,
      wallSlideRight: false,
      dashFrames: 0,
      dashCooldown: 0,
    };
  }, []);

  useEffect(() => {
    const g = gameRef.current;
    const handleKeyDown = (e) => {
      g.keys[e.code] = true;
      if (e.code === "Space" || e.code === "ArrowUp" || e.code === "ArrowDown") e.preventDefault();
    };
    const handleKeyUp = (e) => {
      if (e.code === "Space" || e.code === "ArrowUp" || e.code === "KeyW") g.jumpKeyReleased = true;
      g.keys[e.code] = false;
    };
    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, []);

  useEffect(() => {
    return () => { gameRef.current.music.stop(); };
  }, []);

  const startGame = useCallback((levelId) => {
    const g = gameRef.current;
    g.player = initPlayer(selectedChar, levelId);
    g.level = generateLevel(levelId);
    g.camX = 0;
    g.camY = 0;
    g.frame = 0;
    g.particles = [];
    g.screenShake = 0;
    g.shakeEntries = [];
    g.hitStopFrames = 0;
    g.damageFlashFrames = 0;
    const p = g.player;
    g.displayedHp = p.maxHealth;
    g.ghostHp = p.maxHealth;
    g.prevVy = 0;
    g.comboCount = 0;
    g.comboTimer = 0;
    g.levelTimer = 0;
    g.bossActive = false;
    g.transitioning = false;
    g.jumpKeyReleased = false;
    g.stepTimer = 0;
    g.damageNumbers = [];
    g.levelTitleTimer = LEVEL_TITLE_DURATION;
    g.bossDisplayedHp = 0;
    g.bossGhostHp = 0;
    g.timeScale = 1;
    g.timeScaleTimer = 0;
    g.bossPhaseFlash = 0;
    g.slashTrail = [];
    g.runDustTimer = 0;
    g.victoryFlashFrames = 0;
    g.bossIntroTimer = 0;
    g.levelIntroLineTimer = 90;
    g.loreLine = null;
    g.loreLineTimer = 0;
    setScreen("game");
    if (musicOn) g.music.start(levelId);
  }, [selectedChar, initPlayer, musicOn]);

  useEffect(() => {
    if (screen !== "game") return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const g = gameRef.current;
    let running = true;

    const gameLoop = () => {
      if (!running) return;
      const p = g.player;
      const lvl = g.level;
      if (!p || !lvl) { requestAnimationFrame(gameLoop); return; }

      if (g.keys["Escape"]) { setPaused((prev) => !prev); g.keys["Escape"] = false; }
      if (paused && g.keys["KeyR"]) { startGame(lvl.levelId); setPaused(false); g.keys["KeyR"] = false; }
      if (paused && g.keys["KeyQ"]) { setScreen("title"); setPaused(false); g.keys["KeyQ"] = false; }

      const levelData = LEVELS[lvl.levelId];

      if (!paused) {
      const inHitStop = g.hitStopFrames > 0;
      if (inHitStop) g.hitStopFrames--;

      if (!inHitStop) {
      g.frame++;
      g.levelTimer++;

      const isRolling = p.dodgeRollFrames > 0;
      const isDashing = p.dashFrames > 0;

      // Jump buffer: pressing jump slightly before landing still triggers jump
      if (g.keys["ArrowUp"] || g.keys["KeyW"] || g.keys["Space"]) g.jumpBufferTimer = JUMP_BUFFER_FRAMES;
      if (g.jumpBufferTimer > 0) g.jumpBufferTimer--;
      if (g.jumpKeyReleased) { p.jumpHeld = false; g.jumpKeyReleased = false; }

      // INPUT (no movement/attack during dodge roll or dash)
      if (!isRolling && !isDashing) {
      const airMult = p.grounded ? 1 : AIR_CONTROL;
      if (g.keys["ArrowLeft"] || g.keys["KeyA"]) { p.vx -= p.speed * 0.4 * airMult; p.facing = -1; }
      if (g.keys["ArrowRight"] || g.keys["KeyD"]) { p.vx += p.speed * 0.4 * airMult; p.facing = 1; }
      const canJump = p.jumpsLeft > 0 || p.coyoteTimer > 0;
      const bufferJump = g.jumpBufferTimer > 0 && (p.jumpsLeft > 0 || p.coyoteTimer > 0 || p.wallSlideLeft || p.wallSlideRight);
      const jumpPressed = (g.keys["ArrowUp"] || g.keys["KeyW"] || g.keys["Space"]) && (canJump || p.wallSlideLeft || p.wallSlideRight);
      if (jumpPressed || bufferJump) {
        if (bufferJump) g.jumpBufferTimer = 0;
        if (p.wallSlideLeft || p.wallSlideRight) {
          p.vy = WALL_JUMP_VY;
          p.vx = p.wallSlideLeft ? WALL_JUMP_VX : -WALL_JUMP_VX;
          p.facing = p.wallSlideLeft ? 1 : -1;
          p.jumpsLeft = p.maxJumps - 1;
          p.grounded = false;
          p.coyoteTimer = 0;
          p.wallSlideLeft = false;
          p.wallSlideRight = false;
          p.jumpStretchFrames = 3;
          g.keys["ArrowUp"] = false; g.keys["KeyW"] = false; g.keys["Space"] = false;
          if (musicOn) g.music.playJump();
          for (let i = 0; i < 6; i++) g.particles.push(new Particle(p.x + 16, p.y + p.h, "#FFF", (p.facing > 0 ? -1 : 1) * (2 + Math.random() * 2), Math.random() * -2, 18, 3));
        } else {
          if (p.coyoteTimer > 0 && p.jumpsLeft === 0) p.jumpsLeft = p.maxJumps - 1;
          else p.jumpsLeft--;
          p.vy = p.jumpPower; p.grounded = false; p.coyoteTimer = 0;
          p.jumpStretchFrames = 3; p.jumpHeld = true;
          g.keys["ArrowUp"] = false; g.keys["KeyW"] = false; g.keys["Space"] = false;
          if (musicOn) g.music.playJump();
          for (let i = 0; i < 5; i++) g.particles.push(new Particle(p.x + 16, p.y + p.h, "#FFF", (Math.random() - 0.5) * 3, Math.random() * -2, 20, 3));
        }
      }
      if (!isRolling && (g.keys["ShiftLeft"] || g.keys["ShiftRight"]) && p.dodgeRollCooldown <= 0) {
        if (p.attacking > 0) { p.attacking = 0; p.attackCooldown = 0; }
        p.dodgeRollFrames = DODGE_ROLL_FRAMES;
        if (musicOn) g.music.playFootstep("ground", sfxVolume);
      }
      if (p.dodgeRollFrames > 0) {
        p.dodgeRollFrames--;
        p.invincible = 2;
        p.x += p.facing * DODGE_ROLL_SPEED * (g.timeScale ?? 1);
        if (p.dodgeRollFrames <= 0) p.dodgeRollCooldown = DODGE_ROLL_COOLDOWN;
      }
      if (p.dodgeRollCooldown > 0) p.dodgeRollCooldown--;
      if ((g.keys["KeyC"] || g.keys["KeyV"]) && p.dashCooldown <= 0 && !isRolling && p.dashFrames <= 0) {
        p.dashFrames = DASH_FRAMES;
        p.dashCooldown = DASH_COOLDOWN;
        if (musicOn) g.music.playFootstep("ground", sfxVolume);
      }
      if (p.dashFrames > 0) {
        p.dashFrames--;
        p.invincible = 2;
        p.x += p.facing * DASH_SPEED * (g.timeScale ?? 1);
        if (p.dashFrames <= 0) p.dashCooldown = DASH_COOLDOWN;
      }
      if (p.dashCooldown > 0) p.dashCooldown--;
      if (g.keys["KeyDigit1"]) p.attackType = 0;
      if (g.keys["KeyDigit2"]) p.attackType = 1;
      if (g.keys["KeyDigit3"]) p.attackType = 2;
      const at = ATTACK_TYPES[p.attackType];
      const canSpecial = p.attackType === 2 && p.specialCooldown <= 0;
      const canAttack = p.attackCooldown <= 0 && (p.attackType !== 2 || canSpecial);
      const attackKeyHeld = g.keys["KeyZ"] || g.keys["KeyJ"];
      if (attackKeyHeld) p.attackCharge++;
      else if (p.attackCharge > 0 && canAttack) {
        const charged = p.attackType < 2 && p.attackCharge >= CHARGE_ATTACK_FRAMES;
        p.attacking = at.duration;
        p.attackHitFrame = at.hitFrame;
        p.attackCooldown = at.cooldown;
        p.chargedAttack = charged;
        p.attackCharge = 0;
        if (p.attackType === 2) p.specialCooldown = p.specialCooldownMax;
        p.attackTypeUsed = p.attackType;
        p.attackDmgMult = at.dmgMult;
        if (musicOn) g.music.playHit();
        const count = p.attackType === 2 || charged ? 14 : 8;
        for (let i = 0; i < count; i++) {
          const angle = (p.facing > 0 ? 0 : Math.PI) + (Math.random() - 0.5) * 1.2;
          g.particles.push(new Particle(p.x + 16 + p.facing * 16, p.y + 10, CHARACTERS[p.charId].accent, Math.cos(angle) * (3 + Math.random() * 3), Math.sin(angle) * (3 + Math.random() * 3) - 2, p.attackType === 2 ? 20 : 15, 4));
        }
      }
      if (p.charId === 5 && (g.keys["KeyX"] || g.keys["KeyK"]) && p.shieldCooldown <= 0) {
        p.shieldActive = true; p.shieldCooldown = 120;
        setTimeout(() => { if (g.player) g.player.shieldActive = false; }, 1500);
      }
      }

      // PHYSICS (time scale for big moments)
      if (g.timeScaleTimer > 0) { g.timeScaleTimer--; g.timeScale += (1 - g.timeScale) * 0.15; }
      else g.timeScale = 1;
      const dt = g.timeScale;
      if (p.dashFrames > 0 || p.dodgeRollFrames > 0) {
        p.vx = 0;
        p.vy = 0;
      } else {
        p.vy += GRAVITY * dt;
        p.vx *= FRICTION;
        if (!p.grounded && p.vy < 0 && !p.jumpHeld) p.vy *= JUMP_CUT_MULT;
      }
      p.x += p.vx * dt; p.y += p.vy * dt;
      if (p.vx > p.speed) p.vx = p.speed;
      if (p.vx < -p.speed) p.vx = -p.speed;
      if (p.attacking > 0) p.attacking--;
      if (p.attackCooldown > 0) p.attackCooldown--;
      if (p.specialCooldown > 0) p.specialCooldown--;
      if (p.hurt > 0) p.hurt--;
      if (p.invincible > 0) p.invincible--;
      if (p.shieldCooldown > 0) p.shieldCooldown--;
      if (p.landSquashFrames > 0) p.landSquashFrames--;
      if (p.jumpStretchFrames > 0) p.jumpStretchFrames--;
      if (g.comboTimer > 0) g.comboTimer--; else g.comboCount = 0;
      p.grounded = false; p.frame++;

      // Moving hazards
      lvl.hazards.forEach((haz) => {
        if (haz.moveRange != null) haz.x = haz.originX + Math.sin(g.frame * 0.02 * (haz.moveSpeed || 0.5)) * haz.moveRange;
      });

      // PLATFORMS
      p.wallSlideLeft = false;
      p.wallSlideRight = false;
      lvl.platforms.forEach((plat) => {
        if (plat.type === "moving") plat.x = plat.originX + Math.sin(g.frame * 0.02 * plat.moveSpeed) * plat.moveRange;
        const vertOverlap = p.y + p.h > plat.y && p.y < plat.y + plat.h;
        const onTop = p.x + p.w > plat.x && p.x < plat.x + plat.w && p.y + p.h > plat.y && p.y + p.h < plat.y + plat.h + 15 && p.vy >= 0;
        if (onTop) {
          const impactVy = p.vy;
          p.y = plat.y - p.h; p.vy = 0; p.grounded = true; p.jumpsLeft = p.maxJumps; p.coyoteTimer = COYOTE_FRAMES;
          g.lastSurface = plat.type || "ground";
          if (impactVy > 2 && musicOn) g.music.playLand(impactVy);
          if (impactVy > LAND_DUST_VY_THRESHOLD) {
            const dustCount = impactVy > 10 ? 16 : 10;
            for (let i = 0; i < dustCount; i++) {
              g.particles.push(new Particle(p.x + 16, p.y + p.h, "#8B7355", (Math.random() - 0.5) * 6, -Math.random() * 4 - 2, 15 + Math.floor(Math.random() * 10), 2 + Math.floor(Math.random() * 2)));
            }
          }
          if (impactVy > 2) p.landSquashFrames = impactVy > 10 ? 10 : 8;
          if ((plat.type === "float" || plat.type === "moving") && impactVy > 2) p.vy = PLATFORM_BOUNCE_VY;
          if (plat.type === "moving") {
            const dx = Math.cos(g.frame * 0.02 * plat.moveSpeed) * plat.moveRange * 0.02 * plat.moveSpeed;
            p.x += dx;
          }
        }
        if (!onTop && vertOverlap && p.vy >= -2) {
          if (p.x + p.w >= plat.x && p.x + p.w <= plat.x + plat.w + WALL_GRAB_MARGIN && p.x < plat.x + plat.w) p.wallSlideRight = true;
          if (p.x <= plat.x + plat.w && p.x >= plat.x - WALL_GRAB_MARGIN && p.x + p.w > plat.x) p.wallSlideLeft = true;
        }
      });
      if (!p.grounded && p.coyoteTimer > 0) p.coyoteTimer--;
      if (!p.grounded && (p.wallSlideLeft || p.wallSlideRight) && p.vy > WALL_SLIDE_SPEED) p.vy = WALL_SLIDE_SPEED;
      g.prevVy = p.vy;

      // Run dust
      if (p.grounded && Math.abs(p.vx) > 0.5) {
        if (g.runDustTimer <= 0) {
          for (let i = 0; i < 3; i++) g.particles.push(new Particle(p.x + 16 + (p.facing > 0 ? 4 : -4), p.y + p.h, "#8B7355", (Math.random() - 0.5) * 2, -Math.random() * 1.5, 12, 2));
          g.runDustTimer = RUN_DUST_INTERVAL;
        } else g.runDustTimer--;
      } else g.runDustTimer = 0;

      // Slash trail (record position during attack)
      if (p.attacking > 0) {
        const swordX = p.x + 16 + p.facing * 20;
        const swordY = p.y + 10;
        g.slashTrail = g.slashTrail || [];
        g.slashTrail.push({ x: swordX, y: swordY, alpha: 1, facing: p.facing });
        if (g.slashTrail.length > SLASH_TRAIL_LENGTH) g.slashTrail.shift();
      }
      if (g.slashTrail && g.slashTrail.length > 0) {
        g.slashTrail.forEach((t) => { t.alpha -= SLASH_TRAIL_DECAY; });
        g.slashTrail = g.slashTrail.filter((t) => t.alpha > 0.05);
      }
      if (p.attacking === 0) p.chargedAttack = false;

      // Footsteps
      if (p.grounded && Math.abs(p.vx) > 0.3) {
        if (g.stepTimer <= 0) { if (musicOn) g.music.playFootstep(g.lastSurface || "ground", sfxVolume); g.stepTimer = 8; }
        else g.stepTimer--;
      } else g.stepTimer = 0;

      if (p.y > CANVAS_H + 100) p.health = 0;

      // COINS (magnet + collect)
      lvl.coins.forEach((coin) => {
        if (coin.collected && coin.collectAnim !== undefined) {
          if (coin.collectAnim > 0) coin.collectAnim--;
          return;
        }
        const dx = p.x + 16 - coin.x;
        const dy = p.y + 18 - coin.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < COIN_MAGNET_RANGE && dist > COIN_COLLECT_RANGE) {
          const nx = dx / dist;
          const ny = dy / dist;
          coin.x += nx * COIN_MAGNET_SPEED;
          coin.y += ny * COIN_MAGNET_SPEED;
        }
        if (!coin.collected && dist < COIN_COLLECT_RANGE) {
          coin.collected = true;
          coin.collectAnim = 5;
          setScore((s) => s + 10);
          if (musicOn) g.music.playCoin();
          for (let i = 0; i < 12; i++) g.particles.push(new Particle(coin.x, coin.y, "#FFD700", (Math.random() - 0.5) * 8, (Math.random() - 0.5) * 8 - 2, 25, 3));
        }
      });

      // Healing items
      lvl.hearts.forEach((heart) => {
        if (heart.collected) return;
        const dx = p.x + 16 - (heart.x + 12);
        const dy = p.y + 18 - (heart.y + 12);
        if (Math.abs(dx) < 28 && Math.abs(dy) < 32) {
          heart.collected = true;
          p.health = Math.min(p.health + heart.healAmount, p.maxHealth);
          if (musicOn) g.music.playHeal();
          for (let i = 0; i < 10; i++) g.particles.push(new Particle(heart.x + 12, heart.y + 12, "#FF6B6B", (Math.random() - 0.5) * 6, (Math.random() - 0.5) * 6 - 3, 22, 3));
        }
      });

      // Lore scrolls
      (lvl.scrolls || []).forEach((scroll) => {
        if (scroll.collected) return;
        if (p.x + p.w > scroll.x && p.x < scroll.x + scroll.w && p.y + p.h > scroll.y && p.y < scroll.y + scroll.h) {
          scroll.collected = true;
          g.loreLine = scroll.text;
          g.loreLineTimer = 180;
          if (musicOn) g.music.playCoin();
        }
      });

      // HAZARDS
      lvl.hazards.forEach((haz) => {
        if (p.x + p.w > haz.x && p.x < haz.x + haz.w && p.y + p.h > haz.y && p.y < haz.y + haz.h && p.invincible <= 0 && !p.shieldActive) {
          p.health -= haz.damage; p.hurt = 20; p.invincible = 40; p.vy = -8;
          g.damageFlashFrames = 3;
          addShake(g, 10);
        }
      });

      // SWORD HITBOX
      const swordW = p.attacking > 0 ? ATTACK_TYPES[p.attackTypeUsed ?? 0].swordW : 30;
      const swordBox = p.attacking > 0 ? { x: p.facing > 0 ? p.x + p.w : p.x - swordW, y: p.y - 5, w: swordW, h: p.h + 10 } : null;

      // ENEMIES
      lvl.enemies.forEach((enemy) => {
        if (!enemy.alive) return;
        if (enemy.type === "walker") {
          enemy.x += enemy.vx * dt; enemy.facing = enemy.vx > 0 ? 1 : -1;
          const dx = p.x - enemy.x;
          if (Math.abs(dx) < 300) enemy.vx = dx > 0 ? Math.abs(enemy.vx) : -Math.abs(enemy.vx);
        } else if (enemy.type === "flyer") {
          enemy.x += Math.sin(g.frame * 0.03 + enemy.x * 0.01) * 2 * dt;
          enemy.y = enemy.originY - 60 + Math.sin(g.frame * 0.02 + enemy.x * 0.01) * 30;
          enemy.facing = p.x > enemy.x ? 1 : -1;
        } else if (enemy.type === "archer") {
          enemy.facing = p.x > enemy.x ? 1 : -1;
        }
        if (enemy.hit > 0) enemy.hit--;

        const overlap = enemy.alive && p.x + p.w > enemy.x && p.x < enemy.x + enemy.w && p.y + p.h > enemy.y && p.y < enemy.y + enemy.h;
        const stomping = overlap && p.vy > 0 && (p.y + p.h) - enemy.y < 22;
        if (stomping) {
          const stompDmg = enemy.health;
          enemy.health -= stompDmg;
          enemy.hit = 10;
          enemy.vx = (p.x < enemy.x ? 1 : -1) * 4;
          p.vy = -11;
          p.y = enemy.y - p.h;
          if (musicOn) g.music.playLand(8);
          addShake(g, 5);
          g.damageNumbers.push({ x: enemy.x + 16, y: enemy.y - 10, value: stompDmg, life: 45, vy: -1.5 });
          for (let i = 0; i < 12; i++) g.particles.push(new Particle(enemy.x + 16, enemy.y + 18, levelData.accent, (Math.random() - 0.5) * 6, (Math.random() - 0.5) * 6 - 2, 20, 4));
          if (enemy.health <= 0) {
            enemy.alive = false;
            setScore((s) => s + 50);
            for (let i = 0; i < 18; i++) g.particles.push(new Particle(enemy.x + 16, enemy.y + 18, levelData.accent, (Math.random() - 0.5) * 8, (Math.random() - 0.5) * 8, 35, 5));
          }
        } else if (overlap && p.invincible <= 0 && !p.shieldActive) {
          p.health -= 10 + lvl.levelId * 2; p.hurt = 20; p.invincible = 60; p.vy = -6;
          p.vx = (p.x < enemy.x ? -1 : 1) * 5;
          g.damageFlashFrames = 3;
          addShake(g, 8);
        }

        if (swordBox && enemy.alive && swordBox.x + swordBox.w > enemy.x && swordBox.x < enemy.x + enemy.w && swordBox.y + swordBox.h > enemy.y && swordBox.y < enemy.y + enemy.h && p.attacking === p.attackHitFrame) {
          const isCrit = Math.random() < CRITICAL_HIT_CHANCE;
          const baseDmg = p.chargedAttack ? Math.ceil(p.attack * CHARGE_DAMAGE_MULT) : Math.ceil(p.attack * (p.attackDmgMult ?? 1));
          const dmg = isCrit ? baseDmg * 2 : baseDmg;
          enemy.health -= dmg; enemy.hit = 10; enemy.vx = p.facing * 5;
          g.damageNumbers.push({ x: enemy.x + 16, y: enemy.y - 10, value: dmg, life: 45, vy: -1.5, critical: isCrit });
          g.comboCount++; g.comboTimer = 90; setScore((s) => s + 5 * g.comboCount);
          const particleCount = isCrit || p.chargedAttack ? 18 : 10;
          for (let i = 0; i < particleCount; i++) g.particles.push(new Particle(enemy.x + 16, enemy.y + 18, isCrit ? "#FFD700" : (i % 2 === 0 ? "#FFF" : CHARACTERS[p.charId].accent), (Math.random() - 0.5) * 8, (Math.random() - 0.5) * 8, 20, 4));
          addShake(g, isCrit || p.chargedAttack ? 6 : 4);
          g.hitStopFrames = HITSTOP_ENEMY + (isCrit ? CRITICAL_HITSTOP_EXTRA : 0) + (p.chargedAttack ? 2 : 0);
          if (enemy.health <= 0) {
            enemy.alive = false; setScore((s) => s + 50);
            for (let i = 0; i < 20; i++) g.particles.push(new Particle(enemy.x + 16, enemy.y + 18, levelData.accent, (Math.random() - 0.5) * 10, (Math.random() - 0.5) * 10, 40, 5));
          }
        }
      });

      // BOSS
      const boss = lvl.boss;
      if (boss.alive && p.x > boss.x - 400) {
        g.bossActive = true;
        if (g.bossIntroTimer === 0) g.bossIntroTimer = 150;
        if (g.bossDisplayedHp <= 0) { g.bossDisplayedHp = boss.health; g.bossGhostHp = boss.maxHealth; }
        boss.attackTimer++;
        const attackThreshold = Math.max(30, 90 - lvl.levelId * 5);
        if (boss.attackTimer >= attackThreshold - TELEGRAPH_FRAMES && boss.attackTimer < attackThreshold) boss.telegraphTimer = attackThreshold - boss.attackTimer;
        else if (boss.attackTimer >= attackThreshold) boss.telegraphTimer = 0;
        const bossSpeed = 1.5 + lvl.levelId * 0.2;
        if (boss.x > p.x + 50) boss.vx = -bossSpeed;
        else if (boss.x < p.x - 50) boss.vx = bossSpeed;
        else boss.vx *= 0.9;
        boss.x += boss.vx * dt; boss.facing = p.x > boss.x ? 1 : -1;
        if (boss.hit > 0) boss.hit--;

        if (boss.attackTimer > attackThreshold) {
          boss.attackTimer = 0; boss.pattern = (boss.pattern + 1) % 3;
          if (boss.pattern === 0) {
            boss.vx = boss.facing * 8;
          } else if (boss.pattern === 1) {
            boss.projectiles.push({ x: boss.x + boss.w / 2, y: boss.y + boss.h / 3, vx: boss.facing * 5, vy: -1, life: 120 });
          } else {
            for (let i = -2; i <= 2; i++) boss.projectiles.push({ x: boss.x + boss.w / 2, y: boss.y + boss.h / 3, vx: boss.facing * 4 + i * 0.5, vy: -2 + Math.abs(i) * 0.5, life: 90 });
          }
        }

        boss.projectiles = boss.projectiles.filter((proj) => {
          proj.x += proj.vx * dt; proj.y += proj.vy * dt; proj.vy += 0.05 * dt; proj.life--;
          if (Math.abs(proj.x - (p.x + 16)) < 20 && Math.abs(proj.y - (p.y + 18)) < 20 && p.invincible <= 0 && !p.shieldActive) {
            p.health -= 15 + lvl.levelId * 3; p.hurt = 20; p.invincible = 60; p.vy = -6;
            g.damageFlashFrames = 3;
            addShake(g, 8);
            return false;
          }
          return proj.life > 0;
        });

        if (p.x + p.w > boss.x && p.x < boss.x + boss.w && p.y + p.h > boss.y && p.y < boss.y + boss.h && p.invincible <= 0 && !p.shieldActive) {
          p.health -= 20 + lvl.levelId * 3; p.hurt = 20; p.invincible = 60; p.vy = -10;
          p.vx = (p.x < boss.x ? -1 : 1) * 8;
          g.damageFlashFrames = 4;
          addShake(g, 12);
        }

        if (swordBox && boss.alive && swordBox.x + swordBox.w > boss.x && swordBox.x < boss.x + boss.w && swordBox.y + swordBox.h > boss.y && swordBox.y < boss.y + boss.h && p.attacking === p.attackHitFrame) {
          const base = p.attack + (p.charId === 2 ? 5 : 0);
          const baseDmg = p.chargedAttack ? Math.ceil(base * CHARGE_DAMAGE_MULT) : Math.ceil(base * (p.attackDmgMult ?? 1));
          const isCrit = Math.random() < CRITICAL_HIT_CHANCE;
          const dmg = isCrit ? baseDmg * 2 : baseDmg;
          boss.health -= dmg; boss.hit = 10;
          g.damageNumbers.push({ x: boss.x + boss.w / 2, y: boss.y - 15, value: dmg, life: 50, vy: -1.2, critical: isCrit });
          if (boss.health <= boss.maxHealth * 0.5 && !boss.phaseTriggered) {
            boss.phaseTriggered = true;
            g.timeScale = TIME_SCALE_SLOW; g.timeScaleTimer = TIME_SCALE_DURATION;
            addShake(g, 8); g.bossPhaseFlash = 5;
          }
          addShake(g, isCrit || p.chargedAttack ? 10 : 6);
          g.hitStopFrames = HITSTOP_BOSS + (isCrit ? CRITICAL_HITSTOP_EXTRA : 0) + (p.chargedAttack ? 2 : 0);
          const bossParticleCount = isCrit || p.chargedAttack ? 25 : 15;
          for (let i = 0; i < bossParticleCount; i++) g.particles.push(new Particle(boss.x + boss.w / 2, boss.y + boss.h / 2, isCrit ? "#FFD700" : (i % 2 === 0 ? "#FFF" : levelData.accent), (Math.random() - 0.5) * 10, (Math.random() - 0.5) * 10, 25, 5));

          if (boss.health <= 0) {
            boss.alive = false;
            setClearedLevels((prev) => new Set([...prev, lvl.levelId]));
            if (musicOn) g.music.playBossDeath();
            setScore((s) => s + 500 + lvl.levelId * 100);
            addShake(g, 20);
            for (let i = 0; i < 60; i++) g.particles.push(new Particle(boss.x + boss.w / 2, boss.y + boss.h / 2, ["#FF0", "#F80", "#F00", "#FFF", levelData.accent][i % 5], (Math.random() - 0.5) * 15, (Math.random() - 0.5) * 15, 60, 6));
            for (let i = 0; i < 40; i++) g.particles.push(new Particle(boss.x + boss.w / 2, boss.y + boss.h / 2, ["#FFD700", "#FFF", levelData.accent, "#FF6B9D"][i % 4], (Math.random() - 0.5) * 12, (Math.random() - 0.5) * 12 - 4, 50, 4));
            g.victoryFlashFrames = VICTORY_FLASH_FRAMES;
            if (!g.transitioning) {
              g.transitioning = true;
              setTimeout(() => {
                if (!running) return;
                if (lvl.levelId >= 9) { g.music.stop(); setScreen("victory"); }
                else {
                  g.music.stop();
                  setCurrentLevel(lvl.levelId + 1);
                  startGame(lvl.levelId + 1);
                }
              }, 2000);
            }
          }
        }
      }

      // DEATH
      if (p.health <= 0 && !g.transitioning) {
        g.transitioning = true;
        addShake(g, 15 + DEATH_SHAKE_EXTRA);
        g.damageFlashFrames = Math.max(g.damageFlashFrames, 8);
        for (let i = 0; i < 30 + DEATH_PARTICLES_EXTRA; i++) g.particles.push(new Particle(p.x + 16, p.y + 18, "#F00", (Math.random() - 0.5) * 10, (Math.random() - 0.5) * 10, 40, 5));
        setTimeout(() => {
          if (!running) return;
          g.music.stop();
          setScreen("death");
        }, 1000);
      }

      } // end !inHitStop

      // HP bar smooth drain (always update for draw)
      g.displayedHp += (p.health - g.displayedHp) * HP_DRAIN_RATE;
      if (g.ghostHp < g.displayedHp) g.ghostHp = g.displayedHp;
      g.ghostHp += (g.displayedHp - g.ghostHp) * GHOST_HP_RATE;

      // CAMERA (lerp + look-ahead)
      const targetCamX = p.x - CANVAS_W / 3 + p.facing * CAMERA_LOOKAHEAD;
      const targetCamY = p.vy > 2 ? 8 : 0;
      g.camX += (targetCamX - g.camX) * CAMERA_LERP;
      g.camY += (targetCamY - g.camY) * 0.05;
      if (g.camX < 0) g.camX = 0;
      if (g.camX > lvl.width - CANVAS_W) g.camX = lvl.width - CANVAS_W;

      // PARTICLES
      g.particles = g.particles.filter((pt) => { pt.update(); return pt.life > 0; });
      if (g.damageFlashFrames > 0) g.damageFlashFrames--;
      if (g.bossPhaseFlash > 0) g.bossPhaseFlash--;
      if (g.levelTitleTimer > 0) g.levelTitleTimer--;
      if (g.bossIntroTimer > 0) g.bossIntroTimer--;
      if (g.levelIntroLineTimer > 0) g.levelIntroLineTimer--;
      if (g.loreLineTimer > 0) g.loreLineTimer--;

      // Damage numbers update
      g.damageNumbers = g.damageNumbers.filter((d) => {
        d.y += d.vy; d.vy += 0.08; d.life--;
        return d.life > 0;
      });

      // Boss bar smooth drain
      const boss = lvl?.boss;
      if (boss && g.bossActive && boss.alive) {
        g.bossDisplayedHp += (boss.health - g.bossDisplayedHp) * BOSS_HP_DRAIN_RATE;
        if (g.bossGhostHp < g.bossDisplayedHp) g.bossGhostHp = g.bossDisplayedHp;
        g.bossGhostHp += (g.bossDisplayedHp - g.bossGhostHp) * BOSS_GHOST_HP_RATE;
      }
      }

      // RENDER
      const shake = updateShake(g);
      const shakeMult = reduceShake ?? 1;
      ctx.save();
      ctx.translate(shake.x * shakeMult, shake.y * shakeMult);
      if (g.camY !== 0) ctx.translate(0, g.camY);

      drawBackground(ctx, levelData, g.camX, g.frame);
      if (Math.abs(p.vx) > SPEED_LINE_VX_THRESHOLD) {
        ctx.save();
        ctx.strokeStyle = "rgba(255,255,255,0.12)";
        ctx.lineWidth = 1;
        for (let i = 0; i < 12; i++) {
          const sx = (p.x - g.camX) + (i - 6) * 35;
          const sy = p.y + 18 + (i % 3) * 30;
          const len = 15 + (i % 4) * 8;
          const dir = p.vx > 0 ? -1 : 1;
          ctx.beginPath();
          ctx.moveTo(sx, sy);
          ctx.lineTo(sx + len * dir, sy);
          ctx.stroke();
        }
        ctx.restore();
      }
      lvl.platforms.forEach((plat) => drawPlatform(ctx, plat, g.camX, levelData, g.frame));
      lvl.hazards.forEach((haz) => drawHazard(ctx, haz, g.camX, g.frame, levelData));
      lvl.coins.forEach((coin) => drawCoin(ctx, coin, g.camX, g.frame, levelData));
      lvl.hearts.forEach((heart) => drawHeart(ctx, heart, g.camX, g.frame, levelData));
      if (lvl.scrolls) lvl.scrolls.forEach((scroll) => drawScroll(ctx, scroll, g.camX, g.frame, levelData));
      lvl.enemies.forEach((enemy) => drawEnemy(ctx, enemy, g.camX, g.frame, lvl.levelId));
      if (g.bossActive) drawBoss(ctx, boss, g.camX, g.frame, lvl.levelId);
      if (g.slashTrail && g.slashTrail.length > 0) {
        g.slashTrail.forEach((t) => {
          const tx = t.x - g.camX;
          if (tx < -20 || tx > CANVAS_W + 20) return;
          ctx.save();
          ctx.globalAlpha = t.alpha;
          ctx.strokeStyle = CHARACTERS[p.charId]?.accent || "#FFD700";
          ctx.lineWidth = 4;
          ctx.beginPath();
          ctx.moveTo(tx, t.y);
          ctx.lineTo(tx + t.facing * 28, t.y - 4);
          ctx.stroke();
          ctx.restore();
        });
      }
      drawCharacter(ctx, p.x - g.camX, p.y, p.charId, p.facing, p.frame, p.attacking, p.hurt, p.landSquashFrames || 0, p.jumpStretchFrames || 0, p.dodgeRollFrames || 0);

      if (p.shieldActive) {
        ctx.strokeStyle = "#FFD70080"; ctx.lineWidth = 3;
        ctx.shadowColor = "#FFD700"; ctx.shadowBlur = 15;
        ctx.beginPath(); ctx.arc(p.x - g.camX + 16, p.y + 18, 28, 0, Math.PI * 2); ctx.stroke();
        ctx.shadowBlur = 0;
      }

      g.particles.forEach((pt) => pt.draw(ctx, g.camX));
      g.damageNumbers.forEach((d) => {
        const sx = d.x - g.camX;
        if (sx < -30 || sx > CANVAS_W + 30) return;
        ctx.save();
        ctx.globalAlpha = Math.min(1, d.life / 40);
        ctx.fillStyle = d.critical ? "#FFD700" : "#FFF";
        ctx.strokeStyle = d.critical ? "#B8860B" : "#000";
        ctx.lineWidth = d.critical ? 3 : 2;
        ctx.font = d.critical ? "bold 22px monospace" : "bold 16px monospace";
        ctx.textAlign = "center";
        const str = String(d.value) + (d.critical ? "!" : "");
        ctx.strokeText(str, sx, d.y);
        ctx.fillText(str, sx, d.y);
        ctx.restore();
      });
      ctx.restore();

      // Boss phase flash
      if (g.bossPhaseFlash > 0) {
        ctx.fillStyle = `rgba(255,200,100,${g.bossPhaseFlash / 6})`;
        ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
      }

      // Damage flash (full-screen white, screen-space)
      if (g.damageFlashFrames > 0) {
        ctx.fillStyle = `rgba(255,255,255,${g.damageFlashFrames / 4})`;
        ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
      }

      // Victory flash (gold burst when boss dies)
      if (g.victoryFlashFrames > 0) {
        ctx.fillStyle = `rgba(255,215,0,${g.victoryFlashFrames / VICTORY_FLASH_FRAMES * 0.4})`;
        ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
        g.victoryFlashFrames--;
      }

      // Vignette
      const vig = ctx.createRadialGradient(CANVAS_W / 2, CANVAS_H / 2, CANVAS_W * 0.2, CANVAS_W / 2, CANVAS_H / 2, CANVAS_W * 0.8);
      vig.addColorStop(0, "transparent");
      vig.addColorStop(0.6, "transparent");
      vig.addColorStop(1, "rgba(0,0,0,0.45)");
      ctx.fillStyle = vig;
      ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

      // Combo edge glow
      if (g.comboCount >= 3) {
        const comboGlow = Math.min(0.35, (g.comboCount - 2) * 0.08);
        ctx.strokeStyle = `rgba(255,215,0,${comboGlow})`;
        ctx.lineWidth = 12;
        ctx.strokeRect(6, 6, CANVAS_W - 12, CANVAS_H - 12);
      }

      // HUD (smooth drain + ghost bar)
      ctx.fillStyle = "#00000080"; ctx.fillRect(10, 10, 204, 24);
      ctx.fillStyle = "#333"; ctx.fillRect(12, 12, 200, 20);
      const ghostPct = Math.max(0, Math.min(1, g.ghostHp / p.maxHealth));
      const displayPct = Math.max(0, Math.min(1, g.displayedHp / p.maxHealth));
      ctx.fillStyle = "#660000";
      ctx.fillRect(12, 12, 200 * ghostPct, 20);
      ctx.fillStyle = displayPct > 0.5 ? "#4CAF50" : displayPct > 0.25 ? "#FF9800" : "#F44336";
      ctx.fillRect(12, 12, 200 * displayPct, 20);
      ctx.strokeStyle = "#FFF"; ctx.lineWidth = 1; ctx.strokeRect(12, 12, 200, 20);
      if (displayPct <= LOW_HP_THRESHOLD && displayPct > 0) {
        const pulse = 0.3 + 0.2 * Math.sin(g.frame * 0.2);
        ctx.strokeStyle = `rgba(255,0,0,${pulse})`;
        ctx.lineWidth = 3;
        ctx.strokeRect(10, 8, 208, 28);
        ctx.strokeStyle = "#FFF";
        ctx.lineWidth = 1;
      }
      ctx.fillStyle = "#FFF"; ctx.font = "bold 13px monospace";
      ctx.fillText(`HP: ${Math.max(0, Math.ceil(p.health))}/${p.maxHealth}`, 20, 27);

      ctx.fillStyle = "#FFD700"; ctx.font = "bold 16px monospace";
      ctx.fillText(`★ ${score}`, CANVAS_W - 120, 28);
      ctx.fillStyle = "#FF6B6B"; ctx.fillText(`♥ x${lives}`, CANVAS_W - 120, 52);

      // Attack type selector (1 2 3)
      ctx.font = "bold 12px monospace";
      const atY = 42;
      [0, 1, 2].forEach((i) => {
        const label = ATTACK_TYPES[i].name.charAt(0);
        const sel = p.attackType === i;
        ctx.fillStyle = sel ? CHARACTERS[p.charId]?.accent ?? "#FFD700" : "#666";
        ctx.fillText(`${i + 1}:${label}`, 12 + i * 52, atY);
        if (sel) {
          ctx.strokeStyle = CHARACTERS[p.charId]?.accent ?? "#FFD700";
          ctx.lineWidth = 2;
          ctx.strokeRect(10 + i * 52, atY - 12, 32, 14);
          ctx.lineWidth = 1;
        }
      });
      // Special cooldown gauge (for attack type 3)
      const gaugeX = 12;
      const gaugeY = 58;
      const gaugeW = 120;
      const gaugeH = 8;
      ctx.fillStyle = "#00000099";
      ctx.fillRect(gaugeX, gaugeY, gaugeW + 4, gaugeH + 4);
      ctx.fillStyle = "#333";
      ctx.fillRect(gaugeX + 2, gaugeY + 2, gaugeW, gaugeH);
      const specialReady = 1 - (p.specialCooldown / (p.specialCooldownMax || 1));
      ctx.fillStyle = specialReady >= 1 ? "#4CAF50" : "#555";
      ctx.fillRect(gaugeX + 2, gaugeY + 2, gaugeW * Math.max(0, specialReady), gaugeH);
      ctx.strokeStyle = "#FFF";
      ctx.lineWidth = 1;
      ctx.strokeRect(gaugeX + 2, gaugeY + 2, gaugeW, gaugeH);
      ctx.fillStyle = "#AAA";
      ctx.font = "10px monospace";
      ctx.fillText("Special", gaugeX + 4, gaugeY + gaugeH + 14);

      if (g.levelTitleTimer > 0) {
        const t = LEVEL_TITLE_DURATION - g.levelTitleTimer;
        const alpha = Math.min(1, t / 25);
        const scale = 0.85 + 0.15 * Math.min(1, t / 40);
        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.translate(CANVAS_W / 2, 24);
        ctx.scale(scale, scale);
        ctx.translate(-CANVAS_W / 2, -24);
        ctx.fillStyle = "#FFF";
        ctx.font = "14px monospace";
        ctx.textAlign = "center";
        ctx.fillText(`Level ${lvl.levelId + 1}: ${levelData.name}`, CANVAS_W / 2, 24);
        ctx.restore();
        ctx.textAlign = "left";
      }

      if (g.levelIntroLineTimer > 0) {
        const alpha = Math.min(1, g.levelIntroLineTimer / 30);
        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.fillStyle = "#FFF";
        ctx.font = "12px monospace";
        ctx.textAlign = "center";
        ctx.fillText(LEVEL_INTRO_LINES[lvl.levelId] ?? "The path awaits.", CANVAS_W / 2, 48);
        ctx.restore();
        ctx.textAlign = "left";
      }

      if (g.bossIntroTimer > 0) {
        const alpha = Math.min(1, g.bossIntroTimer / 20, (150 - g.bossIntroTimer) / 25);
        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.fillStyle = levelData.accent;
        ctx.font = "bold 18px monospace";
        ctx.textAlign = "center";
        ctx.fillText(levelData.bossName ?? "Boss", CANVAS_W / 2, CANVAS_H / 2 - 20);
        ctx.fillStyle = "#FFF";
        ctx.font = "12px monospace";
        ctx.fillText(levelData.bossLine ?? "", CANVAS_W / 2, CANVAS_H / 2 + 4);
        ctx.restore();
        ctx.textAlign = "left";
      }

      if (g.loreLineTimer > 0 && g.loreLine) {
        const alpha = Math.min(1, g.loreLineTimer / 20, (180 - g.loreLineTimer) / 20);
        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.fillStyle = "#FFD700";
        ctx.font = "11px monospace";
        ctx.textAlign = "center";
        const wrap = g.loreLine.length > 50 ? g.loreLine.slice(0, 47) + "..." : g.loreLine;
        ctx.fillText(wrap, CANVAS_W / 2, CANVAS_H - 70);
        ctx.restore();
        ctx.textAlign = "left";
      }

      // Progress bar (level progress)
      const progress = Math.max(0, Math.min(1, p.x / lvl.width));
      ctx.fillStyle = "#00000080";
      ctx.fillRect(0, CANVAS_H - 6, CANVAS_W, 6);
      ctx.fillStyle = levelData.accent;
      ctx.fillRect(0, CANVAS_H - 6, CANVAS_W * progress, 6);
      ctx.strokeStyle = "#FFF";
      ctx.lineWidth = 1;
      ctx.strokeRect(0, CANVAS_H - 6, CANVAS_W, 6);

      if (g.comboCount > 1) {
        ctx.fillStyle = "#FFD700"; ctx.font = `bold ${16 + g.comboCount * 2}px monospace`;
        ctx.textAlign = "center"; ctx.fillText(`${g.comboCount}x COMBO!`, CANVAS_W / 2, 70); ctx.textAlign = "left";
      }

      if (g.bossActive && lvl.boss.alive) {
        const b = lvl.boss;
        const bossGhostPct = Math.max(0, Math.min(1, g.bossGhostHp / b.maxHealth));
        const bossDisplayPct = Math.max(0, Math.min(1, g.bossDisplayedHp / b.maxHealth));
        ctx.fillStyle = "#000000AA"; ctx.fillRect(CANVAS_W / 2 - 152, CANVAS_H - 40, 304, 28);
        ctx.fillStyle = "#333"; ctx.fillRect(CANVAS_W / 2 - 150, CANVAS_H - 38, 300, 24);
        ctx.fillStyle = "#660000";
        ctx.fillRect(CANVAS_W / 2 - 150, CANVAS_H - 38, 300 * bossGhostPct, 24);
        ctx.fillStyle = "#D50000";
        ctx.fillRect(CANVAS_W / 2 - 150, CANVAS_H - 38, 300 * bossDisplayPct, 24);
        ctx.strokeStyle = "#FFD700"; ctx.lineWidth = 2; ctx.strokeRect(CANVAS_W / 2 - 150, CANVAS_H - 38, 300, 24);
        ctx.fillStyle = "#FFF"; ctx.font = "bold 14px monospace"; ctx.textAlign = "center";
        ctx.fillText(b.name, CANVAS_W / 2, CANVAS_H - 22); ctx.textAlign = "left";
      }

      if (g.levelTimer < 300) {
        ctx.globalAlpha = Math.max(0, 1 - g.levelTimer / 300);
        ctx.fillStyle = "#FFF"; ctx.font = "12px monospace"; ctx.textAlign = "center";
        ctx.fillText("← → Move | ↑ Jump | 1/2/3 Attack | Z Strike | Shift Dodge roll" + (selectedChar === 5 ? " | X Shield" : ""), CANVAS_W / 2, CANVAS_H - 60);
        ctx.textAlign = "left"; ctx.globalAlpha = 1;
      }

      if (paused) {
        ctx.fillStyle = "rgba(0,0,0,0.7)";
        ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
        ctx.fillStyle = "#FFD700";
        ctx.font = "bold 28px monospace";
        ctx.textAlign = "center";
        ctx.fillText("PAUSED", CANVAS_W / 2, CANVAS_H / 2 - 50);
        ctx.fillStyle = "#FFF";
        ctx.font = "14px monospace";
        ctx.fillText("ESC Resume  |  R Restart Level  |  Q Quit to Title", CANVAS_W / 2, CANVAS_H / 2);
        ctx.textAlign = "left";
      }

      requestAnimationFrame(gameLoop);
    };

    requestAnimationFrame(gameLoop);
    return () => { running = false; };
  }, [screen, selectedChar, score, lives, musicOn, initPlayer, paused, setPaused, reduceShake, startGame, sfxVolume]);

  useEffect(() => {
    const g = gameRef.current;
    if (!musicOn) g.music.stop();
    else if (screen === "game" && g.level) g.music.start(g.level.levelId);
  }, [musicOn, screen]);

  // ============================================================
  // RENDER UI
  // ============================================================
  const titleGradient = "linear-gradient(135deg, #0a0a2e 0%, #1a0a3e 30%, #2a1a4e 60%, #0a1a3e 100%)";

  if (screen === "title") {
    return (
      <div style={{ width: CANVAS_W, height: CANVAS_H, margin: "0 auto", background: titleGradient, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", fontFamily: "'Courier New', monospace", position: "relative", overflow: "hidden", borderRadius: 8, border: "2px solid #FFD70040" }}>
        <div style={{ position: "absolute", inset: 0, overflow: "hidden", pointerEvents: "none" }}>
          {Array.from({ length: 30 }, (_, i) => (
            <div key={i} style={{ position: "absolute", left: `${(i * 37) % 100}%`, top: `${(i * 53) % 100}%`, width: 2 + (i % 3), height: 2 + (i % 3), background: ["#FFD700", "#FF6B9D", "#4A90D9", "#7CFC00"][i % 4], borderRadius: "50%", opacity: 0.3 + (i % 5) * 0.1, animation: `float ${3 + (i % 4)}s ease-in-out infinite alternate`, animationDelay: `${i * 0.2}s` }} />
          ))}
        </div>
        <style>{`
          @keyframes float { from { transform: translateY(0px); } to { transform: translateY(-20px); } }
          @keyframes pulse { 0%, 100% { text-shadow: 0 0 20px #FFD700, 0 0 40px #FFD70060; } 50% { text-shadow: 0 0 40px #FFD700, 0 0 80px #FFD700; } }
          @keyframes slideUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
          @keyframes swordSwing { 0% { transform: rotate(-30deg); } 50% { transform: rotate(30deg); } 100% { transform: rotate(-30deg); } }
        `}</style>
        <div style={{ fontSize: 14, color: "#FFD700", letterSpacing: 8, marginBottom: 8, opacity: 0.7, animation: "slideUp 0.8s ease" }}>⚔ PRESENTS ⚔</div>
        <h1 style={{ fontSize: 52, color: "#FFF", margin: 0, letterSpacing: 4, animation: "pulse 3s ease-in-out infinite", textShadow: "0 0 20px #FFD700, 0 0 40px #FFD70060, 0 4px 8px rgba(0,0,0,0.5)" }}>BLADE QUEST</h1>
        <div style={{ fontSize: 16, color: "#AAA", marginTop: 8, letterSpacing: 3, animation: "slideUp 1s ease" }}>─── CHRONICLES OF THE FALLEN REALMS ───</div>
        <div style={{ fontSize: 48, marginTop: 24, animation: "swordSwing 2s ease-in-out infinite", filter: "drop-shadow(0 0 8px #FFD700)" }}>⚔️</div>
        <button onClick={() => setScreen("select")} style={{ marginTop: 32, padding: "14px 48px", fontSize: 20, background: "linear-gradient(180deg, #FFD700, #FF8C00)", border: "2px solid #FFD700", borderRadius: 4, color: "#1a0a00", fontWeight: "bold", cursor: "pointer", fontFamily: "'Courier New', monospace", letterSpacing: 3, animation: "slideUp 1.2s ease", transition: "all 0.2s", boxShadow: "0 0 20px #FFD70040, 0 4px 12px rgba(0,0,0,0.4)" }} onMouseEnter={(e) => { e.target.style.transform = "scale(1.05)"; e.target.style.boxShadow = "0 0 30px #FFD70080"; }} onMouseLeave={(e) => { e.target.style.transform = "scale(1)"; e.target.style.boxShadow = "0 0 20px #FFD70040, 0 4px 12px rgba(0,0,0,0.4)"; }}>BEGIN QUEST</button>
        <div style={{ position: "absolute", bottom: 16, color: "#666", fontSize: 12, letterSpacing: 2 }}>10 REALMS • 6 HEROES • ENDLESS GLORY</div>
        <button onClick={() => setMusicOn(!musicOn)} style={{ position: "absolute", top: 12, right: 12, background: "none", border: "1px solid #FFD70040", borderRadius: 4, color: musicOn ? "#FFD700" : "#666", fontSize: 20, cursor: "pointer", padding: "4px 8px" }}>{musicOn ? "🔊" : "🔇"}</button>
      </div>
    );
  }

  if (screen === "select") {
    return (
      <div style={{ width: CANVAS_W, height: CANVAS_H, margin: "0 auto", background: titleGradient, display: "flex", flexDirection: "column", alignItems: "center", fontFamily: "'Courier New', monospace", position: "relative", overflow: "auto", borderRadius: 8, border: "2px solid #FFD70040" }}>
        <style>{`@keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }`}</style>
        <h2 style={{ color: "#FFD700", fontSize: 24, marginTop: 20, letterSpacing: 4, textShadow: "0 0 10px #FFD70060" }}>CHOOSE YOUR HERO</h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16, padding: "16px 32px", maxWidth: 720 }}>
          {CHARACTERS.map((c, i) => (
            <div key={c.id} onClick={() => setSelectedChar(c.id)} onMouseEnter={() => setHoveredChar(i)} onMouseLeave={() => setHoveredChar(null)} style={{ background: selectedChar === c.id ? `linear-gradient(135deg, ${c.color}40, ${c.accent}30)` : "#ffffff08", border: `2px solid ${selectedChar === c.id ? c.accent : hoveredChar === i ? c.color + "80" : "#ffffff15"}`, borderRadius: 8, padding: "16px 14px", cursor: "pointer", transition: "all 0.25s", transform: selectedChar === c.id ? "scale(1.03)" : hoveredChar === i ? "scale(1.01)" : "scale(1)", animation: `fadeIn ${0.3 + i * 0.1}s ease`, boxShadow: selectedChar === c.id ? `0 0 20px ${c.accent}30` : "none" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                <span style={{ fontSize: 28 }}>{c.icon}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ color: c.accent, fontWeight: "bold", fontSize: 16, letterSpacing: 1 }}>{c.name}{c.title ? ` ${c.title}` : ""}</div>
                  <div style={{ color: "#999", fontSize: 11, fontStyle: "italic" }}>{c.desc}</div>
                  {c.quote && (selectedChar === c.id || hoveredChar === i) && (
                    <div style={{ color: c.accent + "dd", fontSize: 10, marginTop: 6, fontStyle: "italic" }}>{c.quote}</div>
                  )}
                  {c.personality && selectedChar === c.id && (
                    <div style={{ color: "#AAA", fontSize: 10, marginTop: 4, lineHeight: 1.35 }}>{c.personality}</div>
                  )}
                </div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "4px 12px", fontSize: 11, color: "#CCC" }}>
                <div>SPD <span style={{ color: c.accent }}>{"█".repeat(Math.round(c.speed))}{"░".repeat(6 - Math.round(c.speed))}</span></div>
                <div>JMP <span style={{ color: c.accent }}>{"█".repeat(Math.round(Math.abs(c.jump) - 9))}{"░".repeat(4 - Math.round(Math.abs(c.jump) - 9))}</span></div>
                <div>HP  <span style={{ color: c.accent }}>{"█".repeat(Math.round(c.health / 28))}{"░".repeat(5 - Math.round(c.health / 28))}</span></div>
                <div>ATK <span style={{ color: c.accent }}>{"█".repeat(Math.round(c.attack / 5))}{"░".repeat(5 - Math.round(c.attack / 5))}</span></div>
              </div>
            </div>
          ))}
        </div>
        <h2 style={{ color: "#FFD700", fontSize: 20, marginTop: 8, letterSpacing: 3, textShadow: "0 0 8px #FFD70060" }}>CHOOSE REALM</h2>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, justifyContent: "center", padding: "0 24px 16px", maxWidth: 720 }}>
          {LEVELS.map((lvl, i) => (
            <button key={lvl.id} onClick={() => setCurrentLevel(i)} style={{ padding: "8px 14px", fontSize: 12, background: currentLevel === i ? `linear-gradient(135deg, ${lvl.accent}50, ${lvl.platform}60)` : "#ffffff0c", border: `2px solid ${currentLevel === i ? lvl.accent : "#ffffff20"}`, borderRadius: 6, color: currentLevel === i ? "#FFF" : "#AAA", cursor: "pointer", fontFamily: "'Courier New', monospace", letterSpacing: 1, transition: "all 0.2s", boxShadow: currentLevel === i ? `0 0 12px ${lvl.accent}40` : "none" }}>
              {i + 1}. {lvl.name}{clearedLevels.has(i) ? " ✓" : ""}
            </button>
          ))}
        </div>
        <div style={{ display: "flex", gap: 16, marginTop: 4, marginBottom: 20 }}>
          <button onClick={() => setScreen("title")} style={{ padding: "10px 28px", fontSize: 14, background: "transparent", border: "1px solid #FFD70060", borderRadius: 4, color: "#FFD700", cursor: "pointer", fontFamily: "'Courier New', monospace", letterSpacing: 2 }}>← BACK</button>
          <button onClick={() => startGame(currentLevel)} style={{ padding: "10px 36px", fontSize: 16, background: "linear-gradient(180deg, #FFD700, #FF8C00)", border: "2px solid #FFD700", borderRadius: 4, color: "#1a0a00", fontWeight: "bold", cursor: "pointer", fontFamily: "'Courier New', monospace", letterSpacing: 2, boxShadow: "0 0 15px #FFD70040" }}>ENTER REALM →</button>
        </div>
        <button onClick={() => setMusicOn(!musicOn)} style={{ position: "absolute", top: 12, right: 12, background: "none", border: "1px solid #FFD70040", borderRadius: 4, color: musicOn ? "#FFD700" : "#666", fontSize: 20, cursor: "pointer", padding: "4px 8px" }}>{musicOn ? "🔊" : "🔇"}</button>
      </div>
    );
  }

  if (screen === "game") {
    return (
      <div style={{ width: CANVAS_W, height: CANVAS_H, margin: "0 auto", position: "relative" }}>
        <canvas ref={canvasRef} width={CANVAS_W} height={CANVAS_H} style={{ display: "block", borderRadius: 8, border: "2px solid #FFD70040" }} />
        <button onClick={() => setMusicOn(!musicOn)} style={{ position: "absolute", top: 12, right: 12, background: "#00000060", border: "1px solid #FFD70040", borderRadius: 4, color: musicOn ? "#FFD700" : "#666", fontSize: 18, cursor: "pointer", padding: "2px 6px", zIndex: 10 }}>{musicOn ? "🔊" : "🔇"}</button>
      </div>
    );
  }

  if (screen === "levelComplete") {
    const nextLvl = LEVELS[currentLevel];
    return (
      <div style={{ width: CANVAS_W, height: CANVAS_H, margin: "0 auto", background: titleGradient, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", fontFamily: "'Courier New', monospace", borderRadius: 8, border: "2px solid #FFD70040" }}>
        <style>{`@keyframes glow { 0%,100% { text-shadow: 0 0 20px #4CAF50; } 50% { text-shadow: 0 0 40px #4CAF50, 0 0 60px #4CAF5060; } }`}</style>
        <div style={{ fontSize: 48, marginBottom: 16 }}>⚔️</div>
        <h2 style={{ color: "#4CAF50", fontSize: 32, margin: 0, letterSpacing: 4, animation: "glow 2s infinite" }}>REALM CONQUERED!</h2>
        <div style={{ color: "#FFD700", fontSize: 20, marginTop: 16 }}>Score: {score}</div>
        <div style={{ color: "#AAA", marginTop: 12, fontSize: 14 }}>Lives remaining: {"♥ ".repeat(lives)}</div>
        <div style={{ color: nextLvl?.accent || "#FFF", marginTop: 20, fontSize: 18, letterSpacing: 2 }}>Next: {nextLvl?.name || "???"}</div>
        <button onClick={() => startGame(currentLevel)} style={{ marginTop: 28, padding: "12px 40px", fontSize: 18, background: "linear-gradient(180deg, #FFD700, #FF8C00)", border: "2px solid #FFD700", borderRadius: 4, color: "#1a0a00", fontWeight: "bold", cursor: "pointer", fontFamily: "'Courier New', monospace", letterSpacing: 3, boxShadow: "0 0 20px #FFD70040" }}>CONTINUE →</button>
      </div>
    );
  }

  if (screen === "death") {
    const levelName = LEVELS[currentLevel]?.name ?? "Unknown";
    return (
      <div style={{ width: CANVAS_W, height: CANVAS_H, margin: "0 auto", background: "linear-gradient(135deg, #1a0000, #2a0a0a, #1a0000)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", fontFamily: "'Courier New', monospace", borderRadius: 8, border: "2px solid #F4433640" }}>
        <style>{`@keyframes shake { 0%,100% { transform: translateX(0); } 25% { transform: translateX(-3px); } 75% { transform: translateX(3px); } }`}</style>
        <div style={{ fontSize: 56, marginBottom: 8 }}>💀</div>
        <h1 style={{ color: "#F44336", fontSize: 42, margin: 0, letterSpacing: 6, animation: "shake 0.5s ease", textShadow: "0 0 20px #F4433660" }}>YOU DIED</h1>
        <p style={{ color: "#BBB", fontSize: 16, marginTop: 16, letterSpacing: 2 }}>Your quest ends here...</p>
        <div style={{ color: "#FFD700", fontSize: 18, marginTop: 20 }}>Score: {score}</div>
        <div style={{ color: "#999", fontSize: 14, marginTop: 4 }}>Level {currentLevel + 1} — {levelName}</div>
        <div style={{ display: "flex", gap: 20, marginTop: 40 }}>
          <button onClick={() => { setLives(3); startGame(currentLevel); }} style={{ padding: "14px 36px", fontSize: 18, background: "linear-gradient(180deg, #F44336, #D32F2F)", border: "2px solid #F44336", borderRadius: 4, color: "#FFF", fontWeight: "bold", cursor: "pointer", fontFamily: "'Courier New', monospace", letterSpacing: 3, boxShadow: "0 0 20px #F4433640" }}>RETRY LEVEL</button>
          <button onClick={() => { setScore(0); setLives(3); setCurrentLevel(0); setScreen("title"); }} style={{ padding: "14px 36px", fontSize: 18, background: "transparent", border: "2px solid #666", borderRadius: 4, color: "#AAA", cursor: "pointer", fontFamily: "'Courier New', monospace", letterSpacing: 3 }}>QUIT</button>
        </div>
      </div>
    );
  }

  if (screen === "victory") {
    return (
      <div style={{ width: CANVAS_W, height: CANVAS_H, margin: "0 auto", background: "linear-gradient(135deg, #0a1a0a, #1a3a1a, #0a2a0a)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", fontFamily: "'Courier New', monospace", borderRadius: 8, border: "2px solid #FFD70060", position: "relative", overflow: "hidden" }}>
        <style>{`
          @keyframes victoryGlow { 0%,100% { text-shadow: 0 0 30px #FFD700, 0 0 60px #FFD70060; } 50% { text-shadow: 0 0 60px #FFD700, 0 0 120px #FFD700; } }
          @keyframes confetti { 0% { transform: translateY(-20px) rotate(0deg); opacity: 1; } 100% { transform: translateY(600px) rotate(720deg); opacity: 0; } }
        `}</style>
        {Array.from({ length: 20 }, (_, i) => (
          <div key={i} style={{ position: "absolute", left: `${(i * 47) % 100}%`, top: -20, width: 8, height: 8, borderRadius: i % 2 ? "50%" : 0, background: ["#FFD700", "#FF6B9D", "#4A90D9", "#7CFC00", "#E040FB"][i % 5], animation: `confetti ${2 + (i % 3)}s linear infinite`, animationDelay: `${i * 0.15}s` }} />
        ))}
        <div style={{ fontSize: 64, marginBottom: 12 }}>👑</div>
        <h2 style={{ color: "#FFD700", fontSize: 40, margin: 0, letterSpacing: 6, animation: "victoryGlow 2s infinite" }}>VICTORY!</h2>
        <div style={{ color: "#FFF", fontSize: 16, marginTop: 12, letterSpacing: 2 }}>All 10 realms have been conquered!</div>
        <div style={{ color: "#FFD700", fontSize: 24, marginTop: 16 }}>Final Score: {score}</div>
        <div style={{ color: "#AAA", marginTop: 8, fontSize: 14 }}>Hero: {CHARACTERS[selectedChar].name} {CHARACTERS[selectedChar].icon}</div>
        <button onClick={() => { setScore(0); setLives(3); setCurrentLevel(0); setScreen("title"); }} style={{ marginTop: 28, padding: "12px 40px", fontSize: 18, background: "linear-gradient(180deg, #FFD700, #FF8C00)", border: "2px solid #FFD700", borderRadius: 4, color: "#1a0a00", fontWeight: "bold", cursor: "pointer", fontFamily: "'Courier New', monospace", letterSpacing: 3, boxShadow: "0 0 20px #FFD70040" }}>PLAY AGAIN</button>
      </div>
    );
  }

  return null;
}
