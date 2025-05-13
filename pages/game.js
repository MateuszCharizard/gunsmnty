import React, { useState, useEffect, useRef } from 'react';

/**
 * Target Component
 * @param {Object} props
 * @param {number} props.id - Unique target ID
 * @param {number} props.x - X position
 * @param {number} props.y - Y position
 * @param {number} props.size - Target size
 * @param {Function} props.onClick - Click handler
 */
function Target({ id, x, y, size, onClick }) {
  const handleClick = (e) => {
    e.stopPropagation();
    console.log(`Target ${id} clicked at x:${x}, y:${y}`);
    onClick(id);
  };

  console.log(`Rendering target ${id} at x:${x}, y:${y}, size:${size}`);

  return (
    <img
      src="/target.png"
      alt="Target"
      draggable="false"
      className="absolute cursor-pointer target-element"
      style={{
        transform: `translate(${x}px, ${y}px)`,
        width: `${size}px`,
        height: `${size}px`,
        zIndex: 10,
      }}
      onClick={handleClick}
    />
  );
}

export default function Game() {
  // Game state
  const [isPlaying, setIsPlaying] = useState(false);
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(30);
  const [targets, setTargets] = useState([]);
  const [stats, setStats] = useState({
    hits: 0,
    misses: 0,
    accuracy: 0,
    targetsSpawned: 0,
  });
  const [personalBest, setPersonalBest] = useState(0); // Initial value on server, updated client-side
  const [toasts, setToasts] = useState([]);
  const gameAreaRef = useRef(null);
  const timerRef = useRef(null);
  const targetSpawnRef = useRef(null);
  const targetIdCounter = useRef(0); // Counter for unique target IDs

  // Log game area dimensions on mount
  useEffect(() => {
    if (gameAreaRef.current) {
      const rect = gameAreaRef.current.getBoundingClientRect();
      console.log('Game area mounted with dimensions:', rect);
    }
  }, []);

  // Initialize personalBest from localStorage on client-side
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedBest = localStorage.getItem('personalBestScore');
      setPersonalBest(savedBest ? parseInt(savedBest, 10) : 0);
    }
  }, []);

  // Start target spawning when isPlaying becomes true
  useEffect(() => {
    console.log('isPlaying changed to:', isPlaying);
    if (isPlaying) {
      console.log('Starting target spawning due to isPlaying change...');
      spawnTarget(); // Initial spawn
      scheduleNextSpawn();
    }
  }, [isPlaying]);

  // Helper function to calculate accuracy
  const calculateAccuracy = (hits, misses) => {
    const total = hits + misses;
    if (total === 0) return 0;
    return Math.round((hits / total) * 100);
  };

  // Toast function
  const showToast = ({ title, description }) => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, title, description }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((toast) => toast.id !== id));
    }, 3000);
  };

  // Start game
  const startGame = () => {
    console.log('Starting game...');
    setIsPlaying(true);
    setScore(0);
    setTimeLeft(30);
    setTargets([]);
    setStats({
      hits: 0,
      misses: 0,
      accuracy: 0,
      targetsSpawned: 0,
    });

    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          endGame();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    showToast({
      title: 'Game Started',
      description: 'Click on target images as they appear!',
    });
  };

  // End game
  const endGame = () => {
    console.log('Ending game...');
    setIsPlaying(false);

    if (timerRef.current) clearInterval(timerRef.current);
    if (targetSpawnRef.current) clearTimeout(targetSpawnRef.current);

    const finalAccuracy = calculateAccuracy(stats.hits, stats.misses);
    setStats((prev) => ({
      ...prev,
      accuracy: finalAccuracy,
    }));

    // Update personal best if current score is higher
    if (score > personalBest && typeof window !== 'undefined') {
      setPersonalBest(score);
      localStorage.setItem('personalBestScore', score.toString());
      showToast({
        title: 'New Personal Best!',
        description: `You achieved a new high score of ${score}!`,
      });
    }

    showToast({
      title: 'Game Over!',
      description: `Final score: ${score} | Accuracy: ${finalAccuracy}%`,
    });
  };

  // Schedule next target spawn
  const scheduleNextSpawn = () => {
    if (!isPlaying) return;
    targetSpawnRef.current = setTimeout(() => {
      console.log('Scheduled spawn triggered');
      spawnTarget();
      scheduleNextSpawn();
    }, 500);
  };

  // Spawn target
  const spawnTarget = () => {
    console.log('spawnTarget called, isPlaying:', isPlaying);
    if (!isPlaying) {
      console.log('spawnTarget aborted: not playing');
      return;
    }

    // Fixed game area dimensions
    const width = 800;
    const height = 550;

    const size = 50; // Fixed size for target.png
    const x = Math.floor(Math.random() * (width - size));
    const y = Math.floor(Math.random() * (height - size));

    // Generate unique ID using counter
    targetIdCounter.current += 1;
    const newTarget = {
      id: targetIdCounter.current,
      x,
      y,
      size,
    };

    console.log('Spawning new target:', newTarget);

    setTargets((prevTargets) => {
      // Limit to 5 simultaneous targets
      if (prevTargets.length >= 5) {
        console.log('Target limit reached, skipping spawn');
        return prevTargets;
      }
      const updatedTargets = [...prevTargets, newTarget];
      console.log('Updated targets array:', updatedTargets);
      return updatedTargets;
    });

    setStats((prev) => ({
      ...prev,
      targetsSpawned: prev.targetsSpawned + 1,
    }));

    // Auto-remove target after 3 seconds
    setTimeout(() => {
      setTargets((prev) => {
        const stillExists = prev.some((target) => target.id === newTarget.id);
        if (stillExists) {
          console.log(`Auto-removing target ${newTarget.id} after 3s`);
          return prev.filter((target) => target.id !== newTarget.id);
        }
        return prev;
      });
    }, 3000);
  };

  // Handle target click
  const handleTargetClick = (targetId) => {
    console.log('Target clicked:', targetId);
    setTargets((prev) => prev.filter((target) => target.id !== targetId));
    setScore((prev) => prev + 100);
    setStats((prev) => {
      const newHits = prev.hits + 1;
      const newAccuracy = calculateAccuracy(newHits, prev.misses);
      return {
        ...prev,
        hits: newHits,
        accuracy: newAccuracy,
      };
    });
  };

  // Handle miss click
  const handleMissClick = (e) => {
    if (!isPlaying) return;
    if (e.target.closest('.target-element')) return;

    console.log('Miss clicked');
    setStats((prev) => {
      const newMisses = prev.misses + 1;
      const newAccuracy = calculateAccuracy(prev.hits, newMisses);
      return {
        ...prev,
        misses: newMisses,
        accuracy: newAccuracy,
      };
    });
  };

  // Cleanup
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (targetSpawnRef.current) clearTimeout(targetSpawnRef.current);
    };
  }, []);

  return (
    <div className="min-h-screen bg-[#1A1F2C] flex flex-col items-center justify-center p-4">
      <div className="max-w-6xl w-full">
        <h1 className="text-4xl font-bold text-white mb-4 text-center">
          
        </h1>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Sidebar */}
          <div className="lg:col-span-1">
            <div className="p-6 bg-[#232733] border border-[#403E43] shadow-lg rounded-lg">
              {/* ScoreBoard */}
              <div className="space-y-4">
                <div>
                  <h3 className="text-lg font-semibold text-white">Score</h3>
                  <p className="text-2xl text-[#9b87f5]">{score}</p>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-white">Personal Best</h3>
                  <p className="text-2xl text-[#9b87f5]">{personalBest}</p>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-white">Time Left</h3>
                  <p className="text-2xl text-[#9b87f5]">{timeLeft}s</p>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-white">Accuracy</h3>
                  <p className="text-2xl text-[#9b87f5]">{stats.accuracy}%</p>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-white">Hits</h3>
                  <p className="text-2xl text-[#9b87f5]">{stats.hits}</p>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-white">Misses</h3>
                  <p className="text-2xl text-[#9b87f5]">{stats.misses}</p>
                </div>
              </div>

              <button
                onClick={isPlaying ? endGame : startGame}
                className={`w-full mt-6 py-2 px-4 rounded-lg text-white font-semibold ${
                  isPlaying
                    ? 'bg-red-600 hover:bg-red-700'
                    : 'bg-gradient-to-r from-[#9b87f5] to-[#7E69AB] hover:opacity-90'
                }`}
              >
                {isPlaying ? 'End Game' : 'Start Game'}
              </button>
            </div>
          </div>

          {/* Game area */}
          <div className="lg:col-span-3">
            <div
              ref={gameAreaRef}
              onClick={handleMissClick}
              className="w-full h-[550px] bg-[#232733] rounded-lg relative shadow-lg"
            >
              {isPlaying ? (
                <>
                  {/* Uncomment below for static test target */}
                  {/* <Target id={999} x={100} y={100} size={50} onClick={handleTargetClick} /> */}
                  {targets.map((target) => (
                    <Target
                      key={target.id}
                      id={target.id}
                      x={target.x}
                      y={target.y}
                      size={target.size}
                      onClick={handleTargetClick}
                    />
                  ))}
                </>
              ) : (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-center p-8">
                    <h2 className="text-2xl font-bold text-white mb-4">Welcome to <span className="bg-gradient-to-r from-[#9b87f5] to-[#7E69AB] bg-clip-text text-transparent">MntyTrainer</span></h2>
                    <p className="text-gray-300 mb-6">Click <span className="font-bold bg-gradient-to-r from-[#9b87f5] to-[#7E69AB] bg-clip-text text-transparent">"Start Game"</span> to begin target practice</p>
                    <button
                      onClick={startGame}
                      className="py-2 px-4 rounded-lg text-white font-semibold bg-gradient-to-r from-[#9b87f5] to-[#7E69AB] hover:opacity-90"
                    >
                      Start Game
                    </button>
                  </div>
                </div>
              )}

              {isPlaying && (
                <div className="absolute bottom-0 left-0 right-0">
                  <div
                    className="h-2 bg-gray-700"
                    style={{ width: `${(timeLeft / 30) * 100}%`, backgroundColor: '#9b87f5' }}
                  />
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Toast Container */}
      <div className="fixed bottom-4 right-4 space-y-2">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className="bg-[#232733] border border-[#403E43] p-4 rounded-lg shadow-lg text-white animate-slide-in"
          >
            <h4 className="font-semibold">{toast.title}</h4>
            <p>{toast.description}</p>
          </div>
        ))}
      </div>
    </div>
  );
}