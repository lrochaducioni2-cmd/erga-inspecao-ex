"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { requestPersistence } from "@/lib/field/db";
import { listProjects, listQueue } from "@/lib/field/store";
import { syncNow, type SyncResult } from "@/lib/field/sync";
import type { FieldOp, FieldProject } from "@/lib/field/types";

const RETRY_MS = 30_000;

// Conexão lida direto do navegador (e atualizada nos eventos online/offline).
function subscribeOnline(callback: () => void) {
  window.addEventListener("online", callback);
  window.addEventListener("offline", callback);
  return () => {
    window.removeEventListener("online", callback);
    window.removeEventListener("offline", callback);
  };
}
const useOnline = () => useSyncExternalStore(subscribeOnline, () => navigator.onLine, () => true);

/** Estado do modo campo: projetos no aparelho, fila de envio e conexão. */
export function useField() {
  const [projects, setProjects] = useState<FieldProject[] | null>(null);
  const [queue, setQueue] = useState<(FieldOp & { seq: number })[]>([]);
  const online = useOnline();
  const [syncing, setSyncing] = useState(false);
  const [lastResult, setLastResult] = useState<SyncResult | null>(null);
  const mounted = useRef(true);

  const reload = useCallback(async () => {
    const [p, q] = await Promise.all([listProjects(), listQueue()]);
    if (!mounted.current) return;
    setProjects(p.sort((a, b) => b.downloadedAt.localeCompare(a.downloadedAt)));
    setQueue(q.sort((a, b) => a.seq - b.seq));
  }, []);

  const sync = useCallback(async () => {
    if (!navigator.onLine) return;
    setSyncing(true);
    try {
      const result = await syncNow();
      if (mounted.current) setLastResult(result);
    } finally {
      if (mounted.current) setSyncing(false);
      await reload();
    }
  }, [reload]);

  useEffect(() => {
    mounted.current = true;
    requestPersistence();
    reload().then(() => sync());
    // Voltou a internet: envia o que estiver na fila.
    const goOnline = () => sync();
    window.addEventListener("online", goOnline);
    const timer = setInterval(() => {
      if (navigator.onLine) sync();
    }, RETRY_MS);
    return () => {
      mounted.current = false;
      window.removeEventListener("online", goOnline);
      clearInterval(timer);
    };
  }, [reload, sync]);

  /** Depois de gravar algo no aparelho: atualiza a tela e tenta enviar. */
  const afterChange = useCallback(async () => {
    await reload();
    if (navigator.onLine) sync();
  }, [reload, sync]);

  return { projects, queue, online, syncing, lastResult, reload, sync, afterChange, setLastResult };
}
