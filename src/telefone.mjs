export function formatarTelefone(value=''){
 let n=String(value).replace(/\D/g,'');
 if((n.length===12||n.length===13)&&n.startsWith('55'))n=n.slice(2);
 n=n.slice(0,11);
 if(!n)return '';
 if(n.length<=2)return `(${n}`;
 const local=n.slice(2),split=local.length>8?5:4;
 return `(${n.slice(0,2)}) ${local.slice(0,split)}${local.length>split?'-'+local.slice(split):''}`;
}
