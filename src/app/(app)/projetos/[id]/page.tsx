import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { ProjectStatusControl } from "@/components/project-status-control";
import { LogoUploader } from "@/components/logo-uploader";
import { AreaForm } from "@/components/area-form";
import { ZONE_LABELS } from "@/lib/inventory-rules";
import { GRADE_LABELS, PROJECT_TYPE_LABELS, STATUS_BADGE, STATUS_LABELS, formatPi } from "@/lib/projects";

type Props = { params: Promise<{ id: string }> };

const dateFormat = new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeZone: "America/Sao_Paulo" });

export default async function ProjetoPage({ params }: Props) {
  const { id } = await params;
  const [p, me] = await Promise.all([
    prisma.project.findUnique({
      where: { id },
      include: {
        createdBy: { select: { name: true } },
        areas: { orderBy: { createdAt: "asc" }, include: { equipment: { select: { isEx: true, quantity: true } } } },
        photos: { select: { id: true, kind: true } },
      },
    }),
    getCurrentUser(),
  ]);
  if (!p || !me) notFound();

  const locked = p.status === "EMITIDO";
  const logo = p.photos.find((ph) => ph.kind === "LOGO");
  const photoCount = p.photos.filter((ph) => ph.kind === "EQUIPMENT").length;
  const allEquipment = p.areas.flatMap((a) => a.equipment);
  const totalQty = allEquipment.reduce((n, e) => n + e.quantity, 0);
  const exQty = allEquipment.filter((e) => e.isEx).reduce((n, e) => n + e.quantity, 0);

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

      <section className="space-y-4 rounded-2xl border border-line bg-white p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-bold">{p.type === "INVENTARIO" ? "Inventário" : "Equipamentos"}</h2>
          <div className="flex flex-wrap gap-2">
            {p.type === "INVENTARIO" && (
              <Link
                href={`/projetos/${p.id}/plano`}
                className="flex h-11 items-center rounded-xl border border-brand px-4 text-[15px] font-semibold text-brand"
              >
                Plano de ação
              </Link>
            )}
            <Link
              href={`/projetos/${p.id}/relatorio`}
              className="flex h-11 items-center rounded-xl border border-line px-4 text-[15px] font-semibold hover:border-brand"
            >
              Relatório (PDF)
            </Link>
            <a
              href={`/api/projetos/${p.id}/excel`}
              className="flex h-11 items-center rounded-xl border border-line px-4 text-[15px] font-semibold hover:border-brand"
            >
              Excel
            </a>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            { label: "Equipamentos", value: totalQty, cls: "" },
            { label: "Ex", value: exQty, cls: "text-brand" },
            { label: "Não Ex", value: totalQty - exQty, cls: "text-nc" },
            { label: "Fotos", value: photoCount, cls: "" },
          ].map((s) => (
            <div key={s.label} className="rounded-xl border border-line px-4 py-3">
              <div className={`text-2xl font-bold ${s.cls}`}>{s.value}</div>
              <div className="text-sm text-muted">{s.label}</div>
            </div>
          ))}
        </div>

        <div>
          <h3 className="mb-2 text-sm font-semibold">Logo do cliente (aparece no relatório)</h3>
          <LogoUploader projectId={p.id} logoId={logo?.id ?? null} locked={locked} />
        </div>

        <div className="space-y-2">
          <h3 className="text-sm font-semibold">Ambientes / pontos de liberação</h3>
          {p.areas.length === 0 && (
            <p className="text-[15px] text-muted">Nenhum ambiente ainda. Cadastre o primeiro abaixo.</p>
          )}
          <ul className="space-y-2">
            {p.areas.map((a) => {
              const naoEx = a.equipment.filter((e) => !e.isEx).reduce((n, e) => n + e.quantity, 0);
              const total = a.equipment.reduce((n, e) => n + e.quantity, 0);
              return (
                <li key={a.id}>
                  <Link
                    href={`/projetos/${p.id}/ambientes/${a.id}`}
                    className="flex min-h-16 items-center gap-3 rounded-2xl border border-line px-4 py-3 hover:border-brand"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="text-base font-semibold">{a.name}</div>
                      <div className="text-sm text-muted">
                        {total} equipamento{total === 1 ? "" : "s"}
                        {naoEx > 0 && <span className="font-semibold text-nc"> · {naoEx} Não Ex</span>}
                      </div>
                    </div>
                    <span className="shrink-0 rounded-lg bg-brand-soft px-2.5 py-1 text-xs font-semibold text-brand">
                      {ZONE_LABELS[a.zone]}
                    </span>
                    <span aria-hidden="true" className="text-muted">›</span>
                  </Link>
                </li>
              );
            })}
          </ul>
          {!locked && (
            <div className="rounded-2xl border border-dashed border-line p-4">
              <AreaForm projectId={p.id} />
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
