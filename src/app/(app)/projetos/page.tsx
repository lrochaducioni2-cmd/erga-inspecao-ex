import Link from "next/link";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { GRADE_LABELS, PROJECT_TYPE_LABELS, STATUS_BADGE, STATUS_FLOW, STATUS_LABELS, formatPi } from "@/lib/projects";

type Props = { searchParams: Promise<{ q?: string | string[]; status?: string | string[] }> };

const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v)?.trim() ?? "";

export default async function ProjetosPage({ searchParams }: Props) {
  const params = await searchParams;
  const q = first(params.q);
  const status = STATUS_FLOW.find((s) => s === first(params.status));

  const piMatch = q.replace(/^pi/i, "").match(/^\d+$/);
  const where: Prisma.ProjectWhereInput = {
    ...(status && { status }),
    ...(q && {
      OR: [
        { title: { contains: q, mode: "insensitive" } },
        { clientName: { contains: q, mode: "insensitive" } },
        ...(piMatch ? [{ pi: Number(piMatch[0]) }] : []),
      ],
    }),
  };

  const projects = await prisma.project.findMany({ where, orderBy: { updatedAt: "desc" } });

  const filterHref = (s?: string) => {
    const search = new URLSearchParams();
    if (q) search.set("q", q);
    if (s) search.set("status", s);
    const qs = search.toString();
    return qs ? `/projetos?${qs}` : "/projetos";
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">Projetos</h1>
        <Link
          href="/projetos/novo"
          className="flex h-12 items-center rounded-xl bg-brand px-5 text-base font-semibold text-white hover:bg-brand-dark"
        >
          + Novo projeto
        </Link>
      </div>

      <form method="get" role="search" className="flex gap-2">
        {status && <input type="hidden" name="status" value={status} />}
        <label htmlFor="q" className="sr-only">
          Buscar projeto
        </label>
        <input
          id="q"
          name="q"
          defaultValue={q}
          placeholder="PI, título ou cliente"
          className="h-12 min-w-0 flex-1 rounded-xl border border-line bg-white px-4 text-base focus:border-brand focus:outline-none"
        />
        <button className="h-12 shrink-0 rounded-xl border border-brand px-5 text-base font-semibold text-brand">
          Buscar
        </button>
      </form>

      <nav aria-label="Filtrar por status" className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
        {[undefined, ...STATUS_FLOW].map((s) => {
          const active = s === status;
          return (
            <Link
              key={s ?? "todos"}
              href={filterHref(s)}
              aria-current={active ? "page" : undefined}
              className={`flex h-10 shrink-0 items-center rounded-full border px-4 text-sm font-semibold ${
                active ? "border-brand bg-brand text-white" : "border-line bg-white"
              }`}
            >
              {s ? STATUS_LABELS[s] : "Todos"}
            </Link>
          );
        })}
      </nav>

      {projects.length === 0 ? (
        <div className="rounded-2xl border border-line bg-white p-6 text-[15px] text-muted">
          {q || status ? "Nenhum projeto encontrado com esses filtros." : "Nenhum projeto ainda. Toque em “+ Novo projeto” para começar."}
        </div>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2">
          {projects.map((p) => (
            <li key={p.id}>
              <Link
                href={`/projetos/${p.id}`}
                className="flex h-full flex-col gap-2 rounded-2xl border border-line bg-white p-4 hover:border-brand"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-mono text-sm text-muted">{formatPi(p.pi)}</span>
                  <span className={`rounded-lg px-2.5 py-1 text-xs font-semibold ${STATUS_BADGE[p.status]}`}>
                    {STATUS_LABELS[p.status]}
                  </span>
                </div>
                <span className="text-base font-bold leading-snug">{p.title}</span>
                <span className="text-sm text-muted">
                  {p.clientName}
                  {!p.crmEmpresaId && " · provisório"}
                </span>
                <span className="text-sm font-semibold text-brand">
                  {PROJECT_TYPE_LABELS[p.type]}
                  {p.grade && ` · ${GRADE_LABELS[p.grade]}`}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
