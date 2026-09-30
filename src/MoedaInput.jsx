import React,{useState} from 'react';
import {moeda} from './finance.mjs';
export default function MoedaInput({name,defaultValue=0,required=false}){
 const [centavos,C]=useState(Math.round(Number(defaultValue||0)*100));
 return <><input aria-label="Valor em reais" inputMode="numeric" value={moeda(centavos/100)} onFocus={e=>e.target.select()} onChange={e=>{const digits=e.target.value.replace(/\D/g,'').slice(0,12);C(Number(digits||0))}} required={required}/><input type="hidden" name={name} value={(centavos/100).toFixed(2)}/></>;
}
