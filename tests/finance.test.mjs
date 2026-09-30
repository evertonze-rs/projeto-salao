import {test} from 'node:test';
import assert from 'node:assert/strict';
import {resumo,moeda} from '../src/finance.mjs';
test('totais, centavos, saldo e crédito',()=>{
 assert.deepEqual(resumo([{total:'24690.00'},{total:'2300.00'}],[{valor:'10422.00'}]),{total:26990,pago:10422,saldo:16568});
 assert.deepEqual(resumo([{total:'0.10'},{total:'0.20'}],[{valor:'0.30'}]),{total:0.3,pago:0.3,saldo:0});
 assert.equal(resumo([{total:100}],[{valor:140}]).saldo,-40);
 assert.deepEqual(resumo([],[]),{total:0,pago:0,saldo:0});
 assert.equal(moeda(2300).replace(/\s/g,' '),'R$ 2.300,00');
});
