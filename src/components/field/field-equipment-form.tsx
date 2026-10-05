"use client";

/* eslint-disable @next/next/no-img-element */
import { useEffect, useRef, useState } from "react";
import { LocalPhoto, ServerPhoto } from "@/components/field/photos";
import { saveEquipment } from "@/lib/field/store";
import type { FieldProject } from "@/lib/field/types";
import { compressImage, type CompressedImage } from "@/lib/image-compress";
import { EQUIPMENT_SUGGESTIONS, recommendedAction } from "@/lib/inventory-rules";
import { inspectionTag } from "@/lib/projects";

type Pending = CompressedImage & { preview: string };

/**
 * Cadastro/edição de equipamento no modo campo: grava no aparelho (com as
 * fotos) e entra na fila de envio. Funciona com ou sem internet.
 */
export function FieldEquipmentForm({
  project,
  areaId,
  equipmentId,
  afterChange,
}: {
  project: FieldProject;
  areaId: string;
  equipmentId: string | null;
  afterChange: () => Promise<void>;
}) {
  const existing = equipmentId ? project.equipment.find((e) => e.id === equipmentId) : undefined;
  const locked = project.status === "EMITIDO";
  const fileInput = useRef<HTMLInputElement>(null);

  const [area, setArea] = useState(existing?.areaId ?? areaId);
  const [name, setName] = useState(existing?.name ?? "");
  const [isEx, setIsEx] = useState<boolean | null>(existing?.isEx ?? null);
  const [quantity, setQuantity] = useState(existing?.quantity ?? 1);
  const [clientTag, setClientTag] = useState(existing?.clientTag ?? "");
  const [notes, setNotes] = useState(existing?.notes ?? "");
  const [pending, setPending] = useState<Pending[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState<string | null>(null);

  // Prévias locais: liberadas ao remover a foto ou ao sair da tela.
  const previews = useRef(new Set<string>());
  useEffect(() => {
    const urls = previews.current;
    return () => urls.forEach((u) => URL.revokeObjectURL(u));
  }, []);

  if (equipmentId && !existing) return <p className="text-muted">Equipamento não encontrado neste aparelho.</p>;

  async function onFiles(files: FileList | null) {
    if (!files?.length) return;
    setBusy("Processando foto…");
    setError(null);
    try {
      for (const file of Array.from(files)) {
        const image = await compressImage(file);
        const preview = URL.createObjectURL(image.blob);
        previews.current.add(preview);
        setPending((list) => [...list, { ...image, preview }]);
      }
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(null);
      if (fileInput.current) fileInput.current.value = "";
    }
  }

  function dropPending(p: Pending) {
    URL.revokeObjectURL(p.preview);
    previews.current.delete(p.preview);
    setPending((list) => list.filter((x) => x !== p));
  }

  async function save(next: "novo" | "voltar") {
    setError(null);
    setSaved(null);
    if (isEx === null) return setError("Diga se o equipamento é Ex ou Não Ex.");
    if (!name.trim()) return setError("Informe o equipamento.");
    setBusy("Salvando no aparelho…");
    try {
      await saveEquipment(
        project.id,
        {
          areaId: area,
          name: name.trim(),
          isEx,
          quantity,
          clientTag: clientTag.trim() || null,
          notes: notes.trim() || null,
        },
        pending,
        existing?.id,
      );
    } catch (e) {
      setBusy(null);
      return setError((e as Error).message || "Não foi possível salvar no aparelho.");
    }
    setBusy(null);
    pending.forEach((p) => URL.revokeObjectURL(p.preview));
    previews.current.clear();
    setPending([]);
    await afterChange();

    if (existing || next === "voltar") {
      history.back();
      return;
    }
    setSaved(`${name.trim()} salvo no aparelho.`);
    setName("");
    setIsEx(null);
    setQuantity(1);
    setClientTag("");
    setNotes("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  const input = "mt-1 h-12 w-full rounded-xl border border-line bg-white px-4 text-base focus:border-brand focus:outline-none";
  const photoCount = (existing?.photoIds.length ?? 0) + (existing?.localPhotoIds.length ?? 0) + pending.length;

  return (
    <div className="space-y-6 pb-4">
      <div>
        <h2 className="text-2xl font-bold">{existing ? existing.name : "Novo equipamento"}</h2>
        {existing && (
          <p className="font-mono text-sm text-muted">
            {existing.item ? inspectionTag(project.pi, existing.item) : "nº definido ao enviar"}
          </p>
        )}
      </div>

      {saved && (
        <p role="status" className="rounded-xl bg-ok-soft px-4 py-3 text-[15px] font-semibold text-ok">
          ✓ {saved} Pode cadastrar o próximo.
        </p>
      )}

      <section className="space-y-2">
        <h3 className="text-sm font-semibold">1. Fotos do equipamento</h3>
        <div className="flex flex-wrap gap-2">
          {existing?.photoIds.map((id) => <ServerPhoto key={id} id={id} className="h-24 w-24 rounded-xl" />)}
          {existing?.localPhotoIds.map((id) => <LocalPhoto key={id} id={id} className="h-24 w-24 rounded-xl" />)}
          {pending.map((p, i) => (
            <div key={p.preview} className="relative">
              <img src={p.preview} alt={`Foto nova ${i + 1}`} className="h-24 w-24 rounded-xl object-cover" />
              <button
                type="button"
                onClick={() => dropPending(p)}
                aria-label="Remover foto"
                className="absolute -right-2 -top-2 flex h-8 w-8 items-center justify-center rounded-full bg-nc text-lg font-bold text-white"
              >
                ×
              </button>
            </div>
          ))}
          {!locked && (
            <button
              type="button"
              onClick={() => fileInput.current?.click()}
              disabled={Boolean(busy)}
              className={`flex flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed border-brand bg-white font-semibold text-brand disabled:opacity-60 ${
                photoCount ? "h-24 w-24 text-sm" : "h-32 w-full text-base"
              }`}
            >
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                <circle cx="12" cy="13" r="4" />
              </svg>
              {photoCount ? "+ Foto" : "Tirar foto"}
            </button>
          )}
        </div>
        <input ref={fileInput} type="file" accept="image/*" capture="environment" multiple className="hidden" onChange={(e) => onFiles(e.target.files)} />
      </section>

      <fieldset className="space-y-2" disabled={locked}>
        <legend className="text-sm font-semibold">2. É equipamento Ex (certificado)?</legend>
        <div className="grid grid-cols-2 gap-3">
          <button type="button" aria-pressed={isEx === true} onClick={() => setIsEx(true)}
            className={`h-16 rounded-xl border-2 border-brand text-[17px] font-bold ${isEx === true ? "bg-brand text-white" : "bg-white text-brand"}`}>
            Sim, é Ex
          </button>
          <button type="button" aria-pressed={isEx === false} onClick={() => setIsEx(false)}
            className={`h-16 rounded-xl border-2 border-nc text-[17px] font-bold ${isEx === false ? "bg-nc text-white" : "bg-white text-nc"}`}>
            Não é Ex
          </button>
        </div>
      </fieldset>

      <fieldset className="space-y-2" disabled={locked}>
        <label className="block text-sm font-semibold">
          3. Equipamento
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex.: Luminária" className={input} />
        </label>
        <div className="flex flex-wrap gap-2">
          {EQUIPMENT_SUGGESTIONS.map((s) => (
            <button key={s} type="button" onClick={() => setName(s)} className="h-10 rounded-full border border-line bg-white px-4 text-sm">
              {s}
            </button>
          ))}
        </div>
      </fieldset>

      <fieldset className="grid grid-cols-[auto_1fr] gap-4" disabled={locked}>
        <div>
          <span className="block text-sm font-semibold" id="qtd">Quantidade</span>
          <div className="mt-1 flex items-center" role="group" aria-labelledby="qtd">
            <button type="button" onClick={() => setQuantity((q) => Math.max(1, q - 1))} aria-label="Diminuir quantidade" className="h-12 w-12 rounded-l-xl border border-line bg-white text-xl font-bold">−</button>
            <input inputMode="numeric" value={quantity} aria-label="Quantidade"
              onChange={(e) => setQuantity(Math.max(1, Number(e.target.value.replace(/\D/g, "")) || 1))}
              className="h-12 w-14 border-y border-line bg-white text-center text-base" />
            <button type="button" onClick={() => setQuantity((q) => q + 1)} aria-label="Aumentar quantidade" className="h-12 w-12 rounded-r-xl border border-line bg-white text-xl font-bold">+</button>
          </div>
        </div>
        <label className="block text-sm font-semibold">
          TAG do cliente (opcional)
          <input value={clientTag} onChange={(e) => setClientTag(e.target.value)} className={input} />
        </label>
      </fieldset>

      {project.areas.length > 1 && (
        <label className="block text-sm font-semibold">
          Ambiente
          <select value={area} onChange={(e) => setArea(e.target.value)} disabled={locked} className={input}>
            {project.areas.map((a) => (
              <option key={a.id} value={a.id}>{a.name}</option>
            ))}
          </select>
        </label>
      )}

      <label className="block text-sm font-semibold">
        4. Observação
        <textarea rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} disabled={locked}
          placeholder="Digite ou dite pelo microfone do teclado"
          className="mt-1 w-full rounded-xl border border-line bg-white px-4 py-3 text-base focus:border-brand focus:outline-none" />
      </label>

      {isEx !== null && (
        <div className={`rounded-xl px-4 py-3 ${isEx ? "bg-brand-soft text-brand" : "bg-nc-soft text-nc-ink"}`}>
          <div className="text-xs font-semibold uppercase tracking-wide">Plano de ação</div>
          <div className="text-base font-bold">{recommendedAction(isEx)}</div>
        </div>
      )}

      {error && <p className="rounded-xl border border-nc bg-nc-soft px-4 py-3 text-[15px] text-nc-ink">{error}</p>}

      {!locked && (
        <div className="sticky bottom-0 -mx-4 space-y-2 border-t border-line bg-ground/95 px-4 pb-4 pt-3 backdrop-blur">
          <button type="button" onClick={() => save(existing ? "voltar" : "novo")} disabled={Boolean(busy)}
            className="h-14 w-full rounded-xl bg-brand text-[17px] font-semibold text-white disabled:opacity-60">
            {busy ?? (existing ? "Salvar alterações" : "Salvar e próximo")}
          </button>
          {!existing && (
            <button type="button" onClick={() => save("voltar")} disabled={Boolean(busy)} className="h-11 w-full text-[15px] font-semibold text-brand disabled:opacity-60">
              Salvar e voltar ao ambiente
            </button>
          )}
        </div>
      )}
    </div>
  );
}
