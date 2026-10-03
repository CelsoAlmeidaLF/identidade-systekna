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
  enter(){if(ses.purged)toast(`${ses.purged} ${ses.purged===1?'cartão antigo removido':'cartões antigos removidos'}`);renderId();mountCommonSettings($('#commonSet'));setView('vCreds')},
  onView(v){if(v==='vCreds')renderCreds()},
  onLock(){
    ['#cList','#mOpenOut'].forEach(s=>$(s).innerHTML='');
    ['#mSealed','#mText','#mIn','#mTo'].forEach(s=>$(s).value='');
    $('#mSealOut').hidden=true;
  },
  exportData:async()=>(await DB.get('items'))||[],
  async importData(recs){
    let n=0;
    for(const r of recs||[]){try{const d=await unseal(ses.vaultKey,r,r.id);if(REMOVED_TYPES.includes(d.type))continue;const i=ses.items.findIndex(x=>x.rec.id===r.id);if(i>=0)ses.items[i]={rec:r,data:d};else ses.items.push({rec:r,data:d});if(KEPT_TYPES.includes(d.type))n++}catch{}}
    for(const it of perfilItens())if(it.data.n>0&&!ses.ids[it.data.n])ses.ids[it.data.n]=await derivarPerfil(it.data.n);
    await persistItems();renderCreds();
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
function estadoId(x){
  const c=aprovacaoDe(x.id.did);
  if(c)return credState(c.data)[0]==='no'?'aprovação vencida':'aprovada';
  const p=perfilDe(x.n);
  return p&&p.pedido?'aguardando':'sem aprovação';
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
  const d=it.data,[st,stl]=credState(d),tag=asDiv?'div':'button',did=subDe(d);
  const dono=d.vtype==='IdentityCredential'?idDoDid(did):null,tipo=dono?perfilTxt(dono):vcLabel(d.vtype);
  return `<${tag} class="cred g-${esc(d.vtype)}${dono?' p-'+esc(dono.perfil):''} ${st==='no'?'dim':''}" ${asDiv?'':`data-cid="${it.rec.id}"`}><div class="r1"><b class="tipo">${esc(tipo)}</b>${ic('badge')}</div><div class="main">${esc(credMain(d))}</div><div class="did"><span class="mono" title="${esc(did)}">${esc(shortDid(did))}</span><span class="cp" role="button" tabindex="0" aria-label="Copiar DID" data-copydid="${esc(did)}">${ic('copy')}</span></div><div class="r3"><span class="emissor">${esc(d.issuerName)}</span><span class="pill on-card">${stl}</span></div></${tag}>`;
}
// O botão de copiar fica dentro do cartão: copia o DID sem abrir a credencial.
function copiarDidDoCartao(e){
  const c=e.target.closest('[data-copydid]');if(!c)return false;
  if(e.type==='keydown'&&e.key!=='Enter'&&e.key!==' ')return false;
  e.preventDefault();e.stopPropagation();copy(c.dataset.copydid,'DID copiado');return true;
}
function renderCreds(){
  if(!ses)return;
  const list=creds();
  $('#cNote').hidden=!list.length;
  $('#cList').innerHTML=list.length?`<div class="creds">${list.map(i=>credCard(i)).join('')}</div>`
    :`<div class="glass flat card"><b>A carteira ainda não tem credenciais</b><ol class="steps">
      <li><span>Toque em <b>+</b> e escolha <b>Solicitar aprovação de identidade</b>. O pedido é assinado e prova que você controla o DID.</span></li>
      <li><span>Envie o pedido à <b>Governança Systekna</b>, que confere e aprova a identidade.</span></li>
      <li><span>Cole a aprovação em <b>+</b> › <b>Receber aprovação de identidade</b>. Ela fica cifrada aqui.</span></li></ol></div>`;
}
$('#cList').onclick=e=>{if(copiarDidDoCartao(e))return;const b=e.target.closest('[data-cid]');if(b)showCred(b.dataset.cid)};
$('#cList').addEventListener('keydown',e=>{if(e.target.closest('[data-copydid]'))copiarDidDoCartao(e)});

function actionMenu(){
  const row=(k,icn,t,s)=>`<button class="tx" data-act="${k}"><span class="dot">${ic(icn)}</span><span class="t"><b>${t}</b><small>${s}</small></span>${ic('chev')}</button>`;
  openSheet(`<h3>O que você quer fazer?</h3><div class="list glass flat" style="margin-top:12px">
    ${row('ask','send','Solicitar aprovação de identidade','Gera o pedido assinado para a Governança')}
    ${row('get','inbox','Receber aprovação de identidade','Cola a aprovação que a Governança emitiu')}
    ${row('show','scan','Apresentar credencial','Responde ao desafio de quem verifica')}</div>`);
  $('#sheetBody').onclick=e=>{const b=e.target.closest('[data-act]');if(!b)return;({ask:askCred,get:receiveCred,show:()=>present()})[b.dataset.act]()};
}

// Solicitar aprovação de identidade à Governança (STK). Passo 1: escolher uma identidade ou criar uma nova
// (nome, perfil e, na Personalizada, o nome do perfil). Passo 2: o pedido sai assinado pelo DID dela, com o nome
// e o perfil. A aprovação assinada pela STK leva só o nome (DP-03).
function askCred(){
  const ids=identidades();let sel=0;
  const opcao=x=>`<button class="choice" data-n="${x.n}" aria-pressed="${x.n===sel}"><span class="rd"></span><span class="t"><b>${esc(x.nome||'Sem nome')} · ${esc(perfilTxt(x))}</b><small>${estadoId(x)} · ${esc(shortDid(x.id.did))}</small></span></button>`;
  openSheet(`<h3>Solicitar aprovação de identidade</h3><p class="sub">Escolha a identidade ou crie uma nova. Todas saem das suas 12 palavras, cada uma com um DID próprio.</p>
    <div class="list glass flat" id="aqL">${ids.map(opcao).join('')}<button class="choice" data-n="novo" aria-pressed="false"><span class="rd"></span><span class="t"><b>+ Nova identidade</b><small>Nome e perfil novos, com um DID novo</small></span></button></div>
    <label class="f" id="aqNF"><span>Nome</span><input id="aqN" autocomplete="name" placeholder="Como deve aparecer na identidade"></label>
    <label class="f"><span>Perfil</span><select id="aqP">${Object.entries(PERFIS).map(([k,v])=>`<option value="${k}">${v}</option>`).join('')}</select></label>
    <label class="f" id="aqRF" hidden><span>Nome do perfil</span><input id="aqR" autocomplete="off" placeholder="Ex.: Clube, Associação, Igreja"></label>
    <label class="f" id="aqEF"><span>DID da Governança (opcional)</span><input id="aqE" class="mono" autocomplete="off" autocapitalize="none" spellcheck="false" placeholder="did:key:z6Mk…" value="${esc(GOVERNANCA_PADRAO.did)}"></label><p class="hint" id="aqEH">Com o DID, só essa Governança consegue atender o pedido.</p>
    <label class="f"><span>Observação (opcional)</span><input id="aqO" autocomplete="off"></label>
    <button class="btn" id="aqGo">Assinar pedido</button>
    <div id="aqOut" hidden><label class="f"><span>Pedido assinado, válido por 7 dias</span><textarea class="mono" id="aqJ" rows="5" readonly></textarea></label><button class="btn ghost" id="aqC">Copiar pedido</button></div>`);
  const preencher=()=>{
    const x=ids.find(i=>i.n===sel);
    $('#aqN').value=x?x.nome:'';$('#aqP').value=x?x.perfil:'identidade';$('#aqR').value=x?x.rotulo:'';
    $('#aqRF').hidden=$('#aqP').value!=='personalizada';$('#aqOut').hidden=true;
  };
  preencher();
  $('#aqP').onchange=()=>{$('#aqRF').hidden=$('#aqP').value!=='personalizada'};
  $('#aqL').onclick=e=>{const b=e.target.closest('[data-n]');if(!b)return;sel=b.dataset.n==='novo'?'novo':+b.dataset.n;$('#aqL').querySelectorAll('[data-n]').forEach(x=>x.setAttribute('aria-pressed',x===b));preencher()};
  $('#aqGo').onclick=async()=>{
    const name=$('#aqN').value.trim(),perfil=$('#aqP').value,rotulo=perfil==='personalizada'?$('#aqR').value.trim():'';
    if(!name){shake($('#aqNF'));$('#aqN').focus();return}
    if(perfil==='personalizada'&&!rotulo){shake($('#aqRF'));$('#aqR').focus();return}
    const pii=piiProblem({nome:name,perfil:rotulo});if(pii)return toast(pii,true);
    const aud=$('#aqE').value.trim(),EH=$('#aqEH');
    if(aud){try{await didToEdKey(aud)}catch(e){EH.textContent=e.message;EH.classList.add('bad');shake($('#aqEF'));return}}
    EH.textContent='Com o DID, só essa Governança consegue atender o pedido.';EH.classList.remove('bad');
    let n=sel;
    if(n==='novo'){n=Math.max(0,...perfilItens().map(i=>i.data.n))+1;ses.ids[n]=await derivarPerfil(n)}
    const quem=n===0?ses:ses.ids[n],iat=now(),dados={nome:name,perfil,rotulo};
    $('#aqJ').value=embrulhar(await signJWT('pedido+jwt',{iss:quem.did,sub:quem.did,aud:aud||'emissor',name,perfil,perfilNome:rotulo,apelido:perfilTxt(dados),wanted:'IdentityCredential',note:$('#aqO').value.trim(),nonce:b64u.enc(rnd(16)),iat,exp:iat+7*86400},quem));
    await guardarPerfil(n,{...dados,apelido:undefined,pedido:{at:Date.now(),nome:name}});
    if(sel==='novo'){sel=n;ids.push({n,id:quem,...dados})}
    $('#aqOut').hidden=false;toast('Pedido assinado');
  };
  $('#aqC').onclick=()=>copy($('#aqJ').value,'Pedido copiado');
}

function receiveCred(){
  openSheet(`<h3>Receber aprovação de identidade</h3><p class="sub">Cole a aprovação que a Governança emitiu. A carteira confere a assinatura e guarda na identidade certa, pelo DID.</p>
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
