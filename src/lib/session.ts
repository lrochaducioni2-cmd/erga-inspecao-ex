import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/** Id do usuário logado, ou null se não houver sessão. */
export async function getCurrentUserId(): Promise<string | null> {
  const session = await getServerSession(authOptions);
  return session?.user?.id ?? null;
}

/**
 * Usuário logado lido do banco (não do token), para que desativar um
 * usuário ou mudar seu papel valha na hora, sem esperar a sessão expirar.
 */
export async function getCurrentUser() {
  const id = await getCurrentUserId();
  if (!id) return null;
  const user = await prisma.user.findUnique({
    where: { id },
    select: { id: true, name: true, email: true, role: true, active: true },
  });
  return user?.active ? user : null;
}
