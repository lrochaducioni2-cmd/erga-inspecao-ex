import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/api";

// Projetos que podem ser levados para o campo (emitidos ficam de fora).
export async function GET() {
  const auth = await requireUser();
  if (auth.error) return auth.error;

  const projects = await prisma.project.findMany({
    where: { status: { not: "EMITIDO" } },
    orderBy: { updatedAt: "desc" },
    select: {
      id: true,
      pi: true,
      title: true,
      type: true,
      clientName: true,
      status: true,
      _count: { select: { equipment: true } },
    },
  });
  return NextResponse.json(projects);
}
