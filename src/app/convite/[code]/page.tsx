"use client";
import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { sb, api } from "@/lib/supabase";
import { useApp } from "@/lib/app-context";
import { Cats } from "@/components/Cats";
import { Logo } from "@/components/ui";

export default function Convite({ params }: { params: Promise<{ code: string }> }) {
  const { code } = use(params);
  const router = useRouter();
  const { refresh, session, me } = useApp();
  const [info, setInfo] = useState<{ valid: boolean; inviter: string; full: boolean } | null | undefined>(undefined);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    sb().rpc("invite_info", { p_code: code }).then(({ data }) => setInfo(data ?? null));
  }, [code]);

  async function join(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    try {
      if (!session) {
        await api("/api/signup", { mode: "join", code, email, password });
        const { error } = await sb().auth.signInWithPassword({ email, password });
        if (error) throw new Error("Não deu para entrar.");
      }
      const r = await sb().rpc("join_couple", { p_code: code, p_name: name });
      if (r.error) throw new Error(r.error.message.includes("full") ? "Esse convite já foi usado." : "Não deu para entrar no casal.");
      await refresh();
      router.replace("/onboarding");
    } catch (err) {
      setMsg((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  if (info === undefined) return <main className="p-8 text-center text-[var(--muted)]">Abrindo o convite…</main>;
  if (!info || info.full) {
    return (
      <main className="mx-auto max-w-md p-8 text-center">
        <h1 className="text-2xl font-bold">Convite indisponível</h1>
        <p className="mt-2 text-[var(--muted)]">{info?.full ? "Esse casal já está completo." : "Esse link não é válido."}</p>
      </main>
    );
  }
  if (session && me) {
    router.replace("/nos");
    return null;
  }

  return (
    <main className="safe-top mx-auto flex min-h-dvh max-w-md flex-col px-6 pb-10">
      <div className="mt-6 flex justify-center"><Logo size={110} /></div>
      <h1 className="mt-4 text-center text-3xl font-extrabold tracking-tight">
        {info.inviter ? `${info.inviter} te chamou pro Elo` : "Você foi convidado(a) pro Elo"}
      </h1>
      <p className="mt-2 text-center text-[var(--muted)]">Um lugar dos dois, para os dois. Você escolhe o que compartilha.</p>
      <div className="my-6"><Cats mood="cuddling" /></div>
      <form onSubmit={join} className="card flex flex-col gap-3 p-5">
        <label className="label" htmlFor="name">Seu nome</label>
        <input id="name" className="input" value={name} onChange={(e) => setName(e.target.value)} required autoComplete="given-name" />
        {!session && (
          <>
            <label className="label" htmlFor="email">E-mail</label>
            <input id="email" className="input" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
            <label className="label" htmlFor="password">Crie uma senha</label>
            <input id="password" className="input" type="password" autoComplete="new-password" minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} required />
          </>
        )}
        <button className="btn mt-2" disabled={busy}>{busy ? "Um instante…" : "Entrar no Elo"}</button>
        {msg && <p role="status" className="text-center text-sm text-[var(--muted)]">{msg}</p>}
      </form>
      <p className="mt-4 text-center text-xs text-[var(--muted)]">
        Dica: crie a conta já pelo app instalado na Tela de Início. Se abriu no Safari, tudo bem: depois é só entrar de novo pelo app.
      </p>
    </main>
  );
}
