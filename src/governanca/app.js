/* ================= serviço ================= */
let st=null;
const APP={
  db:'systekna-cartorio',label:'Governança',dataKeys:['state'],createdMsg:'Governança criada',autoDefault:10,
  importHint:'Substitui o livro e os registros desta Governança',
  howHtml:`<p><b>Papel.</b> A Governança é a raiz de confiança: aprova identidades (DID:KEY), credencia os serviços que emitem crachás e também verifica credenciais. Ela tem a própria identidade soberana, criada com 12 palavras como qualquer titular, e assina com a chave Ed25519 dela.</p>
  <p><b>Identidade e credenciamento.</b> A Identidade leva só o nome do titular; cada DID tem uma Identidade ativa, e a nova substitui a anterior. O credenciamento diz qual serviço pode emitir crachás e para quais apps; cada serviço tem um credenciamento ativo.</p>
  <p><b>Emissão.</b> Só emite para quem prova controlar um DID: o titular envia um pedido assinado pela carteira. A credencial leva o DID do titular, o nome do emissor e um número de status.</p>
  <p><b>Verificação.</b> O desafio é um número aleatório válido por 10 minutos e aceito uma única vez. Na apresentação, o emissor confere a assinatura do titular, o desafio, a assinatura de quem emitiu a credencial, se ela é do titular, se quem a emitiu é confiável, a revogação e a validade.</p>
  <p><b>Revogação.</b> Fica no registro deste emissor e vale para tudo o que ele verifica. Em produção, a lista de status é publicada para que qualquer verificador consulte.</p>
  <p><b>Livro.</b> Cada ato guarda o hash SHA-256 do ato anterior e é assinado pelo emissor. Alterar ou apagar um ato quebra a corrente, e a conferência de integridade mostra onde.</p>
  <p><b>Limite.</b> Os dados ficam cifrados neste aparelho. Num emissor real, o livro e a lista de status ficariam replicados em servidores, e a chave do emissor num módulo de hardware (HSM).</p>`,
  async load(){
    const r=await DB.get('state');
    st=r?await unseal(ses.vaultKey,r,'state'):null;
    if(!st){st={name:'Governança Systekna',issued:[],trust:[],book:[],challenges:[],seq:0,verifs:0};await ato('abertura','Livro aberto e Governança criada',ses.did);await save()}
  },
  enter(){$('#whoLabel').textContent=st.name;fillTypeSelects();mountCommonSettings($('#commonSet'));setView('vPanel')},
  onView(v){if(v==='vPanel')renderPanel();if(v==='vGov')renderGov()},
  onLock(){
    st=null;pedido=null;
    ['#pAtos','#pBook','#iWho','#iClaims','#vpOut','#gTrust','#gIssued','#iOk'].forEach(s=>$(s).innerHTML='');
    ['#iqT','#iJwt','#vChalT','#vpT'].forEach(s=>$(s).value='');
    ['#iForm','#iOut','#vChal'].forEach(s=>$(s).hidden=true);
    $('#whoLabel').textContent='Governança Systekna';
  },
  exportData:async()=>st,
  async importData(d){
    if(!d||!Array.isArray(d.book)||!d.book.length)return 'Backup sem livro de registros';
    // O livro do backup é conferido antes de substituir o estado: um backup adulterado não entra.
    const c=await checkBook(d.book,chaves(d));
    if(!c.ok)return `Backup recusado: o livro se rompe no ato nº ${c.at}. Nada foi alterado.`;
    st=d;await save();$('#whoLabel').textContent=st.name;renderPanel();
    return `Governança restaurada com ${st.book.length} atos`;
  }
};
const save=async()=>DB.set('state',await seal(ses.vaultKey,st,'state'));
const ATO_IC={abertura:'gov',emissao:'stamp',revogacao:'x',verificacao:'scan',confianca:'shield',nome:'note',politica:'shield',rotacao:'key'};
async function ato(act,text,ref){
  const prev=st.book.length?st.book[st.book.length-1].hash:'0'.repeat(64);
  const e={n:st.book.length+1,at:Date.now(),act,text,ref:ref||null,prev};
  e.hash=hex(await sha256(te.encode(JSON.stringify(e))));
  e.sig=b64u.enc(await S.sign({name:'Ed25519'},ses.edPriv,te.encode(e.hash)));
  st.book.push(e);
}
// Chaves da Governança ao longo do tempo: cada uma assina os atos a partir do ato "from". Sem troca, só a atual.
const chaves=(s=st)=>s&&s.keys&&s.keys.length?s.keys:[{did:ses.did,from:1}];
const minhas=()=>chaves().map(k=>k.did);
async function checkBook(book=st.book,keys=chaves()){
  const pubs=new Map();
  const pubDe=async n=>{const k=keys.filter(x=>x.from<=n).at(-1)||keys[0];if(!pubs.has(k.did))pubs.set(k.did,await didToEdKey(k.did));return pubs.get(k.did)};
  let prev='0'.repeat(64);
  for(const e of book){
    const body={n:e.n,at:e.at,act:e.act,text:e.text,ref:e.ref,prev:e.prev};
    const h=hex(await sha256(te.encode(JSON.stringify(body))));
    if(e.prev!==prev||h!==e.hash||!await S.verify({name:'Ed25519'},await pubDe(e.n),b64u.dec(e.sig),te.encode(e.hash)))return{ok:false,at:e.n};
    prev=e.hash;
  }
  return{ok:true,n:book.length};
}
const atoRow=(e,full)=>`<div class="ato"><span class="n">${e.n}</span><span class="dot">${ic(ATO_IC[e.act]||'book')}</span><div class="t"><b>${esc(e.text)}</b><small>${fmtTime(e.at)}</small>${full?`<br><code>${e.hash}</code>`:''}</div></div>`;
const issStatus=i=>i.revoked?['no','Revogada']:(i.exp&&i.exp<now())?['warn','Expirada']:['ok','Ativa'];
const trustedName=did=>minhas().includes(did)?st.name:(st.trust.find(t=>t.did===did)||{}).name;
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
function fillTypeSelects(){
  const opts=Object.entries(VC_TYPES).map(([k,v])=>`<option value="${k}">${v.label}</option>`).join('');
  $('#iType').innerHTML=opts;
  $('#vType').innerHTML=`<option value="any">Qualquer credencial</option>`+Object.entries(VC_TYPES).map(([k,v])=>`<option value="${k}">${v.label}</option>`).join('');
}
let pedido=null;
const claimRow=(k,v)=>`<div class="claim"><label class="f"><span>Campo</span><input data-ck value="${esc(k)}" autocomplete="off" autocapitalize="none"></label><label class="f"><span>Valor</span><input data-cv value="${esc(v)}" autocomplete="off"></label><button class="mini" data-rm aria-label="Remover campo">${ic('minus')}</button></div>`;
// O pedido preenche o que já se sabe: o nome do titular ou do serviço e os apps pedidos pelo serviço.
function fromPedido(k,v){
  const p=pedido&&pedido.payload;if(!p)return v;
  if(k==='nome'||k==='servico')return p.name||'';
  if(k==='apps')return Array.isArray(p.apps)?p.apps.join(', '):'';
  return v;
}
function drawClaims(){
  $('#iClaims').innerHTML=VC_TYPES[$('#iType').value].claims.map(([k,v])=>claimRow(k,fromPedido(k,v))).join('');
}
$('#iType').onchange=drawClaims;
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
  // Pedido endereçado a um DID: só o emissor com esse DID atende. "emissor" (sem DID) vale para qualquer um.
  if(r.payload.aud&&r.payload.aud!=='emissor'&&r.payload.aud!==ses.did)return fail('Este pedido foi feito para outro emissor. Peça ao titular um pedido para este emissor.');
  if(st.issued.some(i=>i.nonce&&i.nonce===r.payload.nonce))return fail('Este pedido já foi atendido. Peça um novo ao titular.');
  pedido=r;
  $('#iWho').innerHTML=verdictHtml(true,'Pedido conferido',`${esc(r.payload.name||'Titular sem nome')} controla ${esc(shortDid(r.did))}.${r.payload.note?' Observação: '+esc(r.payload.note):''}`);
  if(VC_TYPES[r.payload.wanted])$('#iType').value=r.payload.wanted;
  drawClaims();$('#iForm').hidden=false;
};
// Um ativo por DID: a nova Identidade ou o novo credenciamento revoga o anterior do mesmo titular.
const UNICO={IdentityCredential:'Substituída por nova Identidade',ServiceAccreditationCredential:'Substituído por novo credenciamento'};
const soCampos=(claims,ok,quem)=>{const x=Object.keys(claims).find(k=>!ok.includes(k));if(x)throw new Error(`${quem} leva só ${ok.join(' e ')}. Tire o campo “${x}”.`)};
async function issue(sub,type,claims,days,holderName,nonce){
  const pii=piiProblem({...claims,...(holderName?{titular:holderName}:{})});if(pii)throw new Error(pii);
  if(type==='IdentityCredential'){
    soCampos(claims,['nome'],'A Identidade');
    if(!String(claims.nome||'').trim())throw new Error('A Identidade precisa do nome do titular.');
  }
  if(type==='ServiceAccreditationCredential'){
    soCampos(claims,['servico','apps'],'O credenciamento');
    if(sub===ses.did)throw new Error('A Governança não credencia a si mesma.');
    if(!String(claims.servico||'').trim())throw new Error('O credenciamento precisa do nome do serviço.');
    const apps=[...new Set((Array.isArray(claims.apps)?claims.apps:String(claims.apps||'').split(',')).map(a=>String(a).trim()).filter(Boolean))];
    if(!apps.length)throw new Error('Informe ao menos um app que o serviço vai proteger.');
    const pa=piiProblem(Object.fromEntries(apps.map((a,i)=>[`app ${i+1}`,a])));if(pa)throw new Error(pa);
    claims={servico:String(claims.servico).trim(),apps};
  }
  const n=++st.seq,iat=now(),jti='urn:uuid:'+crypto.randomUUID();
  const payload={iss:ses.did,sub,iat,nbf:iat,jti,vc:{'@context':VC_CONTEXT,type:['VerifiableCredential',type],issuer:{id:ses.did,name:st.name},issuanceDate:new Date(iat*1000).toISOString(),credentialSubject:{id:sub,...claims},credentialStatus:{id:`${ses.did}#status-${n}`,type:'SysteknaStatusRegistry',statusListIndex:n}}};
  if(days)payload.exp=iat+days*86400;
  const jwt=await signJWT('vc+jwt',payload);
  const antigas=UNICO[type]?st.issued.filter(i=>i.sub===sub&&i.type===type&&!i.revoked&&!(i.exp&&i.exp<iat)):[];
  st.issued.push({n,jti,sub,type,claims,iat,exp:payload.exp||0,holderName:holderName||'',nonce:nonce||null,revoked:false});
  await ato('emissao',`${vcLabel(type)} emitida para ${holderName||shortDid(sub)}`,jti);
  for(const a of antigas){
    a.revoked=true;a.revokedAt=Date.now();a.reason=UNICO[type];
    await ato('revogacao',`${vcLabel(type)} nº ${a.n} de ${a.holderName||shortDid(a.sub)} revogada: ${UNICO[type]}`,a.jti);
  }
  await save();return jwt;
}
$('#iGo').onclick=async()=>{
  if(!pedido)return;
  const claims={};
  $('#iClaims').querySelectorAll('.claim').forEach(c=>{const k=c.querySelector('[data-ck]').value.trim().replace(/\s+/g,'_'),v=c.querySelector('[data-cv]').value.trim();if(k&&v)claims[k]=v==='true'?true:v==='false'?false:v});
  if(!Object.keys(claims).length){toast('Preencha ao menos um campo com valor',true);return}
  const type=$('#iType').value;
  try{$('#iJwt').value=embrulhar(await issue(pedido.did,type,claims,+$('#iDays').value,pedido.payload.name,pedido.payload.nonce))}catch(e){toast(e.message,true);return}
  $('#iOk').innerHTML=verdictHtml(true,'Credencial emitida',`${esc(vcLabel(type))} para ${esc(pedido.payload.name||shortDid(pedido.did))}, registrada no livro.`);
  $('#iForm').hidden=true;$('#iOut').hidden=false;pedido=null;toast('Credencial emitida');
};
$('#iCopy').onclick=()=>copy($('#iJwt').value,'Credencial copiada');
$('#iNew').onclick=()=>{$('#iqT').value='';$('#iOut').hidden=true;$('#iqH').textContent='';$('#iqT').focus()};

/* ================= verificação ================= */
$('#vGen').onclick=async()=>{
  const nonce=b64u.enc(rnd(18)),iat=now(),type=$('#vType').value,purpose=$('#vPurpose').value.trim()||'Verificação';
  $('#vChalT').value=embrulhar(await signJWT('desafio+jwt',{iss:ses.did,name:st.name,nonce,purpose,accept:type,iat,exp:iat+600}));
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
  add(!!tn,'Emissor confiável',tn?`${esc(tn)} está na lista de confiança.`:'Este emissor não está na sua lista de confiança.');
  if(minhas().includes(vc.did)){const rec=st.issued.find(i=>i.jti===q.jti);add(!!rec&&!rec.revoked,'Não revogada',!rec?'Não consta no registro de emissões.':rec.revoked?`Revogada em ${fmtDate(rec.revokedAt)}: ${esc(rec.reason)}.`:'Ativa no registro de emissões.')}
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

/* ================= governança ================= */
function renderGov(){
  if(!st)return;
  $('#gName').value=st.name;$('#gDid').textContent=ses.did;$('#gRotAv').hidden=!(st.rotations||[]).length;
  $('#gPolV').textContent=st.acceptUnverifiable?'Aceitar':'Recusar';
  $('#gTrust').innerHTML=`<div class="tx"><span class="dot">${ic('gov')}</span><span class="t"><b>${esc(st.name)}</b><small>Este emissor</small></span><span class="pill ok">Você</span></div>`
    +st.trust.map((t,i)=>`<div class="tx"><span class="dot">${ic('shield')}</span><span class="t"><b>${esc(t.name)}</b><small class="mono">${esc(shortDid(t.did))}</small></span><button class="mini sm" data-untrust="${i}" aria-label="Remover emissor">${ic('trash')}</button></div>`).join('');
  const list=st.issued.slice().reverse();
  $('#gIssN').textContent=list.length?`${list.length} no total`:'';
  $('#gIssued').innerHTML=list.length?list.slice(0,40).map(i=>{const[c,l]=issStatus(i);return `<button class="tx" data-iss="${i.n}"><span class="dot">${ic('badge')}</span><span class="t"><b>${esc(vcLabel(i.type))}</b><small>${esc(i.holderName||shortDid(i.sub))}, ${fmtDate(i.iat*1000)}</small></span><span class="pill ${c}">${l}</span></button>`}).join('')
    :'<div class="empty">Nenhuma credencial emitida ainda.</div>';
}
$('#gNameS').onclick=async()=>{
  const n=$('#gName').value.trim();if(!n||n===st.name)return;
  st.name=n;await ato('nome',`Nome público alterado para ${n}`);await save();$('#whoLabel').textContent=n;toast('Nome salvo');
};
$('#gDidC').onclick=()=>copy(ses.did,'DID copiado');

/* ================= troca da chave (DP-09) ================= */
// A Governança passa a assinar com uma identidade nova, de 12 palavras novas. A chave antiga assina o aviso
// de troca e a nova assina junto, provando que aceita. O livro, as emissões e a confiança continuam; cada ato
// é conferido com a chave da época dele, e credenciais da chave antiga continuam sendo desta Governança.
let rot=null;
async function avisoValido(texto){
  const r=await verifyJWT(texto,'rotacao+jwt');
  if(!r.ok)throw new Error('A assinatura da chave antiga não confere: o aviso foi alterado.');
  const p=r.payload;
  if(!p.novo||p.novo===p.iss)throw new Error('O aviso não diz qual é a chave nova.');
  const ok=await S.verify({name:'Ed25519'},await didToEdKey(p.novo),b64u.dec(p.aceite||''),te.encode(`${p.iss}>${p.novo}`)).catch(()=>false);
  if(!ok)throw new Error('A chave nova não assinou o aceite: o aviso não vale.');
  return r;
}
$('#gRot').onclick=async()=>{
  if(!await confirmSheet('Trocar a chave da Governança','A Governança passa a assinar com 12 palavras novas. As palavras atuais deixam de abrir esta Governança, a biometria precisa ser ativada de novo e quem confia nela deve importar o aviso de troca. O livro e as emissões continuam.','Continuar',true))return;
  if(!await reauth('Trocar a chave'))return;
  const ent=rnd(16),words=await entropyToWords(ent,'pt'),pos=[];
  while(pos.length<3){const p=1+crypto.getRandomValues(new Uint32Array(1))[0]%12;if(!pos.includes(p))pos.push(p)}
  rot={ent,words,check:pos.sort((a,b)=>a-b),pin:null};
  openSheet(`<h3>As 12 palavras novas</h3><p class="sub">Anote em papel, nesta ordem. Elas passam a ser a identidade da Governança.</p>
    <ol class="words glass veil" id="rtWords">${words.map(w=>`<li>${w}</li>`).join('')}</ol><div class="reveal"><button class="link" id="rtVeil" style="margin:0">Mostrar palavras</button></div>
    <div id="rtConf">${rot.check.map(p=>`<label class="f" data-p="${p}"><span>Palavra nº ${p}</span><input autocomplete="off" autocapitalize="none" spellcheck="false"></label>`).join('')}</div>
    <p class="hint" id="rtH"></p><button class="btn" id="rtGo">Conferir e criar o PIN</button>`,()=>{if(rot&&rot.ent)rot.ent.fill(0);rot=null});
  $('#rtVeil').onclick=()=>{const g=$('#rtWords');g.classList.toggle('veil');$('#rtVeil').textContent=g.classList.contains('veil')?'Mostrar palavras':'Esconder palavras'};
  $('#rtGo').onclick=()=>{
    let ok=true;
    $('#rtConf').querySelectorAll('.f').forEach(f=>{const good=normWords(f.querySelector('input').value)[0]===rot.words[f.dataset.p-1];f.classList.toggle('bad',!good);if(!good)ok=false});
    if(!ok){$('#rtH').textContent='Alguma palavra não confere. Confira a anotação.';$('#rtH').classList.add('bad');return}
    $('#sheetBody').innerHTML=`<div style="text-align:center"><h3 id="rtT">PIN da chave nova</h3><p class="sub">Seis dígitos, sem sequências. Ele abre a Governança neste aparelho.</p><div id="rtPad"></div></div>`;
    let first=null;
    makePad($('#rtPad'),{onPin:async(pin,a)=>{
      if(!first){if(weakPin(pin))return a.reset(WEAK_MSG,true);first=pin;$('#rtT').textContent='Repita o PIN';return a.reset()}
      if(pin!==first){first=null;$('#rtT').textContent='PIN da chave nova';return a.reset('Os PINs não conferem. Comece de novo.',true)}
      a.say('Trocando a chave…');
      await trocarChave(pin);
    }});
  };
};
async function trocarChave(pin){
  const velho=ses.did,seed=await wordsToSeed(rot.words),novo=await deriveIdentity(seed);seed.fill(0);
  const aceite=b64u.enc(await S.sign({name:'Ed25519'},novo.edPriv,te.encode(`${velho}>${novo.did}`)));
  const iat=now(),aviso=await signJWT('rotacao+jwt',{iss:velho,novo:novo.did,name:st.name,aceite,iat});
  if(!st.keys)st.keys=[{did:velho,from:1}];
  await ato('rotacao',`Chave trocada: ${shortDid(velho)} → ${shortDid(novo.did)}`,novo.did);
  st.keys.push({did:novo.did,from:st.book.length+1});
  st.rotations=[...(st.rotations||[]),aviso];
  // Daqui em diante, tudo é assinado e cifrado com a identidade nova.
  ses.ent.fill(0);
  ses={...novo,ent:new Uint8Array(rot.ent),lang:'pt'};
  rot.ent.fill(0);rot=null;
  await ato('rotacao','Nova chave em uso: este ato já é assinado por ela',velho);
  // O cadeado e o estado mudam juntos: a entropia nova com o PIN novo e o estado cifrado com a chave nova.
  await writeLock(ses.ent,pin);await DB.set('guard',{fails:0,until:0});
  await save();
  await DB.set('meta',{did:ses.did,lang:'pt',created:Date.now()});
  const bio=await DB.get('bioLock');if(bio){forgetPasskey(b64u.dec(bio.cred));await DB.del('bioLock')}
  sheetClose=null;closeSheet();
  $('#didShort').textContent=shortDid(ses.did);renderGov();refreshBio();
  toast('Chave trocada. Copie o aviso para quem confia na Governança');
}
$('#gRotAv').onclick=()=>{const a=(st.rotations||[]).at(-1);if(a)copy(embrulhar(a),'Aviso de troca copiado')};
$('#gTrustRot').onclick=()=>{
  openSheet(`<h3>Importar troca de chave</h3><p class="sub">Cole o aviso de troca de um emissor em que você confia. Ele passa a ser reconhecido pela chave nova.</p>
    <label class="f" id="irF"><span>Aviso de troca</span><textarea class="mono" id="irT" rows="5" spellcheck="false" placeholder="SYSTEKNA:ROTACAO:…"></textarea></label><p class="hint" id="irH"></p>
    <button class="btn" id="irGo">Conferir e importar</button>`);
  $('#irGo').onclick=async()=>{
    const H=$('#irH'),fail=m=>{H.textContent=m;H.classList.add('bad');shake($('#irF'))};
    let r;try{r=await avisoValido($('#irT').value)}catch(e){return fail(e.message)}
    const t=st.trust.find(x=>x.did===r.payload.iss);
    if(!t)return fail(st.trust.some(x=>x.did===r.payload.novo)?'Esta troca já foi importada.':'O emissor da chave antiga não está na sua lista de confiança.');
    t.did=r.payload.novo;t.at=Date.now();
    await ato('confianca',`${t.name} trocou de chave: ${shortDid(r.payload.iss)} → ${shortDid(r.payload.novo)}`,r.payload.novo);await save();
    closeSheet();renderGov();toast('Troca de chave importada');
  };
};
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
    i.revoked=true;i.revokedAt=Date.now();i.reason=reason;
    await ato('revogacao',`${vcLabel(i.type)} de ${i.holderName||shortDid(i.sub)} revogada: ${reason}`,i.jti);await save();renderGov();toast('Credencial revogada');
  });
}

boot();
