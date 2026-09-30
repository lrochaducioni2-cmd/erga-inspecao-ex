import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { jsonError, parseBody, requireAdmin } from "@/lib/api";
import { createUserSchema } from "@/lib/validation";

export async function POST(request: Request) {
  const auth = await requireAdmin();
  if (auth.error) return auth.error;

  const parsed = await parseBody(request, createUserSchema);
  if (parsed.error) return parsed.error;
  const { name, email, password, role } = parsed.data;

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) return jsonError("Já existe um usuário com este e-mail.", 409);

  const user = await prisma.user.create({
    data: { name, email, role, password: await bcrypt.hash(password, 10) },
    select: { id: true, name: true, email: true, role: true, active: true },
  });
  return NextResponse.json(user, { status: 201 });
}
