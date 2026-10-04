"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { PhotoThumb } from "@/components/photo-thumb";
import { EQUIPMENT_SUGGESTIONS, recommendedAction } from "@/lib/inventory-rules";
import { compressImage, uploadImage, type CompressedImage } from "@/lib/image-compress";

type Area = { id: string; name: string };
type Pending = CompressedImage & { preview: string };

export type EquipmentInitial = {
  id: string;
  areaId: string;
  name: string;
  isEx: boolean;
  quantity: number;
  clientTag: string | null;
  notes: string | null;
  photos: { id: string }[];
};

/**
 * Cadastro de equipamento pensado para o campo: foto primeiro, "É Ex?" em
 * botões grandes, sugestões de nome e plano de ação mostrado na hora.
 * Novo: as fotos ficam no aparelho até salvar. Edição: cada foto nova é
 * enviada assim que tirada.
 */
export function EquipmentForm({
  projectId,
  areaId,
  areas,
  initial,
  locked = false,
}: {
  projectId: string;
  areaId: string;
  areas: Area[];
  initial?: EquipmentInitial;
  locked?: boolean;
}) {
  const router = useRouter();
  const fileInput = useRef<HTMLInputElement>(null);
  const isEditing = Boolean(initial);

  const [area, setArea] = useState(initial?.areaId ?? areaId);
  const [name, setName] = useState(initial?.name ?? "");
  const [isEx, setIsEx] = useState<boolean | null>(initial?.isEx ?? null);
  const [quantity, setQuantity] = useState(initial?.quantity ?? 1);
  const [clientTag, setClientTag] = useState(initial?.clientTag ?? "");
  const [notes, setNotes] = useState(initial?.notes ?? "");
  const [pending, setPending] = useState<Pending[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [savedMessage, setSavedMessage] = useState<string | null>(null);

  // Prévias locais (object URLs): liberadas ao remover a foto ou ao sair da tela.
  const previews = useRef(new Set<string>());
  useEffect(() => {
    const urls = previews.current;
    return () => urls.forEach((url) => URL.revokeObjectURL(url));
  }, []);
  const addPending = (image: CompressedImage) => {
    const preview = URL.createObjectURL(image.blob);
    previews.current.add(preview);
    setPending((list) => [...list, { ...image, preview }]);
  };
  const clearPending = (items: Pending[]) => {
    items.forEach((p) => {
      URL.revokeObjectURL(p.preview);
      previews.current.delete(p.preview);
    });
    setPending((list) => list.filter((p) => !items.includes(p)));
  };

  async function onFiles(files: FileList | null) {
    if (!files?.length) return;
    setError(null);
    setBusy("Processando foto...");
    try {
      for (const file of Array.from(files)) {
        const image = await compressImage(file);
        if (isEditing && initial) {
          setBusy("Enviando foto...");
          const err = await uploadImage(`/api/equipamentos/${initial.id}/fotos`, image);
          if (err) throw new Error(err);
        } else {
          addPending(image);
        }
      }
      if (isEditing) router.refresh();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(null);
      if (fileInput.current) fileInput.current.value = "";
    }
  }

  async function deletePhoto(photoId: string) {
    if (!confirm("Excluir esta foto?")) return;
    setBusy("Excluindo foto...");
    const res = await fetch(`/api/fotos/${photoId}`, { method: "DELETE" });
    setBusy(null);
    if (!res.ok) setError("Não foi possível excluir a foto.");
    router.refresh();
  }

  async function save(next: "novo" | "voltar") {
    setError(null);
    setSavedMessage(null);
    if (isEx === null) return setError("Diga se o equipamento é Ex ou Não Ex.");
    if (!name.trim()) return setError("Informe o equipamento.");

    setBusy("Salvando...");
    const payload = { areaId: area, name, isEx, quantity, clientTag, notes };
    const res = await fetch(isEditing ? `/api/equipamentos/${initial!.id}` : `/api/projetos/${projectId}/equipamentos`, {
      method: isEditing ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = (await res.json().catch(() => ({}))) as { id?: string; item?: number; error?: string };
    if (!res.ok || !data.id) {
      setBusy(null);
      return setError(data.error ?? "Não foi possível salvar o equipamento.");
    }

    // Novo: sobe as fotos que estavam no aparelho.
    for (let i = 0; i < pending.length; i++) {
      setBusy(`Enviando foto ${i + 1} de ${pending.length}...`);
      const err = await uploadImage(`/api/equipamentos/${data.id}/fotos`, pending[i]);
      if (err) {
        setBusy(null);
        clearPending(pending);
        // O equipamento já existe: leva para a edição, onde dá para reenviar a foto.
        router.push(`/projetos/${projectId}/equipamentos/${data.id}?erroFoto=1`);
        return;
      }
    }
    setBusy(null);

    if (isEditing || next === "voltar") {
      router.push(`/projetos/${projectId}/ambientes/${area}`);
      router.refresh();
      return;
    }
    // "Salvar e próximo": limpa o formulário mantendo ambiente e quantidade padrão.
    setSavedMessage(`Item ${data.item} salvo: ${name.trim()}.`);
    setName("");
    setIsEx(null);
    setQuantity(1);
    setClientTag("");
    setNotes("");
    clearPending(pending);
    router.refresh();
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function remove() {
    if (!initial || !confirm(`Excluir “${initial.name}” e as fotos dele?`)) return;
    setBusy("Excluindo...");
    const res = await fetch(`/api/equipamentos/${initial.id}`, { method: "DELETE" });
    setBusy(null);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      return setError((data as { error?: string }).error ?? "Não foi possível excluir.");
    }
    router.push(`/projetos/${projectId}/ambientes/${initial.areaId}`);
    router.refresh();
  }

  const input = "mt-1 h-12 w-full rounded-xl border border-line bg-white px-4 text-base focus:border-brand focus:outline-none";
  const photoCount = (initial?.photos.length ?? 0) + pending.length;

  return (
    <div className="space-y-6 pb-4">
      {savedMessage && (
        <p role="status" className="rounded-xl bg-ok-soft px-4 py-3 text-[15px] font-semibold text-ok">
          ✓ {savedMessage} Pode cadastrar o próximo.
        </p>
      )}

      <section className="space-y-2">
        <h2 className="text-sm font-semibold">1. Fotos do equipamento</h2>
        <div className="flex flex-wrap gap-2">
          {initial?.photos.map((p) => (
            <div key={p.id} className="relative">
              <PhotoThumb id={p.id} alt="Foto do equipamento" className="h-24 w-24 rounded-xl" />
              {!locked && (
                <button
                  type="button"
                  onClick={() => deletePhoto(p.id)}
                  aria-label="Excluir foto"
                  className="absolute -right-2 -top-2 flex h-8 w-8 items-center justify-center rounded-full bg-nc text-lg font-bold text-white"
                >
                  ×
                </button>
              )}
            </div>
          ))}
          {pending.map((p, i) => (
            <div key={p.preview} className="relative">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={p.preview} alt={`Foto ${i + 1} (ainda não enviada)`} className="h-24 w-24 rounded-xl object-cover" />
              <button
                type="button"
                onClick={() => clearPending([p])}
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
        {/* capture abre a câmera direto no celular; no computador abre o seletor de arquivos. */}
        <input
          ref={fileInput}
          type="file"
          accept="image/*"
          capture="environment"
          multiple
          className="hidden"
          onChange={(e) => onFiles(e.target.files)}
        />
      </section>

      <fieldset className="space-y-2" disabled={locked}>
        <legend className="text-sm font-semibold">2. É equipamento Ex (certificado)?</legend>
        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            aria-pressed={isEx === true}
            onClick={() => setIsEx(true)}
            className={`h-16 rounded-xl border-2 border-brand text-[17px] font-bold ${
              isEx === true ? "bg-brand text-white" : "bg-white text-brand"
            }`}
          >
            Sim, é Ex
          </button>
          <button
            type="button"
            aria-pressed={isEx === false}
            onClick={() => setIsEx(false)}
            className={`h-16 rounded-xl border-2 border-nc text-[17px] font-bold ${
              isEx === false ? "bg-nc text-white" : "bg-white text-nc"
            }`}
          >
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
            <button
              key={s}
              type="button"
              onClick={() => setName(s)}
              className="h-10 rounded-full border border-line bg-white px-4 text-sm"
            >
              {s}
            </button>
          ))}
        </div>
      </fieldset>

      <fieldset className="grid grid-cols-[auto_1fr] gap-4" disabled={locked}>
        <div>
          <span className="block text-sm font-semibold" id="qtd-label">
            Quantidade
          </span>
          <div className="mt-1 flex items-center" role="group" aria-labelledby="qtd-label">
            <button
              type="button"
              onClick={() => setQuantity((q) => Math.max(1, q - 1))}
              aria-label="Diminuir quantidade"
              className="h-12 w-12 rounded-l-xl border border-line bg-white text-xl font-bold"
            >
              −
            </button>
            <input
              inputMode="numeric"
              value={quantity}
              onChange={(e) => setQuantity(Math.max(1, Number(e.target.value.replace(/\D/g, "")) || 1))}
              aria-label="Quantidade"
              className="h-12 w-14 border-y border-line bg-white text-center text-base"
            />
            <button
              type="button"
              onClick={() => setQuantity((q) => q + 1)}
              aria-label="Aumentar quantidade"
              className="h-12 w-12 rounded-r-xl border border-line bg-white text-xl font-bold"
            >
              +
            </button>
          </div>
        </div>
        <label className="block text-sm font-semibold">
          TAG do cliente (opcional)
          <input value={clientTag} onChange={(e) => setClientTag(e.target.value)} className={input} />
        </label>
      </fieldset>

      {areas.length > 1 && (
        <label className="block text-sm font-semibold">
          Ambiente
          <select value={area} onChange={(e) => setArea(e.target.value)} disabled={locked} className={input}>
            {areas.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </select>
        </label>
      )}

      <label className="block text-sm font-semibold">
        4. Observação
        <textarea
          rows={3}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          disabled={locked}
          placeholder="Digite ou dite pelo microfone do teclado"
          className="mt-1 w-full rounded-xl border border-line bg-white px-4 py-3 text-base focus:border-brand focus:outline-none"
        />
      </label>

      {isEx !== null && (
        <div className={`rounded-xl px-4 py-3 ${isEx ? "bg-brand-soft text-brand" : "bg-nc-soft text-nc-ink"}`}>
          <div className="text-xs font-semibold uppercase tracking-wide">Plano de ação</div>
          <div className="text-base font-bold">{recommendedAction(isEx)}</div>
        </div>
      )}

      {error && <p className="rounded-xl border border-nc bg-nc-soft px-4 py-3 text-[15px] text-nc-ink">{error}</p>}

      {!locked && (
        <div className="sticky bottom-0 -mx-4 space-y-2 border-t border-line bg-ground/95 px-4 pb-4 pt-3 backdrop-blur sm:static sm:mx-0 sm:border-0 sm:bg-transparent sm:p-0">
          <button
            type="button"
            onClick={() => save(isEditing ? "voltar" : "novo")}
            disabled={Boolean(busy)}
            className="h-14 w-full rounded-xl bg-brand text-[17px] font-semibold text-white hover:bg-brand-dark disabled:opacity-60"
          >
            {busy ?? (isEditing ? "Salvar alterações" : "Salvar e próximo")}
          </button>
          {!isEditing && (
            <button
              type="button"
              onClick={() => save("voltar")}
              disabled={Boolean(busy)}
              className="h-11 w-full text-[15px] font-semibold text-brand disabled:opacity-60"
            >
              Salvar e voltar ao ambiente
            </button>
          )}
          {isEditing && (
            <button type="button" onClick={remove} disabled={Boolean(busy)} className="h-11 w-full text-[15px] font-semibold text-nc">
              Excluir equipamento
            </button>
          )}
        </div>
      )}
    </div>
  );
}
