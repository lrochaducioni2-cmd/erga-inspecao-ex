import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { jsonError, parseBody } from "@/lib/api";
import { checkSetupCode, isSetupCodeConfigured } from "@/lib/first-access";
import { firstAccessSchema } from "@/lib/validation";

export async function POST(request: Request) {
  if (!isSetupCodeConfigured()) {
    return jsonError("Código de instalação não configurado (defina SETUP_CODE na hospedagem).", 503);
  }

  const parsed = await parseBody(request, firstAccessSchema);
  if (parsed.error) return parsed.error;
  const { name, email, password, setupCode } = parsed.data;

  if (!checkSetupCode(setupCode)) return jsonError("Código de instalação incorreto.", 403);

  const hash = await bcrypt.hash(password, 10);
  try {
    // Serializable: duas tentativas simultâneas não criam dois administradores.
    await prisma.$transaction(
      async (tx) => {
        if ((await tx.user.count()) > 0) throw new AlreadySetUp();
        await tx.user.create({ data: { name, email, password: hash, role: "ADMIN" } });
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
  } catch (error) {
    const conflict =
      error instanceof AlreadySetUp ||
      (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2034");
    if (conflict) return jsonError("O sistema já tem administrador. Entre pela tela de login.", 409);
    throw error;
  }

  return NextResponse.json({ ok: true }, { status: 201 });
}

class AlreadySetUp extends Error {}
