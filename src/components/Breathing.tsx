"use client";
import { useEffect, useState } from "react";

export function Breathing({ seconds = 60, onDone }: { seconds?: number; onDone?: () => void }) {
  const [left, setLeft] = useState(seconds);
  useEffect(() => {
    const t = setInterval(() => setLeft((l) => (l <= 1 ? (clearInterval(t), onDone?.(), 0) : l - 1)), 1000);
    return () => clearInterval(t);
  }, [onDone]);
  const phase = (seconds - left) % 10;
  const label = phase < 4 ? "inspira" : phase < 6 ? "segura" : "solta";
  return (
    <div className="flex flex-col items-center gap-3 py-2" aria-live="polite">
      <div className="relative grid h-40 w-40 place-items-center">
        <div className="breathe absolute inset-0 rounded-full bg-[var(--blush)]" />
        <p className="relative text-xl font-bold">{label}</p>
      </div>
      <p className="text-sm text-[var(--muted)]">{left}s</p>
    </div>
  );
}
