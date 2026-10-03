/* ================= serviço ================= */
// A versão básica guarda só credenciais. Itens de outros tipos (cofre, contatos, emissores confiáveis da versão
// completa) ficam intactos no aparelho e no backup, mas não aparecem aqui.
const KEPT_TYPES=['cred','perfil'];
// Cartões de pagamento não são guardados (RN10): são apagados ao abrir e ignorados ao restaurar backup.
const REMOVED_TYPES=['cartao'];

const APP={
  db:'systekna-carteira',dominio:'',label:'Carteira',dataKeys:['items'],createdMsg:'Carteira criada',autoDefault:3,
  importHint:'Junta as credenciais do backup às que já estão aqui',
  howHtml:`<p><b>12 palavras.</b> São 128 bits de aleatoriedade no padrão BIP39. Delas saem, por HKDF, a chave Ed25519 que forma o seu DID e assina, a chave X25519 que recebe mensagens cifradas e a chave AES-256-GCM que cifra a carteira.</p>
  <p><b>Pedido.</b> Para receber uma credencial, a carteira assina um pedido com a sua chave. O emissor confere essa assinatura e só então sabe que quem pede controla o DID.</p>
  <p><b>Credencial.</b> É uma afirmação sobre você assinada pela chave do emissor. Ela fica cifrada aqui e não serve sozinha como prova.</p>
  <p><b>Apresentação.</b> Quem verifica gera um desafio novo. A carteira embrulha a credencial e assina junto com esse desafio. Assim o verificador confere que a credencial é verdadeira e que foi o dono quem apresentou, agora. Uma cópia antiga não passa.</p>
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
  enter(){if(ses.purged)toast(`${ses.purged} ${ses.purged===1?'cartão antigo removido':'cartões antigos removidos'}`);renderId();renderIds();mountCommonSettings($('#commonSet'));setView('vCreds')},
  onView(v){if(v==='vCreds')renderCreds();if(v==='vId')renderIds()},
  onLock(){
    ['#cList','#mOpenOut','#idList'].forEach(s=>$(s).innerHTML='');
    ['#mSealed','#mText','#mIn','#mTo'].forEach(s=>$(s).value='');
    $('#mSealOut').hidden=true;
  },
  exportData:async()=>(await DB.get('items'))||[],
  async importData(recs){
    let n=0;
    for(const r of recs||[]){try{const d=await unseal(ses.vaultKey,r,r.id);if(REMOVED_TYPES.includes(d.type))continue;const i=ses.items.findIndex(x=>x.rec.id===r.id);if(i>=0)ses.items[i]={rec:r,data:d};else ses.items.push({rec:r,data:d});if(KEPT_TYPES.includes(d.type))n++}catch{}}
    for(const it of perfilItens())if(it.data.n>0&&!ses.ids[it.data.n])ses.ids[it.data.n]=await derivarPerfil(it.data.n);
    await persistItems();renderCreds();renderIds();
    return `${n} ${n===1?'credencial restaurada':'credenciais restauradas'}`;
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

/* ================= identidades ================= */
// Até 3 identidades das mesmas 12 palavras, cada uma com DID próprio: Pessoal (a de sempre, nº 0),
// Profissional (nº 1) e uma personalizada (nº 2), com o apelido que a pessoa escolher.
const MAX_IDS=3;
const perfilItens=()=>ses.items.filter(i=>i.data.type==='perfil');
const perfilDe=n=>(perfilItens().find(i=>i.data.n===n)||{}).data;
async function derivarPerfil(n){
  const seed=await wordsToSeed(await entropyToWords(ses.ent,ses.lang));
  try{return await deriveIdentity(seed,`perfil/${n}`)}finally{seed.fill(0)}
}
function identidades(){
  const out=[{n:0,apelido:'Pessoal',id:ses}];
  for(const it of perfilItens())if(it.data.n>0&&ses.ids&&ses.ids[it.data.n])out.push({n:it.data.n,apelido:it.data.apelido,id:ses.ids[it.data.n]});
  return out.sort((a,b)=>a.n-b.n);
}
const idDoDid=did=>identidades().find(x=>x.id.did===did);
const subDe=d=>d.sub||decodeJWT(d.jwt).payload.sub;
const aprovacaoDe=did=>creds().find(c=>c.data.vtype==='IdentityCredential'&&subDe(c.data)===did);
function estadoId(x){
  const c=aprovacaoDe(x.id.did);
  if(c){const[st]=credState(c.data);return st==='no'?['no','Aprovação vencida']:['ok',c.data.exp?'Aprovada até '+fmtDate(c.data.exp*1000):'Aprovada, sem validade']}
  const p=perfilDe(x.n);
  return p&&p.pedido?['warn','Aguardando aprovação']:['','Sem aprovação'];
}
async function guardarPerfil(n,mudar){
  const it=perfilItens().find(i=>i.data.n===n),ts=Date.now();
  const base=it?it.data:{type:'perfil',n,apelido:n===0?'Pessoal':'',pedido:null,created:ts};
  await saveItem({...base,...mudar,updated:ts},it&&it.rec.id);
}
function renderIds(){
  if(!ses||!$('#idList'))return;
  const ids=identidades();
  $('#idList').innerHTML=ids.map(x=>{
    const[c,l]=estadoId(x),a=aprovacaoDe(x.id.did),p=perfilDe(x.n);
    const nome=a?credMain(a.data):p&&p.pedido?p.pedido.nome:'';
    return `<div class="glass flat card idp" data-n="${x.n}">
      <div class="kr" style="padding:0"><div class="h"><small><b>${esc(x.apelido)}</b></small><span class="pill ${c}">${l}</span></div>
      <div class="v">${nome?esc(nome):'<span class="sub">Ainda sem nome aprovado</span>'}</div><div class="v mono" style="margin-top:4px">${esc(shortDid(x.id.did))}</div></div>
      <div class="pair" style="margin-top:12px"><button class="btn ghost" data-idask="${x.n}">Solicitar aprovação</button><button class="btn ghost" data-idget="${x.n}">Receber aprovação</button></div>
      <button class="link" data-iddid="${x.n}" style="margin:8px 0 0;padding:0">Copiar DID</button></div>`;
  }).join('')+(ids.length<MAX_IDS?'<button class="btn ghost" id="idNew">Nova identidade</button>':'');
}
$('#idList').onclick=e=>{
  const b=e.target.closest('[data-idask],[data-idget],[data-iddid],#idNew');if(!b)return;
  if(b.id==='idNew')return novaIdentidade();
  if(b.dataset.idask)return askCred(+b.dataset.idask);
  if(b.dataset.idget)return receiveCred();
  const x=identidades().find(i=>i.n===+b.dataset.iddid);if(x)copy(x.id.did,'DID copiado');
};
function novaIdentidade(){
  const livres=[1,2].filter(n=>!perfilDe(n));
  if(!livres.length)return toast('A carteira já tem as 3 identidades',true);
  let escolha=livres[0];
  openSheet(`<h3>Nova identidade</h3><p class="sub">Ela sai das mesmas 12 palavras, com um DID próprio. Ninguém consegue ligar um DID ao outro, e o mesmo PIN abre todas.</p>
    <div class="list glass flat" id="niC">${livres.map(n=>`<button class="choice" data-novo="${n}" aria-pressed="${n===escolha}"><span class="rd"></span><span class="t"><b>${n===1?'Profissional':'Personalizada'}</b><small>${n===1?'Para trabalho, empresa e clientes':'Com o apelido que você escolher'}</small></span></button>`).join('')}</div>
    <label class="f" id="niF" ${escolha===2?'':'hidden'}><span>Apelido</span><input id="niA" autocomplete="off" placeholder="Ex.: Associação, Clube"></label>
    <button class="btn" id="niGo">Criar identidade</button>`);
  $('#niC').onclick=e=>{const b=e.target.closest('[data-novo]');if(!b)return;escolha=+b.dataset.novo;$('#niC').querySelectorAll('[data-novo]').forEach(x=>x.setAttribute('aria-pressed',x===b));$('#niF').hidden=escolha!==2};
  $('#niGo').onclick=async()=>{
    const apelido=escolha===1?'Profissional':$('#niA').value.trim();
    if(!apelido){shake($('#niF'));return $('#niA').focus()}
    if(identidades().some(x=>fold(x.apelido)===fold(apelido)))return toast('Já existe uma identidade com esse apelido',true);
    const pii=piiProblem({apelido});if(pii)return toast(pii,true);
    ses.ids[escolha]=await derivarPerfil(escolha);
    await guardarPerfil(escolha,{apelido});
    closeSheet();renderIds();toast('Identidade criada');
  };
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
function credCard(it,asDiv){
  const d=it.data,[st,stl]=credState(d),tag=asDiv?'div':'button';
  return `<${tag} class="cred g-${esc(d.vtype)} ${st==='no'?'dim':''}" ${asDiv?'':`data-cid="${it.rec.id}"`}><div class="r1"><b>${esc(vcLabel(d.vtype))}</b>${ic('badge')}</div><div class="main">${esc(credMain(d))}</div><div class="r3"><span>${(x=>x&&identidades().length>1?esc(x.apelido)+' · ':'')(idDoDid(subDe(d)))}Emitida por ${esc(d.issuerName)}</span><span class="pill on-card">${stl}</span></div></${tag}>`;
}
function renderCreds(){
  if(!ses)return;
  const list=creds();
  $('#cNote').hidden=!list.length;
  $('#cList').innerHTML=list.length?`<div class="creds">${list.map(i=>credCard(i)).join('')}</div>`
    :`<div class="glass flat card"><b>A carteira ainda não tem credenciais</b><ol class="steps">
      <li><span>Em <b>Identidades</b>, toque em <b>Solicitar aprovação</b>. O pedido é assinado e prova que você controla o DID.</span></li>
      <li><span>Envie o pedido à <b>Governança Systekna</b>, que confere e aprova a identidade.</span></li>
      <li><span>Cole a aprovação em <b>Receber aprovação</b>. Ela fica cifrada aqui.</span></li></ol></div>`;
}
$('#cList').onclick=e=>{const b=e.target.closest('[data-cid]');if(b)showCred(b.dataset.cid)};

function actionMenu(){
  const row=(k,icn,t,s)=>`<button class="tx" data-act="${k}"><span class="dot">${ic(icn)}</span><span class="t"><b>${t}</b><small>${s}</small></span>${ic('chev')}</button>`;
  openSheet(`<h3>O que você quer fazer?</h3><div class="list glass flat" style="margin-top:12px">
    ${row('ask','send','Solicitar aprovação de identidade','Gera o pedido assinado para a Governança')}
    ${row('get','inbox','Receber aprovação ou credencial','Cola o que a Governança ou o serviço emitiu')}
    ${row('show','scan','Apresentar credencial','Responde ao desafio de quem verifica')}</div>`);
  $('#sheetBody').onclick=e=>{const b=e.target.closest('[data-act]');if(!b)return;({ask:()=>askCred(0),get:receiveCred,show:()=>present()})[b.dataset.act]()};
}

// Pedido de aprovação de identidade para a Governança (STK): leva o nome e o apelido e é assinado pelo DID
// da identidade escolhida. A aprovação assinada pela STK leva só o nome (DP-03).
function askCred(n=0){
  const ids=identidades(),p=perfilDe(n),aprovada=aprovacaoDe((ids.find(x=>x.n===n)||ids[0]).id.did);
  const nomeAntes=p&&p.pedido?p.pedido.nome:aprovada?credMain(aprovada.data):'';
  openSheet(`<h3>Solicitar aprovação de identidade</h3><p class="sub">O pedido vai para a Governança Systekna, assinado com a chave da identidade escolhida. É assim que ela sabe que é você quem pede.</p>
    <label class="f"><span>Identidade</span><select id="aqI">${ids.map(x=>`<option value="${x.n}" ${x.n===n?'selected':''}>${esc(x.apelido)}</option>`).join('')}</select></label>
    <label class="f" id="aqNF"><span>Seu nome</span><input id="aqN" autocomplete="name" placeholder="Como deve aparecer na identidade" value="${esc(nomeAntes)}"></label>
    <label class="f" id="aqEF"><span>DID da Governança (opcional)</span><input id="aqE" class="mono" autocomplete="off" autocapitalize="none" spellcheck="false" placeholder="did:key:z6Mk…" value="${esc(GOVERNANCA_PADRAO.did)}"></label><p class="hint" id="aqEH">Com o DID, só essa Governança consegue atender o pedido.</p>
    <label class="f"><span>Observação (opcional)</span><input id="aqO" autocomplete="off"></label>
    <button class="btn" id="aqGo">Assinar pedido</button>
    <div id="aqOut" hidden><label class="f"><span>Pedido assinado, válido por 7 dias</span><textarea class="mono" id="aqJ" rows="5" readonly></textarea></label><button class="btn ghost" id="aqC">Copiar pedido</button></div>`);
  $('#aqGo').onclick=async()=>{
    const name=$('#aqN').value.trim();if(!name){shake($('#aqNF'));$('#aqN').focus();return}
    const aud=$('#aqE').value.trim(),EH=$('#aqEH');
    if(aud){try{await didToEdKey(aud)}catch(e){EH.textContent=e.message;EH.classList.add('bad');shake($('#aqEF'));return}}
    EH.textContent='Com o DID, só essa Governança consegue atender o pedido.';EH.classList.remove('bad');
    const x=identidades().find(i=>i.n===+$('#aqI').value)||identidades()[0],iat=now();
    $('#aqJ').value=embrulhar(await signJWT('pedido+jwt',{iss:x.id.did,sub:x.id.did,aud:aud||'emissor',name,apelido:x.apelido,wanted:'IdentityCredential',note:$('#aqO').value.trim(),nonce:b64u.enc(rnd(16)),iat,exp:iat+7*86400},x.id));
    await guardarPerfil(x.n,{pedido:{at:Date.now(),nome:name}});renderIds();
    $('#aqOut').hidden=false;toast('Pedido assinado');
  };
  $('#aqC').onclick=()=>copy($('#aqJ').value,'Pedido copiado');
}

function receiveCred(){
  openSheet(`<h3>Receber aprovação ou credencial</h3><p class="sub">Cole o que a Governança ou o serviço emitiu. A carteira confere a assinatura e guarda na identidade certa, pelo DID.</p>
    <label class="f" id="rcF"><span>Credencial</span><textarea class="mono" id="rcT" rows="6" spellcheck="false" placeholder="eyJhbGciOiJFZERTQSIs…"></textarea></label><p class="hint" id="rcH"></p>
    <button class="btn" id="rcGo">Conferir e guardar</button>`);
  $('#rcGo').onclick=async()=>{
    const H=$('#rcH'),fail=m=>{H.textContent=m;H.classList.add('bad');shake($('#rcF'))};
    let r;try{r=await verifyJWT($('#rcT').value)}catch(e){return fail(e.message)}
    const p=r.payload;
    if(!p.vc||r.header.typ!=='vc+jwt')return fail(r.header.typ==='desafio+jwt'?'Isto é um desafio. Use Apresentar credencial.':'Isto não é uma credencial verificável.');
    if(!r.ok)return fail('A assinatura não confere: a credencial foi alterada ou não foi emitida por quem diz.');
    const dono=idDoDid(p.sub);
    if(!dono)return fail('Esta credencial foi emitida para outro DID.');
    const t0=now();
    if(p.exp&&p.exp<=t0)return fail(`Esta credencial venceu em ${fmtDate(p.exp*1000)}. Peça uma nova ao emissor.`);
    if(p.nbf&&p.nbf>t0+CLOCK_SKEW)return fail(`Esta credencial só vale a partir de ${fmtDate(p.nbf*1000)}.`);
    if(creds().some(c=>c.data.jti===p.jti))return fail('Esta credencial já está na carteira.');
    const t=vcType(p),ts=Date.now();
    await saveItem({type:'cred',title:vcLabel(t),vtype:t,jwt:r.tok,jti:p.jti,sub:p.sub,issuerName:vcIssuerName(p),issuerDid:r.did,iat:p.iat,exp:p.exp||0,created:ts,updated:ts});
    closeSheet();setView('vCreds');toast('Credencial guardada');
  };
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
      ${fit.length?`<div class="sec-h">Escolha a credencial</div><div class="list glass flat" id="apC">${fit.map(c=>`<button class="choice" data-pk="${c.rec.id}" aria-pressed="${c.rec.id===pick}"><span class="rd"></span><span class="t"><b>${esc(vcLabel(c.data.vtype))}: ${esc(credMain(c.data))}</b><small>${(x=>x?esc(x.apelido)+' · ':'')(idDoDid(subDe(c.data)))}Emitida por ${esc(c.data.issuerName)}</small></span></button>`).join('')}</div>
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
  try{$('#mSealed').value=await sealFor($('#mTo').value,$('#mText').value);$('#mSealOut').hidden=false;toast('Mensagem cifrada')}
  catch(e){toast(e.message,true)}
};
$('#mCopy').onclick=()=>copy($('#mSealed').value);
$('#mOpen').onclick=async()=>{
  const out=$('#mOpenOut');if(!$('#mIn').value.trim()){$('#mIn').focus();return}
  try{const t=await openMsg($('#mIn').value);out.innerHTML=`<div class="list glass flat mt"><div class="kr"><div class="h"><small>Mensagem decifrada</small></div><div class="v">${esc(t)}</div></div></div>`}
  catch(e){out.innerHTML=`<div class="mt">${verdictHtml(false,'Não foi possível decifrar',esc(e.message))}</div>`}
};

boot();
