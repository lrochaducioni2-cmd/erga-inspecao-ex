import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { jsonError, parseBody, requireUser } from "@/lib/api";
import { createProjectSchema } from "@/lib/validation";
import { resolveClientName } from "@/lib/project-client";
import { formatPi } from "@/lib/projects";

export async function POST(request: Request) {
  const auth = await requireUser();
  if (auth.error) return auth.error;

  const parsed = await parseBody(request, createProjectSchema);
  if (parsed.error) return parsed.error;
  const { grade, clientName, ...data } = parsed.data;

  const client = await resolveClientName(data.crmEmpresaId, clientName);
  if ("error" in client) return jsonError(client.error, client.status);

  try {
    const project = await prisma.project.create({
      data: {
        ...data,
        grade: data.type === "INSPECAO_EX" ? grade : null,
        clientName: client.name,
        createdById: auth.user.id,
      },
    });
    return NextResponse.json(project, { status: 201 });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return jsonError(`Já existe um projeto ${formatPi(data.pi)}. Escolha outro número.`, 409);
    }
    throw error;
  }
}
