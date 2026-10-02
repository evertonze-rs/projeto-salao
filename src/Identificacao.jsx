import React from 'react';
export default function Identificacao({perfil,nome,disabled,onClick}){
 const label=perfil?.nome||nome||'Minha conta';
 return <button type="button" className="account-trigger" disabled={disabled} onClick={onClick} aria-label={`Minha conta: ${label}`}>{perfil?.foto?<img src={perfil.foto} alt=""/>:<span className="account-initial" aria-hidden="true">{label.slice(0,1).toUpperCase()}</span>}<span>{label}<small>Minha conta ▾</small></span></button>;
}
