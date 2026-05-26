"use client";

type ConfigFormularioBlocoProps = {
  config: Record<string, unknown>;
  onSave: (config: Record<string, unknown>) => void;
};

function getString(config: Record<string, unknown>, key: string, fallback = "") {
  const value = config[key];

  if (typeof value === "string") {
    return value;
  }

  return fallback;
}

function getBoolean(
  config: Record<string, unknown>,
  key: string,
  fallback = false
) {
  const value = config[key];

  if (typeof value === "boolean") {
    return value;
  }

  return fallback;
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

function ToggleCampo({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700">
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="h-4 w-4 rounded border-slate-300"
      />
      {label}
    </label>
  );
}

export default function ConfigFormularioBloco({
  config,
  onSave,
}: ConfigFormularioBlocoProps) {
  return (
    <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
      <p className="text-sm font-semibold text-slate-900">
        Configurações do formulário
      </p>

      <p className="mt-1 text-xs leading-5 text-slate-500">
        Configure um formulário simples para contato, orçamento, interesse ou
        captação de leads.
      </p>

      <div className="mt-4 grid gap-4">
        <Campo label="Título">
          <InputBase
            defaultValue={getString(config, "titulo", "Fale com a Stella")}
            onBlur={(event) =>
              onSave(setConfigValue(config, "titulo", event.target.value))
            }
          />
        </Campo>

        <Campo label="Descrição">
          <TextareaBase
            rows={3}
            defaultValue={getString(
              config,
              "descricao",
              "Preencha seus dados e entraremos em contato."
            )}
            onBlur={(event) =>
              onSave(setConfigValue(config, "descricao", event.target.value))
            }
          />
        </Campo>

        <div className="grid gap-4 md:grid-cols-2">
          <Campo label="Texto do botão">
            <InputBase
              defaultValue={getString(config, "textoBotao", "Enviar")}
              onBlur={(event) =>
                onSave(setConfigValue(config, "textoBotao", event.target.value))
              }
            />
          </Campo>

          <Campo label="Mensagem de sucesso">
            <InputBase
              defaultValue={getString(
                config,
                "mensagemSucesso",
                "Recebemos suas informações com sucesso."
              )}
              onBlur={(event) =>
                onSave(
                  setConfigValue(config, "mensagemSucesso", event.target.value)
                )
              }
            />
          </Campo>
        </div>

        <div className="grid gap-4 md:grid-cols-4">
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
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4">
          <p className="text-sm font-semibold text-slate-900">
            Campos exibidos
          </p>

          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <ToggleCampo
              label="Nome"
              checked={getBoolean(config, "mostrarNome", true)}
              onChange={(checked) =>
                onSave(setConfigValue(config, "mostrarNome", checked))
              }
            />

            <ToggleCampo
              label="Telefone"
              checked={getBoolean(config, "mostrarTelefone", true)}
              onChange={(checked) =>
                onSave(setConfigValue(config, "mostrarTelefone", checked))
              }
            />

            <ToggleCampo
              label="E-mail"
              checked={getBoolean(config, "mostrarEmail", true)}
              onChange={(checked) =>
                onSave(setConfigValue(config, "mostrarEmail", checked))
              }
            />

            <ToggleCampo
              label="Cidade"
              checked={getBoolean(config, "mostrarCidade", false)}
              onChange={(checked) =>
                onSave(setConfigValue(config, "mostrarCidade", checked))
              }
            />

            <ToggleCampo
              label="Mensagem"
              checked={getBoolean(config, "mostrarMensagem", true)}
              onChange={(checked) =>
                onSave(setConfigValue(config, "mostrarMensagem", checked))
              }
            />

            <ToggleCampo
              label="Aceite de marketing"
              checked={getBoolean(config, "mostrarMarketing", false)}
              onChange={(checked) =>
                onSave(setConfigValue(config, "mostrarMarketing", checked))
              }
            />
          </div>
        </div>

        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-800">
          O aceite de termos sempre aparece no formulário para registrar
          consentimento básico de contato.
        </div>
      </div>
    </div>
  );
}