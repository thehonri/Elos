// Os dois gatos da casa, reagindo ao clima do casal.
export type CatMood = "sleeping" | "cuddling" | "playing" | "idle";

function Cat({ x, color, pose, flip = false }: { x: number; color: string; pose: CatMood; flip?: boolean }) {
  const t = `translate(${x} 0) ${flip ? "scale(-1 1) translate(-120 0)" : ""}`;
  if (pose === "sleeping") {
    return (
      <g transform={t}>
        <ellipse cx="60" cy="92" rx="44" ry="22" fill={color} />
        <circle cx="30" cy="82" r="18" fill={color} />
        <path d="M17 70 L20 56 L30 66 Z M34 66 L42 55 L44 70 Z" fill={color} />
        <path d="M22 82 q4 3 8 0 M33 82 q4 3 8 0" stroke="var(--ink)" strokeWidth="2" fill="none" strokeLinecap="round" />
        <path d="M100 96 q16 -2 10 -20" stroke={color} strokeWidth="9" fill="none" strokeLinecap="round" />
      </g>
    );
  }
  if (pose === "playing") {
    return (
      <g transform={t} className="cat-bounce">
        <ellipse cx="60" cy="84" rx="30" ry="22" fill={color} />
        <circle cx="60" cy="52" r="20" fill={color} />
        <path d="M44 40 L46 22 L58 36 Z M62 36 L74 22 L76 40 Z" fill={color} />
        <circle cx="53" cy="52" r="3" fill="var(--ink)" />
        <circle cx="67" cy="52" r="3" fill="var(--ink)" />
        <path d="M56 60 q4 4 8 0" stroke="var(--ink)" strokeWidth="2" fill="none" strokeLinecap="round" />
        <path d="M34 70 q-14 -10 -8 -24" stroke={color} strokeWidth="8" fill="none" strokeLinecap="round" />
        <path d="M88 84 q22 -6 18 -30" stroke={color} strokeWidth="8" fill="none" strokeLinecap="round" />
      </g>
    );
  }
  // cuddling / idle: sentado
  return (
    <g transform={t}>
      <ellipse cx="60" cy="88" rx="28" ry="22" fill={color} />
      <circle cx="60" cy="58" r="19" fill={color} />
      <path d="M45 46 L47 30 L58 42 Z M62 42 L73 30 L75 46 Z" fill={color} />
      {pose === "cuddling" ? (
        <path d="M51 58 q3 3 6 0 M63 58 q3 3 6 0" stroke="var(--ink)" strokeWidth="2" fill="none" strokeLinecap="round" />
      ) : (
        <g fill="var(--ink)">
          <circle cx="54" cy="58" r="2.6" />
          <circle cx="66" cy="58" r="2.6" />
        </g>
      )}
      <path d="M57 65 q3 2 6 0" stroke="var(--ink)" strokeWidth="2" fill="none" strokeLinecap="round" />
      <path d="M86 100 q20 0 14 -22" stroke={color} strokeWidth="8" fill="none" strokeLinecap="round" />
    </g>
  );
}

export function Cats({ mood, names }: { mood: CatMood; names?: [string?, string?] }) {
  const caption: Record<CatMood, string> = {
    sleeping: "dormindo juntinhos",
    cuddling: "enroscados num colo",
    playing: "brincando pela casa",
    idle: "de olho em vocês",
  };
  return (
    <figure className="flex flex-col items-center">
      <svg viewBox="0 0 260 130" className="w-full max-w-[280px]" role="img" aria-label={`Gatos ${caption[mood]}`}>
        {mood === "cuddling" && <ellipse cx="130" cy="112" rx="112" ry="16" fill="var(--blush)" opacity=".6" />}
        {mood === "sleeping" && (
          <text x="200" y="40" fontSize="16" fill="var(--muted)" className="zzz">z z</text>
        )}
        <Cat x={mood === "sleeping" ? 40 : 10} color="#d9a37a" pose={mood} />
        <Cat x={mood === "sleeping" ? 100 : 130} color="#8c8a93" pose={mood} flip />
        {mood === "playing" && <circle cx="130" cy="112" r="8" fill="var(--accent)" className="cat-ball" />}
      </svg>
      <figcaption className="text-sm text-[var(--muted)]">
        {names?.filter(Boolean).length ? `${names.filter(Boolean).join(" e ")} ${caption[mood]}` : `Os gatos ${caption[mood]}`}
      </figcaption>
    </figure>
  );
}

export function catMoodFor(a: number | null, b: number | null): CatMood {
  const vals = [a, b].filter((x): x is number => x != null);
  if (!vals.length) return "idle";
  if (vals.some((v) => v <= 2)) return "cuddling";
  if (vals.length === 2 && vals.every((v) => v >= 4)) return vals.every((v) => v === 5) ? "playing" : "sleeping";
  return vals.every((v) => v >= 4) ? "playing" : "idle";
}
