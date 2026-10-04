import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { PhotoThumb } from "@/components/photo-thumb";
import { PrintButton } from "@/components/print-button";
import { ZONE_LABELS, recommendedAction } from "@/lib/inventory-rules";
import { GRADE_LABELS, PROJECT_TYPE_LABELS, STATUS_LABELS, formatPi, inspectionTag } from "@/lib/projects";

type Props = { params: Promise<{ id: string }> };

const dateFormat = new Intl.DateTimeFormat("pt-BR", { dateStyle: "long", timeZone: "America/Sao_Paulo" });

// Relatório PROVISÓRIO: será substituído pelo modelo da ERGA (Fase 6).
// O PDF sai pelo "Imprimir → Salvar como PDF" do navegador.
export default async function RelatorioPage({ params }: Props) {
  const { id } = await params;
  const project = await prisma.project.findUnique({
    where: { id },
    include: {
      photos: { where: { kind: "LOGO" }, select: { id: true }, take: 1 },
      areas: {
        orderBy: { createdAt: "asc" },
        include: {
          equipment: {
            orderBy: { item: "asc" },
            include: { photos: { select: { id: true }, orderBy: { createdAt: "asc" } } },
          },
        },
      },
    },
  });
  if (!project) notFound();

  const all = project.areas.flatMap((a) => a.equipment);
  const qty = (list: typeof all) => list.reduce((n, e) => n + e.quantity, 0);
  const logo = project.photos[0];

  return (
    <div className="mx-auto max-w-4xl space-y-6 text-[15px] print:max-w-none print:text-[11pt]">
      <div className="flex items-center justify-between gap-3 print:hidden">
        <Link href={`/projetos/${id}`} className="text-[15px] font-semibold text-brand">
          ← {formatPi(project.pi)}
        </Link>
        <PrintButton />
      </div>
      <p className="rounded-xl bg-accent-soft px-4 py-3 text-sm text-accent-ink print:hidden">
        Layout provisório. Será trocado pelo modelo de relatório da ERGA quando você enviá-lo.
      </p>

      <article className="space-y-6 rounded-2xl border border-line bg-white p-6 print:border-0 print:p-0">
        <header className="flex items-start justify-between gap-6 border-b border-line pb-4">
          <div>
            <div className="text-sm font-semibold uppercase tracking-wide text-muted">
              {project.type === "INVENTARIO" ? "Relatório de inventário" : "Relatório de inspeção"} · ERGA Engenharia
            </div>
            <h1 className="mt-1 text-2xl font-bold">{project.title}</h1>
            <div className="mt-1 font-mono text-sm text-muted">{formatPi(project.pi)}</div>
          </div>
          {logo && <PhotoThumb id={logo.id} alt="Logo do cliente" className="h-16 w-32 !bg-white !object-contain" />}
        </header>

        <dl className="grid gap-x-8 gap-y-1 sm:grid-cols-2 print:grid-cols-2">
          {[
            ["Cliente", project.clientName],
            ["Local", project.location],
            ["Tipo", `${PROJECT_TYPE_LABELS[project.type]}${project.grade ? ` · ${GRADE_LABELS[project.grade]}` : ""}`],
            ["Etapa", STATUS_LABELS[project.status]],
            ["Responsável técnico", project.technicalLead],
            ["CREA", project.crea],
            ["Certificado (IECEx CoPC)", project.technicalLeadCert],
            ["Data", dateFormat.format(new Date())],
          ].map(([k, v]) => (
            <div key={k} className="flex gap-2">
              <dt className="text-muted">{k}:</dt>
              <dd className="font-semibold">{v || "—"}</dd>
            </div>
          ))}
        </dl>

        <section>
          <h2 className="text-lg font-bold">Resumo</h2>
          <table className="mt-2 w-full max-w-md border border-line text-left">
            <tbody className="divide-y divide-line">
              <tr><td className="px-3 py-1.5">Equipamentos</td><td className="px-3 py-1.5 text-right font-bold">{qty(all)}</td></tr>
              <tr><td className="px-3 py-1.5">Ex — {recommendedAction(true)}</td><td className="px-3 py-1.5 text-right font-bold">{qty(all.filter((e) => e.isEx))}</td></tr>
              <tr><td className="px-3 py-1.5">Não Ex — {recommendedAction(false)}</td><td className="px-3 py-1.5 text-right font-bold text-nc">{qty(all.filter((e) => !e.isEx))}</td></tr>
            </tbody>
          </table>
        </section>

        {project.areas.map((area) => (
          <section key={area.id} className="space-y-3">
            <h2 className="border-b border-line pb-1 text-lg font-bold">
              {area.name} <span className="text-base font-normal text-muted">· {ZONE_LABELS[area.zone]}</span>
            </h2>
            {area.equipment.length === 0 && <p className="text-muted">Nenhum equipamento.</p>}
            {area.equipment.map((eq) => (
              <div key={eq.id} className="break-inside-avoid rounded-xl border border-line p-3">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <div className="font-bold">
                    {eq.item}. {eq.name}
                    {eq.quantity > 1 && <span className="font-normal"> × {eq.quantity}</span>}
                    {eq.clientTag && <span className="font-normal text-muted"> · TAG {eq.clientTag}</span>}
                  </div>
                  <div className="font-mono text-xs text-muted">{inspectionTag(project.pi, eq.item)}</div>
                </div>
                <div className={eq.isEx ? "text-brand" : "font-semibold text-nc"}>
                  {eq.isEx ? "Ex" : "Não Ex"} — {recommendedAction(eq.isEx)}
                </div>
                {eq.notes && <p className="mt-1 whitespace-pre-line">{eq.notes}</p>}
                {eq.photos.length > 0 && (
                  <div className="mt-2 grid grid-cols-3 gap-2 sm:grid-cols-4 print:grid-cols-4">
                    {eq.photos.map((ph) => (
                      <PhotoThumb key={ph.id} id={ph.id} alt={`Foto de ${eq.name}`} className="aspect-[4/3] w-full rounded-lg" />
                    ))}
                  </div>
                )}
              </div>
            ))}
          </section>
        ))}
      </article>
    </div>
  );
}
