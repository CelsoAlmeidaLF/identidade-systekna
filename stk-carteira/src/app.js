/* ================= serviço ================= */
// A versão básica guarda só credenciais. Itens de outros tipos (cofre, contatos, emissores confiáveis da versão
// completa) ficam intactos no aparelho e no backup, mas não aparecem aqui.
const KEPT_TYPES=['cred','perfil','acesso','cofre'];
// Tipo "cartao" da versão 0.6 (antigo, sem uso): é apagado ao abrir e ignorado ao restaurar backup.
const REMOVED_TYPES=['cartao'];

const APP={
  db:'systekna-carteira',dominio:'',label:'Carteira',dataKeys:['items'],createdMsg:'Carteira criada',autoDefault:3,
  importHint:'Junta as credenciais do backup às que já estão aqui',
  howHtml:`<p><b>12 palavras.</b> São 128 bits de aleatoriedade no padrão BIP39. Delas saem, por HKDF, a chave Ed25519 que forma o seu DID e assina, a chave X25519 que recebe mensagens cifradas e a chave AES-256-GCM que cifra a carteira.</p>
  <p><b>Pedido.</b> Para receber uma credencial, a carteira assina um pedido com a sua chave. O emissor confere essa assinatura e só então sabe que quem pede controla o DID.</p>
  <p><b>Credencial.</b> É uma afirmação sobre você assinada pela chave do emissor. Ela fica cifrada aqui e não serve sozinha como prova.</p>
  <p><b>Apresentação.</b> Quem verifica gera um desafio novo. A carteira embrulha a credencial e assina junto com esse desafio. Assim o verificador confere que a credencial é verdadeira e que foi o dono quem apresentou, agora. Uma cópia antiga não passa.</p>
  <p><b>Filas.</b> Pedidos e respostas passam pelo Firestore, sem copiar e colar: cada pedido vai cifrado para a chave de quem atende e cada resposta volta cifrada para quem pediu. O banco só transporta; quem confere a assinatura é este aparelho. Sem login (prova de conceito): alguém pode gravar lixo na fila, mas não forjar nem ler.</p>
  <p><b>PIN.</b> Ele só destrava as chaves neste aparelho, em duas camadas: PBKDF2-SHA256 com 600 mil iterações e uma chave do aparelho que o navegador não deixa exportar. Seis dígitos são 1 milhão de combinações, então em produção o PIN deve ser conferido por hardware seguro.</p>`,
  async load(){
    ses.items=[];
    for(const r of (await DB.get('items'))||[]){try{ses.items.push({rec:r,data:await unseal(ses.vaultKey,r,r.id)})}catch{}}
    const n=ses.items.length;
    ses.items=ses.items.filter(i=>!REMOVED_TYPES.includes(i.data.type));
    ses.purged=n-ses.items.length;
    if(ses.purged)await persistItems();
    // Identidades extras (Profissional, personalizada) saem das mesmas 12 palavras, com domínio próprio.
    ses.ids={};
    for(const it of perfilItens())if(it.data.n>0)ses.ids[it.data.n]=await derivarPerfil(it.data.n);
  },
  enter(){if(ses.purged)toast(`${ses.purged} ${ses.purged===1?'cartão antigo removido':'cartões antigos removidos'}`);renderId();renderCofre();mountCommonSettings($('#commonSet'));setView('vCreds');iniciarFilas(sincronizar)},
  onView(v){if(v==='vCreds')renderCreds()},
  onLock(){
    pararFilas();
    ['#cList','#mOpenOut','#cfL'].forEach(s=>$(s).innerHTML='');
    ['#mSealed','#mText','#mIn','#mTo','#cfBusca'].forEach(s=>$(s).value='');cofreBusca='';
    $('#mSealOut').hidden=true;
  },
  exportData:async()=>(await DB.get('items'))||[],
  async importData(recs){
    let n=0,k=0;
    for(const r of recs||[]){try{const d=await unseal(ses.vaultKey,r,r.id);if(REMOVED_TYPES.includes(d.type))continue;const i=ses.items.findIndex(x=>x.rec.id===r.id);if(i>=0)ses.items[i]={rec:r,data:d};else ses.items.push({rec:r,data:d});if(d.type==='cofre'){if(d.kind==='anotacao')k++}else if(KEPT_TYPES.includes(d.type))n++}catch{}}
    for(const it of perfilItens())if(it.data.n>0&&!ses.ids[it.data.n])ses.ids[it.data.n]=await derivarPerfil(it.data.n);
    await persistItems();renderCreds();renderCofre();
    return `${n} ${n===1?'credencial restaurada':'credenciais restauradas'}${k?` e ${k} ${k===1?'anotação':'anotações'} do cofre`:''}`;
  }
};
async function persistItems(){await DB.set('items',ses.items.map(i=>i.rec))}
async function saveItem(data,id){
  id=id||b64u.enc(rnd(9));
  const rec={id,...await seal(ses.vaultKey,data,id)};
  const i=ses.items.findIndex(x=>x.rec.id===id);
  if(i>=0)ses.items[i]={rec,data};else ses.items.push({rec,data});
  await persistItems();
}
$('#dockAdd').onclick=()=>actionMenu();
$('#dockShow').onclick=()=>present();

/* ================= identidades ================= */
// Cada identidade tem nome, perfil (Identidade, Profissional ou Personalizada, com o nome do perfil) e um DID
// próprio, derivado da semente das 12 palavras pelo número dela: nº 0 é a identidade de sempre (o DID não muda);
// as outras usam o domínio perfil/<n> no HKDF. Pode haver quantas a pessoa quiser, inclusive do mesmo perfil.
const PERFIS={identidade:'Identidade',profissional:'Profissional',personalizada:'Personalizada'};
const perfilItens=()=>ses.items.filter(i=>i.data.type==='perfil');
const perfilDe=n=>(perfilItens().find(i=>i.data.n===n)||{}).data;
async function derivarPerfil(n){
  const seed=await wordsToSeed(await entropyToWords(ses.ent,ses.lang));
  try{return await deriveIdentity(seed,`perfil/${n}`)}finally{seed.fill(0)}
}
const subDe=d=>d.sub||decodeJWT(d.jwt).payload.sub;
const aprovacaoDe=did=>creds().find(c=>c.data.vtype==='IdentityCredential'&&subDe(c.data)===did);
// Registros da 0.17.0 (apelido Pessoal/Profissional/outro) viram nome + perfil, com o mesmo número e o mesmo DID.
function normalizar(d,n,did){
  const a=did&&aprovacaoDe(did);
  const nome=d&&d.nome||d&&d.pedido&&d.pedido.nome||(a?credMain(a.data):'');
  if(d&&d.perfil)return{nome,perfil:d.perfil,rotulo:d.rotulo||''};
  const ap=d&&d.apelido||'';
  if(n===0||ap==='Pessoal')return{nome,perfil:'identidade',rotulo:''};
  if(ap==='Profissional')return{nome,perfil:'profissional',rotulo:''};
  return{nome,perfil:'personalizada',rotulo:ap};
}
const perfilTxt=x=>x.perfil==='personalizada'?`Personalizada: ${x.rotulo}`:PERFIS[x.perfil]||'Identidade';
function identidades(){
  const out=[{n:0,id:ses,...normalizar(perfilDe(0),0,ses.did)}];
  for(const it of perfilItens()){const d=it.data;if(d.n>0&&ses.ids&&ses.ids[d.n])out.push({n:d.n,id:ses.ids[d.n],...normalizar(d,d.n,ses.ids[d.n].did)})}
  return out.sort((a,b)=>a.n-b.n);
}
const idDoDid=did=>identidades().find(x=>x.id.did===did);
// Pedido em aberto: enviado pela fila, sem resposta e dentro dos 7 dias. Pedidos de antes da 1.2 (sem número)
// nunca terão resposta pela fila: contam como vencidos.
const pedidoAberto=ped=>!!ped&&!!ped.nonce&&!ped.recusa&&Date.now()-ped.at<PEDIDO_VALE;
function estadoId(x){
  const c=aprovacaoDe(x.id.did),cs=c&&credState(c.data)[0],ped=(perfilDe(x.n)||{}).pedido;
  if(c&&cs==='ok')return 'aprovada';
  if(pedidoAberto(ped))return 'aguardando';
  if(c&&cs==='warn')return 'aprovação perto de vencer';
  if(ped&&ped.recusa)return 'reprovada: '+ped.recusa;
  if(c)return 'aprovação vencida';
  if(ped&&!ped.respondido)return 'pedido vencido';
  return 'sem aprovação';
}
// Só vai para a lista do Solicitar quem ainda não foi validado: aprovadas (mesmo vencidas), reprovadas e aguardando
// ficam de fora. Entram as sem aprovação e as de pedido vencido (sem resposta em 7 dias).
const podePedir=x=>['sem aprovação','pedido vencido'].includes(estadoId(x));
// Cartão pontilhado em Credenciais: identidade aguardando, reprovada ou com pedido vencido.
const pedidosId=()=>identidades().filter(x=>{const ped=(perfilDe(x.n)||{}).pedido,e=estadoId(x);return ped&&!ped.respondido&&!ped.dispensado&&(e==='aguardando'||e==='pedido vencido'||e.startsWith('reprovada'))});
const idPendCard=x=>{
  const ped=perfilDe(x.n).pedido,e=estadoId(x),ab=e==='aguardando';
  const pill=ab?['warn','Aguardando']:ped.recusa?['no','Reprovada: '+ped.recusa]:['no','Pedido vencido: peça de novo'];
  return `<div class="glass flat card pend idpend" data-idpend="${x.n}"><div class="kr" style="padding:0"><div class="h"><small>Identidade · ${esc(perfilTxt(x))}</small><span class="pill ${pill[0]}">${esc(pill[1])}</span></div><div class="v">${esc(x.nome||ped.nome||'Sem nome')}</div><div class="v sub" style="margin-top:4px">${esc(shortDid(x.id.did))} · pedido em ${fmtDate(ped.at)}</div><button class="link" data-idcancel="${x.n}" style="margin:6px 0 0;padding:0;font-size:13px">${ab?'Cancelar pedido':'Dispensar'}</button></div></div>`;
};
// Cancelar (aguardando) apaga o pedido da fila remota; dispensar só limpa o aviso: a reprovada continua reprovada
// (fora da lista do Solicitar) e a de pedido vencido pode ser enviada de novo.
async function cancelarPedidoId(n){
  const ped=(perfilDe(n)||{}).pedido;if(!ped)return;
  const ab=pedidoAberto(ped);
  if(ab&&!await confirmSheet('Cancelar pedido','O pedido sai da fila da Governança. Se ela já tiver aberto o pedido, a resposta não chega mais aqui. Depois você pode pedir de novo.','Cancelar pedido',true))return;
  if(ab&&ped.nonce)await fsApagar('fila-solicitacao',ped.nonce);
  await guardarPerfil(n,{pedido:ped.recusa?{...ped,dispensado:true}:null});
  renderCreds();toast(ab?'Pedido cancelado':'Aviso dispensado');
}
async function guardarPerfil(n,mudar){
  const it=perfilItens().find(i=>i.data.n===n),ts=Date.now();
  const base=it?it.data:{type:'perfil',n,pedido:null,created:ts};
  await saveItem({...base,...mudar,updated:ts},it&&it.rec.id);
}

/* ================= credenciais ================= */
const creds=()=>ses.items.filter(i=>i.data.type==='cred').sort((a,b)=>b.data.created-a.data.created);
const CLOCK_SKEW=60;
// Perto do vencimento: 20% da validade, entre 7 e 30 dias. A credencial ainda vale, mas a carteira avisa.
const soonWindow=d=>Math.min(30*86400,Math.max(7*86400,.2*(d.exp-(d.iat||d.exp))));
function credState(d){
  if(!d.exp)return['ok','Sem validade'];
  const left=d.exp-now();
  if(left<=0)return['no','Vencida'];
  if(left<=soonWindow(d)){const n=Math.ceil(left/86400);return['warn',n===1?'Vence amanhã':`Vence em ${n} dias`]}
  return['ok','Até '+fmtDate(d.exp*1000)];
}
const usable=d=>credState(d)[0]!=='no';
function credMain(d){
  const p=decodeJWT(d.jwt).payload,cl=vcClaims(p);
  return cl.length?fmtVal(cl[0][1]):vcLabel(d.vtype);
}
// Cartão: o tipo (na identidade, o perfil: Identidade, Profissional, Personalizada: Clube), o nome, o DID
// com o botão de copiar e, por último, quem emitiu e a validade. Cada perfil tem a sua cor.
function credCard(it,asDiv){
  if(it.data.vtype==='BadgeCredential')return crachaCard(it,asDiv);
  const d=it.data,[st,stl]=credState(d),tag=asDiv?'div':'button',did=subDe(d);
  const dono=d.vtype==='IdentityCredential'?idDoDid(did):null,tipo=dono?perfilTxt(dono):vcLabel(d.vtype);
  return `<${tag} class="cred g-${esc(d.vtype)}${dono?' p-'+esc(dono.perfil):''} ${st==='no'?'dim':''}" ${asDiv?'':`data-cid="${it.rec.id}"`}><div class="r1"><b class="tipo">${esc(tipo)}</b>${ic('badge')}</div><div class="main">${esc(credMain(d))}</div><div class="did"><span class="mono" title="${esc(did)}">${esc(shortDid(did))}</span><span class="cp" role="button" tabindex="0" aria-label="Copiar DID" data-copydid="${esc(did)}">${ic('copy')}</span></div><div class="r3"><span class="emissor">${esc(d.issuerName)}</span><span class="pill on-card">${stl}</span></div></${tag}>`;
}
// Cartão próprio do crachá: CRACHÁ: APP, a organização, a cv:key (com copiar), a identidade que o usa e a validade.
function crachaCard(it,asDiv){
  const d=it.data,[st,stl]=credState(d),tag=asDiv?'div':'button',p=decodeJWT(d.jwt).payload,cs=(p.vc&&p.vc.credentialSubject)||{};
  const cv=cvKey(d.jti),dono=idDoDid(subDe(d));
  return `<${tag} class="cred g-BadgeCredential cracha ${st==='no'?'dim':''}" ${asDiv?'':`data-cid="${it.rec.id}"`}><div class="r1"><b class="tipo">CRACHÁ: APP ${esc(cs.app||'')}</b>${ic('badge')}</div><div class="main">${esc(cs.servico||d.issuerName)}</div><div class="did"><span class="mono cv" title="${esc(cv)}">${esc(cv)}</span><span class="cp" role="button" tabindex="0" aria-label="Copiar cv:key" data-copydid="${esc(cv)}" data-copylabel="cv:key copiada">${ic('copy')}</span></div><div class="r3"><span class="quem">Identidade: ${esc(dono?perfilTxt(dono):shortDid(subDe(d)))}</span><span class="pill on-card">${stl}</span></div></${tag}>`;
}
// O botão de copiar fica dentro do cartão: copia a did:key (ou a cv:key) sem abrir a credencial.
function copiarDidDoCartao(e){
  const c=e.target.closest('[data-copydid]');if(!c)return false;
  if(e.type==='keydown'&&e.key!=='Enter'&&e.key!==' ')return false;
  e.preventDefault();e.stopPropagation();copy(c.dataset.copydid,c.dataset.copylabel||'DID copiado');return true;
}
// Pedidos de acesso em andamento ou recusados: um cartão pontilhado por pedido, acima das credenciais.
const acessos=()=>ses.items.filter(i=>i.data.type==='acesso').sort((a,b)=>b.data.at-a.data.at);
const acessoCard=it=>{const d=it.data,rec=d.status==='recusado';return `<div class="glass flat card pend acesso" data-acesso="${esc(d.nonce)}"><div class="kr" style="padding:0"><div class="h"><small>Acesso a ${esc(d.apps.join(', '))}</small><span class="pill ${rec?'no':'warn'}">${rec?'Recusado: '+esc(d.motivo||''):'Aguardando'}</span></div><div class="v">${esc(d.servico)}</div><div class="v sub" style="margin-top:4px">${esc(d.perfil)} · pedido em ${fmtDate(d.at)}</div></div></div>`};
function renderCreds(){
  if(!ses)return;
  const list=creds(),peds=acessos(),pids=pedidosId();
  $('#cNote').hidden=!list.length;
  $('#cList').innerHTML=list.length||peds.length||pids.length?`<div class="creds">${pids.map(idPendCard).join('')}${peds.map(acessoCard).join('')}${list.map(i=>credCard(i)).join('')}</div>`
    :`<div class="glass flat card"><b>A carteira ainda não tem credenciais</b><ol class="steps">
      <li><span>Toque em <b>+</b> e escolha <b>Solicitar aprovação de identidade</b>. O pedido é assinado e prova que você controla o DID.</span></li>
      <li><span>O pedido vai pela fila para a <b>Governança Systekna</b>, que confere e aprova a identidade.</span></li>
      <li><span>A aprovação volta sozinha pela fila e fica cifrada aqui.</span></li></ol></div>`;
}
$('#cList').onclick=e=>{if(copiarDidDoCartao(e))return;const x=e.target.closest('[data-idcancel]');if(x)return cancelarPedidoId(+x.dataset.idcancel);const b=e.target.closest('[data-cid]');if(b)showCred(b.dataset.cid)};
$('#cList').addEventListener('keydown',e=>{if(e.target.closest('[data-copydid]'))copiarDidDoCartao(e)});

function actionMenu(){
  const row=(k,icn,t,s)=>`<button class="tx" data-act="${k}"><span class="dot">${ic(icn)}</span><span class="t"><b>${t}</b><small>${s}</small></span>${ic('chev')}</button>`;
  openSheet(`<h3>O que você quer fazer?</h3><div class="list glass flat" style="margin-top:12px">
    ${row('ask','send','Solicitar aprovação de identidade','Envia o pedido assinado à Governança')}
    ${row('access','badge','Solicitar acesso a um app','Escolhe o serviço e pede o crachá')}
    ${row('get','inbox','Buscar respostas','Aprovações, crachás e recusas que chegaram nas filas')}
    ${row('show','scan','Apresentar credencial','Responde ao desafio de quem verifica')}</div>`);
  $('#sheetBody').onclick=e=>{const b=e.target.closest('[data-act]');if(!b)return;({ask:askCred,get:buscarAgora,access:pedirAcesso,show:()=>present()})[b.dataset.act]()};
}

// Solicitar aprovação de identidade à Governança (STK). Passo 1: escolher uma identidade ou criar uma nova
// (nome, perfil e, na Personalizada, o nome do perfil). Passo 2: o pedido sai assinado pelo DID dela, com o nome
// e o perfil. A aprovação assinada pela STK leva só o nome (DP-03).
function askCred(){
  const ids=identidades().filter(podePedir);let sel=ids.length?ids[0].n:'novo';
  const opcao=x=>`<button class="choice" data-n="${x.n}" aria-pressed="${x.n===sel}"><span class="rd"></span><span class="t"><b>${esc(x.nome||'Sem nome')} · ${esc(perfilTxt(x))}</b><small>${estadoId(x)} · ${esc(shortDid(x.id.did))}</small></span></button>`;
  openSheet(`<h3>Solicitar aprovação de identidade</h3><p class="sub">Escolha a identidade ou crie uma nova. Todas saem das suas 12 palavras, cada uma com um DID próprio. As já aprovadas, reprovadas ou aguardando não aparecem aqui.</p>
    <div class="list glass flat" id="aqL">${ids.map(opcao).join('')}<button class="choice" data-n="novo" aria-pressed="${sel==='novo'}"><span class="rd"></span><span class="t"><b>+ Nova identidade</b><small>Nome e perfil novos, com um DID novo</small></span></button></div>
    <label class="f" id="aqNF"><span>Nome</span><input id="aqN" autocomplete="name" placeholder="Como deve aparecer na identidade"></label>
    <label class="f"><span>Perfil</span><select id="aqP">${Object.entries(PERFIS).map(([k,v])=>`<option value="${k}">${v}</option>`).join('')}</select></label>
    <label class="f" id="aqRF" hidden><span>Nome do perfil</span><input id="aqR" autocomplete="off" placeholder="Ex.: Clube, Associação, Igreja"></label>
    <label class="f" id="aqEF"><span>Governança</span><select id="aqE"><option value="">Buscando…</option></select></label><p class="hint" id="aqEH">O pedido vai cifrado pela fila: só essa Governança consegue ler.</p>
    <label class="f"><span>Observação (opcional)</span><input id="aqO" autocomplete="off"></label>
    <button class="btn" id="aqGo">Enviar pedido</button>`);
  let govs=[];
  lerDiretorio('governanca').then(l=>{
    govs=l;if(!$('#aqE'))return;
    $('#aqE').innerHTML=l.length?l.map(g=>`<option value="${esc(g.did)}">${esc(g.name||'Governança')} · ${esc(shortDid(g.did))} · ${fmtDate(g.iat*1000)}</option>`).join(''):'<option value="">Nenhuma Governança publicada</option>';
    const pad=GOVERNANCA_PADRAO.did&&l.find(g=>g.did===GOVERNANCA_PADRAO.did);if(pad)$('#aqE').value=pad.did;
  }).catch(e=>{if($('#aqE'))$('#aqE').innerHTML=`<option value="">${esc(e.message)}</option>`});
  const preencher=()=>{
    const x=ids.find(i=>i.n===sel);
    $('#aqN').value=x?x.nome:'';$('#aqP').value=x?x.perfil:'identidade';$('#aqR').value=x?x.rotulo:'';
    $('#aqRF').hidden=$('#aqP').value!=='personalizada';
  };
  preencher();
  $('#aqP').onchange=()=>{$('#aqRF').hidden=$('#aqP').value!=='personalizada'};
  $('#aqL').onclick=e=>{const b=e.target.closest('[data-n]');if(!b)return;sel=b.dataset.n==='novo'?'novo':+b.dataset.n;$('#aqL').querySelectorAll('[data-n]').forEach(x=>x.setAttribute('aria-pressed',x===b));preencher()};
  $('#aqGo').onclick=async()=>{
    const name=$('#aqN').value.trim(),perfil=$('#aqP').value,rotulo=perfil==='personalizada'?$('#aqR').value.trim():'';
    if(!name){shake($('#aqNF'));$('#aqN').focus();return}
    if(perfil==='personalizada'&&!rotulo){shake($('#aqRF'));$('#aqR').focus();return}
    const pii=piiProblem({nome:name,perfil:rotulo});if(pii)return toast(pii,true);
    const gov=govs.find(g=>g.did===$('#aqE').value),EH=$('#aqEH');
    if(!gov){EH.textContent='Escolha a Governança. Sem conexão, o pedido não sai.';EH.classList.add('bad');shake($('#aqEF'));return}
    EH.classList.remove('bad');
    let n=sel;
    if(n==='novo'){n=Math.max(0,...perfilItens().map(i=>i.data.n))+1;ses.ids[n]=await derivarPerfil(n)}
    const quem=n===0?ses:ses.ids[n],iat=now(),dados={nome:name,perfil,rotulo},nonce=b64u.enc(rnd(16));
    // O pedido leva a chave de cifragem da identidade: a resposta volta cifrada para ela.
    const tok=await signJWT('pedido+jwt',{iss:quem.did,sub:quem.did,aud:gov.did,name,perfil,perfilNome:rotulo,apelido:perfilTxt(dados),wanted:'IdentityCredential',note:$('#aqO').value.trim(),x:quem.xMb,nonce,iat,exp:iat+7*86400},quem);
    $('#aqGo').disabled=true;
    try{await enviarSolicitacao(gov,tok,nonce)}catch(e){$('#aqGo').disabled=false;EH.textContent=e.message;EH.classList.add('bad');return}
    await guardarPerfil(n,{...dados,apelido:undefined,pedido:{at:Date.now(),nome:name,nonce,gov:gov.did}});
    closeSheet();renderId();renderCreds();toast(`Pedido enviado à ${gov.name||'Governança'}`);
  };
}

/* ================= acesso a apps: pedir e receber crachá (CV:KEY) ================= */
// Identidades com aprovação válida e a Governança que aprovou cada uma.
const aprovadas=()=>identidades().map(x=>({x,c:aprovacaoDe(x.id.did)})).filter(o=>o.c&&credState(o.c.data)[0]!=='no');
function pedirAcesso(){
  openSheet(`<h3>Solicitar acesso a um app</h3><p class="sub">Escolha o serviço. A carteira lê o cartão dele e confere que o serviço foi aprovado pela mesma Governança que aprovou a sua identidade.</p>
    <div class="list glass flat" id="paS"><div class="empty">Buscando serviços…</div></div><p class="hint" id="paH"></p><div id="paStep"></div>`);
  let srvs=[];
  lerDiretorio('servico').then(l=>{
    srvs=l.filter(x=>typeof x.payload.cartao==='string');if(!$('#paS'))return;
    $('#paS').innerHTML=srvs.length?srvs.map(x=>`<button class="choice" data-srv="${esc(x.did)}" aria-pressed="false"><span class="rd"></span><span class="t"><b>${esc(x.name||'Serviço')}</b><small class="mono">${esc(shortDid(x.did))}</small></span></button>`).join(''):'<div class="empty">Nenhum serviço publicado ainda.</div>';
  }).catch(e=>{if($('#paS'))$('#paS').innerHTML=`<div class="empty">${esc(e.message)}</div>`});
  $('#paS').onclick=e=>{const b=e.target.closest('[data-srv]');if(!b)return;$('#paS').querySelectorAll('[data-srv]').forEach(x=>x.setAttribute('aria-pressed',x===b));const x=srvs.find(s=>s.did===b.dataset.srv);if(x)lerCartao(x)};
  async function lerCartao(srv){
    const H=$('#paH'),fail=m=>{H.textContent=m;H.classList.add('bad');$('#paStep').innerHTML=''};
    H.textContent='';H.classList.remove('bad');
    const ok=aprovadas();
    if(!ok.length)return fail('Você ainda não tem identidade aprovada. Use + › Solicitar aprovação de identidade.');
    let r;try{r=await verifyJWT(srv.payload.cartao,'cartao+jwt')}catch(e){return fail(e.message)}
    if(!r.ok)return fail('A assinatura do cartão não confere: ele foi alterado.');
    if(r.did!==srv.did)return fail('O cartão não é deste serviço.');
    // A Governança aprova o serviço; os apps e as funcionalidades são dele e vêm no cartão, assinado pelo serviço.
    const c=r.payload,t0=now(),govs=new Set(ok.map(o=>o.c.data.issuerDid));
    const soApp=typeof c.app==='string'?c.app:'',lista=[...new Set((Array.isArray(c.apps)?c.apps:[]).map(String))].filter(x=>!soApp||x===soApp);
    let aprovado=false;
    for(const tok of Array.isArray(c.aprovacoes)?c.aprovacoes:[]){
      try{
        const a=await verifyJWT(tok,'vc+jwt'),q=a.payload;
        if(a.ok&&vcType(q)==='ServiceAccreditationCredential'&&q.sub===r.did&&govs.has(a.did)&&!(q.exp&&q.exp<=t0))aprovado=true;
      }catch{}
    }
    if(!aprovado)return fail('Este serviço não foi aprovado pela mesma Governança da sua identidade.');
    if(!lista.length)return fail(soApp?'Este cartão não traz o app.':'Este serviço ainda não tem apps.');
    const ids=ok.filter(o=>govs.has(o.c.data.issuerDid)),marcado=soApp?'true':'false';
    // O catálogo mostra o que cada app faz: as funcionalidades e os grupos delas. Quem libera é o serviço.
    const cat=new Map((Array.isArray(c.catalogo)?c.catalogo:[]).map(a=>[String(a.nome),a]));
    const detalhe=nome=>{const a=cat.get(nome);if(!a)return '';const fns=(a.funcoes||[]).map(f=>String(f.nome)),gr=(a.grupos||[]).map(g=>String(g.nome));
      return [fns.length?'Funcionalidades: '+fns.join(', '):'',gr.length?'Grupos: '+gr.join(', '):''].filter(Boolean).map(t=>`<small class="blk">${esc(t)}</small>`).join('')};
    $('#paStep').innerHTML=`${verdictHtml(true,esc(soApp?`${soApp} · ${c.name||'Serviço'}`:c.name||'Serviço'),`Serviço aprovado pela Governança da sua identidade.`)}
      <div class="sec-h">Apps</div><div class="list glass flat" id="paApps">${lista.map(a=>`<button class="choice" data-app="${esc(a)}" aria-pressed="${marcado}"><span class="rd"></span><span class="t"><b>${esc(a)}</b>${detalhe(a)}</span></button>`).join('')}</div>
      <label class="f"><span>Identidade que vai usar o crachá</span><select id="paI">${ids.map(o=>`<option value="${o.x.n}">${esc(credMain(o.c.data))} · ${esc(perfilTxt(o.x))}</option>`).join('')}</select></label>
      <button class="btn" id="paGo">Enviar pedido</button>`;
    $('#paApps').onclick=e=>{const b=e.target.closest('[data-app]');if(b)b.setAttribute('aria-pressed',b.getAttribute('aria-pressed')!=='true')};
    $('#paGo').onclick=async()=>{
      const escolhidos=[...$('#paApps').querySelectorAll('[aria-pressed="true"]')].map(b=>b.dataset.app);
      if(!escolhidos.length)return toast('Escolha ao menos um app',true);
      const o=ids.find(i=>i.x.n===+$('#paI').value)||ids[0],quem=o.x.id,iat=now(),nonce=b64u.enc(rnd(16));
      const tok=await signJWT('pedido+jwt',{iss:quem.did,sub:quem.did,aud:r.did,name:credMain(o.c.data),perfil:perfilTxt(o.x),wanted:'BadgeCredential',apps:escolhidos,identidade:o.c.data.jwt,servico:c.name||'',note:'',x:quem.xMb,nonce,iat,exp:iat+7*86400},quem);
      $('#paGo').disabled=true;
      try{await enviarSolicitacao(srv,tok,nonce)}catch(e){$('#paGo').disabled=false;return toast(e.message,true)}
      await saveItem({type:'acesso',nonce,servico:c.name||'Serviço',srvDid:r.did,apps:escolhidos,did:quem.did,perfil:perfilTxt(o.x),status:'aguardando',at:Date.now()});
      closeSheet();renderCreds();toast(`Pedido enviado a ${c.name||'o serviço'}`);
    };
  }
}
// Crachá que chegou pela fila: vira um cartão verde; o pedido sai de "aguardando" quando todos os apps chegaram.
async function aceitarCracha(tok){
  const r=await verifyJWT(tok),p=r.payload;
  if(r.header.typ!=='vc+jwt'||!p.vc||vcType(p)!=='BadgeCredential')throw new Error('Isto não é um crachá de acesso.');
  if(!r.ok)throw new Error('A assinatura não confere: o crachá foi alterado.');
  if(!idDoDid(p.sub))throw new Error('Este crachá foi emitido para outro DID.');
  // Só o serviço a quem a pessoa pediu pode entregar o crachá.
  if(!acessos().some(i=>i.data.srvDid===r.did&&i.data.did===p.sub))throw new Error('Este crachá não é de um serviço a quem você pediu acesso.');
  const t0=now();
  if(p.exp&&p.exp<=t0)throw new Error(`Este crachá venceu em ${fmtDate(p.exp*1000)}.`);
  if(p.nbf&&p.nbf>t0+CLOCK_SKEW)throw new Error(`Este crachá só vale a partir de ${fmtDate(p.nbf*1000)}.`);
  if(creds().some(c=>c.data.jti===p.jti))throw new Error('Este crachá já está na carteira.');
  const ts=Date.now(),app=(p.vc.credentialSubject||{}).app;
  await saveItem({type:'cred',title:'Crachá',vtype:'BadgeCredential',jwt:r.tok,jti:p.jti,sub:p.sub,issuerName:vcIssuerName(p),issuerDid:r.did,iat:p.iat,exp:p.exp||0,created:ts,updated:ts});
  for(const it of acessos().filter(i=>i.data.srvDid===r.did&&i.data.did===p.sub&&i.data.status==='aguardando'&&i.data.apps.includes(app))){
    const resto=it.data.apps.filter(a=>a!==app);
    if(resto.length)await saveItem({...it.data,apps:resto},it.rec.id);
    else{ses.items=ses.items.filter(i=>i.rec.id!==it.rec.id);await persistItems()}
  }
  return 'Crachá guardado';
}

// Aprovação de identidade que chegou pela fila: a carteira confere a assinatura e guarda na identidade certa, pelo DID.
async function aceitarCredencial(tok){
  const r=await verifyJWT(tok),p=r.payload;
  if(!p.vc||r.header.typ!=='vc+jwt')throw new Error('Isto não é uma credencial verificável.');
  if(!r.ok)throw new Error('A assinatura não confere: a credencial foi alterada ou não foi emitida por quem diz.');
  const dono=idDoDid(p.sub);
  if(!dono)throw new Error('Esta credencial foi emitida para outro DID.');
  const t0=now();
  if(p.exp&&p.exp<=t0)throw new Error(`Esta credencial venceu em ${fmtDate(p.exp*1000)}. Peça uma nova ao emissor.`);
  if(p.nbf&&p.nbf>t0+CLOCK_SKEW)throw new Error(`Esta credencial só vale a partir de ${fmtDate(p.nbf*1000)}.`);
  if(creds().some(c=>c.data.jti===p.jti))throw new Error('Esta credencial já está na carteira.');
  // Só a Governança a quem a identidade pediu pode entregar a aprovação (achado A2 da revisão de criptografia).
  const pf=perfilDe(dono.n);
  if(!pf||!pf.pedido||pf.pedido.gov!==r.did)throw new Error('Esta aprovação não veio da Governança a quem você pediu.');
  const t=vcType(p),ts=Date.now();
  await saveItem({type:'cred',title:vcLabel(t),vtype:t,jwt:r.tok,jti:p.jti,sub:p.sub,issuerName:vcIssuerName(p),issuerDid:r.did,iat:p.iat,exp:p.exp||0,created:ts,updated:ts});
  return 'Credencial guardada';
}

/* ================= filas: buscar as respostas ================= */
// Pedidos em aberto: os de identidade (no perfil) e os de acesso. Cada resposta é cifrada para a identidade
// que pediu; a carteira abre com a chave dela, confere e apaga o item da fila.
async function sincronizar(){
  if(!ses)return 0;
  let n=0;
  for(const x of identidades()){
    const p=perfilDe(x.n),ped=p&&p.pedido;
    if(!pedidoAberto(ped))continue;
    const toks=await buscarEmissao(ped.nonce,x.id);if(!toks)continue;
    for(const t of toks){try{await receberResposta(t,x);n++}catch{}}
    const atual=perfilDe(x.n);if(atual&&atual.pedido&&atual.pedido.nonce===ped.nonce&&!atual.pedido.recusa)await guardarPerfil(x.n,{pedido:{...atual.pedido,nonce:null,respondido:Date.now()}});
    await fsApagar('fila-emissao',ped.nonce);
  }
  for(const it of acessos().filter(i=>i.data.status==='aguardando')){
    const quem=idDoDid(it.data.did);if(!quem)continue;
    const toks=await buscarEmissao(it.data.nonce,quem.id);if(!toks)continue;
    for(const t of toks){try{await receberResposta(t,quem);n++}catch{}}
    await fsApagar('fila-emissao',it.data.nonce);
  }
  if(n){renderCreds();renderId();toast(n===1?'Chegou 1 resposta':`Chegaram ${n} respostas`)}
  return n;
}
async function receberResposta(tok,x){
  const{header}=decodeJWT(tok);
  if(header.typ==='recusa+jwt')return aceitarRecusa(tok,x);
  const{payload}=decodeJWT(tok);
  return vcType(payload)==='BadgeCredential'?aceitarCracha(tok):aceitarCredencial(tok);
}
// Recusa assinada: de um pedido de identidade (Governança) ou de acesso (serviço). O número do pedido diz qual.
async function aceitarRecusa(tok,x){
  const r=await verifyJWT(tok,'recusa+jwt'),p=r.payload;
  if(!r.ok)throw new Error('A assinatura da recusa não confere.');
  if(!idDoDid(p.sub))throw new Error('Esta recusa é para outro DID.');
  const motivo=String(p.motivo||'Sem motivo');
  const it=acessos().find(i=>i.data.nonce===p.nonce&&i.data.srvDid===r.did);
  if(it){await saveItem({...it.data,status:'recusado',motivo},it.rec.id);return 'Recusa registrada'}
  const pf=x&&perfilDe(x.n);
  if(pf&&pf.pedido&&pf.pedido.nonce===p.nonce&&pf.pedido.gov===r.did){await guardarPerfil(x.n,{pedido:{...pf.pedido,recusa:motivo}});return 'Recusa registrada'}
  throw new Error('Não há pedido seu com este número.');
}
async function buscarAgora(){
  closeSheet();
  try{const n=await sincronizar();if(!n)toast('Nenhuma resposta nova')}catch(e){toast(e.message,true)}
}

function showCred(id){
  const it=ses.items.find(i=>i.rec.id===id);if(!it)return;
  const d=it.data,p=decodeJWT(d.jwt).payload,[st,stl]=credState(d);
  const rows=vcClaims(p).map(([k,v])=>`<div class="kr"><div class="h"><small>${esc(k)}</small></div><div class="v">${esc(fmtVal(v))}</div></div>`).join('');
  openSheet(`${credCard(it,true)}
    <div class="sec-h">Afirmações</div><div class="list glass flat">${rows||'<div class="empty">Sem afirmações.</div>'}</div>
    <div class="sec-h">Origem</div><div class="list glass flat">
      <div class="kr"><div class="h"><small>Emissor</small></div><div class="v">${esc(d.issuerName)}</div><div class="v mono" style="margin-top:4px">${esc(d.issuerDid)}</div></div>
      <div class="kr"><div class="h"><small>Emitida em</small><span class="pill ${st}">${stl}</span></div><div class="v">${p.iat?fmtDate(p.iat*1000):'Não informado'}</div></div></div>
    <details class="raw"><summary>Ver credencial (JWT)</summary><p>É este texto que o emissor assinou. Sozinho, ele não serve como prova de posse.</p><pre class="mono">${esc(d.jwt)}</pre></details>
    <button class="btn" id="scP">Apresentar</button>
    <button class="btn ghost" id="scD" style="color:var(--out)">Remover da carteira</button>`);
  $('#sheetBody').onclick=e=>copiarDidDoCartao(e);
  $('#scP').onclick=()=>present(id);
  $('#scD').onclick=async()=>{
    if(!await confirmSheet('Remover credencial','Ela sai desta carteira. O registro no emissor continua igual, e você pode pedir outra.','Remover',true))return;
    ses.items=ses.items.filter(i=>i.rec.id!==id);await persistItems();renderCreds();toast('Credencial removida');
  };
}

function present(preId){
  openSheet(`<h3>Apresentar credencial</h3><p class="sub">Cole o desafio de quem vai verificar. Ele muda a cada vez, então uma apresentação copiada não serve de novo.</p>
    <label class="f" id="apF"><span>Desafio</span><textarea class="mono" id="apT" rows="4" spellcheck="false" placeholder="eyJhbGciOiJFZERTQSIs…"></textarea></label><p class="hint" id="apH"></p>
    <button class="btn" id="apGo">Ler desafio</button><div id="apStep"></div>`);
  $('#apGo').onclick=async()=>{
    const H=$('#apH'),fail=m=>{H.textContent=m;H.classList.add('bad');shake($('#apF'));$('#apStep').innerHTML=''};
    H.textContent='';H.classList.remove('bad');
    let r;try{r=await verifyJWT($('#apT').value)}catch(e){return fail(e.message)}
    const q=r.payload;
    if(r.header.typ!=='desafio+jwt')return fail('Isto não é um desafio. Peça a quem verifica para gerar um.');
    if(!r.ok)return fail('A assinatura do desafio não confere. Não responda.');
    if(q.exp<now())return fail('Este desafio expirou. Peça um novo.');
    const all=creds().filter(c=>usable(c.data));
    const fit=q.accept&&q.accept!=='any'?all.filter(c=>c.data.vtype===q.accept):all;
    let pick=(fit.find(c=>c.rec.id===preId)||fit[0]||{}).rec;pick=pick&&pick.id;
    $('#apStep').innerHTML=`<div class="list glass flat mt">
        <div class="kr"><div class="h"><small>Quem pede</small></div><div class="v">${esc(q.name||'Verificador')}</div><div class="v mono" style="margin-top:4px">${esc(r.did)}</div></div>
        <div class="kr"><div class="h"><small>Para quê</small></div><div class="v">${esc(q.purpose||'Não informado')}</div></div>
        <div class="kr"><div class="h"><small>O que exige</small></div><div class="v">${q.accept&&q.accept!=='any'?esc(vcLabel(q.accept)):'Qualquer credencial'}</div></div></div>
      ${fit.length?`<div class="sec-h">Escolha a credencial</div><div class="list glass flat" id="apC">${fit.map(c=>`<button class="choice" data-pk="${c.rec.id}" aria-pressed="${c.rec.id===pick}"><span class="rd"></span><span class="t"><b>${esc(vcLabel(c.data.vtype))}: ${esc(credMain(c.data))}</b><small>${(x=>x?esc(perfilTxt(x))+' · ':'')(idDoDid(subDe(c.data)))}Emitida por ${esc(c.data.issuerName)}</small></span></button>`).join('')}</div>
        <button class="btn" id="apSign">Assinar e apresentar</button>`
        :verdictHtml(false,'Nenhuma credencial serve','Você não tem uma credencial válida do tipo exigido. Peça uma ao emissor.')}
      <div id="apOut"></div>`;
    $('#apC')&&($('#apC').onclick=e=>{const b=e.target.closest('[data-pk]');if(!b)return;pick=b.dataset.pk;$('#apC').querySelectorAll('[data-pk]').forEach(x=>x.setAttribute('aria-pressed',x===b))});
    $('#apSign')&&($('#apSign').onclick=async()=>{
      // Quem apresenta é a identidade dona da credencial: a prova é assinada pelo DID dela.
      const c=ses.items.find(i=>i.rec.id===pick),iat=now(),quem=(idDoDid(subDe(c.data))||{id:ses}).id;
      const vp=embrulhar(await signJWT('vp+jwt',{iss:quem.did,sub:quem.did,aud:r.did,nonce:q.nonce,iat,exp:iat+300,vp:{'@context':VC_CONTEXT,type:['VerifiablePresentation'],holder:quem.did,verifiableCredential:[c.data.jwt]}},quem));
      $('#apOut').innerHTML=`<label class="f"><span>Apresentação assinada, válida por 5 minutos</span><textarea class="mono" rows="5" readonly id="apJ">${vp}</textarea></label><button class="btn ghost" id="apCp">Copiar apresentação</button>`;
      $('#apCp').onclick=()=>copy(vp,'Apresentação copiada');toast('Apresentação assinada');
    });
  };
}

/* ================= identidade e mensagens ================= */
function didDoc(){
  const d=ses.did;
  return{'@context':['https://www.w3.org/ns/did/v1','https://w3id.org/security/suites/ed25519-2020/v1','https://w3id.org/security/suites/x25519-2020/v1'],id:d,
    verificationMethod:[{id:`${d}#${ses.edMb}`,type:'Ed25519VerificationKey2020',controller:d,publicKeyMultibase:ses.edMb}],
    authentication:[`${d}#${ses.edMb}`],assertionMethod:[`${d}#${ses.edMb}`],
    keyAgreement:[{id:`${d}#${ses.xMb}`,type:'X25519KeyAgreementKey2020',controller:d,publicKeyMultibase:ses.xMb}]};
}
async function renderId(){
  const meta=await DB.get('meta');
  $('#idDid').textContent=ses.did;$('#idDid2').textContent=ses.did;$('#idX').textContent=ses.xMb;
  $('#idCreated').textContent=meta?'Criada em '+fmtDate(meta.created):'';
  $('#idDoc').textContent=JSON.stringify(didDoc(),null,2);
}
document.querySelectorAll('[data-copyid]').forEach(b=>b.onclick=()=>copy(b.dataset.copyid==='did'?ses.did:ses.xMb));
wireSeg($('#mSeg'),(b,i)=>{$('#mA').hidden=i!==0;$('#mB').hidden=i!==1});
$('#mMe').onclick=()=>{$('#mTo').value=ses.xMb};
$('#mSeal').onclick=async()=>{
  if(!$('#mTo').value.trim()){$('#mTo').focus();return toast('Informe a chave do destinatário',true)}
  if(!$('#mText').value){$('#mText').focus();return toast('Escreva a mensagem',true)}
  // Depois de cifrar, o texto original sai da caixa: na tela fica só a mensagem cifrada.
  try{$('#mSealed').value=await sealFor($('#mTo').value,$('#mText').value);$('#mText').value='';$('#mSealOut').hidden=false;toast('Mensagem cifrada')}
  catch(e){toast(e.message,true)}
};
$('#mCopy').onclick=()=>copy($('#mSealed').value);
$('#mOpen').onclick=async()=>{
  const out=$('#mOpenOut');if(!$('#mIn').value.trim()){$('#mIn').focus();return}
  try{const t=await openMsg($('#mIn').value);out.innerHTML=`<div class="list glass flat mt"><div class="kr"><div class="h"><small>Mensagem decifrada</small></div><div class="v">${esc(t)}</div></div></div>`}
  catch(e){out.innerHTML=`<div class="mt">${verdictHtml(false,'Não foi possível decifrar',esc(e.message))}</div>`}
};

boot();
