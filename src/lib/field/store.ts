// Operações do modo campo. Cada alteração muda o retrato local do projeto
// E entra na fila de envio na MESMA transação — nunca uma sem a outra.

import { STORES, get, getAll, write } from "@/lib/field/db";
import type { EquipmentFields, FieldOp, FieldPhoto, FieldProject } from "@/lib/field/types";
import type { CompressedImage } from "@/lib/image-compress";

export const listProjects = () => getAll<FieldProject>(STORES.projects);
export const getProject = (id: string) => get<FieldProject>(STORES.projects, id);
export const listQueue = () => getAll<FieldOp & { seq: number }>(STORES.queue);
export const getPhoto = (id: string) => get<FieldPhoto>(STORES.photos, id);

export function newId(): string {
  return crypto.randomUUID();
}

/** Guarda (ou atualiza) o retrato baixado do servidor, preservando o que ainda não foi enviado. */
export async function saveSnapshot(snapshot: FieldProject): Promise<void> {
  const current = await getProject(snapshot.id);
  const queue = (await listQueue()).filter((op) => op.projectId === snapshot.id);
  let merged = { ...snapshot, equipment: snapshot.equipment.map((e) => ({ ...e, localPhotoIds: [] as string[] })) };

  if (current && queue.length) {
    // Reaplica sobre o retrato novo tudo o que ainda está na fila.
    const pendingAreas = current.areas.filter((a) => a.pending && !merged.areas.some((x) => x.id === a.id));
    const pendingEquipment = current.equipment.filter((e) => e.pending && !merged.equipment.some((x) => x.id === e.id));
    merged = {
      ...merged,
      areas: [...merged.areas, ...pendingAreas],
      equipment: [
        ...merged.equipment.map((e) => {
          const local = current.equipment.find((x) => x.id === e.id);
          const updated = queue.some((op) => op.type === "updateEquipment" && op.equipmentId === e.id);
          return local && updated ? { ...e, ...pick(local), pending: true, localPhotoIds: local.localPhotoIds } : { ...e, localPhotoIds: local?.localPhotoIds ?? [] };
        }),
        ...pendingEquipment,
      ],
    };
  }
  await write([STORES.projects], (tx) => tx.put(STORES.projects, merged));
}

function pick(e: EquipmentFields): EquipmentFields {
  return { areaId: e.areaId, name: e.name, isEx: e.isEx, quantity: e.quantity, clientTag: e.clientTag, notes: e.notes };
}

/** Remove o projeto do aparelho (só quando não há nada aguardando envio). */
export async function removeProject(id: string): Promise<void> {
  const pending = (await listQueue()).some((op) => op.projectId === id);
  if (pending) throw new Error("Este projeto tem itens aguardando envio. Envie antes de remover do aparelho.");
  const project = await getProject(id);
  const localPhotos = project?.equipment.flatMap((e) => e.localPhotoIds) ?? [];
  await write([STORES.projects, STORES.photos], (tx) => {
    tx.del(STORES.projects, id);
    localPhotos.forEach((p) => tx.del(STORES.photos, p));
  });
}

export async function addArea(projectId: string, area: { name: string; zone: string; notes: string | null }) {
  const project = await mustProject(projectId);
  const created = { id: newId(), ...area };
  await write([STORES.projects, STORES.queue], (tx) => {
    tx.put(STORES.projects, { ...project, areas: [...project.areas, { ...created, pending: true }] });
    tx.put(STORES.queue, { type: "createArea", projectId, area: created } satisfies FieldOp);
  });
  return created.id;
}

/**
 * Cria (sem `equipmentId`) ou altera um equipamento, junto com as fotos novas.
 * Fotos ficam no aparelho até o envio.
 */
export async function saveEquipment(
  projectId: string,
  fields: EquipmentFields,
  photos: CompressedImage[],
  equipmentId?: string,
): Promise<string> {
  const project = await mustProject(projectId);
  const id = equipmentId ?? newId();
  const newPhotos: FieldPhoto[] = photos.map((p) => ({ id: newId(), blob: p.blob, width: p.width, height: p.height }));
  const existing = project.equipment.find((e) => e.id === id);

  const equipment = existing
    ? { ...existing, ...fields, pending: true, localPhotoIds: [...existing.localPhotoIds, ...newPhotos.map((p) => p.id)] }
    : { id, ...fields, item: null, photoIds: [], localPhotoIds: newPhotos.map((p) => p.id), pending: true };

  await write([STORES.projects, STORES.queue, STORES.photos], (tx) => {
    tx.put(STORES.projects, {
      ...project,
      equipment: existing ? project.equipment.map((e) => (e.id === id ? equipment : e)) : [...project.equipment, equipment],
    });
    if (existing) {
      tx.put(STORES.queue, { type: "updateEquipment", projectId, equipmentId: id, data: fields } satisfies FieldOp);
    } else {
      tx.put(STORES.queue, { type: "createEquipment", projectId, equipment: { id, ...fields } } satisfies FieldOp);
    }
    for (const photo of newPhotos) {
      tx.put(STORES.photos, photo);
      tx.put(STORES.queue, { type: "uploadPhoto", projectId, equipmentId: id, photoId: photo.id } satisfies FieldOp);
    }
  });
  return id;
}

async function mustProject(id: string): Promise<FieldProject> {
  const project = await getProject(id);
  if (!project) throw new Error("Projeto não está no aparelho. Baixe-o de novo.");
  return project;
}
