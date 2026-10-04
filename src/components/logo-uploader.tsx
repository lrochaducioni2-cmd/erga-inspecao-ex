"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { PhotoThumb } from "@/components/photo-thumb";
import { compressImage, uploadImage } from "@/lib/image-compress";

export function LogoUploader({
  projectId,
  logoId,
  locked,
}: {
  projectId: string;
  logoId: string | null;
  locked: boolean;
}) {
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onFile(file: File | undefined) {
    if (!file) return;
    setBusy(true);
    setError(null);
    try {
      const err = await uploadImage(
        `/api/projetos/${projectId}/logo`,
        await compressImage(file),
      );
      if (err) setError(err);
      else router.refresh();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
      if (input.current) input.current.value = "";
    }
  }

  async function remove() {
    if (!confirm("Remover o logo do cliente?")) return;
    setBusy(true);
    await fetch(`/api/projetos/${projectId}/logo`, { method: "DELETE" });
    setBusy(false);
    router.refresh();
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-4">
        <div className="flex h-16 w-28 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-line bg-white">
          {logoId ? (
            <PhotoThumb
              id={logoId}
              alt="Logo do cliente"
              className="h-full w-full !bg-white !object-contain p-1"
            />
          ) : (
            <span className="px-2 text-center text-xs text-muted">
              Sem logo
            </span>
          )}
        </div>
        {!locked && (
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => input.current?.click()}
              disabled={busy}
              className="h-11 whitespace-nowrap rounded-xl border border-line px-4 text-[15px] font-semibold hover:border-brand disabled:opacity-60"
            >
              {busy ? "Enviando..." : logoId ? "Trocar logo" : "Enviar logo"}
            </button>
            {logoId && (
              <button
                type="button"
                onClick={remove}
                disabled={busy}
                className="h-11 px-2 text-[15px] font-semibold text-nc"
              >
                Remover
              </button>
            )}
          </div>
        )}
        <input
          ref={input}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => onFile(e.target.files?.[0])}
        />
      </div>
      {error && <p className="text-sm text-nc">{error}</p>}
    </div>
  );
}
