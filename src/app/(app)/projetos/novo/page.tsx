import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { isCrmConfigured } from "@/lib/crm-client";
import { ProjectForm } from "@/components/project-form";

export default async function NovoProjetoPage() {
  // Sugere o próximo PI (maior PI + 1); o usuário pode trocar.
  const last = await prisma.project.findFirst({ orderBy: { pi: "desc" }, select: { pi: true } });

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
          technicalLead: "",
          crea: "",
          proposalNumber: "",
          contractNumber: "",
          notes: "",
        }}
      />
    </div>
  );
}
