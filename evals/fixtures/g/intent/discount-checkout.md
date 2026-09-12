---
type: intent
status: accepted
author: Ana (product)
date: 2026-09-01
origin: person
accepted_by: Ana · 2026-09-01
---
# Intent: desconto de campanha no checkout
## Problema
A campanha de setembro promete 10% de desconto e o checkout não sabe aplicar desconto nenhum. Suporte aplica à mão por estorno, 40 casos/semana.
## Resultado proposto
Cliente com o cupom SET10 paga 10% a menos no checkout, sem estorno manual.
## Sub-intents
- Registro do desconto na cobrança (auditoria e conciliação) — financeiro precisa saber quanto foi dado.
- Cupom expira em 30/09 — não pode continuar valendo depois.
## O que já existe
| O quê | Onde | Serve pra | Veredito |
|---|---|---|---|
| charge() em src/billing.js | repo | cobra o cartão | adaptar |
## Usuários e sistemas afetados
Todos os clientes do checkout; src/billing.js; relatório financeiro.
## Restrições
Sem nova dependência. Cliente não pode escolher o percentual. Nunca cobrar zero.
## Perguntas abertas
Nenhuma.
