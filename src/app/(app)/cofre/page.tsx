"use client";
import { useCallback, useEffect, useState } from "react";
import { sb } from "@/lib/supabase";
import { useApp } from "@/lib/app-context";
import { todayIn } from "@/lib/dates";
import { Header, Section, Toast } from "@/components/ui";
import { useToast } from "@/components/useToast";
import { VaultCard, type VaultItem } from "@/components/VaultCard";

const KINDS = [
  { id: "phrase", label: "Uma frase" },
  { id: "compliment", label: "Um elogio que recebi" },
  { id: "message", label: "Mensagem pra um dia ruim" },
  { id: "photo", label: "Uma foto" },
] as const;

export default function Cofre() {
  const { me, partner, pets } = useApp();
  const [items, setItems] = useState<VaultItem[]>([]);
  const [kind, setKind] = useState<(typeof KINDS)[number]["id"] | null>(null);
  const [text, setText] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [petId, setPetId] = useState<string | null>(null);
  const toast = useToast();
  const today = todayIn(me?.timezone);

  const load = useCallback(async () => {
    const { data } = await sb().from("vault_items").select("*").order("created_at", { ascending: false }).limit(100);
    setItems((data as VaultItem[]) ?? []);
  }, []);
  useEffect(() => { load(); }, [load]);
  if (!me) return null;

  async function save(e: React.FormEvent) {
    e.preventDefault();
    let storage_path: string | null = null;
    if (kind === "photo") {
      if (!file) return;
      storage_path = `${me!.couple_id}/vault/${crypto.randomUUID()}.${(file.name.split(".").pop() || "jpg").toLowerCase()}`;
      const up = await sb().storage.from("elo").upload(storage_path, file, { contentType: file.type });
      if (up.error) { toast.show("Não deu pra subir a foto"); return; }
    }
    const { error } = await sb().from("vault_items").insert({
      couple_id: me!.couple_id,
      author: me!.user_id,
      kind,
      content: text.trim() || null,
      storage_path,
      pet_id: petId,
      for_user: kind === "message" ? partner?.user_id ?? null : null,
    });
    if (error) { toast.show("Não deu pra guardar"); return; }
    toast.show(kind === "message" ? "Guardada. Chega no próximo dia difícil." : "Guardado no Cofre");
    setKind(null); setText(""); setFile(null); setPetId(null);
    load();
  }

  const md = today.slice(5);
  const yearAgo = items.filter((i) => i.created_at.slice(5, 10) === md && i.created_at.slice(0, 4) < today.slice(0, 4));

  return (
    <main className="flex flex-col gap-4">
      <Header title="Cofre do casal" back="/nos" />
      <div className="flex flex-col gap-5 px-6">
        {yearAgo.length > 0 && (
          <Section title="Neste dia, há um ano">
            <div className="flex flex-col gap-3">{yearAgo.map((v) => <VaultCard key={v.id} item={v} />)}</div>
          </Section>
        )}
        <Section title="Guardar">
          <div className="grid grid-cols-2 gap-2">
            {KINDS.map((k) => (
              <button key={k.id} className="chip justify-center" aria-pressed={kind === k.id} onClick={() => setKind(kind === k.id ? null : k.id)} data-testid={`vault-${k.id}`}>{k.label}</button>
            ))}
          </div>
          {kind && (
            <form onSubmit={save} className="mt-3 flex flex-col gap-2">
              {kind === "photo" && <input type="file" accept="image/*" onChange={(e) => setFile(e.target.files?.[0] ?? null)} aria-label="Foto" />}
              {kind === "photo" && pets.length > 0 && (
                <div className="flex flex-wrap gap-2">{pets.map((p) => <button type="button" key={p.id} className="chip" aria-pressed={petId === p.id} onClick={() => setPetId(petId === p.id ? null : p.id)}>{p.name}</button>)}</div>
              )}
              <textarea className="input" maxLength={500} value={text} onChange={(e) => setText(e.target.value)} aria-label="Texto"
                placeholder={kind === "message" ? `Escreva algo para ${partner?.name || "seu amor"} ler num dia difícil` : kind === "photo" ? "Legenda (opcional)" : "Escreva aqui"} required={kind !== "photo"} />
              <button className="btn">Guardar</button>
            </form>
          )}
        </Section>
        <div className="flex flex-col gap-3">
          {items.map((v) => <VaultCard key={v.id} item={v} />)}
          {!items.length && <p className="text-center text-sm text-[var(--muted)]">O Cofre ainda está vazio. Guarde uma coisa boa hoje.</p>}
        </div>
      </div>
      <Toast text={toast.text} />
    </main>
  );
}
