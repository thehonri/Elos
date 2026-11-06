"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useApp } from "@/lib/app-context";

export default function Home() {
  const router = useRouter();
  const { ready, session, me } = useApp();
  useEffect(() => {
    if (!ready) return;
    router.replace(!session ? "/entrar" : me?.onboarded_at ? "/nos" : "/onboarding");
  }, [ready, session, me, router]);
  return <main className="grid min-h-dvh place-items-center text-[var(--muted)]">Elo</main>;
}
