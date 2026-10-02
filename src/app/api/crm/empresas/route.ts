import { NextResponse } from "next/server";
import { requireUser } from "@/lib/api";
import { CrmError, empresaLabel, isCrmConfigured, listEmpresas } from "@/lib/crm-client";

// Busca de clientes do CRMEx para o formulário de projeto. A chamada ao
// CRMEx é feita aqui no servidor: o token nunca chega ao navegador.
export async function GET(request: Request) {
  const auth = await requireUser();
  if (auth.error) return auth.error;

  if (!isCrmConfigured()) {
    return NextResponse.json({ configured: false, empresas: [] });
  }

  const busca = new URL(request.url).searchParams.get("busca") ?? "";
  try {
    const empresas = await listEmpresas(busca);
    return NextResponse.json({
      configured: true,
      empresas: empresas.slice(0, 20).map((e) => ({ id: e.id, label: empresaLabel(e), cnpj: e.cnpj })),
    });
  } catch (error) {
    const message = error instanceof CrmError ? error.message : "Erro inesperado ao consultar o CRMEx.";
    if (!(error instanceof CrmError)) console.error(error);
    return NextResponse.json({ configured: true, empresas: [], error: message }, { status: 502 });
  }
}
