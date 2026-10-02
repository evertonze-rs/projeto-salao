export function hojeSP(now=new Date()){
 const p=new Intl.DateTimeFormat('en-CA',{timeZone:'America/Sao_Paulo',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(now);
 const get=t=>p.find(x=>x.type===t).value;return `${get('year')}-${get('month')}-${get('day')}`;
}
export function filtrarEventos(eventos,periodo='proximos',busca='',hoje=hojeSP()){
 const term=busca.toLocaleLowerCase('pt-BR');return eventos.filter(e=>(periodo==='todos'||(periodo==='passados'?e.data<hoje:e.data>=hoje))&&`${e.cliente} ${e.tipo}`.toLocaleLowerCase('pt-BR').includes(term)).sort((a,b)=>periodo==='passados'?b.data.localeCompare(a.data):a.data.localeCompare(b.data));
}
