"use client";
import { useState } from "react";
import { sb } from "@/lib/supabase";

export default function Redefinir() {
  const [pw, setPw] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  async function save(e: React.FormEvent) {
    e.preventDefault();
    const { error } = await sb().auth.updateUser({ password: pw });
    setMsg(error ? "O link expirou. Peça outro em Esqueci a senha." : "Senha nova salva. Agora abra o Elo pela Tela de Início e entre com ela.");
  }
  return (
    <main className="safe-top mx-auto max-w-md p-6">
      <h1 className="text-2xl font-bold">Nova senha</h1>
      <form onSubmit={save} className="card mt-4 flex flex-col gap-3 p-5">
        <input className="input" type="password" minLength={8} autoComplete="new-password" value={pw} onChange={(e) => setPw(e.target.value)} required aria-label="Nova senha" />
        <button className="btn">Salvar</button>
        {msg && <p role="status" className="text-sm text-[var(--muted)]">{msg}</p>}
      </form>
    </main>
  );
}
