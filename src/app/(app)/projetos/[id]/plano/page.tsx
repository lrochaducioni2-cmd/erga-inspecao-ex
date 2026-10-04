import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { ZONE_LABELS, recommendedAction } from "@/lib/inventory-rules";
import { formatPi, inspectionTag } from "@/lib/projects";

type Props = { params: Promise<{ id: string }> };

export default async function PlanoPage({ params }: Props) {
  const { id } = await params;
  const project = await prisma.project.findUnique({
    where: { id },
    include: { equipment: { orderBy: { item: "asc" }, include: { area: true } } },
  });
  if (!project) notFound();

  const groups = [
    { isEx: false, tone: "bg-nc-soft text-nc-ink", items: project.equipment.filter((e) => !e.isEx) },
    { isEx: true, tone: "bg-brand-soft text-brand", items: project.equipment.filter((e) => e.isEx) },
  ];

  return (
    <div className="space-y-5">
      <Link href={`/projetos/${id}`} className="text-[15px] font-semibold text-brand">
        ← {formatPi(project.pi)} · {project.title}
      </Link>
      <div>
        <h1 className="text-2xl font-bold">Plano de ação</h1>
        <p className="mt-1 text-[15px] text-muted">
          Gerado do inventário: Não Ex → substituição; Ex → inspeção apurada. Base para a proposta ao cliente.
        </p>
      </div>

      {groups.map((g) => {
        const qty = g.items.reduce((n, e) => n + e.quantity, 0);
        return (
          <section key={String(g.isEx)} className="overflow-hidden rounded-2xl border border-line bg-white">
            <div className={`flex items-center justify-between px-5 py-3 text-base font-bold ${g.tone}`}>
              <span>{recommendedAction(g.isEx)}</span>
              <span>{qty} {qty === 1 ? "item" : "itens"}</span>
            </div>
            {g.items.length === 0 ? (
              <p className="px-5 py-4 text-[15px] text-muted">Nenhum equipamento.</p>
            ) : (
              <ul className="divide-y divide-line">
                {g.items.map((eq) => (
                  <li key={eq.id}>
                    <Link href={`/projetos/${id}/equipamentos/${eq.id}`} className="block px-5 py-3 hover:bg-ground">
                      <div className="text-base font-semibold">
                        {eq.name}
                        {eq.quantity > 1 && <span className="font-normal text-muted"> × {eq.quantity}</span>}
                      </div>
                      <div className="text-sm text-muted">
                        {eq.area.name} · {ZONE_LABELS[eq.area.zone]} ·{" "}
                        <span className="font-mono">{inspectionTag(project.pi, eq.item)}</span>
                        {eq.notes && ` · ${eq.notes}`}
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>
        );
      })}
    </div>
  );
}
