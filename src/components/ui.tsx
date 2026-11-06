"use client";
import Link from "next/link";
import { IconBack } from "./Icons";

export function Header({ title, back, right }: { title: string; back?: string; right?: React.ReactNode }) {
  return (
    <header className="safe-top flex items-center gap-2 px-6 pb-3">
      {back && (
        <Link href={back} className="-ml-2 grid h-11 w-11 place-items-center rounded-full" aria-label="Voltar">
          <IconBack />
        </Link>
      )}
      <h1 className="flex-1 text-[28px] font-extrabold tracking-tight">{title}</h1>
      {right}
    </header>
  );
}

export type Tone = "mint" | "peach" | "lavender" | "butter" | "sky" | "blush";

export function Section({ title, children, action, tone }: { title?: string; children: React.ReactNode; action?: React.ReactNode; tone?: Tone }) {
  return (
    <section className={tone ? "tone-card p-5" : "card p-5"} style={tone ? { background: `var(--${tone})` } : undefined}>
      {(title || action) && (
        <div className="mb-3 flex items-center justify-between">
          {title && <h2 className="text-lg font-bold">{title}</h2>}
          {action}
        </div>
      )}
      {children}
    </section>
  );
}

export function Chips<T extends string>({
  options,
  value,
  onToggle,
}: {
  options: { id: T; label: string }[];
  value: T[];
  onToggle: (id: T) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((o) => (
        <button type="button" key={o.id} className="chip" aria-pressed={value.includes(o.id)} onClick={() => onToggle(o.id)}>
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function Toast({ text }: { text: string | null }) {
  if (!text) return null;
  return (
    <div role="status" className="float-in fixed inset-x-0 bottom-28 z-50 mx-auto w-fit max-w-[90%] rounded-full bg-[var(--ink)] px-6 py-3 text-center text-sm font-semibold text-[var(--bg)] shadow-lg">
      {text}
    </div>
  );
}

export function toggle<T>(arr: T[], v: T) {
  return arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v];
}

export function Logo({ size = 72 }: { size?: number }) {
  return <img src="/brand/logo.png" alt="Elo" width={size} height={Math.round(size * 0.476)} style={{ width: size, height: "auto" }} />;
}
