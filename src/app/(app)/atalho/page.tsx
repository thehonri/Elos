"use client";
import Link from "next/link";
import { Header, Section } from "@/components/ui";

export default function Atalho() {
  const url = typeof window !== "undefined" ? `${location.origin}/api/checkin/quick` : "/api/checkin/quick";
  return (
    <main className="flex flex-col gap-4">
      <Header title="Check-in pelo Atalho" back="/ajustes" />
      <div className="flex flex-col gap-4 px-5 leading-relaxed">
        <Section title="1. Gere seu token">
          <p>Em <Link href="/ajustes" className="underline">Ajustes → Atalho do iPhone</Link>, toque em <b>Gerar token pessoal</b> e copie. Ele é só seu e pode ser revogado a qualquer momento.</p>
        </Section>
        <Section title="2. Monte o atalho">
          <ol className="list-decimal space-y-2 pl-5">
            <li>Abra o app <b>Atalhos</b> → <b>+</b> → dê o nome <b>Check-in Elo</b>.</li>
            <li>Adicione <b>Escolher do Menu</b> com o texto “Como você está?” e 5 opções: <b>5 muito bem</b>, <b>4 bem</b>, <b>3 mais ou menos</b>, <b>2 difícil</b>, <b>1 muito difícil</b>.</li>
            <li>Dentro de cada opção, adicione <b>Texto</b> com só o número (5, 4, 3, 2 ou 1).</li>
            <li>Depois do menu, adicione <b>Obter Conteúdo do URL</b>:
              <ul className="mt-1 list-disc space-y-1 pl-5 text-sm">
                <li>URL: <code className="break-all rounded bg-[var(--chip)] px-1">{url}</code></li>
                <li>Método: <b>POST</b></li>
                <li>Cabeçalhos: <b>Authorization</b> = <code className="rounded bg-[var(--chip)] px-1">Bearer SEU_TOKEN</code></li>
                <li>Corpo da Solicitação: <b>JSON</b>, campo <b>mood</b> (Número) = <b>Resultado do Menu</b></li>
              </ul>
            </li>
            <li>(Opcional) <b>Mostrar Notificação</b> com “Check-in salvo”.</li>
          </ol>
        </Section>
        <Section title="3. Duas automações">
          <ol className="list-decimal space-y-2 pl-5">
            <li>Atalhos → <b>Automação</b> → <b>+</b> → <b>Horário do Dia</b> → <b>8:30</b>, Repetir <b>Semanalmente</b>, marque <b>segunda a sexta</b> → ação <b>Executar Atalho</b> → Check-in Elo.</li>
            <li>Repita com <b>11:00</b> e só <b>sábado e domingo</b>.</li>
            <li>Em cada uma, escolha <b>Executar Imediatamente</b>. Como o atalho tem um menu, o iPhone mostra uma notificação: toque nela para escolher o rosto.</li>
          </ol>
        </Section>
        <Section title="4. Widget">
          <p>Na Tela de Início, segure → <b>Editar</b> → <b>Adicionar Widget</b> → <b>Atalhos</b> → escolha o tamanho → toque no widget e selecione <b>Check-in Elo</b>. Um toque abre o menu dos 5 rostos.</p>
        </Section>
        <p className="text-center text-xs text-[var(--muted)]">Se o token vazar, revogue em Ajustes e gere outro.</p>
      </div>
    </main>
  );
}
