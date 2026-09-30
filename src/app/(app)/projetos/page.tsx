import Link from "next/link";

// Fase 1: base pronta. Criação de projetos (Inventário / Inspeção Ex) chega
// na Fase 2 — ver ROTEIRO.md.
export default function ProjetosPage() {
  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-bold">Projetos</h1>
      <div className="rounded-2xl border border-line bg-white p-6">
        <p className="text-base font-semibold">Nenhum projeto ainda.</p>
        <p className="mt-2 text-[15px] leading-relaxed text-muted">
          A criação de projetos de <strong>Inventário</strong> e <strong>Inspeção Ex</strong> é a próxima etapa.
          Enquanto isso, confira se os clientes do CRMEx estão chegando em{" "}
          <Link href="/clientes" className="font-semibold text-brand underline">
            Clientes
          </Link>
          .
        </p>
      </div>
    </div>
  );
}
