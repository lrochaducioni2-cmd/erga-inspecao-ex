import { redirect } from "next/navigation";
import { FirstAccessForm } from "@/components/first-access-form";
import { hasAnyUser, isSetupCodeConfigured } from "@/lib/first-access";

export default async function PrimeiroAcessoPage() {
  if (await hasAnyUser()) redirect("/login");
  return <FirstAccessForm configured={isSetupCodeConfigured()} />;
}
