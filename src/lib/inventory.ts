// Inventário no servidor (banco). Regras puras: inventory-rules.ts.

import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { jsonError } from "@/lib/api";

/**
 * Projeto que pode receber alterações no inventário, ou a resposta de erro.
 * Projeto emitido é documento fechado: nada muda.
 */
export async function editableProject(projectId: string) {
  const project = await prisma.project.findUnique({ where: { id: projectId } });
  if (!project) return { error: jsonError("Projeto não encontrado.", 404) } as const;
  if (project.status === "EMITIDO") {
    return { error: jsonError("Projeto emitido não pode ser alterado. Reabra-o para revisão antes.", 409) } as const;
  }
  return { project } as const;
}

/**
 * Cria o equipamento com o próximo nº de item do projeto. Duas criações
 * simultâneas disputam o mesmo número; quem perde no índice único tenta de novo.
 */
export async function createWithNextItem(
  data: Omit<Prisma.EquipmentUncheckedCreateInput, "item">,
) {
  for (let attempt = 0; attempt < 5; attempt++) {
    const last = await prisma.equipment.findFirst({
      where: { projectId: data.projectId },
      orderBy: { item: "desc" },
      select: { item: true },
    });
    try {
      return await prisma.equipment.create({ data: { ...data, item: (last?.item ?? 0) + 1 } });
    } catch (error) {
      const conflict = error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002";
      if (!conflict || attempt === 4) throw error;
    }
  }
  throw new Error("unreachable");
}
