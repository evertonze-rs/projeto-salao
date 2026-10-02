export const moeda = value => new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(value);
export function resumo(itens,pagamentos){
 const cents=v=>Math.round(Number(v)*100);
 const total=itens.reduce((s,i)=>s+cents(i.total),0);
 const pago=pagamentos.reduce((s,p)=>s+(p.natureza==='devolucao'?-1:1)*cents(p.valor),0);
 return {total:total/100,pago:pago/100,saldo:(total-pago)/100};
}
