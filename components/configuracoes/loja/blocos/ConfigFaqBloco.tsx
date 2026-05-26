"use client";

import { Plus, Trash2 } from "lucide-react";

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
    return [
      {
        pergunta: "Qual é o prazo de envio?",
        resposta: "O prazo pode variar conforme o endereço e a forma de envio.",
      },
      {
        pergunta: "Posso trocar meu produto?",
        resposta:
          "Sim. Consulte a política de troca ou entre em contato com nosso atendimento.",
      },
    ];
  }

  return value.map((item) => {
    const itemConfig = asConfig(item);

    return {
      pergunta: getString(itemConfig, "pergunta"),
      resposta: getString(itemConfig, "resposta"),
    };
  });
}

function setConfigValue(
  config: Record<string, unknown>,
  key: string,
  value: unknown
) {
  return {
    ...config,
    [key]: value,
  };
}

function Campo({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-medium text-slate-700">
        {label}
      </span>

      {children}
    </label>
  );
}

function InputBase(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={`h-11 w-full rounded-2xl border border-slate-200 px-3 text-sm outline-none focus:border-slate-400 ${
        props.className || ""
      }`}
    />
  );
}

function TextareaBase(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      {...props}
      className={`w-full rounded-2xl border border-slate-200 px-3 py-3 text-sm leading-6 outline-none focus:border-slate-400 ${
        props.className || ""
      }`}
    />
  );
}

function SelectBase(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      {...props}
      className={`h-11 w-full rounded-2xl border border-slate-200 px-3 text-sm outline-none focus:border-slate-400 ${
        props.className || ""
      }`}
    />
  );
}

export default function ConfigFaqBloco({
  config,
  onSave,
}: {
  config: Record<string, unknown>;
  onSave: (config: Record<string, unknown>) => void;
}) {
  const itens = getFaqItens(config);

  function atualizarItem(index: number, campo: keyof FaqItem, valor: string) {
    const novosItens = itens.map((item, itemIndex) =>
      itemIndex === index
        ? {
            ...item,
            [campo]: valor,
          }
        : item
    );

    onSave(setConfigValue(config, "itens", novosItens));
  }

  function adicionarItem() {
    onSave(
      setConfigValue(config, "itens", [
        ...itens,
        {
          pergunta: "Nova pergunta",
          resposta: "Resposta da pergunta.",
        },
      ])
    );
  }

  function removerItem(index: number) {
    onSave(
      setConfigValue(
        config,
        "itens",
        itens.filter((_, itemIndex) => itemIndex !== index)
      )
    );
  }

  return (
    <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
      <p className="text-sm font-semibold text-slate-900">
        Configurações do FAQ
      </p>

      <p className="mt-1 text-xs leading-5 text-slate-500">
        Use este bloco para perguntas frequentes em categorias, páginas gerais,
        campanhas e landing pages.
      </p>

      <div className="mt-4 grid gap-4">
        <Campo label="Título">
          <InputBase
            defaultValue={getString(config, "titulo", "Perguntas frequentes")}
            onBlur={(event) =>
              onSave(setConfigValue(config, "titulo", event.target.value))
            }
          />
        </Campo>

        <Campo label="Descrição">
          <TextareaBase
            rows={3}
            defaultValue={getString(config, "descricao")}
            placeholder="Texto opcional acima das perguntas."
            onBlur={(event) =>
              onSave(setConfigValue(config, "descricao", event.target.value))
            }
          />
        </Campo>

        <div className="grid gap-4 md:grid-cols-4">
          <Campo label="Estilo">
            <SelectBase
              defaultValue={getString(config, "estilo", "ACORDEAO")}
              onChange={(event) =>
                onSave(setConfigValue(config, "estilo", event.target.value))
              }
            >
              <option value="ACORDEAO">Acordeão</option>
              <option value="LISTA">Lista aberta</option>
            </SelectBase>
          </Campo>

          <Campo label="Alinhamento">
            <SelectBase
              defaultValue={getString(config, "alinhamento", "CENTRO")}
              onChange={(event) =>
                onSave(setConfigValue(config, "alinhamento", event.target.value))
              }
            >
              <option value="ESQUERDA">Esquerda</option>
              <option value="CENTRO">Centro</option>
              <option value="DIREITA">Direita</option>
            </SelectBase>
          </Campo>

          <Campo label="Fundo">
            <SelectBase
              defaultValue={getString(config, "fundo", "BRANCO")}
              onChange={(event) =>
                onSave(setConfigValue(config, "fundo", event.target.value))
              }
            >
              <option value="BRANCO">Branco</option>
              <option value="AZUL_CLARO">Azul claro</option>
              <option value="AZUL_ESCURO">Azul escuro</option>
              <option value="ESCURO">Escuro</option>
            </SelectBase>
          </Campo>

          <Campo label="Espaçamento">
            <SelectBase
              defaultValue={getString(config, "espacamento", "MEDIO")}
              onChange={(event) =>
                onSave(
                  setConfigValue(config, "espacamento", event.target.value)
                )
              }
            >
              <option value="PEQUENO">Pequeno</option>
              <option value="MEDIO">Médio</option>
              <option value="GRANDE">Grande</option>
            </SelectBase>
          </Campo>
        </div>

        <Campo label="Largura">
          <SelectBase
            defaultValue={getString(config, "largura", "NORMAL")}
            onChange={(event) =>
              onSave(setConfigValue(config, "largura", event.target.value))
            }
          >
            <option value="ESTREITA">Estreita</option>
            <option value="NORMAL">Normal</option>
            <option value="LARGA">Larga</option>
          </SelectBase>
        </Campo>

        <div className="rounded-2xl border border-slate-200 bg-white p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-slate-900">
                Perguntas e respostas
              </p>

              <p className="mt-1 text-xs leading-5 text-slate-500">
                Adicione quantas perguntas forem necessárias.
              </p>
            </div>

            <button
              type="button"
              onClick={adicionarItem}
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-slate-950 px-3 py-2 text-xs font-semibold text-white transition hover:bg-slate-800"
            >
              <Plus className="h-4 w-4" />
              Adicionar
            </button>
          </div>

          <div className="mt-4 space-y-4">
            {itens.map((item, index) => (
              <div
                key={`faq-${index}`}
                className="rounded-2xl border border-slate-200 bg-slate-50 p-4"
              >
                <div className="mb-3 flex items-center justify-between gap-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Pergunta {index + 1}
                  </p>

                  <button
                    type="button"
                    onClick={() => removerItem(index)}
                    className="inline-flex items-center justify-center gap-1 rounded-xl border border-red-200 bg-red-50 px-2 py-1 text-xs font-semibold text-red-700 transition hover:bg-red-100"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    Remover
                  </button>
                </div>

                <div className="grid gap-3">
                  <Campo label="Pergunta">
                    <InputBase
                      value={item.pergunta}
                      onChange={(event) =>
                        atualizarItem(index, "pergunta", event.target.value)
                      }
                    />
                  </Campo>

                  <Campo label="Resposta">
                    <TextareaBase
                      rows={4}
                      value={item.resposta}
                      onChange={(event) =>
                        atualizarItem(index, "resposta", event.target.value)
                      }
                    />
                  </Campo>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}