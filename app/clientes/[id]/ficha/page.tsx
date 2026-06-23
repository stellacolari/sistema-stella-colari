import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Ficha360Cliente from "@/components/clientes/Ficha360Cliente";
import { exigirAdminComPermissao } from "@/lib/auth/admin";
import { obterFicha360Cliente } from "@/lib/clientes/ficha-360";

export const metadata: Metadata = {
  title: "Ficha 360 do cliente | Plataforma Stella Colari",
};

export const dynamic = "force-dynamic";

export default async function Ficha360ClientePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  await exigirAdminComPermissao("clientes", "ver");

  const ficha = await obterFicha360Cliente(id);

  if (!ficha) {
    notFound();
  }

  return <Ficha360Cliente ficha={ficha} />;
}
