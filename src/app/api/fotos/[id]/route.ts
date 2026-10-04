import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { jsonError, requireUser } from "@/lib/api";
import { editableProject } from "@/lib/inventory";
import { StorageNotConfiguredError, storage } from "@/lib/storage";
import { removeStoredFiles } from "@/lib/uploads";

type Params = { params: Promise<{ id: string }> };

// Entrega a foto só para usuários logados; o endereço no armazenamento
// nunca chega ao navegador.
export async function GET(_request: Request, { params }: Params) {
  const auth = await requireUser();
  if (auth.error) return auth.error;

  const photo = await prisma.photo.findUnique({ where: { id: (await params).id } });
  if (!photo) return jsonError("Foto não encontrada.", 404);

  try {
    const file = await storage.read(photo.storageKey);
    if (!file) return jsonError("Arquivo da foto não encontrado.", 404);
    return new NextResponse(file.body as BodyInit, {
      headers: {
        "Content-Type": photo.contentType,
        "Content-Length": String(file.size),
        // Cada foto tem id próprio e não muda: pode ficar no cache do aparelho.
        "Cache-Control": "private, max-age=31536000, immutable",
      },
    });
  } catch (error) {
    if (error instanceof StorageNotConfiguredError) return jsonError(error.message, 503);
    throw error;
  }
}

export async function DELETE(_request: Request, { params }: Params) {
  const auth = await requireUser();
  if (auth.error) return auth.error;

  const photo = await prisma.photo.findUnique({ where: { id: (await params).id } });
  if (!photo) return jsonError("Foto não encontrada.", 404);
  const target = await editableProject(photo.projectId);
  if (target.error) return target.error;

  await prisma.photo.delete({ where: { id: photo.id } });
  await removeStoredFiles([photo.storageKey]);
  return NextResponse.json({ ok: true });
}
