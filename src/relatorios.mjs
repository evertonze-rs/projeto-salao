import {jsPDF} from 'jspdf';
import {autoTable} from 'jspdf-autotable';
import {moeda,resumo} from './finance.mjs';
import {formatDate} from './dates.mjs';
const txt=v=>String(v??'—').replace(/\u00a0|\u202f/g,' ');
export async function todos(factory){
 let result=[];for(let offset=0;;offset+=500){const {data,error}=await factory().range(offset,offset+499);if(error)throw error;result.push(...data);if(data.length<500)return result}
}
export async function dadosFicha(db,evento,financeiro){
 const queries=[todos(()=>db.from('tarefas').select('*').eq('evento_id',evento.id).order('ordem').order('id')),todos(()=>db.from('detalhes_evento').select('*').eq('evento_id',evento.id).order('ordem').order('id'))];
 if(financeiro)queries.push(todos(()=>db.from('itens_evento').select('*').eq('evento_id',evento.id).order('ordem').order('id')),todos(()=>db.from('pagamentos').select('*').eq('evento_id',evento.id).order('data').order('id')));
 const [tarefas,detalhes,itens=[],pagamentos=[]]=await Promise.all(queries);return {tarefas,detalhes,itens,pagamentos};
}
export function modeloFicha(evento,salao,data,options=false,financeiro=false){
 const o=typeof options==='object'?options:{dados:true,servicos:true,detalhes:true,checklist:true,financeiro:options,pagamentos:options,anotacoes:true};
 const info=typeof salao==='string'?{nome:salao}:salao||{},e=evento.detalhes||{},sections=[];
 if(o.dados)sections.push({title:'Dados do evento',headers:['Campo','Informação','Campo','Informação'],rows:[['Tipo',evento.tipo,'Convidados',evento.convidados??'—'],['Situação',evento.status,'Telefone',e.Telefone||'—'],['E-mail',e.Email||'—','Responsável',e['Mãe']||e.Pai||'—'],['Fotos',e.Fotos||'—','Filmagem',e.Filmagem||'—']]});
 if(o.servicos&&data.itens.length)sections.push({title:'Serviços contratados',headers:o.financeiro&&financeiro?['Serviço','Quantidade','Valor']:['Serviço','Quantidade'],rows:data.itens.filter(i=>Number(i.total)>0||i.categoria==='pacote').map(i=>o.financeiro&&financeiro?[i.descricao,i.quantidade,moeda(i.total)]:[i.descricao,i.quantidade])});
 if(o.detalhes)sections.push({title:'Detalhes da festa',headers:['Item','Orientação'],rows:data.detalhes.map(d=>[d.nome,d.campo_tipo==='checkbox'?(d.marcado?'Sim':'Não'):d.valor_texto||'—'])});
 if(o.anotacoes)sections.push({title:'Anotações',headers:['Responsável / observações'],rows:[['________________________________________________________________________'],['________________________________________________________________________']]});
 if(o.checklist)sections.push({title:'Checklist de acompanhamento',pageBreakBefore:true,headers:['Tarefa','Situação','Conferência no dia'],rows:data.tarefas.map(t=>[t.titulo,t.concluida?'Concluída':'Pendente','________________'])});
 if(o.financeiro&&financeiro){const t=resumo(data.itens,data.pagamentos);sections.push({title:'Resumo financeiro',pageBreakBefore:true,headers:['Contratado','Recebido líquido','Saldo a receber / crédito (-)'],rows:[[moeda(t.total),moeda(t.pago),moeda(t.saldo)]]});if(o.pagamentos)sections.push({title:'Histórico financeiro',headers:['Data','Movimento','Valor','Forma / recebedor','Detalhe'],rows:data.pagamentos.map(p=>[formatDate(p.data),p.natureza==='devolucao'?'Devolução':'Recebimento',moeda((p.natureza==='devolucao'?-1:1)*Number(p.valor)),[p.forma_pagamento,p.pago_para].filter(Boolean).join(' / ')||'—',p.detalhe||'—'])})}
 if(evento.cancelamento_justificativa&&o.dados)sections.push({title:'Cancelamento',headers:['Justificativa'],rows:[[evento.cancelamento_justificativa]]});
 return {title:evento.cliente,subtitle:formatDate(evento.data),salao:info.nome||'Salão',salaoInfo:info,sections};
}
export async function prepararPDF(model){
 let logoData=model.logoData;
 const logo=model.salaoInfo?.logo;
 if(!logoData&&logo){
  if(logo.startsWith('data:image/'))logoData=logo;
  else if(logo.startsWith('/brand/')){const response=await fetch(logo);if(!response.ok)throw Error('Logo indisponível');const blob=await response.blob();logoData=await new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result);reader.onerror=reject;reader.readAsDataURL(blob)})}
 }
 if(logoData&&typeof document!=='undefined'){
  const img=new Image();img.src=logoData;await img.decode();
  if(Math.max(img.width,img.height)>800){const scale=800/Math.max(img.width,img.height),canvas=document.createElement('canvas');canvas.width=Math.round(img.width*scale);canvas.height=Math.round(img.height*scale);canvas.getContext('2d').drawImage(img,0,0,canvas.width,canvas.height);logoData=canvas.toDataURL('image/png')}
 }
 return criarPDF({...model,logoData});
}
export function criarPDF(model){
 const doc=new jsPDF({unit:'mm',format:'a4',orientation:model.landscape?'landscape':'portrait'}),width=doc.internal.pageSize.getWidth(),height=doc.internal.pageSize.getHeight();
 doc.setProperties({title:model.title,subject:model.subtitle,author:model.salao,creator:'Projeto Salão'});
 let y=55;for(const section of model.sections){if((section.pageBreakBefore&&y>55)||y>height-42){doc.addPage();y=55}doc.setFont('helvetica','bold');doc.setFontSize(11);doc.setTextColor(30,65,60);doc.text(txt(section.title),16,y);y+=4;
 autoTable(doc,{startY:y,head:[section.headers.map(txt)],body:(section.rows.length?section.rows:[section.headers.map((_,i)=>i===0?'Nenhum registro no período.':'')]).map(r=>r.map(txt)),theme:'striped',margin:{top:55,bottom:20,left:16,right:16},styles:{font:'helvetica',fontSize:9,cellPadding:3,overflow:'linebreak',textColor:[45,55,60]},headStyles:{fillColor:[30,65,60],textColor:[255,255,255],fontStyle:'bold',fontSize:9},alternateRowStyles:{fillColor:[245,248,247]},rowPageBreak:'avoid'});y=doc.lastAutoTable.finalY+12;}
 const total=doc.getNumberOfPages(),emissao=new Intl.DateTimeFormat('pt-BR',{timeZone:'America/Sao_Paulo',dateStyle:'short',timeStyle:'short'}).format(new Date());
 for(let i=1;i<=total;i++){
 doc.setPage(i);doc.setFillColor(30,65,60);doc.rect(0,0,width,3,'F');const info=model.salaoInfo||{},offset=model.logoData?40:16;
 if(model.logoData){const props=doc.getImageProperties(model.logoData),h=26,w=h*props.width/props.height;doc.addImage(model.logoData,props.fileType,16,7,Math.min(w,22),h,undefined,'FAST')}
 doc.setTextColor(30,65,60);doc.setFont('helvetica','bold');doc.setFontSize(12);doc.text(txt(model.salao),offset,13);
 doc.setFont('helvetica','normal');doc.setFontSize(8);doc.setTextColor(80);const contact=[info.endereco,info.cnpj?`CNPJ: ${info.cnpj}`:'',[info.telefone,info.email].filter(Boolean).join(' · ')].filter(Boolean).join(' · ');doc.text(doc.splitTextToSize(txt(contact),width-offset-16).slice(0,2),offset,19);
 doc.setFont('helvetica','bold');doc.setFontSize(17);doc.setTextColor(30,65,60);doc.text(doc.splitTextToSize(txt(model.title),width-32).slice(0,1),16,35);doc.setFontSize(12);doc.text(doc.splitTextToSize(txt(model.subtitle),width-32).slice(0,2),16,43);
 doc.setFont('helvetica','normal');doc.setDrawColor(210);doc.line(16,height-16,width-16,height-16);doc.setFontSize(8);doc.setTextColor(95);doc.text(`Emitido em ${emissao} · Uso interno`,16,height-10);doc.text(`${i} / ${total}`,width-16,height-10,{align:'right'});
 }
 return doc;
}
