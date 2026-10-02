import { NextResponse } from "next/server";
import type { z } from "zod";
import { getCurrentUser } from "@/lib/session";

export function jsonError(error: string, status: number) {
  return NextResponse.json({ error }, { status });
}

/** Usuário logado e ativo, ou a resposta de erro pronta. */
export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) return { error: jsonError("Não autenticado.", 401) } as const;
  return { user } as const;
}

/** Usuário logado e ativo com papel ADMIN, ou a resposta de erro pronta. */
export async function requireAdmin() {
  const user = await getCurrentUser();
  if (!user) return { error: jsonError("Não autenticado.", 401) } as const;
  if (user.role !== "ADMIN") return { error: jsonError("Acesso restrito ao administrador.", 403) } as const;
  return { user } as const;
}

/** Lê e valida o corpo JSON; em caso de erro devolve a resposta 400. */
export async function parseBody<T extends z.ZodType>(request: Request, schema: T) {
  const body = await request.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    const first = parsed.error.issues[0]?.message ?? "Dados inválidos.";
    return { error: jsonError(first, 400) } as const;
  }
  return { data: parsed.data as z.infer<T> } as const;
}
