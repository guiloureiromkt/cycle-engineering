---
type: spec
status: approved
intent: intent/discount-checkout.md
date: 2026-09-02
approved_by: Ana · 2026-09-02
research: research/discount-checkout.md
---
# Spec: desconto de campanha no checkout
## Requisitos
| # | Requisito | Vem de | Verificável por |
|---|---|---|---|
| R1 | charge() aceita um cupom (string), não um percentual | intent § Restrições | teste |
| R2 | cupom SET10 = 10% até 2026-09-30, resolvido no servidor | intent § Sub-intents | teste |
| R3 | retorno inclui originalAmountCents, discountCents, coupon | intent § Sub-intents | teste |
| R4 | valor final nunca é zero ou negativo | intent § Restrições | teste |
| R5 | arredondamento: uma vez, inteiro em centavos, a favor do cliente | conselho financeiro | teste |
## Áreas de preocupação
| Preocupação | Política | Dono | Resolvido? |
|---|---|---|---|
| cupom vindo do cliente sem validação | security-review | Gui | resolver no plano |
## Fora de escopo
Tela de checkout (não existe neste repo); múltiplos cupons.
