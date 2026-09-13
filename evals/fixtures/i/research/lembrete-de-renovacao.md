---
type: research
status: done
depth: standard
date: 2026-09-10
---
# Research: lembrete de renovação

## O que sabemos
- A tabela `assinaturas` já tem `vence_em` (fonte: `src/assinaturas.js`, lido em 10/09/2026).
- Não existe registro de envio: reenviar é o risco óbvio (fonte: o mesmo arquivo, não há coluna de aviso).

## O que o mercado faz (benchmarks)
| Produto | O que faz | Como sabemos |
|---|---|---|
| Stripe Billing | avisa 7 e 3 dias antes, marca o envio | documentação pública, 10/09/2026 |
| Shopify | um aviso só, e registra a data | documentação pública, 10/09/2026 |

## O que assumimos
- Um aviso resolve 80% do problema. Inferência: os dois benchmarks acima começaram com um.

## O que não checamos
- Taxa de entrega do provedor de e-mail.

## Recomendação para a spec
Um aviso, sete dias antes, com marca de envio persistida antes do envio.
