"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ZONE_LABELS, ZONE_VALUES } from "@/lib/inventory-rules";

/** Criar (sem `area`) ou editar um ambiente / ponto de liberação. */
export function AreaForm({
  projectId,
  area,
  onDone,
}: {
  projectId: string;
  area?: { id: string; name: string; zone: string; notes: string | null };
  onDone?: () => void;
}) {
  const router = useRouter();
  const [name, setName] = useState(area?.name ?? "");
  const [zone, setZone] = useState(area?.zone ?? "ZONA_1");
  const [notes, setNotes] = useState(area?.notes ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    const res = await fetch(area ? `/api/ambientes/${area.id}` : `/api/projetos/${projectId}/ambientes`, {
      method: area ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, zone, notes }),
    });
    setBusy(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError((data as { error?: string }).error ?? "Não foi possível salvar o ambiente.");
      return;
    }
    if (!area) {
      // Novo ambiente: entra direto nele para cadastrar os equipamentos.
      const created = (await res.json().catch(() => ({}))) as { id?: string };
      if (created.id) {
        router.push(`/projetos/${projectId}/ambientes/${created.id}`);
        return;
      }
    }
    router.refresh();
    onDone?.();
  }

  return (
    <form onSubmit={submit} className="space-y-3">
      <label className="block text-sm font-semibold">
        {area ? "Nome do ambiente" : "Novo ambiente / ponto de liberação"}
        <input
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Ex.: Casa de bombas"
          className="mt-1 h-12 w-full rounded-xl border border-line bg-white px-4 text-base focus:border-brand focus:outline-none"
        />
      </label>
      <fieldset>
        <legend className="text-sm font-semibold">Zona</legend>
        <div className="mt-1 flex flex-wrap gap-2">
          {ZONE_VALUES.map((value) => (
            <button
              key={value}
              type="button"
              aria-pressed={zone === value}
              onClick={() => setZone(value)}
              className={`h-11 rounded-full border px-4 text-sm font-semibold ${
                zone === value ? "border-brand bg-brand text-white" : "border-line bg-white"
              }`}
            >
              {ZONE_LABELS[value]}
            </button>
          ))}
        </div>
      </fieldset>
      <label className="block text-sm font-semibold">
        Observação (opcional)
        <input
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Fonte de liberação, substância..."
          className="mt-1 h-12 w-full rounded-xl border border-line bg-white px-4 text-base focus:border-brand focus:outline-none"
        />
      </label>
      {error && <p className="text-sm font-medium text-nc">{error}</p>}
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={busy || !name.trim()}
          className="h-12 rounded-xl bg-brand px-5 text-base font-semibold text-white hover:bg-brand-dark disabled:opacity-50"
        >
          {busy ? "Salvando..." : area ? "Salvar" : "Adicionar ambiente"}
        </button>
        {onDone && area && (
          <button type="button" onClick={onDone} className="h-12 rounded-xl px-4 text-base font-semibold text-brand">
            Cancelar
          </button>
        )}
      </div>
    </form>
  );
}
