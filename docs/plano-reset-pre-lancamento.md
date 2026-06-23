# Plano seguro de reset pre-lancamento Stella Colari

Data da auditoria: 2026-06-23

Este documento e apenas um plano. Nenhum reset foi executado, nenhum dado foi
apagado, nenhum script destrutivo foi criado e nenhum segredo foi exposto.

## Objetivo

Preparar um reset seguro antes do lancamento oficial, preservando catalogo e
configuracoes reais, removendo dados operacionais de teste/simulacao e criando
um caminho auditavel para um script futuro com dry-run e confirmacao explicita.

## Premissas

- Produtos base devem ser preservados.
- Fotos serao ajustadas manualmente.
- Estoque real sera registrado manualmente.
- Dados de teste nao devem permanecer confundindo pedidos, vendas, estoque,
  financeiro, metricas, notificacoes ou recomendacoes.
- Builder e configuracoes publicas nao devem ser alterados automaticamente.
- Antes de qualquer limpeza futura, deve existir backup/snapshot validado.

## Estado observado em leitura somente consulta

| Grupo | Models principais | Contagem observada | Leitura |
|---|---|---:|---|
| Produtos | `Produto`, `ProdutoImagem`, `ProdutoVariacao`, `ProdutoVariacaoOpcao` | 22 produtos, 24 imagens, 7 variacoes, 13 opcoes | Preservar |
| Estoque | `EstoqueProduto`, `ProdutoCicloEstoque`, `ProdutoMetricaSnapshot` | 23 estoques, 13 ciclos, 16 snapshots | Zerar para cadastro real |
| Clientes | `Cliente` | 59 | Zerar se forem teste |
| Pedidos | `PedidoOnline`, itens, envio, historico | 169 pedidos, 209 itens, 143 envios, 329 historicos | Zerar |
| Vendas | `Venda`, `VendaItem` | 120 vendas, 155 itens | Zerar |
| Caixa/financeiro | `MovimentacaoCaixa`, `LancamentoFinanceiro`, apuracoes | 269 movimentacoes, 24 lancamentos, 2 apuracoes | Zerar dados simulados |
| Compras | `Compra`, `CompraItem` | 10 compras, 30 itens | Zerar se forem teste |
| Notificacoes | `NotificacaoSistema`, usuarios, canais | 132 notificacoes, 528 leituras, 132 canais | Zerar historico |
| Inteligencia | recomendacoes, campanhas, vitrines, colecoes | 18 recomendacoes, 10 campanhas, 17 vitrines, 10 colecoes | Revisar/zerar gerados |
| Loja/builder | paginas, blocos, banners, secoes | 4 paginas, 11 blocos, 1 banner, 2 secoes | Preservar e revisar |
| Admin/perfis | `UsuarioAdmin`, `PerfilAdministrativo` | 4 usuarios, 6 perfis | Nao tocar |

## Preservar

| Grupo/Model | Motivo | Observacao |
|---|---|---|
| `Produto` | Base do catalogo real | Nao deletar; ajustar imagens, descricao, estoque e dimensoes manualmente |
| `ProdutoFamilia`, `ProdutoFamiliaCampo`, `ProdutoFamiliaProduto`, `ProdutoFamiliaProdutoValor` | Estrutura comercial do catalogo | Preservar junto com produtos |
| `ProdutoVariacao`, `ProdutoVariacaoOpcao` | Tamanhos/opcoes reais de produto | Preservar; revisar se existem opcoes de teste |
| `ProdutoImagem` | Fotos ja cadastradas | Preservar; revisar qualidade e completude |
| `ProdutoCanal` | Vinculos de canais externos | Preservar se forem reais; revisar se vieram de teste |
| `CategoriaProduto`, `ProdutoCategoria` | Estrutura de navegacao e SEO | Preservar se categorias forem reais |
| `ItemAdicional` | Adicionais e embalagens consumiveis | Preservar cadastro base; estoque pode ser zerado |
| `EmbalagemClasse`, `EmbalagemModelo`, `EmbalagemConfiguracao` | Configuracao de embalagem da loja | Preservar; revisar regras |
| `ContaFinanceira` | Contas/caixas estruturais | Preservar se forem contas reais |
| `RegraDistribuicaoResultado`, `RegraDistribuicaoDestino` | Parametrizacao financeira | Preservar e revisar |
| `LojaPagina`, `LojaPaginaBloco` | Paginas publicas e builder | Preservar; builder esta pausado |
| `BannerLoja`, `MenuLoja`, `LojaSecaoHome`, `LojaBlocoHome`, `LojaTextoInstitucional` | Composicao publica da loja | Preservar se ja aprovado |
| `LojaCashbackConfiguracao`, `LojaFreteConfiguracao`, `LojaEntregaManualOrigem` | Configuracoes comerciais e operacionais | Preservar, mas revisar para producao |
| `LojaMenuRodapeConfiguracao` | Navegacao/legal | Preservar se estiver configurado |
| `UsuarioAdmin`, `PerfilAdministrativo`, `RegraNotificacaoPerfil` | Acesso administrativo | Nao tocar em reset operacional |

## Preservar, mas revisar manualmente

| Item | Acao manual | Bloqueia lancamento? |
|---|---|---|
| Fotos e `MidiaAsset` | Conferir imagens reais e remover midias claramente temporarias somente apos backup | Sim, se produtos publicos ficarem sem imagem |
| Categorias vazias | Remover do menu ou preencher com produto real | Sim, se aparecerem no menu publico |
| Colecoes inteligentes | Decidir se serao apagadas, mantidas como rascunho ou curadas | Nao, se nao forem publicas |
| Menu e rodape | Validar links, paginas legais e itens publicos | Sim |
| Configuracao de frete | Confirmar ambiente, CEP, remetente, peso/dimensoes | Sim, se frete real estiver ativo |
| Cupons | Validar se `CupomLoja` deve iniciar vazio | Nao, salvo campanha de go-live |
| Cashback | Revisar `LojaCashbackConfiguracao` e zerar saldos/movimentos de teste | Sim, se cashback estiver ativo |
| Embalagens e adicionais | Conferir cadastro real e estoque real | Sim, se afetar checkout |
| Contas financeiras | Confirmar quais contas sao reais antes de limpar movimentos | Sim |

## Zerar antes do lancamento

| Grupo/Model | Motivo | Risco | Ordem sugerida |
|---|---|---|---|
| Pedidos online: `PedidoOnlineItemAdicional`, `PedidoOnlineItemEmbalagemPresente`, `PedidoEmbalagemPlanoItem`, `PedidoEmbalagemPlano`, `PedidoEnvio`, `PedidoStatusHistorico`, `PedidoOnlineItem`, `PedidoOnline` | Remover pedidos de teste | Apagar pedido real por engano | Depois de backup e antes de clientes |
| Vendas: `VendaItem`, `Venda` | Remover vendas simuladas | Quebrar historico financeiro se parcial | Antes de limpar clientes |
| Clientes: `Cliente`, `ClienteCashbackMovimentacao` | Remover clientes de teste | Apagar cliente real | Depois de pedidos/vendas/eventos |
| Estoque operacional: `Movimentacao`, `MovimentacaoAdicional`, `EstoqueProduto`, `EstoqueAdicional` | Permitir cadastro manual de estoque real | Deixar produto sem estoque se reset incompleto | Depois de vendas/pedidos/compras |
| Ciclos e metricas: `ProdutoCicloEstoque`, `ProdutoMetricaSnapshot` | Remover metricas derivadas de simulacao | Dashboard temporariamente vazio | Depois de estoque |
| Compras: `CompraItem`, `Compra` | Remover compras de teste | Perder custo/entrada real se houver | Antes de financeiro final |
| Caixa/financeiro: `ApuracaoResultadoDestino`, `ApuracaoResultadoMensal`, `LancamentoFinanceiro`, `MovimentacaoCaixa` | Remover simulacao financeira | Apagar caixa real | Depois de compras/vendas |
| Notificacoes: `NotificacaoCanalEnvio`, `NotificacaoUsuario`, `NotificacaoSistema` | Limpar historico operacional antigo | Perder trilha de auditoria | Pode ser perto do final |
| Inteligencia: `RecomendacaoGerencialImpacto`, `RecomendacaoGerencial`, `CampanhaComercial`, `VitrineInteligenteSugestao` | Remover recomendacoes/campanhas geradas por teste | Apagar recomendacao aprovada | Depois de backup e revisao |
| Eventos e formularios: `EventoComercial`, `LojaFormularioResposta` | Limpar comportamento/testes publicos | Perder lead real | Depois de revisar se ha lead verdadeiro |
| Colecoes geradas: `ColecaoInteligenteProduto`, `ColecaoInteligente` | Remover colecoes geradas se nao forem reais | Apagar curadoria pronta | Somente com decisao explicita |

## Nao tocar sem decisao explicita

- `Produto` e cadastro-base de catalogo.
- `ProdutoImagem`, salvo midia comprovadamente temporaria.
- `CategoriaProduto` e `ProdutoCategoria`, salvo reorganizacao manual.
- `UsuarioAdmin`, `PerfilAdministrativo`, `RegraNotificacaoPerfil`.
- `LojaPagina`, `LojaPaginaBloco` e demais estruturas do builder.
- Configuracoes de loja, frete, cashback, menu e rodape.
- `ContaFinanceira` e regras de distribuicao, salvo se forem contas de teste.
- `CupomLoja`, salvo decisao comercial.
- Arquivos reais de midia/blob.

## Ordem segura proposta

1. Congelar deploy, webhooks, operacao administrativa e qualquer teste publico.
2. Confirmar ambiente correto e criar snapshot Neon.
3. Rodar dry-run futuro com contagens por model e relatorio JSON.
4. Exportar CSV/JSON de produtos, categorias, usuarios, perfis, configuracoes,
   paginas, frete, cashback, contas financeiras e midias.
5. Limpar eventos e formularios de teste, se nao houver leads reais.
6. Limpar notificacoes derivadas de testes.
7. Limpar dados de pedido, na ordem de filhos para pai.
8. Limpar vendas, na ordem `VendaItem` depois `Venda`.
9. Limpar compras e financeiro derivado, respeitando apuracoes e lancamentos.
10. Limpar movimentacoes de estoque e estoque operacional.
11. Limpar ciclos e snapshots de metricas.
12. Limpar recomendacoes, impactos, campanhas e vitrines geradas.
13. Limpar colecoes inteligentes somente se aprovadas pelo usuario.
14. Limpar clientes de teste somente depois que pedidos/vendas/eventos foram
    removidos.
15. Registrar estoque real manualmente.
16. Revisar catalogo, fotos, categorias, menu, frete e paginas legais.
17. Rodar validacoes finais e teste controlado de compra.

## Dependencias e cuidados

- Muitos filhos de `PedidoOnline` usam `onDelete: Cascade`, mas o script futuro
  deve deletar explicitamente filhos primeiro para gerar relatorio claro.
- `Venda` depende de `Cliente`; nao apagar clientes antes das vendas.
- `PedidoOnline` pode depender de `Cliente` e `CupomLoja`; preservar cupom ate a
  decisao comercial.
- `Produto` tem cascades para imagens, variacoes, estoque, metricas e colecoes.
  Portanto, o reset nunca deve deletar produto.
- `CategoriaProduto` tem relacoes com produtos, paginas e opcoes adicionais.
  Nao limpar categorias automaticamente.
- `LancamentoFinanceiro` referencia `MovimentacaoCaixa` e `ContaFinanceira`;
  limpar lancamentos/apuracoes antes de movimentos de caixa.
- `NotificacaoSistema` possui filhos de usuario/canal com cascade; limpar filhos
  primeiro facilita contagem antes/depois.
- `ColecaoInteligenteProduto` tem cascade para colecao e produto. Nao deletar
  produtos para limpar colecoes.

## Backup e seguranca

- Criar snapshot Neon imediatamente antes do reset.
- Confirmar que o banco alvo e o ambiente correto.
- Salvar contagens antes/depois por model.
- Exportar dados preservados em JSON/CSV.
- Validar que nao ha operacao real em andamento.
- Desativar temporariamente webhooks ou impedir entradas novas durante a janela.
- Exigir confirmacao textual do usuario.
- Exigir Git limpo.
- Exigir migrations em dia.
- Rodar dry-run primeiro.
- Gerar relatorio JSON com escopo, contagens e timestamp.
- Guardar hash do commit usado para executar o reset.

## Proposta de script futuro

Nome sugerido:

```bash
scripts/reset-pre-lancamento-stella.mjs
```

Requisitos minimos:

- Dry-run por padrao.
- Nao executar sem `--confirm=RESET_PRE_LANCAMENTO_STELLA`.
- Aceitar `--escopo=teste` e `--escopo=pre-lancamento`.
- Imprimir contagens antes/depois.
- Gerar relatorio JSON em `tmp/reset-pre-lancamento-*.json`.
- Nunca deletar `Produto`, `CategoriaProduto`, `UsuarioAdmin`,
  `PerfilAdministrativo`, configuracoes criticas, paginas ou builder.
- Abortara se Git nao estiver limpo.
- Abortara se migrations estiverem pendentes.
- Abortara se detectar ambiente de producao ativo sem confirmacao extra.
- Rodar tudo dentro de transacao quando possivel.
- Separar limpeza de clientes, colecoes e midias em flags independentes.
- Registrar no relatorio todos os models afetados e todos os models preservados.

## Checklist manual do usuario

1. Confirmar que todos os commits aprovados estao publicados.
2. Confirmar dominio e variaveis reais de producao.
3. Criar snapshot Neon.
4. Exportar catalogo e configuracoes preservadas.
5. Revisar se existem clientes, pedidos ou vendas reais que nao podem ser
   apagados.
6. Confirmar se colecoes inteligentes devem ser apagadas ou apenas desativadas.
7. Confirmar se cupons e cashback devem iniciar vazios.
8. Rodar dry-run do script futuro.
9. Revisar relatorio de dry-run.
10. Executar reset apenas com confirmacao textual.
11. Conferir contagens depois do reset.
12. Cadastrar estoque real manualmente.
13. Completar imagens, descricoes e dimensoes de produtos.
14. Testar checkout, Stripe, frete e pedido controlado.
15. Liberar go-live.

## Scripts existentes observados

Os scripts abaixo existem, mas nao devem ser usados como reset final de producao
sem nova auditoria especifica:

- `scripts/limpar-base-teste.mjs`
- `scripts/estoque-inicial-teste.mjs`
- `scripts/simular-operacao-2-meses.mjs`
- `scripts/auditar-operacao-simulada.mjs`
- `scripts/gerar-metricas-produtos.mjs`
- `scripts/gerar-recomendacoes-gerenciais.mjs`
- `scripts/gerar-campanhas-comerciais.mjs`
- `scripts/gerar-colecoes-inteligentes.mjs`
- `scripts/gerar-vitrines-inteligentes.mjs`
- `scripts/sincronizar-notificacoes.mjs`

Nenhum deles foi executado nesta tarefa.
