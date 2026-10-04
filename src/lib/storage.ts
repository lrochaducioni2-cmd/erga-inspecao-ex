// Armazenamento de arquivos (fotos e logos).
//
//   - Produção (Vercel): Vercel Blob em modo PRIVADO. Ao ligar o Blob store
//     ao projeto, a Vercel cria BLOB_READ_WRITE_TOKEN (chave) ou BLOB_STORE_ID
//     (autenticação OIDC automática da Vercel) — os dois funcionam. Os arquivos não têm link público; o app os
//     entrega só a usuários logados (rota /api/fotos/:id).
//   - Desenvolvimento: pasta local (STORAGE_LOCAL_DIR, padrão .data/uploads).
//
// Para migrar no futuro (ex.: Cloudflare R2), basta um novo driver com a
// mesma interface — o resto do app só conhece `storage`.

import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { del, get, put } from "@vercel/blob";

export type StoredFile = { body: ReadableStream<Uint8Array> | Uint8Array; contentType: string; size: number };

interface StorageDriver {
  save(key: string, data: Uint8Array, contentType: string): Promise<void>;
  read(key: string): Promise<StoredFile | null>;
  remove(keys: string[]): Promise<void>;
}

export class StorageNotConfiguredError extends Error {
  constructor() {
    super("Armazenamento de fotos não configurado: ative o Vercel Blob (privado) no projeto da Vercel.");
    this.name = "StorageNotConfiguredError";
  }
}

const blobDriver: StorageDriver = {
  async save(key, data, contentType) {
    await put(key, Buffer.from(data), { access: "private", contentType, addRandomSuffix: false });
  },
  async read(key) {
    const result = await get(key, { access: "private" });
    if (!result || result.statusCode !== 200) return null;
    return { body: result.stream, contentType: result.blob.contentType, size: result.blob.size };
  },
  async remove(keys) {
    if (keys.length) await del(keys);
  },
};

function localDir() {
  return path.resolve(process.env.STORAGE_LOCAL_DIR || ".data/uploads");
}

function localPath(key: string) {
  // As chaves são geradas pelo app (ver photoKey), mas nunca deixamos sair da pasta.
  const full = path.resolve(localDir(), key);
  if (!full.startsWith(localDir() + path.sep)) throw new Error("Chave de arquivo inválida.");
  return full;
}

const localDriver: StorageDriver = {
  async save(key, data, contentType) {
    const file = localPath(key);
    await mkdir(path.dirname(file), { recursive: true });
    await writeFile(file, data);
    await writeFile(`${file}.type`, contentType);
  },
  async read(key) {
    try {
      const file = localPath(key);
      const [data, contentType] = await Promise.all([readFile(file), readFile(`${file}.type`, "utf8")]);
      return { body: new Uint8Array(data), contentType, size: data.length };
    } catch {
      return null;
    }
  },
  async remove(keys) {
    await Promise.all(
      keys.flatMap((key) => [rm(localPath(key), { force: true }), rm(`${localPath(key)}.type`, { force: true })]),
    );
  },
};

function driver(): StorageDriver {
  if (process.env.BLOB_READ_WRITE_TOKEN || process.env.BLOB_STORE_ID) return blobDriver;
  if (process.env.VERCEL) throw new StorageNotConfiguredError();
  return localDriver;
}

export const storage: StorageDriver = {
  save: (...args) => driver().save(...args),
  read: (...args) => driver().read(...args),
  remove: (...args) => driver().remove(...args),
};

const EXTENSIONS: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" };
export const ALLOWED_IMAGE_TYPES = Object.keys(EXTENSIONS);

/** Chave imprevisível e organizada por projeto: projetos/<id>/<uuid>.jpg */
export function photoKey(projectId: string, contentType: string): string {
  return `projetos/${projectId}/${crypto.randomUUID()}.${EXTENSIONS[contentType] ?? "bin"}`;
}
