import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { jsonError, parseBody, requireAdmin, requireUser } from "@/lib/api";
import { updateProjectSchema } from "@/lib/validation";
import { resolveClientName } from "@/lib/project-client";
import { formatPi, statusChangeError } from "@/lib/projects";
import { removeStoredFiles } from "@/lib/uploads";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: Params) {
  const auth = await requireUser();
  if (auth.error) return auth.error;

  const { id } = await params;
  const project = await prisma.project.findUnique({ where: { id } });
  if (!project) return jsonError("Projeto não encontrado.", 404);

  const parsed = await parseBody(request, updateProjectSchema);
  if (parsed.error) return parsed.error;
  const { status, grade, clientName, crmEmpresaId, ...fields } = parsed.data;

  // Emitido é final: só volta para revisão (pelo administrador) antes de editar.
  const changesData = Object.keys(parsed.data).some((key) => key !== "status");
  if (changesData && project.status === "EMITIDO") {
    return jsonError("Projeto emitido não pode ser alterado. Reabra-o para revisão antes.", 409);
  }

  if (status !== undefined) {
    const error = statusChangeError(project.status, status, auth.user.role);
    if (error) return jsonError(error, 409);
  }

  const type = fields.type ?? project.type;
  const nextGrade = type === "INSPECAO_EX" ? (grade !== undefined ? grade : project.grade) : null;
  if (type === "INSPECAO_EX" && !nextGrade) {
    return jsonError("Escolha o grau da inspeção (Visual, Apurada ou Detalhada).", 400);
  }

  // Cliente: só resolve de novo quando o formulário enviou o cliente.
  let client: { crmEmpresaId: string | null; clientName: string } | undefined;
  if (clientName !== undefined || crmEmpresaId !== undefined) {
    const nextCrmId = crmEmpresaId !== undefined ? crmEmpresaId : project.crmEmpresaId;
    const resolved = await resolveClientName(nextCrmId, clientName ?? project.clientName);
    if ("error" in resolved) return jsonError(resolved.error, resolved.status);
    client = { crmEmpresaId: nextCrmId, clientName: resolved.name };
  }

  try {
    const updated = await prisma.project.update({
      where: { id },
      data: { ...fields, ...client, grade: nextGrade, ...(status !== undefined && { status }) },
    });
    return NextResponse.json(updated);
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return jsonError(`Já existe um projeto ${formatPi(fields.pi ?? project.pi)}. Escolha outro número.`, 409);
    }
    throw error;
  }
}

// Excluir: só o administrador, e só projetos ainda em rascunho.
export async function DELETE(_request: Request, { params }: Params) {
  const auth = await requireAdmin();
  if (auth.error) return auth.error;

  const { id } = await params;
  const project = await prisma.project.findUnique({ where: { id } });
  if (!project) return jsonError("Projeto não encontrado.", 404);
  if (project.status !== "RASCUNHO") {
    return jsonError("Só projetos em rascunho podem ser excluídos.", 409);
  }

  const photos = await prisma.photo.findMany({ where: { projectId: id }, select: { storageKey: true } });
  await prisma.project.delete({ where: { id } });
  await removeStoredFiles(photos.map((p) => p.storageKey));
  return NextResponse.json({ ok: true });
}
