import React,{useState} from 'react';
export default function MinhaSenha({db,onClose,embedded=false}){
 const [busy,B]=useState(false),[error,E]=useState(''),[ok,O]=useState(false);
 async function save(e){e.preventDefault();const form=e.currentTarget,f=new FormData(form);E('');O(false);if(f.get('nova')!==f.get('confirmar')){E('As novas senhas precisam ser iguais.');return}B(true);try{
 const user=await db.auth.getUser();if(user.error||!user.data.user?.email)throw Error();
 const check=await db.auth.signInWithPassword({email:user.data.user.email,password:f.get('atual')});if(check.error)throw check.error;
 const {error}=await db.auth.updateUser({password:f.get('nova'),current_password:f.get('atual')});if(error)throw error;form.reset();O(true);
 }catch{E('Não foi possível alterar a senha. Confira a senha atual e use uma nova senha com pelo menos 8 caracteres. Se sua sessão expirou, entre novamente.')}finally{B(false)}}
 return <section className={embedded?"password-card":"card password-card"}><h2>Alterar minha senha</h2><form onSubmit={save}><fieldset disabled={busy}><label>Senha atual<input name="atual" type="password" autoComplete="current-password" required/></label><label>Nova senha<input name="nova" type="password" autoComplete="new-password" minLength={8} required/></label><label>Confirmar nova senha<input name="confirmar" type="password" autoComplete="new-password" minLength={8} required/></label>{error&&<p role="alert" className="error">{error}</p>}{ok&&<p role="status" className="success">Senha alterada.</p>}<div className="actions"><button>Salvar senha</button><button className="back" type="button" onClick={onClose}>Fechar</button></div></fieldset></form></section>
}
