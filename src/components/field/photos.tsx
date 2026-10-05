"use client";

/* eslint-disable @next/next/no-img-element */
import { useEffect, useState } from "react";
import { getPhoto } from "@/lib/field/store";

/** Foto guardada no aparelho (ainda não enviada). */
export function LocalPhoto({ id, className = "" }: { id: string; className?: string }) {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    let objectUrl: string | null = null;
    let alive = true;
    getPhoto(id).then((photo) => {
      if (!photo || !alive) return;
      objectUrl = URL.createObjectURL(photo.blob);
      setUrl(objectUrl);
    });
    return () => {
      alive = false;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [id]);
  return url ? (
    <img src={url} alt="Foto (aguardando envio)" className={`object-cover ${className}`} />
  ) : (
    <div className={`bg-line ${className}`} />
  );
}

/** Foto já no servidor: aparece sem internet só se já foi vista antes neste aparelho. */
export function ServerPhoto({ id, className = "" }: { id: string; className?: string }) {
  const [failed, setFailed] = useState(false);
  if (failed) {
    return (
      <div className={`flex items-center justify-center bg-line/60 text-center text-[10px] text-muted ${className}`}>
        foto no servidor
      </div>
    );
  }
  return (
    <img
      src={`/api/fotos/${id}`}
      alt="Foto do equipamento"
      onError={() => setFailed(true)}
      className={`bg-line object-cover ${className}`}
    />
  );
}
