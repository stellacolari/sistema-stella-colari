"use client";

import { useEffect, useMemo, useState } from "react";
import { ExternalLink, LinkIcon, Search, X } from "lucide-react";

export type LinkSugestaoItem = {
  tipo: string;
  grupo: string;
  titulo: string;
  subtitulo: string;
  href: string;
};

type LinkSugestoesInputProps = {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  label?: string;
  ajuda?: string;
};

function normalizarTexto(value: string | null | undefined) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

export default function LinkSugestoesInput({
  value,
  onChange,
  placeholder = "/loja/descontos ou https://...",
  label = "Link",
  ajuda = "Busque links existentes ou digite um link personalizado.",
}: LinkSugestoesInputProps) {
  const [busca, setBusca] = useState("");
  const [links, setLinks] = useState<LinkSugestaoItem[]>([]);
  const [aberto, setAberto] = useState(false);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState("");

  useEffect(() => {
    let ativo = true;

    async function carregarLinks() {
      setCarregando(true);
      setErro("");

      try {
        const response = await fetch("/api/configuracoes/loja/links-sugestoes");
        const data = await response.json().catch(() => ({}));

        if (!ativo) return;

        if (!response.ok) {
          setErro(data.error || "Erro ao carregar sugestões.");
          return;
        }

        setLinks(Array.isArray(data.links) ? data.links : []);
      } catch {
        if (ativo) {
          setErro("Erro ao carregar sugestões.");
        }
      } finally {
        if (ativo) {
          setCarregando(false);
        }
      }
    }

    void carregarLinks();

    return () => {
      ativo = false;
    };
  }, []);

  const sugestoesFiltradas = useMemo(() => {
    const termo = normalizarTexto(busca || value);

    if (!termo) {
      return links.slice(0, 16);
    }

    return links
      .filter((link) => {
        const texto = normalizarTexto(
          [link.titulo, link.subtitulo, link.href, link.grupo, link.tipo].join(
            " "
          )
        );

        return texto.includes(termo);
      })
      .slice(0, 24);
  }, [busca, links, value]);

  const grupos = useMemo(() => {
    const mapa = new Map<string, LinkSugestaoItem[]>();

    sugestoesFiltradas.forEach((link) => {
      const lista = mapa.get(link.grupo) || [];
      lista.push(link);
      mapa.set(link.grupo, lista);
    });

    return Array.from(mapa.entries());
  }, [sugestoesFiltradas]);

  function selecionar(link: LinkSugestaoItem) {
    onChange(link.href);
    setBusca("");
    setAberto(false);
  }

  return (
    <div className="relative">
      <label className="block">
        <span className="mb-2 block text-sm font-medium text-slate-700">
          {label}
        </span>

        <div className="grid gap-2">
          <div className="grid grid-cols-[1fr_auto] gap-2">
            <input
              value={value}
              onChange={(event) => {
                onChange(event.target.value);
                setBusca(event.target.value);
                setAberto(true);
              }}
              onFocus={() => setAberto(true)}
              placeholder={placeholder}
              className="h-11 w-full rounded-2xl border border-slate-200 px-3 text-sm outline-none focus:border-slate-400"
            />

            <button
              type="button"
              onClick={() => {
                setBusca(value);
                setAberto((current) => !current);
              }}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              <Search className="h-4 w-4" />
              Buscar
            </button>
          </div>

          {ajuda && <p className="text-xs leading-5 text-slate-500">{ajuda}</p>}
        </div>
      </label>

      {aberto && (
        <div className="absolute left-0 right-0 top-full z-50 mt-2 max-h-96 overflow-y-auto rounded-2xl border border-slate-200 bg-white p-3 shadow-2xl">
          <div className="mb-3 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
              <LinkIcon className="h-4 w-4" />
              Sugestões de links
            </div>

            <button
              type="button"
              onClick={() => setAberto(false)}
              className="flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 text-slate-500 transition hover:bg-slate-50 hover:text-slate-950"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {carregando && (
            <div className="rounded-xl bg-slate-50 px-4 py-3 text-sm text-slate-500">
              Carregando sugestões...
            </div>
          )}

          {erro && (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {erro}
            </div>
          )}

          {!carregando && !erro && grupos.length === 0 && (
            <div className="rounded-xl bg-slate-50 px-4 py-3 text-sm text-slate-500">
              Nenhuma sugestão encontrada. Você pode manter o link digitado
              manualmente.
            </div>
          )}

          <div className="space-y-4">
            {grupos.map(([grupo, itens]) => (
              <div key={grupo}>
                <p className="mb-2 px-1 text-xs font-semibold uppercase tracking-wide text-slate-400">
                  {grupo}
                </p>

                <div className="overflow-hidden rounded-xl border border-slate-100">
                  {itens.map((link) => (
                    <button
                      key={`${link.tipo}-${link.href}`}
                      type="button"
                      onClick={() => selecionar(link)}
                      className="grid w-full grid-cols-[1fr_auto] gap-3 border-b border-slate-100 px-4 py-3 text-left transition last:border-b-0 hover:bg-slate-50"
                    >
                      <span>
                        <span className="block text-sm font-semibold text-slate-950">
                          {link.titulo}
                        </span>

                        <span className="mt-1 block text-xs text-slate-500">
                          {link.subtitulo}
                        </span>

                        <span className="mt-1 block break-all text-xs font-medium text-slate-700">
                          {link.href}
                        </span>
                      </span>

                      <ExternalLink className="mt-1 h-4 w-4 text-slate-300" />
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <div className="mt-3 rounded-xl bg-slate-50 px-4 py-3 text-xs leading-5 text-slate-500">
            Não encontrou? Feche a busca e deixe o link personalizado digitado no
            campo.
          </div>
        </div>
      )}
    </div>
  );
}