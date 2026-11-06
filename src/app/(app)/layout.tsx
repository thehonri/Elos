"use client";
import { useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useApp } from "@/lib/app-context";
import { IconAsk, IconBook, IconCal, IconGear, IconUs } from "@/components/Icons";

const NAV = [
  { href: "/nos", label: "Nós", Icon: IconUs },
  { href: "/pedidos", label: "Pedidos", Icon: IconAsk },
  { href: "/calendario", label: "Calendário", Icon: IconCal },
  { href: "/contexto", label: "Contexto", Icon: IconBook },
  { href: "/ajustes", label: "Ajustes", Icon: IconGear },
];

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { ready, session, me } = useApp();
  const router = useRouter();
  const path = usePathname();
  const fullscreen = path.startsWith("/checkin");

  useEffect(() => {
    if (!ready) return;
    if (!session) router.replace("/entrar");
    else if (!me || !me.onboarded_at) router.replace("/onboarding");
  }, [ready, session, me, router]);

  if (!ready || !session || !me?.onboarded_at) {
    return <main className="grid min-h-dvh place-items-center text-[var(--muted)]" aria-busy>Elo</main>;
  }

  return (
    <div className="mx-auto min-h-dvh max-w-md">
      <div className={fullscreen ? "" : "pb-28"}>{children}</div>
      {!fullscreen && (
        <nav className="safe-bottom fixed inset-x-0 bottom-0 z-40 bg-[var(--card)]/90 shadow-[0_-8px_24px_rgba(16,60,52,.06)] backdrop-blur-xl" aria-label="Principal">
          <ul className="mx-auto flex max-w-md justify-around pt-1.5">
            {NAV.map(({ href, label, Icon }) => {
              const active = path === href || path.startsWith(href + "/");
              return (
                <li key={href}>
                  <Link href={href} className={`flex min-w-[62px] flex-col items-center gap-0.5 rounded-[18px] px-2 py-1.5 text-[11px] font-bold transition-colors ${active ? "bg-[var(--mint)] text-[var(--accent-text)]" : "text-[var(--muted)]"}`} aria-current={active ? "page" : undefined}>
                    <Icon size={24} />
                    {label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
      )}
    </div>
  );
}
