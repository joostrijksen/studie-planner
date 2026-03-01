'use client';

import { useEffect, useRef, useState, useCallback } from 'react';

type Props = {
  onGameOver: (score: number) => void;
  onClose: () => void;
};

type Invader = {
  x: number;
  y: number;
  alive: boolean;
  type: 0 | 1 | 2;
};

type Bullet = {
  x: number;
  y: number;
  active: boolean;
};

type EnemyBullet = {
  x: number;
  y: number;
  active: boolean;
};

type Particle = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  color: string;
};

const COLS = 11;
const ROWS = 5;
const INVADER_W = 36;
const INVADER_H = 28;
const GAP_X = 14;
const GAP_Y = 18;
const CANVAS_W = 700;
const CANVAS_H = 520;
const PLAYER_W = 52;
const PLAYER_H = 28;
const BULLET_SPEED = 9;
const ENEMY_BULLET_SPEED = 8;
const PLAYER_SPEED = 6;

export default function SpaceInvadersGame({ onGameOver, onClose }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stateRef = useRef({
    player: { x: CANVAS_W / 2, y: CANVAS_H - 55 },
    invaders: [] as Invader[],
    bullet: null as Bullet | null,
    enemyBullets: [] as EnemyBullet[],
    particles: [] as Particle[],
    score: 0,
    lives: 3,
    keys: {} as Record<string, boolean>,
    invaderDir: 1,
    invaderSpeed: 1.4,
    invaderTick: 0,
    invaderMoveInterval: 20,
    gameOver: false,
    won: false,
    wave: 1,
    enemyShootTimer: 0,
    enemyShootInterval: 45,
    started: false,
    shield: [] as { x: number; y: number; hp: number }[],
    animFrame: 0,
  });

  const [displayScore, setDisplayScore] = useState(0);
  const [displayLives, setDisplayLives] = useState(3);
  const [gameState, setGameState] = useState<'start' | 'playing' | 'over'>('start');
  const [displayWave, setDisplayWave] = useState(1);
  const rafRef = useRef<number>(0);

  function initWave(wave: number) {
    const s = stateRef.current;
    const startX = 60;
    // Elke 5 waves zakken de invaders iets lager in
    const startY = 50 + Math.min(wave - 1, 8) * 4;
    s.invaders = [];
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        s.invaders.push({
          x: startX + c * (INVADER_W + GAP_X),
          y: startY + r * (INVADER_H + GAP_Y),
          alive: true,
          type: r === 0 ? 2 : r <= 2 ? 1 : 0,
        });
      }
    }
    s.invaderDir = 1;
    // Snelheid blijft stijgen maar heeft een maximum
    s.invaderSpeed = Math.min(4.5, 1.4 + (wave - 1) * 0.25);
    s.invaderMoveInterval = Math.max(4, 20 - (wave - 1) * 2);
    // Vijanden schieten steeds vaker
    s.enemyShootInterval = Math.max(12, 45 - (wave - 1) * 6);
    s.bullet = null;
    s.enemyBullets = [];

    // Shields
    s.shield = [];
    const shieldPositions = [120, 240, 360, 480, 600];
    for (const sx of shieldPositions) {
      for (let dx = 0; dx < 4; dx++) {
        for (let dy = 0; dy < 3; dy++) {
          s.shield.push({ x: sx + dx * 12, y: CANVAS_H - 120 + dy * 12, hp: 3 });
        }
      }
    }
  }

  function spawnParticles(x: number, y: number, color: string, count = 12) {
    const s = stateRef.current;
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 1.5 + Math.random() * 3.5;
      s.particles.push({
        x, y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 1,
        maxLife: 0.4 + Math.random() * 0.6,
        color,
      });
    }
  }

  const startGame = useCallback(() => {
    const s = stateRef.current;
    s.player = { x: CANVAS_W / 2, y: CANVAS_H - 55 };
    s.score = 0;
    s.lives = 3;
    s.gameOver = false;
    s.won = false;
    s.wave = 1;
    s.particles = [];
    s.started = true;
    s.animFrame = 0;
    initWave(1);
    setDisplayScore(0);
    setDisplayLives(3);
    setDisplayWave(1);
    setGameState('playing');
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      stateRef.current.keys[e.code] = e.type === 'keydown';
      if (e.code === 'Space') e.preventDefault();
    };
    window.addEventListener('keydown', onKey);
    window.addEventListener('keyup', onKey);
    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('keyup', onKey);
    };
  }, []);

  useEffect(() => {
    if (gameState !== 'playing') return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d')!;

    function drawInvader(ctx: CanvasRenderingContext2D, x: number, y: number, type: number, frame: number) {
      const cx = x + INVADER_W / 2;
      const cy = y + INVADER_H / 2;
      ctx.save();

      if (type === 2) {
        // Top row - UFO style
        ctx.fillStyle = '#ff6bff';
        ctx.shadowColor = '#ff6bff';
        ctx.shadowBlur = 8;
        // Body
        ctx.beginPath();
        ctx.ellipse(cx, cy, 14, 9, 0, 0, Math.PI * 2);
        ctx.fill();
        // Dome
        ctx.beginPath();
        ctx.ellipse(cx, cy - 7, 8, 6, 0, 0, Math.PI * 2);
        ctx.fill();
        // Legs
        const legOff = frame % 2 === 0 ? 3 : -3;
        ctx.fillRect(cx - 14, cy + 5, 5, 6 + legOff);
        ctx.fillRect(cx + 9, cy + 5, 5, 6 - legOff);
        // Eyes
        ctx.fillStyle = '#1a0033';
        ctx.beginPath();
        ctx.arc(cx - 5, cy - 1, 2.5, 0, Math.PI * 2);
        ctx.arc(cx + 5, cy - 1, 2.5, 0, Math.PI * 2);
        ctx.fill();
      } else if (type === 1) {
        // Mid rows - crab style
        ctx.fillStyle = '#00ffcc';
        ctx.shadowColor = '#00ffcc';
        ctx.shadowBlur = 8;
        ctx.fillRect(cx - 10, cy - 8, 20, 14);
        // Claws
        const clawOff = frame % 2 === 0 ? 2 : 0;
        ctx.fillRect(cx - 16, cy - 4 + clawOff, 7, 6);
        ctx.fillRect(cx + 9, cy - 4 - clawOff, 7, 6);
        // Eyes
        ctx.fillStyle = '#003322';
        ctx.fillRect(cx - 7, cy - 5, 4, 4);
        ctx.fillRect(cx + 3, cy - 5, 4, 4);
        // Antennae
        ctx.fillStyle = '#00ffcc';
        ctx.fillRect(cx - 8, cy - 13, 3, 6);
        ctx.fillRect(cx + 5, cy - 13, 3, 6);
      } else {
        // Bottom rows - squid style
        ctx.fillStyle = '#ffdd00';
        ctx.shadowColor = '#ffdd00';
        ctx.shadowBlur = 8;
        // Body
        ctx.beginPath();
        ctx.arc(cx, cy - 2, 11, 0, Math.PI * 2);
        ctx.fill();
        // Tentacles
        const tOff = frame % 2 === 0 ? 3 : -3;
        ctx.fillRect(cx - 12, cy + 6, 4, 5 + tOff);
        ctx.fillRect(cx - 4, cy + 6, 4, 5 - tOff);
        ctx.fillRect(cx + 4, cy + 6, 4, 5 + tOff);
        ctx.fillRect(cx + 8, cy + 6, 4, 5 - tOff);
        // Eyes
        ctx.fillStyle = '#1a1a00';
        ctx.beginPath();
        ctx.arc(cx - 4, cy - 4, 2.5, 0, Math.PI * 2);
        ctx.arc(cx + 4, cy - 4, 2.5, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }

    function drawPlayer(ctx: CanvasRenderingContext2D, x: number, y: number) {
      ctx.save();
      ctx.fillStyle = '#4dffb4';
      ctx.shadowColor = '#4dffb4';
      ctx.shadowBlur = 12;
      // Base
      ctx.fillRect(x - PLAYER_W / 2, y + 8, PLAYER_W, 14);
      // Gun barrel
      ctx.fillRect(x - 5, y, 10, 14);
      // Wings
      ctx.beginPath();
      ctx.moveTo(x - PLAYER_W / 2, y + 8);
      ctx.lineTo(x - PLAYER_W / 2 + 12, y + 8);
      ctx.lineTo(x - 20, y + 22);
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(x + PLAYER_W / 2, y + 8);
      ctx.lineTo(x + PLAYER_W / 2 - 12, y + 8);
      ctx.lineTo(x + 20, y + 22);
      ctx.fill();
      ctx.restore();
    }

    function drawBackground(ctx: CanvasRenderingContext2D, frame: number) {
      // Deep space gradient
      const grad = ctx.createLinearGradient(0, 0, 0, CANVAS_H);
      grad.addColorStop(0, '#00000f');
      grad.addColorStop(1, '#050520');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

      // Stars
      ctx.fillStyle = 'white';
      const stars = [
        [45, 30], [120, 80], [200, 20], [310, 60], [430, 15],
        [520, 45], [620, 30], [680, 75], [90, 140], [350, 110],
        [500, 130], [150, 200], [620, 180], [30, 250], [400, 240],
        [660, 300], [250, 350], [580, 400], [70, 420], [480, 460],
      ];
      for (const [sx, sy] of stars) {
        const twinkle = 0.4 + 0.6 * Math.abs(Math.sin(frame * 0.02 + sx));
        ctx.globalAlpha = twinkle;
        ctx.fillRect(sx, sy, 2, 2);
      }
      ctx.globalAlpha = 1;
    }

    function loop() {
      const s = stateRef.current;
      if (s.gameOver || s.won) return;

      s.animFrame++;
      const frame = s.animFrame;

      // --- Input ---
      // Beweging met shield collision — alle richtingen
      // Helper: check of player overlapt met een shield block
      function playerHitsShield(nx: number, ny: number): { hit: boolean; blockIdx: number } {
        const px1 = nx - PLAYER_W / 2, px2 = nx + PLAYER_W / 2;
        const py1 = ny, py2 = ny + PLAYER_H;
        for (let i = 0; i < s.shield.length; i++) {
          const b = s.shield[i];
          if (b.hp <= 0) continue;
          if (px2 > b.x && px1 < b.x + 10 && py2 > b.y && py1 < b.y + 10) {
            return { hit: true, blockIdx: i };
          }
        }
        return { hit: false, blockIdx: -1 };
      }

      if (s.keys['ArrowUp'] || s.keys['KeyW']) {
        const ny = Math.max(CANVAS_H / 2, s.player.y - PLAYER_SPEED);
        const { hit, blockIdx } = playerHitsShield(s.player.x, ny);
        if (hit) {
          s.shield[blockIdx].hp--;
          spawnParticles(s.shield[blockIdx].x + 5, s.shield[blockIdx].y + 5, '#888', 4);
        } else {
          s.player.y = ny;
        }
      }
      if (s.keys['ArrowDown'] || s.keys['KeyS']) {
        const ny = Math.min(CANVAS_H - 32, s.player.y + PLAYER_SPEED);
        const { hit, blockIdx } = playerHitsShield(s.player.x, ny);
        if (hit) {
          s.shield[blockIdx].hp--;
          spawnParticles(s.shield[blockIdx].x + 5, s.shield[blockIdx].y + 5, '#888', 4);
        } else {
          s.player.y = ny;
        }
      }
      if (s.keys['ArrowLeft'] || s.keys['KeyA']) {
        const nx = Math.max(PLAYER_W / 2, s.player.x - PLAYER_SPEED);
        const { hit, blockIdx } = playerHitsShield(nx, s.player.y);
        if (hit) {
          s.shield[blockIdx].hp--;
          spawnParticles(s.shield[blockIdx].x + 5, s.shield[blockIdx].y + 5, '#888', 4);
        } else {
          s.player.x = nx;
        }
      }
      if (s.keys['ArrowRight'] || s.keys['KeyD']) {
        const nx = Math.min(CANVAS_W - PLAYER_W / 2, s.player.x + PLAYER_SPEED);
        const { hit, blockIdx } = playerHitsShield(nx, s.player.y);
        if (hit) {
          s.shield[blockIdx].hp--;
          spawnParticles(s.shield[blockIdx].x + 5, s.shield[blockIdx].y + 5, '#888', 4);
        } else {
          s.player.x = nx;
        }
      }
      if (s.keys['Space'] && !s.bullet) {
        s.bullet = { x: s.player.x, y: s.player.y, active: true };
      }

      // --- Bullet ---
      if (s.bullet) {
        s.bullet.y -= BULLET_SPEED;
        if (s.bullet.y < 0) s.bullet = null;
      }

      // --- Invader movement ---
      s.invaderTick++;
      if (s.invaderTick >= s.invaderMoveInterval) {
        s.invaderTick = 0;
        const alive = s.invaders.filter(i => i.alive);
        if (alive.length === 0) return;

        const rightmost = Math.max(...alive.map(i => i.x + INVADER_W));
        const leftmost = Math.min(...alive.map(i => i.x));

        let drop = false;
        if (s.invaderDir === 1 && rightmost >= CANVAS_W - 10) drop = true;
        if (s.invaderDir === -1 && leftmost <= 10) drop = true;

        if (drop) {
          s.invaders.forEach(i => { if (i.alive) i.y += 20; });
          s.invaderDir *= -1;
        } else {
          const step = s.invaderSpeed * s.invaderMoveInterval * 0.4;
          s.invaders.forEach(i => { if (i.alive) i.x += s.invaderDir * step; });
        }
      }

      // --- Enemy shooting ---
      s.enemyShootTimer++;
      if (s.enemyShootTimer >= s.enemyShootInterval) {
        s.enemyShootTimer = 0;
        const alive = s.invaders.filter(i => i.alive);
        if (alive.length > 0) {
          const shooter = alive[Math.floor(Math.random() * alive.length)];
          s.enemyBullets.push({
            x: shooter.x + INVADER_W / 2,
            y: shooter.y + INVADER_H,
            active: true,
          });
        }
      }

      // --- Enemy bullets ---
      s.enemyBullets = s.enemyBullets.filter(b => {
        b.y += ENEMY_BULLET_SPEED;
        if (b.y > CANVAS_H) return false;

        // Hit player
        if (
          b.x > s.player.x - PLAYER_W / 2 &&
          b.x < s.player.x + PLAYER_W / 2 &&
          b.y > s.player.y &&
          b.y < s.player.y + PLAYER_H
        ) {
          spawnParticles(s.player.x, s.player.y + 14, '#4dffb4', 20);
          s.lives--;
          setDisplayLives(s.lives);
          if (s.lives <= 0) {
            s.gameOver = true;
            setGameState('over');
            onGameOver(s.score);
          }
          return false;
        }

        // Hit shield
        for (const block of s.shield) {
          if (block.hp > 0 && b.x > block.x && b.x < block.x + 10 && b.y > block.y && b.y < block.y + 10) {
            block.hp--;
            spawnParticles(block.x + 5, block.y + 5, '#888', 4);
            return false;
          }
        }

        return true;
      });

      // --- Bullet hits ---
      if (s.bullet) {
        // Hit invader
        for (const inv of s.invaders) {
          if (!inv.alive) continue;
          if (
            s.bullet.x > inv.x && s.bullet.x < inv.x + INVADER_W &&
            s.bullet.y > inv.y && s.bullet.y < inv.y + INVADER_H
          ) {
            inv.alive = false;
            s.bullet = null;
            const pts = inv.type === 2 ? 30 : inv.type === 1 ? 20 : 10;
            s.score += pts;
            setDisplayScore(s.score);
            const color = inv.type === 2 ? '#ff6bff' : inv.type === 1 ? '#00ffcc' : '#ffdd00';
            spawnParticles(inv.x + INVADER_W / 2, inv.y + INVADER_H / 2, color);
            break;
          }
        }

        // Hit shield
        if (s.bullet) {
          for (const block of s.shield) {
            if (block.hp > 0 && s.bullet.x > block.x && s.bullet.x < block.x + 10 &&
              s.bullet.y > block.y && s.bullet.y < block.y + 10) {
              block.hp--;
              spawnParticles(block.x + 5, block.y + 5, '#888', 4);
              s.bullet = null;
              break;
            }
          }
        }
      }

      // --- Check win (endless) ---
      if (s.invaders.every(i => !i.alive)) {
        s.wave++;
        setDisplayWave(s.wave);
        const waveBonus = s.wave * 50;
        s.score += waveBonus;
        setDisplayScore(s.score);
        initWave(s.wave);
      }

      // --- Check invaders reaching bottom ---
      for (const inv of s.invaders) {
        if (inv.alive && inv.y + INVADER_H > CANVAS_H - 60) {
          s.gameOver = true;
          setGameState('over');
          onGameOver(s.score);
          return;
        }
      }

      // --- Particles ---
      s.particles = s.particles.filter(p => {
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.08;
        p.life -= 0.035 / p.maxLife;
        return p.life > 0;
      });

      // --- DRAW ---
      drawBackground(ctx, frame);

      // Ground line
      ctx.strokeStyle = '#4dffb4';
      ctx.globalAlpha = 0.3;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, CANVAS_H - 32);
      ctx.lineTo(CANVAS_W, CANVAS_H - 32);
      ctx.stroke();
      ctx.globalAlpha = 1;

      // Shields
      for (const block of s.shield) {
        if (block.hp <= 0) continue;
        const alpha = block.hp / 3;
        ctx.globalAlpha = alpha * 0.85;
        ctx.fillStyle = '#4dffb4';
        ctx.shadowColor = '#4dffb4';
        ctx.shadowBlur = 4;
        ctx.fillRect(block.x, block.y, 10, 10);
        ctx.shadowBlur = 0;
        ctx.globalAlpha = 1;
      }

      // Invaders
      const animFrame2 = Math.floor(frame / 20) % 2;
      for (const inv of s.invaders) {
        if (inv.alive) drawInvader(ctx, inv.x, inv.y, inv.type, animFrame2);
      }

      // Player bullet
      if (s.bullet) {
        ctx.fillStyle = '#ffffff';
        ctx.shadowColor = '#ffffff';
        ctx.shadowBlur = 10;
        ctx.fillRect(s.bullet.x - 2, s.bullet.y - 12, 4, 14);
        ctx.shadowBlur = 0;
      }

      // Enemy bullets
      for (const b of s.enemyBullets) {
        ctx.fillStyle = '#ff4466';
        ctx.shadowColor = '#ff4466';
        ctx.shadowBlur = 8;
        ctx.fillRect(b.x - 2, b.y, 4, 12);
        ctx.shadowBlur = 0;
      }

      // Player
      drawPlayer(ctx, s.player.x, s.player.y);

      // Particles
      for (const p of s.particles) {
        ctx.globalAlpha = p.life;
        ctx.fillStyle = p.color;
        ctx.shadowColor = p.color;
        ctx.shadowBlur = 6;
        ctx.fillRect(p.x - 2, p.y - 2, 4, 4);
        ctx.shadowBlur = 0;
      }
      ctx.globalAlpha = 1;

      // HUD
      ctx.font = 'bold 14px monospace';
      ctx.fillStyle = '#4dffb4';
      ctx.shadowColor = '#4dffb4';
      ctx.shadowBlur = 6;
      ctx.fillText(`SCORE: ${s.score}`, 16, 22);
      ctx.fillText(`WAVE: ${s.wave}`, CANVAS_W / 2 - 30, 22);
      ctx.fillText(`LIVES: ${'♥'.repeat(s.lives)}`, CANVAS_W - 120, 22);
      ctx.shadowBlur = 0;

      rafRef.current = requestAnimationFrame(loop);
    }

    rafRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafRef.current);
  }, [gameState]);

  // Touch/mouse controls
  const handleTouchMove = (e: React.TouchEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const touch = e.touches[0];
    const scaleX = CANVAS_W / rect.width;
    stateRef.current.player.x = Math.max(PLAYER_W / 2,
      Math.min(CANVAS_W - PLAYER_W / 2, (touch.clientX - rect.left) * scaleX));
  };

  const handleTouchStart = () => {
    if (!stateRef.current.bullet) {
      stateRef.current.bullet = {
        x: stateRef.current.player.x,
        y: stateRef.current.player.y,
        active: true
      };
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.92)' }}
    >
      <div className="flex flex-col items-center gap-4">
        {/* Header */}
        <div className="flex items-center justify-between w-full px-2">
          <div style={{ fontFamily: 'monospace', color: '#4dffb4', fontSize: 22, fontWeight: 'bold', textShadow: '0 0 12px #4dffb4' }}>
            👾 SPACE INVADERS
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              border: '1px solid #ff4466',
              color: '#ff4466',
              borderRadius: 6,
              padding: '4px 14px',
              fontFamily: 'monospace',
              cursor: 'pointer',
              fontSize: 13,
            }}
          >
            ✕ SLUITEN
          </button>
        </div>

        {/* Canvas */}
        <div style={{ position: 'relative' }}>
          <canvas
            ref={canvasRef}
            width={CANVAS_W}
            height={CANVAS_H}
            style={{
              border: '2px solid #4dffb4',
              borderRadius: 8,
              boxShadow: '0 0 30px #4dffb488',
              display: 'block',
              maxWidth: '95vw',
              maxHeight: '70vh',
              imageRendering: 'pixelated',
            }}
            onTouchMove={handleTouchMove}
            onTouchStart={handleTouchStart}
          />

          {/* Start screen */}
          {gameState === 'start' && (
            <div style={{
              position: 'absolute', inset: 0,
              display: 'flex', flexDirection: 'column',
              alignItems: 'center', justifyContent: 'center',
              background: 'rgba(0,0,5,0.88)',
              borderRadius: 6,
            }}>
              <div style={{ fontSize: 52, marginBottom: 12 }}>👾</div>
              <div style={{ fontFamily: 'monospace', color: '#4dffb4', fontSize: 28, fontWeight: 'bold', textShadow: '0 0 16px #4dffb4', marginBottom: 8 }}>
                SPACE INVADERS
              </div>
              <div style={{ fontFamily: 'monospace', color: '#aaa', fontSize: 13, marginBottom: 28, textAlign: 'center', lineHeight: 1.8 }}>
                ← → ↑ ↓ of WASD om te bewegen<br />
                SPATIE om te schieten<br /><br />
                <span style={{ color: '#ffdd00' }}>🟡 10 pts</span> &nbsp;
                <span style={{ color: '#00ffcc' }}>🟢 20 pts</span> &nbsp;
                <span style={{ color: '#ff6bff' }}>🟣 30 pts</span>
              </div>
              <button
                onClick={startGame}
                style={{
                  background: '#4dffb4',
                  color: '#000',
                  border: 'none',
                  borderRadius: 8,
                  padding: '12px 40px',
                  fontFamily: 'monospace',
                  fontSize: 18,
                  fontWeight: 'bold',
                  cursor: 'pointer',
                  boxShadow: '0 0 20px #4dffb4',
                }}
              >
                ▶ START SPEL
              </button>
            </div>
          )}

          {/* Game over screen */}
          {gameState === 'over' && (
            <div style={{
              position: 'absolute', inset: 0,
              display: 'flex', flexDirection: 'column',
              alignItems: 'center', justifyContent: 'center',
              background: 'rgba(0,0,5,0.90)',
              borderRadius: 6,
            }}>
              <div style={{ fontSize: 48, marginBottom: 8 }}>💥</div>
              <div style={{ fontFamily: 'monospace', color: '#ff4466', fontSize: 30, fontWeight: 'bold', textShadow: '0 0 16px #ff4466', marginBottom: 12 }}>
                GAME OVER
              </div>
              <div style={{ fontFamily: 'monospace', color: '#4dffb4', fontSize: 22, marginBottom: 28, textShadow: '0 0 10px #4dffb4' }}>
                Score: {displayScore}
              </div>
              <button
                onClick={startGame}
                style={{
                  background: '#4dffb4',
                  color: '#000',
                  border: 'none',
                  borderRadius: 8,
                  padding: '12px 36px',
                  fontFamily: 'monospace',
                  fontSize: 16,
                  fontWeight: 'bold',
                  cursor: 'pointer',
                  boxShadow: '0 0 20px #4dffb4',
                }}
              >
                🔄 OPNIEUW
              </button>
            </div>
          )}


        </div>

        {/* Controls hint */}
        <div style={{ fontFamily: 'monospace', color: '#555', fontSize: 12 }}>
          ← → ↑ ↓ bewegen &nbsp;|&nbsp; SPATIE schieten &nbsp;|&nbsp; Oneindig waves, 3 levens
        </div>
      </div>
    </div>
  );
}
