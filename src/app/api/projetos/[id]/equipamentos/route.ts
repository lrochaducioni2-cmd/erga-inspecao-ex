import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { jsonError, parseBody, requireUser } from "@/lib/api";
import { equipmentSchema } from "@/lib/validation";
import { createWithNextItem, editableProject } from "@/lib/inventory";

type Params = { params: Promise<{ id: string }> };

export async function POST(request: Request, { params }: Params) {
  const auth = await requireUser();
  if (auth.error) return auth.error;

  const { id } = await params;
  const target = await editableProject(id);
  if (target.error) return target.error;

  const parsed = await parseBody(request, equipmentSchema);
  if (parsed.error) return parsed.error;

  const area = await prisma.area.findFirst({ where: { id: parsed.data.areaId, projectId: id } });
  if (!area) return jsonError("Ambiente não encontrado neste projeto.", 400);

  const equipment = await createWithNextItem({ ...parsed.data, projectId: id, createdById: auth.user.id });
  return NextResponse.json(equipment, { status: 201 });
}
