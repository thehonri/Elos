"use client";
import { useState } from "react";
import { useApp } from "@/lib/app-context";

export function InviteBox() {
  const { inviteCode, partner } = useApp();
  const [copied, setCopied] = useState(false);
  if (partner) return <p className="card p-4 text-center">{partner.name || "Seu amor"} já está no Elo com você.</p>;
  if (!inviteCode) return null;
  const url = typeof window !== "undefined" ? `${location.origin}/convite/${inviteCode}` : "";
  async function share() {
    if (navigator.share) {
      try { await navigator.share({ title: "Elo", text: "Vem pro Elo comigo", url }); return; } catch { /* cancelado */ }
    }
    await navigator.clipboard?.writeText(url);
    setCopied(true);
  }
  return (
    <div className="card flex flex-col gap-3 p-4">
      <p className="break-all rounded-2xl bg-[var(--chip)] p-3 text-sm" data-testid="invite-url">{url}</p>
      <button className="btn" onClick={share}>{copied ? "Link copiado" : "Mandar o convite"}</button>
    </div>
  );
}
