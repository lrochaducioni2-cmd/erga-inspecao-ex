import { CrmError, empresaLabel, getEmpresa } from "@/lib/crm-client";

/**
 * Nome do cliente a gravar no projeto. Com cliente do CRMEx, o nome vem do
 * próprio CRMEx (fonte da verdade); com cliente provisório, é o digitado.
 */
export async function resolveClientName(
  crmEmpresaId: string | null,
  typedName: string,
): Promise<{ name: string } | { error: string; status: number }> {
  if (!crmEmpresaId) return { name: typedName };
  try {
    return { name: empresaLabel(await getEmpresa(crmEmpresaId)) };
  } catch (error) {
    if (error instanceof CrmError && error.status === 404) {
      return { error: "Cliente não encontrado no CRMEx.", status: 400 };
    }
    const message = error instanceof CrmError ? error.message : "Erro inesperado ao consultar o CRMEx.";
    return { error: message, status: 502 };
  }
}
