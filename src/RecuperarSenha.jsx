import React,{useState} from 'react';
export default function RecuperarSenha({db,session,invalid=false,onDone}){
 const [busy,B]=useState(false),[error,E]=useState(''),[saved,S]=useState(false);
 async function save(e){e.preventDefault();const form=e.currentTarget,f=new FormData(form);E('');
 if(f.get('nova')!==f.get('confirmar')){E('As senhas precisam ser iguais.');return}
 if(String(f.get('nova')).length<8){E('Use pelo menos 8 caracteres.');return}
 B(true);try{const user=await db.auth.getUser();if(user.error||!user.data.user)throw Error();
 const r=await db.auth.updateUser({password:f.get('nova')});if(r.error)throw r.error;form.reset();S(true);
 }catch{E('Não foi possível salvar a senha. O link pode ter expirado ou a senha não atende aos requisitos. Solicite outro link se necessário.')}finally{B(false)}}
 async function finish(){B(true);E('');try{const r=await db.auth.signOut({scope:'local'});if(r.error)throw r.error;onDone()}catch{E('Não foi possível encerrar esta sessão. Tente novamente.')}finally{B(false)}}
 return <main className="login"><section className="login-card"><span className="eyebrow">EXXEVENTOS</span><h1>Definir nova senha</h1>{saved?<><p role="status">Senha alterada com sucesso. Entre novamente com sua nova senha.</p><button disabled={busy} onClick={finish}>Voltar para entrar</button></>:invalid||!session?<><p role="alert">Este link é inválido ou expirou. Volte à entrada e use Esqueci minha senha para solicitar outro.</p><button disabled={busy} onClick={finish}>Voltar para entrar</button></>:<form onSubmit={save}><fieldset disabled={busy}><label>Nova senha<input type="password" name="nova" autoComplete="new-password" minLength={8} required/></label><label>Confirmar nova senha<input type="password" name="confirmar" autoComplete="new-password" minLength={8} required/></label><div className="actions"><button>Salvar nova senha</button><button type="button" className="back" onClick={finish}>Cancelar</button></div></fieldset></form>}{error&&<p role="alert" className="error">{error}</p>}</section></main>
}
