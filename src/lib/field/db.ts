// Banco local do modo campo (IndexedDB do navegador). Guarda, no próprio
// aparelho, os projetos baixados, a fila de envio e as fotos tiradas sem
// internet. Wrapper mínimo, sem dependências.

const DB_NAME = "inspecao-ex-campo";
const DB_VERSION = 1;

export const STORES = {
  projects: "projects", // retrato do projeto (chave: id do projeto)
  queue: "queue", // operações aguardando envio (chave autoincremental)
  photos: "photos", // fotos tiradas no aparelho (chave: id da foto)
} as const;

let dbPromise: Promise<IDBDatabase> | null = null;

function openDb(): Promise<IDBDatabase> {
  if (!dbPromise) {
    dbPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(STORES.projects)) db.createObjectStore(STORES.projects, { keyPath: "id" });
        if (!db.objectStoreNames.contains(STORES.queue)) db.createObjectStore(STORES.queue, { keyPath: "seq", autoIncrement: true });
        if (!db.objectStoreNames.contains(STORES.photos)) db.createObjectStore(STORES.photos, { keyPath: "id" });
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => {
        dbPromise = null;
        reject(request.error);
      };
    });
  }
  return dbPromise;
}

type StoreName = (typeof STORES)[keyof typeof STORES];

function promisify<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function getAll<T>(store: StoreName): Promise<T[]> {
  const db = await openDb();
  return promisify(db.transaction(store).objectStore(store).getAll()) as Promise<T[]>;
}

export async function get<T>(store: StoreName, key: IDBValidKey): Promise<T | undefined> {
  const db = await openDb();
  return promisify(db.transaction(store).objectStore(store).get(key)) as Promise<T | undefined>;
}

/**
 * Executa várias escritas numa única transação: ou grava tudo, ou nada
 * (ex.: mudar o retrato do projeto E enfileirar a operação correspondente).
 */
export async function write(
  stores: StoreName[],
  fn: (tx: { put: (store: StoreName, value: unknown) => void; del: (store: StoreName, key: IDBValidKey) => void }) => void,
): Promise<void> {
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(stores, "readwrite");
    fn({
      put: (store, value) => tx.objectStore(store).put(value),
      del: (store, key) => tx.objectStore(store).delete(key),
    });
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error ?? new Error("Gravação no aparelho cancelada."));
  });
}

/** Pede ao navegador para não apagar estes dados quando faltar espaço. */
export async function requestPersistence(): Promise<boolean> {
  try {
    return (await navigator.storage?.persist?.()) ?? false;
  } catch {
    return false;
  }
}
