'use client';

import { useEffect, useRef, useState } from 'react';

// ─── Types ────────────────────────────────────────────────────────────────────

type BreakoutGameProps = {
  onGameOver: (score: number) => void;
  onClose: () => void;
};

type Brick = {
  x: number;
  y: number;
  width: number;
  height: number;
  visible: boolean;
  hits: number;
  maxHits: number;
  color: string;
  indestructible: boolean;
  dropRoll: number;
};

type Ball = {
  x: number;
  y: number;
  dx: number;
  dy: number;
  radius: number;
};

type PowerUpKind = 'expand' | 'multiball' | 'slow' | 'life';

type PowerUp = {
  id: string;
  kind: PowerUpKind;
  x: number;
  y: number;
  w: number;
  h: number;
  vy: number;
};

type LevelConfig = {
  rows: number;
  cols: number;
  speedMul: number;
  indestructibleChance: number;
  hardRows: number;
  veryHardRows: number;
  pattern: 'full' | 'gaps' | 'stairs' | 'checker';
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function uid() {
  return Math.random().toString(16).slice(2) + Date.now().toString(16);
}

function colorForHits(maxHits: number): string {
  if (maxHits >= 3) return '#ef4444';
  if (maxHits === 2) return '#f97316';
  return '#3b82f6';
}

function powerUpLabel(kind: PowerUpKind): string {
  switch (kind) {
    case 'expand':    return '⬛';
    case 'multiball': return '◼︎';
    case 'slow':      return '◻︎';
    case 'life':      return '❤️';
  }
}

// ─── Drawing helpers ──────────────────────────────────────────────────────────

const POWERUP_COLORS: Record<PowerUpKind, { bg: string; border: string }> = {
  expand:    { bg: '#7c3aed', border: '#a78bfa' }, // paars  – plank langer
  multiball: { bg: '#b45309', border: '#fcd34d' }, // goud   – 3 ballen
  slow:      { bg: '#0e7490', border: '#67e8f9' }, // cyaan  – slow
  life:      { bg: '#be123c', border: '#fda4af' }, // rood   – extra leven
};

function drawPowerUp(ctx: CanvasRenderingContext2D, p: PowerUp) {
  const { bg, border } = POWERUP_COLORS[p.kind];

  ctx.save();

  // Glow
  ctx.shadowColor = border;
  ctx.shadowBlur = 8;

  // Achtergrond
  ctx.fillStyle = bg;
  ctx.beginPath();
  ctx.roundRect(p.x, p.y, p.w, p.h, 5);
  ctx.fill();

  // Rand
  ctx.shadowBlur = 0;
  ctx.strokeStyle = border;
  ctx.lineWidth = 2;
  ctx.stroke();

  // Icoon
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 14px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(powerUpLabel(p.kind), p.x + p.w / 2, p.y + p.h / 2 + 1);

  ctx.restore();
}

function drawHudBadges(ctx: CanvasRenderingContext2D, canvasW: number, canvasH: number) {
  ctx.save();
  ctx.globalAlpha = 0.85;
  ctx.fillStyle = '#111827';
  ctx.font = '12px sans-serif';
  ctx.textAlign = 'right';
  ctx.textBaseline = 'alphabetic';
  ctx.fillText(
    'Bonussen: ⬛ plank langer  ◼︎ 3 ballen  ◻︎ slow  ❤️ leven',
    canvasW - 12,
    canvasH - 12,
  );
  ctx.restore();
}

function drawBrick(ctx: CanvasRenderingContext2D, brick: Brick) {
  const hasPowerUp = !brick.indestructible && brick.dropRoll <= POWERUP_DROP_CHANCE;

  ctx.save();

  if (brick.indestructible) {
    ctx.fillStyle = brick.color;
    ctx.globalAlpha = 1;
  } else {
    const alpha = brick.hits / brick.maxHits;
    ctx.fillStyle = brick.color;
    ctx.globalAlpha = brick.hits < brick.maxHits ? 0.3 + alpha * 0.7 : 1;
  }

  ctx.fillRect(brick.x, brick.y, brick.width, brick.height);
  ctx.globalAlpha = 1;

  // Gouden glow-rand voor bonustegels
  if (hasPowerUp) {
    ctx.shadowColor = '#facc15';
    ctx.shadowBlur = 6;
    ctx.strokeStyle = '#facc15';
    ctx.lineWidth = 2;
  } else {
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
  }
  ctx.strokeRect(brick.x, brick.y, brick.width, brick.height);
  ctx.shadowBlur = 0;

  // Ster linksonder als bonusindicator
  if (hasPowerUp) {
    ctx.font = '10px sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'bottom';
    ctx.fillText('⭐', brick.x + 3, brick.y + brick.height - 1);
  }

  if (!brick.indestructible && brick.maxHits > 1) {
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 14px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(
      String(brick.hits),
      brick.x + brick.width / 2,
      brick.y + brick.height / 2,
    );
  }

  ctx.restore();
}

// ─── Level config factory ─────────────────────────────────────────────────────

function buildLevels(count = 20): LevelConfig[] {
  return Array.from({ length: count }, (_, i) => {
    const n = i + 1;
    const speedMul = 1.25 * Math.pow(1.08, n - 1);
    const rows = 5 + Math.floor((n - 1) / 2);
    const cols = 9 + Math.floor((n - 1) / 4);
    const indestructibleChance = n < 3 ? 0 : clamp(0.06 + (n - 3) * 0.01, 0.06, 0.18);
    const hardRows = n < 2 ? 0 : n < 6 ? 1 : 2;
    const veryHardRows = n < 4 ? 0 : n < 10 ? 1 : 2;
    const pattern: LevelConfig['pattern'] =
      n % 8 === 0 ? 'checker' :
      n % 5 === 0 ? 'stairs' :
      n % 3 === 0 ? 'gaps' :
      'full';
    return { rows, cols, speedMul, indestructibleChance, hardRows, veryHardRows, pattern };
  });
}

// ─── Component ────────────────────────────────────────────────────────────────

const LEVELS = buildLevels(20);

const PADDLE_BASE_WIDTH = 110;
const PADDLE_HEIGHT = 10;
const PADDLE_SPEED = 12;
const BALL_BASE_SPEED = 5.0;
const BALL_RADIUS = 8;
const BRICK_PADDING = 10;
const BRICK_HEIGHT = 20;
const BRICK_OFFSET_TOP = 60;
const BRICK_OFFSET_LEFT = 20;
const POWERUP_DROP_CHANCE = 0.08;
const POWERUP_SIZE = 24;
const EXPAND_DURATION = 9000;
const SLOW_DURATION = 7000;
const SLOW_MULTIPLIER = 0.72;
const EXPAND_WIDTH_FACTOR = 1.55;
const MAX_BALLS = 6;

export default function BreakoutGame({ onGameOver, onClose }: BreakoutGameProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(3);
  const [level, setLevel] = useState(1);
  const [paused, setPaused] = useState(false);
  const [levelComplete, setLevelComplete] = useState(false);
  const [gameOver, setGameOver] = useState(false);

  // Refs mirror state for use inside rAF loop
  const pausedRef = useRef(false);
  const levelCompleteRef = useRef(false);
  const gameOverRef = useRef(false);

  useEffect(() => { pausedRef.current = paused; }, [paused]);
  useEffect(() => { levelCompleteRef.current = levelComplete; }, [levelComplete]);
  useEffect(() => { gameOverRef.current = gameOver; }, [gameOver]);

  // ── Mutable game state (never triggers re-render) ──────────────────────────
  const g = useRef({
    paddle: {
      x: 0,
      y: 0,
      width: PADDLE_BASE_WIDTH,
      height: PADDLE_HEIGHT,
      speed: PADDLE_SPEED,
    },
    balls: [] as Ball[],
    bricks: [] as Brick[],
    powerUps: [] as PowerUp[],
    keys: { left: false, right: false },
    animationId: 0,
    currentLevel: 1,
    currentScore: 0,
    currentLives: 3,
    expandUntil: 0,
    slowUntil: 0,
    gameOverSent: false,
  });

  // ── Level builder ──────────────────────────────────────────────────────────

  function createBricks(levelNum: number, canvasWidth: number): Brick[] {
    const cfg = LEVELS[clamp(levelNum - 1, 0, LEVELS.length - 1)];
    const usableW = canvasWidth - BRICK_OFFSET_LEFT * 2;
    const brickWidth = Math.floor((usableW - (cfg.cols - 1) * BRICK_PADDING) / cfg.cols);
    const bricks: Brick[] = [];

    for (let row = 0; row < cfg.rows; row++) {
      for (let col = 0; col < cfg.cols; col++) {
        if (!isBrickAllowed(cfg.pattern, row, col, cfg.cols)) continue;

        let maxHits = 1;
        if (row < cfg.hardRows) maxHits = 2;
        if (row < cfg.veryHardRows) maxHits = 3;

        const roll = Math.random();
        const indestructible = levelNum >= 3 && roll < cfg.indestructibleChance;
        if (indestructible) maxHits = 999;

        bricks.push({
          x: BRICK_OFFSET_LEFT + col * (brickWidth + BRICK_PADDING),
          y: BRICK_OFFSET_TOP + row * (BRICK_HEIGHT + BRICK_PADDING),
          width: brickWidth,
          height: BRICK_HEIGHT,
          visible: true,
          hits: maxHits,
          maxHits,
          color: indestructible ? '#6b7280' : colorForHits(maxHits),
          indestructible,
          dropRoll: Math.random(),
        });
      }
    }
    return bricks;
  }

  function isBrickAllowed(
    pattern: LevelConfig['pattern'],
    row: number,
    col: number,
    cols: number,
  ): boolean {
    switch (pattern) {
      case 'gaps':    return !(row % 2 === 0 && col % 3 === 2);
      case 'stairs':  return col >= row % cols;
      case 'checker': return (row + col) % 2 === 0;
      default:        return true;
    }
  }

  // ── Ball / paddle setup ────────────────────────────────────────────────────

  function resetBalls(levelNum: number, canvasWidth: number, canvasHeight: number) {
    const cfg = LEVELS[clamp(levelNum - 1, 0, LEVELS.length - 1)];
    const speed = BALL_BASE_SPEED * cfg.speedMul;
    const dir = Math.random() > 0.5 ? 1 : -1;
    g.current.balls = [{
      x: canvasWidth / 2,
      y: canvasHeight - 55,
      dx: dir * speed,
      dy: -speed,
      radius: BALL_RADIUS,
    }];
  }

  function startLevel(levelNum: number) {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const game = g.current;
    game.currentLevel = levelNum;
    setLevel(levelNum);

    game.paddle.x = canvas.width / 2 - game.paddle.width / 2;
    game.paddle.y = canvas.height - 28;
    game.powerUps = [];
    game.bricks = createBricks(levelNum, canvas.width);

    resetBalls(levelNum, canvas.width, canvas.height);

    setLevelComplete(false);
    levelCompleteRef.current = false;
  }

  // ── Power-up logic ─────────────────────────────────────────────────────────

  function maybeSpawnPowerUp(brick: Brick) {
    if (brick.dropRoll > POWERUP_DROP_CHANCE) return;

    const r = Math.random();
    const kind: PowerUpKind =
      r < 0.35 ? 'expand' :
      r < 0.62 ? 'multiball' :
      r < 0.84 ? 'slow' :
      'life';

    g.current.powerUps.push({
      id: uid(),
      kind,
      x: brick.x + brick.width / 2 - POWERUP_SIZE / 2,
      y: brick.y + brick.height / 2 - POWERUP_SIZE / 2,
      w: POWERUP_SIZE,
      h: POWERUP_SIZE,
      vy: 3.2,
    });
  }

  function applyPowerUp(kind: PowerUpKind) {
    const game = g.current;
    const now = Date.now();

    switch (kind) {
      case 'life':
        game.currentLives += 1;
        setLives(game.currentLives);
        break;

      case 'expand':
        game.expandUntil = Math.max(game.expandUntil, now + EXPAND_DURATION);
        game.paddle.width = Math.round(PADDLE_BASE_WIDTH * EXPAND_WIDTH_FACTOR);
        break;

      case 'slow':
        game.slowUntil = Math.max(game.slowUntil, now + SLOW_DURATION);
        break;

      case 'multiball': {
        const newBalls: Ball[] = [];
        for (const b of game.balls) {
          const speed = Math.sqrt(b.dx * b.dx + b.dy * b.dy) || 1;
          for (const angle of [-0.35, 0, 0.35]) {
            const dx = b.dx * Math.cos(angle) - b.dy * Math.sin(angle);
            const dy = b.dx * Math.sin(angle) + b.dy * Math.cos(angle);
            const s = Math.sqrt(dx * dx + dy * dy) || 1;
            newBalls.push({ x: b.x, y: b.y, dx: (dx / s) * speed, dy: (dy / s) * speed, radius: b.radius });
          }
        }
        game.balls = newBalls.slice(0, MAX_BALLS);
        if (game.balls.length === 0) {
          const canvas = canvasRef.current;
          if (canvas) resetBalls(game.currentLevel, canvas.width, canvas.height);
        }
        break;
      }
    }
  }

  // ── Main effect: game loop ─────────────────────────────────────────────────

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const game = g.current;

    // Initialise
    game.currentScore = 0;
    game.currentLives = 3;
    game.gameOverSent = false;
    game.paddle.width = PADDLE_BASE_WIDTH;
    game.expandUntil = 0;
    game.slowUntil = 0;

    setScore(0);
    setLives(3);
    setPaused(false);
    pausedRef.current = false;
    setGameOver(false);
    gameOverRef.current = false;

    startLevel(1);

    // ── Input ──────────────────────────────────────────────────────────────
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft')  game.keys.left = true;
      if (e.key === 'ArrowRight') game.keys.right = true;
      if (e.key === ' ') {
        e.preventDefault();
        setPaused(p => {
          const next = !p;
          pausedRef.current = next;
          return next;
        });
      }
    };

    const onKeyUp = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft')  game.keys.left = false;
      if (e.key === 'ArrowRight') game.keys.right = false;
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);

    // ── rAF loop ───────────────────────────────────────────────────────────
    function step() {
      game.animationId = requestAnimationFrame(step);

      // Guard: canvas/ctx could theoretically unmount
      if (!canvas || !ctx) return;
      if (pausedRef.current || levelCompleteRef.current || gameOverRef.current) return;

      const now = Date.now();
      const { width: W, height: H } = canvas;

      // Expire paddle expand
      if (game.expandUntil > 0 && now > game.expandUntil) {
        game.expandUntil = 0;
        game.paddle.width = PADDLE_BASE_WIDTH;
      }

      ctx.clearRect(0, 0, W, H);

      // ── Draw bricks ──────────────────────────────────────────────────────
      for (const brick of game.bricks) {
        if (brick.visible) drawBrick(ctx, brick);
      }

      // ── Move & draw paddle ───────────────────────────────────────────────
      if (game.keys.left)  game.paddle.x -= game.paddle.speed;
      if (game.keys.right) game.paddle.x += game.paddle.speed;
      game.paddle.x = clamp(game.paddle.x, 0, W - game.paddle.width);

      ctx.fillStyle = '#3b82f6';
      ctx.fillRect(game.paddle.x, game.paddle.y, game.paddle.width, game.paddle.height);

      // ── Power-ups ────────────────────────────────────────────────────────
      for (const p of game.powerUps) {
        p.y += p.vy;
        drawPowerUp(ctx, p);

        const caught =
          p.y + p.h >= game.paddle.y &&
          p.y <= game.paddle.y + game.paddle.height &&
          p.x + p.w >= game.paddle.x &&
          p.x <= game.paddle.x + game.paddle.width;

        if (caught) {
          applyPowerUp(p.kind);
          p.y = H + 999; // remove
        }
      }
      game.powerUps = game.powerUps.filter(p => p.y < H + 50);

      // ── Balls ────────────────────────────────────────────────────────────
      const slowActive = game.slowUntil > now;
      const slowMul = slowActive ? SLOW_MULTIPLIER : 1;

      for (const ball of game.balls) {
        ball.x += ball.dx * slowMul;
        ball.y += ball.dy * slowMul;

        // Wall bounce
        if (ball.x + ball.radius > W || ball.x - ball.radius < 0) {
          ball.dx = -ball.dx;
          ball.x = clamp(ball.x, ball.radius, W - ball.radius);
        }
        if (ball.y - ball.radius < 0) {
          ball.dy = -ball.dy;
          ball.y = ball.radius;
        }

        // Paddle bounce
        const hitsPaddle =
          ball.dy > 0 &&
          ball.y + ball.radius >= game.paddle.y &&
          ball.y + ball.radius <= game.paddle.y + game.paddle.height + 6 &&
          ball.x >= game.paddle.x &&
          ball.x <= game.paddle.x + game.paddle.width;

        if (hitsPaddle) {
          const hitPos = (ball.x - game.paddle.x) / game.paddle.width;
          const angle = (hitPos - 0.5) * 1.2;
          const speed = Math.max(3.4, Math.sqrt(ball.dx * ball.dx + ball.dy * ball.dy));
          ball.dx = Math.sin(angle) * speed * 1.8;
          ball.dy = -Math.abs(Math.cos(angle) * speed);
        }

        // Brick collision
        for (const brick of game.bricks) {
          if (!brick.visible) continue;

          const inX = ball.x > brick.x && ball.x < brick.x + brick.width;
          const inY = ball.y > brick.y && ball.y < brick.y + brick.height;

          if (inX && inY) {
            ball.dy = -ball.dy;

            if (!brick.indestructible) {
              brick.hits -= 1;
              if (brick.hits <= 0) {
                brick.visible = false;
                game.currentScore += 10 * brick.maxHits;
                setScore(game.currentScore);
                maybeSpawnPowerUp(brick);
              }
            }
            break;
          }
        }

        // Draw ball
        ctx.beginPath();
        ctx.arc(ball.x, ball.y, ball.radius, 0, Math.PI * 2);
        ctx.fillStyle = '#ef4444';
        ctx.fill();
        ctx.closePath();
      }

      // Remove balls that fell off screen
      game.balls = game.balls.filter(b => b.y - b.radius <= H + 10);

      // ── Life lost ────────────────────────────────────────────────────────
      if (game.balls.length === 0) {
        game.currentLives -= 1;
        setLives(game.currentLives);

        if (game.currentLives <= 0) {
          if (!game.gameOverSent) {
            game.gameOverSent = true;
            setGameOver(true);
            gameOverRef.current = true;
            onGameOver(game.currentScore);
          }
          return;
        }

        resetBalls(game.currentLevel, W, H);
      }

      // ── Level complete ───────────────────────────────────────────────────
      const destructible = game.bricks.filter(b => !b.indestructible);
      const levelDone = destructible.length > 0 && destructible.every(b => !b.visible);

      if (levelDone) {
        game.currentScore += 500;
        setScore(game.currentScore);
        setLevelComplete(true);
        levelCompleteRef.current = true;

        window.setTimeout(() => {
          const next = game.currentLevel + 1;
          startLevel(next <= LEVELS.length ? next : 1);
        }, 850);
      }

      drawHudBadges(ctx, W, H);
    }

    game.animationId = requestAnimationFrame(step);

    return () => {
      cancelAnimationFrame(game.animationId);
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ─── UI ──────────────────────────────────────────────────────────────────────

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl p-6 max-w-4xl w-full mx-4">

        {/* HUD */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-6">
            <span className="text-lg font-bold">Level: {level}</span>
            <span className="text-lg font-bold">Score: {score}</span>
            <span className="text-lg font-bold">
              Lives: {Array(Math.max(lives, 0)).fill('❤️').join(' ')}
            </span>
          </div>
          <button onClick={onClose} className="text-gray-600 hover:text-gray-900 text-2xl">
            ✕
          </button>
        </div>

        {/* Canvas */}
        <canvas
          ref={canvasRef}
          width={800}
          height={600}
          className="border-2 border-gray-300 rounded-lg w-full"
          style={{ maxHeight: '70vh' }}
        />

        {/* Status bar */}
        <div className="mt-4 text-center text-sm text-gray-600">
          {paused && '⏸️ GEPAUZEERD | '}
          {levelComplete && '🎉 LEVEL COMPLETE! +500 | '}
          {!paused && !levelComplete && '🎮 Gebruik ← → pijltjes | SPATIE = pauze'}
          <div className="mt-1">
            Bonussen: ⬛ plank langer · ◼︎ 3 ballen · ◻︎ slow · ❤️ extra leven
          </div>
        </div>

        {/* Game-over overlay */}
        {gameOver && (
          <div className="mt-4 text-center">
            <div className="text-2xl font-bold text-blue-600 mb-2">Game Over! 🎮</div>
            <div className="text-xl mb-2">Level bereikt: {level}</div>
            <div className="text-xl mb-4">Eindscore: {score}</div>
            <button
              onClick={onClose}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Sluiten
            </button>
          </div>
        )}

      </div>
    </div>
  );
}
