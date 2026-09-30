import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { UsuariosClient } from "@/components/usuarios-client";

export default async function UsuariosPage() {
  const me = await getCurrentUser();
  if (me?.role !== "ADMIN") notFound();

  const users = await prisma.user.findMany({
    orderBy: [{ active: "desc" }, { name: "asc" }],
    select: { id: true, name: true, email: true, role: true, active: true },
  });

  return <UsuariosClient users={users} meId={me.id} />;
}
