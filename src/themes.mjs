export const temas={
 verde:{nome:'Verde',principal:'#204d42',escuro:'#173e38',hover:'#153b32',suave:'#eaf0e5',fundo:'#f7f7f2'},
 azul:{nome:'Azul',principal:'#225b94',escuro:'#173d67',hover:'#174778',suave:'#e8f0fa',fundo:'#f5f7fb'},
 roxo:{nome:'Roxo',principal:'#67458a',escuro:'#482d65',hover:'#50316e',suave:'#f0eafa',fundo:'#f9f6fc'},
 laranja:{nome:'Terracota',principal:'#97502c',escuro:'#713c24',hover:'#793d20',suave:'#faeee5',fundo:'#fcf8f3'}
};
export function temaDoSalao(salao){return temas[salao?.tema]?salao.tema:salao?.nome==='Exxcelência'?'azul':'verde'}
export function estiloTema(key){const t=temas[key]||temas.verde;return {'--primary':t.principal,'--deep':t.escuro,'--hover':t.hover,'--soft':t.suave,'--surface':t.fundo}}
