// Regras de Projeto (Fase 2 do ROTEIRO.md).

/**
 * Responsável técnico sugerido em novos projetos. Cada campo vazio no
 * último projeto cai neste padrão; preenchido, repete o último usado.
 */
export const DEFAULT_TECHNICAL_LEAD = {
  name: "Leandro da Rocha Ducioni",
  crea: "106659-9",
  cert: "IECEx CP TSI22.0030",
};

export const PROJECT_TYPE_LABELS: Record<string, string> = {
  INVENTARIO: "Inventário",
  INSPECAO_EX: "Inspeção Ex",
};

export const GRADE_LABELS: Record<string, string> = {
  VISUAL: "Visual",
  APURADA: "Apurada",
  DETALHADA: "Detalhada",
};

export const STATUS_FLOW = ["RASCUNHO", "EM_CAMPO", "EM_REVISAO", "APROVADO", "EMITIDO"] as const;
export type ProjectStatusCode = (typeof STATUS_FLOW)[number];

export const STATUS_LABELS: Record<string, string> = {
  RASCUNHO: "Rascunho",
  EM_CAMPO: "Em campo",
  EM_REVISAO: "Em revisão",
  APROVADO: "Aprovado",
  EMITIDO: "Emitido",
};

/** Classes Tailwind do selo de cada status. */
export const STATUS_BADGE: Record<string, string> = {
  RASCUNHO: "bg-line/60 text-ink",
  EM_CAMPO: "bg-accent-soft text-accent-ink",
  EM_REVISAO: "bg-brand-soft text-brand",
  APROVADO: "bg-ok-soft text-ok",
  EMITIDO: "bg-brand text-white",
};

// Aprovar e emitir é do administrador (revisor). Também só ele tira um
// projeto de Aprovado/Emitido.
const ADMIN_ONLY: ReadonlySet<string> = new Set(["APROVADO", "EMITIDO"]);

/**
 * O status só anda uma etapa por vez (para frente ou para trás). Devolve a
 * mensagem de erro, ou null se a mudança é permitida.
 */
export function statusChangeError(from: string, to: string, role: string): string | null {
  const i = STATUS_FLOW.indexOf(from as ProjectStatusCode);
  const j = STATUS_FLOW.indexOf(to as ProjectStatusCode);
  if (i === -1 || j === -1) return "Status inválido.";
  if (i === j) return null;
  if (Math.abs(i - j) !== 1) return "O status muda uma etapa por vez.";
  if ((ADMIN_ONLY.has(to) || ADMIN_ONLY.has(from)) && role !== "ADMIN") {
    return "Só o administrador aprova, emite ou reabre projetos aprovados.";
  }
  return null;
}

/** "PI1881" */
export function formatPi(pi: number): string {
  return `PI${pi}`;
}

/** Etiqueta de inspeção do equipamento: EX-INSP-PI1881-0001 (usada na Fase 3). */
export function inspectionTag(pi: number, item: number): string {
  return `EX-INSP-${formatPi(pi)}-${String(item).padStart(4, "0")}`;
}
