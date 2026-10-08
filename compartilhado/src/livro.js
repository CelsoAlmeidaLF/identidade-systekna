/* ================= livro e registro de emissões (Governança e Serviços) ================= */
// Cada app que emite guarda um único estado cifrado (st) com o livro, as emissões e as chaves usadas.
const save=async()=>DB.set('state',await seal(ses.vaultKey,st,'state'));
const ATO_IC={abertura:'gov',emissao:'stamp',revogacao:'x',verificacao:'scan',confianca:'shield',nome:'note',politica:'shield',rotacao:'key',recusa:'x'};
async function ato(act,text,ref){
  const prev=st.book.length?st.book[st.book.length-1].hash:'0'.repeat(64);
  const e={n:st.book.length+1,at:Date.now(),act,text,ref:ref||null,prev};
  e.hash=hex(await sha256(te.encode(JSON.stringify(e))));
  e.sig=b64u.enc(await S.sign({name:'Ed25519'},ses.edPriv,te.encode(e.hash)));
  st.book.push(e);
}
// Chaves do emissor ao longo do tempo: cada uma assina os atos a partir do ato "from". Sem troca, só a atual.
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
function showIssued(n,depois){
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
    await ato('revogacao',`${vcLabel(i.type)} de ${i.holderName||shortDid(i.sub)} revogada: ${reason}`,i.jti);await save();depois&&depois();toast('Credencial revogada');
  });
}
function showBook(){
  openSheet(`<h3>Livro de registros</h3><p class="sub">Cada ato carrega o hash do anterior e a assinatura do emissor.</p><button class="btn" id="bkChk" style="margin-top:0">Conferir integridade</button><div id="bkRes"></div><div class="list glass flat mt">${st.book.slice().reverse().map(e=>atoRow(e,true)).join('')}</div>`);
  $('#bkChk').onclick=async()=>{const c=await checkBook();$('#bkRes').innerHTML=c.ok?verdictHtml(true,'Livro íntegro',`Os ${c.n} atos conferem do primeiro ao último.`):verdictHtml(false,'Livro adulterado',`A corrente se rompe no ato nº ${c.at}.`)}
}
// Aviso de troca de chave (rotacao+jwt): assinado pela chave antiga, com o aceite assinado pela nova.
async function avisoValido(texto){
  const r=await verifyJWT(texto,'rotacao+jwt');
  if(!r.ok)throw new Error('A assinatura da chave antiga não confere: o aviso foi alterado.');
  const p=r.payload;
  if(!p.novo||p.novo===p.iss)throw new Error('O aviso não diz qual é a chave nova.');
  const ok=await S.verify({name:'Ed25519'},await didToEdKey(p.novo),b64u.dec(p.aceite||''),te.encode(`${p.iss}>${p.novo}`)).catch(()=>false);
  if(!ok)throw new Error('A chave nova não assinou o aceite: o aviso não vale.');
  return r;
}
