/* ================= serviço ================= */
// A versão básica guarda só credenciais. Itens de outros tipos (cofre, contatos, emissores confiáveis da versão
// completa) ficam intactos no aparelho e no backup, mas não aparecem aqui.
const KEPT_TYPES=['cred'];
// Cartões de pagamento não são guardados (RN10): são apagados ao abrir e ignorados ao restaurar backup.
const REMOVED_TYPES=['cartao'];

const APP={
  db:'systekna-carteira',label:'Carteira',dataKeys:['items'],createdMsg:'Carteira criada',autoDefault:3,
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
  if(d.vtype==='AgeOver18Credential')return 'Maior de 18 anos';
  return cl.length?fmtVal(cl[0][1]):vcLabel(d.vtype);
}
function credCard(it,asDiv){
  const d=it.data,[st,stl]=credState(d),tag=asDiv?'div':'button';
  return `<${tag} class="cred g-${esc(d.vtype)} ${st==='no'?'dim':''}" ${asDiv?'':`data-cid="${it.rec.id}"`}><div class="r1"><b>${esc(vcLabel(d.vtype))}</b>${ic('badge')}</div><div class="main">${esc(credMain(d))}</div><div class="r3"><span>Emitida por ${esc(d.issuerName)}</span><span class="pill on-card">${stl}</span></div></${tag}>`;
}
function renderCreds(){
  if(!ses)return;
  const list=creds();
  $('#cNote').hidden=!list.length;
  $('#cList').innerHTML=list.length?`<div class="creds">${list.map(i=>credCard(i)).join('')}</div>`
    :`<div class="glass flat card"><b>A carteira ainda não tem credenciais</b><ol class="steps">
      <li><span>Toque em <b>+</b> e escolha <b>Pedir credencial</b>. O pedido é assinado e prova que você controla este DID.</span></li>
      <li><span>Leve o pedido ao <b>Emissor de Credenciais</b>, que confere a assinatura e emite a credencial.</span></li>
      <li><span>Cole o que o emissor devolver em <b>Receber credencial</b>. Ela fica cifrada aqui.</span></li></ol></div>`;
}
$('#cList').onclick=e=>{const b=e.target.closest('[data-cid]');if(b)showCred(b.dataset.cid)};

function actionMenu(){
  const row=(k,icn,t,s)=>`<button class="tx" data-act="${k}"><span class="dot">${ic(icn)}</span><span class="t"><b>${t}</b><small>${s}</small></span>${ic('chev')}</button>`;
  openSheet(`<h3>O que você quer fazer?</h3><div class="list glass flat" style="margin-top:12px">
    ${row('ask','send','Pedir credencial','Gera um pedido assinado para o emissor')}
    ${row('get','inbox','Receber credencial','Cola a credencial que o emissor emitiu')}
    ${row('show','scan','Apresentar credencial','Responde ao desafio de quem verifica')}</div>`);
  $('#sheetBody').onclick=e=>{const b=e.target.closest('[data-act]');if(!b)return;({ask:askCred,get:receiveCred,show:()=>present()})[b.dataset.act]()};
}

function askCred(){
  openSheet(`<h3>Pedir credencial</h3><p class="sub">O pedido leva o seu DID e é assinado com a sua chave privada. É assim que o emissor sabe que é você mesmo quem pede.</p>
    <label class="f" id="aqNF"><span>Seu nome</span><input id="aqN" autocomplete="name" placeholder="Como deve aparecer na credencial"></label>
    <label class="f"><span>Credencial desejada</span><select id="aqT">${Object.entries(VC_TYPES).map(([k,v])=>`<option value="${k}">${v.label}</option>`).join('')}</select></label>
    <label class="f"><span>Observação para o emissor (opcional)</span><input id="aqO" autocomplete="off"></label>
    <button class="btn" id="aqGo">Assinar pedido</button>
    <div id="aqOut" hidden><label class="f"><span>Pedido assinado, válido por 7 dias</span><textarea class="mono" id="aqJ" rows="5" readonly></textarea></label><button class="btn ghost" id="aqC">Copiar pedido</button></div>`);
  $('#aqGo').onclick=async()=>{
    const name=$('#aqN').value.trim();if(!name){shake($('#aqNF'));$('#aqN').focus();return}
    const iat=now();
    $('#aqJ').value=await signJWT('pedido+jwt',{iss:ses.did,sub:ses.did,aud:'emissor',name,wanted:$('#aqT').value,note:$('#aqO').value.trim(),nonce:b64u.enc(rnd(16)),iat,exp:iat+7*86400});
    $('#aqOut').hidden=false;toast('Pedido assinado');
  };
  $('#aqC').onclick=()=>copy($('#aqJ').value,'Pedido copiado');
}

function receiveCred(){
  openSheet(`<h3>Receber credencial</h3><p class="sub">Cole a credencial que o emissor emitiu. A carteira confere a assinatura e se ela foi emitida para o seu DID.</p>
    <label class="f" id="rcF"><span>Credencial</span><textarea class="mono" id="rcT" rows="6" spellcheck="false" placeholder="eyJhbGciOiJFZERTQSIs…"></textarea></label><p class="hint" id="rcH"></p>
    <button class="btn" id="rcGo">Conferir e guardar</button>`);
  $('#rcGo').onclick=async()=>{
    const H=$('#rcH'),fail=m=>{H.textContent=m;H.classList.add('bad');shake($('#rcF'))};
    let r;try{r=await verifyJWT($('#rcT').value)}catch(e){return fail(e.message)}
    const p=r.payload;
    if(!p.vc||r.header.typ!=='vc+jwt')return fail(r.header.typ==='desafio+jwt'?'Isto é um desafio. Use Apresentar credencial.':'Isto não é uma credencial verificável.');
    if(!r.ok)return fail('A assinatura não confere: a credencial foi alterada ou não foi emitida por quem diz.');
    if(p.sub!==ses.did)return fail('Esta credencial foi emitida para outro DID.');
    const t0=now();
    if(p.exp&&p.exp<=t0)return fail(`Esta credencial venceu em ${fmtDate(p.exp*1000)}. Peça uma nova ao emissor.`);
    if(p.nbf&&p.nbf>t0+CLOCK_SKEW)return fail(`Esta credencial só vale a partir de ${fmtDate(p.nbf*1000)}.`);
    if(creds().some(c=>c.data.jti===p.jti))return fail('Esta credencial já está na carteira.');
    const t=vcType(p),ts=Date.now();
    await saveItem({type:'cred',title:vcLabel(t),vtype:t,jwt:r.tok,jti:p.jti,issuerName:vcIssuerName(p),issuerDid:r.did,iat:p.iat,exp:p.exp||0,created:ts,updated:ts});
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
      ${fit.length?`<div class="sec-h">Escolha a credencial</div><div class="list glass flat" id="apC">${fit.map(c=>`<button class="choice" data-pk="${c.rec.id}" aria-pressed="${c.rec.id===pick}"><span class="rd"></span><span class="t"><b>${esc(vcLabel(c.data.vtype))}: ${esc(credMain(c.data))}</b><small>Emitida por ${esc(c.data.issuerName)}</small></span></button>`).join('')}</div>
        <button class="btn" id="apSign">Assinar e apresentar</button>`
        :verdictHtml(false,'Nenhuma credencial serve','Você não tem uma credencial válida do tipo exigido. Peça uma ao emissor.')}
      <div id="apOut"></div>`;
    $('#apC')&&($('#apC').onclick=e=>{const b=e.target.closest('[data-pk]');if(!b)return;pick=b.dataset.pk;$('#apC').querySelectorAll('[data-pk]').forEach(x=>x.setAttribute('aria-pressed',x===b))});
    $('#apSign')&&($('#apSign').onclick=async()=>{
      const c=ses.items.find(i=>i.rec.id===pick),iat=now();
      const vp=await signJWT('vp+jwt',{iss:ses.did,sub:ses.did,aud:r.did,nonce:q.nonce,iat,exp:iat+300,vp:{'@context':VC_CONTEXT,type:['VerifiablePresentation'],holder:ses.did,verifiableCredential:[c.data.jwt]}});
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
