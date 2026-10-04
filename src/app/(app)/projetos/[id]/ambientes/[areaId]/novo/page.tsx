import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { EquipmentForm } from "@/components/equipment-form";

type Props = { params: Promise<{ id: string; areaId: string }> };

export default async function NovoEquipamentoPage({ params }: Props) {
  const { id, areaId } = await params;
  const project = await prisma.project.findUnique({
    where: { id },
    include: { areas: { orderBy: { createdAt: "asc" }, select: { id: true, name: true } } },
  });
  const area = project?.areas.find((a) => a.id === areaId);
  if (!project || !area) notFound();
  if (project.status === "EMITIDO") redirect(`/projetos/${id}/ambientes/${areaId}`);

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <Link href={`/projetos/${id}/ambientes/${areaId}`} className="text-[15px] font-semibold text-brand">
        ← {area.name}
      </Link>
      <h1 className="text-2xl font-bold">Novo equipamento</h1>
      <EquipmentForm projectId={id} areaId={areaId} areas={project.areas} />
    </div>
  );
}
