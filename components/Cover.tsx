// Procedural cover art so the prototype has distinct artwork without
// shipping (or borrowing) real album images. Deterministic per seed.

function rand(seed: string) {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) h = Math.imul(h ^ seed.charCodeAt(i), 16777619);
  return () => {
    h = Math.imul(h ^ (h >>> 15), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    return ((h ^= h >>> 16) >>> 0) / 4294967296;
  };
}

export default function Cover({
  seed,
  hue,
  className = "",
  label,
}: {
  seed: string;
  hue: number;
  className?: string;
  label?: string;
}) {
  const r = rand(seed);
  const variant = Math.floor(r() * 4);
  const h2 = (hue + 40 + r() * 80) % 360;
  const id = `g-${seed.replace(/[^a-z0-9]/gi, "")}`;
  return (
    <div className={`relative overflow-hidden ${className}`} style={{ background: `hsl(${hue} 55% 18%)` }}>
      <svg viewBox="0 0 100 100" preserveAspectRatio="xMidYMid slice" className="absolute inset-0 h-full w-full">
        <defs>
          <radialGradient id={id} cx={`${20 + r() * 60}%`} cy={`${20 + r() * 60}%`} r="80%">
            <stop offset="0%" stopColor={`hsl(${hue} 90% 62%)`} />
            <stop offset="55%" stopColor={`hsl(${h2} 70% 32%)`} />
            <stop offset="100%" stopColor={`hsl(${hue} 40% 8%)`} />
          </radialGradient>
        </defs>
        <rect width="100" height="100" fill={`url(#${id})`} />
        {variant === 0 &&
          Array.from({ length: 7 }, (_, i) => (
            <circle key={i} cx="50" cy="50" r={8 + i * 7} fill="none" stroke="white" strokeOpacity={0.08 + i * 0.02} strokeWidth="0.6" />
          ))}
        {variant === 1 && (
          <path
            d={`M0 ${60 + r() * 20} Q 30 ${20 + r() * 30} 55 ${50 + r() * 20} T 100 ${30 + r() * 30} V100 H0Z`}
            fill={`hsl(${h2} 80% 55%)`}
            fillOpacity="0.55"
          />
        )}
        {variant === 2 &&
          Array.from({ length: 14 }, (_, i) => (
            <rect key={i} x={i * 7.5} y={100 - (20 + r() * 60)} width="4" height="100" fill="white" fillOpacity={0.06 + r() * 0.12} />
          ))}
        {variant === 3 && (
          <circle cx={30 + r() * 40} cy={30 + r() * 40} r={16 + r() * 12} fill={`hsl(${(hue + 180) % 360} 90% 60%)`} fillOpacity="0.8" />
        )}
        <rect width="100" height="100" fill="black" fillOpacity="0.08" />
      </svg>
      {label && (
        <span className="absolute bottom-2 left-2 right-2 truncate text-[10px] font-semibold uppercase tracking-widest text-white/85">
          {label}
        </span>
      )}
    </div>
  );
}
