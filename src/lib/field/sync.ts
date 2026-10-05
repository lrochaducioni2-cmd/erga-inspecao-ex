// Envio da fila do modo campo para o servidor.
//
// - Em ordem (ambiente antes do equipamento, equipamento antes da foto).
// - Idempotente: cada registro leva o id gerado no aparelho; se a conexão
//   cair depois de o servidor gravar, o reenvio não duplica.
// - Cada operação só sai da fila depois de confirmada, na mesma transação
//   que atualiza o retrato local.
// - Sem internet: para e tenta de novo depois. Erro do servidor (ex.: projeto
//   emitido): para, guarda o motivo e espera decisão do usuário.

import { STORES, write } from "@/lib/field/db";
import { getPhoto, getProject, listQueue, saveSnapshot } from "@/lib/field/store";
import type { FieldOp, FieldProject } from "@/lib/field/types";

export type SyncResult =
  | { status: "done"; sent: number }
  | { status: "offline"; sent: number }
  | { status: "auth"; sent: number; message: string }
  | { status: "error"; sent: number; message: string; op: FieldOp & { seq: number } };

class HttpError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

let running: Promise<SyncResult> | null = null;

/** Envia a fila; chamadas simultâneas compartilham a mesma execução. */
export function syncNow(): Promise<SyncResult> {
  if (!running) running = run().finally(() => (running = null));
  return running;
}

async function run(): Promise<SyncResult> {
  let sent = 0;
  const touched = new Set<string>();
  const queue = (await listQueue()).sort((a, b) => a.seq - b.seq);

  for (const op of queue) {
    try {
      await send(op);
      sent++;
      touched.add(op.projectId);
    } catch (error) {
      await refreshPendingFlags(touched);
      if (error instanceof HttpError) {
        if (error.status === 401) {
          return { status: "auth", sent, message: "Sua sessão expirou. Entre de novo para enviar." };
        }
        if (error.status >= 500) return { status: "offline", sent };
        return { status: "error", sent, message: error.message, op };
      }
      // fetch falhou: sem conexão (ou caiu no meio).
      return { status: "offline", sent };
    }
  }

  await refreshPendingFlags(touched);
  // Tudo enviado: atualiza o retrato (nº dos itens, alterações feitas no computador).
  for (const projectId of touched) await downloadProject(projectId).catch(() => {});
  return { status: "done", sent };
}

async function request(url: string, init: RequestInit): Promise<unknown> {
  const res = await fetch(url, init);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new HttpError(res.status, (data as { error?: string }).error ?? `Erro ${res.status} do servidor.`);
  return data;
}

const json = (body: unknown): RequestInit => ({
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(body),
});

async function send(op: FieldOp & { seq: number }): Promise<void> {
  switch (op.type) {
    case "createArea": {
      await request(`/api/projetos/${op.projectId}/ambientes`, json(op.area));
      await finish(op, (p) => ({ ...p, areas: p.areas.map((a) => (a.id === op.area.id ? { ...a, pending: false } : a)) }));
      return;
    }
    case "createEquipment": {
      const created = (await request(`/api/projetos/${op.projectId}/equipamentos`, json(op.equipment))) as { item?: number };
      await finish(op, (p) => ({
        ...p,
        equipment: p.equipment.map((e) => (e.id === op.equipment.id ? { ...e, item: created.item ?? e.item } : e)),
      }));
      return;
    }
    case "updateEquipment": {
      await request(`/api/equipamentos/${op.equipmentId}`, { ...json(op.data), method: "PATCH" });
      await finish(op, (p) => p);
      return;
    }
    case "uploadPhoto": {
      const photo = await getPhoto(op.photoId);
      if (!photo) {
        // Foto não está mais no aparelho: nada a enviar.
        await finish(op, (p) => ({
          ...p,
          equipment: p.equipment.map((e) =>
            e.id === op.equipmentId ? { ...e, localPhotoIds: e.localPhotoIds.filter((id) => id !== op.photoId) } : e,
          ),
        }));
        return;
      }
      {
        const form = new FormData();
        form.append("file", photo.blob, "foto.jpg");
        form.append("id", photo.id);
        form.append("width", String(photo.width));
        form.append("height", String(photo.height));
        await request(`/api/equipamentos/${op.equipmentId}/fotos`, { method: "POST", body: form });
      }
      await finish(
        op,
        (p) => ({
          ...p,
          equipment: p.equipment.map((e) =>
            e.id === op.equipmentId
              ? { ...e, photoIds: [...e.photoIds, op.photoId], localPhotoIds: e.localPhotoIds.filter((id) => id !== op.photoId) }
              : e,
          ),
        }),
        op.photoId,
      );
      return;
    }
  }
}

/** Tira a operação da fila e atualiza o retrato local, na mesma transação. */
async function finish(op: FieldOp & { seq: number }, update: (p: FieldProject) => FieldProject, deletePhotoId?: string) {
  const project = await getProject(op.projectId);
  await write([STORES.queue, STORES.projects, STORES.photos], (tx) => {
    tx.del(STORES.queue, op.seq);
    if (project) tx.put(STORES.projects, update(project));
    if (deletePhotoId) tx.del(STORES.photos, deletePhotoId);
  });
}

/** Marca como "aguardando envio" só o que ainda tem operação na fila. */
async function refreshPendingFlags(projectIds: Set<string>) {
  if (projectIds.size === 0) return;
  const queue = await listQueue();
  for (const projectId of projectIds) {
    const project = await getProject(projectId);
    if (!project) continue;
    const ops = queue.filter((op) => op.projectId === projectId);
    const areaPending = new Set(ops.flatMap((op) => (op.type === "createArea" ? [op.area.id] : [])));
    const eqPending = new Set(
      ops.flatMap((op) =>
        op.type === "createEquipment" ? [op.equipment.id] : op.type === "updateEquipment" || op.type === "uploadPhoto" ? [op.equipmentId] : [],
      ),
    );
    await write([STORES.projects], (tx) =>
      tx.put(STORES.projects, {
        ...project,
        areas: project.areas.map((a) => ({ ...a, pending: areaPending.has(a.id) })),
        equipment: project.equipment.map((e) => ({ ...e, pending: eqPending.has(e.id) })),
      }),
    );
  }
}

/** Baixa (ou atualiza) o retrato do projeto para usar sem internet. */
export async function downloadProject(projectId: string): Promise<void> {
  const res = await fetch(`/api/campo/projetos/${projectId}`, { cache: "no-store" });
  if (res.status === 401) throw new Error("Sua sessão expirou. Entre de novo.");
  if (!res.ok) throw new Error("Não foi possível baixar o projeto.");
  await saveSnapshot((await res.json()) as FieldProject);
}

/**
 * Descarta uma operação que o servidor recusou (decisão do usuário), junto
 * com o que depende dela: descartar um ambiente novo leva os equipamentos
 * novos dele; descartar um equipamento novo leva as fotos e alterações dele.
 */
export async function discardOp(op: FieldOp & { seq: number }) {
  const queue = await listQueue();
  const areaIds = new Set(op.type === "createArea" ? [op.area.id] : []);
  const equipmentIds = new Set<string>(op.type === "createEquipment" ? [op.equipment.id] : []);
  for (const o of queue) {
    if (o.type === "createEquipment" && areaIds.has(o.equipment.areaId)) equipmentIds.add(o.equipment.id);
  }
  const doomed = queue.filter(
    (o) =>
      o.seq === op.seq ||
      (o.type === "createEquipment" && equipmentIds.has(o.equipment.id)) ||
      ((o.type === "updateEquipment" || o.type === "uploadPhoto") && equipmentIds.has(o.equipmentId)),
  );
  const photoIds = doomed.flatMap((o) => (o.type === "uploadPhoto" ? [o.photoId] : []));
  const project = await getProject(op.projectId);

  await write([STORES.queue, STORES.photos, STORES.projects], (tx) => {
    doomed.forEach((o) => tx.del(STORES.queue, o.seq));
    photoIds.forEach((id) => tx.del(STORES.photos, id));
    if (project) {
      tx.put(STORES.projects, {
        ...project,
        areas: project.areas.filter((a) => !areaIds.has(a.id)),
        equipment: project.equipment
          .filter((e) => !equipmentIds.has(e.id))
          .map((e) => ({ ...e, localPhotoIds: e.localPhotoIds.filter((id) => !photoIds.includes(id)) })),
      });
    }
  });
  await refreshPendingFlags(new Set([op.projectId]));
}

export function describeOp(op: FieldOp): string {
  switch (op.type) {
    case "createArea":
      return `Novo ambiente “${op.area.name}”`;
    case "createEquipment":
      return `Novo equipamento “${op.equipment.name}”`;
    case "updateEquipment":
      return `Alteração em “${op.data.name}”`;
    case "uploadPhoto":
      return "Foto de equipamento";
  }
}
