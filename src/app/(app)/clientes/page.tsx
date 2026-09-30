import Link from "next/link";
import { CrmError, empresaLabel, isCrmConfigured, listEmpresas, type CrmEmpresa } from "@/lib/crm-client";

type Props = { searchParams: Promise<{ busca?: string | string[] }> };

// Clientes vêm do cadastro do CRMEx, só leitura: nada é cadastrado aqui.
export default async function ClientesPage({ searchParams }: Props) {
  const raw = (await searchParams).busca;
  const busca = (Array.isArray(raw) ? raw[0] : raw)?.trim() ?? "";

  let empresas: CrmEmpresa[] = [];
  let erro: string | null = null;
  if (!isCrmConfigured()) {
    erro = "Integração com o CRMEx não configurada (defina CRM_API_URL e CRM_API_TOKEN).";
  } else {
    try {
      empresas = await listEmpresas(busca);
    } catch (error) {
      erro = error instanceof CrmError ? error.message : "Erro inesperado ao consultar o CRMEx.";
      if (!(error instanceof CrmError)) console.error(error);
    }
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold">Clientes</h1>
        <p className="mt-1 text-[15px] text-muted">Cadastro do CRMEx — somente leitura.</p>
      </div>

      <form method="get" className="flex gap-2" role="search">
        <label htmlFor="busca" className="sr-only">
          Buscar cliente
        </label>
        <input
          id="busca"
          name="busca"
          defaultValue={busca}
          placeholder="Nome, fantasia ou CNPJ"
          className="h-12 min-w-0 flex-1 rounded-xl border border-line bg-white px-4 text-base focus:border-brand focus:outline-none"
        />
        <button className="h-12 shrink-0 rounded-xl bg-brand px-5 text-base font-semibold text-white hover:bg-brand-dark">
          Buscar
        </button>
      </form>

      {erro && (
        <p className="rounded-xl border border-accent bg-accent-soft px-4 py-3 text-[15px] text-accent-ink">{erro}</p>
      )}

      {!erro && empresas.length === 0 && (
        <p className="rounded-2xl border border-line bg-white p-6 text-[15px] text-muted">
          {busca ? `Nenhum cliente encontrado para “${busca}”.` : "Nenhum cliente no CRMEx."}
        </p>
      )}

      <ul className="grid gap-3 sm:grid-cols-2">
        {empresas.map((empresa) => (
          <li key={empresa.id}>
            <Link
              href={`/clientes/${encodeURIComponent(empresa.id)}`}
              className="flex min-h-20 flex-col justify-center gap-1 rounded-2xl border border-line bg-white px-5 py-4 hover:border-brand"
            >
              <span className="text-base font-semibold">{empresaLabel(empresa)}</span>
              <span className="text-sm text-muted">
                {[empresa.cnpj, empresa.endereco].filter(Boolean).join(" · ") || "—"}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
