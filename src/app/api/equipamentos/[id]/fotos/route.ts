import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { jsonError, requireUser } from "@/lib/api";
import { editableProject } from "@/lib/inventory";
import { receivePhoto } from "@/lib/uploads";

type Params = { params: Promise<{ id: string }> };

export async function POST(request: Request, { params }: Params) {
  const auth = await requireUser();
  if (auth.error) return auth.error;

  const equipment = await prisma.equipment.findUnique({ where: { id: (await params).id } });
  if (!equipment) return jsonError("Equipamento não encontrado.", 404);
  const target = await editableProject(equipment.projectId);
  if (target.error) return target.error;

  const received = await receivePhoto(request, {
    projectId: equipment.projectId,
    equipmentId: equipment.id,
    kind: "EQUIPMENT",
    uploadedById: auth.user.id,
  });
  if (received.error) return received.error;
  return NextResponse.json({ id: received.photo.id }, { status: 201 });
}
