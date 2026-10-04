import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { EquipmentForm } from "@/components/equipment-form";
import { inspectionTag } from "@/lib/projects";

type Props = {
  params: Promise<{ id: string; eqId: string }>;
  searchParams: Promise<{ erroFoto?: string }>;
};

export default async function EquipamentoPage({ params, searchParams }: Props) {
  const { id, eqId } = await params;
  const { erroFoto } = await searchParams;
  const eq = await prisma.equipment.findFirst({
    where: { id: eqId, projectId: id },
    include: {
      area: { select: { id: true, name: true } },
      photos: { select: { id: true }, orderBy: { createdAt: "asc" } },
      project: {
        select: { pi: true, status: true, areas: { orderBy: { createdAt: "asc" }, select: { id: true, name: true } } },
      },
    },
  });
  if (!eq) notFound();
  const locked = eq.project.status === "EMITIDO";

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <Link href={`/projetos/${id}/ambientes/${eq.area.id}`} className="text-[15px] font-semibold text-brand">
        ← {eq.area.name}
      </Link>
      <div>
        <h1 className="text-2xl font-bold">{eq.name}</h1>
        <p className="font-mono text-sm text-muted">
          Item {eq.item} · {inspectionTag(eq.project.pi, eq.item)}
        </p>
      </div>
      {erroFoto && (
        <p className="rounded-xl border border-accent bg-accent-soft px-4 py-3 text-[15px] text-accent-ink">
          O equipamento foi salvo, mas uma das fotos não foi enviada. Tire ou escolha a foto de novo abaixo.
        </p>
      )}
      {locked && (
        <p className="rounded-xl bg-line/60 px-4 py-3 text-[15px]">Projeto emitido: somente leitura.</p>
      )}
      <EquipmentForm
        projectId={id}
        areaId={eq.area.id}
        areas={eq.project.areas}
        locked={locked}
        initial={{
          id: eq.id,
          areaId: eq.areaId,
          name: eq.name,
          isEx: eq.isEx,
          quantity: eq.quantity,
          clientTag: eq.clientTag,
          notes: eq.notes,
          photos: eq.photos,
        }}
      />
    </div>
  );
}
