# Checklist final de producao Stella Colari

Data da auditoria: 2026-06-23

Este checklist registra o estado final de prontidao para go-live sem expor
segredos, sem alterar dados reais e sem executar acoes de pagamento, pedido,
estoque ou etiqueta.

## Estado tecnico

| Item | Status | Acao antes do go-live |
|---|---|---|
| Branch | `main` | Fazer push dos commits locais somente quando autorizado |
| Git | `ahead 2` autorizado | Publicar os commits pendentes antes do deploy final |
| Prisma | 63 migrations, banco atualizado | Conferir se o ambiente Vercel usa o mesmo banco de producao esperado |
| TypeScript | OK | Sem acao |
| Build | OK, com warnings existentes de `<img>` | Pode acompanhar como melhoria futura |
| Audit npm | 0 vulnerabilidades | Sem acao |

## Variaveis de producao

Nao imprimir valores. Conferir no provedor de deploy.

| Variavel | Status local seguro | Acao antes do go-live |
|---|---|---|
| `ADMIN_SESSION_SECRET` | vazia localmente | Bloqueia producao: configurar segredo forte na Vercel |
| `DATABASE_URL` | parece producao localmente | Confirmar banco Neon correto para producao |
| `STRIPE_SECRET_KEY` | parece teste localmente | Trocar por chave live na Vercel |
| `STRIPE_WEBHOOK_SECRET` | definida localmente | Configurar segredo live do webhook na Vercel |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | ausente localmente | Nao e usada diretamente no checkout atual; configurar apenas se o fluxo client-side for ativado |
| `NEXT_PUBLIC_SITE_URL` | parece producao localmente | Confirmar dominio canonico da loja em producao |
| `VERCEL_URL` | vazia localmente | Vercel injeta automaticamente em deploy; confirmar fallback |
| `MELHOR_ENVIO_TOKEN` | definida localmente | Trocar/confirmar token de producao na Vercel |
| `MELHOR_ENVIO_ENV` | parece teste localmente | Alterar para `production` no ambiente de producao |
| `MELHOR_ENVIO_ORIGEM_CEP` | definida localmente | Confirmar CEP real de postagem |
| `MELHOR_ENVIO_USER_AGENT` | definida localmente | Confirmar identificacao exigida pelo Melhor Envio |
| `BLOB_READ_WRITE_TOKEN` | vazia localmente | Configurar se uploads de midia forem usados em producao |
| `OPENROUTE_API_KEY` | vazia localmente | Configurar apenas se entrega manual com distancia automatica for usada |
| `FRETE_FALLBACK_*` | ausentes localmente | Opcional; existem defaults no codigo |

## Stripe live

| Item | Status | Acao |
|---|---|---|
| Chave secreta | Local parece teste | Configurar `STRIPE_SECRET_KEY` live |
| Webhook secret | Definido localmente, validar live | Configurar segredo do endpoint live |
| Endpoint | Codigo em `/api/loja/stripe/webhook` | Criar webhook para dominio de producao |
| Eventos tratados | `checkout.session.completed`, `checkout.session.expired` | Assinar esses eventos no Stripe |
| Assinatura | Validada por `constructEvent` | Testar com evento live controlado |
| Sessao duplicada | Reutiliza sessao aberta existente | Validar em teste controlado |
| Pagamento real | Nao executado nesta auditoria | Fazer compra controlada apos variaveis live |

## Melhor Envio producao

| Item | Status | Acao |
|---|---|---|
| Token | Definido localmente | Confirmar token de producao na Vercel |
| Ambiente | Local parece sandbox | Usar `MELHOR_ENVIO_ENV=production` no deploy final |
| CEP origem | Definido localmente | Conferir CEP real de postagem |
| Remetente | Configurado via admin/frete | Conferir dados reais antes de comprar etiqueta |
| Peso/dimensoes | 16 produtos publicos sem peso ou dimensoes | Corrigir antes de frete real |
| Cotacao | Nao executada | Testar com CEP valido em ambiente correto |
| Compra de etiqueta | Nao executada | Executar somente apos pedido pago controlado |
| Retirada local | Suportada sem etiqueta | Validar visualmente no checkout |

## SEO, legal e catalogo

| Item | Status | Bloqueia? | Acao |
|---|---|---|---|
| `sitemap.xml` | Implementado dinamico | Nao | Conferir URL em producao |
| `robots.txt` | Implementado com bloqueios privados | Nao | Conferir dominio final |
| Busca/carrinho/checkout/favoritos/minha conta/pedido | `noindex`/disallow configurados | Nao | Validar em producao |
| Paginas legais | Rotas existem | Nao | Revisar conteudo juridico final |
| Produtos na lixeira | Fora do sitemap | Nao | Sem acao |
| Produtos publicos | 17 encontrados | Nao | Revisar vitrine final |
| Produtos sem imagem | 7 encontrados | Sim, para loja publica polida | Inserir imagens |
| Produtos sem estoque | 8 encontrados | Sim, se forem vendidos no go-live | Ajustar estoque ou ocultar |
| Produtos sem descricao | 17 encontrados | Corrigir antes de publicar | Escrever descricoes de loja |
| Categorias vazias no menu | 8 encontradas | Corrigir antes de publicar | Remover do menu ou preencher |
| Colecoes ativas | 0 encontradas | Nao, se colecoes nao forem destaque | Ativar somente quando houver curadoria |

## Permissoes/admin

| Item | Status | Acao |
|---|---|---|
| Vendedor sem custo/lucro/margem | Reforcado em auditorias anteriores | Validar com perfil real |
| Acoes sensiveis de pedido | Protegidas por guards explicitos | Validar com perfis Admin, Operacao, Financeiro e Vendedor |
| Marcar como pago | Possui confirmacao visual e guard | Testar apenas em ambiente controlado |
| Etiquetas | Guards em APIs e client | Testar somente apos pedido pago controlado |
| Perfis reais | Nao alterados nesta auditoria | Conferir matriz real em producao |

## Roteiro de teste controlado de compra

1. Escolher produto real com imagem, descricao, preco, estoque, categoria e peso/dimensoes.
2. Confirmar variaveis live na Vercel, sem expor valores.
3. Abrir a loja publica no dominio final.
4. Adicionar produto ao carrinho.
5. Abrir checkout.
6. Preencher dados reais controlados do cliente.
7. Calcular frete com CEP valido.
8. Criar pedido.
9. Ir ao Stripe Checkout.
10. Realizar pagamento controlado autorizado.
11. Confirmar webhook `checkout.session.completed`.
12. Conferir pedido no admin.
13. Conferir baixa de estoque.
14. Avancar etapa operacional.
15. Testar Melhor Envio no ambiente correto.
16. Conferir notificacoes e e-mails, se habilitados.
17. Registrar resultado e decidir abertura publica.

## Bloqueios antes de publicar

- Configurar `ADMIN_SESSION_SECRET` forte.
- Configurar Stripe live e webhook live.
- Configurar Melhor Envio em producao, se frete real for publicado.
- Corrigir produtos vendidos sem imagem, estoque, descricao e peso/dimensoes.

## Acompanhar pos-lancamento

- Warnings de `<img>` no build.
- Refinamento de SEO das descricoes.
- Colecoes ativas e curadoria.
- OpenRoute para entrega manual automatica, se necessario.
