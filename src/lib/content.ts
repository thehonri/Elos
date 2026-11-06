// Textos fixos do app (pt-BR). Tom leve, carinhoso e adulto.
export type Role = "her" | "him";

export const MOOD_LABEL: Record<number, string> = {
  1: "muito difícil",
  2: "difícil",
  3: "mais ou menos",
  4: "bem",
  5: "muito bem",
};
export const MOOD_SIMPLE_LABEL: Record<string, string> = {
  dificil: "difícil",
  mais_ou_menos: "mais ou menos",
  bem: "bem",
};

export const WANTS: { id: string; label: string }[] = [
  { id: "espaco", label: "espaço" },
  { id: "colo", label: "colo" },
  { id: "sair", label: "sair" },
  { id: "casa", label: "ficar em casa" },
  { id: "conversar", label: "conversar" },
];

export const SYMPTOMS: { id: string; label: string }[] = [
  { id: "colica", label: "cólica" },
  { id: "dor_cabeca", label: "dor de cabeça" },
  { id: "dor_lombar", label: "dor nas costas" },
  { id: "inchaco", label: "inchaço" },
  { id: "cansaco", label: "cansaço" },
  { id: "insonia", label: "dormi mal" },
  { id: "desejo_doce", label: "vontade de doce" },
  { id: "seios_sensiveis", label: "seios sensíveis" },
  { id: "enjoo", label: "enjoo" },
  { id: "acne", label: "pele" },
  { id: "ansiedade", label: "ansiedade" },
  { id: "irritacao", label: "irritação" },
];
export const SYMPTOM_CATEGORY_LABEL: Record<string, string> = {
  dor: "dor",
  desconforto: "desconforto",
  cansaco: "cansaço",
  apetite: "apetite",
  pele: "pele",
  emocional: "emocional",
  outro: "outro",
};

export function quickRequests(role: Role) {
  const q = role === "her" ? "quieta" : "quieto";
  return [
    { id: "chocolate", label: "Traz um chocolate" },
    { id: "massagem", label: "Massagem" },
    { id: "quieto", label: `Me deixa ${q} hoje` },
    { id: "sair", label: "Bora sair" },
    { id: "colo", label: "Colo" },
    { id: "tempo", label: "Um tempo pra mim" },
    { id: "companhia", label: "Quero companhia" },
    { id: "espaco", label: "Preciso de espaço" },
  ];
}
export function requestLabel(type: string, fromRole: Role, custom?: string | null) {
  if (type === "custom") return custom ?? "Pedido";
  return quickRequests(fromRole).find((r) => r.id === type)?.label ?? type;
}

export const TOUCHES = [
  { id: "saudade", label: "Saudade" },
  { id: "pensando", label: "Pensando em você" },
  { id: "bom_dia", label: "Bom dia" },
  { id: "orgulho", label: "Orgulho de você" },
  { id: "ronronar", label: "Os gatos mandaram um ronronar" },
] as const;
export const touchLabel = (k: string) => TOUCHES.find((t) => t.id === k)?.label ?? k;

export const REACTIONS = [
  { id: "loved", label: "amei" },
  { id: "thanks", label: "valeu" },
  { id: "next_time", label: "da próxima, outra coisa" },
] as const;

export const CONTEXT_CATEGORIES: { id: string; label: string; hint: string }[] = [
  { id: "comida", label: "Comida", hint: "japonês, pizza, a lasanha da mãe" },
  { id: "doce", label: "Doce", hint: "brigadeiro, sorvete de pistache" },
  { id: "restaurante", label: "Restaurante", hint: "aquele italiano do bairro" },
  { id: "filme", label: "Filme/série", hint: "comédia romântica, documentário" },
  { id: "lugar", label: "Lugar", hint: "parque, praia, livraria" },
  { id: "presente", label: "Presente", hint: "flores, livro, vela" },
  { id: "gesto", label: "Gesto", hint: "bilhete, café na cama" },
  { id: "irrita", label: "Coisas que irritam", hint: "barulho cedo, atraso" },
  { id: "linguagem_amor", label: "Linguagem do amor", hint: "toque, palavras, tempo junto" },
];

/** Tags de "quando funciona" que o motor entende. */
export const CONTEXT_TAGS: { id: string; label: string }[] = [
  { id: "dia_dificil", label: "dia difícil" },
  { id: "dia_bom", label: "dia bom" },
  { id: "energia_baixa", label: "energia baixa" },
  { id: "energia_alta", label: "energia alta" },
  { id: "quer_colo", label: "quando quer colo" },
  { id: "quer_espaco", label: "quando quer espaço" },
  { id: "quer_sair", label: "quando quer sair" },
  { id: "quer_casa", label: "quando quer ficar em casa" },
  { id: "quer_conversar", label: "quando quer conversar" },
  { id: "menstrual", label: "menstruação" },
  { id: "tpm", label: "TPM" },
  { id: "ovulatoria", label: "pico de energia" },
  { id: "chuva", label: "dia de chuva" },
];

/** Sugestões prontas para o checklist (tocar, sem digitar). */
export const STARTER_CONTEXT: { category: string; title: string; tags: string[]; cost_level: number }[] = [
  { category: "comida", title: "Delivery de japonês", tags: ["energia_baixa", "quer_casa", "dia_dificil"], cost_level: 2 },
  { category: "comida", title: "Pizza no sofá", tags: ["quer_casa", "energia_baixa", "chuva"], cost_level: 2 },
  { category: "comida", title: "Sopa quentinha", tags: ["menstrual", "energia_baixa", "chuva"], cost_level: 1 },
  { category: "doce", title: "Brigadeiro de panela", tags: ["tpm", "dia_dificil"], cost_level: 1 },
  { category: "doce", title: "Chocolate amargo", tags: ["tpm", "menstrual"], cost_level: 1 },
  { category: "doce", title: "Sorvete", tags: ["dia_bom", "dia_dificil"], cost_level: 1 },
  { category: "filme", title: "Comédia romântica", tags: ["quer_casa", "dia_dificil", "chuva"], cost_level: 1 },
  { category: "filme", title: "Série de conforto", tags: ["energia_baixa", "quer_casa"], cost_level: 1 },
  { category: "lugar", title: "Caminhada no parque", tags: ["energia_alta", "quer_sair", "dia_bom"], cost_level: 1 },
  { category: "lugar", title: "Livraria com café", tags: ["quer_sair", "quer_conversar"], cost_level: 2 },
  { category: "restaurante", title: "Jantar naquele restaurante favorito", tags: ["dia_bom", "quer_sair", "ovulatoria"], cost_level: 3 },
  { category: "restaurante", title: "Café da manhã fora", tags: ["quer_sair", "quer_conversar"], cost_level: 2 },
  { category: "gesto", title: "Café na cama", tags: ["dia_dificil", "energia_baixa"], cost_level: 1 },
  { category: "gesto", title: "Bilhete escondido", tags: ["dia_bom", "dia_dificil"], cost_level: 1 },
  { category: "gesto", title: "Banho preparado com vela", tags: ["dia_dificil", "menstrual", "energia_baixa"], cost_level: 1 },
  { category: "gesto", title: "Massagem nos pés", tags: ["energia_baixa", "quer_colo", "menstrual"], cost_level: 1 },
  { category: "presente", title: "Flores sem motivo", tags: ["dia_bom", "dia_dificil"], cost_level: 2 },
  { category: "linguagem_amor", title: "Tempo junto sem celular", tags: ["quer_conversar", "quer_colo"], cost_level: 1 },
  { category: "linguagem_amor", title: "Palavras de afirmação", tags: ["dia_dificil"], cost_level: 1 },
  { category: "irrita", title: "Barulho logo cedo", tags: [], cost_level: 1 },
];

export const CARE_TIPS: Record<string, { title: string; items: string[] }> = {
  self_esteem: {
    title: "Um cuidado de 10 minutos",
    items: ["Banho demorado, sem pressa", "Vestir aquela roupa favorita", "Uma música que te lembra quem você é"],
  },
  tired: {
    title: "Permissão para desacelerar",
    items: ["Bolsa térmica onde dói", "Um copo d'água agora", "Deitar 20 minutos sem culpa", "Deixar uma tarefa pra amanhã"],
  },
  happy: {
    title: "Use essa energia em algo seu",
    items: ["Aquele projeto parado", "Um passeio que você adora", "Ligar pra alguém querido"],
  },
};

export const PARTNER_TIP: Record<string, string> = {
  self_esteem: "Elogie algo específico que ela fez, não só a aparência.",
  sad: "Presença sem tentar resolver. O pedido dela diz se é pra chegar perto ou dar espaço.",
  irritated: "Hoje ela pediu espaço. Sem perguntas, sem levar pro pessoal.",
  tired: "Assuma as tarefas da casa e dos gatos hoje.",
  happy: "Bom dia pra um programa fora de casa ou um encontro.",
  him_low: "Ele não está num dia bom. Um gesto pequeno e presença ajudam mais que conselhos.",
};

export const CONTRACEPTION_LABEL: Record<string, string> = {
  none: "Nenhum",
  hormonal_pill: "Pílula",
  iud_hormonal: "DIU hormonal",
  other: "Outro",
};
