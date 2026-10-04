import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { jsonError, parseBody, requireUser } from "@/lib/api";
import { equipmentSchema } from "@/lib/validation";
import { editableProject } from "@/lib/inventory";
import { removeStoredFiles } from "@/lib/uploads";

type Params = { params: Promise<{ id: string }> };

async function load(id: string) {
  const equipment = await prisma.equipment.findUnique({ where: { id } });
  if (!equipment) return { error: jsonError("Equipamento não encontrado.", 404) } as const;
  const target = await editableProject(equipment.projectId);
  if (target.error) return { error: target.error } as const;
  return { equipment } as const;
}

export async function PATCH(request: Request, { params }: Params) {
  const auth = await requireUser();
  if (auth.error) return auth.error;

  const loaded = await load((await params).id);
  if (loaded.error) return loaded.error;

  const parsed = await parseBody(request, equipmentSchema.partial());
  if (parsed.error) return parsed.error;

  if (parsed.data.areaId) {
    const area = await prisma.area.findFirst({
      where: { id: parsed.data.areaId, projectId: loaded.equipment.projectId },
    });
    if (!area) return jsonError("Ambiente não encontrado neste projeto.", 400);
  }

  const equipment = await prisma.equipment.update({ where: { id: loaded.equipment.id }, data: parsed.data });
  return NextResponse.json(equipment);
}

export async function DELETE(_request: Request, { params }: Params) {
  const auth = await requireUser();
  if (auth.error) return auth.error;

  const loaded = await load((await params).id);
  if (loaded.error) return loaded.error;

  const photos = await prisma.photo.findMany({
    where: { equipmentId: loaded.equipment.id },
    select: { storageKey: true },
  });
  await prisma.equipment.delete({ where: { id: loaded.equipment.id } });
  await removeStoredFiles(photos.map((p) => p.storageKey));
  return NextResponse.json({ ok: true });
}
