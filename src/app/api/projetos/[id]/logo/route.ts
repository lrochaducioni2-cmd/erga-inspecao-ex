import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/api";
import { editableProject } from "@/lib/inventory";
import { receivePhoto, removeStoredFiles } from "@/lib/uploads";

type Params = { params: Promise<{ id: string }> };

// Logo do cliente (uma por projeto): enviar uma nova substitui a anterior.
export async function POST(request: Request, { params }: Params) {
  const auth = await requireUser();
  if (auth.error) return auth.error;

  const { id } = await params;
  const target = await editableProject(id);
  if (target.error) return target.error;

  const previous = await prisma.photo.findMany({ where: { projectId: id, kind: "LOGO" } });
  const received = await receivePhoto(request, { projectId: id, kind: "LOGO", uploadedById: auth.user.id });
  if (received.error) return received.error;

  if (previous.length) {
    await prisma.photo.deleteMany({ where: { id: { in: previous.map((p) => p.id) } } });
    await removeStoredFiles(previous.map((p) => p.storageKey));
  }
  return NextResponse.json({ id: received.photo.id }, { status: 201 });
}

export async function DELETE(_request: Request, { params }: Params) {
  const auth = await requireUser();
  if (auth.error) return auth.error;

  const { id } = await params;
  const target = await editableProject(id);
  if (target.error) return target.error;

  const logos = await prisma.photo.findMany({ where: { projectId: id, kind: "LOGO" } });
  await prisma.photo.deleteMany({ where: { projectId: id, kind: "LOGO" } });
  await removeStoredFiles(logos.map((p) => p.storageKey));
  return NextResponse.json({ ok: true });
}
