import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { jsonError, parseBody, requireUser } from "@/lib/api";
import { areaSchema } from "@/lib/validation";
import { editableProject } from "@/lib/inventory";

type Params = { params: Promise<{ id: string }> };

async function load(id: string) {
  const area = await prisma.area.findUnique({ where: { id }, include: { _count: { select: { equipment: true } } } });
  if (!area) return { error: jsonError("Ambiente não encontrado.", 404) } as const;
  const target = await editableProject(area.projectId);
  if (target.error) return { error: target.error } as const;
  return { area } as const;
}

export async function PATCH(request: Request, { params }: Params) {
  const auth = await requireUser();
  if (auth.error) return auth.error;

  const loaded = await load((await params).id);
  if (loaded.error) return loaded.error;

  const parsed = await parseBody(request, areaSchema.partial());
  if (parsed.error) return parsed.error;

  const area = await prisma.area.update({ where: { id: loaded.area.id }, data: parsed.data });
  return NextResponse.json(area);
}

// Só ambientes vazios: excluir um ambiente nunca apaga equipamentos por tabela.
export async function DELETE(_request: Request, { params }: Params) {
  const auth = await requireUser();
  if (auth.error) return auth.error;

  const loaded = await load((await params).id);
  if (loaded.error) return loaded.error;
  if (loaded.area._count.equipment > 0) {
    return jsonError("Remova ou mova os equipamentos deste ambiente antes de excluí-lo.", 409);
  }

  await prisma.area.delete({ where: { id: loaded.area.id } });
  return NextResponse.json({ ok: true });
}
