import { selecionarLote, avisar } from "../src/lembretes.js";
import assert from "node:assert/strict";

const base = [
  { email: "a@x", vence_em: "2026-09-16", cancelada: false },
  { email: "b@x", vence_em: "2026-09-17", cancelada: false },
  { email: "c@x", vence_em: "2026-09-18", cancelada: false },
  { email: "d@x", vence_em: "2026-09-17", cancelada: true },
];
assert.deepEqual(selecionarLote(base).map((a) => a.email), ["b@x"], "só quem vence em 7 dias, e nunca quem cancelou");

const enviados = [];
const lote = selecionarLote(base);
lote.forEach((a) => avisar(a, (to) => enviados.push(to)));
assert.deepEqual(selecionarLote(base), [], "rodar de novo no mesmo dia não reenvia");
assert.equal(enviados.length, 1);
console.log("ok · 3 asserções");
