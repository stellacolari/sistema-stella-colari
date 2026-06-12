export type TipoEmbalagemModelo =
  | "INTERNA_PADRAO"
  | "INTERNA_PRESENTE"
  | "EXTERNA_ENVIO"
  | string;

export type ItemPedidoEmbalagemInput = {
  produtoId: string;
  nome: string;
  quantidade: number;
  embalagemClasseId?: string | null;
  embalagemUnidades?: number | null;
  embalagemCompartilhavel?: boolean | null;
  embalagemIndividualObrigatoria?: boolean | null;
  embalagemPresenteModeloId?: string | null;
  pesoGramas?: number | null;
};

export type ComponenteEmbalagemInput = {
  id?: string;
  itemAdicionalId: string;
  nome: string;
  quantidade: number;
  custoBase: number;
};

export type CompatibilidadeEmbalagemInput = {
  classeId?: string | null;
  categoriaId?: string | null;
  produtoId?: string | null;
  ativo?: boolean;
  prioridade?: number | null;
  capacidadeMaximaItens?: number | null;
};

export type ModeloEmbalagemInput = {
  id: string;
  tipo: TipoEmbalagemModelo;
  nomeInterno: string;
  nomePublico?: string | null;
  ativo?: boolean;
  prioridade?: number | null;
  precoCliente?: number | null;
  substituiEmbalagemPadrao?: boolean | null;
  capacidadeUnidades?: number | null;
  capacidadeCaixasInternas?: number | null;
  pesoGramas?: number | null;
  alturaCm?: number | null;
  larguraCm?: number | null;
  comprimentoCm?: number | null;
  custoEstimadoManual?: number | null;
  componentes?: ComponenteEmbalagemInput[];
  compatibilidades?: CompatibilidadeEmbalagemInput[];
};

export type ConfiguracaoEmbalagemInput = {
  estrategiaSelecao?: string | null;
  permitirMultiplosVolumes?: boolean | null;
  maxCaixasInternasPorEnvio?: number | null;
};

export type CalcularPlanoEmbalagemInput = {
  itens: ItemPedidoEmbalagemInput[];
  modelos: ModeloEmbalagemInput[];
  configuracao?: ConfiguracaoEmbalagemInput | null;
};

export type PlanoEmbalagemItem = {
  tipo: TipoEmbalagemModelo;
  modeloId?: string;
  itemAdicionalId?: string;
  nome: string;
  quantidade: number;
  custoUnitario: number;
  valorClienteUnitario: number;
};

export type PlanoEmbalagemResultado = {
  embalagensInternasPadrao: PlanoEmbalagemItem[];
  embalagensPresente: PlanoEmbalagemItem[];
  embalagemExterna: PlanoEmbalagemItem | null;
  componentes: PlanoEmbalagemItem[];
  custoEstimado: number;
  valorEmbalagensCliente: number;
  pesoEstimadoGramas: number;
  dimensoesFinais: {
    alturaCm: number | null;
    larguraCm: number | null;
    comprimentoCm: number | null;
  };
  alertas: string[];
};

function numero(value: number | null | undefined, fallback = 0) {
  return Number.isFinite(Number(value)) ? Number(value) : fallback;
}

function arredondar(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function custoModelo(modelo: ModeloEmbalagemInput) {
  const custoComponentes = (modelo.componentes || []).reduce((total, item) => {
    return total + numero(item.quantidade, 1) * numero(item.custoBase);
  }, 0);

  if (custoComponentes > 0) {
    return arredondar(custoComponentes);
  }

  return arredondar(numero(modelo.custoEstimadoManual));
}

function nomeModelo(modelo: ModeloEmbalagemInput) {
  return modelo.nomePublico || modelo.nomeInterno;
}

function modeloCompatibilidadeScore(
  modelo: ModeloEmbalagemInput,
  item?: ItemPedidoEmbalagemInput
) {
  if ((modelo.compatibilidades || []).length === 0) {
    return 0;
  }

  const compatibilidade = getCompatibilidadeAplicavel(modelo, item);

  if (!compatibilidade) {
    return Number.NEGATIVE_INFINITY;
  }

  return scoreCompatibilidade(compatibilidade, item);
}

function scoreCompatibilidade(
  compatibilidade: CompatibilidadeEmbalagemInput,
  item?: ItemPedidoEmbalagemInput
) {
  let score = numero(compatibilidade.prioridade);

  if (item?.produtoId && compatibilidade.produtoId === item.produtoId) {
    score += 300;
  } else if (
    item?.embalagemClasseId &&
    compatibilidade.classeId === item.embalagemClasseId
  ) {
    score += 100;
  } else if (
    compatibilidade.produtoId ||
    compatibilidade.classeId ||
    compatibilidade.categoriaId
  ) {
    return Number.NEGATIVE_INFINITY;
  }

  return score;
}

function getCompatibilidadeAplicavel(
  modelo: ModeloEmbalagemInput,
  item?: ItemPedidoEmbalagemInput
) {
  const compatibilidades = (modelo.compatibilidades || []).filter(
    (compatibilidade) => compatibilidade.ativo !== false
  );

  if (compatibilidades.length === 0) {
    return null;
  }

  let melhorScore = Number.NEGATIVE_INFINITY;
  let melhorCompatibilidade: CompatibilidadeEmbalagemInput | null = null;

  for (const compatibilidade of compatibilidades) {
    const score = scoreCompatibilidade(compatibilidade, item);

    if (score === Number.NEGATIVE_INFINITY) {
      continue;
    }

    if (score > melhorScore) {
      melhorScore = score;
      melhorCompatibilidade = compatibilidade;
    }
  }

  return melhorCompatibilidade;
}

function modeloServeParaItem(
  modelo: ModeloEmbalagemInput,
  item?: ItemPedidoEmbalagemInput
) {
  return modeloCompatibilidadeScore(modelo, item) > Number.NEGATIVE_INFINITY;
}

function capacidadeModeloParaItem(
  modelo: ModeloEmbalagemInput,
  item?: ItemPedidoEmbalagemInput
) {
  const compatibilidade = getCompatibilidadeAplicavel(modelo, item);

  return Math.max(
    1,
    numero(
      compatibilidade?.capacidadeMaximaItens ?? modelo.capacidadeUnidades,
      1
    )
  );
}

function volume(modelo: ModeloEmbalagemInput) {
  return (
    numero(modelo.alturaCm, 1) *
    numero(modelo.larguraCm, 1) *
    numero(modelo.comprimentoCm, 1)
  );
}

function ordenarModelos(a: ModeloEmbalagemInput, b: ModeloEmbalagemInput) {
  const custoA = custoModelo(a);
  const custoB = custoModelo(b);

  if (custoA !== custoB) {
    return custoA - custoB;
  }

  const volumeA = volume(a);
  const volumeB = volume(b);

  if (volumeA !== volumeB) {
    return volumeA - volumeB;
  }

  return numero(b.prioridade) - numero(a.prioridade);
}

function adicionarComponente(
  componentes: Map<string, PlanoEmbalagemItem>,
  modelo: ModeloEmbalagemInput,
  quantidadeModelo: number
) {
  for (const componente of modelo.componentes || []) {
    const quantidade =
      numero(componente.quantidade, 1) * Math.max(0, quantidadeModelo);
    const atual = componentes.get(componente.itemAdicionalId);

    if (atual) {
      atual.quantidade = arredondar(atual.quantidade + quantidade);
      continue;
    }

    componentes.set(componente.itemAdicionalId, {
      tipo: "COMPONENTE",
      itemAdicionalId: componente.itemAdicionalId,
      nome: componente.nome,
      quantidade: arredondar(quantidade),
      custoUnitario: numero(componente.custoBase),
      valorClienteUnitario: 0,
    });
  }
}

export function calcularPlanoEmbalagem({
  itens,
  modelos,
  configuracao,
}: CalcularPlanoEmbalagemInput): PlanoEmbalagemResultado {
  const alertas: string[] = [];
  const componentes = new Map<string, PlanoEmbalagemItem>();
  const modelosAtivos = modelos.filter((modelo) => modelo.ativo !== false);
  const modelosPadrao = modelosAtivos.filter(
    (modelo) => modelo.tipo === "INTERNA_PADRAO"
  );
  const modelosPresente = modelosAtivos.filter(
    (modelo) => modelo.tipo === "INTERNA_PRESENTE"
  );
  const modelosExternos = modelosAtivos.filter(
    (modelo) => modelo.tipo === "EXTERNA_ENVIO"
  );

  const embalagensPresente: PlanoEmbalagemItem[] = [];
  const unidadesPadraoPorClasse = new Map<string, number>();
  let caixasInternasTotais = 0;
  let custoEstimado = 0;
  let valorEmbalagensCliente = 0;
  let pesoEstimadoGramas = itens.reduce((total, item) => {
    return total + numero(item.pesoGramas) * numero(item.quantidade);
  }, 0);

  for (const item of itens) {
    const quantidade = Math.max(0, numero(item.quantidade));
    const unidades = Math.max(0, numero(item.embalagemUnidades, 1));
    const presenteId = item.embalagemPresenteModeloId || "";
    const modeloPresente = presenteId
      ? modelosPresente.find((modelo) => modelo.id === presenteId)
      : null;

    if (modeloPresente) {
      const quantidadePresente = quantidade;
      const custo = custoModelo(modeloPresente);
      const valorCliente = numero(modeloPresente.precoCliente);

      embalagensPresente.push({
        tipo: modeloPresente.tipo,
        modeloId: modeloPresente.id,
        nome: nomeModelo(modeloPresente),
        quantidade: quantidadePresente,
        custoUnitario: custo,
        valorClienteUnitario: valorCliente,
      });
      adicionarComponente(componentes, modeloPresente, quantidadePresente);
      caixasInternasTotais += quantidadePresente;
      custoEstimado += custo * quantidadePresente;
      valorEmbalagensCliente += valorCliente * quantidadePresente;
      pesoEstimadoGramas += numero(modeloPresente.pesoGramas) * quantidadePresente;

      if (modeloPresente.substituiEmbalagemPadrao) {
        continue;
      }
    } else if (presenteId) {
      alertas.push(`Modelo de presente não encontrado para ${item.nome}.`);
    }

    const caixasNecessarias = item.embalagemIndividualObrigatoria
      ? quantidade
      : quantidade * unidades;
    const classeKey = item.embalagemClasseId || "SEM_CLASSE";
    unidadesPadraoPorClasse.set(
      classeKey,
      numero(unidadesPadraoPorClasse.get(classeKey)) + caixasNecessarias
    );
  }

  const embalagensInternasPadrao: PlanoEmbalagemItem[] = [];

  for (const [classeId, unidades] of unidadesPadraoPorClasse) {
    if (unidades <= 0) {
      continue;
    }

    const itemReferencia = itens.find(
      (item) => (item.embalagemClasseId || "SEM_CLASSE") === classeId
    );
    const candidatos = modelosPadrao
      .filter((modelo) => modeloServeParaItem(modelo, itemReferencia))
      .sort(ordenarModelos);
    const modelo = candidatos[0];

    if (!modelo) {
      alertas.push(
        `Nenhuma embalagem interna padrão compatível para a classe ${classeId}.`
      );
      continue;
    }

    const capacidade = capacidadeModeloParaItem(modelo, itemReferencia);
    const quantidadeModelo = Math.ceil(unidades / capacidade);
    const custo = custoModelo(modelo);

    embalagensInternasPadrao.push({
      tipo: modelo.tipo,
      modeloId: modelo.id,
      nome: nomeModelo(modelo),
      quantidade: quantidadeModelo,
      custoUnitario: custo,
      valorClienteUnitario: 0,
    });
    adicionarComponente(componentes, modelo, quantidadeModelo);
    caixasInternasTotais += quantidadeModelo;
    custoEstimado += custo * quantidadeModelo;
    pesoEstimadoGramas += numero(modelo.pesoGramas) * quantidadeModelo;
  }

  const maxCaixas =
    numero(configuracao?.maxCaixasInternasPorEnvio) || caixasInternasTotais;
  const externoCandidatos = modelosExternos
    .filter((modelo) => {
      const capacidade = numero(modelo.capacidadeCaixasInternas);
      return capacidade <= 0 || capacidade >= Math.min(caixasInternasTotais, maxCaixas);
    })
    .sort(ordenarModelos);
  const externo = externoCandidatos[0] || null;
  let embalagemExterna: PlanoEmbalagemItem | null = null;

  if (externo) {
    const custo = custoModelo(externo);
    embalagemExterna = {
      tipo: externo.tipo,
      modeloId: externo.id,
      nome: nomeModelo(externo),
      quantidade: 1,
      custoUnitario: custo,
      valorClienteUnitario: 0,
    };
    adicionarComponente(componentes, externo, 1);
    custoEstimado += custo;
    pesoEstimadoGramas += numero(externo.pesoGramas);
  } else if (caixasInternasTotais > 0) {
    alertas.push("Nenhuma embalagem externa comporta as caixas internas.");
  }

  const componentesLista = Array.from(componentes.values());
  const custoComponentes = componentesLista.reduce((total, componente) => {
    return total + componente.quantidade * componente.custoUnitario;
  }, 0);

  return {
    embalagensInternasPadrao,
    embalagensPresente,
    embalagemExterna,
    componentes: componentesLista,
    custoEstimado: arredondar(Math.max(custoEstimado, custoComponentes)),
    valorEmbalagensCliente: arredondar(valorEmbalagensCliente),
    pesoEstimadoGramas: arredondar(pesoEstimadoGramas),
    dimensoesFinais: {
      alturaCm: externo?.alturaCm ?? null,
      larguraCm: externo?.larguraCm ?? null,
      comprimentoCm: externo?.comprimentoCm ?? null,
    },
    alertas,
  };
}
