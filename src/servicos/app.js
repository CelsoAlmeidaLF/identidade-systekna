/* ================= serviço ================= */
// Serviços Systekna: cada empresa ou serviço (SRV) tem a própria identidade, pede credenciamento à
// Governança, emite crachás (CV:KEY) para quem tem a Identidade aprovada e confere o acesso na portaria.
let st=null;
const APP={
  db:'systekna-servicos',dominio:'servicos',label:'Serviços',dataKeys:['state'],createdMsg:'Serviço criado',autoDefault:10,
  importHint:'Substitui o livro e os registros deste serviço',
  howHtml:`<p><b>Papel.</b> O serviço dá acesso aos apps dele (portaria, aulas, sistema) sem guardar cadastro: quem prova quem é a pessoa é a Identidade aprovada pela Governança, que fica na carteira dela.</p>
  <p><b>Credenciamento.</b> O serviço só emite crachás depois de credenciado pela Governança, que define para quais apps e até quando. O Cartão do serviço leva esse credenciamento, para a carteira conferir antes de pedir o crachá.</p>
  <p><b>Crachá.</b> A pessoa pede pela carteira, com a Identidade junto. O serviço confere, sem consultar a Governança, que a Identidade foi assinada por ela, é da mesma pessoa e está válida, e emite um crachá por app, com a validade escolhida, nunca além do credenciamento. Cada pessoa tem um crachá ativo por app.</p>
  <p><b>Portaria.</b> O desafio vale 10 minutos e uma única vez. A portaria confere que quem responde é o dono do crachá, que o crachá foi emitido aqui, é do app certo, não foi revogado e está válido, e que o credenciamento continua vigente.</p>
  <p><b>Limite.</b> O serviço não enxerga revogações feitas pela Governança: a proteção é a validade da Identidade e do credenciamento.</p>`,
  async load(){
    const r=await DB.get('state');
    st=r?await unseal(ses.vaultKey,r,'state'):null;
    if(!st){
      const gov=GOVERNANCA_PADRAO.did?{name:GOVERNANCA_PADRAO.name,dids:[GOVERNANCA_PADRAO.did]}:null;
      st={name:'',apps:[],gov,cred:null,issued:[],book:[],challenges:[],seq:0,verifs:0};
      await ato('abertura','Livro aberto e serviço criado',ses.did);await save();
    }
  },
  enter(){$('#whoLabel').textContent=nomeServico();mountCommonSettings($('#commonSet'));setView('vPanel')},
  onView(v){if(v==='vPanel')renderPanel();if(v==='vSrv')renderSrv();if(v==='vGate')fillGateApps()},
  onLock(){
    st=null;pedido=null;
    ['#pCred','#pAtos','#pBook','#cWho','#cApps','#cOk','#cList','#gaOut','#sCred','#sIssued'].forEach(s=>$(s).innerHTML='');
    ['#cqT','#gaChalT','#gaPT','#sName','#sApps'].forEach(s=>$(s).value='');
    ['#cForm','#cOut','#gaChal'].forEach(s=>$(s).hidden=true);
    $('#whoLabel').textContent='Serviços Systekna';
  },
  exportData:async()=>st,
  async importData(d){
    if(!d||!Array.isArray(d.book)||!d.book.length)return 'Backup sem livro de registros';
    const c=await checkBook(d.book,chaves(d));
    if(!c.ok)return `Backup recusado: o livro se rompe no ato nº ${c.at}. Nada foi alterado.`;
    st=d;await save();$('#whoLabel').textContent=nomeServico();renderPanel();
    return `Serviço restaurado com ${st.book.length} atos`;
  }
};
ATO_IC.credenciamento='badge';
const CLOCK_SKEW=60;
const nomeServico=()=>st&&st.name||'Serviços Systekna';
// A Governança guarda todos os DIDs que já teve: Identidades da chave antiga continuam valendo.
const govDid=()=>st.gov&&st.gov.dids.at(-1);
const daGov=did=>!!st.gov&&st.gov.dids.includes(did);
const credOk=()=>!!st.cred&&(!st.cred.exp||st.cred.exp>now());
const credApps=()=>credOk()?st.cred.apps:[];
const listaApps=t=>[...new Set(String(t||'').split(',').map(a=>a.trim()).filter(Boolean))];

function credResumo(){
  if(!st.gov)return verdictHtml(false,'Governança não informada','Em Serviço, informe o DID da Governança em que este serviço confia.');
  if(!st.cred)return verdictHtml(false,'Sem credenciamento','Peça o credenciamento à Governança em Serviço. Sem ele, o serviço não emite crachás.');
  if(!credOk())return verdictHtml(false,'Credenciamento vencido',`Venceu em ${fmtDate(st.cred.exp*1000)}. Peça um novo à Governança.`);
  return verdictHtml(true,`Credenciado pela ${esc(st.gov.name)}`,`${st.cred.exp?'Até '+fmtDate(st.cred.exp*1000):'Sem validade'}, para ${esc(st.cred.apps.join(', '))}.`);
}

/* ================= painel ================= */
async function renderPanel(){
  if(!st)return;
  $('#pName').textContent=nomeServico();
  $('#pCred').innerHTML=credResumo();$('#pCred').firstElementChild.style.marginTop='0';
  const crachas=st.issued.filter(i=>i.type==='BadgeCredential');
  $('#sA').textContent=crachas.filter(i=>issStatus(i)[0]==='ok').length;
  $('#sR').textContent=crachas.filter(i=>i.revoked).length;
  $('#sP').textContent=credApps().length;$('#sV').textContent=st.verifs;
  $('#pAtos').innerHTML=st.book.slice(-6).reverse().map(e=>atoRow(e)).join('');
  const c=await checkBook();
  $('#pBook').innerHTML=c.ok?verdictHtml(true,'Livro íntegro',`${c.n} ${c.n===1?'ato encadeado e assinado':'atos encadeados e assinados'} pelo serviço.`)
    :verdictHtml(false,'Livro adulterado',`A corrente se rompe no ato nº ${c.at}. Restaure um backup.`);
}
$('#pAll').onclick=showBook;

/* ================= serviço: nome, Governança, credenciamento, cartão ================= */
function renderSrv(){
  if(!st)return;
  $('#sName').value=st.name;$('#sApps').value=st.apps.join(', ');$('#sDid').textContent=ses.did;$('#sLeg').hidden=!!ses.dom;
  $('#sGovN').textContent=st.gov?st.gov.name:'Governança não informada';
  $('#sGovD').textContent=st.gov?shortDid(govDid()):'Toque para informar o DID';
  $('#sCred').innerHTML=credResumo();$('#sCred').firstElementChild.style.marginTop='0';
  const list=st.issued.slice().reverse();
  $('#sIssN').textContent=list.length?`${list.length} no total`:'';
  $('#sIssued').innerHTML=list.length?list.slice(0,40).map(i=>{const[c,l]=issStatus(i);return `<button class="tx" data-iss="${i.n}"><span class="dot">${ic('badge')}</span><span class="t"><b>${esc(i.claims.app)}</b><small>${esc(i.holderName||shortDid(i.sub))}, ${fmtDate(i.iat*1000)}</small></span><span class="pill ${c}">${l}</span></button>`}).join('')
    :'<div class="empty">Nenhum crachá emitido ainda.</div>';
}
$('#sIssued').onclick=e=>{const b=e.target.closest('[data-iss]');if(b)showIssued(+b.dataset.iss,renderSrv)};
$('#sDidC').onclick=()=>copy(ses.did,'DID copiado');
$('#sSave').onclick=async()=>{
  const name=$('#sName').value.trim(),apps=listaApps($('#sApps').value);
  if(!name){shake($('#sName').closest('.f'));return toast('Informe o nome do serviço',true)}
  if(!apps.length){shake($('#sApps').closest('.f'));return toast('Informe ao menos um app',true)}
  const pii=piiProblem({nome:name,...Object.fromEntries(apps.map((a,i)=>[`app ${i+1}`,a]))});if(pii)return toast(pii,true);
  if(name===st.name&&apps.join()===st.apps.join())return;
  st.name=name;st.apps=apps;
  await ato('nome',`Serviço ${name}, apps: ${apps.join(', ')}`);await save();
  $('#whoLabel').textContent=name;renderSrv();toast('Serviço salvo');
};
$('#sGov').onclick=()=>{
  openSheet(`<h3>Governança</h3><p class="sub">O DID da Governança que credencia este serviço e aprova as Identidades que ele aceita.</p>
    <label class="f" id="gvNF"><span>Nome</span><input id="gvN" autocomplete="off" value="${esc(st.gov?st.gov.name:GOVERNANCA_PADRAO.name)}"></label>
    <label class="f" id="gvDF"><span>DID da Governança</span><input id="gvD" class="mono" autocomplete="off" autocapitalize="none" spellcheck="false" placeholder="did:key:z6Mk…" value="${esc(st.gov?govDid():'')}"></label><p class="hint" id="gvH"></p>
    <button class="btn" id="gvGo">Salvar</button>`);
  $('#gvGo').onclick=async()=>{
    const name=$('#gvN').value.trim(),did=$('#gvD').value.trim(),H=$('#gvH');
    const fail=(m,f)=>{H.textContent=m;H.classList.add('bad');shake($(f))};
    if(!name)return fail('Informe o nome.','#gvNF');
    try{await didToEdKey(did)}catch(e){return fail(e.message,'#gvDF')}
    if(minhas().includes(did))return fail('Este é o DID do próprio serviço.','#gvDF');
    if(st.gov&&govDid()===did&&st.gov.name===name){closeSheet();return}
    const troca=st.gov&&!daGov(did);
    if(troca&&st.cred&&!await confirmSheet('Trocar de Governança','O credenciamento atual foi dado pela outra Governança e deixa de valer aqui. Será preciso pedir um novo.','Trocar',true))return;
    st.gov=troca||!st.gov?{name,dids:[did]}:{...st.gov,name};
    if(troca)st.cred=null;
    await ato('confianca',`${name} definida como Governança do serviço`,did);await save();
    closeSheet();renderSrv();toast('Governança salva');
  };
};
$('#sGovRot').onclick=()=>{
  openSheet(`<h3>Importar troca de chave</h3><p class="sub">Cole o aviso de troca de chave da Governança. Identidades e credenciamentos da chave antiga continuam valendo.</p>
    <label class="f" id="irF"><span>Aviso de troca</span><textarea class="mono" id="irT" rows="5" spellcheck="false" placeholder="SYSTEKNA:ROTACAO:…"></textarea></label><p class="hint" id="irH"></p>
    <button class="btn" id="irGo">Conferir e importar</button>`);
  $('#irGo').onclick=async()=>{
    const H=$('#irH'),fail=m=>{H.textContent=m;H.classList.add('bad');shake($('#irF'))};
    let r;try{r=await avisoValido($('#irT').value)}catch(e){return fail(e.message)}
    const p=r.payload;
    if(daGov(p.novo))return fail('Esta troca já foi importada.');
    if(!daGov(p.iss))return fail('O aviso não é da Governança deste serviço.');
    st.gov.dids.push(p.novo);
    await ato('confianca',`${st.gov.name} trocou de chave: ${shortDid(p.iss)} → ${shortDid(p.novo)}`,p.novo);await save();
    closeSheet();renderSrv();toast('Troca de chave importada');
  };
};
$('#sAsk').onclick=async()=>{
  if(!st.name||!st.apps.length)return toast('Informe e salve o nome e os apps do serviço antes de pedir.',true);
  const iat=now();
  const tok=embrulhar(await signJWT('pedido+jwt',{iss:ses.did,sub:ses.did,aud:st.gov?govDid():'emissor',name:st.name,wanted:'ServiceAccreditationCredential',apps:st.apps,note:'',nonce:b64u.enc(rnd(16)),iat,exp:iat+7*86400}));
  openSheet(`<h3>Pedido de credenciamento</h3><p class="sub">Leve este pedido à Governança. Ele vale por 7 dias e prova que o serviço controla este DID.</p>
    <label class="f"><span>Pedido assinado</span><textarea class="mono" id="saJ" rows="6" readonly>${tok}</textarea></label><button class="btn" id="saC">Copiar pedido</button>`);
  $('#saC').onclick=()=>copy(tok,'Pedido copiado');
};
$('#sRecv').onclick=()=>{
  openSheet(`<h3>Receber credenciamento</h3><p class="sub">Cole o credenciamento que a Governança emitiu para este serviço.</p>
    <label class="f" id="srF"><span>Credenciamento</span><textarea class="mono" id="srT" rows="6" spellcheck="false" placeholder="SYSTEKNA:CREDENCIAMENTO:…"></textarea></label><p class="hint" id="srH"></p>
    <button class="btn" id="srGo">Conferir e guardar</button>`);
  $('#srGo').onclick=async()=>{
    const H=$('#srH'),fail=m=>{H.textContent=m;H.classList.add('bad');shake($('#srF'))};
    let r;try{r=await verifyJWT($('#srT').value)}catch(e){return fail(e.message)}
    const p=r.payload;
    if(r.header.typ!=='vc+jwt'||!p.vc||vcType(p)!=='ServiceAccreditationCredential')return fail('Isto não é um credenciamento.');
    if(!r.ok)return fail('A assinatura não confere: o credenciamento foi alterado.');
    if(p.sub!==ses.did)return fail('Este credenciamento é de outro serviço.');
    if(!st.gov)return fail('Informe antes a Governança deste serviço.');
    if(!daGov(r.did))return fail('Este credenciamento não foi assinado pela Governança deste serviço.');
    const t0=now();
    if(p.exp&&p.exp<=t0)return fail(`Este credenciamento venceu em ${fmtDate(p.exp*1000)}.`);
    if(p.nbf&&p.nbf>t0+CLOCK_SKEW)return fail(`Este credenciamento só vale a partir de ${fmtDate(p.nbf*1000)}.`);
    const cs=p.vc.credentialSubject||{},apps=Array.isArray(cs.apps)?cs.apps:[];
    if(!apps.length)return fail('O credenciamento não lista nenhum app.');
    st.cred={jwt:r.tok,jti:p.jti,iat:p.iat,exp:p.exp||0,apps,servico:cs.servico||''};
    await ato('credenciamento',`Credenciado pela ${st.gov.name} para ${apps.join(', ')}${p.exp?' até '+fmtDate(p.exp*1000):', sem validade'}`,p.jti);await save();
    closeSheet();renderSrv();toast('Credenciamento guardado');
  };
};
$('#sCard').onclick=async()=>{
  if(!credOk())return toast('Sem credenciamento válido, o serviço não tem cartão.',true);
  const iat=now(),pl={iss:ses.did,name:nomeServico(),apps:st.cred.apps,credenciamento:st.cred.jwt,iat};
  if(st.cred.exp)pl.exp=st.cred.exp;
  const tok=embrulhar(await signJWT('cartao+jwt',pl));
  openSheet(`<h3>Cartão do serviço</h3><p class="sub">É público: a carteira lê o cartão e confere que o serviço é credenciado pela Governança antes de pedir o crachá.</p>
    <label class="f"><span>Cartão assinado</span><textarea class="mono" id="scJ" rows="6" readonly>${tok}</textarea></label><button class="btn" id="scC">Copiar cartão</button>`);
  $('#scC').onclick=()=>copy(tok,'Cartão copiado');
};

/* ================= crachás ================= */
let pedido=null;
$('#cqGo').onclick=async()=>{
  const H=$('#cqH'),fail=m=>{H.textContent=m;H.classList.add('bad');shake($('#cqF'));$('#cForm').hidden=true;pedido=null};
  H.textContent='';H.classList.remove('bad');$('#cOut').hidden=true;$('#cForm').hidden=true;$('#cWho').innerHTML='';
  let r;try{r=await verifyJWT($('#cqT').value)}catch(e){return fail(e.message)}
  const p=r.payload;
  if(r.header.typ!=='pedido+jwt')return fail('Isto não é um pedido. Na carteira, a pessoa gera o pedido de crachá.');
  if(!r.ok)return fail('A assinatura do pedido não confere: ele foi alterado ou não foi assinado por este DID.');
  if(p.wanted!=='BadgeCredential')return fail('Este pedido não é de crachá. A Identidade é aprovada pela Governança.');
  if(p.exp&&p.exp<now())return fail('Este pedido expirou. Peça um novo à pessoa.');
  if(p.aud&&p.aud!=='emissor'&&p.aud!==ses.did)return fail('Este pedido foi feito para outro serviço.');
  if(st.issued.some(i=>i.nonce&&i.nonce===p.nonce))return fail('Este pedido já foi atendido. Peça um novo à pessoa.');
  if(!credOk())return fail('O serviço está sem credenciamento válido da Governança. Sem ele, não emite crachás.');
  if(!p.identidade)return fail('O pedido não traz a Identidade aprovada pela Governança.');
  let id;try{id=await verifyJWT(p.identidade,'vc+jwt')}catch(e){return fail(`A Identidade do pedido não é legível: ${e.message}`)}
  const q=id.payload;
  if(!id.ok)return fail('A assinatura da Identidade não confere: ela foi alterada.');
  if(vcType(q)!=='IdentityCredential')return fail('O pedido não traz uma Identidade.');
  if(!daGov(id.did))return fail('A Identidade não foi aprovada pela Governança deste serviço.');
  if(q.sub!==r.did)return fail('A Identidade é de outra pessoa.');
  const t0=now();
  if(q.exp&&q.exp<=t0)return fail(`A Identidade venceu em ${fmtDate(q.exp*1000)}. A pessoa precisa renovar na Governança.`);
  if(q.nbf&&q.nbf>t0+CLOCK_SKEW)return fail('A Identidade ainda não está em vigor.');
  const nome=String((vcClaims(q).find(c=>c[0]==='nome')||[])[1]||'');
  pedido={r,nome};
  const pedidos=Array.isArray(p.apps)?p.apps.map(String):[],fora=pedidos.filter(a=>!st.cred.apps.includes(a));
  $('#cWho').innerHTML=verdictHtml(true,'Pedido conferido',`${esc(nome)} tem a Identidade aprovada pela ${esc(st.gov.name)} e controla ${esc(shortDid(r.did))}.${fora.length?' Fora do credenciamento: '+esc(fora.join(', '))+'.':''}`);
  $('#cApps').innerHTML=st.cred.apps.map(a=>`<button class="choice" data-app="${esc(a)}" aria-pressed="${!pedidos.length||pedidos.includes(a)}"><span class="rd"></span><span class="t"><b>${esc(a)}</b></span></button>`).join('');
  $('#cForm').hidden=false;
};
$('#cApps').onclick=e=>{const b=e.target.closest('[data-app]');if(b)b.setAttribute('aria-pressed',b.getAttribute('aria-pressed')!=='true')};
async function emitirCracha(sub,app,iat,exp,nome,nonce){
  const n=++st.seq,jti='urn:uuid:'+crypto.randomUUID(),claims={servico:nomeServico(),app};
  const payload={iss:ses.did,sub,iat,nbf:iat,jti,vc:{'@context':VC_CONTEXT,type:['VerifiableCredential','BadgeCredential'],issuer:{id:ses.did,name:nomeServico()},issuanceDate:new Date(iat*1000).toISOString(),
    credentialSubject:{id:sub,...claims},credentialStatus:{id:`${ses.did}#status-${n}`,type:'SysteknaStatusRegistry',statusListIndex:n},
    // O credenciamento vai junto, como prova de que a Governança autorizou o serviço para este app.
    evidence:[{type:['CredenciamentoSystekna'],credenciamento:st.cred.jwt}]}};
  if(exp)payload.exp=exp;
  const jwt=await signJWT('vc+jwt',payload);
  const antigos=st.issued.filter(i=>i.sub===sub&&i.type==='BadgeCredential'&&i.claims.app===app&&!i.revoked&&!(i.exp&&i.exp<iat));
  st.issued.push({n,jti,sub,type:'BadgeCredential',claims,iat,exp,holderName:nome,nonce,revoked:false});
  await ato('emissao',`Crachá ${app} emitido para ${nome||shortDid(sub)}`,jti);
  for(const a of antigos){
    a.revoked=true;a.revokedAt=Date.now();a.reason='Substituído por novo crachá';
    await ato('revogacao',`Crachá ${app} nº ${a.n} de ${a.holderName||shortDid(a.sub)} revogado: substituído por novo crachá`,a.jti);
  }
  return jwt;
}
$('#cGo').onclick=async()=>{
  if(!pedido)return;
  const apps=[...$('#cApps').querySelectorAll('[aria-pressed="true"]')].map(b=>b.dataset.app);
  if(!apps.length)return toast('Escolha ao menos um app',true);
  if(!credOk())return toast('O credenciamento venceu. Peça um novo à Governança.',true);
  const days=+$('#cDays').value,iat=now();
  // A validade escolhida nunca passa a do credenciamento (DP-07).
  let exp=days?iat+days*86400:0;
  if(st.cred.exp)exp=exp?Math.min(exp,st.cred.exp):st.cred.exp;
  const toks=[];
  for(const app of apps)toks.push([app,embrulhar(await emitirCracha(pedido.r.did,app,iat,exp,pedido.nome,pedido.r.payload.nonce))]);
  await save();
  $('#cOk').innerHTML=verdictHtml(true,apps.length>1?'Crachás emitidos':'Crachá emitido',`${esc(apps.join(', '))} para ${esc(pedido.nome||shortDid(pedido.r.did))}${exp?', até '+fmtDate(exp*1000):', sem validade'}. Entregue cada crachá à pessoa.`);
  $('#cList').innerHTML=toks.map(([app,t],i)=>`<label class="f"><span>Crachá ${esc(app)}</span><textarea class="mono" rows="4" readonly data-cracha="${i}">${t}</textarea></label><button class="btn ghost" data-cp="${i}">Copiar crachá ${esc(app)}</button>`).join('');
  $('#cList').onclick=e=>{const b=e.target.closest('[data-cp]');if(b)copy(toks[+b.dataset.cp][1],'Crachá copiado')};
  $('#cForm').hidden=true;$('#cOut').hidden=false;pedido=null;toast(apps.length>1?'Crachás emitidos':'Crachá emitido');
};
$('#cNew').onclick=()=>{$('#cqT').value='';$('#cOut').hidden=true;$('#cqH').textContent='';$('#cqT').focus()};

/* ================= portaria ================= */
function fillGateApps(){
  if(!st)return;
  const apps=credApps();
  $('#gaApp').innerHTML=apps.length?apps.map(a=>`<option>${esc(a)}</option>`).join(''):'<option value="">Sem credenciamento</option>';
}
$('#gaGen').onclick=async()=>{
  const app=$('#gaApp').value;
  if(!app||!credApps().includes(app))return toast('Sem credenciamento válido para este app',true);
  const nonce=b64u.enc(rnd(18)),iat=now(),purpose=`Acesso a ${app}`;
  $('#gaChalT').value=embrulhar(await signJWT('desafio+jwt',{iss:ses.did,name:nomeServico(),nonce,purpose,accept:'BadgeCredential',app,iat,exp:iat+600}));
  st.challenges=st.challenges.filter(c=>c.exp>iat-86400);
  st.challenges.push({nonce,type:'BadgeCredential',app,purpose,iat,exp:iat+600,used:false});await save();
  $('#gaChal').hidden=false;toast('Desafio gerado');
};
$('#gaChalC').onclick=()=>copy($('#gaChalT').value,'Desafio copiado');
async function checkProva(tok){
  const checks=[],add=(ok,label,detail)=>checks.push({ok,label,detail});
  let vp;
  try{vp=await verifyJWT(tok)}catch(e){add(false,'Formato',esc(e.message));return{checks}}
  if(vp.header.typ!=='vp+jwt'){
    add(false,'Formato',vp.payload.vc?'Isto é um crachá sozinho, sem prova. Peça à pessoa para responder a um desafio da portaria.':'Isto não é uma prova da carteira.');
    return{checks};
  }
  const p=vp.payload;
  add(vp.ok,'Assinatura do titular',vp.ok?`Assinada pela chave de ${esc(shortDid(vp.did))}.`:'A prova foi alterada ou não foi assinada por este titular.');
  const ch=st.challenges.find(c=>c.nonce===p.nonce),chOk=!!ch&&p.aud===ses.did&&!ch.used;
  add(chOk,'Desafio desta portaria',!ch?'O desafio não foi gerado aqui.':p.aud!==ses.did?'A prova foi feita para outro serviço.':ch.used?'Este desafio já foi usado. Pode ser uma cópia sendo reaproveitada.':`Responde ao desafio “${esc(ch.purpose)}”.`);
  add(!!ch&&ch.exp>now()&&p.exp>now(),'Dentro do prazo',p.exp<=now()?'A prova expirou. Gere um novo desafio.':ch&&ch.exp<=now()?'O desafio expirou.':'Apresentada dentro dos prazos.');
  const vcTok=p.vp&&p.vp.verifiableCredential&&p.vp.verifiableCredential[0];
  if(!vcTok){add(false,'Crachá','A prova não contém crachá.');return{checks,ch}}
  let vc;
  try{vc=await verifyJWT(vcTok,'vc+jwt')}catch(e){add(false,'Crachá',esc(e.message));return{checks,ch}}
  const q=vc.payload,cs=(q.vc&&q.vc.credentialSubject)||{};
  if(vcType(q)!=='BadgeCredential'){add(false,'Crachá',`Veio ${esc(vcLabel(vcType(q)))}, e não um crachá.`);return{checks,ch}}
  const meu=minhas().includes(vc.did);
  add(vc.ok&&meu,'Emitido por este serviço',!vc.ok?'O crachá foi alterado depois de emitido.':meu?`Assinado por ${esc(nomeServico())}.`:'O crachá foi emitido por outro serviço.');
  add(q.sub===vp.did,'Crachá é do titular',q.sub===vp.did?'O DID do crachá é o mesmo de quem respondeu.':'O crachá é de outra pessoa.');
  if(ch)add(cs.app===ch.app,'App certo',cs.app===ch.app?`Crachá de ${esc(cs.app)}.`:`O desafio é para ${esc(ch.app)} e o crachá é de ${esc(cs.app||'nenhum app')}.`);
  const rec=meu?st.issued.find(i=>i.jti===q.jti):null;
  add(!!rec&&!rec.revoked,'Não revogado',!rec?'Não consta nos crachás emitidos aqui.':rec.revoked?`Revogado em ${fmtDate(rec.revokedAt)}: ${esc(rec.reason)}.`:'Ativo nos crachás emitidos.');
  const t0=now(),early=q.nbf&&q.nbf>t0+CLOCK_SKEW,late=q.exp&&q.exp<=t0;
  add(!early&&!late,'Dentro da validade',early?`Só vale a partir de ${fmtDate(q.nbf*1000)}.`:q.exp?(late?`Venceu em ${fmtDate(q.exp*1000)}.`:`Válido até ${fmtDate(q.exp*1000)}.`):'Sem data de validade.');
  const apps=credApps();
  add(apps.includes(cs.app),'Credenciamento vigente',!credOk()?'O credenciamento do serviço venceu ou não existe.':apps.includes(cs.app)?`A Governança credenciou o serviço para ${esc(cs.app)}.`:`O app ${esc(cs.app||'')} não está no credenciamento.`);
  return{checks,ch,chOk,holder:vp.did,app:cs.app,nome:rec&&rec.holderName};
}
const chkRow=c=>`<div class="chk ${c.ok===true?'ok':c.ok===false?'no':'na'}"><span class="ci">${ic(c.ok===true?'check':c.ok===false?'x':'minus')}</span><div><b>${c.label}</b><small>${c.detail}</small></div></div>`;
$('#gaGo').onclick=async()=>{
  if(!$('#gaPT').value.trim()){shake($('#gaF'));return}
  const r=await checkProva($('#gaPT').value),ok=r.checks.every(c=>c.ok===true);
  if(r.chOk)r.ch.used=true;
  $('#gaOut').innerHTML=verdictHtml(ok,ok?'Acesso liberado':'Acesso negado',ok?`${esc(r.nome||shortDid(r.holder))} pode entrar em ${esc(r.app)}. Conferido em ${r.checks.length} pontos.`:'Veja abaixo o que não passou.')
    +`<div class="list glass flat mt">${r.checks.map(chkRow).join('')}</div>`;
  st.verifs++;
  await ato('verificacao',`Acesso ${ok?'liberado':'negado'}${r.app?' a '+r.app:''}${r.nome?' para '+r.nome:''}`,r.holder||null);await save();
};

boot();
