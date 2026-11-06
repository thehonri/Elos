"use client";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { sb, api } from "@/lib/supabase";
import { useApp } from "@/lib/app-context";
import { WEEKDAYS } from "@/lib/dates";
import { CONTRACEPTION_LABEL } from "@/lib/content";
import { enablePush, pushStatus } from "@/lib/push-client";
import { Header, Section, Toast } from "@/components/ui";
import { useToast } from "@/components/useToast";
import { ShareSettingsForm } from "@/components/ShareSettingsForm";
import { InviteBox } from "@/components/InviteBox";

type Rem = { kind: "checkin" | "reaction"; weekday: number; time: string; enabled: boolean };
type Tok = { id: string; label: string | null; created_at: string; revoked_at: string | null };

async function sha256(s: string) {
  const b = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
  return Array.from(new Uint8Array(b)).map((x) => x.toString(16).padStart(2, "0")).join("");
}

export default function Ajustes() {
  const router = useRouter();
  const { me, share, partner, refresh } = useApp();
  const [rems, setRems] = useState<Rem[]>([]);
  const [tokens, setTokens] = useState<Tok[]>([]);
  const [newToken, setNewToken] = useState<string | null>(null);
  const [push, setPush] = useState<string>("…");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const toast = useToast();

  const load = useCallback(async () => {
    if (!me) return;
    const [r, t] = await Promise.all([
      sb().from("reminder_settings").select("kind, weekday, time, enabled").eq("user_id", me.user_id).order("weekday"),
      sb().from("checkin_tokens").select("id, label, created_at, revoked_at").eq("user_id", me.user_id).order("created_at", { ascending: false }),
    ]);
    setRems((r.data as Rem[]) ?? []);
    setTokens((t.data as Tok[]) ?? []);
    setPush(await pushStatus());
  }, [me]);
  useEffect(() => { load(); }, [load]);
  if (!me) return null;

  async function setRem(r: Rem, patch: Partial<Rem>) {
    setRems((all) => all.map((x) => (x.kind === r.kind && x.weekday === r.weekday ? { ...x, ...patch } : x)));
    await sb().from("reminder_settings").update(patch).eq("user_id", me!.user_id).eq("kind", r.kind).eq("weekday", r.weekday);
  }
  async function pause() {
    await sb().from("share_settings").update({ paused_at: share?.paused_at ? null : new Date().toISOString() }).eq("user_id", me!.user_id);
    await refresh();
  }
  async function contraception(v: string) {
    await sb().from("profiles").update({ contraception: v }).eq("user_id", me!.user_id);
    await refresh();
  }
  async function createToken() {
    const raw = Array.from(crypto.getRandomValues(new Uint8Array(24))).map((x) => x.toString(16).padStart(2, "0")).join("");
    const token = `elo_${raw}`;
    const { error } = await sb().from("checkin_tokens").insert({ user_id: me!.user_id, token_hash: await sha256(token), label: "Atalho do iPhone" });
    if (error) { toast.show("Não deu pra gerar"); return; }
    setNewToken(token);
    load();
  }
  async function revoke(id: string) {
    await sb().from("checkin_tokens").update({ revoked_at: new Date().toISOString() }).eq("id", id);
    load();
  }
  async function turnOnPush() {
    const r = await enablePush(me!.user_id);
    toast.show(r === "ok" ? "Notificações ligadas" : r === "needs_install" ? "Abra o Elo pela Tela de Início para ativar" : r === "denied" ? "Permissão negada no iPhone" : "Não suportado aqui");
    load();
  }
  async function testPush() {
    try {
      const r = await api<{ sent: number }>("/api/push/test", {});
      toast.show(r.sent ? "Push de teste enviado" : "Nenhum aparelho inscrito");
    } catch (e) { toast.show((e as Error).message); }
  }
  async function exportData() {
    const { data, error } = await sb().rpc("export_my_data");
    if (error) { toast.show("Não deu pra exportar"); return; }
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `elo-meus-dados-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
  }
  async function deleteAccount() {
    try {
      await api("/api/account/delete", {});
      await sb().auth.signOut();
      router.replace("/entrar");
    } catch (e) { toast.show((e as Error).message); }
  }
  async function logout() {
    await sb().auth.signOut();
    router.replace("/entrar");
  }

  const group = (kind: Rem["kind"]) => rems.filter((r) => r.kind === kind);

  return (
    <main className="flex flex-col gap-4">
      <Header title="Ajustes" />
      <div className="flex flex-col gap-4 px-5">
        {!partner && <Section title="Convite"><InviteBox /></Section>}

        <Section title="Compartilhamento">
          <button className={`btn w-full ${share?.paused_at ? "" : "btn-soft"}`} onClick={pause} data-testid="settings-pause">
            {share?.paused_at ? "Retomar compartilhamento" : "Pausar compartilhamento agora"}
          </button>
          <p className="mt-2 text-xs text-[var(--muted)]">Pausar corta na hora o acesso de {partner?.name || "seu amor"} ao seu humor e ciclo. Sem motivo, sem aviso.</p>
          <div className="mt-4"><ShareSettingsForm userId={me.user_id} confirmOnSave={me.role === "her"} onSaved={() => { refresh(); toast.show("Salvo"); }} /></div>
        </Section>

        {me.role === "her" && (
          <Section title="Método contraceptivo">
            <div className="flex flex-wrap gap-2">
              {Object.entries(CONTRACEPTION_LABEL).map(([id, l]) => <button key={id} className="chip" aria-pressed={me.contraception === id} onClick={() => contraception(id)}>{l}</button>)}
            </div>
          </Section>
        )}

        <Section title="Notificações">
          <p className="mb-2 text-sm">Neste aparelho: <b>{push === "on" ? "ligadas" : push === "off" ? "desligadas" : "não suportado"}</b></p>
          <div className="grid grid-cols-2 gap-2">
            <button className="btn" onClick={turnOnPush}>Ativar</button>
            <button className="btn btn-soft" onClick={testPush}>Enviar teste</button>
          </div>
          <p className="mt-2 text-xs text-[var(--muted)]">No iPhone, só funciona com o Elo aberto pela Tela de Início (iOS 16.4 ou mais novo).</p>
        </Section>

        {(["checkin", "reaction"] as const).map((kind) => (
          <Section key={kind} title={kind === "checkin" ? "Lembrete de check-in" : "Lembrete de reação (21h)"}>
            <ul className="flex flex-col gap-2">
              {group(kind).map((r) => (
                <li key={r.weekday} className="flex items-center justify-between gap-2">
                  <button className="chip min-w-[110px]" aria-pressed={r.enabled} onClick={() => setRem(r, { enabled: !r.enabled })}>{WEEKDAYS[r.weekday]}</button>
                  <input type="time" className="input max-w-[130px] min-h-[44px]" value={r.time.slice(0, 5)} disabled={!r.enabled} onChange={(e) => setRem(r, { time: e.target.value })} aria-label={`Horário de ${WEEKDAYS[r.weekday]}`} />
                </li>
              ))}
            </ul>
          </Section>
        ))}

        <Section title="Atalho do iPhone" action={<Link href="/atalho" className="text-sm underline">como montar</Link>}>
          {newToken && (
            <div className="mb-3 rounded-2xl bg-[var(--blush)] p-3">
              <p className="text-sm font-bold">Copie agora. Ele não aparece de novo.</p>
              <p className="mt-1 break-all font-mono text-xs" data-testid="new-token">{newToken}</p>
              <button className="btn mt-2 min-h-[44px] w-full" onClick={() => { navigator.clipboard?.writeText(newToken); toast.show("Copiado"); }}>Copiar</button>
            </div>
          )}
          <button className="btn btn-soft w-full" onClick={createToken}>Gerar token pessoal</button>
          <ul className="mt-3 flex flex-col gap-2 text-sm">
            {tokens.map((t) => (
              <li key={t.id} className="flex items-center justify-between">
                <span>{t.label} · {new Date(t.created_at).toLocaleDateString("pt-BR")}{t.revoked_at ? " · revogado" : ""}</span>
                {!t.revoked_at && <button className="underline" onClick={() => revoke(t.id)}>revogar</button>}
              </li>
            ))}
          </ul>
        </Section>

        <Section title="Seus dados">
          <button className="btn btn-soft w-full" onClick={exportData}>Exportar tudo (JSON)</button>
          {!confirmDelete ? (
            <button className="btn btn-ghost mt-2 w-full" onClick={() => setConfirmDelete(true)}>Apagar minha conta</button>
          ) : (
            <div className="mt-2 rounded-2xl bg-[var(--blush)] p-3">
              <p className="text-sm">Isso apaga sua conta e tudo o que é seu, para sempre.</p>
              <div className="mt-2 grid grid-cols-2 gap-2">
                <button className="btn" onClick={deleteAccount}>Apagar</button>
                <button className="btn btn-soft" onClick={() => setConfirmDelete(false)}>Cancelar</button>
              </div>
            </div>
          )}
        </Section>

        <button className="btn btn-ghost w-full" onClick={logout}>Sair</button>
        <p className="pb-2 text-center text-xs text-[var(--muted)]">Elo · sem anúncios, sem rastreamento. Não é dispositivo médico nem método contraceptivo.</p>
      </div>
      <Toast text={toast.text} />
    </main>
  );
}
