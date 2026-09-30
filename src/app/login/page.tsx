import { redirect } from "next/navigation";
import { LoginForm } from "@/components/login-form";
import { hasAnyUser } from "@/lib/first-access";

// Sistema recém-publicado (nenhum usuário ainda): vai para o primeiro acesso.
export default async function LoginPage() {
  if (!(await hasAnyUser())) redirect("/primeiro-acesso");
  return <LoginForm />;
}
