import React,{useState} from 'react';
import {formatarTelefone} from './telefone.mjs';
export default function TelefoneInput({defaultValue='',value,onChange,...props}){
 const [local,L]=useState(()=>formatarTelefone(defaultValue));
 return <input {...props} type="tel" inputMode="tel" autoComplete="tel-national" placeholder="(00) 00000-0000" value={value===undefined?local:formatarTelefone(value)} onChange={e=>{const v=formatarTelefone(e.target.value);L(v);onChange?.(v)}}/>;
}
