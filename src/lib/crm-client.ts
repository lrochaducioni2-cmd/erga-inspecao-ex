// Cliente da API do CRMEx — único canal entre os dois sistemas (nunca banco
// compartilhado). Contrato em INTEGRACAO.md.
//
// Configuração (.env):
//   CRM_API_URL    — URL base do CRMEx, ex.: https://crm.exemplo.com.br
//   CRM_API_TOKEN  — token emitido pelo CRMEx para este software (Bearer)
//
// As respostas são validadas com zod no formato do contrato (snake_case).
// Listas são aceitas como array puro ou como { data: [...] }.

import { z } from "zod";

const id = z.union([z.string(), z.number()]).transform(String);
const optionalString = z.string().nullish().transform((v) => v || null);

export const crmEmpresaSchema = z.object({
  id,
  razao_social: z.string(),
  nome_fantasia: optionalString,
  cnpj: optionalString,
  endereco: optionalString,
  telefone: optionalString,
  email: optionalString,
  contato_responsavel: optionalString,
});

export type CrmEmpresa = z.infer<typeof crmEmpresaSchema>;

export class CrmError extends Error {
  constructor(
    message: string,
    readonly status?: number,
  ) {
    super(message);
    this.name = "CrmError";
  }
}

const TIMEOUT_MS = 10_000;

export function isCrmConfigured(): boolean {
  return Boolean(process.env.CRM_API_URL && process.env.CRM_API_TOKEN);
}

function config() {
  const baseUrl = process.env.CRM_API_URL?.replace(/\/+$/, "");
  const token = process.env.CRM_API_TOKEN;
  if (!baseUrl || !token) {
    throw new CrmError("Integração com o CRMEx não configurada (defina CRM_API_URL e CRM_API_TOKEN).");
  }
  return { baseUrl, token };
}

async function request(path: string, init: RequestInit = {}): Promise<unknown> {
  const { baseUrl, token } = config();
  let res: Response;
  try {
    res = await fetch(`${baseUrl}${path}`, {
      ...init,
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${token}`,
        ...(init.body ? { "Content-Type": "application/json" } : {}),
        ...init.headers,
      },
      cache: "no-store",
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
  } catch (error) {
    const reason = error instanceof Error && error.name === "TimeoutError" ? "tempo esgotado" : "sem conexão";
    throw new CrmError(`Não foi possível falar com o CRMEx (${reason}).`);
  }

  if (res.status === 401 || res.status === 403) {
    throw new CrmError("O CRMEx recusou o token de acesso (verifique CRM_API_TOKEN).", res.status);
  }
  if (res.status === 404) {
    throw new CrmError("Registro não encontrado no CRMEx.", 404);
  }
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new CrmError(`O CRMEx respondeu com erro ${res.status}${body ? `: ${body.slice(0, 200)}` : ""}.`, res.status);
  }

  return res.json().catch(() => {
    throw new CrmError("Resposta do CRMEx não é um JSON válido.", res.status);
  });
}

function parse<T>(schema: z.ZodType<T>, data: unknown, what: string): T {
  const parsed = schema.safeParse(data);
  if (!parsed.success) {
    const detail = parsed.error.issues
      .slice(0, 3)
      .map((issue) => `${issue.path.join(".") || "(raiz)"}: ${issue.message}`)
      .join("; ");
    throw new CrmError(`Resposta do CRMEx fora do contrato (${what}) — ${detail}`);
  }
  return parsed.data;
}

function unwrapList(data: unknown): unknown {
  if (data && typeof data === "object" && !Array.isArray(data) && "data" in data) {
    return (data as { data: unknown }).data;
  }
  return data;
}

/** GET /api/empresas?busca=… — lista/busca o cadastro de clientes. */
export async function listEmpresas(busca?: string): Promise<CrmEmpresa[]> {
  const query = busca?.trim() ? `?busca=${encodeURIComponent(busca.trim())}` : "";
  const data = await request(`/api/empresas${query}`);
  return parse(z.array(crmEmpresaSchema), unwrapList(data), "lista de empresas");
}

/** GET /api/empresas/:id */
export async function getEmpresa(crmId: string): Promise<CrmEmpresa> {
  const data = await request(`/api/empresas/${encodeURIComponent(crmId)}`);
  return parse(crmEmpresaSchema, data, "empresa");
}

/** Nome de exibição: fantasia (razão social), ou só a razão social. */
export function empresaLabel(empresa: { razao_social: string; nome_fantasia: string | null }): string {
  return empresa.nome_fantasia ? `${empresa.nome_fantasia} (${empresa.razao_social})` : empresa.razao_social;
}
