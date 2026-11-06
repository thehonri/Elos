"use client";
import { useEffect, useState } from "react";
import { sb } from "@/lib/supabase";

export type VaultItem = { id: string; kind: string; content: string | null; storage_path: string | null; author: string; for_user: string | null; created_at: string };

const KIND: Record<string, string> = { photo: "Foto", phrase: "Frase", compliment: "Elogio", message: "Mensagem pra você", moment: "Momento" };

export function VaultCard({ item }: { item: VaultItem }) {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    if (item.storage_path) sb().storage.from("elo").createSignedUrl(item.storage_path, 3600).then(({ data }) => setUrl(data?.signedUrl ?? null));
  }, [item.storage_path]);
  return (
    <article className="float-in card overflow-hidden">
      {url && <img src={url} alt="" className="max-h-72 w-full object-cover" />}
      <div className="p-4">
        <p className="label">{KIND[item.kind] ?? "Do Cofre"}</p>
        {item.content && <p className="mt-1 text-lg leading-snug">{item.content}</p>}
        <p className="mt-2 text-xs text-[var(--muted)]">{new Date(item.created_at).toLocaleDateString("pt-BR", { day: "numeric", month: "long", year: "numeric" })}</p>
      </div>
    </article>
  );
}
