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
};

export default function BreakoutGame({ onGameOver, onClose }: BreakoutGameProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(3);
  const [level, setLevel] = useState(1);
  const [gameOver, setGameOver] = useState(false);
  const [paused, setPaused] = useState(false);
  const [levelComplete, setLevelComplete] = useState(false);
  
  const gameStateRef = useRef({
    paddle: { x: 0, y: 0, width: 100, height: 10, speed: 8 },
    ball: { x: 0, y: 0, dx: 3, dy: -3, radius: 8, baseSpeed: 3 },
    bricks: [] as Brick[],
    keys: { left: false, right: false },
    animationId: 0,
    currentLevel: 1,
    currentScore: 0,
    currentLives: 3,
  });

  function createBricks(levelNum: number): Brick[] {
    const bricks: Brick[] = [];
    const brickRows = 5 + Math.floor(levelNum / 3);
    const brickCols = 8;
    const brickWidth = 80;
    const brickHeight = 20;
    const brickPadding = 10;
    const brickOffsetTop = 50;
    const brickOffsetLeft = 30;

    for (let row = 0; row < brickRows; row++) {
      for (let col = 0; col < brickCols; col++) {
        let maxHits = 1;
        let color = '#3b82f6';
        let indestructible = false;

        if (levelNum >= 2) {
          if (row === 0 || (levelNum >= 4 && row === 1)) {
            maxHits = 2;
            color = '#f97316';
          }
        }

        if (levelNum >= 4) {
          if (row === 0) {
            maxHits = 3;
            color = '#ef4444';
          }
        }

        if (levelNum >= 3 && Math.random() < 0.1) {
          indestructible = true;
          maxHits = 999;
          color = '#6b7280';
        }

        bricks.push({
          x: brickOffsetLeft + col * (brickWidth + brickPadding),
          y: brickOffsetTop + row * (brickHeight + brickPadding),
          width: brickWidth,
          height: brickHeight,
          visible: true,
          hits: maxHits,
          maxHits: maxHits,
          color: color,
          indestructible: indestructible,
        });
      }
    }

    return bricks;
  }

  function startLevel(levelNum: number) {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const game = gameStateRef.current;
    game.currentLevel = levelNum;
    
    game.paddle.x = canvas.width / 2 - game.paddle.width / 2;
    game.paddle.y = canvas.height - 30;
    game.ball.x = canvas.width / 2;
    game.ball.y = canvas.height - 50;
    
    const speedMultiplier = 1 + (levelNum - 1) * 0.2;
    game.ball.dx = game.ball.baseSpeed * speedMultiplier * (Math.random() > 0.5 ? 1 : -1);
    game.ball.dy = -game.ball.baseSpeed * speedMultiplier;

    game.bricks = createBricks(levelNum);
    
    setLevel(levelNum);
    setLevelComplete(false);
  }

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    startLevel(1);

    const handleKeyDown = (e: KeyboardEvent) => {
      const game = gameStateRef.current;
      if (e.key === 'ArrowLeft') game.keys.left = true;
      if (e.key === 'ArrowRight') game.keys.right = true;
      if (e.key === ' ') {
        e.preventDefault();
        setPaused(p => !p);
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      const game = gameStateRef.current;
      if (e.key === 'ArrowLeft') game.keys.left = false;
      if (e.key === 'ArrowRight') game.keys.right = false;
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    function gameLoop() {
      const game = gameStateRef.current;
      
      if (!canvas || !ctx || paused || levelComplete) {
        game.animationId = requestAnimationFrame(gameLoop);
        return;
      }

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      game.bricks.forEach(brick => {
        if (brick.visible) {
          if (brick.indestructible) {
            ctx.fillStyle = brick.color;
          } else {
            const alpha = brick.hits / brick.maxHits;
            ctx.fillStyle = brick.color;
            
            if (brick.hits < brick.maxHits) {
              ctx.globalAlpha = 0.3 + (alpha * 0.7);
            }
          }
          
          ctx.fillRect(brick.x, brick.y, brick.width, brick.height);
          ctx.globalAlpha = 1;
          ctx.strokeStyle = '#fff';
          ctx.lineWidth = 2;
          ctx.strokeRect(brick.x, brick.y, brick.width, brick.height);
          
          if (!brick.indestructible && brick.maxHits > 1) {
            ctx.fillStyle = '#fff';
            ctx.font = 'bold 14px sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText(brick.hits.toString(), brick.x + brick.width / 2, brick.y + brick.height / 2 + 5);
          }
        }
      });

      ctx.fillStyle = '#3b82f6';
      ctx.fillRect(game.paddle.x, game.paddle.y, game.paddle.width, game.paddle.height);

      ctx.beginPath();
      ctx.arc(game.ball.x, game.ball.y, game.ball.radius, 0, Math.PI * 2);
      ctx.fillStyle = '#ef4444';
      ctx.fill();
      ctx.closePath();

      if (game.keys.left && game.paddle.x > 0) {
        game.paddle.x -= game.paddle.speed;
      }
      if (game.keys.right && game.paddle.x + game.paddle.width < canvas.width) {
        game.paddle.x += game.paddle.speed;
      }

      game.ball.x += game.ball.dx;
      game.ball.y += game.ball.dy;

      if (game.ball.x + game.ball.radius > canvas.width || game.ball.x - game.ball.radius < 0) {
        game.ball.dx = -game.ball.dx;
      }
      if (game.ball.y - game.ball.radius < 0) {
        game.ball.dy = -game.ball.dy;
      }

      if (
        game.ball.y + game.ball.radius > game.paddle.y &&
        game.ball.x > game.paddle.x &&
        game.ball.x < game.paddle.x + game.paddle.width
      ) {
        const hitPos = (game.ball.x - game.paddle.x) / game.paddle.width;
        game.ball.dx = (hitPos - 0.5) * 6;
        game.ball.dy = -Math.abs(game.ball.dy);
      }

      if (game.ball.y + game.ball.radius > canvas.height) {
        game.currentLives--;
        setLives(game.currentLives);
        
        if (game.currentLives <= 0) {
          setGameOver(true);
          cancelAnimationFrame(game.animationId);
          onGameOver(game.currentScore);
          return;
        }
        
        game.ball.x = canvas.width / 2;
        game.ball.y = canvas.height - 50;
        const speedMultiplier = 1 + (game.currentLevel - 1) * 0.2;
        game.ball.dx = game.ball.baseSpeed * speedMultiplier * (Math.random() > 0.5 ? 1 : -1);
        game.ball.dy = -game.ball.baseSpeed * speedMultiplier;
      }

      game.bricks.forEach(brick => {
        if (!brick.visible) return;

        if (
          game.ball.x > brick.x &&
          game.ball.x < brick.x + brick.width &&
          game.ball.y > brick.y &&
          game.ball.y < brick.y + brick.height
        ) {
          game.ball.dy = -game.ball.dy;
          
          if (!brick.indestructible) {
            brick.hits--;
            
            if (brick.hits <= 0) {
              brick.visible = false;
              game.currentScore += 10 * brick.maxHits;
              setScore(game.currentScore);
            }
          }
        }
      });

      const destructibleBricks = game.bricks.filter(b => !b.indestructible);
      if (destructibleBricks.every(brick => !brick.visible)) {
        game.currentScore += 500;
        setScore(game.currentScore);
        setLevelComplete(true);
        
        setTimeout(() => {
          startLevel(game.currentLevel + 1);
        }, 2000);
      }

      game.animationId = requestAnimationFrame(gameLoop);
    }

    gameStateRef.current.animationId = requestAnimationFrame(gameLoop);

    return () => {
      cancelAnimationFrame(gameStateRef.current.animationId);
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [paused, levelComplete]);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl p-6 max-w-4xl w-full mx-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-6">
            <div className="text-lg font-bold">Level: {level}</div>
            <div className="text-lg font-bold">Score: {score}</div>
            <div className="text-lg font-bold">
              Lives: {Array(lives).fill('❤️').join(' ')}
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-600 hover:text-gray-900 text-2xl"
          >
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
        </div>

        {gameOver && (
          <div className="mt-4 text-center">
            <div className="text-2xl font-bold text-blue-600 mb-2">
              Game Over! 🎮
            </div>
            <div className="text-xl mb-2">
              Level bereikt: {level}
            </div>
            <div className="text-xl mb-4">
              Eindsecore: {score}
            </div>
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
