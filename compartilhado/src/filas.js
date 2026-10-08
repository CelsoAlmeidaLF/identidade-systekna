/* ================= filas (Firestore pela API REST, 1.2) ================= */
// O transporte entre os apps deixa de ser copiar e colar. São duas filas e um diretório no Firestore:
//   fila-solicitacao/{nonce}  pedido assinado, cifrado para quem atende (Governança ou serviço)
//   fila-emissao/{nonce}      aprovação ou reprovação assinada, cifrada para quem pediu
//   diretorio/{did}           nome e chave de cifragem da Governança e dos serviços (e o cartão do serviço), assinados
// O Firestore só carrega envelopes smsg1 (X25519 + AES-256-GCM): quem abre o banco não lê nome nem DID de quem pede.
// Quem recebe confere a assinatura Ed25519 como antes. Sem login (prova de conceito no plano gratuito): as regras
// do Firestore só conferem o formato; forjar um pedido ou uma aprovação continua impossível sem a chave.
const FILAS={projeto:'systekna-identidade',intervalo:30000};
const fsBase=()=>`https://firestore.googleapis.com/v1/projects/${FILAS.projeto}/databases/(default)/documents`;
const fsUrl=(col,id)=>`${fsBase()}/${col}${id?'/'+encodeURIComponent(id):''}`;
const fsCampos=o=>({fields:Object.fromEntries(Object.entries(o).map(([k,v])=>[k,typeof v==='number'?{integerValue:String(v)}:{stringValue:String(v)}]))});
const fsDoc=d=>{const o={id:decodeURIComponent(d.name.split('/').pop())};for(const[k,v]of Object.entries(d.fields||{}))o[k]=v.stringValue!==undefined?v.stringValue:+v.integerValue;return o};
async function fsPedir(url,init={}){
  let r;
  // Content-Type só com corpo: leitura e remoção saem sem preflight de CORS.
  try{r=await fetch(url,{...init,headers:init.body?{'Content-Type':'application/json'}:{},cache:'no-store',credentials:'omit',referrerPolicy:'no-referrer'})}
  catch{throw new Error('Sem conexão com as filas. Confira a internet e tente de novo.')}
  if(r.status===404)return null;
  if(!r.ok){let m='';try{m=(await r.json()).error.status}catch{}throw new Error(m==='ALREADY_EXISTS'?'Este item já está na fila.':`As filas recusaram o pedido (${r.status}${m?' '+m:''}).`)}
  return init.method==='DELETE'?true:r.json();
}
const fsCriar=(col,id,o)=>fsPedir(`${fsUrl(col)}?documentId=${encodeURIComponent(id)}`,{method:'POST',body:JSON.stringify(fsCampos(o))});
const fsGravar=(col,id,o)=>fsPedir(fsUrl(col,id),{method:'PATCH',body:JSON.stringify(fsCampos(o))});
const fsLer=async(col,id)=>{const d=await fsPedir(fsUrl(col,id));return d&&fsDoc(d)};
const fsApagar=(col,id)=>fsPedir(fsUrl(col,id),{method:'DELETE'}).catch(()=>false);
async function fsOnde(col,campo,valor){
  const q={structuredQuery:{from:[{collectionId:col}],where:{fieldFilter:{field:{fieldPath:campo},op:'EQUAL',value:{stringValue:valor}}},limit:50}};
  const l=await fsPedir(`${fsBase()}:runQuery`,{method:'POST',body:JSON.stringify(q)});
  return(l||[]).filter(x=>x.document).map(x=>fsDoc(x.document));
}

// Pedido: cifrado para a chave X25519 de quem atende, endereçado ao DID dele.
async function enviarSolicitacao(para,tok,nonce){
  await fsCriar('fila-solicitacao',nonce,{para:para.did,env:await sealFor(para.x,tok),criado:Date.now()});
}
// Pedidos endereçados a este DID. Os que não abrem (cifrados para outra chave ou alterados) ficam de fora.
async function buscarSolicitacoes(quem=ses){
  const out=[];
  for(const d of await fsOnde('fila-solicitacao','para',quem.did)){
    try{out.push({id:d.id,tok:await openMsg(d.env,quem)})}catch{out.push({id:d.id,erro:true})}
  }
  return out;
}
// Resposta (um ou vários tokens assinados), cifrada para a chave X25519 que veio no pedido.
async function enviarEmissao(para,x,nonce,toks){
  await fsCriar('fila-emissao',nonce,{para,env:await sealFor(x,JSON.stringify(toks)),criado:Date.now()});
}
async function buscarEmissao(nonce,quem=ses){
  const d=await fsLer('fila-emissao',nonce);
  if(!d)return null;
  try{const l=JSON.parse(await openMsg(d.env,quem));return Array.isArray(l)?l.map(String):null}catch{return null}
}

// Diretório: cada Governança e cada serviço publica, assinado pela própria chave, o nome e a chave de cifragem.
async function publicarDiretorio(tipo,name,extra={}){
  const jwt=await signJWT('diretorio+jwt',{iss:ses.did,tipo,name,x:ses.xMb,iat:now(),...extra});
  await fsGravar('diretorio',ses.did,{tipo,jwt,atualizado:Date.now()});
}
// Só entra o que a própria chave do DID assinou: um registro trocado no banco não passa.
async function lerDiretorio(tipo){
  const out=[];
  for(const d of await fsOnde('diretorio','tipo',tipo)){
    try{
      const r=await verifyJWT(d.jwt,'diretorio+jwt'),p=r.payload;
      if(r.ok&&r.did===d.id&&p.tipo===tipo&&typeof p.x==='string'){parseXKey(p.x);out.push({did:r.did,name:String(p.name||''),x:p.x,payload:p})}
    }catch{}
  }
  return out.sort((a,b)=>a.name.localeCompare(b.name));
}

// Busca periódica enquanto o app está aberto e desbloqueado.
let filasTimer=null;
function iniciarFilas(fn){pararFilas();const roda=()=>{if(ses)fn().catch(()=>{})};roda();filasTimer=setInterval(roda,FILAS.intervalo)}
function pararFilas(){if(filasTimer)clearInterval(filasTimer);filasTimer=null}
