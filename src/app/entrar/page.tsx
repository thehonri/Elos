"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { sb, api } from "@/lib/supabase";
import { useApp } from "@/lib/app-context";
import { Cats } from "@/components/Cats";

export default function Entrar() {
  const router = useRouter();
  const { ready, session, me } = useApp();
  const [mode, setMode] = useState<"login" | "create" | "forgot">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [role, setRole] = useState<"him" | "her">("him");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    if (ready && session) router.replace(me?.onboarded_at ? "/nos" : "/onboarding");
  }, [ready, session, me, router]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    try {
      if (mode === "forgot") {
        const { error } = await sb().auth.resetPasswordForEmail(email, { redirectTo: `${location.origin}/redefinir` });
        setMsg(error ? "Não deu para enviar agora. Tente de novo em alguns minutos." : "Se houver uma conta, enviamos um link. Abra-o, crie a nova senha e volte para o app.");
        return;
      }
      if (mode === "create") {
        await api("/api/signup", { mode: "create", email, password });
      }
      const { error } = await sb().auth.signInWithPassword({ email, password });
      if (error) throw new Error("E-mail ou senha não conferem.");
      if (mode === "create") {
        const r = await sb().rpc("create_couple", { p_name: name, p_role: role });
        if (r.error) throw new Error("Não deu para criar o casal.");
      }
      router.replace("/onboarding");
    } catch (err) {
      setMsg((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="safe-top mx-auto flex min-h-dvh max-w-md flex-col px-5 pb-10">
      <div className="mt-6 text-center">
        <h1 className="text-4xl font-extrabold text-[var(--accent)]">Elo</h1>
        <p className="mt-1 text-[var(--muted)]">o lugar de vocês dois</p>
      </div>
      <div className="my-6"><Cats mood="sleeping" /></div>

      <form onSubmit={submit} className="card flex flex-col gap-3 p-5">
        {mode === "create" && (
          <>
            <label className="label" htmlFor="name">Seu nome</label>
            <input id="name" className="input" value={name} onChange={(e) => setName(e.target.value)} required autoComplete="given-name" />
            <span className="label">Você é</span>
            <div className="flex gap-2">
              {(["him", "her"] as const).map((r) => (
                <button type="button" key={r} className="chip flex-1 justify-center" aria-pressed={role === r} onClick={() => setRole(r)}>
                  {r === "him" ? "ele" : "ela"}
                </button>
              ))}
            </div>
          </>
        )}
        <label className="label" htmlFor="email">E-mail</label>
        <input id="email" className="input" type="email" inputMode="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        {mode !== "forgot" && (
          <>
            <label className="label" htmlFor="password">Senha</label>
            <input id="password" className="input" type="password" autoComplete={mode === "create" ? "new-password" : "current-password"} minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} required />
          </>
        )}
        <button className="btn mt-2" disabled={busy}>
          {busy ? "Um instante…" : mode === "login" ? "Entrar" : mode === "create" ? "Criar nosso casal" : "Enviar link"}
        </button>
        {msg && <p role="status" className="text-center text-sm text-[var(--muted)]">{msg}</p>}
      </form>

      <div className="mt-5 flex flex-col items-center gap-2 text-sm">
        {mode !== "login" && <button className="underline" onClick={() => setMode("login")}>Já tenho conta</button>}
        {mode === "login" && <button className="underline" onClick={() => setMode("create")}>Criar o casal (primeira vez)</button>}
        {mode === "login" && <button className="text-[var(--muted)] underline" onClick={() => setMode("forgot")}>Esqueci a senha</button>}
        <p className="mt-3 text-center text-xs text-[var(--muted)]">Recebeu um convite? Abra o link que te mandaram.</p>
      </div>
    </main>
  );
}
