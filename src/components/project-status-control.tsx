"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { STATUS_FLOW, STATUS_LABELS } from "@/lib/projects";

const ADMIN_ONLY = new Set(["APROVADO", "EMITIDO"]);

export function ProjectStatusControl({
  projectId,
  status,
  isAdmin,
}: {
  projectId: string;
  status: string;
  isAdmin: boolean;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const index = STATUS_FLOW.indexOf(status as (typeof STATUS_FLOW)[number]);
  const next = STATUS_FLOW[index + 1];
  const prev = index > 0 ? STATUS_FLOW[index - 1] : undefined;
  const canMove = (target?: string) => target && (isAdmin || (!ADMIN_ONLY.has(target) && !ADMIN_ONLY.has(status)));

  async function move(target: string) {
    setBusy(true);
    setError(null);
    const res = await fetch(`/api/projetos/${projectId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: target }),
    });
    setBusy(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError((data as { error?: string }).error ?? "Não foi possível mudar o status.");
      return;
    }
    router.refresh();
  }

  return (
    <section className="rounded-2xl border border-line bg-white p-5">
      <h2 className="text-base font-bold">Etapa do projeto</h2>
      <ol className="mt-3 grid grid-cols-5 gap-1" aria-label="Etapas">
        {STATUS_FLOW.map((s, i) => (
          <li key={s} className="flex flex-col gap-1.5" aria-current={s === status ? "step" : undefined}>
            <span className={`h-2 rounded-full ${i <= index ? "bg-brand" : "bg-line"}`} />
            <span className={`text-[11px] leading-tight sm:text-xs ${s === status ? "font-bold text-brand" : "text-muted"}`}>
              {STATUS_LABELS[s]}
            </span>
          </li>
        ))}
      </ol>

      <div className="mt-4 flex flex-col gap-2 sm:flex-row">
        {next && canMove(next) && (
          <button
            onClick={() => move(next)}
            disabled={busy}
            className="h-12 rounded-xl bg-brand px-5 text-base font-semibold text-white hover:bg-brand-dark disabled:opacity-60"
          >
            Avançar para “{STATUS_LABELS[next]}”
          </button>
        )}
        {prev && canMove(prev) && (
          <button
            onClick={() => move(prev)}
            disabled={busy}
            className="h-12 rounded-xl border border-line px-5 text-base font-semibold hover:border-brand disabled:opacity-60"
          >
            Voltar para “{STATUS_LABELS[prev]}”
          </button>
        )}
      </div>
      {next && !canMove(next) && (
        <p className="mt-3 text-sm text-muted">Aguardando o administrador para “{STATUS_LABELS[next]}”.</p>
      )}
      {error && <p className="mt-3 text-sm font-medium text-nc">{error}</p>}
    </section>
  );
}
