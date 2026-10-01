/* ================= serviço ================= */
let st=null;
const APP={
  db:'systekna-cartorio',dataKeys:['state'],createdMsg:'Cartório instituído',autoDefault:10,
  importHint:'Substitui o livro e os registros deste cartório',
  howHtml:`<p><b>Papel.</b> O cartório é emissor e verificador. Ele tem a própria identidade soberana, criada com 12 palavras como qualquer titular, e assina com a chave Ed25519 dela.</p>
  <p><b>Emissão.</b> Só emite para quem prova controlar um DID: o titular envia um pedido assinado pela carteira. A credencial leva o DID do titular, o nome do cartório e um número de status.</p>
  <p><b>Verificação.</b> O desafio é um número aleatório válido por 10 minutos e aceito uma única vez. Na apresentação, o cartório confere a assinatura do titular, o desafio, a assinatura do emissor, se a credencial é do titular, se o emissor é confiável, a revogação e a validade.</p>
  <p><b>Revogação.</b> Fica no registro deste cartório e vale para tudo o que ele verifica. Em produção, a lista de status é publicada para que qualquer verificador consulte.</p>
  <p><b>Livro.</b> Cada ato guarda o hash SHA-256 do ato anterior e é assinado pelo cartório. Alterar ou apagar um ato quebra a corrente, e a conferência de integridade mostra onde.</p>
  <p><b>Documentos.</b> O registro guarda só o SHA-256 do arquivo. O certificado é uma credencial assinada, que o requerente pode guardar na carteira.</p>
  <p><b>Limite.</b> Os dados ficam cifrados neste aparelho. Num cartório real, o livro e a lista de status ficariam replicados em servidores, e a chave do cartório num módulo de hardware (HSM).</p>`,
  async load(){
    const r=await DB.get('state');
    st=r?await unseal(ses.vaultKey,r,'state'):null;
    if(!st){st={name:'Cartório Digital Systekna',issued:[],trust:[],book:[],challenges:[],docs:[],seq:0,verifs:0};await ato('abertura','Livro aberto e cartório instituído',ses.did);await save()}
  },
  enter(){$('#whoLabel').textContent=st.name;fillTypeSelects();mountCommonSettings($('#commonSet'));setView('vPanel')},
  onView(v){if(v==='vPanel')renderPanel();if(v==='vGov')renderGov()},
  onLock(){
    st=null;pedido=null;dInfo=null;cInfo=null;
    ['#pAtos','#pBook','#iWho','#iClaims','#vpOut','#dInfo','#cInfo','#cOut','#gTrust','#gIssued','#iOk','#dOk'].forEach(s=>$(s).innerHTML='');
    ['#iqT','#iJwt','#vChalT','#vpT','#dJwt','#cT','#dName','#dDid'].forEach(s=>$(s).value='');
    ['#iForm','#iOut','#vChal','#dOut'].forEach(s=>$(s).hidden=true);
    $('#whoLabel').textContent='Cartório Digital';
  },
  exportData:async()=>st,
  async importData(d){
    if(!d||!d.book)return 'Backup sem livro de registros';
    st=d;await save();$('#whoLabel').textContent=st.name;renderPanel();
    return `Cartório restaurado com ${st.book.length} atos`;
  }
};
const save=async()=>DB.set('state',await seal(ses.vaultKey,st,'state'));
const ATO_IC={abertura:'gov',emissao:'stamp',revogacao:'x',verificacao:'scan',registro:'file',confianca:'shield',nome:'note',politica:'shield'};
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
const unverifiableMsg='Emitida por outro cartório: o status não pode ser conferido aqui.';

/* ================= painel ================= */
async function renderPanel(){
  if(!st)return;
  $('#pName').textContent=st.name;
  $('#sA').textContent=st.issued.filter(i=>issStatus(i)[0]==='ok'&&i.type!=='DocumentRegistrationCredential').length;
  $('#sR').textContent=st.issued.filter(i=>i.revoked).length;
  $('#sD').textContent=st.docs.length;$('#sV').textContent=st.verifs;
  $('#pAtos').innerHTML=st.book.slice(-6).reverse().map(e=>atoRow(e)).join('');
  const c=await checkBook();
  $('#pBook').innerHTML=c.ok?verdictHtml(true,'Livro íntegro',`${c.n} ${c.n===1?'ato encadeado e assinado':'atos encadeados e assinados'} pelo cartório.`)
    :verdictHtml(false,'Livro adulterado',`A corrente se rompe no ato nº ${c.at}. Restaure um backup.`);
  $('#pBook').firstElementChild.style.marginTop='0';
}
$('#pAll').onclick=()=>{
  openSheet(`<h3>Livro de registros</h3><p class="sub">Cada ato carrega o hash do anterior e a assinatura do cartório.</p><button class="btn" id="bkChk" style="margin-top:0">Conferir integridade</button><div id="bkRes"></div><div class="list glass flat mt">${st.book.slice().reverse().map(e=>atoRow(e,true)).join('')}</div>`);
  $('#bkChk').onclick=async()=>{const c=await checkBook();$('#bkRes').innerHTML=c.ok?verdictHtml(true,'Livro íntegro',`Os ${c.n} atos conferem do primeiro ao último.`):verdictHtml(false,'Livro adulterado',`A corrente se rompe no ato nº ${c.at}.`)};
};

/* ================= emissão ================= */
function fillTypeSelects(){
  const opts=Object.entries(VC_TYPES).filter(([k])=>k!=='DocumentRegistrationCredential').map(([k,v])=>`<option value="${k}">${v.label}</option>`).join('');
  $('#iType').innerHTML=opts;
  $('#vType').innerHTML=`<option value="any">Qualquer credencial</option>`+Object.entries(VC_TYPES).map(([k,v])=>`<option value="${k}">${v.label}</option>`).join('');
}
let pedido=null;
const claimRow=(k,v)=>`<div class="claim"><label class="f"><span>Campo</span><input data-ck value="${esc(k)}" autocomplete="off" autocapitalize="none"></label><label class="f"><span>Valor</span><input data-cv value="${esc(v)}" autocomplete="off"></label><button class="mini" data-rm aria-label="Remover campo">${ic('minus')}</button></div>`;
function drawClaims(){
  const defs=VC_TYPES[$('#iType').value].claims;
  $('#iClaims').innerHTML=defs.map(([k,v])=>claimRow(k,k==='nome'&&pedido?pedido.payload.name||'':v)).join('');
}
$('#iType').onchange=drawClaims;
$('#iClaims').onclick=e=>{const b=e.target.closest('[data-rm]');if(b)b.closest('.claim').remove()};
$('#iAdd').onclick=()=>{$('#iClaims').insertAdjacentHTML('beforeend',claimRow('',''));$('#iClaims').lastElementChild.querySelector('input').focus()};
$('#iqGo').onclick=async()=>{
  const H=$('#iqH'),fail=m=>{H.textContent=m;H.classList.add('bad');shake($('#iqF'));$('#iForm').hidden=true;pedido=null};
  H.textContent='';H.classList.remove('bad');$('#iOut').hidden=true;
  let r;try{r=await verifyJWT($('#iqT').value)}catch(e){return fail(e.message)}
  if(r.header.typ!=='pedido+jwt')return fail('Isto não é um pedido. Na carteira, o titular gera o pedido em + e Pedir credencial.');
  if(!r.ok)return fail('A assinatura do pedido não confere: ele foi alterado ou não foi assinado por este DID.');
  if(r.payload.exp&&r.payload.exp<now())return fail('Este pedido expirou. Peça um novo ao titular.');
  if(st.issued.some(i=>i.nonce&&i.nonce===r.payload.nonce))return fail('Este pedido já foi atendido. Peça um novo ao titular.');
  pedido=r;
  $('#iWho').innerHTML=verdictHtml(true,'Pedido conferido',`${esc(r.payload.name||'Titular sem nome')} controla ${esc(shortDid(r.did))}.${r.payload.note?' Observação: '+esc(r.payload.note):''}`);
  if(VC_TYPES[r.payload.wanted]&&r.payload.wanted!=='DocumentRegistrationCredential')$('#iType').value=r.payload.wanted;
  drawClaims();$('#iForm').hidden=false;
};
async function issue(sub,type,claims,days,holderName,nonce,log){
  const n=++st.seq,iat=now(),jti='urn:uuid:'+crypto.randomUUID();
  const payload={iss:ses.did,sub,iat,nbf:iat,jti,vc:{'@context':VC_CONTEXT,type:['VerifiableCredential',type],issuer:{id:ses.did,name:st.name},issuanceDate:new Date(iat*1000).toISOString(),credentialSubject:{id:sub,...claims},credentialStatus:{id:`${ses.did}#status-${n}`,type:'SysteknaStatusRegistry',statusListIndex:n}}};
  if(days)payload.exp=iat+days*86400;
  const jwt=await signJWT('vc+jwt',payload);
  st.issued.push({n,jti,sub,type,claims,iat,exp:payload.exp||0,holderName:holderName||'',nonce:nonce||null,revoked:false});
  await ato(log?log.act:'emissao',log?log.text:`${vcLabel(type)} emitida para ${holderName||shortDid(sub)}`,jti);
  await save();return jwt;
}
$('#iGo').onclick=async()=>{
  if(!pedido)return;
  const claims={};
  $('#iClaims').querySelectorAll('.claim').forEach(c=>{const k=c.querySelector('[data-ck]').value.trim().replace(/\s+/g,'_'),v=c.querySelector('[data-cv]').value.trim();if(k&&v)claims[k]=v==='true'?true:v==='false'?false:v});
  if(!Object.keys(claims).length){toast('Preencha ao menos um campo com valor',true);return}
  const type=$('#iType').value;
  $('#iJwt').value=await issue(pedido.did,type,claims,+$('#iDays').value,pedido.payload.name,pedido.payload.nonce);
  $('#iOk').innerHTML=verdictHtml(true,'Credencial emitida',`${esc(vcLabel(type))} para ${esc(pedido.payload.name||shortDid(pedido.did))}, registrada no livro.`);
  $('#iForm').hidden=true;$('#iOut').hidden=false;pedido=null;toast('Credencial emitida');
};
$('#iCopy').onclick=()=>copy($('#iJwt').value,'Credencial copiada');
$('#iNew').onclick=()=>{$('#iqT').value='';$('#iOut').hidden=true;$('#iqH').textContent='';$('#iqT').focus()};

/* ================= verificação ================= */
$('#vGen').onclick=async()=>{
  const nonce=b64u.enc(rnd(18)),iat=now(),type=$('#vType').value,purpose=$('#vPurpose').value.trim()||'Verificação';
  $('#vChalT').value=await signJWT('desafio+jwt',{iss:ses.did,name:st.name,nonce,purpose,accept:type,iat,exp:iat+600});
  st.challenges=st.challenges.filter(c=>c.exp>iat-86400);
  st.challenges.push({nonce,type,purpose,iat,exp:iat+600,used:false});await save();
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
  add(chOk,'Desafio deste cartório',!ch?'O desafio não foi gerado aqui.':p.aud!==ses.did?'A apresentação foi feita para outro verificador.':ch.used?'Este desafio já foi usado. Pode ser uma cópia sendo reaproveitada.':`Responde ao desafio “${esc(ch.purpose)}”.`);
  add(!!ch&&ch.exp>now()&&p.exp>now(),'Dentro do prazo',p.exp<=now()?'A apresentação expirou. Gere um novo desafio.':ch&&ch.exp<=now()?'O desafio expirou.':'Apresentada dentro dos prazos.');
  const vcTok=p.vp&&p.vp.verifiableCredential&&p.vp.verifiableCredential[0];
  if(!vcTok){add(false,'Credencial','A apresentação não contém credencial.');return{checks,ch}}
  let vc;
  try{vc=await verifyJWT(vcTok,'vc+jwt')}catch(e){add(false,'Credencial',esc(e.message));return{checks,ch}}
  const q=vc.payload,t=vcType(q);
  add(vc.ok,'Assinatura do emissor',vc.ok?`Assinada por ${esc(vcIssuerName(q))}.`:'A credencial foi alterada depois de emitida.');
  add(q.sub===vp.did,'Credencial pertence ao titular',q.sub===vp.did?'O DID da credencial é o mesmo de quem apresentou.':'A credencial é de outra pessoa.');
  const tn=trustedName(vc.did);
  add(!!tn,'Emissor confiável',tn?`${esc(tn)} está na lista de confiança.`:'Este emissor não está na lista de confiança deste cartório.');
  if(vc.did===ses.did){const rec=st.issued.find(i=>i.jti===q.jti);add(!!rec&&!rec.revoked,'Não revogada',!rec?'Não consta no registro de emissões.':rec.revoked?`Revogada em ${fmtDate(rec.revokedAt)}: ${esc(rec.reason)}.`:'Ativa no registro de emissões.')}
  else add(unverifiableStatus(),'Não revogada',unverifiableMsg);
  // 1.2: além do exp, confere o nbf (com folga de relógio entre aparelhos).
  const t0=now(),early=q.nbf&&q.nbf>t0+CLOCK_SKEW,late=q.exp&&q.exp<=t0;
  add(!early&&!late,'Dentro da validade',early?`Só vale a partir de ${fmtDate(q.nbf*1000)}.`:q.exp?(late?`Expirou em ${fmtDate(q.exp*1000)}.`:`Válida até ${fmtDate(q.exp*1000)}.`):'Sem data de validade.');
  if(ch&&ch.type!=='any')add(t===ch.type,'Tipo exigido',t===ch.type?`${esc(vcLabel(t))}, como pedido.`:`O desafio pedia ${esc(vcLabel(ch.type))} e veio ${esc(vcLabel(t))}.`);
  return{checks,ch,q,holder:vp.did,chOk};
}
const chkRow=c=>`<div class="chk ${c.ok===true?'ok':c.ok===false?'no':'na'}"><span class="ci">${ic(c.ok===true?'check':c.ok===false?'x':'minus')}</span><div><b>${c.label}</b><small>${c.detail}</small></div></div>`;
$('#vpGo').onclick=async()=>{
  if(!$('#vpT').value.trim()){shake($('#vpF'));return}
  const r=await checkVP($('#vpT').value),ok=r.checks.every(c=>c.ok!==false);
  if(r.chOk)r.ch.used=true;
  const who=r.q?(vcClaims(r.q).find(c=>c[0]==='nome')||[])[1]||shortDid(r.holder):'';
  $('#vpOut').innerHTML=verdictHtml(ok,ok?'Apresentação aprovada':'Apresentação recusada',ok?`${esc(vcLabel(vcType(r.q)))} de ${esc(who)} conferida em ${r.checks.length} pontos.`:'Veja abaixo o que não passou.')
    +`<div class="list glass flat mt">${r.checks.map(chkRow).join('')}</div>`
    +(r.q?`<div class="sec-h">Afirmações apresentadas</div><div class="list glass flat">${vcClaims(r.q).map(([k,v])=>`<div class="kr"><div class="h"><small>${esc(k)}</small></div><div class="v">${esc(fmtVal(v))}</div></div>`).join('')}</div>`:'');
  st.verifs++;await ato('verificacao',`Apresentação ${ok?'aprovada':'recusada'}${r.q?': '+vcLabel(vcType(r.q))+' de '+who:''}`,r.holder||null);await save();
};

/* ================= documentos ================= */
let dInfo=null,cInfo=null;
wireSeg($('#dSeg'),(b,i)=>{$('#dReg').hidden=i!==0;$('#dChk').hidden=i!==1});
const fmtSize=n=>n<1024?n+' B':n<1048576?(n/1024).toFixed(1)+' KB':(n/1048576).toFixed(1)+' MB';
async function hashFile(f){return{name:f.name,size:f.size,sha256:hex(await sha256(await f.arrayBuffer()))}}
const fileHtml=i=>`<div class="list glass flat fileinfo"><div class="kr"><div class="h"><small>Arquivo</small></div><div class="v">${esc(i.name)} (${fmtSize(i.size)})</div></div><div class="kr"><div class="h"><small>Impressão digital SHA-256</small></div><div class="v mono">${i.sha256}</div></div></div>`;
$('#dFile').onchange=async e=>{const f=e.target.files[0];if(!f)return;$('#dInfo').innerHTML='<p class="hint">Calculando a impressão digital…</p>';dInfo=await hashFile(f);$('#dInfo').innerHTML=fileHtml(dInfo);$('#dOut').hidden=true};
$('#cFile').onchange=async e=>{const f=e.target.files[0];if(!f)return;$('#cInfo').innerHTML='<p class="hint">Calculando a impressão digital…</p>';cInfo=await hashFile(f);$('#cInfo').innerHTML=fileHtml(cInfo)};
$('#dGo').onclick=async()=>{
  const H=$('#dH'),fail=(m,el)=>{H.textContent=m;H.classList.add('bad');if(el)shake(el)};
  H.textContent='';H.classList.remove('bad');
  if(!dInfo)return fail('Escolha o arquivo a registrar.');
  const name=$('#dName').value.trim();if(!name)return fail('Informe o requerente.',$('#dNameF'));
  const did=$('#dDid').value.trim();
  if(did){try{await didToEdKey(did)}catch(e){return fail(e.message,$('#dDidF'))}}
  const prev=st.docs.find(d=>d.sha256===dInfo.sha256);
  const n=st.docs.length+1;
  const jwt=await issue(did||'urn:sha256:'+dInfo.sha256,'DocumentRegistrationCredential',{documento:dInfo.name,sha256:dInfo.sha256,tamanho:dInfo.size,requerente:name,registro:n},0,name,null,
    {act:'registro',text:`Documento “${dInfo.name}” registrado para ${name}`});
  st.docs.push({n,...dInfo,req:name,did:did||null,at:Date.now()});await save();
  $('#dJwt').value=jwt;
  $('#dOk').innerHTML=verdictHtml(true,`Registro nº ${n}`,prev?`Este mesmo arquivo já tinha o registro nº ${prev.n}. Um novo foi lavrado.`:did?'O requerente pode guardar o certificado na carteira.':'Sem DID, o certificado serve para conferência, mas não entra numa carteira.');
  $('#dOut').hidden=false;toast('Documento registrado');
};
$('#dCopy').onclick=()=>copy($('#dJwt').value,'Certificado copiado');
$('#cGo').onclick=async()=>{
  const out=$('#cOut'),checks=[],add=(ok,label,detail)=>checks.push({ok,label,detail});
  if(!cInfo){toast('Escolha o arquivo',true);return}
  if(!$('#cT').value.trim()){shake($('#cF'));return}
  try{
    const r=await verifyJWT($('#cT').value,'vc+jwt'),q=r.payload,cs=(q.vc&&q.vc.credentialSubject)||{};
    if(vcType(q)!=='DocumentRegistrationCredential')throw new Error('Este token não é um certificado de registro de documento.');
    add(r.ok,'Assinatura do cartório',r.ok?`Assinado por ${esc(vcIssuerName(q))}.`:'O certificado foi alterado.');
    const tn=trustedName(r.did);add(!!tn,'Cartório confiável',tn?`${esc(tn)} está na lista de confiança.`:'Este cartório não está na lista de confiança.');
    if(r.did===ses.did){const rec=st.issued.find(i=>i.jti===q.jti);add(!!rec&&!rec.revoked,'Registro ativo',!rec?'Não consta no registro.':rec.revoked?`Cancelado: ${esc(rec.reason)}.`:`Registro nº ${esc(cs.registro)} ativo.`)}
    else add(unverifiableStatus(),'Registro ativo',unverifiableMsg);
    add(cs.sha256===cInfo.sha256,'Arquivo idêntico',cs.sha256===cInfo.sha256?'A impressão digital confere byte a byte.':'O arquivo é diferente do registrado. Basta um byte para mudar a impressão.');
    const ok=checks.every(c=>c.ok!==false);
    out.innerHTML=verdictHtml(ok,ok?'Documento autêntico':'Documento não confere',ok?`“${esc(cs.documento)}”, registrado para ${esc(cs.requerente)} em ${fmtDate(q.iat*1000)}.`:'Veja abaixo o que não passou.')+`<div class="list glass flat mt">${checks.map(chkRow).join('')}</div>`;
  }catch(e){out.innerHTML=verdictHtml(false,'Não foi possível conferir',esc(e.message))}
};

/* ================= governança ================= */
function renderGov(){
  if(!st)return;
  $('#gName').value=st.name;$('#gDid').textContent=ses.did;
  $('#gPolV').textContent=st.acceptUnverifiable?'Aceitar':'Recusar';
  $('#gTrust').innerHTML=`<div class="tx"><span class="dot">${ic('gov')}</span><span class="t"><b>${esc(st.name)}</b><small>Este cartório</small></span><span class="pill ok">Você</span></div>`
    +st.trust.map((t,i)=>`<div class="tx"><span class="dot">${ic('shield')}</span><span class="t"><b>${esc(t.name)}</b><small class="mono">${esc(shortDid(t.did))}</small></span><button class="mini sm" data-untrust="${i}" aria-label="Remover emissor">${ic('trash')}</button></div>`).join('');
  const list=st.issued.slice().reverse();
  $('#gIssN').textContent=list.length?`${list.length} no total`:'';
  $('#gIssued').innerHTML=list.length?list.slice(0,40).map(i=>{const[c,l]=issStatus(i);return `<button class="tx" data-iss="${i.n}"><span class="dot">${ic(i.type==='DocumentRegistrationCredential'?'file':'badge')}</span><span class="t"><b>${esc(vcLabel(i.type))}</b><small>${esc(i.holderName||shortDid(i.sub))}, ${fmtDate(i.iat*1000)}</small></span><span class="pill ${c}">${l}</span></button>`}).join('')
    :'<div class="empty">Nenhuma credencial emitida ainda.</div>';
}
$('#gNameS').onclick=async()=>{
  const n=$('#gName').value.trim();if(!n||n===st.name)return;
  st.name=n;await ato('nome',`Nome público alterado para ${n}`);await save();$('#whoLabel').textContent=n;toast('Nome salvo');
};
$('#gDidC').onclick=()=>copy(ses.did,'DID copiado');
$('#gPol').onclick=async()=>{
  const accept=!st.acceptUnverifiable;
  if(accept&&!await confirmSheet('Aceitar status não verificável','Credenciais de emissores confiáveis passam a ser aprovadas mesmo sem conferir se foram revogadas. Uma credencial revogada por outro cartório pode passar.','Aceitar',true))return;
  st.acceptUnverifiable=accept;
  await ato('politica',accept?'Política: aceitar credenciais de outros emissores sem status verificável':'Política: recusar credenciais de outros emissores sem status verificável');
  await save();renderGov();toast('Política alterada');
};
$('#gTrustAdd').onclick=()=>{
  openSheet(`<h3>Adicionar emissor confiável</h3><p class="sub">Credenciais assinadas por este DID passam a ser aceitas nas verificações deste cartório.</p>
    <label class="f" id="tnF"><span>Nome</span><input id="tn" autocomplete="off" placeholder="Ex.: Cartório de Campinas"></label>
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
    if(!await confirmSheet('Revogar credencial','A partir de agora ela será recusada em todas as verificações deste cartório. Isso não pode ser desfeito.','Revogar',true))return;
    i.revoked=true;i.revokedAt=Date.now();i.reason=reason;
    await ato('revogacao',`${vcLabel(i.type)} de ${i.holderName||shortDid(i.sub)} revogada: ${reason}`,i.jti);await save();renderGov();toast('Credencial revogada');
  });
}

boot();
