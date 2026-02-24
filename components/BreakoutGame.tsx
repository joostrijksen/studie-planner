'use client';

import { useEffect, useRef, useState } from 'react';

type BreakoutGameProps = {
  onGameOver: (score: number) => void;
  onClose: () => void;
};

export default function BreakoutGame({ onGameOver, onClose }: BreakoutGameProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(3);
  const [gameOver, setGameOver] = useState(false);
  const [paused, setPaused] = useState(false);
  
  const gameStateRef = useRef({
    paddle: { x: 0, y: 0, width: 100, height: 10, speed: 8 },
    ball: { x: 0, y: 0, dx: 3, dy: -3, radius: 8 },
    bricks: [] as Array<{ x: number; y: number; width: number; height: number; visible: boolean; color: string }>,
    keys: { left: false, right: false },
    animationId: 0,
  });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Setup game
    const game = gameStateRef.current;
    game.paddle.x = canvas.width / 2 - game.paddle.width / 2;
    game.paddle.y = canvas.height - 30;
    game.ball.x = canvas.width / 2;
    game.ball.y = canvas.height - 50;

    // Create bricks
    const brickRows = 5;
    const brickCols = 8;
    const brickWidth = 80;
    const brickHeight = 20;
    const brickPadding = 10;
    const brickOffsetTop = 50;
    const brickOffsetLeft = 30;
    const colors = ['#ef4444', '#f97316', '#eab308', '#22c55e', '#3b82f6'];

    game.bricks = [];
    for (let row = 0; row < brickRows; row++) {
      for (let col = 0; col < brickCols; col++) {
        game.bricks.push({
          x: brickOffsetLeft + col * (brickWidth + brickPadding),
          y: brickOffsetTop + row * (brickHeight + brickPadding),
          width: brickWidth,
          height: brickHeight,
          visible: true,
          color: colors[row],
        });
      }
    }

    // Keyboard controls
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') game.keys.left = true;
      if (e.key === 'ArrowRight') game.keys.right = true;
      if (e.key === ' ') setPaused(p => !p);
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') game.keys.left = false;
      if (e.key === 'ArrowRight') game.keys.right = false;
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    // Game loop
    let currentScore = 0;
    let currentLives = 3;

    function gameLoop() {
      if (!canvas || !ctx || paused) {
        game.animationId = requestAnimationFrame(gameLoop);
        return;
      }

      // Clear canvas
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Draw bricks
      game.bricks.forEach(brick => {
        if (brick.visible) {
          ctx.fillStyle = brick.color;
          ctx.fillRect(brick.x, brick.y, brick.width, brick.height);
          ctx.strokeStyle = '#fff';
          ctx.strokeRect(brick.x, brick.y, brick.width, brick.height);
        }
      });

      // Draw paddle
      ctx.fillStyle = '#3b82f6';
      ctx.fillRect(game.paddle.x, game.paddle.y, game.paddle.width, game.paddle.height);

      // Draw ball
      ctx.beginPath();
      ctx.arc(game.ball.x, game.ball.y, game.ball.radius, 0, Math.PI * 2);
      ctx.fillStyle = '#ef4444';
      ctx.fill();
      ctx.closePath();

      // Move paddle
      if (game.keys.left && game.paddle.x > 0) {
        game.paddle.x -= game.paddle.speed;
      }
      if (game.keys.right && game.paddle.x + game.paddle.width < canvas.width) {
        game.paddle.x += game.paddle.speed;
      }

      // Move ball
      game.ball.x += game.ball.dx;
      game.ball.y += game.ball.dy;

      // Ball collision with walls
      if (game.ball.x + game.ball.radius > canvas.width || game.ball.x - game.ball.radius < 0) {
        game.ball.dx = -game.ball.dx;
      }
      if (game.ball.y - game.ball.radius < 0) {
        game.ball.dy = -game.ball.dy;
      }

      // Ball collision with paddle
      if (
        game.ball.y + game.ball.radius > game.paddle.y &&
        game.ball.x > game.paddle.x &&
        game.ball.x < game.paddle.x + game.paddle.width
      ) {
        // Add spin based on where ball hits paddle
        const hitPos = (game.ball.x - game.paddle.x) / game.paddle.width;
        game.ball.dx = (hitPos - 0.5) * 6;
        game.ball.dy = -Math.abs(game.ball.dy);
      }

      // Ball falls below paddle
      if (game.ball.y + game.ball.radius > canvas.height) {
        currentLives--;
        setLives(currentLives);
        
        if (currentLives <= 0) {
          setGameOver(true);
          cancelAnimationFrame(game.animationId);
          onGameOver(currentScore);
          return;
        }
        
        // Reset ball
        game.ball.x = canvas.width / 2;
        game.ball.y = canvas.height - 50;
        game.ball.dx = 3;
        game.ball.dy = -3;
      }

      // Ball collision with bricks
      game.bricks.forEach(brick => {
        if (!brick.visible) return;

        if (
          game.ball.x > brick.x &&
          game.ball.x < brick.x + brick.width &&
          game.ball.y > brick.y &&
          game.ball.y < brick.y + brick.height
        ) {
          game.ball.dy = -game.ball.dy;
          brick.visible = false;
          currentScore += 10;
          setScore(currentScore);
        }
      });

      // Check win condition
      if (game.bricks.every(brick => !brick.visible)) {
        setGameOver(true);
        cancelAnimationFrame(game.animationId);
        onGameOver(currentScore + 1000); // Bonus for completing level
        return;
      }

      game.animationId = requestAnimationFrame(gameLoop);
    }

    game.animationId = requestAnimationFrame(gameLoop);

    return () => {
      cancelAnimationFrame(game.animationId);
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [paused]);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl p-6 max-w-4xl w-full mx-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-6">
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
          {paused ? '⏸️ GEPAUZEERD' : '🎮 Gebruik ← → pijltjes om te bewegen | SPATIE om te pauzeren'}
        </div>

        {gameOver && (
          <div className="mt-4 text-center">
            <div className="text-2xl font-bold text-blue-600 mb-2">
              Game Over! 🎮
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
