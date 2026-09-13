import { hoje } from "./relogio.js";

export function selecionarLote(assinaturas) {
  const limite = new Date(hoje().getTime() + 7 * 86400000).toISOString().slice(0, 10);
  return assinaturas.filter((a) => a.vence_em === limite && !a.cancelada && !a.avisada_em);
}

export function avisar(assinatura, enviar) {
  assinatura.avisada_em = hoje().toISOString().slice(0, 10); // antes do envio, de propósito
  enviar(assinatura.email, `Sua assinatura vence em ${assinatura.vence_em}`);
  return assinatura;
}
