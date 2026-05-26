"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LayoutTemplate, Loader2 } from "lucide-react";

async function lerRespostaApi(response: Response) {
  try {
    return await response.json();
  } catch {
    return {};
  }
}

export default function CriarTemplateCategoriaButton() {
  const router = useRouter();
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState("");

  async function criarTemplate() {
    setErro("");
    setSalvando(true);

    try {
      const response = await fetch(
        "/api/configuracoes/loja/paginas/template-categoria-padrao",
        {
          method: "POST",
        }
      );

      const data = await lerRespostaApi(response);

      if (!response.ok) {
        setErro(data.error || "Erro ao criar template.");
        return;
      }

      const paginaId = data?.pagina?.id;

      router.refresh();

      if (paginaId) {
        router.push(`/configuracoes/loja/paginas/${paginaId}`);
      }
    } catch {
      setErro("Erro ao criar template.");
    } finally {
      setSalvando(false);
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <button
        type="button"
        onClick={criarTemplate}
        disabled={salvando}
        className="inline-flex items-center justify-center gap-2 rounded-2xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {salvando ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <LayoutTemplate className="h-4 w-4" />
        )}
        {salvando ? "Criando..." : "Criar template padrão de categoria"}
      </button>

      {erro && (
        <p className="max-w-xs text-xs font-medium leading-5 text-red-600">
          {erro}
        </p>
      )}
    </div>
  );
}