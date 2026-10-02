import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { isCrmConfigured } from "@/lib/crm-client";
import { ProjectForm } from "@/components/project-form";
import { DEFAULT_TECHNICAL_LEAD } from "@/lib/projects";

export default async function NovoProjetoPage() {
  // Sugere o próximo PI (maior PI + 1) e repete responsável técnico e CREA
  // do último projeto criado; tudo editável.
  const [last, recent] = await Promise.all([
    prisma.project.findFirst({ orderBy: { pi: "desc" }, select: { pi: true } }),
    prisma.project.findFirst({
      where: { technicalLead: { not: null } },
      orderBy: { createdAt: "desc" },
      select: { technicalLead: true, crea: true, technicalLeadCert: true },
    }),
  ]);

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <Link href="/projetos" className="text-[15px] font-semibold text-brand">
        ← Projetos
      </Link>
      <h1 className="text-2xl font-bold">Novo projeto</h1>
      <ProjectForm
        crmConfigured={isCrmConfigured()}
        initial={{
          pi: String((last?.pi ?? 0) + 1),
          title: "",
          type: "INVENTARIO",
          grade: "",
          crmEmpresaId: null,
          clientName: "",
          location: "",
          technicalLead: recent?.technicalLead || DEFAULT_TECHNICAL_LEAD.name,
          crea: recent?.crea || DEFAULT_TECHNICAL_LEAD.crea,
          technicalLeadCert: recent?.technicalLeadCert || DEFAULT_TECHNICAL_LEAD.cert,
          proposalNumber: "",
          contractNumber: "",
          notes: "",
        }}
      />
    </div>
  );
}
