'use client';

import { useEffect, useRef, useState } from 'react';

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
  indestructible?: boolean;
  dropRoll?: number; // vaste random per brick zodat drops voorspelbaar zijn
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
  hardRows: number; // bovenste rijen krijgen extra hits
  veryHardRows: number; // nog sterker
  pattern: 'full' | 'gaps' | 'stairs' | 'checker';
};

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function uid() {
  return Math.random().toString(16).slice(2) + Date.now().toString(16);
}

function colorForHits(maxHits: number) {
  if (maxHits >= 3) return '#ef4444';
  if (maxHits === 2) return '#f97316';
  return '#3b82f6';
}

export default function BreakoutGame({ onGameOver, onClose }: BreakoutGameProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(3);
  const [level, setLevel] = useState(1);
  const [gameOver, setGameOver] = useState(false);
  const [paused, setPaused] = useState(false);
  const [levelComplete, setLevelComplete] = useState(false);

  const pausedRef = useRef(false);
  const levelCompleteRef = useRef(false);

  useEffect(() => {
    pausedRef.current = paused;
  }, [paused]);

  useEffect(() => {
    levelCompleteRef.current = levelComplete;
  }, [levelComplete]);

  const levels: LevelConfig[] = Array.from({ length: 20 }, (_, i) => {
    const n = i + 1;

    // Level 1 sneller
    const base = 1.25; // sneller dan jouw oude 1.0
    const speedMul = base * Math.pow(1.08, n - 1); // elk level sneller

    const rows = 5 + Math.floor((n - 1) / 2); // groeit rustig
    const cols = 9 + Math.floor((n - 1) / 4); // groeit langzamer
    const indestructibleChance = n < 3 ? 0 : clamp(0.06 + (n - 3) * 0.01, 0.06, 0.18);

    const hardRows = n < 2 ? 0 : n < 6 ? 1 : 2;
    const veryHardRows = n < 4 ? 0 : n < 10 ? 1 : 2;

    const pattern: LevelConfig['pattern'] =
      n % 8 === 0 ? 'checker' : n % 5 === 0 ? 'stairs' : n % 3 === 0 ? 'gaps' : 'full';

    return { rows, cols, speedMul, indestructibleChance, hardRows, veryHardRows, pattern };
  });

  const gameRef = useRef({
    paddle: { x: 0, y: 0, width: 110, baseWidth: 110, height: 10, speed: 9 },
    balls: [] as Ball[],
    ballBaseSpeed: 3.2,
    bricks: [] as Brick[],
    powerUps: [] as PowerUp[],
    keys: { left: false, right: false },
    animationId: 0,
    currentLevel: 1,
    currentScore: 0,
    currentLives: 3,

    // actieve bonussen
    expandUntil: 0,
    slowUntil: 0,

    // level overgang
    nextLevelAt: 0,
  });

  function createBricks(levelNum: number): Brick[] {
    const canvas = canvasRef.current;
    if (!canvas) return [];

    const cfg = levels[clamp(levelNum - 1, 0, levels.length - 1)];

    const padding = 10;
    const offsetTop = 60;
    const offsetLeft = 20;
    const usableW = canvas.width - offsetLeft * 2;
    const cols = cfg.cols;
    const rows = cfg.rows;

    const brickWidth = Math.floor((usableW - (cols - 1) * padding) / cols);
    const brickHeight = 20;

    const bricks: Brick[] = [];

    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        // patroon variatie
        let allowed = true;

        if (cfg.pattern === 'gaps') {
          // elke 3e kolom in even rijen is leeg
          if (row % 2 === 0 && col % 3 === 2) allowed = false;
        } else if (cfg.pattern === 'stairs') {
          // trap van links naar rechts
          if (col < row % cols) allowed = false;
        } else if (cfg.pattern === 'checker') {
          if ((row + col) % 2 === 1) allowed = false;
        }

        if (!allowed) continue;

        let maxHits = 1;

        // bovenste rijen sterker
        if (row < cfg.hardRows) maxHits = 2;
        if (row < cfg.veryHardRows) maxHits = 3;

        // kans op onverwoestbaar
        let indestructible = false;
        const roll = Math.random();
        if (levelNum >= 3 && roll < cfg.indestructibleChance) {
          indestructible = true;
          maxHits = 999;
        }

        const color = indestructible ? '#6b7280' : colorForHits(maxHits);

        bricks.push({
          x: offsetLeft + col * (brickWidth + padding),
          y: offsetTop + row * (brickHeight + padding),
          width: brickWidth,
          height: brickHeight,
          visible: true,
          hits: maxHits,
          maxHits,
          color,
          indestructible,
          dropRoll: Math.random(),
        });
      }
    }

    return bricks;
  }

  function resetBallsForLevel(levelNum: number) {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const game = gameRef.current;
    const cfg = levels[clamp(levelNum - 1, 0, levels.length - 1)];

    const speed = game.ballBaseSpeed * cfg.speedMul;

    const dir = Math.random() > 0.5 ? 1 : -1;

    game.balls = [
      {
        x: canvas.width / 2,
        y: canvas.height - 55,
        dx: dir * speed,
        dy: -speed,
        radius: 8,
      },
    ];
  }

  function startLevel(levelNum: number) {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const game = gameRef.current;

    game.currentLevel = levelNum;
    setLevel(levelNum);

    // paddle reset maar respecteer actieve expand bonus
    game.paddle.x = canvas.width / 2 - game.paddle.width / 2;
    game.paddle.y = canvas.height - 28;

    game.powerUps = [];
    game.bricks = createBricks(levelNum);

    // ballen reset
    resetBallsForLevel(levelNum);

    // level state
    setLevelComplete(false);
    levelCompleteRef.current = false;
    game.nextLevelAt = 0;
  }

  function maybeSpawnPowerUp(brick: Brick) {
    const game = gameRef.current;

    // drop kans alleen bij vernietigde brick, niet bij indestructible
    // Meer variatie, maar niet te veel: ongeveer 18 procent
    const roll = brick.dropRoll ?? Math.random();
    if (roll > 0.18) return;

    // verdeling
    const r = Math.random();
    let kind: PowerUpKind = 'expand';
    if (r < 0.35) kind = 'expand';
    else if (r < 0.62) kind = 'multiball';
    else if (r < 0.84) kind = 'slow';
    else kind = 'life';

    game.powerUps.push({
      id: uid(),
      kind,
      x: brick.x + brick.width / 2 - 12,
      y: brick.y + brick.height / 2 - 12,
      w: 24,
      h: 24,
      vy: 3.2,
    });
  }

  function applyPowerUp(kind: PowerUpKind) {
    const game = gameRef.current;
    const now = Date.now();

    if (kind === 'life') {
      game.currentLives += 1;
      setLives(game.currentLives);
      return;
    }

    if (kind === 'expand') {
      // langer plankje, tijdelijk
      const durationMs = 9000;
      game.expandUntil = Math.max(game.expandUntil, now + durationMs);
      game.paddle.width = Math.round(game.paddle.baseWidth * 1.55);
      return;
    }

    if (kind === 'slow') {
      // bal tijdelijk trager
      const durationMs = 7000;
      game.slowUntil = Math.max(game.slowUntil, now + durationMs);
      return;
    }

    if (kind === 'multiball') {
      const canvas = canvasRef.current;
      if (!canvas) return;

      // split elk bestaande bal in 3, maar max 6 ballen om chaos te beperken
      const newBalls: Ball[] = [];

      for (const b of game.balls) {
        const baseSpeed = Math.sqrt(b.dx * b.dx + b.dy * b.dy);
        const angles = [-0.35, 0, 0.35];

        for (const a of angles) {
          const dx = b.dx * Math.cos(a) - b.dy * Math.sin(a);
          const dy = b.dx * Math.sin(a) + b.dy * Math.cos(a);

          // normaliseer zodat speed gelijk blijft
          const s = Math.sqrt(dx * dx + dy * dy) || 1;
          newBalls.push({
            x: b.x,
            y: b.y,
            dx: (dx / s) * baseSpeed,
            dy: (dy / s) * baseSpeed,
            radius: b.radius,
          });
        }
      }

      // unieke selectie en limiter
      game.balls = newBalls.slice(0, 6);

      // als er om wat voor reden geen ballen zijn
      if (game.balls.length === 0) resetBallsForLevel(game.currentLevel);

      return;
    }
  }

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const game = gameRef.current;

    // init
    game.currentScore = 0;
    setScore(0);

    game.currentLives = 3;
    setLives(3);

    game.paddle.width = game.paddle.baseWidth;
    game.expandUntil = 0;
    game.slowUntil = 0;

    startLevel(1);

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') game.keys.left = true;
      if (e.key === 'ArrowRight') game.keys.right = true;
      if (e.key === ' ') {
        e.preventDefault();
        setPaused(p => !p);
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') game.keys.left = false;
      if (e.key === 'ArrowRight') game.keys.right = false;
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    function drawHudBadges() {
      // kleine legenda rechtsonder op canvas
      ctx.save();
      ctx.globalAlpha = 0.85;
      ctx.fillStyle = '#111827';
      ctx.font = '12px sans-serif';
      ctx.textAlign = 'right';
      ctx.fillText('Bonussen: ⬛=plank langer  ◼︎=3 ballen  ◻︎=slow  ❤️=leven', canvas.width - 12, canvas.height - 12);
      ctx.restore();
    }

    function drawPowerUp(p: PowerUp) {
      ctx.save();

      const label =
        p.kind === 'expand'
          ? '⬛'
          : p.kind === 'multiball'
          ? '◼︎'
          : p.kind === 'slow'
          ? '◻︎'
          : '❤️';

      ctx.fillStyle = '#111827';
      ctx.fillRect(p.x, p.y, p.w, p.h);

      ctx.fillStyle = '#ffffff';
      ctx.font = '16px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(label, p.x + p.w / 2, p.y + p.h / 2 + 1);

      ctx.restore();
    }

    function step() {
      game.animationId = requestAnimationFrame(step);

      if (pausedRef.current || levelCompleteRef.current || gameOver) return;

      const now = Date.now();

      // bonussen verlopen
      if (game.expandUntil > 0 && now > game.expandUntil) {
        game.expandUntil = 0;
        game.paddle.width = game.paddle.baseWidth;
      }

      // clear
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // bricks
      for (const brick of game.bricks) {
        if (!brick.visible) continue;

        ctx.save();

        if (brick.indestructible) {
          ctx.fillStyle = brick.color;
          ctx.globalAlpha = 1;
        } else {
          const alpha = brick.hits / brick.maxHits;
          ctx.fillStyle = brick.color;
          if (brick.hits < brick.maxHits) ctx.globalAlpha = 0.3 + alpha * 0.7;
        }

        ctx.fillRect(brick.x, brick.y, brick.width, brick.height);

        ctx.globalAlpha = 1;
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        ctx.strokeRect(brick.x, brick.y, brick.width, brick.height);

        if (!brick.indestructible && brick.maxHits > 1) {
          ctx.fillStyle = '#ffffff';
          ctx.font = 'bold 14px sans-serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(String(brick.hits), brick.x + brick.width / 2, brick.y + brick.height / 2);
        }

        ctx.restore();
      }

      // paddle
      ctx.fillStyle = '#3b82f6';
      ctx.fillRect(game.paddle.x, game.paddle.y, game.paddle.width, game.paddle.height);

      // input
      if (game.keys.left) game.paddle.x -= game.paddle.speed;
      if (game.keys.right) game.paddle.x += game.paddle.speed;
      game.paddle.x = clamp(game.paddle.x, 0, canvas.width - game.paddle.width);

      // powerups falling
      for (const p of game.powerUps) {
        p.y += p.vy;
        drawPowerUp(p);

        // collect
        const hit =
          p.y + p.h >= game.paddle.y &&
          p.y <= game.paddle.y + game.paddle.height &&
          p.x + p.w >= game.paddle.x &&
          p.x <= game.paddle.x + game.paddle.width;

        if (hit) {
          applyPowerUp(p.kind);
          p.y = canvas.height + 999; // mark as collected
        }
      }

      // remove out of bounds powerups
      game.powerUps = game.powerUps.filter(p => p.y < canvas.height + 50);

      // balls
      const slowActive = game.slowUntil > now;
      const slowMul = slowActive ? 0.72 : 1;

      for (const ball of game.balls) {
        // move
        ball.x += ball.dx * slowMul;
        ball.y += ball.dy * slowMul;

        // walls
        if (ball.x + ball.radius > canvas.width || ball.x - ball.radius < 0) {
          ball.dx = -ball.dx;
          ball.x = clamp(ball.x, ball.radius, canvas.width - ball.radius);
        }
        if (ball.y - ball.radius < 0) {
          ball.dy = -ball.dy;
          ball.y = ball.radius;
        }

        // paddle collision
        const paddleHit =
          ball.y + ball.radius >= game.paddle.y &&
          ball.y + ball.radius <= game.paddle.y + game.paddle.height + 6 &&
          ball.x >= game.paddle.x &&
          ball.x <= game.paddle.x + game.paddle.width &&
          ball.dy > 0;

        if (paddleHit) {
          const hitPos = (ball.x - game.paddle.x) / game.paddle.width; // 0..1
          const angle = (hitPos - 0.5) * 1.2; // stuurhoek
          const speed = Math.max(3.4, Math.sqrt(ball.dx * ball.dx + ball.dy * ball.dy));
          ball.dx = Math.sin(angle) * speed * 1.8;
          ball.dy = -Math.abs(Math.cos(angle) * speed);
        }

        // brick collisions (simpel maar werkt)
        for (const brick of game.bricks) {
          if (!brick.visible) continue;

          const inX = ball.x > brick.x && ball.x < brick.x + brick.width;
          const inY = ball.y > brick.y && ball.y < brick.y + brick.height;

          if (inX && inY) {
            // bounce
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

        // draw
        ctx.beginPath();
        ctx.arc(ball.x, ball.y, ball.radius, 0, Math.PI * 2);
        ctx.fillStyle = '#ef4444';
        ctx.fill();
        ctx.closePath();
      }

      // remove balls that fell
      game.balls = game.balls.filter(b => b.y - b.radius <= canvas.height + 10);

      if (game.balls.length === 0) {
        game.currentLives -= 1;
        setLives(game.currentLives);

        if (game.currentLives <= 0) {
          setGameOver(true);
          onGameOver(game.currentScore);
          return;
        }

        // reset ball voor huidig level
        resetBallsForLevel(game.currentLevel);
      }

      // level complete check (alle destructible weg)
      const destructible = game.bricks.filter(b => !b.indestructible);
      const done = destructible.length > 0 && destructible.every(b => !b.visible);

      if (done) {
        game.currentScore += 500;
        setScore(game.currentScore);

        setLevelComplete(true);
        levelCompleteRef.current = true;

        // snellere overgang, niet 2 seconden
        const next = game.currentLevel + 1;
        const delayMs = 850;

        window.setTimeout(() => {
          // loop terug naar level 1 na level 20, of blijf doorlopen als je wilt
          const nextLevel = next <= levels.length ? next : 1;
          startLevel(nextLevel);
        }, delayMs);
      }

      drawHudBadges();
    }

    game.animationId = requestAnimationFrame(step);

    return () => {
      cancelAnimationFrame(game.animationId);
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
    // alleen init en cleanup, niet herstarten bij pause
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl p-6 max-w-4xl w-full mx-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-6">
            <div className="text-lg font-bold">Level: {level}</div>
            <div className="text-lg font-bold">Score: {score}</div>
            <div className="text-lg font-bold">Lives: {Array(lives).fill('❤️').join(' ')}</div>
          </div>
          <button onClick={onClose} className="text-gray-600 hover:text-gray-900 text-2xl">
            ✕
          </button>
        </div>

        <canvas
          ref={canvasRef}
          width={800}
          height={600}
          className="border-2 border-gray-300 rounded-lg w-full"
          style={{ maxHeight: '70vh' }}
        />

        <div className="mt-4 text-center text-sm text-gray-600">
          {paused && '⏸️ GEPAUZEERD | '}
          {levelComplete && '🎉 LEVEL COMPLETE! +500 | '}
          {!paused && !levelComplete && '🎮 Gebruik ← → pijltjes | SPATIE = pauze'}
          <div className="mt-1">
            Bonussen: ⬛ plank langer · ◼︎ 3 ballen · ◻︎ slow · ❤️ extra leven
          </div>
        </div>

        {gameOver && (
          <div className="mt-4 text-center">
            <div className="text-2xl font-bold text-blue-600 mb-2">Game Over! 🎮</div>
            <div className="text-xl mb-2">Level bereikt: {level}</div>
            <div className="text-xl mb-4">Eindscore: {score}</div>
            <button onClick={onClose} className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
              Sluiten
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
