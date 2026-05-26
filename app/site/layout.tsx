import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Editor do site | Sistema Stella",
};

export default function SiteEditorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}