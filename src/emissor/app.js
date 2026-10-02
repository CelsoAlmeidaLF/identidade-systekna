/* ================= vários emissores no aparelho ================= */
// Raiz e serviço ficam separados: cada emissor tem banco, PIN, biometria e bloqueio próprios.
// Trocar de emissor bloqueia o atual e recarrega a página no outro. O emissor 0 é o banco original.
const SLOTS_KEY='systekna-emissores',ACTIVE_KEY='systekna-emissor-ativo',DEFAULT_NAME='Emissor de Credenciais Systekna';
const lsGet=k=>{try{return localStorage.getItem(k)}catch{return null}},lsSet=(k,v)=>{try{localStorage.setItem(k,v)}catch{}};
function slots(){
  let l;try{l=JSON.parse(lsGet(SLOTS_KEY))}catch{}
  return Array.isArray(l)&&l.some(x=>x.id==='0')?l:[{id:'0',name:DEFAULT_NAME},...(Array.isArray(l)?l:[])];
}
const saveSlots=l=>lsSet(SLOTS_KEY,JSON.stringify(l));
const SLOT=slots().find(x=>x.id===lsGet(ACTIVE_KEY))||slots()[0];
const slotDb=id=>id==='0'?'systekna-cartorio':`systekna-cartorio-${id}`;
function switchSlot(id){
  if(ses&&ses.ent)ses.ent.fill(0);
  lsSet(ACTIVE_KEY,id);location.reload();
}
const slotLabel=x=>`${esc(x.name)}${x.derived?' <span class="pill warn">derivado · demonstração</span>':''}`;
// Mostra no PIN e nas boas-vindas qual emissor está sendo aberto, e deixa trocar.
function paintSlotBars(){
  const many=slots().length>1;
  const html=`<span>Emissor: <b>${slotLabel(SLOT)}</b></span>${many?'<button class="link" data-slotpick style="margin:0;padding:0">Trocar</button>':''}`;
  $('#slotBar').innerHTML=html;
  // Nas boas-vindas do derivado: só se abre com as palavras da raiz, então "Criar" não aparece.
  $('#slotBarW').innerHTML=html+(SLOT.derived?'<span class="note">Derivado das 12 palavras da raiz: use Recuperar com 12 palavras e digite as palavras da raiz. Só para demonstração: quem tiver essas palavras abre os dois emissores.</span>':'');
  for(const el of [$('#slotBar'),$('#slotBarW')])el.hidden=!many&&!SLOT.derived;
  $('#goCreate').hidden=!!SLOT.derived;
}
document.addEventListener('click',e=>{if(e.target.closest('[data-slotpick]'))pickSlot()});
function pickSlot(){
  openSheet(`<h3>Trocar de emissor</h3><p class="sub">O emissor atual é bloqueado, e o outro abre com o PIN dele.</p>
    <div class="list glass flat">${slots().map(x=>`<button class="tx" data-to="${esc(x.id)}" ${x.id===SLOT.id?'disabled':''}><span class="dot">${ic('gov')}</span><span class="t"><b>${slotLabel(x)}</b><small>${x.id===SLOT.id?'Aberto agora':'Tocar para abrir'}</small></span>${x.id===SLOT.id?'':ic('chev')}</button>`).join('')}</div>`);
  $('#sheetBody').onclick=e=>{const b=e.target.closest('[data-to]');if(b&&!b.disabled)switchSlot(b.dataset.to)};
}
paintSlotBars();

/* ================= serviço ================= */
let st=null;
const APP={
  db:slotDb(SLOT.id),path:SLOT.derived?`servico/${SLOT.id}`:'',label:'Emissor',dataKeys:['state'],createdMsg:'Emissor criado',autoDefault:10,
  importHint:'Substitui o livro e os registros deste emissor',
  howHtml:`<p><b>Papel.</b> O emissor também verifica credenciais. Ele tem a própria identidade soberana, criada com 12 palavras como qualquer titular, e assina com a chave Ed25519 dela.</p>
  <p><b>Emissão.</b> Só emite para quem prova controlar um DID: o titular envia um pedido assinado pela carteira. A credencial leva o DID do titular, o nome do emissor e um número de status.</p>
  <p><b>Verificação.</b> O desafio é um número aleatório válido por 10 minutos e aceito uma única vez. Na apresentação, o emissor confere a assinatura do titular, o desafio, a assinatura de quem emitiu a credencial, se ela é do titular, se quem a emitiu é confiável, a revogação e a validade.</p>
  <p><b>Revogação.</b> Fica no registro deste emissor e vale para tudo o que ele verifica. Em produção, a lista de status é publicada para que qualquer verificador consulte.</p>
  <p><b>Livro.</b> Cada ato guarda o hash SHA-256 do ato anterior e é assinado pelo emissor. Alterar ou apagar um ato quebra a corrente, e a conferência de integridade mostra onde.</p>
  <p><b>Limite.</b> Os dados ficam cifrados neste aparelho. Num emissor real, o livro e a lista de status ficariam replicados em servidores, e a chave do emissor num módulo de hardware (HSM).</p>`,
  async load(){
    const r=await DB.get('state');
    st=r?await unseal(ses.vaultKey,r,'state'):null;
    if(!st){st={name:SLOT.id==='0'?DEFAULT_NAME:SLOT.name,issued:[],trust:[],book:[],challenges:[],seq:0,verifs:0};await ato('abertura','Livro aberto e emissor criado',ses.did);await save()}
    if(!st.credenciamentos)st.credenciamentos=[];
    renameSlot(st.name);
  },
  enter(){paintWho();fillTypeSelects();mountCommonSettings($('#commonSet'));setView('vPanel')},
  onView(v){if(v==='vPanel')renderPanel();if(v==='vGov')renderGov()},
  onLock(){
    st=null;pedido=null;
    ['#pAtos','#pBook','#iWho','#iClaims','#vpOut','#gTrust','#gIssued','#gCred','#iOk'].forEach(s=>$(s).innerHTML='');
    ['#iqT','#iJwt','#vChalT','#vpT'].forEach(s=>$(s).value='');
    ['#iForm','#iOut','#vChal'].forEach(s=>$(s).hidden=true);
    $('#whoLabel').textContent='Emissor de Credenciais';
  },
  exportData:async()=>st,
  async importData(d){
    if(!d||!d.book)return 'Backup sem livro de registros';
    st=d;if(!st.credenciamentos)st.credenciamentos=[];await save();renameSlot(st.name);paintWho();renderPanel();
    return `Emissor restaurado com ${st.book.length} atos`;
  }
};
function renameSlot(name){const l=slots(),x=l.find(y=>y.id===SLOT.id);if(x&&x.name!==name){x.name=name;SLOT.name=name;saveSlots(l);paintSlotBars()}}
// O papel do emissor fica sempre à vista no topo.
const paintWho=()=>{$('#whoLabel').textContent=`${st.name} · ${isService()?'Serviço':'Raiz'}`};
const save=async()=>DB.set('state',await seal(ses.vaultKey,st,'state'));
const ATO_IC={abertura:'gov',emissao:'stamp',revogacao:'x',verificacao:'scan',registro:'file',confianca:'shield',nome:'note',politica:'shield',grupo:'user'};
async function ato(act,text,ref){
  const prev=st.book.length?st.book[st.book.length-1].hash:'0'.repeat(64);
  const e={n:st.book.length+1,at:Date.now(),act,text,ref:ref||null,prev};
  e.hash=hex(await sha256(te.encode(JSON.stringify(e))));
  e.sig=b64u.enc(await S.sign({name:'Ed25519'},ses.edPriv,te.encode(e.hash)));
  st.book.push(e);
}
async function checkBook(){
  const pub=await S.importKey('raw',ses.edPub,{name:'Ed25519'},false,['verify']);
  let prev='0'.repeat(64);
  for(const e of st.book){
    const body={n:e.n,at:e.at,act:e.act,text:e.text,ref:e.ref,prev:e.prev};
    const h=hex(await sha256(te.encode(JSON.stringify(body))));
    if(e.prev!==prev||h!==e.hash||!await S.verify({name:'Ed25519'},pub,b64u.dec(e.sig),te.encode(e.hash)))return{ok:false,at:e.n};
    prev=e.hash;
  }
  return{ok:true,n:st.book.length};
}
const atoRow=(e,full)=>`<div class="ato"><span class="n">${e.n}</span><span class="dot">${ic(ATO_IC[e.act]||'book')}</span><div class="t"><b>${esc(e.text)}</b><small>${fmtTime(e.at)}</small>${full?`<br><code>${e.hash}</code>`:''}</div></div>`;
const issStatus=i=>i.revoked?['no','Revogada']:(i.exp&&i.exp<now())?['warn','Expirada']:['ok','Ativa'];
const trustedName=did=>did===ses.did?st.name:(st.trust.find(t=>t.did===did)||{}).name;
const CLOCK_SKEW=60;
// Credencial de outro emissor: a revogação não pode ser conferida aqui. A política decide (padrão: recusar).
const unverifiableStatus=()=>st.acceptUnverifiable?null:false;
const unverifiableMsg='Emitida por outro emissor: o status não pode ser conferido aqui.';

/* ================= painel ================= */
async function renderPanel(){
  if(!st)return;
  $('#pName').textContent=st.name;
  $('#sA').textContent=st.issued.filter(i=>issStatus(i)[0]==='ok').length;
  $('#sR').textContent=st.issued.filter(i=>i.revoked).length;
  $('#sT').textContent=st.trust.length;$('#sV').textContent=st.verifs;
  $('#pAtos').innerHTML=st.book.slice(-6).reverse().map(e=>atoRow(e)).join('');
  const c=await checkBook();
  $('#pBook').innerHTML=c.ok?verdictHtml(true,'Livro íntegro',`${c.n} ${c.n===1?'ato encadeado e assinado':'atos encadeados e assinados'} pelo emissor.`)
    :verdictHtml(false,'Livro adulterado',`A corrente se rompe no ato nº ${c.at}. Restaure um backup.`);
  $('#pBook').firstElementChild.style.marginTop='0';
}
$('#pAll').onclick=()=>{
  openSheet(`<h3>Livro de registros</h3><p class="sub">Cada ato carrega o hash do anterior e a assinatura do emissor.</p><button class="btn" id="bkChk" style="margin-top:0">Conferir integridade</button><div id="bkRes"></div><div class="list glass flat mt">${st.book.slice().reverse().map(e=>atoRow(e,true)).join('')}</div>`);
  $('#bkChk').onclick=async()=>{const c=await checkBook();$('#bkRes').innerHTML=c.ok?verdictHtml(true,'Livro íntegro',`Os ${c.n} atos conferem do primeiro ao último.`):verdictHtml(false,'Livro adulterado',`A corrente se rompe no ato nº ${c.at}.`)};
};

/* ================= emissão ================= */
// Papel do emissor: sem credenciamento é raiz (STK) e aprova Identidades e credencia serviços;
// com credenciamento é serviço (SRV) e aprova Crachás para os apps dele.
// Uma vez credenciado, o emissor segue serviço: se o credenciamento vencer, ele para de dar acesso, não vira raiz.
const isService=()=>st.credenciamentos.length>0;
const ROOT_TYPES=['IdentityCredential','AccreditationCredential'],SRV_TYPES=['BadgeCredential'];
const issuableTypes=()=>isService()?SRV_TYPES:ROOT_TYPES;
function fillTypeSelects(){
  const opts=issuableTypes().map(k=>`<option value="${k}">${VC_TYPES[k].label}</option>`).join('');
  $('#iType').innerHTML=opts;
  $('#vType').innerHTML=`<option value="any">Qualquer credencial</option>`+holderTypes().map(([k,v])=>`<option value="${k}">${v.label}</option>`).join('');
}
$('#vType').onchange=()=>{$('#vAcc').hidden=$('#vType').value!=='BadgeCredential'};
let pedido=null;
const claimRow=(k,v)=>`<div class="claim"><label class="f"><span>Campo</span><input data-ck value="${esc(k)}" autocomplete="off" autocapitalize="none"></label><label class="f"><span>Valor</span><input data-cv value="${esc(v)}" autocomplete="off"></label><button class="mini" data-rm aria-label="Remover campo">${ic('minus')}</button></div>`;
function drawClaims(){
  const badge=$('#iType').value==='BadgeCredential';
  // Crachá: em vez de campos livres, o SRV marca os apps que aprova.
  $('#iClaims').innerHTML=badge?'':VC_TYPES[$('#iType').value].claims.map(([k,v])=>claimRow(k,(k==='nome'||k==='servico')&&pedido?pedido.payload.name||'':k==='apps'&&pedido?appsList(pedido.payload.note).join(', '):v)).join('');
  $('#iAdd').hidden=badge;
  drawBadgePicks();
}
// Um crachá (CV:KEY) por app marcado. Os apps pedidos já vêm marcados.
function drawBadgePicks(){
  const box=$('#iAcc'),cr=activeAccreditation(),badge=$('#iType').value==='BadgeCredential';
  box.hidden=!badge||!cr;if(box.hidden){box.innerHTML='';return}
  const want=appsList(pedido&&pedido.payload.servicos).map(normApp);
  box.innerHTML=`<div class="sec-h">Crachás a aprovar (um por app)</div><div class="list glass flat">${appsList(cr.apps).map(a=>`<div class="tx" data-acc="${esc(a)}"><label class="t" style="display:flex;gap:10px;align-items:center"><input type="checkbox" data-on ${want.includes(normApp(a))?'checked':''}><b>${esc(a)}</b>${want.includes(normApp(a))?'<small>pedido</small>':''}</label></div>`).join('')}</div>`;
}
$('#iType').onchange=()=>{
  // Crachá e credenciamento sempre com validade de até 1 ano.
  if(['BadgeCredential','AccreditationCredential'].includes($('#iType').value)&&(!+$('#iDays').value||+$('#iDays').value>PRAZO_MAX_DIAS))$('#iDays').value='365';
  drawClaims();
};
$('#iClaims').onclick=e=>{const b=e.target.closest('[data-rm]');if(b)b.closest('.claim').remove()};
$('#iAdd').onclick=()=>{$('#iClaims').insertAdjacentHTML('beforeend',claimRow('',''));$('#iClaims').lastElementChild.querySelector('input').focus()};
$('#iqGo').onclick=async()=>{
  const H=$('#iqH'),fail=m=>{H.textContent=m;H.classList.add('bad');shake($('#iqF'));$('#iForm').hidden=true;pedido=null};
  // Limpa a conferência anterior: o formulário só reaparece com o pedido novo.
  H.textContent='';H.classList.remove('bad');$('#iOut').hidden=true;$('#iForm').hidden=true;$('#iWho').innerHTML='';
  let r;try{r=await verifyJWT($('#iqT').value)}catch(e){return fail(e.message)}
  if(r.header.typ!=='pedido+jwt')return fail('Isto não é um pedido. Na carteira, o titular gera o pedido em + e Pedir credencial.');
  if(!r.ok)return fail('A assinatura do pedido não confere: ele foi alterado ou não foi assinado por este DID.');
  if(r.payload.exp&&r.payload.exp<now())return fail('Este pedido expirou. Peça um novo ao titular.');
  if(st.issued.some(i=>i.nonce&&i.nonce===r.payload.nonce))return fail('Este pedido já foi atendido. Peça um novo ao titular.');
  pedido=r;
  $('#iWho').innerHTML=verdictHtml(true,'Pedido conferido',`${esc(r.payload.name||'Titular sem nome')} controla ${esc(shortDid(r.did))}.${r.payload.note?' Observação: '+esc(r.payload.note):''}`);
  // O tipo aprovado é sempre o que o pedido pede: nunca se aprova um Crachá (CV:KEY) como Identidade (DID:KEY).
  const wanted=r.payload.wanted;
  if(!VC_TYPES[wanted]||VC_TYPES[wanted].legado){$('#iWho').innerHTML='';return fail('Este pedido é de um tipo antigo. Peça de novo pela carteira: Identidade ou Crachá.')}
  if(!issuableTypes().includes(wanted)){
    pedido=null;
    $('#iWho').insertAdjacentHTML('beforeend',verdictHtml(false,`Este emissor não aprova ${vcLabel(wanted)}`,esc(typeRoleMsg(wanted))));
    // Pedido de crachá num emissor ainda sem credenciamento: se este é o serviço, o credenciamento resolve ali mesmo,
    // e o pedido é conferido de novo assim que ele for importado.
    if(wanted==='BadgeCredential'&&!isService()){
      $('#iWho').insertAdjacentHTML('beforeend',`<p class="hint">Se este é o emissor do serviço, ele ainda não tem o credenciamento da STK. Importe o credenciamento (ou peça um) e o pedido é conferido de novo.</p><div class="pair mt"><button class="btn" id="iqImp">Importar credenciamento</button><button class="btn ghost" id="iqAsk">Pedir credenciamento</button></div>`);
      $('#iqImp').onclick=()=>importAccreditation();
      $('#iqAsk').onclick=()=>askAccreditation();
    }
    return;
  }
  if(wanted==='BadgeCredential'){
    const idr=await checkIdentity(r.payload.identidade,r.did);
    $('#iWho').insertAdjacentHTML('beforeend',verdictHtml(idr.ok,idr.ok?'Identidade aprovada':'Identidade não aceita',esc(idr.detail)));
    if(r.payload.servicos)$('#iWho').insertAdjacentHTML('beforeend',verdictHtml(true,'Apps pedidos',esc(appsList(r.payload.servicos).join(', '))));
  }
  $('#iType').value=wanted;$('#iTypeF').hidden=true;
  $('#iType').onchange();$('#iForm').hidden=false;
};
function prazoProblem(days,what){
  if(!days)throw new Error(`${what} precisa de validade.`);
  if(days>PRAZO_MAX_DIAS)throw new Error(`${what} vale no máximo 1 ano.`);
}
const activeOf=(sub,type)=>st.issued.filter(i=>i.type===type&&i.sub===sub&&!i.revoked&&(!i.exp||i.exp>now()));
async function revokeAll(list,reason){
  for(const i of list){
    i.revoked=true;i.revokedAt=Date.now();i.reason=reason;
    await ato('revogacao',`${vcLabel(i.type)} de ${i.holderName||shortDid(i.sub)} revogada: ${reason}`,i.jti);
  }
}
// Credenciamento recebido da STK e ainda válido (o mais recente).
const activeAccreditation=()=>st.credenciamentos.filter(c=>!c.exp||c.exp>now()).sort((a,b)=>b.iat-a.iat)[0];
const typeRoleMsg=type=>isService()
  ?'Este emissor é um serviço credenciado: ele aprova Crachás (CV:KEY) para os apps dele. Identidades (DID:KEY) e credenciamentos são aprovados pela STK.'
  :type==='BadgeCredential'?'Crachá (CV:KEY) é aprovado pelo emissor de serviço credenciado pela STK, não pela raiz. Abra o emissor do serviço (Governança › Emissores neste aparelho) e cole o pedido lá. Se ele ainda não existe, crie-o e peça o credenciamento à STK.'
  :'Este emissor aprova Identidades (DID:KEY) e credencia serviços.';
async function issue(sub,type,claims,days,holderName,nonce,ctx={}){
  if(!issuableTypes().includes(type))throw new Error(typeRoleMsg(type));
  const pii=piiProblem({...claims,...(holderName?{titular:holderName}:{})});if(pii)throw new Error(pii);
  // RN58: não há KYC na versão básica, então ninguém afirma que conferiu documentos.
  if('kycValidado'in claims)throw new Error('O KYC ainda não existe nesta versão. Tire o campo “kycValidado”.');
  let antigos=[],motivo='';
  if(type==='IdentityCredential'){
    // RN74: a Identidade define o usuário e leva só o nome. Uma ativa por DID: a nova substitui a anterior.
    if(!String(claims.nome||'').trim())throw new Error('A Identidade precisa do nome.');
    const extra=Object.keys(claims).find(k=>k!=='nome');
    if(extra)throw new Error(`A Identidade leva só o nome. Tire o campo “${extra}”.`);
    antigos=activeOf(sub,'IdentityCredential');motivo='Substituída por nova Identidade';
  }
  let evidence=null;
  if(type==='BadgeCredential'){
    // Crachá (CV:KEY): acesso a um app, para quem tem Identidade aprovada pela STK. Sem nível de acesso:
    // os apps são homologados pela STK, os dados ficam no celular e a entrada é pelo PIN.
    const extra=Object.keys(claims).find(k=>k!=='app');
    if(extra)throw new Error(`O Crachá leva só o app. Tire o campo “${extra}”.`);
    if(!String(claims.app||'').trim())throw new Error('Informe o app do crachá.');
    prazoProblem(days,'O Crachá');
    const idr=await checkIdentity(ctx.identidade,sub);if(!idr.ok)throw new Error(idr.detail);
    holderName=idr.nome||holderName;
    claims={app:String(claims.app).trim()};
    // Só os apps do credenciamento, e o credenciamento vai dentro do crachá como prova.
    const cr=activeAccreditation();
    if(!cr)throw new Error('O credenciamento deste serviço venceu. Peça um novo à STK.');
    if(!appsList(cr.apps).some(a=>normApp(a)===normApp(claims.app)))throw new Error(`O credenciamento de ${cr.issuerName} não inclui o app “${claims.app}”. Apps autorizados: ${cr.apps}.`);
    evidence=[{type:'Credenciamento',jwt:cr.jwt}];
    // Um crachá ativo por pessoa e app: o novo substitui o anterior.
    antigos=activeOf(sub,'BadgeCredential').filter(i=>normApp(i.claims.app)===normApp(claims.app));motivo='Substituído por novo crachá';
  }
  if(type==='AccreditationCredential'){
    const extra=Object.keys(claims).find(k=>!['servico','apps'].includes(k));
    if(extra)throw new Error(`O Credenciamento leva só serviço e apps. Tire o campo “${extra}”.`);
    if(!String(claims.servico||'').trim())throw new Error('Informe o nome do serviço credenciado.');
    if(!appsList(claims.apps).length)throw new Error('Informe os apps autorizados, separados por vírgula.');
    if(sub===ses.did)throw new Error('Um emissor não credencia a si mesmo.');
    prazoProblem(days,'O Credenciamento');
    claims={servico:String(claims.servico).trim(),apps:appsList(claims.apps).join(', ')};
    antigos=activeOf(sub,'AccreditationCredential');motivo='Substituído por novo credenciamento';
  }
  const n=++st.seq,iat=now(),jti='urn:uuid:'+crypto.randomUUID();
  const payload={iss:ses.did,sub,iat,nbf:iat,jti,vc:{'@context':VC_CONTEXT,type:['VerifiableCredential',type],issuer:{id:ses.did,name:st.name},issuanceDate:new Date(iat*1000).toISOString(),credentialSubject:{id:sub,...claims},credentialStatus:{id:`${ses.did}#status-${n}`,type:'SysteknaStatusRegistry',statusListIndex:n}}};
  if(days)payload.exp=iat+days*86400;
  if(evidence)payload.vc.evidence=evidence;
  const jwt=await signJWT('vc+jwt',payload);
  st.issued.push({n,jti,sub,type,claims,iat,exp:payload.exp||0,holderName:holderName||'',nonce:nonce||null,revoked:false});
  await ato('emissao',`${vcLabel(type)} emitida para ${holderName||shortDid(sub)}`,jti);
  await revokeAll(antigos,motivo);
  await save();return jwt;
}
$('#iGo').onclick=async()=>{
  if(!pedido)return;
  // O tipo vem do pedido assinado, nunca do seletor: um pedido de Identidade não vira Credenciamento.
  const type=pedido.payload.wanted,days=+$('#iDays').value,ctx={identidade:pedido.payload.identidade},toks=[];
  if(type==='BadgeCredential'){
    // Um crachá por app marcado.
    const picks=[...$('#iAcc').querySelectorAll('[data-acc]')].filter(r=>r.querySelector('[data-on]').checked).map(r=>({app:r.dataset.acc}));
    if(!picks.length){toast(activeAccreditation()?'Marque ao menos um app':'O credenciamento deste serviço venceu. Peça um novo à STK.',true);return}
    try{for(const [i,a] of picks.entries())toks.push(await issue(pedido.did,type,a,days,pedido.payload.name,i?null:pedido.payload.nonce,ctx))}
    catch(e){toast(e.message,true);if(!toks.length)return}
  }else{
    const claims={};
    $('#iClaims').querySelectorAll('.claim').forEach(c=>{const k=c.querySelector('[data-ck]').value.trim().replace(/\s+/g,'_'),v=c.querySelector('[data-cv]').value.trim();if(k&&v)claims[k]=v==='true'?true:v==='false'?false:v});
    if(!Object.keys(claims).length){toast('Preencha ao menos um campo com valor',true);return}
    try{toks.push(await issue(pedido.did,type,claims,days,pedido.payload.name,pedido.payload.nonce,ctx))}catch(e){toast(e.message,true);return}
  }
  $('#iJwt').value=toks.join('\n');
  const what=type==='BadgeCredential'?(toks.length>1?`${toks.length} crachás`:'Crachá'):vcLabel(type);
  $('#iOk').innerHTML=verdictHtml(true,'Credencial aprovada',`${esc(what)} para ${esc(pedido.payload.name||shortDid(pedido.did))}, registrado no livro.`);
  $('#iForm').hidden=true;$('#iWho').innerHTML='';$('#iOut').hidden=false;pedido=null;toast('Credencial aprovada');
};
$('#iCopy').onclick=()=>copy($('#iJwt').value,'Credencial copiada');
$('#iNew').onclick=()=>{$('#iqT').value='';$('#iOut').hidden=true;$('#iqH').textContent='';$('#iWho').innerHTML='';$('#iqT').focus()};

/* ================= verificação ================= */
$('#vGen').onclick=async()=>{
  const nonce=b64u.enc(rnd(18)),iat=now(),type=$('#vType').value,purpose=$('#vPurpose').value.trim()||'Verificação';
  // Desafio de crachá: diz o app.
  const acc=type==='BadgeCredential'?{app:$('#vApp').value.trim()}:{};
  if(type==='BadgeCredential'&&!acc.app){shake($('#vAppF'));$('#vApp').focus();return}
  $('#vChalT').value=await signJWT('desafio+jwt',{iss:ses.did,name:st.name,nonce,purpose,accept:type,...acc,iat,exp:iat+600});
  st.challenges=st.challenges.filter(c=>c.exp>iat-86400);
  st.challenges.push({nonce,type,purpose,...acc,iat,exp:iat+600,used:false});await save();
  $('#vChal').hidden=false;toast('Desafio gerado');
};
$('#vChalC').onclick=()=>copy($('#vChalT').value,'Desafio copiado');
async function checkVP(tok){
  const checks=[],add=(ok,label,detail)=>checks.push({ok,label,detail});
  let vp;
  try{vp=await verifyJWT(tok)}catch(e){add(false,'Formato',esc(e.message));return{checks}}
  if(vp.header.typ!=='vp+jwt'){
    add(false,'Formato',vp.payload.vc?'Isto é uma credencial sozinha, sem apresentação. Peça ao titular para responder a um desafio: só assim ele prova que é o dono.':'Isto não é uma apresentação.');
    return{checks};
  }
  const p=vp.payload;
  add(vp.ok,'Assinatura do titular',vp.ok?`Assinada pela chave de ${esc(shortDid(vp.did))}.`:'A apresentação foi alterada ou não foi assinada por este titular.');
  const ch=st.challenges.find(c=>c.nonce===p.nonce);
  const chOk=!!ch&&p.aud===ses.did&&!ch.used;
  add(chOk,'Desafio deste emissor',!ch?'O desafio não foi gerado aqui.':p.aud!==ses.did?'A apresentação foi feita para outro verificador.':ch.used?'Este desafio já foi usado. Pode ser uma cópia sendo reaproveitada.':`Responde ao desafio “${esc(ch.purpose)}”.`);
  add(!!ch&&ch.exp>now()&&p.exp>now(),'Dentro do prazo',p.exp<=now()?'A apresentação expirou. Gere um novo desafio.':ch&&ch.exp<=now()?'O desafio expirou.':'Apresentada dentro dos prazos.');
  const vcTok=p.vp&&p.vp.verifiableCredential&&p.vp.verifiableCredential[0];
  if(!vcTok){add(false,'Credencial','A apresentação não contém credencial.');return{checks,ch}}
  let vc;
  try{vc=await verifyJWT(vcTok,'vc+jwt')}catch(e){add(false,'Credencial',esc(e.message));return{checks,ch}}
  const q=vc.payload,t=vcType(q);
  add(vc.ok,'Assinatura do emissor',vc.ok?`Assinada por ${esc(vcIssuerName(q))}.`:'A credencial foi alterada depois de emitida.');
  add(q.sub===vp.did,'Credencial pertence ao titular',q.sub===vp.did?'O DID da credencial é o mesmo de quem apresentou.':'A credencial é de outra pessoa.');
  const tn=trustedName(vc.did);
  const srv=t==='BadgeCredential'||t==='AccessCredential';
  if(srv){
    // Crachá (e o Acesso antigo) só valem com o credenciamento dentro deles, de um emissor confiável, mesmo que o
    // serviço esteja na lista de confiança: assim a chave de um serviço nunca vale como raiz.
    const ev=((q.vc.evidence||[]).find(e=>e&&e.type==='Credenciamento')||{}).jwt;
    const raiz=(activeAccreditation()||{}).issuerDid||'';
    const cr=ev?await checkLinked(ev,'AccreditationCredential',vc.did,'O credenciamento',{raiz}):{ok:false,detail:'A credencial não traz o credenciamento do serviço.'};
    const c=(q.vc.credentialSubject||{});
    const inclui=cr.ok&&appsList(cr.payload.vc.credentialSubject.apps).some(a=>normApp(a)===normApp(c.app));
    add(inclui,'Emissor confiável',!cr.ok?esc(cr.detail):!inclui?`O credenciamento de ${esc(vcIssuerName(q))} não inclui o app ${esc(c.app)}.`
      :`${esc(vcIssuerName(q))} é credenciado por ${esc(cr.issuerName)} para ${esc(c.app)}.`);
  }else add(!!tn,'Emissor confiável',tn?`${esc(tn)} está na lista de confiança.`:'Este emissor não está na sua lista de confiança.');
  if(vc.did===ses.did){const rec=st.issued.find(i=>i.jti===q.jti);add(!!rec&&!rec.revoked,'Não revogada',!rec?'Não consta no registro de emissões.':rec.revoked?`Revogada em ${fmtDate(rec.revokedAt)}: ${esc(rec.reason)}.`:'Ativa no registro de emissões.')}
  else add(unverifiableStatus(),'Não revogada',unverifiableMsg);
  // 1.2: além do exp, confere o nbf (com folga de relógio entre aparelhos).
  const t0=now(),early=q.nbf&&q.nbf>t0+CLOCK_SKEW,late=q.exp&&q.exp<=t0;
  add(!early&&!late,'Dentro da validade',early?`Só vale a partir de ${fmtDate(q.nbf*1000)}.`:q.exp?(late?`Expirou em ${fmtDate(q.exp*1000)}.`:`Válida até ${fmtDate(q.exp*1000)}.`):'Sem data de validade.');
  if(ch&&ch.type!=='any')add(t===ch.type,'Tipo exigido',t===ch.type?`${esc(vcLabel(t))}, como pedido.`:`O desafio pedia ${esc(vcLabel(ch.type))} e veio ${esc(vcLabel(t))}.`);
  if(ch&&ch.type==='BadgeCredential'&&t==='BadgeCredential'){
    const c=q.vc.credentialSubject||{},ok=acessoServe(c,ch.app);
    add(ok,'App do crachá',ok?`Acesso a ${esc(c.app)}.`:`O crachá é para ${esc(c.app||'outro app')}, e o desafio pedia ${esc(ch.app)}.`);
  }
  let nome=t==='IdentityCredential'?(q.vc.credentialSubject||{}).nome:'';
  if(srv){
    // O crachá é atributo da Identidade: quem é a pessoa vem da Identidade apresentada junto.
    const r=await checkIdentity(p.vp.verifiableCredential[1],vp.did);
    add(r.ok,'Identidade do titular',esc(r.detail));nome=r.nome;
  }
  return{checks,ch,q,holder:vp.did,chOk,nome};
}
// Confere uma credencial que acompanha outra (Identidade junto do acesso, credenciamento dentro do acesso):
// assinatura, tipo, titular, emissor confiável, validade e revogação. Devolve texto simples.
// status:false pula a revogação de outro emissor (usado ao importar o próprio credenciamento).
async function checkLinked(tok,type,sub,what,{status=true,raiz=''}={}){
  const no=detail=>({ok:false,detail});
  let r;try{r=await verifyJWT(tok,'vc+jwt')}catch(e){return no(`${what}: ${e.message}`)}
  const q=r.payload,t0=now();
  if(vcType(q)!==type)return no(`${what} não é do tipo ${vcLabel(type)}.`);
  if(!r.ok)return no(`${what}: a assinatura não confere.`);
  if(q.sub!==sub)return no(`${what} é de outro DID.`);
  const tn=trustedName(r.did);
  if(!tn)return no(`${what} vem de ${vcIssuerName(q)}, que não está na lista de confiança.`);
  if(q.nbf&&q.nbf>t0+CLOCK_SKEW||q.exp&&q.exp<=t0)return no(`${what} está fora da validade.`);
  if(r.did===ses.did){
    const rec=st.issued.find(i=>i.jti===q.jti);
    if(!rec)return no(`${what} não consta no registro de emissões.`);
    if(rec.revoked)return no(`${what}: revogação em ${fmtDate(rec.revokedAt)} (${rec.reason}).`);
  }else if(status&&r.did!==raiz&&unverifiableStatus()===false)return no(`${what} é de ${tn}, e a revogação não pode ser conferida aqui. Para aceitar, mude a política de status não verificável.`);
  return{ok:true,payload:q,issuerName:tn,detail:''};
}
async function checkIdentity(tok,holder){
  if(!tok)return{ok:false,detail:'Falta a Identidade: o crachá só vale junto com a Identidade aprovada de quem o tem.',nome:''};
  // O SRV aprova crachá para quem tem DID:KEY validado pela STK que o credenciou: essa Identidade vale sem mudar a política.
  const cr=activeAccreditation();
  const r=await checkLinked(tok,'IdentityCredential',holder,'A Identidade',{raiz:cr?cr.issuerDid:''});
  if(!r.ok)return{...r,nome:''};
  const nome=r.payload.vc.credentialSubject.nome||'';
  return{ok:true,nome,detail:`${nome||'Sem nome'}, aprovada por ${r.issuerName}.`};
}
const chkRow=c=>`<div class="chk ${c.ok===true?'ok':c.ok===false?'no':'na'}"><span class="ci">${ic(c.ok===true?'check':c.ok===false?'x':'minus')}</span><div><b>${c.label}</b><small>${c.detail}</small></div></div>`;
$('#vpGo').onclick=async()=>{
  if(!$('#vpT').value.trim()){shake($('#vpF'));return}
  const r=await checkVP($('#vpT').value),ok=r.checks.every(c=>c.ok!==false);
  if(r.chOk)r.ch.used=true;
  const who=r.q?r.nome||shortDid(r.holder):'';
  $('#vpOut').innerHTML=verdictHtml(ok,ok?'Apresentação aprovada':'Apresentação recusada',ok?`${esc(vcLabel(vcType(r.q)))} de ${esc(who)} conferida em ${r.checks.length} pontos.`:'Veja abaixo o que não passou.')
    +`<div class="list glass flat mt">${r.checks.map(chkRow).join('')}</div>`
    +(r.q?`<div class="sec-h">Afirmações apresentadas</div><div class="list glass flat">${vcClaims(r.q).map(([k,v])=>`<div class="kr"><div class="h"><small>${esc(k)}</small></div><div class="v">${esc(fmtVal(v))}</div></div>`).join('')}</div>`:'');
  st.verifs++;await ato('verificacao',`Apresentação ${ok?'aprovada':'recusada'}${r.q?': '+vcLabel(vcType(r.q))+' de '+who:''}`,r.holder||null);await save();
};

/* ================= governança ================= */
function renderGov(){
  if(!st)return;
  $('#gName').value=st.name;$('#gDid').textContent=ses.did;
  $('#gPolV').textContent=st.acceptUnverifiable?'Aceitar':'Recusar';
  renderCred();renderSlots();
  $('#gTrust').innerHTML=`<div class="tx"><span class="dot">${ic('gov')}</span><span class="t"><b>${esc(st.name)}</b><small>Este emissor</small></span><span class="pill ok">Você</span></div>`
    +st.trust.map((t,i)=>`<div class="tx"><span class="dot">${ic('shield')}</span><span class="t"><b>${esc(t.name)}</b><small class="mono">${esc(shortDid(t.did))}</small></span><button class="mini sm" data-untrust="${i}" aria-label="Remover emissor">${ic('trash')}</button></div>`).join('');
  const list=st.issued.slice().reverse();
  $('#gIssN').textContent=list.length?`${list.length} no total`:'';
  $('#gIssued').innerHTML=list.length?list.slice(0,40).map(i=>{const[c,l]=issStatus(i);return `<button class="tx" data-iss="${i.n}"><span class="dot">${ic('badge')}</span><span class="t"><b>${esc(vcLabel(i.type))}</b><small>${esc(i.holderName||shortDid(i.sub))}, ${fmtDate(i.iat*1000)}</small></span><span class="pill ${c}">${l}</span></button>`}).join('')
    :'<div class="empty">Nenhuma credencial emitida ainda.</div>';
}
function renderSlots(){
  $('#gSlots').innerHTML=slots().map(x=>`<div class="tx"><span class="dot">${ic('gov')}</span><span class="t"><b>${slotLabel(x)}</b><small>${x.id===SLOT.id?'Aberto agora':'Bloqueado'}</small></span>${x.id===SLOT.id?'<span class="pill ok">Este</span>':`<button class="mini sm" data-open="${esc(x.id)}">Abrir</button>${x.id==='0'?'':`<button class="mini sm" data-del="${esc(x.id)}" aria-label="Remover deste aparelho">${ic('trash')}</button>`}`}</div>`).join('')
    +`<button class="tx" data-add><span class="dot">${ic('plus')}</span><span class="t"><b>Adicionar emissor de serviço</b><small>Outro emissor neste aparelho, com chave própria</small></span>${ic('chev')}</button>`;
}
$('#gSlots').onclick=async e=>{
  const o=e.target.closest('[data-open]'),d=e.target.closest('[data-del]');
  if(e.target.closest('[data-add]'))return addSlot();
  if(o){const x=slots().find(y=>y.id===o.dataset.open);if(await confirmSheet('Trocar de emissor',`${esc(st.name)} será bloqueado, e ${esc(x.name)} abre com o PIN dele.`,'Trocar'))switchSlot(x.id);return}
  if(d){
    const x=slots().find(y=>y.id===d.dataset.del);
    if(!await confirmSheet('Remover emissor deste aparelho',`Os dados de ${esc(x.name)} saem deste aparelho. Só as 12 palavras dele (e um backup) trazem o emissor de volta.`,'Remover',true))return;
    await new Promise(r=>{const q=indexedDB.deleteDatabase(slotDb(x.id));q.onsuccess=q.onerror=q.onblocked=()=>r()});
    saveSlots(slots().filter(y=>y.id!==x.id));paintSlotBars();renderSlots();toast('Emissor removido deste aparelho');
  }
};
function addSlot(){
  let derived=false;
  openSheet(`<h3>Adicionar emissor de serviço</h3><p class="sub">Um emissor separado para aprovar Crachás dos seus apps. Depois de criado, ele pede o credenciamento à raiz.</p>
    <label class="f" id="slNF"><span>Nome do serviço</span><input id="slN" autocomplete="off" placeholder="Ex.: Systekna Serviços"></label>
    <div class="sec-h">Chave do emissor</div>
    <div class="list glass flat" id="slK">
      <button class="choice" data-k="own" aria-pressed="true"><span class="rd"></span><span class="t"><b>12 palavras próprias (recomendado)</b><small>Se as palavras do serviço vazarem, a raiz continua segura. Guarde as duas folhas em papel.</small></span></button>
      <button class="choice" data-k="derived" aria-pressed="false"><span class="rd"></span><span class="t"><b>Derivado das 12 palavras da raiz</b><small>Só para demonstração: um backup só, mas quem tiver as palavras da raiz abre os dois.</small></span></button>
    </div>
    <button class="btn" id="slGo">Criar e abrir</button>`);
  $('#slK').onclick=e=>{const b=e.target.closest('[data-k]');if(!b)return;derived=b.dataset.k==='derived';$('#slK').querySelectorAll('[data-k]').forEach(x=>x.setAttribute('aria-pressed',x===b))};
  $('#slGo').onclick=()=>{
    const name=$('#slN').value.trim();if(!name){shake($('#slNF'));$('#slN').focus();return}
    if(slots().some(x=>fold(x.name)===fold(name))){toast('Já existe um emissor com esse nome neste aparelho',true);return}
    const id=b64u.enc(rnd(6)).replace(/[^A-Za-z0-9]/g,'x');
    saveSlots([...slots(),{id,name,...(derived?{derived:true}:{})}]);
    switchSlot(id);
  };
}
function renderCred(){
  const cr=activeAccreditation();
  $('#gRole').textContent=cr?`Serviço credenciado por ${cr.issuerName}: aprova Crachás para ${cr.apps}.`:isService()?'Serviço com credenciamento vencido: não aprova Crachás até importar um novo.':'Raiz: aprova Identidades e credencia serviços. Crachás são aprovados por um emissor de serviço credenciado.';
  const row=(k,icn,t,sub)=>`<button class="tx" data-cr="${k}"><span class="dot">${ic(icn)}</span><span class="t"><b>${t}</b><small>${sub}</small></span>${ic('chev')}</button>`;
  $('#gCred').innerHTML=st.credenciamentos.slice().sort((a,b)=>b.iat-a.iat).map(c=>{const ok=!c.exp||c.exp>now();return `<div class="tx"><span class="dot">${ic('shield')}</span><span class="t"><b>${esc(c.servico)}: ${esc(c.apps)}</b><small>Por ${esc(c.issuerName)}, ${c.exp?(ok?'até ':'venceu em ')+fmtDate(c.exp*1000):'sem validade'}</small></span><span class="pill ${ok?'ok':'no'}">${ok?'Ativo':'Vencido'}</span></div>`}).join('')
    +row('ask','send','Pedir credenciamento','Gera um pedido assinado por este emissor para a STK')
    +row('imp','inbox','Importar credenciamento','Cola o credenciamento que a STK emitiu');
}
$('#gCred').onclick=e=>{const b=e.target.closest('[data-cr]');if(b)({ask:askAccreditation,imp:importAccreditation})[b.dataset.cr]()};
function askAccreditation(){
  openSheet(`<h3>Pedir credenciamento</h3><p class="sub">O pedido leva o DID e o nome deste emissor (${esc(st.name)}), assinado com a chave dele. Diga na observação quais apps você quer liberar.</p>
    <label class="f"><span>Observação para a STK</span><input id="caO" autocomplete="off" placeholder="Ex.: Portal de Clientes, App de Agenda"></label>
    <button class="btn" id="caGo">Assinar pedido</button>
    <div id="caOut" hidden><label class="f"><span>Pedido assinado, válido por 7 dias</span><textarea class="mono" id="caJ" rows="5" readonly></textarea></label><button class="btn ghost" id="caC">Copiar pedido</button></div>`);
  $('#caGo').onclick=async()=>{
    const iat=now();
    $('#caJ').value=await signJWT('pedido+jwt',{iss:ses.did,sub:ses.did,aud:'emissor',name:st.name,wanted:'AccreditationCredential',note:$('#caO').value.trim(),nonce:b64u.enc(rnd(16)),iat,exp:iat+7*86400});
    $('#caOut').hidden=false;toast('Pedido assinado');
  };
  $('#caC').onclick=()=>copy($('#caJ').value,'Pedido copiado');
}
function importAccreditation(){
  openSheet(`<h3>Importar credenciamento</h3><p class="sub">Cole o credenciamento que a STK emitiu para este emissor. Se a STK ainda não estiver nos emissores confiáveis, dá para confiar nela aqui.</p>
    <label class="f" id="ciF"><span>Credenciamento</span><textarea class="mono" id="ciT" rows="6" spellcheck="false" placeholder="eyJhbGciOiJFZERTQSIs…"></textarea></label><p class="hint" id="ciH"></p><div id="ciTrust" hidden></div>
    <button class="btn" id="ciGo">Conferir e importar</button>`);
  $('#ciGo').onclick=async()=>{
    const H=$('#ciH'),fail=m=>{H.textContent=m;H.classList.add('bad');shake($('#ciF'))};
    H.textContent='';H.classList.remove('bad');$('#ciTrust').hidden=true;
    // Credenciamento válido para este emissor, mas de quem ainda não está na lista: oferece confiar ali mesmo, mostrando o DID.
    let v=null;try{v=await verifyJWT($('#ciT').value.trim(),'vc+jwt')}catch{}
    if(v&&v.ok&&vcType(v.payload)==='AccreditationCredential'&&v.payload.sub===ses.did&&!trustedName(v.did)){
      const nome=vcIssuerName(v.payload);
      $('#ciTrust').innerHTML=`<p class="hint">O credenciamento vem de <b>${esc(nome)}</b> (<span class="mono">${esc(shortDid(v.did))}</span>), que ainda não está na lista de confiança. Confira se é a STK.</p><button class="btn" id="ciTrustGo">Confiar em ${esc(nome)} e importar</button>`;
      $('#ciTrust').hidden=false;
      $('#ciTrustGo').onclick=async()=>{
        if(!trustedName(v.did)){st.trust.push({name:nome,did:v.did,at:Date.now()});await ato('confianca',`${nome} adicionado aos emissores confiáveis`,v.did);await save()}
        $('#ciGo').onclick();
      };
      return;
    }
    const r=await checkLinked($('#ciT').value.trim(),'AccreditationCredential',ses.did,'O credenciamento',{status:false});
    if(!r.ok)return fail(r.detail);
    const q=r.payload,c=q.vc.credentialSubject;
    if(st.credenciamentos.some(x=>x.jti===q.jti))return fail('Este credenciamento já foi importado.');
    st.credenciamentos.push({jwt:$('#ciT').value.trim(),jti:q.jti,issuerDid:q.iss,issuerName:r.issuerName,servico:c.servico,apps:c.apps,iat:q.iat,exp:q.exp||0});
    await ato('confianca',`Credenciamento de ${r.issuerName} importado: ${c.apps}`,q.jti);await save();
    closeSheet();fillTypeSelects();paintWho();renderGov();toast('Credenciamento importado');
    // Havia um pedido de crachá esperando o credenciamento: confere de novo.
    if($('#iqImp')&&$('#iqT').value.trim())$('#iqGo').onclick();
  };
}
$('#gNameS').onclick=async()=>{
  const n=$('#gName').value.trim();if(!n||n===st.name)return;
  st.name=n;await ato('nome',`Nome público alterado para ${n}`);await save();renameSlot(n);paintWho();renderSlots();toast('Nome salvo');
};
$('#gDidC').onclick=()=>copy(ses.did,'DID copiado');
$('#gPol').onclick=async()=>{
  const accept=!st.acceptUnverifiable;
  if(accept&&!await confirmSheet('Aceitar status não verificável','Credenciais de emissores confiáveis passam a ser aprovadas mesmo sem conferir se foram revogadas. Uma credencial revogada por outro emissor pode passar.','Aceitar',true))return;
  st.acceptUnverifiable=accept;
  await ato('politica',accept?'Política: aceitar credenciais de outros emissores sem status verificável':'Política: recusar credenciais de outros emissores sem status verificável');
  await save();renderGov();toast('Política alterada');
};
$('#gTrustAdd').onclick=()=>{
  openSheet(`<h3>Adicionar emissor confiável</h3><p class="sub">Credenciais assinadas por este DID passam a ser aceitas nas verificações deste emissor.</p>
    <label class="f" id="tnF"><span>Nome</span><input id="tn" autocomplete="off" placeholder="Ex.: Universidade de Campinas"></label>
    <label class="f" id="tdF"><span>DID do emissor</span><input id="td" class="mono" autocomplete="off" autocapitalize="none" spellcheck="false" placeholder="did:key:z6Mk…"></label><p class="hint" id="tH"></p>
    <button class="btn" id="tGo">Adicionar à lista</button>`);
  $('#tGo').onclick=async()=>{
    const name=$('#tn').value.trim(),did=$('#td').value.trim(),H=$('#tH');
    if(!name)return shake($('#tnF'));
    try{await didToEdKey(did)}catch(e){H.textContent=e.message;H.classList.add('bad');return shake($('#tdF'))}
    if(did===ses.did||st.trust.some(t=>t.did===did)){H.textContent='Este DID já é confiável.';H.classList.add('bad');return}
    st.trust.push({name,did,at:Date.now()});await ato('confianca',`${name} adicionado aos emissores confiáveis`,did);await save();
    closeSheet();renderGov();toast('Emissor adicionado');
  };
};
$('#gTrust').onclick=async e=>{
  const b=e.target.closest('[data-untrust]');if(!b)return;
  const t=st.trust[+b.dataset.untrust];
  if(!await confirmSheet('Remover emissor',`Credenciais de ${esc(t.name)} deixam de ser aceitas aqui.`,'Remover',true))return;
  st.trust.splice(+b.dataset.untrust,1);await ato('confianca',`${t.name} removido dos emissores confiáveis`,t.did);await save();renderGov();toast('Emissor removido');
};
$('#gIssued').onclick=e=>{const b=e.target.closest('[data-iss]');if(b)showIssued(+b.dataset.iss)};
function showIssued(n){
  const i=st.issued.find(x=>x.n===n);if(!i)return;
  const[c,l]=issStatus(i);
  openSheet(`<div class="dhead"><span class="dot">${ic('badge')}</span><div><h3>${esc(vcLabel(i.type))}</h3><small>Status nº ${i.n}</small></div></div>
    <div class="list glass flat">
      <div class="kr"><div class="h"><small>Titular</small><span class="pill ${c}">${l}</span></div><div class="v">${esc(i.holderName||'Sem nome')}</div><div class="v mono" style="margin-top:4px">${esc(i.sub)}</div></div>
      ${Object.entries(i.claims).map(([k,v])=>`<div class="kr"><div class="h"><small>${esc(k)}</small></div><div class="v">${esc(fmtVal(v))}</div></div>`).join('')}
      <div class="kr"><div class="h"><small>Emitida em</small></div><div class="v">${fmtDate(i.iat*1000)}${i.exp?', válida até '+fmtDate(i.exp*1000):', sem validade'}</div></div>
      ${i.revoked?`<div class="kr"><div class="h"><small>Revogada em</small></div><div class="v">${fmtDate(i.revokedAt)}: ${esc(i.reason)}</div></div>`:''}
    </div>
    ${i.revoked?'':`<label class="f mt"><span>Motivo da revogação</span><select id="rvR"><option>Pedido do titular</option><option>Dados incorretos</option><option>Fim do vínculo</option><option>Suspeita de fraude</option><option>Outro</option></select></label><button class="btn danger" id="rvGo">Revogar credencial</button>`}`);
  $('#rvGo')&&($('#rvGo').onclick=async()=>{
    const reason=$('#rvR').value;
    if(!await confirmSheet('Revogar credencial','A partir de agora ela será recusada em todas as verificações deste emissor. Isso não pode ser desfeito.','Revogar',true))return;
    await revokeAll([i],reason);await save();renderGov();toast('Credencial revogada');
  });
}

boot();
