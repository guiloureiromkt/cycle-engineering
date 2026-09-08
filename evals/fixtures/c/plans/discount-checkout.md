---
type: plan
status: draft
spec: specs/discount-checkout.md
intent: intent/discount-checkout.md
date: 2026-09-03
accepted_by:
gates: [graph, advocate, pre-mortem, council, loop]
---
# Plano: desconto de campanha no checkout

> **Para quem executa:** o plano só vale com `status: accepted` e `accepted_by` preenchido por um humano. Executar com `cycle:build`, tarefa por tarefa, teste antes do código, commit por tarefa. Quem lê isto não tem a conversa que gerou o plano; tudo o que precisa está aqui.

**Objetivo:** `charge()` aceita o cupom `SET10` e cobra 10% a menos até 30/09/2026, devolvendo o valor original, o desconto e o cupom, sem nunca cobrar zero.

**Arquitetura:** o cupom é resolvido no servidor por uma tabela fixa em `src/coupons.js` (nome → percentual + validade). A data "de hoje" vem de `src/clock.js`, nunca da requisição. `charge()` em `src/billing.js` recebe só a string do cupom, pede a resolução, aplica o percentual uma única vez arredondando a favor do cliente e devolve o detalhamento. O cliente nunca informa percentual nem data.

**Stack:** Node 24, ES modules (`import`/`export`), zero dependência. Testes rodam com `npm test` (`node tests/run.js`), sem framework.

---

## O que já existe e como é hoje

`src/billing.js` (4 linhas): `charge(customerId, amountCents)` rejeita `amountCents <= 0` e devolve `{ customerId, amountCents, status: 'charged' }`. `tests/run.js` tem 1 teste que só confere `status`. Não há `src/coupons.js` nem `src/clock.js`. **Ninguém chama `charge()` neste repo além do teste** — a tela de checkout está fora de escopo na spec. Ver Riscos R-A.

## Arquivos que mudam

| Arquivo | Ação | Responsabilidade |
|---|---|---|
| `src/clock.js` | criar | `now()` do servidor + `setClockForTests(fn)`; único lugar que lê o relógio |
| `src/coupons.js` | criar | tabela de cupons (data civil) + `endOfDaySaoPaulo()` + `resolveCoupon(code, today)` — limite de tamanho, normalização e validade, sem saber de dinheiro |
| `src/billing.js` | modificar | `quote(amountCents, couponCode?)` (puro: percentual, arredondamento, mínimo, detalhamento) e `charge(customerId, amountCents, couponCode?)` que chama `quote` e cobra |
| `tests/run.js` | reescrever | mini-harness (`test(nome, fn)` + `eq`/`throws`) com os casos abaixo; mantém o teste antigo |

## Decisões tomadas (e a alternativa descartada)

| Decisão | Escolha | Descartada | Por quê |
|---|---|---|---|
| D1 · cupom desconhecido, expirado ou não-string | `charge()` lança `Error('invalid coupon')` com `err.code = 'COUPON_EXPIRED'` ou `'COUPON_UNKNOWN'` | ignorar e cobrar cheio | cobrar cheio de quem esperava desconto vira estorno manual — o problema que o intent quer matar. O `code` existe pro suporte saber a razão (advogado C11) |
| D2 · normalização do código | `trim()` + `toUpperCase()` **antes** de decidir se há cupom; `' set10 '` vale, `'   '` = sem cupom | comparação exata | reduz falso "cupom inválido"; tabela continua a única fonte (advogado C4) |
| D3 · arredondamento (R5) | `discountCents = Math.ceil(amountCents * pct / 100)` — uma operação, inteiro, a favor do cliente | `Math.round` | spec R5. O teste usa 1001 (round=100, ceil=101) porque 1005 não distingue os dois (advogado C12) |
| D4 · valor final mínimo (R4) | se `amountCents - discountCents < MIN_CHARGE_CENTS (1)`, o desconto é reduzido pra deixar final = 1 centavo; a redução aparece em `discountCents` | lançar erro | intent diz "nunca cobrar zero", não "recusar valores pequenos". `1` é placeholder até o financeiro confirmar o mínimo do gateway (Riscos R-D) |
| D5 · "hoje" | `src/clock.js` exporta `now()`; testes congelam com `setClockForTests`. **`charge()` não recebe data** | `charge(..., { today })` | data na assinatura de quem move dinheiro deixa a camada HTTP passar `body` inteiro e o cliente escolher a data (advogado C2/C10) |
| D6 · fim da validade | a tabela guarda só a data civil (`lastDay: '2026-09-30'`); um helper único `endOfDaySaoPaulo()` converte pra `23:59:59.999-03:00`; um teste percorre a tabela | `new Date('2026-09-30T23:59:59.999-03:00')` escrito à mão em cada cupom | quem adicionar `OUT10` com `new Date('2026-10-31')` reintroduz o bug de meia-noite UTC (= 21h em SP) sem teste reclamar (conselho, quem mantém). Premissa: cliente no fuso de SP (Riscos R-E) |
| D7 · formato de retorno | `{ customerId, amountCents (final cobrado), originalAmountCents, discountCents, coupon, status }`; sem cupom: `discountCents: 0`, `coupon: null` | trocar nome de `amountCents` | `amountCents` continua sendo o que foi cobrado; quem já lê o campo não quebra |
| D8 · relógio inválido | `resolveCoupon` lança `Error('invalid clock')` se `today` não for `Date` válido | tratar como válido | `NaN > x` é `false`: `Invalid Date` faria SET10 valer pra sempre (advogado C1 🔴) |
| D9 · `amountCents` tem que ser inteiro | `Number.isInteger(amountCents) && amountCents > 0`, senão `invalid amount` | manter só `<= 0` | centavo fracionário quebra R5; `NaN` passava antes. É mudança de contrato (Riscos R-F) |
| D10 · tabela | `Map`, não objeto literal | `{}` | `COUPONS['constructor']` num objeto devolve função e o desconto vira NaN (advogado C7) |
| D11 · cálculo separado da cobrança | `quote(amountCents, couponCode)` puro, exportado; `charge()` chama `quote` e acrescenta `customerId` + `status` | só `charge()` | a tela vai precisar mostrar o preço final antes de cobrar; se recalcular por conta própria, R5 ("arredonda uma vez") morre na prática (conselho, quem usa) |
| D12 · limite de tamanho do cupom | string acima de `MAX_CODE_LENGTH = 32` vira `unknown` **antes** de `trim`/`toUpperCase` | processar qualquer tamanho | entrada do cliente não é processada sem limite (conselho, segurança) |
| **Fecha a preocupação da spec** ("cupom vindo do cliente sem validação · security-review") | resolvida por D2 (normaliza só string), D5 (data nunca vem do cliente), D8 (relógio inválido lança), D10 (`Map`), D12 (limite de tamanho) e pelos testes "não-string é unknown", "Object.prototype", "relógio inválido", "código longo" | — | a spec condiciona o plano a resolver isto; fica registrado onde |

## Ordem do trabalho

Sequencial: Tarefa 1 → 2 → 3 → 4 (a 2 importa o que a 1 define; a 3 importa a 2; a 4 lê tudo). Um agente só constrói. Verificador separado no fim (toca dinheiro — obrigatório pelo §12).

### Tarefa 1: harness de teste

**Arquivos:** reescrever `tests/run.js`

- [ ] **Passo 1: escrever o harness com o teste antigo dentro**

```js
import { charge, quote } from '../src/billing.js';

const failures = [];
let count = 0;
function test(name, fn) {
  count++;
  try { fn(); console.log(`ok - ${name}`); }
  catch (e) { failures.push(name); console.error(`FAIL - ${name}: ${e.message}`); }
}
function eq(actual, expected, label) {
  if (actual !== expected) throw new Error(`${label}: esperado ${JSON.stringify(expected)}, veio ${JSON.stringify(actual)}`);
}
function throws(fn, msg, code) {
  let threw = false;
  try { fn(); } catch (e) {
    threw = true;
    if (msg && !e.message.includes(msg)) throw new Error(`erro errado: ${e.message}`);
    if (code && e.code !== code) throw new Error(`code errado: ${e.code}`);
  }
  if (!threw) throw new Error('não lançou');
}

// --- comportamento antigo (regressão)
test('charge sem cupom continua cobrando cheio', () => {
  const r = charge('c1', 100);
  eq(r.status, 'charged', 'status');
  eq(r.amountCents, 100, 'amountCents');
});
test('charge com valor zero ou negativo lança', () => {
  throws(() => charge('c1', 0), 'invalid amount');
  throws(() => charge('c1', -5), 'invalid amount');
});

console.log(`${count - failures.length}/${count} tests ok`);
if (failures.length) process.exit(1);
```

- [ ] **Passo 2: rodar** `npm test` → esperado: `2/2 tests ok`, exit 0.
- [ ] **Passo 3: commit** `git add tests/run.js && git commit -m "test: harness sem dependência, mantém teste de charge"`

### Tarefa 2: `src/clock.js` e `src/coupons.js`

**Arquivos:** criar `src/clock.js`, criar `src/coupons.js`; modificar `tests/run.js`

- [ ] **Passo 1: testes que falham** — acrescentar em `tests/run.js`, abaixo do import de `charge`:

```js
import { resolveCoupon, endOfDaySaoPaulo, listCoupons, MAX_CODE_LENGTH } from '../src/coupons.js';
import { setClockForTests } from '../src/clock.js';

const DURANTE = new Date('2026-09-15T12:00:00-03:00');
const ULTIMO_MS = new Date('2026-09-30T23:59:59.999-03:00');
const PRIMEIRO_MS_DEPOIS = new Date('2026-10-01T00:00:00.000-03:00');

test('resolveCoupon: SET10 vale 10% durante a campanha', () => {
  const c = resolveCoupon('SET10', DURANTE);
  eq(c.valid, true, 'valid'); eq(c.code, 'SET10', 'code'); eq(c.pct, 10, 'pct');
});
test('resolveCoupon: vale até o último milissegundo de 30/09 em São Paulo', () => {
  eq(resolveCoupon('SET10', ULTIMO_MS).valid, true, 'último ms');
});
test('resolveCoupon: expira no primeiro milissegundo de 01/10 em São Paulo', () => {
  const c = resolveCoupon('SET10', PRIMEIRO_MS_DEPOIS);
  eq(c.valid, false, 'valid'); eq(c.reason, 'expired', 'reason');
});
test('resolveCoupon: normaliza espaço e caixa', () => {
  eq(resolveCoupon('  set10 ', DURANTE).code, 'SET10', 'normalizado');
});
test('resolveCoupon: desconhecido é unknown', () => {
  eq(resolveCoupon('HACK', DURANTE).reason, 'unknown', 'desconhecido');
});
test('resolveCoupon: não-string é unknown (cliente não escolhe percentual)', () => {
  eq(resolveCoupon(50, DURANTE).reason, 'unknown', 'número');
  eq(resolveCoupon({ pct: 90 }, DURANTE).reason, 'unknown', 'objeto');
  eq(resolveCoupon(['SET10'], DURANTE).reason, 'unknown', 'array');
  eq(resolveCoupon(undefined, DURANTE).reason, 'unknown', 'undefined');
});
test('resolveCoupon: nomes do Object.prototype não viram cupom', () => {
  eq(resolveCoupon('constructor', DURANTE).reason, 'unknown', 'constructor');
  eq(resolveCoupon('__proto__', DURANTE).reason, 'unknown', '__proto__');
});
test('resolveCoupon: relógio inválido lança, nunca valida', () => {
  throws(() => resolveCoupon('SET10', new Date('lixo')), 'invalid clock');
  throws(() => resolveCoupon('SET10', '2026-09-15'), 'invalid clock');
  throws(() => resolveCoupon('SET10', 1757000000000), 'invalid clock');
});
test('resolveCoupon: sem today usa o relógio do servidor', () => {
  setClockForTests(() => DURANTE);
  eq(resolveCoupon('SET10').valid, true, 'durante');
  setClockForTests(() => PRIMEIRO_MS_DEPOIS);
  eq(resolveCoupon('SET10').reason, 'expired', 'depois');
  setClockForTests(null);
});
test('resolveCoupon: código acima de MAX_CODE_LENGTH é unknown sem processar', () => {
  eq(resolveCoupon('SET10' + 'x'.repeat(MAX_CODE_LENGTH), DURANTE).reason, 'unknown', 'longo');
  eq(resolveCoupon(' '.repeat(MAX_CODE_LENGTH) + 'SET10', DURANTE).reason, 'unknown', 'espaços longos antes do trim');
});
test('coupons: toda validade da tabela é o fim do dia em São Paulo (D6)', () => {
  // o erro que este teste pega: alguém escrever new Date('2026-10-31'), que é meia-noite UTC = 21h em SP
  eq(endOfDaySaoPaulo('2026-10-31').toISOString(), '2026-11-01T02:59:59.999Z', 'helper');
  throws(() => endOfDaySaoPaulo('2026-10-31T00:00:00Z'), 'bad civil date');
  for (const c of listCoupons()) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(c.lastDay)) throw new Error(`${c.code}: lastDay não é data civil: ${c.lastDay}`);
    if (!endOfDaySaoPaulo(c.lastDay).toISOString().endsWith('T02:59:59.999Z')) throw new Error(`${c.code}: validade não é fim do dia em SP`);
  }
});
```

- [ ] **Passo 2: rodar** `npm test` → esperado: falha na importação (`Cannot find module '../src/coupons.js'`).
- [ ] **Passo 3: implementação mínima** — criar `src/clock.js`:

```js
// Relógio do servidor. Único lugar que lê a hora. NUNCA construir a data a partir da requisição.
let clock = () => new Date();
export function now() { return clock(); }
export function setClockForTests(fn) { clock = fn ?? (() => new Date()); }
```

  e criar `src/coupons.js`:

```js
// Cupons de campanha. Única fonte de verdade: o cliente manda o código, o servidor decide o percentual.
import { now } from './clock.js';

export const MAX_CODE_LENGTH = 32;

// A tabela guarda só a data civil do último dia válido. A hora vem de endOfDaySaoPaulo, num lugar só.
const COUPONS = new Map([
  ['SET10', { pct: 10, lastDay: '2026-09-30' }],
]);

// Brasil não tem horário de verão desde 2019; -03:00 é fixo pra São Paulo.
export function endOfDaySaoPaulo(civilDate) {
  if (typeof civilDate !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(civilDate)) throw new Error(`bad civil date: ${civilDate}`);
  return new Date(`${civilDate}T23:59:59.999-03:00`);
}

export function listCoupons() {
  return [...COUPONS.entries()].map(([code, c]) => ({ code, ...c }));
}

// Devolve { valid: true, code, pct } ou { valid: false, reason: 'unknown' | 'expired' }.
export function resolveCoupon(code, today = now()) {
  if (!(today instanceof Date) || Number.isNaN(today.getTime())) throw new Error('invalid clock');
  if (typeof code !== 'string' || code.length > MAX_CODE_LENGTH) return { valid: false, reason: 'unknown' };
  const key = code.trim().toUpperCase();
  const c = COUPONS.get(key);
  if (!c) return { valid: false, reason: 'unknown' };
  if (today.getTime() > endOfDaySaoPaulo(c.lastDay).getTime()) return { valid: false, reason: 'expired' };
  return { valid: true, code: key, pct: c.pct };
}
```

- [ ] **Passo 4: rodar** `npm test` → esperado: `13/13 tests ok`.
- [ ] **Passo 5: commit** `git add src/clock.js src/coupons.js tests/run.js && git commit -m "feat: resolveCoupon com SET10 até 30/09 (fim do dia SP) e relógio injetável"`

### Tarefa 3: `charge()` aplica o cupom

**Arquivos:** modificar `src/billing.js`; modificar `tests/run.js`

- [ ] **Passo 1: testes que falham** — acrescentar em `tests/run.js` (todos congelam o relógio e o soltam no fim):

```js
setClockForTests(() => DURANTE);

test('charge com SET10 cobra 10% a menos e detalha (R2, R3)', () => {
  const r = charge('c1', 10000, 'SET10');
  eq(r.originalAmountCents, 10000, 'original');
  eq(r.discountCents, 1000, 'desconto');
  eq(r.amountCents, 9000, 'final');
  eq(r.coupon, 'SET10', 'coupon');
  eq(r.status, 'charged', 'status');
});
test('charge sem cupom devolve detalhamento zerado (R3)', () => {
  const r = charge('c1', 100);
  eq(r.originalAmountCents, 100, 'original');
  eq(r.discountCents, 0, 'desconto');
  eq(r.coupon, null, 'coupon');
});
test('charge arredonda uma vez, pra cima, em centavos (R5) — 1001 distingue ceil de round', () => {
  const a = charge('c1', 1001, 'SET10'); // 10% = 100.1 → round=100, ceil=101
  eq(a.discountCents, 101, 'desconto 1001');
  eq(a.amountCents, 900, 'final 1001');
  const b = charge('c1', 1005, 'SET10'); // 10% = 100.5
  eq(b.discountCents, 101, 'desconto 1005');
  eq(b.amountCents, 904, 'final 1005');
});
test('charge nunca cobra zero (R4): 1 centavo com SET10 cobra 1 centavo', () => {
  const r = charge('c1', 1, 'SET10');
  eq(r.amountCents, 1, 'final');
  eq(r.discountCents, 0, 'desconto reduzido');
});
test('charge: invariantes R4/R5 em todo valor de 1 a 100000 centavos', () => {
  for (let a = 1; a <= 100000; a++) {
    const r = charge('c1', a, 'SET10');
    if (r.amountCents < 1) throw new Error(`final < 1 em ${a}`);
    if (r.amountCents + r.discountCents !== a) throw new Error(`soma não bate em ${a}`);
    if (r.discountCents !== Math.min(Math.ceil(a / 10), a - 1)) throw new Error(`desconto errado em ${a}: ${r.discountCents}`);
  }
});
test('charge com cupom expirado lança com code COUPON_EXPIRED', () => {
  setClockForTests(() => PRIMEIRO_MS_DEPOIS);
  throws(() => charge('c1', 10000, 'SET10'), 'invalid coupon', 'COUPON_EXPIRED');
  setClockForTests(() => DURANTE);
});
test('charge com cupom desconhecido lança com code COUPON_UNKNOWN', () => {
  throws(() => charge('c1', 10000, 'NADA'), 'invalid coupon', 'COUPON_UNKNOWN');
});
test('charge com percentual vindo do cliente lança (R1)', () => {
  throws(() => charge('c1', 10000, 50), 'invalid coupon');
  throws(() => charge('c1', 10000, { pct: 100 }), 'invalid coupon');
});
test('charge com cupom vazio, só espaços, null ou undefined trata como sem cupom', () => {
  eq(charge('c1', 100, null).discountCents, 0, 'null');
  eq(charge('c1', 100, undefined).discountCents, 0, 'undefined');
  eq(charge('c1', 100, '').discountCents, 0, 'vazio');
  eq(charge('c1', 100, '   ').discountCents, 0, 'espaços');
});
test('quote calcula sem cobrar e charge usa o mesmo número (D11)', () => {
  const q = quote(1001, 'SET10');
  eq(q.originalAmountCents, 1001, 'original'); eq(q.discountCents, 101, 'desconto'); eq(q.amountCents, 900, 'final'); eq(q.coupon, 'SET10', 'coupon');
  eq(q.status, undefined, 'quote não cobra'); eq(q.customerId, undefined, 'quote não tem cliente');
  const r = charge('c1', 1001, 'SET10');
  eq(r.amountCents, q.amountCents, 'charge == quote'); eq(r.discountCents, q.discountCents, 'desconto igual');
});
test('charge exige amountCents inteiro (D9): string, NaN e fração lançam', () => {
  throws(() => charge('c1', '100'), 'invalid amount');
  throws(() => charge('c1', NaN), 'invalid amount');
  throws(() => charge('c1', 10.5), 'invalid amount');
});

setClockForTests(null);
```

  Atenção: esse bloco tem que ficar **antes** do `console.log` final do harness.

- [ ] **Passo 2: rodar** `npm test` → esperado: falha na importação (`quote` não existe em `src/billing.js`). Se preferir ver os 11 novos falhando um a um, exporte um `quote` vazio antes — não é obrigatório.
- [ ] **Passo 3: implementação** — substituir `src/billing.js` por:

```js
// Billing: charges the customer card. Money moves here.
import { resolveCoupon } from './coupons.js';

// Placeholder até o financeiro confirmar o mínimo por transação do gateway (ver plano, Riscos R-D).
const MIN_CHARGE_CENTS = 1;

// Puro: calcula o detalhamento sem cobrar. A tela usa isto pra mostrar o preço final (D11).
export function quote(amountCents, couponCode = null) {
  if (!Number.isInteger(amountCents) || amountCents <= 0) throw new Error('invalid amount');

  const code = typeof couponCode === 'string' ? couponCode.trim() : couponCode;
  const hasCoupon = code !== null && code !== undefined && code !== '';

  let discountCents = 0;
  let coupon = null;
  if (hasCoupon) {
    const r = resolveCoupon(code); // data vem de src/clock.js, nunca daqui
    if (!r.valid) {
      const err = new Error('invalid coupon');
      err.code = r.reason === 'expired' ? 'COUPON_EXPIRED' : 'COUPON_UNKNOWN';
      throw err;
    }
    coupon = r.code;
    discountCents = Math.ceil(amountCents * r.pct / 100);                   // R5: uma vez, a favor do cliente
    discountCents = Math.min(discountCents, amountCents - MIN_CHARGE_CENTS); // R4: nunca zero
  }

  return { originalAmountCents: amountCents, discountCents, amountCents: amountCents - discountCents, coupon };
}

export function charge(customerId, amountCents, couponCode = null) {
  const q = quote(amountCents, couponCode);
  return { customerId, ...q, status: 'charged' };
}
```

- [ ] **Passo 4: rodar** `npm test` → esperado: `24/24 tests ok`, exit 0.
- [ ] **Passo 5: commit** `git add src/billing.js tests/run.js && git commit -m "feat: charge aplica SET10 com detalhamento, piso de 1 centavo e razão do erro"`

### Tarefa 4: verificação separada

- [ ] Despachar `cycle:verifier` com `plans/discount-checkout.md`, `specs/discount-checkout.md`, `src/billing.js`, `src/coupons.js`, `src/clock.js`, `tests/run.js`. Ele roda `npm test`, confere R1–R5 um a um contra o código, e roda a sonda da seção Prova, sem as premissas de quem escreveu.
- [ ] Achado do verificador volta pra Tarefa 2 ou 3; não vai direto pro "pronto".

## Portão 1 · Graph (forma do trabalho)

- **Divide-se:** nada. As tarefas leem o resultado da anterior (harness → clock/coupons → billing). Um agente constrói; dividir aqui é aresta falsa.
- **Sequencial:** Tarefa 1 → 2 → 3 → 4.
- **Verificador separado:** obrigatório (dinheiro). Tarefa 4, contexto novo.
- **Portão humano:** (a) aceite deste plano; (b) antes de publicar/mergear (`cycle:deploy`). Não entre tarefas.

## Portão 2 · Advogado do diabo (agente separado, 2026-09-03)

Contestações e o que mudou no plano:

| # | Sev. | Contestação | Resposta |
|---|---|---|---|
| C1 | 🔴 | `Invalid Date` nunca expira (`NaN > x` é false) → SET10 permanente | D8: lança `invalid clock`; teste com `new Date('lixo')`, string e número |
| C12 | 🔴 | teste de R5 com 1005 passa com `Math.round` (100.5 → 101) | teste agora usa 1001 (round=100, ceil=101) e mantém 1005 |
| C2/C10 | 🟠 | `today` na assinatura de `charge` deixa a camada HTTP passar `body` e o cliente escolher a data | D5: `src/clock.js`; `charge` não recebe data |
| C3 | 🟠 | `opts = null` dava `TypeError` | resolvido ao remover `opts` |
| C4 | 🟠 | `'   '` lançava `invalid coupon`, `''` passava — `hasCoupon` decidido antes do `trim` | D2: normaliza antes; teste com `'   '` |
| C9 | 🟠 | 4 casos fixos não cobrem 2..9 centavos; varredura 1..100000 custa ms | teste de invariantes adicionado |
| C13 | 🟠 | piso de 1 centavo sem evidência de que o gateway aceita | Riscos R-D + item na Prova |
| C14 | 🟠 | R3 devolve campos, mas ninguém grava pro financeiro; não há chamador no repo | Riscos R-A + item na Prova |
| C5 | 🟡 | `Number.isInteger` é mudança de contrato sem teste | D9 + teste com `'100'`, `NaN`, `10.5`; Riscos R-F |
| C6 | 🟡 | -03:00 fixo assume cliente em SP (Manaus perde 1h) | Riscos R-E |
| C7 | 🟡 | objeto literal: `COUPONS['constructor']` devolve função | D10: `Map`; teste com `constructor`/`__proto__` |
| C8 | 🟡 | sem limite de uso por cliente | Fora de escopo, registrado abaixo |
| C11 | 🟡 | "invalid coupon" sem razão pro suporte | D1: `err.code` |
| C15 | 🟡 | borda testada em 23:59:00, não em 23:59:59.999 | testes nos dois lados do milissegundo |
| C16 | 🟡 | caminho default (`new Date()`) sem cobertura | teste "sem today usa o relógio do servidor" |

Premissa que derruba tudo (advogado, §1): **alguém chama `charge()` com o cupom e persiste o retorno.** Não é verificável neste repo. Vai pra Riscos R-A e pra Prova.

## Portão 3 · Pré-mortem ("seis meses depois, fracassou. Por quê?")

| Sev. | Como fracassou | Teste barato antes de construir |
|---|---|---|
| 🔴 | Em outubro o SET10 continuava valendo: uma data mal formada chegou em `resolveCoupon` e `NaN` nunca é maior que nada | teste de `invalid clock` (Tarefa 2) + testes nos dois lados do milissegundo da virada |
| 🔴 | Financeiro não conciliou setembro: `discountCents` voltava no objeto mas ninguém gravava | `grep -rn "charge("` no repo do checkout antes do build; se não há quem grave, abrir intent separado (Riscos R-A) |
| 🟠 | Cliente escolheu a data: camada HTTP fez `charge(id, amount, body.coupon, body)` | D5 tirou a data da assinatura; teste de que número/objeto como cupom lança |
| 🟠 | Gateway recusou cobrança de 1 centavo e o pedido não fechou — na prática, cobrou zero | perguntar ao financeiro o mínimo por transação (Prova, item 4) |
| 🟡 | Suporte recebeu "cupom inválido" de quem digitou SET10 em 01/10 e não soube explicar | `err.code` (D1) |
| 🟡 | Cliente de Manaus perdeu o cupom às 23h30 de 30/09 | Riscos R-E; decisão do produto, não do código |
| 🟡 | Chamador antigo mandava `'100'` (string) e quebrou com `invalid amount` | Riscos R-F; conferir tipo no chamador quando ele for identificado |

## Portão 4 · Conselho (agente separado, 2026-09-03)

| Voz | Exigência | Entrou onde | Bloqueava? |
|---|---|---|---|
| Quem usa | cálculo puro `quote()` separado de `charge()`, senão a tela recalcula e R5 morre | D11 + Tarefa 3 (teste "quote calcula sem cobrar") | não |
| Quem mantém | tabela com data civil + helper único de fim do dia em SP + teste que percorre a tabela | D6 + Tarefa 2 (`endOfDaySaoPaulo`, `listCoupons`, teste "toda validade da tabela") | não |
| Quem paga | a Prova precisa do número que o intent promete: estornos manuais por SET10 depois do deploy, contra a base de 40 | Prova, item 6 | **sim** |
| Segurança e dado | limite de tamanho antes de normalizar, com teste; linha em Decisões fechando a preocupação da spec | D12 + Tarefa 2 (teste "código longo") + linha "Fecha a preocupação da spec" | **sim** |
| Quem opera | virada 01/10 parece incidente; rollback volta a cobrar cheio em silêncio; chamador precisa contar `coupon`/`err.code` | Riscos R-G | não pro aceite; **sim pro deploy** |

## Portão 5 · Loop (a barra do "pronto")

- **Build está pronto quando:** Prova itens 1–3 batem (números, não relato): `24/24`, verificador separado reproduz, as 3 mutações fazem o teste certo falhar.
- **Deploy está liberado quando:** Prova itens 4–5 têm resposta escrita (mínimo do gateway; chamador que grava) e R-G está aceito por quem opera.
- **Feature está entregue quando:** Prova item 6 tem número (semanas 1 e 2 pós-deploy).
- **Gauntlet:** não. Escopo de 3 arquivos, requisitos numéricos, verificador separado já faz a comparação cega. Um loop builder×crítico adicional não compra nada aqui.

## Fora de escopo (decidido)
- Limite de uso do SET10 por cliente ou por pedido (advogado C8). Intent não pede.
- Tela de checkout e persistência do retorno (spec: fora de escopo). Ver Riscos R-A.
- Múltiplos cupons (spec).

## Riscos

| # | Sev. | Risco | O que o plano faz | O que fica aberto |
|---|---|---|---|---|
| R-A | 🔴 | **Ninguém chama `charge()` com cupom neste repo** e ninguém grava o retorno. Sem isso os 40 estornos/semana continuam e o financeiro não concilia (teste de alcance, §12) | D7/D11 devolvem tudo o que o financeiro precisa; Prova item 5 exige o chamador identificado antes do deploy | intent separado pra tela/persistência se o chamador não existir |
| R-B | 🔴 | Cupom continua valendo depois de 30/09 (relógio inválido, data mal escrita na tabela, comparação errada) | D6 (data civil + helper + teste da tabela), D8 (`invalid clock` lança), testes nos dois lados do milissegundo | — |
| R-C | 🟠 | Cliente escolhe a data ou o percentual | D5 (data só de `clock.js`), D1/D12 (só string, com limite), testes de não-string | camada HTTP nunca deve passar `body` inteiro — anotar no chamador quando ele existir |
| R-D | 🟠 | Piso de 1 centavo pode ser recusado pelo gateway; na prática seria cobrar zero | `MIN_CHARGE_CENTS` isolado e marcado como placeholder | Prova item 4: financeiro confirma o mínimo; com SET10 só acontece em `amountCents = 1` |
| R-E | 🟡 | Fuso fixo -03:00: cliente em Manaus perde o cupom às 23h30 de 30/09 | registrado; sem HV desde 2019 o valor é estável | decisão de produto: SP ou fuso mais a oeste |
| R-F | 🟡 | D9 (`Number.isInteger`) quebra chamador que mandava `'100'` ou `10.5` | teste explícito do novo contrato | conferir tipo no chamador quando identificado |
| R-G | 🟠 | **Virada 01/10 e rollback:** o pico de `COUPON_EXPIRED` à meia-noite é esperado, não incidente; `git revert` dos 3 commits volta ao `charge()` que ignora o 3º argumento e cobra cheio em silêncio; nada conta cupons aplicados/recusados | `err.code` dá o sinal; registrado aqui | quem operar precisa saber antes do deploy; chamador conta `coupon` e `err.code` por resultado |
| R-H | 🟡 | Tela recalcula desconto e mostra valor diferente do cobrado | D11 (`quote()`) | a tela tem que usar `quote`, não refazer a conta |

## Prova

| # | O que prova | Como | Número/comparação | Quando · dono |
|---|---|---|---|---|
| 1 | Código faz o que o plano diz | `npm test` | `24/24 tests ok`, exit 0 | fim da Tarefa 3 · quem constrói |
| 2 | Não é auto-relato | `cycle:verifier` (Tarefa 4) roda `npm test` e confere R1–R5 contra `src/billing.js` e `src/coupons.js` linha a linha; sonda: `node -e "import('./src/billing.js').then(m=>console.log(m.charge('c1',1001,'set10'), m.quote(1,'SET10')))"` com relógio real (antes de 30/09) | `{amountCents:900, discountCents:101, coupon:'SET10'}` e `{amountCents:1, discountCents:0}` | fim do build · agente separado |
| 3 | Os testes pegam o bug que dizem pegar | 3 mutações, uma por vez, cada uma tem que fazer `npm test` falhar: (a) `Math.ceil`→`Math.round` em `quote` → falha "1001 distingue ceil de round"; (b) apagar a linha do `Math.min(..., amountCents - MIN_CHARGE_CENTS)` → falha "invariantes" e "nunca cobra zero"; (c) apagar a checagem de `invalid clock` → falha "relógio inválido lança" | 3 de 3 mutações detectadas | fim do build · verificador |
| 4 | O piso de 1 centavo é cobrável | financeiro informa o mínimo por transação do gateway; `MIN_CHARGE_CENTS` bate com ele (ou fica 1 com essa resposta anotada) | um número, escrito neste plano | antes do deploy · Gui |
| 5 | A feature alcança o usuário (R-A) | no repo do checkout: `grep -rn "charge("`; o chamador passa o cupom como string e grava `originalAmountCents`, `discountCents`, `coupon` onde o financeiro lê | caminho do arquivo do chamador + onde grava, anotados aqui; ou intent novo aberto | antes do deploy · Gui |
| 6 | Matou o estorno manual (o que o intent promete) | suporte conta estornos manuais por SET10 nas semanas 1 e 2 após o deploy | base: 40/semana. Meta a fixar pelo Gui no aceite (sugestão: ≤ 4/semana, e todo restante com razão anotada) | 2 sextas após o deploy · Gui + suporte |
