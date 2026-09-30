// Primeiro acesso: com o banco vazio (recém-publicado), a primeira pessoa
// que informar o código de instalação (SETUP_CODE, definido na hospedagem)
// cria o administrador — sem precisar de computador nem de linha de comando.
// Depois que existe qualquer usuário, a tela deixa de existir.

import { timingSafeEqual } from "node:crypto";
import { connection } from "next/server";
import { prisma } from "@/lib/prisma";

export async function hasAnyUser(): Promise<boolean> {
  // Consulta a cada acesso, nunca no build: publicado com o banco vazio, um
  // /login pré-renderizado ficaria preso redirecionando para o primeiro acesso.
  await connection();
  return (await prisma.user.count()) > 0;
}

export function isSetupCodeConfigured(): boolean {
  return Boolean(process.env.SETUP_CODE?.trim());
}

export function checkSetupCode(value: string): boolean {
  const expected = process.env.SETUP_CODE?.trim();
  if (!expected) return false;
  const a = Buffer.from(value.trim());
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}
