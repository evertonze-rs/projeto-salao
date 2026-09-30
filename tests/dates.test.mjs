import {test} from 'node:test';
import assert from 'node:assert/strict';
import {formatDate,parseDate,maskDate} from '../src/dates.mjs';
test('datas brasileiras sem conversão de fuso e validação de calendário',()=>{
 assert.equal(formatDate('2027-12-31'),'31/12/2027');
 assert.equal(parseDate('31/12/2027'),'2027-12-31');
 assert.equal(parseDate('29/02/2028'),'2028-02-29');
 for(const date of ['29/02/2027','31/04/2027','00/01/2027','01/13/2027','01/01/0000','1/1/2027'])assert.equal(parseDate(date),'');
 assert.equal(maskDate('31122027'),'31/12/2027');
 assert.equal(parseDate(''),'');assert.equal(formatDate(''),'');
});
