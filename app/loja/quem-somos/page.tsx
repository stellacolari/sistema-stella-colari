import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { criarMetadataLoja } from "@/lib/loja/seo";

export const metadata: Metadata = criarMetadataLoja({
  title: "Quem somos | Stella Colari",
  description: "Conheca a loja online Stella Colari e sua proposta.",
  path: "/loja/quem-somos",
  robots: {
    index: false,
    follow: false,
  },
});

export default function QuemSomosPage() {
  notFound();
}
