"use client";

export function PrintButton() {
  return (
    <button
      onClick={() => window.print()}
      className="h-12 rounded-xl bg-brand px-5 text-base font-semibold text-white hover:bg-brand-dark print:hidden"
    >
      Gerar PDF / Imprimir
    </button>
  );
}
