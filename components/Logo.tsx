// Brand marks for The Yard, redrawn as SVG from the brand identity sheet:
// 01 bubble wordmark, 02 community shape, 03 liquid Y, 04 vinyl blob.

export function LiquidY({ className = "h-6 w-6", mono = false }: { className?: string; mono?: boolean }) {
  return (
    <svg viewBox="0 0 48 48" className={className} aria-hidden>
      <defs>
        <linearGradient id="ly-fill" gradientUnits="userSpaceOnUse" x1="6" y1="6" x2="42" y2="44">
          <stop offset="0%" stopColor="#f4ff8a" />
          <stop offset="40%" stopColor="#c8f230" />
          <stop offset="75%" stopColor="#5fe3a1" />
          <stop offset="100%" stopColor="#1fb89a" />
        </linearGradient>
        <radialGradient id="ly-shine" gradientUnits="userSpaceOnUse" cx="15" cy="12" r="18">
          <stop offset="0%" stopColor="#fff" stopOpacity="0.9" />
          <stop offset="100%" stopColor="#fff" stopOpacity="0" />
        </radialGradient>
      </defs>
      <g fill="none" strokeLinecap="round" strokeLinejoin="round" stroke={mono ? "currentColor" : "url(#ly-fill)"} strokeWidth="13">
        <path d="M11 11 Q18 20 24 24 Q30 20 37 11" />
        <path d="M24 24 L24 38" />
      </g>
      {!mono && (
        <g fill="none" strokeLinecap="round" stroke="url(#ly-shine)" strokeWidth="13">
          <path d="M11 11 Q18 20 24 24 Q30 20 37 11" />
        </g>
      )}
    </svg>
  );
}

export function CommunityMark({ className = "h-6 w-6", spin = false }: { className?: string; spin?: boolean }) {
  const blobs = [
    [26, 9, 7.5, 5.8, -15],
    [37.5, 15, 4.6, 4.8, 0],
    [34, 29, 6.5, 8.6, 30],
    [21, 39.5, 4.4, 4, 0],
    [12, 27.5, 5.6, 7.4, -25],
    [11, 15, 3.4, 3.6, 0],
  ];
  return (
    <svg viewBox="0 0 48 48" className={`${className} ${spin ? "animate-spin [animation-duration:3s]" : ""}`} aria-hidden>
      {blobs.map(([cx, cy, rx, ry, r], i) => (
        <ellipse key={i} cx={cx} cy={cy} rx={rx} ry={ry} transform={`rotate(${r} ${cx} ${cy})`} fill="currentColor" />
      ))}
    </svg>
  );
}

export function VinylBlob({ className = "h-6 w-6" }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" className={className} aria-hidden>
      <path
        fill="currentColor"
        d="M24 5c10 0 18 7.5 18 17 0 4-1.3 7.2-3.3 9.8-.9 1.2-.4 3 .2 4.6.6 1.7-.8 3-2.2 2.3-1.3-.6-1.5-2.4-2.4-3.2-.8-.7-2 .1-2.2 1.2-.4 2.6-.1 5.4-2.3 5.6-2 .2-2.1-2.6-2.7-4.2-.4-1-1.7-1.2-2.4-.4-.9 1-.8 3-2.3 3.1-1.6.1-1.8-1.9-2.5-3-.7-1-2-1-2.7 0-.8 1.2-.6 3.6-2.3 3.4-1.8-.2-1.3-2.9-1.6-4.4-.2-1-1.3-1.5-2.2-1C8 39.5 6 38.5 6.8 36.5c.6-1.5.4-3.4-.4-4.8C5.5 29 6 25.6 6 22 6 12.5 14 5 24 5Z"
      />
      <circle cx="22" cy="20" r="4.2" fill="var(--hole, #000)" />
      <g fill="none" stroke="var(--hole, #000)" strokeOpacity="0.35" strokeWidth="0.6">
        <circle cx="22" cy="20" r="9" />
        <circle cx="22" cy="20" r="12.5" />
      </g>
    </svg>
  );
}

/** Bubble wordmark, set in a fat rounded display face with the sparkle. */
export function Wordmark({ className = "", sparkle = true, stacked = false }: { className?: string; sparkle?: boolean; stacked?: boolean }) {
  return (
    <span className={`relative inline-block font-[family-name:var(--font-bubble)] leading-[0.85] tracking-tight ${className}`}>
      {stacked ? (
        <>
          THE
          <br />
          YARD
        </>
      ) : (
        "THE YARD"
      )}
      {sparkle && (
        <svg viewBox="0 0 24 24" className="absolute -right-[0.4em] -top-[0.3em] h-[0.5em] w-[0.5em]" aria-hidden>
          <path d="M12 0c.8 6.5 5.5 11.2 12 12-6.5.8-11.2 5.5-12 12-.8-6.5-5.5-11.2-12-12C6.5 11.2 11.2 6.5 12 0Z" fill="currentColor" />
        </svg>
      )}
    </span>
  );
}

export default function Logo({ className = "" }: { className?: string }) {
  return (
    <span className={`inline-flex items-center gap-2 ${className}`}>
      <LiquidY className="h-6 w-6" />
      <span className="font-[family-name:var(--font-bubble)] text-[15px] tracking-tight">THE YARD</span>
    </span>
  );
}
