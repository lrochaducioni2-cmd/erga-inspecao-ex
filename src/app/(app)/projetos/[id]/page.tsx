import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { ProjectStatusControl } from "@/components/project-status-control";
import { GRADE_LABELS, PROJECT_TYPE_LABELS, STATUS_BADGE, STATUS_LABELS, formatPi } from "@/lib/projects";

type Props = { params: Promise<{ id: string }> };

const dateFormat = new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeZone: "America/Sao_Paulo" });

export default async function ProjetoPage({ params }: Props) {
  const { id } = await params;
  const [p, me] = await Promise.all([
    prisma.project.findUnique({ where: { id }, include: { createdBy: { select: { name: true } } } }),
    getCurrentUser(),
  ]);
  if (!p || !me) notFound();

  const dados: [string, string | null][] = [
    ["Cliente", p.crmEmpresaId ? p.clientName : `${p.clientName} (provisório)`],
    ["Tipo", `${PROJECT_TYPE_LABELS[p.type]}${p.grade ? ` · ${GRADE_LABELS[p.grade]}` : ""}`],
    ["Local da inspeção", p.location],
    ["Responsável técnico", p.technicalLead],
    ["CREA", p.crea],
    ["Certificado (IECEx CoPC)", p.technicalLeadCert],
    ["Nº proposta", p.proposalNumber],
    ["Nº contrato", p.contractNumber],
    ["Criado por", `${p.createdBy.name} em ${dateFormat.format(p.createdAt)}`],
  ];

  return (
    <div className="space-y-5">
      <Link href="/projetos" className="text-[15px] font-semibold text-brand">
        ← Projetos
      </Link>

      <div className="space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-mono text-[15px] text-muted">{formatPi(p.pi)}</span>
          <span className={`rounded-lg px-2.5 py-1 text-xs font-semibold ${STATUS_BADGE[p.status]}`}>
            {STATUS_LABELS[p.status]}
          </span>
        </div>
        <h1 className="text-2xl font-bold leading-tight">{p.title}</h1>
      </div>

      {!p.crmEmpresaId && p.status !== "EMITIDO" && (
        <p className="rounded-xl bg-accent-soft px-4 py-3 text-sm leading-snug text-accent-ink">
          <strong>Cliente provisório.</strong> Quando a integração com o CRMEx estiver ligada, use “Editar” para
          vincular ao cadastro do cliente.
        </p>
      )}

      <ProjectStatusControl projectId={p.id} status={p.status} isAdmin={me.role === "ADMIN"} />

      <section className="rounded-2xl border border-line bg-white">
        <div className="flex items-center justify-between border-b border-line px-5 py-3">
          <h2 className="text-base font-bold">Dados do projeto</h2>
          {p.status !== "EMITIDO" && (
            <Link
              href={`/projetos/${p.id}/editar`}
              className="flex h-10 items-center rounded-xl border border-line px-4 text-[15px] font-semibold hover:border-brand"
            >
              Editar
            </Link>
          )}
        </div>
        <dl className="divide-y divide-line">
          {dados.map(([label, value]) => (
            <div key={label} className="flex flex-col gap-0.5 px-5 py-3 sm:flex-row sm:gap-6">
              <dt className="text-sm font-semibold text-muted sm:w-48 sm:shrink-0">{label}</dt>
              <dd className="text-base">{value || "—"}</dd>
            </div>
          ))}
        </dl>
        {p.notes && <p className="whitespace-pre-line border-t border-line px-5 py-4 text-[15px]">{p.notes}</p>}
      </section>

      <section className="rounded-2xl border border-dashed border-line bg-white p-5">
        <h2 className="text-base font-bold">{p.type === "INVENTARIO" ? "Inventário" : "Equipamentos e checklist"}</h2>
        <p className="mt-1 text-[15px] text-muted">
          Ambientes, equipamentos e fotos chegam na próxima etapa (Fase 3).
        </p>
      </section>
    </div>
  );
}
