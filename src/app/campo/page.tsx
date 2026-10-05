import type { Metadata } from "next";
import { FieldApp } from "@/components/field/field-app";

export const metadata: Metadata = { title: "Modo campo · Inspeção Ex" };

// Tela estática: o service worker guarda uma cópia e ela abre sem internet.
// Todos os dados vêm do banco local do aparelho (src/lib/field).
export default function CampoPage() {
  return <FieldApp />;
}
