import type { PhotoKind } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { jsonError } from "@/lib/api";
import { ALLOWED_IMAGE_TYPES, StorageNotConfiguredError, photoKey, storage } from "@/lib/storage";
import { clientIdSchema } from "@/lib/validation";

// O celular reduz a foto antes de enviar (src/lib/image-compress.ts); este
// limite cobre o máximo aceito por requisição na Vercel (~4,5 MB).
const MAX_BYTES = 4 * 1024 * 1024;

/**
 * Recebe uma imagem (campo "file" de um multipart) e grava arquivo + registro.
 * Se o registro falhar, o arquivo é apagado para não sobrar lixo.
 */
export async function receivePhoto(
  request: Request,
  target: { projectId: string; equipmentId?: string; kind: PhotoKind; uploadedById: string },
) {
  const form = await request.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File)) return { error: jsonError("Nenhuma foto recebida.", 400) } as const;
  if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
    return { error: jsonError("Formato de foto não aceito (use JPG, PNG ou WebP).", 415) } as const;
  }
  if (file.size > MAX_BYTES) return { error: jsonError("Foto muito grande (máx. 4 MB).", 413) } as const;

  // Modo campo envia o id gerado no aparelho: reenvio da mesma foto não duplica.
  const clientId = clientIdSchema.safeParse(form?.get("id"));
  const id = clientId.success ? clientId.data : undefined;
  if (id) {
    const existing = await prisma.photo.findUnique({ where: { id } });
    if (existing) {
      return existing.projectId === target.projectId
        ? ({ photo: existing } as const)
        : ({ error: jsonError("Identificador já usado em outro projeto.", 409) } as const);
    }
  }

  const dimension = (name: string) => {
    const value = Number(form?.get(name));
    return Number.isInteger(value) && value > 0 && value < 20000 ? value : null;
  };

  const key = photoKey(target.projectId, file.type);
  try {
    await storage.save(key, new Uint8Array(await file.arrayBuffer()), file.type);
  } catch (error) {
    if (error instanceof StorageNotConfiguredError) return { error: jsonError(error.message, 503) } as const;
    console.error("storage.save", error);
    // Mostra o motivo dado pelo armazenamento (ex.: credencial, store suspenso).
    const reason = error instanceof Error && error.message ? ` (${error.message.slice(0, 200)})` : "";
    return { error: jsonError(`Não foi possível guardar a foto${reason}.`, 502) } as const;
  }

  try {
    const photo = await prisma.photo.create({
      data: {
        ...target,
        ...(id && { id }),
        storageKey: key,
        contentType: file.type,
        size: file.size,
        width: dimension("width"),
        height: dimension("height"),
      },
    });
    return { photo } as const;
  } catch (error) {
    await storage.remove([key]).catch(() => {});
    throw error;
  }
}

/** Apaga arquivos do armazenamento sem derrubar a operação principal. */
export async function removeStoredFiles(keys: string[]) {
  if (keys.length === 0) return;
  try {
    await storage.remove(keys);
  } catch (error) {
    console.error("storage.remove", keys.length, error);
  }
}
