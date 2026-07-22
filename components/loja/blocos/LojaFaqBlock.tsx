"use client";

import { useState } from "react";
import { ChevronDown, HelpCircle } from "lucide-react";

type FaqItem = {
  pergunta: string;
  resposta: string;
};

function asConfig(value: unknown): Record<string, unknown> {
  if (typeof value === "object" && value !== null && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }

  return {};
}

function getString(config: Record<string, unknown>, key: string, fallback = "") {
  const value = config[key];

  if (typeof value === "string") {
    return value;
  }

  return fallback;
}

function getFaqItens(config: Record<string, unknown>) {
  const value = config.itens;

  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item) => {
      const itemConfig = asConfig(item);

      return {
        pergunta: getString(itemConfig, "pergunta").trim(),
        resposta: getString(itemConfig, "resposta").trim(),
      };
    })
    .filter((item) => item.pergunta && item.resposta);
}

function getAlignClass(alinhamento: string) {
  if (alinhamento === "ESQUERDA") return "text-left";
  if (alinhamento === "DIREITA") return "text-right";
  return "text-center";
}

function getEspacamentoClass(espacamento: string) {
  if (espacamento === "PEQUENO") return "py-8";
  if (espacamento === "GRANDE") return "py-20";
  return "py-12";
}

function getFundoClasses(fundo: string) {
  if (fundo === "AZUL_CLARO") {
    return {
      section: "bg-[var(--brand-blue-soft)]",
      card: "bg-white border-slate-200",
      title: "text-slate-950",
      text: "text-slate-600",
    };
  }
  if (fundo === "AZUL_ESCURO") {
    return {
      section: "bg-[#2e7b99]",
      card: "bg-white/10 border-white/15",
      title: "text-white",
      text: "text-white/80",
    };
  }
  if (fundo === "ESCURO") {
    return {
      section: "bg-[#5D8CC8]",
      card: "bg-white/35 border-[#0f172a]/10",
      title: "text-[#0f172a]",
      text: "text-[#0f172a]/75",
    };
  }

  return {
    section: "bg-white",
    card: "bg-white border-slate-200",
    title: "text-slate-950",
    text: "text-slate-600",
  };
}

function FaqAccordionItem({
  item,
  index,
  aberto,
  onToggle,
  classes,
}: {
  item: FaqItem;
  index: number;
  aberto: boolean;
  onToggle: () => void;
  classes: ReturnType<typeof getFundoClasses>;
}) {
  return (
    <div className={`rounded-2xl border ${classes.card}`}>
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left"
      >
        <span className={`text-sm font-semibold md:text-base ${classes.title}`}>
          {index + 1}. {item.pergunta}
        </span>

        <ChevronDown
          className={`h-5 w-5 shrink-0 transition ${
            aberto ? "rotate-180" : ""
          } ${classes.text}`}
        />
      </button>

      {aberto && (
        <div className="px-5 pb-5">
          <p
            className={`whitespace-pre-line text-sm font-medium leading-7 ${classes.text}`}
          >
            {item.resposta}
          </p>
        </div>
      )}
    </div>
  );
}

export default function LojaFaqBlock({
  config,
}: {
  config: Record<string, unknown>;
}) {
  const titulo = getString(config, "titulo", "Perguntas frequentes");
  const descricao = getString(config, "descricao");
  const alinhamento = getString(config, "alinhamento", "CENTRO");
  const fundo = getString(config, "fundo", "BRANCO");
  const espacamento = getString(config, "espacamento", "MEDIO");
  const estilo = getString(config, "estilo", "ACORDEAO");
  const largura = getString(config, "largura", "NORMAL");
  const itens = getFaqItens(config);

  const [itemAberto, setItemAberto] = useState<number | null>(0);

  if (itens.length === 0) {
    return null;
  }

  const classes = getFundoClasses(fundo);

  const larguraClass =
    largura === "LARGA"
      ? "max-w-6xl"
      : largura === "ESTREITA"
      ? "max-w-3xl"
      : "max-w-4xl";

  return (
    <section className={classes.section}>
      <div
        className={`mx-auto ${larguraClass} px-5 sm:px-6 lg:px-8 ${getEspacamentoClass(
          espacamento
        )}`}
      >
        <div className={getAlignClass(alinhamento)}>
          <div className="inline-flex items-center justify-center gap-2 rounded-full bg-white/80 px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] brand-text ring-1 ring-slate-200">
            <HelpCircle className="h-4 w-4" />
            FAQ
          </div>

          {titulo && (
            <h2
              className={`mt-4 text-2xl font-semibold tracking-tight md:text-4xl ${classes.title}`}
            >
              {titulo}
            </h2>
          )}

          {descricao && (
            <p
              className={`mx-auto mt-3 max-w-2xl whitespace-pre-line text-sm font-medium leading-7 md:text-base ${classes.text}`}
            >
              {descricao}
            </p>
          )}
        </div>

        <div className="mt-8 space-y-3">
          {itens.map((item, index) => {
            if (estilo === "LISTA") {
              return (
                <div
                  key={`${item.pergunta}-${index}`}
                  className={`rounded-2xl border px-5 py-4 ${classes.card}`}
                >
                  <h3 className={`text-sm font-semibold ${classes.title}`}>
                    {item.pergunta}
                  </h3>

                  <p
                    className={`mt-2 whitespace-pre-line text-sm font-medium leading-7 ${classes.text}`}
                  >
                    {item.resposta}
                  </p>
                </div>
              );
            }

            return (
              <FaqAccordionItem
                key={`${item.pergunta}-${index}`}
                item={item}
                index={index}
                aberto={itemAberto === index}
                onToggle={() =>
                  setItemAberto((current) => (current === index ? null : index))
                }
                classes={classes}
              />
            );
          })}
        </div>
      </div>
    </section>
  );
}
