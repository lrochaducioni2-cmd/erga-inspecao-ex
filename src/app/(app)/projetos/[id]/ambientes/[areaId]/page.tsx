import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { AreaActions } from "@/components/area-actions";
import { PhotoThumb } from "@/components/photo-thumb";
import { ZONE_LABELS } from "@/lib/inventory-rules";
import { formatPi, inspectionTag } from "@/lib/projects";

type Props = { params: Promise<{ id: string; areaId: string }> };

export default async function AmbientePage({ params }: Props) {
  const { id, areaId } = await params;
  const area = await prisma.area.findFirst({
    where: { id: areaId, projectId: id },
    include: {
      project: { select: { pi: true, title: true, status: true } },
      equipment: {
        orderBy: { item: "asc" },
        include: { photos: { select: { id: true }, orderBy: { createdAt: "asc" }, take: 1 } },
      },
    },
  });
  if (!area) notFound();
  const locked = area.project.status === "EMITIDO";

  return (
    <div className="space-y-5 pb-24">
      <Link href={`/projetos/${id}`} className="text-[15px] font-semibold text-brand">
        ← {formatPi(area.project.pi)} · {area.project.title}
      </Link>

      <div className="space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-2xl font-bold">{area.name}</h1>
          <span className="rounded-lg bg-brand-soft px-2.5 py-1 text-xs font-semibold text-brand">{ZONE_LABELS[area.zone]}</span>
        </div>
        {area.notes && <p className="text-[15px] text-muted">{area.notes}</p>}
        {!locked && (
          <AreaActions
            projectId={id}
            area={{ id: area.id, name: area.name, zone: area.zone, notes: area.notes }}
            equipmentCount={area.equipment.length}
          />
        )}
      </div>

      {area.equipment.length === 0 ? (
        <p className="rounded-2xl border border-line bg-white p-5 text-[15px] text-muted">
          Nenhum equipamento ainda. Toque em “Novo equipamento” e comece pela foto.
        </p>
      ) : (
        <ul className="space-y-2">
          {area.equipment.map((eq) => (
            <li key={eq.id}>
              <Link
                href={`/projetos/${id}/equipamentos/${eq.id}`}
                className="flex items-center gap-3 rounded-2xl border border-line bg-white p-3 hover:border-brand"
              >
                {eq.photos[0] ? (
                  <PhotoThumb id={eq.photos[0].id} alt="" className="h-16 w-16 shrink-0 rounded-xl" />
                ) : (
                  <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-xl bg-line/60 text-xs text-muted">
                    sem foto
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <div className="truncate text-base font-semibold">
                    {eq.name}
                    {eq.quantity > 1 && <span className="font-normal text-muted"> × {eq.quantity}</span>}
                  </div>
                  <div className="truncate font-mono text-xs text-muted">{inspectionTag(area.project.pi, eq.item)}</div>
                  {eq.notes && <div className="truncate text-sm text-muted">{eq.notes}</div>}
                </div>
                <span
                  className={`shrink-0 rounded-lg px-2.5 py-1 text-sm font-bold ${
                    eq.isEx ? "bg-brand-soft text-brand" : "bg-nc-soft text-nc-ink"
                  }`}
                >
                  {eq.isEx ? "Ex" : "Não Ex"}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}

      {!locked && (
        <div className="fixed inset-x-0 bottom-0 border-t border-line bg-ground/95 px-4 pb-5 pt-3 backdrop-blur">
          <div className="mx-auto max-w-6xl sm:px-2">
            <Link
              href={`/projetos/${id}/ambientes/${area.id}/novo`}
              className="flex h-14 w-full items-center justify-center rounded-xl bg-brand text-[17px] font-semibold text-white hover:bg-brand-dark sm:w-auto sm:px-8"
            >
              + Novo equipamento
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
