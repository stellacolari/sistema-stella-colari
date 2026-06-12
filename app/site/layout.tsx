import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Editor do site | Plataforma Stella Colari",
};

export default function SiteEditorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
