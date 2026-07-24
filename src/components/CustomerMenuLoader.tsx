import React, { useEffect, useState } from 'react';

interface CustomerMenuLoaderProps {
  restaurantName?: string;
}

const FOOD_EMOJIS = ['🍕', '🍜', '🍣', '🥗', '🍔', '🍛', '🥩', '🍰', '🥘', '🍤'];

const STAGES = [
  { label: 'Connecting to restaurant…', pct: 15 },
  { label: 'Loading live menu…',        pct: 40 },
  { label: 'Fetching today\'s specials…', pct: 65 },
  { label: 'Checking table details…',   pct: 82 },
  { label: 'Almost ready!',             pct: 96 },
];

export const CustomerMenuLoader: React.FC<CustomerMenuLoaderProps> = ({ restaurantName }) => {
  const [stage, setStage]   = useState(0);
  const [progress, setProgress] = useState(5);
  const [emojiAngle, setEmojiAngle] = useState(0);

  /* Cycle through stage labels */
  useEffect(() => {
    const t = setInterval(() => {
      setStage(s => {
        const next = Math.min(s + 1, STAGES.length - 1);
        setProgress(STAGES[next].pct);
        return next;
      });
    }, 900);
    return () => clearInterval(t);
  }, []);

  /* Smooth progress fill */
  useEffect(() => {
    setProgress(STAGES[stage].pct);
  }, [stage]);

  /* Rotate the food emoji orbit ring */
  useEffect(() => {
    let raf: number;
    let angle = 0;
    const tick = () => {
      angle = (angle + 0.5) % 360;
      setEmojiAngle(angle);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col items-center justify-center overflow-hidden"
      style={{
        background: 'linear-gradient(135deg, #0f0c29 0%, #1a1040 40%, #24243e 100%)',
      }}
    >
      {/* ── Animated radial blobs ── */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{ zIndex: 0 }}
      >
        <div
          className="absolute rounded-full"
          style={{
            width: 420, height: 420,
            top: '-10%', left: '-10%',
            background: 'radial-gradient(circle, rgba(99,102,241,0.25) 0%, transparent 70%)',
            filter: 'blur(60px)',
            animation: 'blob-drift-a 8s ease-in-out infinite alternate',
          }}
        />
        <div
          className="absolute rounded-full"
          style={{
            width: 380, height: 380,
            bottom: '-15%', right: '-10%',
            background: 'radial-gradient(circle, rgba(236,72,153,0.18) 0%, transparent 70%)',
            filter: 'blur(60px)',
            animation: 'blob-drift-b 10s ease-in-out infinite alternate',
          }}
        />
        <div
          className="absolute rounded-full"
          style={{
            width: 300, height: 300,
            top: '40%', left: '55%',
            background: 'radial-gradient(circle, rgba(251,191,36,0.12) 0%, transparent 70%)',
            filter: 'blur(50px)',
            animation: 'blob-drift-a 12s ease-in-out infinite alternate-reverse',
          }}
        />
      </div>

      {/* ── Orbiting food emojis ── */}
      <div className="absolute" style={{ width: 220, height: 220, zIndex: 1 }}>
        {FOOD_EMOJIS.map((emoji, i) => {
          const baseAngle = (360 / FOOD_EMOJIS.length) * i;
          const rad = ((baseAngle + emojiAngle) * Math.PI) / 180;
          const radius = 105;
          const x = Math.cos(rad) * radius;
          const y = Math.sin(rad) * radius;
          const opacity = 0.55 + 0.45 * Math.sin(((baseAngle + emojiAngle) * Math.PI) / 180 + Math.PI / 2);
          const scale = 0.7 + 0.35 * Math.sin(((baseAngle + emojiAngle * 1.3) * Math.PI) / 180);

          return (
            <span
              key={emoji}
              style={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: `translate(calc(-50% + ${x}px), calc(-50% + ${y}px)) scale(${scale})`,
                fontSize: '1.45rem',
                opacity,
                transition: 'none',
                userSelect: 'none',
                filter: 'drop-shadow(0 2px 8px rgba(0,0,0,0.4))',
              }}
            >
              {emoji}
            </span>
          );
        })}
      </div>

      {/* ── Central logo plate ── */}
      <div
        className="relative flex flex-col items-center"
        style={{ zIndex: 2 }}
      >
        {/* Glowing ring */}
        <div
          className="flex items-center justify-center rounded-full"
          style={{
            width: 88, height: 88,
            background: 'linear-gradient(135deg, rgba(99,102,241,0.85), rgba(167,139,250,0.85))',
            boxShadow: '0 0 40px 12px rgba(99,102,241,0.45), 0 0 0 3px rgba(255,255,255,0.08)',
            animation: 'logo-pulse 2s ease-in-out infinite',
          }}
        >
          <span style={{ fontSize: '2.4rem', filter: 'drop-shadow(0 2px 6px rgba(0,0,0,0.3))' }}>🍽️</span>
        </div>

        {/* Restaurant name */}
        <div className="mt-7 text-center px-6">
          {restaurantName ? (
            <>
              <p className="text-white/50 text-[10px] font-bold uppercase tracking-[0.25em] mb-1">Welcome to</p>
              <h1
                className="text-white font-black text-2xl tracking-tight leading-tight"
                style={{ fontFamily: "'Outfit', sans-serif", textShadow: '0 2px 20px rgba(99,102,241,0.5)' }}
              >
                {restaurantName}
              </h1>
            </>
          ) : (
            <h1
              className="text-white font-black text-xl tracking-tight"
              style={{ fontFamily: "'Outfit', sans-serif", textShadow: '0 2px 20px rgba(99,102,241,0.5)' }}
            >
              Loading Menu…
            </h1>
          )}
        </div>

        {/* Stage label */}
        <div
          className="mt-5 text-center px-8"
          style={{ minHeight: 22 }}
        >
          <p
            key={stage}
            className="text-white/60 text-[11px] font-semibold tracking-wider"
            style={{ animation: 'fade-in-up 0.4s ease forwards' }}
          >
            {STAGES[stage].label}
          </p>
        </div>

        {/* ── Progress bar ── */}
        <div
          className="mt-4 rounded-full overflow-hidden"
          style={{
            width: 200, height: 4,
            background: 'rgba(255,255,255,0.1)',
          }}
        >
          <div
            style={{
              height: '100%',
              width: `${progress}%`,
              background: 'linear-gradient(90deg, #818cf8, #a78bfa, #f472b6)',
              borderRadius: 99,
              transition: 'width 0.7s cubic-bezier(0.4, 0, 0.2, 1)',
              boxShadow: '0 0 12px 2px rgba(129,140,248,0.7)',
            }}
          />
        </div>

        {/* Shimmer dots */}
        <div className="mt-4 flex gap-1.5">
          {[0, 1, 2].map(i => (
            <div
              key={i}
              className="rounded-full"
              style={{
                width: 6, height: 6,
                background: 'rgba(129,140,248,0.8)',
                animation: `dot-bounce 1.2s ease-in-out ${i * 0.2}s infinite`,
              }}
            />
          ))}
        </div>
      </div>

      {/* ── Keyframe styles injected inline ── */}
      <style>{`
        @keyframes blob-drift-a {
          from { transform: translate(0, 0) scale(1); }
          to   { transform: translate(30px, 20px) scale(1.1); }
        }
        @keyframes blob-drift-b {
          from { transform: translate(0, 0) scale(1); }
          to   { transform: translate(-25px, 15px) scale(0.95); }
        }
        @keyframes logo-pulse {
          0%, 100% { box-shadow: 0 0 40px 12px rgba(99,102,241,0.45), 0 0 0 3px rgba(255,255,255,0.08); }
          50%       { box-shadow: 0 0 60px 20px rgba(99,102,241,0.65), 0 0 0 3px rgba(255,255,255,0.12); }
        }
        @keyframes fade-in-up {
          from { opacity: 0; transform: translateY(6px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes dot-bounce {
          0%, 80%, 100% { transform: scale(0.6); opacity: 0.4; }
          40%            { transform: scale(1.1); opacity: 1; }
        }
      `}</style>
    </div>
  );
};

export default CustomerMenuLoader;
