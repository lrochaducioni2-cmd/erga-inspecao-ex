import { NextResponse } from "next/server";
import { jsonError } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { parseBody, requireUser } from "@/lib/api";
import { createAreaSchema } from "@/lib/validation";
import { editableProject } from "@/lib/inventory";

type Params = { params: Promise<{ id: string }> };

export async function POST(request: Request, { params }: Params) {
  const auth = await requireUser();
  if (auth.error) return auth.error;

  const { id } = await params;
  const target = await editableProject(id);
  if (target.error) return target.error;

  const parsed = await parseBody(request, createAreaSchema);
  if (parsed.error) return parsed.error;

  // Reenvio do modo campo: o mesmo id já gravado devolve o registro existente.
  if (parsed.data.id) {
    const existing = await prisma.area.findUnique({ where: { id: parsed.data.id } });
    if (existing) {
      return existing.projectId === id
        ? NextResponse.json(existing)
        : jsonError("Identificador já usado em outro projeto.", 409);
    }
  }

  const area = await prisma.area.create({ data: { ...parsed.data, projectId: id } });
  return NextResponse.json(area, { status: 201 });
}
