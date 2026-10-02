import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { isCrmConfigured } from "@/lib/crm-client";
import { ProjectForm } from "@/components/project-form";
import { formatPi } from "@/lib/projects";

type Props = { params: Promise<{ id: string }> };

export default async function EditarProjetoPage({ params }: Props) {
  const { id } = await params;
  const p = await prisma.project.findUnique({ where: { id } });
  if (!p) notFound();
  if (p.status === "EMITIDO") redirect(`/projetos/${id}`);

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <Link href={`/projetos/${id}`} className="text-[15px] font-semibold text-brand">
        ← {formatPi(p.pi)}
      </Link>
      <h1 className="text-2xl font-bold">Editar projeto</h1>
      <ProjectForm
        crmConfigured={isCrmConfigured()}
        initial={{
          id: p.id,
          pi: String(p.pi),
          title: p.title,
          type: p.type,
          grade: p.grade ?? "",
          crmEmpresaId: p.crmEmpresaId,
          clientName: p.clientName,
          location: p.location ?? "",
          technicalLead: p.technicalLead ?? "",
          crea: p.crea ?? "",
          proposalNumber: p.proposalNumber ?? "",
          contractNumber: p.contractNumber ?? "",
          notes: p.notes ?? "",
        }}
      />
    </div>
  );
}
