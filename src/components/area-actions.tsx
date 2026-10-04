"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AreaForm } from "@/components/area-form";

export function AreaActions({
  projectId,
  area,
  equipmentCount,
}: {
  projectId: string;
  area: { id: string; name: string; zone: string; notes: string | null };
  equipmentCount: number;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function remove() {
    if (!confirm(`Excluir o ambiente “${area.name}”?`)) return;
    const res = await fetch(`/api/ambientes/${area.id}`, { method: "DELETE" });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError((data as { error?: string }).error ?? "Não foi possível excluir.");
      return;
    }
    router.push(`/projetos/${projectId}`);
    router.refresh();
  }

  if (editing) {
    return (
      <div className="rounded-2xl border border-line bg-white p-4">
        <AreaForm projectId={projectId} area={area} onDone={() => setEditing(false)} />
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <button
        onClick={() => setEditing(true)}
        className="h-10 rounded-xl border border-line px-4 text-[15px] font-semibold hover:border-brand"
      >
        Editar ambiente
      </button>
      {equipmentCount === 0 && (
        <button onClick={remove} className="h-10 px-2 text-[15px] font-semibold text-nc">
          Excluir
        </button>
      )}
      {error && <p className="w-full text-sm text-nc">{error}</p>}
    </div>
  );
}
