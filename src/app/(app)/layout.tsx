import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { AppHeader } from "@/components/app-header";
import { getCurrentUser } from "@/lib/session";

export default async function AppLayout({ children }: { children: ReactNode }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const links = [
    { href: "/projetos", label: "Projetos" },
    { href: "/clientes", label: "Clientes" },
    ...(user.role === "ADMIN" ? [{ href: "/usuarios", label: "Usuários" }] : []),
  ];

  return (
    <div className="flex min-h-screen flex-col">
      <AppHeader userName={user.name} links={links} />
      <main className="flex-1">
        <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6">{children}</div>
      </main>
    </div>
  );
}
