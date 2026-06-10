"use client";

type EmbalagemClasseOption = {
  id: string;
  nome: string;
};

type EmbalagemModeloOption = {
  id: string;
  tipo: string;
  nomeInterno: string;
  nomePublico?: string | null;
};

export type EmbalagemProdutoInicial = {
  embalagemClasseId?: string | null;
  embalagemUnidades?: number | null;
  embalagemCompartilhavel?: boolean | null;
  embalagemIndividualObrigatoria?: boolean | null;
  embalagemModeloPreferencialId?: string | null;
  permiteEmbalagemPresente?: boolean | null;
  embalagemPresentePadraoId?: string | null;
  pesoGramas?: number | null;
  alturaCm?: number | null;
  larguraCm?: number | null;
  comprimentoCm?: number | null;
};

export type EmbalagemProdutoOptions = {
  classes: EmbalagemClasseOption[];
  modelos: EmbalagemModeloOption[];
};

function valorNumerico(value: number | null | undefined, fallback = "") {
  if (value === null || value === undefined) {
    return fallback;
  }

  return String(value);
}

export default function EmbalagemProdutoFields({
  options,
  inicial,
}: {
  options: EmbalagemProdutoOptions;
  inicial?: EmbalagemProdutoInicial | null;
}) {
  const modelosPadrao = options.modelos.filter(
    (modelo) => modelo.tipo === "INTERNA_PADRAO"
  );
  const modelosPresente = options.modelos.filter(
    (modelo) => modelo.tipo === "INTERNA_PRESENTE"
  );

  return (
    <div className="grid gap-5">
      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <label className="mb-2 block text-sm font-medium text-slate-700">
            Classe de embalagem
          </label>

          <select
            name="embalagemClasseId"
            defaultValue={inicial?.embalagemClasseId || ""}
            className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-500"
          >
            <option value="">Sem classe definida</option>
            {options.classes.map((classe) => (
              <option key={classe.id} value={classe.id}>
                {classe.nome}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium text-slate-700">
            Unidades ocupadas na embalagem
          </label>

          <input
            name="embalagemUnidades"
            type="number"
            step="0.01"
            min="0"
            defaultValue={valorNumerico(inicial?.embalagemUnidades, "1")}
            className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-500"
          />
        </div>

        <label className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
          <input
            name="embalagemCompartilhavel"
            type="checkbox"
            defaultChecked={inicial?.embalagemCompartilhavel !== false}
            className="mt-1 h-4 w-4 rounded border-slate-300"
          />
          <span>
            <span className="block text-sm font-semibold text-slate-900">
              Pode compartilhar embalagem
            </span>
            <span className="mt-1 block text-xs leading-5 text-slate-500">
              Permite agrupar com outros produtos compatíveis no plano futuro.
            </span>
          </span>
        </label>

        <label className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
          <input
            name="embalagemIndividualObrigatoria"
            type="checkbox"
            defaultChecked={Boolean(inicial?.embalagemIndividualObrigatoria)}
            className="mt-1 h-4 w-4 rounded border-slate-300"
          />
          <span>
            <span className="block text-sm font-semibold text-slate-900">
              Exige embalagem individual
            </span>
            <span className="mt-1 block text-xs leading-5 text-slate-500">
              Marca produtos que não devem dividir caixa interna.
            </span>
          </span>
        </label>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <label className="mb-2 block text-sm font-medium text-slate-700">
            Modelo de embalagem preferencial
          </label>

          <select
            name="embalagemModeloPreferencialId"
            defaultValue={inicial?.embalagemModeloPreferencialId || ""}
            className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-500"
          >
            <option value="">Seleção automática</option>
            {modelosPadrao.map((modelo) => (
              <option key={modelo.id} value={modelo.id}>
                {modelo.nomeInterno}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium text-slate-700">
            Embalagem presente padrão
          </label>

          <select
            name="embalagemPresentePadraoId"
            defaultValue={inicial?.embalagemPresentePadraoId || ""}
            className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-500"
          >
            <option value="">Sem padrão</option>
            {modelosPresente.map((modelo) => (
              <option key={modelo.id} value={modelo.id}>
                {modelo.nomePublico || modelo.nomeInterno}
              </option>
            ))}
          </select>
        </div>

        <label className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-4 md:col-span-2">
          <input
            name="permiteEmbalagemPresente"
            type="checkbox"
            defaultChecked={inicial?.permiteEmbalagemPresente !== false}
            className="mt-1 h-4 w-4 rounded border-amber-300"
          />
          <span>
            <span className="block text-sm font-semibold text-amber-950">
              Permite embalagem de presente
            </span>
            <span className="mt-1 block text-xs leading-5 text-amber-800">
              Apenas prepara o cadastro. A loja/carrinho/checkout não usam este
              campo nesta etapa.
            </span>
          </span>
        </label>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <div>
          <label className="mb-2 block text-sm font-medium text-slate-700">
            Peso do produto em gramas
          </label>
          <input
            name="pesoGramas"
            type="number"
            step="0.01"
            min="0"
            defaultValue={valorNumerico(inicial?.pesoGramas)}
            className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-500"
          />
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium text-slate-700">
            Altura em cm
          </label>
          <input
            name="alturaCm"
            type="number"
            step="0.01"
            min="0"
            defaultValue={valorNumerico(inicial?.alturaCm)}
            className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-500"
          />
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium text-slate-700">
            Largura em cm
          </label>
          <input
            name="larguraCm"
            type="number"
            step="0.01"
            min="0"
            defaultValue={valorNumerico(inicial?.larguraCm)}
            className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-500"
          />
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium text-slate-700">
            Comprimento em cm
          </label>
          <input
            name="comprimentoCm"
            type="number"
            step="0.01"
            min="0"
            defaultValue={valorNumerico(inicial?.comprimentoCm)}
            className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-500"
          />
        </div>
      </div>
    </div>
  );
}
