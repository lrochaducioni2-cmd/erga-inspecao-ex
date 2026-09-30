import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { jsonError, parseBody, requireAdmin } from "@/lib/api";
import { updateUserSchema } from "@/lib/validation";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: Params) {
  const auth = await requireAdmin();
  if (auth.error) return auth.error;

  const { id } = await params;
  const target = await prisma.user.findUnique({ where: { id } });
  if (!target) return jsonError("Usuário não encontrado.", 404);

  const parsed = await parseBody(request, updateUserSchema);
  if (parsed.error) return parsed.error;
  const { active, role, password } = parsed.data;

  // O administrador não pode se trancar para fora do sistema.
  if (id === auth.user.id && (active === false || role === "INSPETOR")) {
    return jsonError("Você não pode desativar nem rebaixar o seu próprio usuário.", 409);
  }

  const user = await prisma.user.update({
    where: { id },
    data: {
      ...(active !== undefined && { active }),
      ...(role !== undefined && { role }),
      ...(password !== undefined && { password: await bcrypt.hash(password, 10) }),
    },
    select: { id: true, name: true, email: true, role: true, active: true },
  });
  return NextResponse.json(user);
}
