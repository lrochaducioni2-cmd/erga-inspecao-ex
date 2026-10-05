import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { jsonError, requireUser } from "@/lib/api";

type Params = { params: Promise<{ id: string }> };

/** Retrato do projeto para guardar no aparelho (modo campo). */
export async function GET(_request: Request, { params }: Params) {
  const auth = await requireUser();
  if (auth.error) return auth.error;

  const project = await prisma.project.findUnique({
    where: { id: (await params).id },
    select: {
      id: true,
      pi: true,
      title: true,
      type: true,
      clientName: true,
      status: true,
      areas: { orderBy: { createdAt: "asc" }, select: { id: true, name: true, zone: true, notes: true } },
      equipment: {
        orderBy: { item: "asc" },
        select: {
          id: true,
          areaId: true,
          item: true,
          name: true,
          isEx: true,
          quantity: true,
          clientTag: true,
          notes: true,
          photos: { orderBy: { createdAt: "asc" }, select: { id: true } },
        },
      },
    },
  });
  if (!project) return jsonError("Projeto não encontrado.", 404);

  return NextResponse.json({
    ...project,
    equipment: project.equipment.map(({ photos, ...eq }) => ({ ...eq, photoIds: photos.map((p) => p.id) })),
    downloadedAt: new Date().toISOString(),
  });
}
