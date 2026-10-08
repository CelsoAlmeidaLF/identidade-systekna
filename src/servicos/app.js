/* ================= serviço ================= */
// Serviços Systekna: cada empresa ou serviço (SRV) tem a própria identidade, pede à Governança a aprovação de
// emissão dos apps dele, emite crachás (CV:KEY) para quem tem a Identidade aprovada e confere o acesso na portaria.
let st=null;
const APP={
  db:'systekna-servicos',dominio:'servicos',label:'Serviços',dataKeys:['state'],createdMsg:'Serviço criado',autoDefault:10,
  importHint:'Substitui o livro e os registros deste serviço',
  howHtml:`<p><b>Papel.</b> O serviço dá acesso aos apps dele (portaria, aulas, sistema) sem guardar cadastro: quem prova quem é a pessoa é a Identidade aprovada pela Governança, que fica na carteira dela.</p>
  <p><b>Aprovação de emissão.</b> O serviço só emite crachás de um app depois que a Governança aprova a emissão dele, até a data que ela define. Pode haver várias aprovações ativas, cada uma com os apps dela: para um app novo, basta pedir só ele. O Cartão do serviço leva as aprovações, para a carteira conferir antes de pedir o crachá. Tocar no cartão de um app no painel gera o Cartão só daquele app.</p>
  <p><b>Crachá.</b> A pessoa pede pela carteira, com a Identidade junto. O serviço confere, sem consultar a Governança, que a Identidade foi assinada por ela, é da mesma pessoa e está válida, e emite um crachá por app, com a validade escolhida, nunca além da aprovação daquele app. Cada pessoa tem um crachá ativo por app.</p>
  <p><b>Portaria.</b> O desafio vale 10 minutos e uma única vez. A portaria confere que quem responde é o dono do crachá, que o crachá foi emitido aqui, é do app certo, não foi revogado e está válido, e que a aprovação de emissão do app continua vigente.</p>
  <p><b>Limite.</b> O serviço não enxerga revogações feitas pela Governança: a proteção é a validade da Identidade e da aprovação de emissão.</p>`,
  async load(){
    const r=await DB.get('state');
    st=r?await unseal(ses.vaultKey,r,'state'):null;
    if(!st){
      const gov=GOVERNANCA_PADRAO.did?{name:GOVERNANCA_PADRAO.name,dids:[GOVERNANCA_PADRAO.did]}:null;
      st={name:'',apps:[],gov,aprovacoes:[],pendentes:[],issued:[],book:[],challenges:[],seq:0,verifs:0};
      await ato('abertura','Livro aberto e serviço criado',ses.did);await save();
    }
    // Até a 0.18: um único credenciamento (st.cred). Agora: várias aprovações de emissão.
    if(!st.aprovacoes){st.aprovacoes=st.cred?[st.cred]:[];delete st.cred;await save()}
    if(!st.pendentes)st.pendentes=[];
  },
  enter(){$('#whoLabel').textContent=nomeServico();mountCommonSettings($('#commonSet'));setView('vPanel')},
  onView(v){if(v==='vPanel')renderPanel();if(v==='vSrv')renderSrv();if(v==='vGate')fillGateApps()},
  onLock(){
    st=null;pedido=null;
    ['#pCred','#pAprov','#pOrgN','#pOrgG','#cPessoa','#pAtos','#pBook','#cWho','#cApps','#cOk','#cList','#gaOut','#sIssued'].forEach(s=>$(s).innerHTML='');
    ['#cqT','#gaChalT','#gaPT'].forEach(s=>$(s).value='');
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
ATO_IC.credenciamento='badge';ATO_IC.pedido='send';
const CLOCK_SKEW=60;
const nomeServico=()=>st&&st.name||'Serviços Systekna';
// A Governança guarda todos os DIDs que já teve: Identidades da chave antiga continuam valendo.
const govDid=()=>st.gov&&st.gov.dids.at(-1);
const daGov=did=>!!st.gov&&st.gov.dids.includes(did);
// Aprovações de emissão: o serviço pode ter várias ativas, cada uma com os apps dela.
const valida=a=>!a.exp||a.exp>now();
const aprovValidas=()=>st.aprovacoes.filter(valida);
const credApps=()=>[...new Set(aprovValidas().flatMap(a=>a.apps))];
const credOk=()=>credApps().length>0;
// A aprovação que cobre um app: a de validade mais longa (sem validade vale mais).
const aprovDoApp=app=>aprovValidas().filter(a=>a.apps.includes(app)).sort((x,y)=>(y.exp||Infinity)-(x.exp||Infinity))[0];
const listaApps=t=>[...new Set(String(t||'').split(',').map(a=>a.trim()).filter(Boolean))];

function credResumo(){
  if(!st.gov)return verdictHtml(false,'Governança não informada','Em Serviço, informe o DID da Governança em que este serviço confia.');
  if(!credOk())return verdictHtml(false,st.aprovacoes.length?'Aprovações de emissão vencidas':'Sem aprovação de emissão','Toque em + › Solicitar aprovação de emissão. Sem ela, o serviço não emite crachás.');
  return '';
}
// Um cartão por app aprovado: o app, o DID do serviço com copiar e quem aprovou + a validade. Todos ficam
// agrupados sob a organização (o serviço), no ecossistema aprovado pela Governança.
function appsAprovados(){
  const porApp=new Map();
  for(const a of st.aprovacoes)for(const app of a.apps){
    const atual=porApp.get(app);
    // Fica a aprovação que vale por mais tempo (sem validade vale mais); vencida só se não houver outra.
    if(!atual||(valida(a)&&!valida(atual))||(valida(a)===valida(atual)&&(a.exp||Infinity)>(atual.exp||Infinity)))porApp.set(app,a);
  }
  return[...porApp].map(([app,a])=>({app,a}));
}
function cartaoApp({app,a}){
  const venc=!valida(a),pill=!a.exp?'Sem validade':venc?'Vencida':'Até '+fmtDate(a.exp*1000);
  return `<button class="cred g-ServiceAccreditationCredential ${venc?'dim':''}" data-app="${esc(app)}" aria-label="Cartão do app ${esc(app)}"><div class="r1"><b class="tipo">App: ${esc(app)}</b>${ic('badge')}</div><div class="did"><span class="mono" title="${esc(ses.did)}">${esc(shortDid(ses.did))}</span><span class="cp" role="button" tabindex="0" aria-label="Copiar DID" data-copydid="${esc(ses.did)}">${ic('copy')}</span></div><div class="r3"><span class="emissor">${esc(st.gov?st.gov.name:'Governança')}</span><span class="pill on-card">${pill}</span></div></button>`;
}
const cartaoPendente=p=>`<div class="glass flat card pend" data-pend="${esc(p.nonce)}"><div class="kr" style="padding:0"><div class="h"><small>Aprovação de emissão</small><span class="pill warn">Aguardando aprovação</span></div><div class="v">${esc(p.apps.join(' · '))}</div><div class="v sub" style="margin-top:4px">Pedido em ${fmtDate(p.at)}</div></div></div>`;
// Tocar no cartão do app abre o Cartão daquele app; o botão de copiar só copia o DID.
$('#pAprov').onclick=e=>{
  const c=e.target.closest('[data-copydid]');if(c){e.preventDefault();copy(c.dataset.copydid,'DID copiado');return}
  const b=e.target.closest('[data-app]');if(b)cartaoDoApp(b.dataset.app);
};
// Teclado: Enter ou espaço no copiar não abre o cartão.
$('#pAprov').addEventListener('keydown',e=>{const c=e.target.closest('[data-copydid]');if(c&&(e.key==='Enter'||e.key===' ')){e.preventDefault();e.stopPropagation();copy(c.dataset.copydid,'DID copiado')}});

/* ================= painel ================= */
async function renderPanel(){
  if(!st)return;
  $('#pName').textContent=nomeServico();
  $('#pCred').innerHTML=credResumo();if($('#pCred').firstElementChild)$('#pCred').firstElementChild.style.marginTop='0';
  const apps=appsAprovados();
  $('#pOrg').hidden=!apps.length;
  $('#pOrgN').textContent=nomeServico();$('#pOrgG').textContent=`Ecossistema aprovado pela ${st.gov?st.gov.name:'Governança'}`;
  $('#pAprov').innerHTML=st.pendentes.map(cartaoPendente).join('')+apps.map(cartaoApp).join('');
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
  $('#sNome').textContent=st.name||'Ainda sem nome: informe ao solicitar a aprovação de emissão';
  $('#sDid').textContent=ses.did;$('#sLeg').hidden=!!ses.dom;
  $('#sGovN').textContent=st.gov?st.gov.name:'Governança não informada';
  $('#sGovD').textContent=st.gov?shortDid(govDid()):'Toque para informar o DID';
  const list=st.issued.slice().reverse();
  $('#sIssN').textContent=list.length?`${list.length} no total`:'';
  $('#sIssued').innerHTML=list.length?list.slice(0,40).map(i=>{const[c,l]=issStatus(i);return `<button class="tx" data-iss="${i.n}"><span class="dot">${ic('badge')}</span><span class="t"><b>${esc(i.claims.app)}</b><small>${esc(i.holderName||shortDid(i.sub))}, ${fmtDate(i.iat*1000)}</small></span><span class="pill ${c}">${l}</span></button>`}).join('')
    :'<div class="empty">Nenhum crachá emitido ainda.</div>';
}
$('#sIssued').onclick=e=>{const b=e.target.closest('[data-iss]');if(b)showIssued(+b.dataset.iss,renderSrv)};
$('#sDidC').onclick=()=>copy(ses.did,'DID copiado');
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
    if(troca&&st.aprovacoes.length&&!await confirmSheet('Trocar de Governança','As aprovações de emissão atuais foram dadas pela outra Governança e deixam de valer aqui. Será preciso pedir de novo.','Trocar',true))return;
    st.gov=troca||!st.gov?{name,dids:[did]}:{...st.gov,name};
    if(troca){st.aprovacoes=[];st.pendentes=[]}
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
/* ================= menu +: solicitar e receber aprovação de emissão, cartão do serviço ================= */
$('#dockAdd').onclick=()=>{
  const row=(k,icn,t,d)=>`<button class="tx" data-act="${k}"><span class="dot">${ic(icn)}</span><span class="t"><b>${t}</b><small>${d}</small></span>${ic('chev')}</button>`;
  openSheet(`<h3>O que você quer fazer?</h3><div class="list glass flat" style="margin-top:12px">
    ${row('ask','send','Solicitar aprovação de emissão','Pede à Governança a emissão de crachás de apps')}
    ${row('get','inbox','Receber aprovação de emissão','Cola a aprovação que a Governança emitiu')}
    ${row('card','badge','Cartão do serviço','Mostra o cartão público para as carteiras')}</div>`);
  $('#sheetBody').onclick=e=>{const b=e.target.closest('[data-act]');if(b)({ask:solicitarEmissao,get:receberEmissao,card:cartaoServico})[b.dataset.act]()};
};
// Solicitar: nome do serviço e os apps novos. Os apps já aprovados aparecem só para consulta; o pedido leva
// apenas os novos, e cada aprovação recebida soma os apps dela às anteriores.
function solicitarEmissao(){
  const aprovados=credApps();let novos=[];
  openSheet(`<h3>Solicitar aprovação de emissão</h3><p class="sub">A Governança aprova a emissão de crachás de cada app. Peça só os apps novos: as aprovações anteriores continuam valendo.</p>
    ${st.gov?`<div class="list glass flat"><div class="kr"><div class="h"><small>Governança</small></div><div class="v">${esc(st.gov.name)}</div><div class="v mono" style="margin-top:4px">${esc(shortDid(govDid()))}</div></div></div>`
      :`<label class="f" id="saGF"><span>DID da Governança</span><input id="saG" class="mono" autocomplete="off" autocapitalize="none" spellcheck="false" placeholder="did:key:z6Mk…"></label><p class="hint">Informado uma vez, fica guardado.</p>`}
    <label class="f" id="saNF"><span>Nome do serviço</span><input id="saN" autocomplete="off" value="${esc(st.name)}" placeholder="Ex.: Academia Boa Forma"></label>
    ${aprovados.length?`<div class="sec-h">Apps já aprovados</div><div class="list glass flat" id="saOk">${aprovados.map(a=>{const x=aprovDoApp(a);return `<div class="kr"><div class="h"><small>${esc(a)}</small><span class="pill ok">${x.exp?'Até '+fmtDate(x.exp*1000):'Sem validade'}</span></div></div>`}).join('')}</div>`:''}
    <div class="sec-h">Apps para aprovar</div>
    <div class="list glass flat" id="saL"></div>
    <label class="f" id="saAF"><span>App</span><div class="inrow"><input id="saA" autocomplete="off" placeholder="Ex.: Portaria"><button class="mini" id="saAdd" type="button">Adicionar</button></div></label>
    <p class="hint" id="saH"></p>
    <button class="btn" id="saGo">Assinar pedido</button>
    <div id="saOut" hidden><label class="f"><span>Pedido assinado, válido por 7 dias</span><textarea class="mono" id="saJ" rows="6" readonly></textarea></label><button class="btn ghost" id="saC">Copiar pedido</button></div>`);
  const H=$('#saH'),aviso=(m,bad)=>{H.textContent=m;H.classList.toggle('bad',!!bad)};
  const desenhar=()=>{$('#saL').innerHTML=novos.length?novos.map((a,i)=>`<div class="tx"><span class="t"><b>${esc(a)}</b></span><button class="mini sm" data-rm="${i}" aria-label="Tirar ${esc(a)}">${ic('x')}</button></div>`).join(''):'<div class="empty">Nenhum app ainda. Adicione abaixo.</div>'};
  desenhar();
  const adicionar=()=>{
    const a=$('#saA').value.trim();if(!a)return $('#saA').focus();
    if(aprovados.some(x=>fold(x)===fold(a)))return aviso(`${a} já está aprovado.`,true);
    if(novos.some(x=>fold(x)===fold(a)))return aviso(`${a} já está na lista.`,true);
    novos.push(a);$('#saA').value='';aviso('');desenhar();$('#saA').focus();
  };
  $('#saAdd').onclick=adicionar;
  $('#saA').onkeydown=e=>{if(e.key==='Enter'){e.preventDefault();adicionar()}};
  $('#saL').onclick=e=>{const b=e.target.closest('[data-rm]');if(b){novos.splice(+b.dataset.rm,1);desenhar()}};
  $('#saGo').onclick=async()=>{
    const name=$('#saN').value.trim();
    if(!name){shake($('#saNF'));return $('#saN').focus()}
    if(!novos.length)return aviso('Adicione ao menos um app.',true);
    const pii=piiProblem({nome:name,...Object.fromEntries(novos.map((a,i)=>[`app ${i+1}`,a]))});if(pii)return aviso(pii,true);
    if(!st.gov){
      const did=$('#saG').value.trim();
      try{await didToEdKey(did)}catch(e){shake($('#saGF'));return aviso(e.message,true)}
      if(minhas().includes(did)){shake($('#saGF'));return aviso('Este é o DID do próprio serviço.',true)}
      st.gov={name:GOVERNANCA_PADRAO.name,dids:[did]};
      await ato('confianca',`${st.gov.name} definida como Governança do serviço`,did);
    }
    const iat=now(),nonce=b64u.enc(rnd(16));
    const tok=embrulhar(await signJWT('pedido+jwt',{iss:ses.did,sub:ses.did,aud:govDid(),name,wanted:'ServiceAccreditationCredential',apps:novos,note:'',nonce,iat,exp:iat+7*86400}));
    st.name=name;st.apps=[...new Set([...st.apps,...novos])];
    st.pendentes.push({nonce,at:Date.now(),apps:[...novos]});
    await ato('pedido',`Aprovação de emissão pedida para ${novos.join(', ')}`,nonce);await save();
    $('#whoLabel').textContent=name;aviso('');
    $('#saJ').value=tok;$('#saOut').hidden=false;$('#saGo').hidden=true;$('#saAF').hidden=true;
    $('#saC').onclick=()=>copy(tok,'Pedido copiado');toast('Pedido assinado');renderPanel();
  };
}
function receberEmissao(){
  openSheet(`<h3>Receber aprovação de emissão</h3><p class="sub">Cole a aprovação que a Governança emitiu para este serviço. Os apps dela se somam aos já aprovados.</p>
    <label class="f" id="srF"><span>Aprovação de emissão</span><textarea class="mono" id="srT" rows="6" spellcheck="false" placeholder="SYSTEKNA:CREDENCIAMENTO:…"></textarea></label><p class="hint" id="srH"></p>
    <button class="btn" id="srGo">Conferir e guardar</button>`);
  $('#srGo').onclick=async()=>{
    const H=$('#srH'),fail=m=>{H.textContent=m;H.classList.add('bad');shake($('#srF'))};
    let r;try{r=await verifyJWT($('#srT').value)}catch(e){return fail(e.message)}
    const p=r.payload;
    if(r.header.typ!=='vc+jwt'||!p.vc||vcType(p)!=='ServiceAccreditationCredential')return fail('Isto não é uma aprovação de emissão.');
    if(!r.ok)return fail('A assinatura não confere: a aprovação foi alterada.');
    if(p.sub!==ses.did)return fail('Esta aprovação é de outro serviço.');
    if(!st.gov)return fail('Informe antes a Governança deste serviço.');
    if(!daGov(r.did))return fail('Esta aprovação não foi assinada pela Governança deste serviço.');
    if(st.aprovacoes.some(a=>a.jti===p.jti))return fail('Esta aprovação já está guardada.');
    const t0=now();
    if(p.exp&&p.exp<=t0)return fail(`Esta aprovação venceu em ${fmtDate(p.exp*1000)}.`);
    if(p.nbf&&p.nbf>t0+CLOCK_SKEW)return fail(`Esta aprovação só vale a partir de ${fmtDate(p.nbf*1000)}.`);
    const cs=p.vc.credentialSubject||{},apps=Array.isArray(cs.apps)?cs.apps:[];
    if(!apps.length)return fail('A aprovação não lista nenhum app.');
    st.aprovacoes.push({jwt:r.tok,jti:p.jti,iat:p.iat,exp:p.exp||0,apps,servico:cs.servico||''});
    // O pedido atendido sai de "aguardando": os apps não aprovados podem ser pedidos de novo.
    st.pendentes=st.pendentes.filter(x=>!x.apps.some(a=>apps.includes(a)));
    await ato('credenciamento',`Aprovação de emissão recebida da ${st.gov.name}: ${apps.join(', ')}${p.exp?' até '+fmtDate(p.exp*1000):', sem validade'}`,p.jti);await save();
    closeSheet();setView('vPanel');toast('Aprovação de emissão guardada');
  };
}
async function cartaoServico(){
  if(!credOk())return toast('Sem aprovação de emissão válida, o serviço não tem cartão.',true);
  const validas=aprovValidas(),iat=now(),pl={iss:ses.did,name:nomeServico(),apps:credApps(),aprovacoes:validas.map(a=>a.jwt),iat};
  if(validas.every(a=>a.exp))pl.exp=Math.max(...validas.map(a=>a.exp));
  mostrarCartao('Cartão do serviço',await signJWT('cartao+jwt',pl));
}
// Cartão de um app só: leva o app e apenas a aprovação que o cobre. A carteira já abre com ele marcado.
async function cartaoDoApp(app){
  const a=aprovDoApp(app);
  if(!a)return toast('A aprovação de emissão deste app venceu.',true);
  const pl={iss:ses.did,name:nomeServico(),app,apps:[app],aprovacoes:[a.jwt],iat:now()};
  if(a.exp)pl.exp=a.exp;
  mostrarCartao(`Cartão do app ${esc(app)}`,await signJWT('cartao+jwt',pl));
}
function mostrarCartao(titulo,jwt){
  const tok=embrulhar(jwt);
  openSheet(`<h3>${titulo}</h3><p class="sub">É público: a carteira lê o cartão e confere que a Governança aprovou a emissão dos apps antes de pedir o crachá.</p>
    <label class="f"><span>Cartão assinado</span><textarea class="mono" id="scJ" rows="6" readonly>${tok}</textarea></label><button class="btn" id="scC">Copiar cartão</button>`);
  $('#scC').onclick=()=>copy(tok,'Cartão copiado');
}

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
  if((st.recusas||[]).some(x=>x.nonce===p.nonce))return fail('Este pedido já foi recusado. A pessoa pode enviar um pedido novo.');
  if(!credOk())return fail('O serviço está sem aprovação de emissão válida da Governança. Sem ela, não emite crachás.');
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
  const pedidos=Array.isArray(p.apps)?p.apps.map(String):[],aprovados=credApps(),fora=pedidos.filter(a=>!aprovados.includes(a));
  $('#cWho').innerHTML=verdictHtml(true,'Pedido conferido',`${esc(nome)} tem a Identidade aprovada pela ${esc(st.gov.name)} e controla ${esc(shortDid(r.did))}.${fora.length?' Sem aprovação de emissão: '+esc(fora.join(', '))+'.':''}`);
  $('#cApps').innerHTML=aprovados.map(a=>`<button class="choice" data-app="${esc(a)}" aria-pressed="${!pedidos.length||pedidos.includes(a)}"><span class="rd"></span><span class="t"><b>${esc(a)}</b></span></button>`).join('');
  // Cartão de análise: quem pede (nome e perfil da identidade aprovada) e o DID.
  $('#cPessoa').innerHTML=`<div class="list glass flat mt">
    <div class="kr"><div class="h"><small>Nome</small></div><div class="v" id="cNome">${esc(nome)}</div></div>
    <div class="kr"><div class="h"><small>Identidade</small></div><div class="v" id="cPerfil">${esc(p.perfil||'Identidade')}</div></div>
    <div class="kr"><div class="h"><small>DID</small></div><div class="v mono">${esc(r.did)}</div></div></div>`;
  $('#cForm').hidden=false;
};
// Recusa: assinada pelo serviço e entregue ao cliente (a carteira mostra "Recusado: motivo"); fica também no livro.
$('#cRec').onclick=()=>{
  if(!pedido)return;
  const pd=pedido,p=pd.r.payload;
  openSheet(`<h3>Recusar pedido</h3><p class="sub">A recusa vai assinada para a pessoa, com o motivo, e fica registrada no livro.</p>
    <label class="f"><span>Motivo</span><select id="rxM"><option>Não é cliente</option><option>Dados não conferem</option><option>App não disponível</option><option>Outro</option></select></label>
    <button class="btn danger" id="rxGo">Recusar</button>`);
  $('#rxGo').onclick=async()=>{
    const motivo=$('#rxM').value,iat=now();
    const tok=embrulhar(await signJWT('recusa+jwt',{iss:ses.did,sub:pd.r.did,nonce:p.nonce,apps:Array.isArray(p.apps)?p.apps:[],motivo,servico:nomeServico(),iat}));
    st.recusas=[...(st.recusas||[]),{nonce:p.nonce,sub:pd.r.did,nome:pd.nome,motivo,at:Date.now()}];
    await ato('recusa',`Acesso de ${pd.nome||shortDid(pd.r.did)} recusado: ${motivo}`,pd.r.did);await save();
    closeSheet();pedido=null;$('#cForm').hidden=true;
    $('#cOk').innerHTML=verdictHtml(false,'Pedido recusado',`${esc(motivo)}. Entregue a recusa à pessoa: ela aparece na carteira como recusada.`);
    $('#cList').innerHTML=`<label class="f"><span>Recusa assinada</span><textarea class="mono" rows="4" readonly data-recusa>${tok}</textarea></label><button class="btn ghost" id="rxCp">Copiar recusa</button>`;
    $('#rxCp').onclick=()=>copy(tok,'Recusa copiada');
    $('#cOut').hidden=false;toast('Pedido recusado');
  };
};
$('#cApps').onclick=e=>{const b=e.target.closest('[data-app]');if(b)b.setAttribute('aria-pressed',b.getAttribute('aria-pressed')!=='true')};
async function emitirCracha(sub,app,iat,exp,nome,nonce){
  const n=++st.seq,jti='urn:uuid:'+crypto.randomUUID(),claims={servico:nomeServico(),app};
  const payload={iss:ses.did,sub,iat,nbf:iat,jti,vc:{'@context':VC_CONTEXT,type:['VerifiableCredential','BadgeCredential'],issuer:{id:ses.did,name:nomeServico()},issuanceDate:new Date(iat*1000).toISOString(),
    credentialSubject:{id:sub,...claims},credentialStatus:{id:`${ses.did}#status-${n}`,type:'SysteknaStatusRegistry',statusListIndex:n},
    // A aprovação de emissão do app vai junto, como prova de que a Governança autorizou o serviço.
    evidence:[{type:['CredenciamentoSystekna'],credenciamento:aprovDoApp(app).jwt}]}};
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
  if(apps.some(a=>!aprovDoApp(a)))return toast('A aprovação de emissão de um dos apps venceu. Peça de novo à Governança.',true);
  const days=+$('#cDays').value,iat=now(),pedido_=days?iat+days*86400:0;
  // A validade escolhida nunca passa a da aprovação de emissão do app (DP-07).
  const ate=app=>{const a=aprovDoApp(app);return a.exp?(pedido_?Math.min(pedido_,a.exp):a.exp):pedido_};
  const toks=[];
  for(const app of apps)toks.push([app,embrulhar(await emitirCracha(pedido.r.did,app,iat,ate(app),pedido.nome,pedido.r.payload.nonce))]);
  const exp=Math.max(...apps.map(ate))||0;
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
  if(!app||!credApps().includes(app))return toast('Sem aprovação de emissão válida para este app',true);
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
  add(apps.includes(cs.app),'Aprovação de emissão vigente',!credOk()?'O serviço não tem aprovação de emissão válida.':apps.includes(cs.app)?`A Governança aprovou a emissão de ${esc(cs.app)}.`:`A emissão de ${esc(cs.app||'')} não está aprovada ou venceu.`);
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
