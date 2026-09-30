import Link from "next/link";
import { notFound } from "next/navigation";
import { CrmError, getEmpresa, type CrmEmpresa } from "@/lib/crm-client";

type Props = { params: Promise<{ id: string }> };

export default async function ClientePage({ params }: Props) {
  const { id } = await params;

  let empresa: CrmEmpresa;
  try {
    empresa = await getEmpresa(decodeURIComponent(id));
  } catch (error) {
    if (error instanceof CrmError && error.status === 404) notFound();
    const message = error instanceof CrmError ? error.message : "Erro inesperado ao consultar o CRMEx.";
    return (
      <div className="space-y-4">
        <Link href="/clientes" className="text-[15px] font-semibold text-brand">
          ← Clientes
        </Link>
        <p className="rounded-xl border border-accent bg-accent-soft px-4 py-3 text-[15px] text-accent-ink">{message}</p>
      </div>
    );
  }

  const campos: [string, string | null][] = [
    ["Razão social", empresa.razao_social],
    ["Nome fantasia", empresa.nome_fantasia],
    ["CNPJ", empresa.cnpj],
    ["Endereço", empresa.endereco],
    ["Telefone", empresa.telefone],
    ["E-mail", empresa.email],
    ["Contato responsável", empresa.contato_responsavel],
  ];

  return (
    <div className="space-y-5">
      <Link href="/clientes" className="text-[15px] font-semibold text-brand">
        ← Clientes
      </Link>
      <h1 className="text-2xl font-bold">{empresa.nome_fantasia || empresa.razao_social}</h1>
      <dl className="divide-y divide-line rounded-2xl border border-line bg-white">
        {campos.map(([label, value]) => (
          <div key={label} className="flex flex-col gap-1 px-5 py-3 sm:flex-row sm:gap-6">
            <dt className="text-sm font-semibold text-muted sm:w-48 sm:shrink-0">{label}</dt>
            <dd className="text-base">{value || "—"}</dd>
          </div>
        ))}
      </dl>
      <p className="text-sm text-muted">Para alterar estes dados, edite o cadastro no CRMEx.</p>
    </div>
  );
}
