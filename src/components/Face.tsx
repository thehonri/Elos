// Rostos próprios do Elo (1 = muito difícil … 5 = muito bem).
const FILL: Record<number, string> = { 1: "#d6caf6", 2: "#c4e1fb", 3: "#fde9a9", 4: "#a9ecdb", 5: "#ffc7b3" };

export function Face({ mood, size = 64, title }: { mood: number; size?: number; title?: string }) {
  const mouth: Record<number, string> = {
    1: "M22 46 Q32 36 42 46",
    2: "M23 44 Q32 39 41 44",
    3: "M23 43 L41 43",
    4: "M22 40 Q32 48 42 40",
    5: "M20 38 Q32 54 44 38 Z",
  };
  const eyes =
    mood === 5 ? (
      <g stroke="var(--ink)" strokeWidth="3" strokeLinecap="round" fill="none">
        <path d="M18 27 Q22 22 26 27" />
        <path d="M38 27 Q42 22 46 27" />
      </g>
    ) : mood === 1 ? (
      <g stroke="var(--ink)" strokeWidth="3" strokeLinecap="round" fill="none">
        <path d="M18 25 L26 28" />
        <path d="M46 25 L38 28" />
      </g>
    ) : (
      <g fill="var(--ink)">
        <circle cx="22" cy="27" r="3.2" />
        <circle cx="42" cy="27" r="3.2" />
      </g>
    );
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" role="img" aria-label={title}>
      {title && <title>{title}</title>}
      <circle cx="32" cy="32" r="29" fill={FILL[mood]} />
      <circle cx="32" cy="32" r="29" fill="none" stroke="var(--ink)" strokeOpacity=".08" strokeWidth="2" />
      {eyes}
      {(mood === 4 || mood === 5) && (
        <g fill="#ff9fb4" opacity=".55">
          <ellipse cx="15" cy="36" rx="5" ry="3" />
          <ellipse cx="49" cy="36" rx="5" ry="3" />
        </g>
      )}
      {mood === 1 && <path d="M45 33 q2 5 0 7 q-2 -2 0 -7" fill="#7fa7d6" />}
      <path d={mouth[mood]} stroke="var(--ink)" strokeWidth="3" strokeLinecap="round" fill={mood === 5 ? "#7a3a45" : "none"} />
    </svg>
  );
}

export function EmptyFace({ size = 64 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-label="sem check-in">
      <circle cx="32" cy="32" r="29" fill="none" stroke="var(--muted)" strokeDasharray="5 6" strokeWidth="2.5" />
      <text x="32" y="38" textAnchor="middle" fontSize="18" fill="var(--muted)">?</text>
    </svg>
  );
}
