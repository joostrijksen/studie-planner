'use client';

import { useEffect, useRef, useState } from 'react';

// ─── Types ────────────────────────────────────────────────────────────────────

type ParatrooperGameProps = {
  onGameOver: (score: number) => void;
  onClose: () => void;
};

type Helicopter = {
  id: number;
  x: number;
  y: number;
  speed: number;
  direction: 1 | -1;
  dropInterval: number;
  dropTimer: number;
  exploding: boolean;
  explodeTimer: number;
};

type Paratrooper = {
  id: number;
  x: number;
  y: number;
  side: 'left' | 'right';
  phase: 'falling' | 'walking' | 'stacking';
  chute: boolean;
  stackIndex: number;
  exploding: boolean;
  explodeTimer: number;
};

type Bullet = {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
};

type Explosion = {
  id: number;
  x: number;
  y: number;
  timer: number;
  size: number;
};

type PowerUpKind = 'rapid' | 'bomb' | 'slow';

type PowerUp = {
  id: number;
  kind: PowerUpKind;
  x: number;
  y: number;
  vy: number;
};

// ─── Constants ────────────────────────────────────────────────────────────────

const GAME_WIDTH         = 800;
const GAME_HEIGHT        = 500;
const GROUND_Y           = GAME_HEIGHT - 60;
const CANNON_BASE_Y      = GROUND_Y - 30;
const CANNON_X           = GAME_WIDTH / 2;
const TROOPER_H          = 24;
const WALK_SPEED         = 0.7;
const CANNON_REACH       = 55;
const STACK_GAME_OVER_COUNT = 5;
const POWERUP_DROP_CHANCE   = 0.35; // 35% kans bij neerschieten heli
const POWERUP_DURATION      = 6000; // ms

const POWERUP_COLORS: Record<PowerUpKind, { bg: string; border: string; label: string }> = {
  rapid: { bg: '#b45309', border: '#fcd34d', label: '🔥' },
  bomb:  { bg: '#7c3aed', border: '#a78bfa', label: '💣' },
  slow:  { bg: '#0e7490', border: '#67e8f9', label: '❄️' },
};

let nextId = 0;
const getId = () => ++nextId;

// ─── Component ────────────────────────────────────────────────────────────────

export default function ParatrooperGame({ onGameOver, onClose }: ParatrooperGameProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [score, setScore]         = useState(0);
  const [wave, setWave]           = useState(1);
  const [gameOver, setGameOver]   = useState(false);
  const [paused, setPaused]       = useState(false);
  const [activeBonus, setActiveBonus] = useState<PowerUpKind | null>(null);

  const pausedRef   = useRef(false);
  const gameOverRef = useRef(false);

  useEffect(() => { pausedRef.current = paused; }, [paused]);
  useEffect(() => { gameOverRef.current = gameOver; }, [gameOver]);

  const g = useRef({
    helicopters:   [] as Helicopter[],
    paratroopers:  [] as Paratrooper[],
    bullets:       [] as Bullet[],
    explosions:    [] as Explosion[],
    powerUps:      [] as PowerUp[],
    cannonAngle:   0,
    shootCooldown: 0,
    score:         0,
    wave:          1,
    keys:          new Set<string>(),
    animationId:   0,
    gameOverSent:  false,
    // Power-up state
    rapidUntil:    0,  // ms timestamp
    slowUntil:     0,
  });

  // ── Helpers ────────────────────────────────────────────────────────────────

  function addExplosion(x: number, y: number, size = 24) {
    g.current.explosions.push({ id: getId(), x, y, timer: 20, size });
  }

  function shoot() {
    const game = g.current;
    const cooldown = Date.now() < game.rapidUntil ? 3 : 12;
    if (game.shootCooldown > 0) return;
    const rad = (game.cannonAngle * Math.PI) / 180;
    const spd = 14;
    game.bullets.push({
      id: getId(),
      x: CANNON_X,
      y: CANNON_BASE_Y - 30,
      vx: Math.sin(rad) * spd,
      vy: -Math.cos(rad) * spd,
    });
    game.shootCooldown = cooldown;
  }

  function spawnWave(waveNum: number) {
    const count = Math.min(1 + waveNum, 7);
    for (let i = 0; i < count; i++) {
      const dir: 1 | -1 = i % 2 === 0 ? 1 : -1;
      g.current.helicopters.push({
        id: getId(),
        x: dir === 1 ? -90 : GAME_WIDTH + 90,
        y: 50 + Math.random() * 130,
        speed: 0.7 + waveNum * 0.15,
        direction: dir,
        dropInterval: Math.max(90, 260 - waveNum * 14),
        dropTimer: Math.floor(Math.random() * 80),
        exploding: false,
        explodeTimer: 0,
      });
    }
  }

  function maybeDropPowerUp(x: number, y: number) {
    if (Math.random() > POWERUP_DROP_CHANCE) return;
    const kinds: PowerUpKind[] = ['rapid', 'bomb', 'slow'];
    const kind = kinds[Math.floor(Math.random() * kinds.length)];
    g.current.powerUps.push({ id: getId(), kind, x, y, vy: 1.5 });
  }

  function applyPowerUp(kind: PowerUpKind) {
    const game = g.current;
    const now = Date.now();

    if (kind === 'rapid') {
      game.rapidUntil = now + POWERUP_DURATION;
      setActiveBonus('rapid');
      setTimeout(() => setActiveBonus(b => b === 'rapid' ? null : b), POWERUP_DURATION);
    }

    if (kind === 'slow') {
      game.slowUntil = now + POWERUP_DURATION;
      setActiveBonus('slow');
      setTimeout(() => setActiveBonus(b => b === 'slow' ? null : b), POWERUP_DURATION);
    }

    if (kind === 'bomb') {
      // Vernietig alle vallende paratroopers
      let killed = 0;
      for (const p of game.paratroopers) {
        if (p.phase === 'falling' && !p.exploding) {
          p.exploding = true;
          p.explodeTimer = 0;
          addExplosion(p.x, p.y, 20);
          killed++;
        }
      }
      game.score += killed * 5;
      setScore(game.score);
      setActiveBonus('bomb');
      setTimeout(() => setActiveBonus(b => b === 'bomb' ? null : b), 800);
    }
  }

  function getStackCount(side: 'left' | 'right'): number {
    return g.current.paratroopers.filter(
      p => p.side === side && p.phase === 'stacking' && !p.exploding
    ).length;
  }

  // ── Draw power-up pill ─────────────────────────────────────────────────────

  function drawPowerUp(ctx: CanvasRenderingContext2D, p: PowerUp) {
    const { bg, border, label } = POWERUP_COLORS[p.kind];
    ctx.save();
    ctx.shadowColor = border;
    ctx.shadowBlur = 10;
    ctx.fillStyle = bg;
    ctx.beginPath();
    ctx.roundRect(p.x - 14, p.y - 14, 28, 28, 6);
    ctx.fill();
    ctx.strokeStyle = border;
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.shadowBlur = 0;
    ctx.font = '16px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(label, p.x, p.y);
    ctx.restore();
  }

  // ── Draw ───────────────────────────────────────────────────────────────────

  function draw(ctx: CanvasRenderingContext2D, now: number) {
    const W = GAME_WIDTH;
    const H = GAME_HEIGHT;
    const game = g.current;
    const slowActive = now < game.slowUntil;
    const rapidActive = now < game.rapidUntil;

    // Sky — blauwer als slow actief
    const skyColor = slowActive ? '#031428' : '#03070f';
    const sky = ctx.createLinearGradient(0, 0, 0, GROUND_Y);
    sky.addColorStop(0, skyColor);
    sky.addColorStop(1, '#0a1628');
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, W, H);

    // Stars
    ctx.fillStyle = 'rgba(255,255,255,0.55)';
    for (let i = 0; i < 70; i++) {
      ctx.fillRect((i * 137.5) % W, (i * 97.3) % (GROUND_Y - 20), 1, 1);
    }

    // Ground
    const gnd = ctx.createLinearGradient(0, GROUND_Y, 0, H);
    gnd.addColorStop(0, '#1a2f1a');
    gnd.addColorStop(1, '#0d1a0d');
    ctx.fillStyle = gnd;
    ctx.fillRect(0, GROUND_Y, W, H - GROUND_Y);

    ctx.strokeStyle = '#2d5a2d';
    ctx.lineWidth = 2;
    ctx.shadowColor = '#3a7a3a';
    ctx.shadowBlur = 8;
    ctx.beginPath();
    ctx.moveTo(0, GROUND_Y);
    ctx.lineTo(W, GROUND_Y);
    ctx.stroke();
    ctx.shadowBlur = 0;

    // Helicopters
    for (const h of game.helicopters) {
      ctx.save();
      ctx.translate(h.x, h.y);
      if (h.direction === -1) ctx.scale(-1, 1);
      if (h.exploding) ctx.globalAlpha = 1 - h.explodeTimer / 30;
      // Blauw tintje als slow actief
      ctx.fillStyle = slowActive ? '#3a5c8a' : '#4a7c59';
      ctx.beginPath();
      ctx.ellipse(0, 0, 32, 12, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = slowActive ? '#7eb3cf' : '#7ecfb3';
      ctx.beginPath();
      ctx.ellipse(-10, -2, 12, 8, -0.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = slowActive ? '#2a3c5a' : '#3a5c42';
      ctx.fillRect(20, -4, 20, 6);
      const rot = (now / 80) % (Math.PI * 2);
      ctx.strokeStyle = slowActive ? '#7eb3cf' : '#a0d4b8';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(Math.cos(rot) * -38, Math.sin(rot) * 3 - 14);
      ctx.lineTo(Math.cos(rot) * 38, Math.sin(rot) * -3 - 14);
      ctx.stroke();
      ctx.strokeStyle = '#2a3c2a';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(-15, 12); ctx.lineTo(-15, 20);
      ctx.moveTo(15, 12);  ctx.lineTo(15, 20);
      ctx.moveTo(-20, 20); ctx.lineTo(20, 20);
      ctx.stroke();
      ctx.globalAlpha = 1;
      ctx.restore();
    }

    // Paratroopers
    for (const p of game.paratroopers) {
      ctx.save();
      ctx.translate(p.x, p.y);
      if (p.exploding) ctx.globalAlpha = Math.max(0, 1 - p.explodeTimer / 25);

      if (p.chute && p.phase === 'falling') {
        ctx.fillStyle = 'rgba(200,230,201,0.25)';
        ctx.strokeStyle = '#c8e6c9';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(0, -28, 18, Math.PI, 0);
        ctx.fill();
        ctx.stroke();
        ctx.strokeStyle = 'rgba(200,230,201,0.5)';
        ctx.lineWidth = 0.5;
        ctx.beginPath();
        ctx.moveTo(-18, -28); ctx.lineTo(-4, 0);
        ctx.moveTo(0, -46);   ctx.lineTo(0, 0);
        ctx.moveTo(18, -28);  ctx.lineTo(4, 0);
        ctx.stroke();
      }

      const color = p.phase === 'stacking' ? '#cc2200'
        : p.phase === 'walking' ? '#778866'
        : '#556b2f';
      ctx.fillStyle = color;

      const headR = p.phase === 'stacking' ? 4 : 5;
      ctx.beginPath();
      ctx.arc(0, -8, headR, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillRect(-3, -4, 6, 9);

      if (p.phase === 'walking') {
        const t = (now / 150) % (Math.PI * 2);
        ctx.fillRect(-4 + Math.sin(t) * 2, 5, 3, 7);
        ctx.fillRect(1  - Math.sin(t) * 2, 5, 3, 7);
      } else {
        ctx.fillRect(-4, 5, 3, 7);
        ctx.fillRect(1,  5, 3, 7);
      }

      if (p.phase === 'stacking') {
        ctx.fillRect(-7, -3, 3, 5);
        ctx.fillRect(4,  -3, 3, 5);
      }

      ctx.globalAlpha = 1;
      ctx.restore();
    }

    // Power-ups (vallend)
    for (const p of game.powerUps) {
      drawPowerUp(ctx, p);
    }

    // Bullets — oranje als rapid actief
    for (const b of game.bullets) {
      ctx.save();
      ctx.fillStyle = rapidActive ? '#ff6600' : '#ffe066';
      ctx.shadowColor = rapidActive ? '#ff6600' : '#ffe066';
      ctx.shadowBlur = rapidActive ? 12 : 8;
      ctx.beginPath();
      ctx.arc(b.x, b.y, rapidActive ? 4 : 3, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.restore();
    }

    // Explosions
    for (const e of game.explosions) {
      const t = 1 - e.timer / 20;
      ctx.save();
      ctx.globalAlpha = 1 - t;
      ctx.translate(e.x, e.y);
      ctx.strokeStyle = '#ff9900';
      ctx.lineWidth = 3;
      ctx.shadowColor = '#ff6600';
      ctx.shadowBlur = 20;
      ctx.beginPath();
      ctx.arc(0, 0, e.size * t, 0, Math.PI * 2);
      ctx.stroke();
      ctx.fillStyle = '#ffff99';
      ctx.beginPath();
      ctx.arc(0, 0, e.size * t * 0.4, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.globalAlpha = 1;
      ctx.restore();
    }

    // Cannon
    ctx.save();
    ctx.translate(CANNON_X, CANNON_BASE_Y);
    ctx.fillStyle = '#2a4a2a';
    ctx.beginPath();
    ctx.ellipse(-18, 12, 8, 8, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(18, 12, 8, 8, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = rapidActive ? '#6a9a3a' : '#3a6a3a';
    ctx.shadowColor = rapidActive ? '#aaff44' : '#3a7a3a';
    ctx.shadowBlur = rapidActive ? 16 : 10;
    ctx.fillRect(-26, 0, 52, 12);
    ctx.fillStyle = rapidActive ? '#5aaa4a' : '#4a9a4a';
    ctx.beginPath();
    ctx.arc(0, 0, 16, 0, Math.PI * 2);
    ctx.fill();
    ctx.rotate((game.cannonAngle * Math.PI) / 180);
    ctx.fillStyle = rapidActive ? '#6aba5a' : '#5ab05a';
    ctx.fillRect(-5, -50, 10, 36);
    ctx.fillStyle = rapidActive ? '#8aca7a' : '#7acc7a';
    ctx.fillRect(-6, -54, 12, 8);
    ctx.shadowBlur = 0;
    ctx.restore();

    // Actieve bonus indicator (rechtsonder in canvas)
    if (now < game.rapidUntil || now < game.slowUntil) {
      const remaining = now < game.rapidUntil
        ? Math.ceil((game.rapidUntil - now) / 1000)
        : Math.ceil((game.slowUntil - now) / 1000);
      const kind: PowerUpKind = now < game.rapidUntil ? 'rapid' : 'slow';
      const { border, label } = POWERUP_COLORS[kind];

      ctx.save();
      ctx.fillStyle = 'rgba(0,0,0,0.5)';
      ctx.beginPath();
      ctx.roundRect(W - 80, H - 44, 70, 30, 6);
      ctx.fill();
      ctx.strokeStyle = border;
      ctx.lineWidth = 1.5;
      ctx.stroke();
      ctx.font = '14px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(`${label} ${remaining}s`, W - 45, H - 29);
      ctx.restore();
    }
  }

  // ── Main game loop ─────────────────────────────────────────────────────────

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const game = g.current;

    game.helicopters  = [];
    game.paratroopers = [];
    game.bullets      = [];
    game.explosions   = [];
    game.powerUps     = [];
    game.cannonAngle  = 0;
    game.shootCooldown = 0;
    game.score        = 0;
    game.wave         = 1;
    game.gameOverSent = false;
    game.rapidUntil   = 0;
    game.slowUntil    = 0;

    setScore(0);
    setWave(1);
    setActiveBonus(null);
    setPaused(false);
    pausedRef.current = false;
    setGameOver(false);
    gameOverRef.current = false;

    spawnWave(1);

    const onKeyDown = (e: KeyboardEvent) => {
      game.keys.add(e.key);
      if ([' ', 'ArrowUp', 'ArrowLeft', 'ArrowRight'].includes(e.key)) e.preventDefault();
      if (e.key === 'p' || e.key === 'P') {
        setPaused(prev => { const next = !prev; pausedRef.current = next; return next; });
      }
    };
    const onKeyUp = (e: KeyboardEvent) => game.keys.delete(e.key);

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);

    function step() {
      game.animationId = requestAnimationFrame(step);
      if (!canvas || !ctx) return;
      if (pausedRef.current || gameOverRef.current) return;

      const now = Date.now();
      const slowActive = now < game.slowUntil;
      const speedMul = slowActive ? 0.4 : 1;

      // Input
      if (game.keys.has('ArrowLeft')  || game.keys.has('a')) game.cannonAngle = Math.max(-85, game.cannonAngle - 2.5);
      if (game.keys.has('ArrowRight') || game.keys.has('d')) game.cannonAngle = Math.min(85,  game.cannonAngle + 2.5);
      if (game.keys.has(' ') || game.keys.has('ArrowUp')) shoot();
      if (game.shootCooldown > 0) game.shootCooldown--;

      // Helicopters
      game.helicopters = game.helicopters.filter(h => {
        if (h.exploding) { h.explodeTimer++; return h.explodeTimer < 30; }
        h.x += h.speed * h.direction * speedMul;
        h.dropTimer++;
        if (h.dropTimer >= h.dropInterval) {
          h.dropTimer = 0;
          game.paratroopers.push({
            id: getId(),
            x: Math.max(20, Math.min(GAME_WIDTH - 20, h.x)),
            y: h.y + 20,
            side: h.x < CANNON_X ? 'left' : 'right',
            phase: 'falling',
            chute: true,
            stackIndex: -1,
            exploding: false,
            explodeTimer: 0,
          });
        }
        if (h.direction === 1  && h.x > GAME_WIDTH + 120) return false;
        if (h.direction === -1 && h.x < -120)             return false;
        return true;
      });

      if (game.helicopters.length === 0) {
        game.wave++;
        setWave(game.wave);
        spawnWave(game.wave);
      }

      // Paratroopers
      for (const p of game.paratroopers) {
        if (p.exploding) { p.explodeTimer++; continue; }

        if (p.phase === 'falling') {
          p.y += (p.chute ? 1.2 : 3) * speedMul;
          if (p.chute && p.y > GROUND_Y - 80) p.chute = false;
          if (p.y >= GROUND_Y - TROOPER_H) {
            p.y = GROUND_Y - TROOPER_H;
            p.phase = 'walking';
          }
        } else if (p.phase === 'walking') {
          const targetX = p.side === 'left' ? CANNON_X - CANNON_REACH : CANNON_X + CANNON_REACH;
          p.x += p.side === 'left'
            ? Math.min(WALK_SPEED, targetX - p.x)
            : Math.max(-WALK_SPEED, targetX - p.x);
          if (Math.abs(p.x - targetX) < 1) {
            p.x = targetX;
            const currentCount = game.paratroopers.filter(
              q => q !== p && q.side === p.side && q.phase === 'stacking' && !q.exploding
            ).length;
            p.stackIndex = currentCount;
            p.y = GROUND_Y - TROOPER_H - p.stackIndex * TROOPER_H;
            p.phase = 'stacking';
          }
        }
      }

      // Herbereken stapelposities
      for (const side of ['left', 'right'] as const) {
        const stackers = game.paratroopers
          .filter(p => p.side === side && p.phase === 'stacking' && !p.exploding)
          .sort((a, b) => a.stackIndex - b.stackIndex);
        stackers.forEach((p, i) => {
          p.stackIndex = i;
          p.y = GROUND_Y - TROOPER_H - i * TROOPER_H;
        });
      }

      // Game over check
      for (const side of ['left', 'right'] as const) {
        if (getStackCount(side) >= STACK_GAME_OVER_COUNT && !game.gameOverSent) {
          game.gameOverSent = true;
          setGameOver(true);
          gameOverRef.current = true;
          onGameOver(game.score);
          return;
        }
      }

      // Power-ups vallen
      game.powerUps = game.powerUps.filter(p => {
        p.y += p.vy;
        // Verdwijnt als hij de grond raakt
        if (p.y > GROUND_Y + 20) return false;
        return true;
      });

      // Bullets
      game.bullets = game.bullets.filter(b => {
        b.x += b.vx;
        b.y += b.vy;
        if (b.x < 0 || b.x > GAME_WIDTH || b.y < 0 || b.y > GAME_HEIGHT) return false;

        // Raak power-up
        for (const p of game.powerUps) {
          if (Math.abs(b.x - p.x) < 16 && Math.abs(b.y - p.y) < 16) {
            applyPowerUp(p.kind);
            addExplosion(p.x, p.y, 20);
            p.y = GAME_HEIGHT + 99; // markeer voor verwijdering
            return false;
          }
        }
        game.powerUps = game.powerUps.filter(p => p.y < GAME_HEIGHT + 50);

        // Raak helikopter
        for (const h of game.helicopters) {
          if (h.exploding) continue;
          if (Math.abs(b.x - h.x) < 36 && Math.abs(b.y - h.y) < 18) {
            h.exploding = true;
            addExplosion(h.x, h.y, 40);
            maybeDropPowerUp(h.x, h.y);
            game.score += 15 + game.wave * 5;
            setScore(game.score);
            return false;
          }
        }

        // Raak paratrooper — alleen 'falling'
        for (const p of game.paratroopers) {
          if (p.exploding || p.phase !== 'falling') continue;
          const hitY = p.y - TROOPER_H / 2;
          if (Math.abs(b.x - p.x) < 10 && Math.abs(b.y - hitY) < TROOPER_H) {
            p.exploding = true;
            addExplosion(p.x, p.y, 18);
            game.score += 5;
            setScore(game.score);
            return false;
          }
        }

        return true;
      });

      // Verwijder geëxplodeerde paratroopers
      game.paratroopers = game.paratroopers.filter(p => !(p.exploding && p.explodeTimer >= 25));
      game.explosions   = game.explosions.filter(e => { e.timer--; return e.timer > 0; });

      draw(ctx, now);
    }

    game.animationId = requestAnimationFrame(step);

    return () => {
      cancelAnimationFrame(game.animationId);
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ─── UI ───────────────────────────────────────────────────────────────────

  const bonusLabel = activeBonus ? POWERUP_COLORS[activeBonus].label : null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
      <div className="bg-gray-900 rounded-xl p-6 max-w-4xl w-full mx-4">

        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-6">
            <span className="text-lg font-bold text-green-400 font-mono">Wave: {wave}</span>
            <span className="text-lg font-bold text-yellow-400 font-mono">Score: {score}</span>
            {bonusLabel && (
              <span className="text-lg font-mono animate-pulse">{bonusLabel} actief</span>
            )}
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-white text-2xl">✕</button>
        </div>

        <canvas
          ref={canvasRef}
          width={GAME_WIDTH}
          height={GAME_HEIGHT}
          className="rounded-lg w-full"
          style={{ maxHeight: '70vh', border: '1px solid rgba(74,222,128,0.3)' }}
        />

        <div className="mt-3 text-center text-sm text-gray-400 font-mono">
          {paused && '⏸️ GEPAUZEERD (P) | '}
          {!paused && !gameOver && '← → draaien  ·  SPATIE schieten  ·  P pauze'}
          <div className="mt-1 text-xs text-gray-600">
            Bonussen vallen uit helikopters: 🔥 rapid fire · 💣 bom · ❄️ slow motion
          </div>
        </div>

        {gameOver && (
          <div className="mt-4 text-center">
            <div className="text-2xl font-bold text-red-400 font-mono mb-2">GAME OVER 💥</div>
            <div className="text-gray-400 font-mono text-sm mb-1">Ze hebben je kanon bereikt!</div>
            <div className="text-xl text-gray-300 font-mono mb-1">Wave bereikt: {wave}</div>
            <div className="text-xl text-yellow-400 font-mono mb-4">Eindscore: {score}</div>
            <button
              onClick={onClose}
              className="px-6 py-3 bg-green-700 text-white rounded-lg hover:bg-green-600 font-mono"
            >
              Sluiten
            </button>
          </div>
        )}

      </div>
    </div>
  );
}
