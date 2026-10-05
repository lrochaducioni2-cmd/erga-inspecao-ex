"use client";

import { useEffect, useMemo, useState } from "react";
import { useField } from "@/components/field/use-field";
import { FieldEquipmentForm } from "@/components/field/field-equipment-form";
import { LocalPhoto, ServerPhoto } from "@/components/field/photos";
import { addArea, removeProject } from "@/lib/field/store";
import { describeOp, discardOp, downloadProject } from "@/lib/field/sync";
import type { FieldProject } from "@/lib/field/types";
import { ZONE_LABELS, ZONE_VALUES } from "@/lib/inventory-rules";
import { PROJECT_TYPE_LABELS, formatPi, inspectionTag } from "@/lib/projects";

// Navegação pelo "#" da URL: funciona sem internet e o gesto de voltar do
// iPhone volta uma tela. Formatos: #/p/<projeto>, #/p/<p>/a/<ambiente>,
// #/p/<p>/a/<a>/e/novo, #/p/<p>/a/<a>/e/<equipamento>.
type View =
  | { name: "home" }
  | { name: "project"; projectId: string }
  | { name: "area"; projectId: string; areaId: string }
  | { name: "equipment"; projectId: string; areaId: string; equipmentId: string | null };

function parseHash(hash: string): View {
  const parts = hash.replace(/^#\/?/, "").split("/").filter(Boolean);
  const [, projectId, , areaId, , eq] = parts;
  if (parts[0] !== "p" || !projectId) return { name: "home" };
  if (parts[2] !== "a" || !areaId) return { name: "project", projectId };
  if (parts[4] !== "e" || !eq) return { name: "area", projectId, areaId };
  return { name: "equipment", projectId, areaId, equipmentId: eq === "novo" ? null : eq };
}

export function go(hash: string) {
  window.location.hash = hash;
}

export function FieldApp() {
  const field = useField();
  const [view, setView] = useState<View>({ name: "home" });

  useEffect(() => {
    const onHash = () => {
      setView(parseHash(window.location.hash));
      window.scrollTo(0, 0);
    };
    onHash();
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);

  const project = useMemo(
    () => (view.name === "home" ? undefined : field.projects?.find((p) => p.id === view.projectId)),
    [field.projects, view],
  );

  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-10 bg-brand text-white">
        <div className="mx-auto flex max-w-2xl items-center gap-3 px-4 py-3">
          {view.name !== "home" ? (
            <button onClick={() => history.back()} aria-label="Voltar" className="-ml-2 flex h-11 w-11 items-center justify-center rounded-lg hover:bg-white/10">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M15 18l-6-6 6-6" /></svg>
            </button>
          ) : (
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent text-sm font-bold text-ink">Ex</span>
          )}
          <div className="min-w-0 flex-1">
            <div className="truncate text-base font-bold">{project ? project.title : "Modo campo"}</div>
            <div className="truncate text-xs opacity-85">{project ? `${formatPi(project.pi)} · ${project.clientName}` : "Funciona sem internet"}</div>
          </div>
        </div>
        <SyncBar field={field} />
      </header>

      <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-5">
        {field.projects === null ? (
          <p className="text-muted">Carregando…</p>
        ) : view.name === "home" ? (
          <Home field={field} />
        ) : !project ? (
          <MissingProject projectId={view.projectId} field={field} />
        ) : view.name === "project" ? (
          <ProjectView project={project} afterChange={field.afterChange} />
        ) : view.name === "area" ? (
          <AreaView project={project} areaId={view.areaId} />
        ) : (
          <FieldEquipmentForm
            key={`${view.areaId}/${view.equipmentId ?? "novo"}`}
            project={project}
            areaId={view.areaId}
            equipmentId={view.equipmentId}
            afterChange={field.afterChange}
          />
        )}
      </main>
    </div>
  );
}

type Field = ReturnType<typeof useField>;

function SyncBar({ field }: { field: Field }) {
  const pending = field.queue.length;
  const result = field.lastResult;
  const failedOp = result?.status === "error" ? field.queue.find((op) => op.seq === result.op.seq) : undefined;

  let tone = "bg-ok-soft text-ok";
  let text = "Tudo enviado";
  if (!field.online) {
    tone = "bg-accent text-ink";
    text = pending ? `Sem internet · ${pending} ${pending === 1 ? "item aguardando" : "itens aguardando"} envio` : "Sem internet · nada pendente";
  } else if (field.syncing && pending > 0) {
    tone = "bg-brand-soft text-brand";
    text = `Enviando ${pending} ${pending === 1 ? "item" : "itens"}…`;
  } else if (pending) {
    tone = "bg-accent text-ink";
    text = `${pending} ${pending === 1 ? "item aguardando" : "itens aguardando"} envio`;
  }

  return (
    <div className={`${tone}`}>
      <div className="mx-auto flex max-w-2xl items-center gap-2 px-4 py-2 text-sm font-semibold" role="status">
        <span className="flex-1">{text}</span>
        {field.online && pending > 0 && !field.syncing && (
          <button onClick={() => field.sync()} className="h-9 rounded-lg bg-white/70 px-3 text-sm font-semibold text-ink">
            Enviar agora
          </button>
        )}
      </div>
      {result?.status === "auth" && (
        <div className="mx-auto max-w-2xl px-4 pb-2 text-sm">
          {result.message}{" "}
          <a href="/login" className="font-bold underline">
            Entrar
          </a>
        </div>
      )}
      {failedOp && result?.status === "error" && (
        <div className="mx-auto max-w-2xl space-y-2 px-4 pb-3 text-sm">
          <p>
            <strong>Não enviado:</strong> {describeOp(failedOp)} — {result.message}
          </p>
          <button
            onClick={async () => {
              if (!confirm(`Descartar “${describeOp(failedOp)}” e o que depende dele? Isso não pode ser desfeito.`)) return;
              await discardOp(failedOp);
              field.setLastResult(null);
              await field.afterChange();
            }}
            className="h-9 rounded-lg bg-white px-3 font-semibold text-nc"
          >
            Descartar este item
          </button>
        </div>
      )}
    </div>
  );
}

type Remote = { id: string; pi: number; title: string; type: string; clientName: string; _count: { equipment: number } };

function Home({ field }: { field: Field }) {
  const [remote, setRemote] = useState<Remote[] | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Lista do servidor: só com internet.
  useEffect(() => {
    if (!field.online) return;
    let alive = true;
    fetch("/api/campo/projetos", { cache: "no-store" })
      .then((res) => (res.ok ? res.json() : null))
      .then((data: Remote[] | null) => {
        if (alive && data) setRemote(data);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [field.online]);

  async function download(id: string) {
    setBusy(id);
    setError(null);
    try {
      await downloadProject(id);
      await field.reload();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(null);
    }
  }

  async function remove(p: FieldProject) {
    if (!confirm(`Remover “${p.title}” deste aparelho? Os dados continuam no servidor.`)) return;
    try {
      await removeProject(p.id);
      await field.reload();
    } catch (e) {
      setError((e as Error).message);
    }
  }

  const local = field.projects ?? [];
  const available = (remote ?? []).filter((r) => !local.some((l) => l.id === r.id));

  return (
    <div className="space-y-6">
      {error && <p className="rounded-xl border border-nc bg-nc-soft px-4 py-3 text-[15px] text-nc-ink">{error}</p>}

      <section className="space-y-2">
        <h2 className="text-lg font-bold">No aparelho</h2>
        {local.length === 0 && (
          <p className="text-[15px] text-muted">Nenhum projeto baixado. Baixe abaixo, com internet, antes de ir a campo.</p>
        )}
        {local.map((p) => {
          const pending = field.queue.filter((op) => op.projectId === p.id).length;
          return (
            <div key={p.id} className="rounded-2xl border border-line bg-white">
              <a href={`#/p/${p.id}`} className="block px-4 py-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-mono text-sm text-muted">{formatPi(p.pi)}</span>
                  {pending > 0 && (
                    <span className="rounded-lg bg-accent-soft px-2 py-0.5 text-xs font-semibold text-accent-ink">{pending} aguardando envio</span>
                  )}
                </div>
                <div className="text-base font-bold">{p.title}</div>
                <div className="text-sm text-muted">
                  {p.clientName} · {p.areas.length} ambientes · {p.equipment.length} equipamentos
                </div>
              </a>
              <div className="flex gap-2 border-t border-line px-4 py-2">
                {field.online && (
                  <button onClick={() => download(p.id)} disabled={busy === p.id} className="h-10 px-2 text-sm font-semibold text-brand disabled:opacity-60">
                    {busy === p.id ? "Atualizando…" : "Atualizar do servidor"}
                  </button>
                )}
                <button onClick={() => remove(p)} className="ml-auto h-10 px-2 text-sm font-semibold text-nc">
                  Remover do aparelho
                </button>
              </div>
            </div>
          );
        })}
      </section>

      <section className="space-y-2">
        <h2 className="text-lg font-bold">Baixar para o campo</h2>
        {!field.online ? (
          <p className="text-[15px] text-muted">Conecte-se à internet para baixar projetos.</p>
        ) : remote === null ? (
          <p className="text-[15px] text-muted">Carregando projetos…</p>
        ) : available.length === 0 ? (
          <p className="text-[15px] text-muted">Todos os projetos abertos já estão no aparelho.</p>
        ) : (
          available.map((r) => (
            <div key={r.id} className="flex items-center gap-3 rounded-2xl border border-line bg-white px-4 py-3">
              <div className="min-w-0 flex-1">
                <div className="font-mono text-sm text-muted">{formatPi(r.pi)} · {PROJECT_TYPE_LABELS[r.type]}</div>
                <div className="truncate text-base font-semibold">{r.title}</div>
                <div className="truncate text-sm text-muted">{r.clientName}</div>
              </div>
              <button
                onClick={() => download(r.id)}
                disabled={busy === r.id}
                className="h-11 shrink-0 rounded-xl bg-brand px-4 text-[15px] font-semibold text-white disabled:opacity-60"
              >
                {busy === r.id ? "Baixando…" : "Baixar"}
              </button>
            </div>
          ))
        )}
      </section>

      <p className="text-center text-sm">
        {/* Link comum de propósito: sai do modo campo (que funciona sem internet) para o sistema completo. */}
        {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
        <a href="/projetos" className="font-semibold text-brand underline">
          Abrir sistema completo (precisa de internet)
        </a>
      </p>
    </div>
  );
}

function MissingProject({ projectId, field }: { projectId: string; field: Field }) {
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  return (
    <div className="space-y-3">
      <p className="text-[15px]">Este projeto ainda não está no aparelho.</p>
      {field.online ? (
        <button
          disabled={busy}
          onClick={async () => {
            setBusy(true);
            try {
              await downloadProject(projectId);
              await field.reload();
            } catch (e) {
              setError((e as Error).message);
            } finally {
              setBusy(false);
            }
          }}
          className="h-12 rounded-xl bg-brand px-5 text-base font-semibold text-white disabled:opacity-60"
        >
          {busy ? "Baixando…" : "Baixar para o campo"}
        </button>
      ) : (
        <p className="text-[15px] text-muted">Conecte-se à internet para baixá-lo.</p>
      )}
      {error && <p className="text-sm text-nc">{error}</p>}
    </div>
  );
}

function ProjectView({ project, afterChange }: { project: FieldProject; afterChange: () => Promise<void> }) {
  const [name, setName] = useState("");
  const [zone, setZone] = useState("ZONA_1");
  const [busy, setBusy] = useState(false);
  const locked = project.status === "EMITIDO";

  async function add(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!name.trim()) return;
    setBusy(true);
    const id = await addArea(project.id, { name: name.trim(), zone, notes: null });
    setBusy(false);
    setName("");
    await afterChange();
    go(`#/p/${project.id}/a/${id}`);
  }

  return (
    <div className="space-y-5">
      <h2 className="text-lg font-bold">Ambientes / pontos de liberação</h2>
      {project.areas.length === 0 && <p className="text-[15px] text-muted">Nenhum ambiente ainda.</p>}
      <ul className="space-y-2">
        {project.areas.map((a) => {
          const eqs = project.equipment.filter((e) => e.areaId === a.id);
          const naoEx = eqs.filter((e) => !e.isEx).length;
          return (
            <li key={a.id}>
              <a href={`#/p/${project.id}/a/${a.id}`} className="flex min-h-16 items-center gap-3 rounded-2xl border border-line bg-white px-4 py-3">
                <div className="min-w-0 flex-1">
                  <div className="text-base font-semibold">{a.name}</div>
                  <div className="text-sm text-muted">
                    {eqs.length === 0 ? (
                      <span className="font-semibold text-brand">Toque para cadastrar equipamentos</span>
                    ) : (
                      <>
                        {eqs.length} equipamento{eqs.length === 1 ? "" : "s"}
                        {naoEx > 0 && <span className="font-semibold text-nc"> · {naoEx} Não Ex</span>}
                      </>
                    )}
                  </div>
                  {a.pending && <div className="text-xs font-semibold text-accent-ink">aguardando envio</div>}
                </div>
                <span className="shrink-0 rounded-lg bg-brand-soft px-2.5 py-1 text-xs font-semibold text-brand">{ZONE_LABELS[a.zone]}</span>
              </a>
            </li>
          );
        })}
      </ul>

      {!locked && (
        <form onSubmit={add} className="space-y-3 rounded-2xl border border-dashed border-line bg-white p-4">
          <label className="block text-sm font-semibold">
            Novo ambiente / ponto de liberação
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex.: Casa de bombas"
              className="mt-1 h-12 w-full rounded-xl border border-line bg-white px-4 text-base focus:border-brand focus:outline-none"
            />
          </label>
          <div className="flex flex-wrap gap-2" role="group" aria-label="Zona">
            {ZONE_VALUES.map((z) => (
              <button
                key={z}
                type="button"
                aria-pressed={zone === z}
                onClick={() => setZone(z)}
                className={`h-11 rounded-full border px-4 text-sm font-semibold ${zone === z ? "border-brand bg-brand text-white" : "border-line bg-white"}`}
              >
                {ZONE_LABELS[z]}
              </button>
            ))}
          </div>
          <button type="submit" disabled={busy || !name.trim()} className="h-12 rounded-xl bg-brand px-5 text-base font-semibold text-white disabled:opacity-50">
            Adicionar ambiente
          </button>
        </form>
      )}
    </div>
  );
}

function AreaView({ project, areaId }: { project: FieldProject; areaId: string }) {
  const area = project.areas.find((a) => a.id === areaId);
  if (!area) return <p className="text-muted">Ambiente não encontrado neste aparelho.</p>;
  const eqs = project.equipment.filter((e) => e.areaId === areaId);
  const locked = project.status === "EMITIDO";

  return (
    <div className="space-y-4 pb-24">
      <div className="flex flex-wrap items-center gap-2">
        <h2 className="text-2xl font-bold">{area.name}</h2>
        <span className="rounded-lg bg-brand-soft px-2.5 py-1 text-xs font-semibold text-brand">{ZONE_LABELS[area.zone]}</span>
      </div>
      {eqs.length === 0 && <p className="text-[15px] text-muted">Nenhum equipamento ainda. Toque em “Novo equipamento”.</p>}
      <ul className="space-y-2">
        {eqs.map((eq) => (
          <li key={eq.id}>
            <a href={`#/p/${project.id}/a/${areaId}/e/${eq.id}`} className="flex items-center gap-3 rounded-2xl border border-line bg-white p-3">
              {eq.localPhotoIds[0] ? (
                <LocalPhoto id={eq.localPhotoIds[0]} className="h-16 w-16 shrink-0 rounded-xl" />
              ) : eq.photoIds[0] ? (
                <ServerPhoto id={eq.photoIds[0]} className="h-16 w-16 shrink-0 rounded-xl" />
              ) : (
                <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-xl bg-line/60 text-xs text-muted">sem foto</div>
              )}
              <div className="min-w-0 flex-1">
                <div className="truncate text-base font-semibold">
                  {eq.name}
                  {eq.quantity > 1 && <span className="font-normal text-muted"> × {eq.quantity}</span>}
                </div>
                <div className="truncate font-mono text-xs text-muted">
                  {eq.item ? inspectionTag(project.pi, eq.item) : "nº definido ao enviar"}
                </div>
                {eq.pending && <div className="text-xs font-semibold text-accent-ink">aguardando envio</div>}
              </div>
              <span className={`shrink-0 rounded-lg px-2.5 py-1 text-sm font-bold ${eq.isEx ? "bg-brand-soft text-brand" : "bg-nc-soft text-nc-ink"}`}>
                {eq.isEx ? "Ex" : "Não Ex"}
              </span>
            </a>
          </li>
        ))}
      </ul>
      {!locked && (
        <div className="fixed inset-x-0 bottom-0 border-t border-line bg-ground/95 px-4 pb-5 pt-3 backdrop-blur">
          <div className="mx-auto max-w-2xl">
            <a
              href={`#/p/${project.id}/a/${areaId}/e/novo`}
              className="flex h-14 w-full items-center justify-center rounded-xl bg-brand text-[17px] font-semibold text-white"
            >
              + Novo equipamento
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
