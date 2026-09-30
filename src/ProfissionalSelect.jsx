import React from 'react';
export default function ProfissionalSelect({campo,rows,atual=''}){
 const options=rows.filter(r=>r.servicos?.includes(campo));
 return <label>{campo}<select name={campo} defaultValue={atual}><option value="">Selecione</option><option value="Particular">Particular</option>{atual&&atual!=='Particular'&&!options.some(r=>r.nome===atual)&&<option value={atual}>{atual} (atual)</option>}{options.map(r=><option value={r.nome} key={r.id}>{r.nome}</option>)}</select></label>;
}
