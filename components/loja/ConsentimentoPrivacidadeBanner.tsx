"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ShieldCheck, SlidersHorizontal, X } from "lucide-react";
import {
  CATEGORIAS_CONSENTIMENTO,
  CONSENTIMENTO_ABRIR_EVENTO,
  CONSENTIMENTO_ATUALIZADO_EVENTO,
  PREFERENCIAS_PADRAO,
  aceitarSomenteEssenciais,
  aceitarTodosConsentimentos,
  assinarEventoPrivacidade,
  lerConsentimentoPrivacidade,
  resetarConsentimentoPrivacidade,
  salvarConsentimentoPrivacidade,
  type CategoriaConsentimento,
  type PreferenciasConsentimento,
} from "@/lib/loja/consentimento-privacidade";

type ModoBanner = "resumo" | "preferencias";

export default function ConsentimentoPrivacidadeBanner() {
  const [montado, setMontado] = useState(false);
  const [aberto, setAberto] = useState(false);
  const [modo, setModo] = useState<ModoBanner>("resumo");
  const [preferencias, setPreferencias] =
    useState<PreferenciasConsentimento>(PREFERENCIAS_PADRAO);

  function carregar() {
    const consentimento = lerConsentimentoPrivacidade();

    setPreferencias(consentimento.preferencias);
    setAberto(!consentimento.escolhido);
    setModo(consentimento.escolhido ? "preferencias" : "resumo");
  }

  useEffect(() => {
    setMontado(true);
    carregar();

    const removerAbrir = assinarEventoPrivacidade(CONSENTIMENTO_ABRIR_EVENTO, () => {
      const consentimento = lerConsentimentoPrivacidade();
      setPreferencias(consentimento.preferencias);
      setModo("preferencias");
      setAberto(true);
    });
    const removerAtualizacao = assinarEventoPrivacidade(
      CONSENTIMENTO_ATUALIZADO_EVENTO,
      carregar
    );

    return () => {
      removerAbrir();
      removerAtualizacao();
    };
  }, []);

  if (!montado || !aberto) {
    return null;
  }

  function fecharSeJaEscolheu() {
    const consentimento = lerConsentimentoPrivacidade();

    if (consentimento.escolhido) {
      setAberto(false);
    }
  }

  function aceitarTodos() {
    const consentimento = aceitarTodosConsentimentos();
    setPreferencias(consentimento.preferencias);
    setAberto(false);
  }

  function somenteEssenciais() {
    const consentimento = aceitarSomenteEssenciais();
    setPreferencias(consentimento.preferencias);
    setAberto(false);
  }

  function alternarCategoria(categoria: CategoriaConsentimento) {
    if (categoria === "ESSENCIAL") return;

    setPreferencias((current) => ({
      ...current,
      [categoria]: !current[categoria],
      ESSENCIAL: true,
    }));
  }

  function salvarPreferencias() {
    const consentimento = salvarConsentimentoPrivacidade(preferencias);
    setPreferencias(consentimento.preferencias);
    setAberto(false);
  }

  function redefinir() {
    resetarConsentimentoPrivacidade();
    setPreferencias(PREFERENCIAS_PADRAO);
    setModo("resumo");
    setAberto(true);
  }

  return (
    <div className="fixed inset-x-0 bottom-0 z-[80] px-3 pb-3 sm:px-5 sm:pb-5">
      <section className="mx-auto max-w-5xl rounded-2xl border border-slate-200 bg-white/95 p-4 shadow-2xl shadow-slate-950/10 backdrop-blur sm:p-5">
        <div className="flex items-start gap-3">
          <div className="hidden h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-700 sm:flex">
            {modo === "preferencias" ? (
              <SlidersHorizontal className="h-5 w-5" />
            ) : (
              <ShieldCheck className="h-5 w-5" />
            )}
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-slate-950">
                  Privacidade na loja
                </p>
                <p className="mt-1 text-sm leading-6 text-slate-600">
                  Usamos recursos essenciais para a compra e, com sua escolha,
                  sinais de experiencia para melhorar busca, favoritos e funil.
                </p>
              </div>

              <button
                type="button"
                onClick={fecharSeJaEscolheu}
                className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
                aria-label="Fechar preferencias de privacidade"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {modo === "preferencias" && (
              <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                {CATEGORIAS_CONSENTIMENTO.map((categoria) => {
                  const ativo = preferencias[categoria.id];

                  return (
                    <label
                      key={categoria.id}
                      className={`rounded-xl border px-3 py-3 text-sm ${
                        ativo
                          ? "border-slate-900 bg-slate-50"
                          : "border-slate-200 bg-white"
                      }`}
                    >
                      <span className="flex items-center justify-between gap-3">
                        <span className="font-semibold text-slate-950">
                          {categoria.titulo}
                        </span>
                        <input
                          type="checkbox"
                          checked={ativo}
                          disabled={categoria.obrigatoria}
                          onChange={() => alternarCategoria(categoria.id)}
                          className="h-4 w-4 accent-slate-950"
                        />
                      </span>
                      <span className="mt-2 block text-xs leading-5 text-slate-500">
                        {categoria.descricao}
                      </span>
                    </label>
                  );
                })}
              </div>
            )}

            <div className="mt-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <Link
                href="/loja/politica-de-privacidade"
                className="text-xs font-semibold text-slate-500 underline-offset-4 transition hover:text-slate-900 hover:underline"
              >
                Ver Politica de Privacidade
              </Link>

              {modo === "resumo" ? (
                <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
                  <button
                    type="button"
                    onClick={somenteEssenciais}
                    className="inline-flex min-h-10 items-center justify-center rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                  >
                    Somente essenciais
                  </button>
                  <button
                    type="button"
                    onClick={() => setModo("preferencias")}
                    className="inline-flex min-h-10 items-center justify-center rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                  >
                    Personalizar
                  </button>
                  <button
                    type="button"
                    onClick={aceitarTodos}
                    className="inline-flex min-h-10 items-center justify-center rounded-full bg-slate-950 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
                  >
                    Aceitar todos
                  </button>
                </div>
              ) : (
                <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
                  <button
                    type="button"
                    onClick={redefinir}
                    className="inline-flex min-h-10 items-center justify-center rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-500 transition hover:bg-slate-50 hover:text-slate-800"
                  >
                    Redefinir escolha
                  </button>
                  <button
                    type="button"
                    onClick={somenteEssenciais}
                    className="inline-flex min-h-10 items-center justify-center rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                  >
                    Somente essenciais
                  </button>
                  <button
                    type="button"
                    onClick={salvarPreferencias}
                    className="inline-flex min-h-10 items-center justify-center rounded-full bg-slate-950 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
                  >
                    Salvar preferencias
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
