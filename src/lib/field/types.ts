// Tipos do modo campo (retrato do projeto no aparelho + fila de envio).

export type FieldArea = { id: string; name: string; zone: string; notes: string | null; pending?: boolean };

export type FieldEquipment = {
  id: string;
  areaId: string;
  item: number | null; // nº definido pelo servidor ao enviar
  name: string;
  isEx: boolean;
  quantity: number;
  clientTag: string | null;
  notes: string | null;
  photoIds: string[]; // fotos já no servidor
  localPhotoIds: string[]; // fotos guardadas no aparelho, aguardando envio
  pending?: boolean;
};

export type FieldProject = {
  id: string;
  pi: number;
  title: string;
  type: string;
  clientName: string;
  status: string;
  areas: FieldArea[];
  equipment: FieldEquipment[];
  downloadedAt: string;
};

export type EquipmentFields = Pick<FieldEquipment, "areaId" | "name" | "isEx" | "quantity" | "clientTag" | "notes">;

export type FieldOp =
  | { seq?: number; type: "createArea"; projectId: string; area: Omit<FieldArea, "pending"> }
  | { seq?: number; type: "createEquipment"; projectId: string; equipment: EquipmentFields & { id: string } }
  | { seq?: number; type: "updateEquipment"; projectId: string; equipmentId: string; data: EquipmentFields }
  | { seq?: number; type: "uploadPhoto"; projectId: string; equipmentId: string; photoId: string };

export type FieldPhoto = { id: string; blob: Blob; width: number; height: number };
