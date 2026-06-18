import type { Metadata } from "next";
import { exigirAdminComPermissao } from "@/lib/auth/admin";
import MidiaBibliotecaClient from "@/components/configuracoes/loja/MidiaBibliotecaClient";

export const metadata: Metadata = {
  title: "Biblioteca de Midia | Stella Colari",
};

export const dynamic = "force-dynamic";

export default async function BibliotecaMidiaPage() {
  await exigirAdminComPermissao("lojaOnline", "ver");

  return <MidiaBibliotecaClient />;
}
