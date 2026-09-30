import React from 'react';
import MoedaInput from './MoedaInput.jsx';
import {moeda} from './finance.mjs';

export default function ServicoLinha({item,editando,podeEditar,ocupado,onEdit,onCancel,onSave}){
 const temQuantidade=!item.catalogo_id||item.unidade!=='item';
 return <article className="record service-row">
  <div className="service-description"><h3>{item.descricao}</h3><p>{item.quantidade} × {moeda(item.valor_unitario)} · {item.categoria}</p></div>
  {editando?<form className="service-inline" onSubmit={onSave}>
   <fieldset disabled={ocupado}>
    <div className="service-inputs">
     {temQuantidade&&<label>{item.unidade==='litros'?'Litros':'Quantidade'}<input name="quantidade" required type="number" min="0" step={item.unidade==='litros'?'0.001':'1'} defaultValue={item.quantidade}/></label>}
     <label>{temQuantidade?'Preço unitário':'Valor'}<MoedaInput name="valor_unitario" defaultValue={item.valor_unitario}/></label>
    </div>
    <div className="actions"><button type="submit">{ocupado?'Salvando…':'Salvar'}</button><button type="button" className="back" onClick={onCancel}>Cancelar</button></div>
   </fieldset>
  </form>:<><strong>{moeda(item.total)}</strong>{podeEditar&&<button className="back" disabled={ocupado} onClick={onEdit}>Editar</button>}</>}
 </article>;
}
