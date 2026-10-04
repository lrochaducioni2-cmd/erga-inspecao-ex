// Regras puras do inventário (Fase 3 do ROTEIRO.md) — usadas no navegador
// e no servidor. Código que acessa o banco fica em inventory.ts.

export const ZONE_VALUES = ["ZONA_0", "ZONA_1", "ZONA_2", "ZONA_20", "ZONA_21", "ZONA_22", "NAO_CLASSIFICADA"] as const;

export const ZONE_LABELS: Record<string, string> = {
  ZONA_0: "Zona 0",
  ZONA_1: "Zona 1",
  ZONA_2: "Zona 2",
  ZONA_20: "Zona 20",
  ZONA_21: "Zona 21",
  ZONA_22: "Zona 22",
  NAO_CLASSIFICADA: "Não classificada",
};

/** Plano de ação automático do inventário. */
export function recommendedAction(isEx: boolean): string {
  return isEx ? "Inspeção apurada" : "Substituição por equipamento certificado Ex";
}

export const EQUIPMENT_SUGGESTIONS = [
  "Luminária",
  "Motor",
  "Tomada",
  "Caixa de junção",
  "Botoeira",
  "Painel",
  "Instrumento",
  "Sensor",
];
