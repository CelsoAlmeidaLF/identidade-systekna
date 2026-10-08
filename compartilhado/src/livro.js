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

/* ================= exportar o livro (PDF ou Excel) ================= */
// O arquivo traz os atos do período escolhido e o resultado da conferência do livro inteiro. Nada sai do aparelho
// sem a pessoa baixar: o PDF usa o escritor de recuperacao.js e o Excel (.xlsx) é um ZIP sem compressão montado aqui.
const ATO_NOME={abertura:'Abertura',emissao:'Emissão',revogacao:'Revogação',verificacao:'Conferência',confianca:'Confiança',nome:'Nome',politica:'Política',
  rotacao:'Troca de chave',recusa:'Recusa',credenciamento:'Aprovação de emissão',pedido:'Pedido',catalogo:'Catálogo'};
const atoNome=a=>ATO_NOME[a]||a;
const dataHora=t=>{const d=new Date(t);return `${d.toLocaleDateString('pt-BR')} ${d.toLocaleTimeString('pt-BR')}`};
const PERIODOS={tudo:'Todo o livro',d30:'Últimos 30 dias',mes:'Este mês',ant:'Mês passado',int:'Intervalo de datas'};
function periodoDe(tipo,de,ate){
  const h=new Date(),y=h.getFullYear(),m=h.getMonth(),dt=t=>new Date(t).toLocaleDateString('pt-BR');
  const faixa=(ini,fim)=>({ini,fim,txt:`${dt(ini)} a ${dt(fim-1)}`});
  if(tipo==='d30')return faixa(new Date(y,m,h.getDate()-29).getTime(),new Date(y,m,h.getDate()+1).getTime());
  if(tipo==='mes')return faixa(new Date(y,m,1).getTime(),new Date(y,m+1,1).getTime());
  if(tipo==='ant')return faixa(new Date(y,m-1,1).getTime(),new Date(y,m,1).getTime());
  if(tipo==='int'){
    const le=s=>{const p=/^(\d{4})-(\d{2})-(\d{2})$/.exec(s||'');return p?new Date(+p[1],+p[2]-1,+p[3]).getTime():NaN};
    const ini=le(de),fim=le(ate);
    if(isNaN(ini)||isNaN(fim))return{erro:'Escolha as duas datas.'};
    if(fim<ini)return{erro:'A data final vem antes da inicial.'};
    const f=new Date(fim);return faixa(ini,new Date(f.getFullYear(),f.getMonth(),f.getDate()+1).getTime());
  }
  return{ini:-Infinity,fim:Infinity,txt:'Todo o livro'};
}
const integridadeTxt=c=>c.ok?`Livro íntegro: os ${c.n} atos conferem do primeiro ao último.`:`Livro NÃO CONFERE: a corrente se rompe no ato nº ${c.at}.`;
// Quebra o texto em linhas de até n caracteres, sem cortar palavras (a não ser as maiores que a linha).
function quebra(t,n){
  const out=[];let l='';
  for(let w of String(t).split(/\s+/).filter(Boolean)){
    while(w.length>n){if(l){out.push(l);l=''}out.push(w.slice(0,n));w=w.slice(n)}
    if(!l)l=w;else if(l.length+1+w.length<=n)l+=' '+w;else{out.push(l);l=w}
  }
  if(l||!out.length)out.push(l);
  return out;
}
// PDF: capa no alto da 1ª página e a tabela em Courier 8 (100 caracteres por linha); cabeçalho e página em todas.
function livroPdf(o){
  const pad=(s,n)=>String(s).padEnd(n).slice(0,n),TX=46,rec=' '.repeat(54);
  const cab=[[2,16,`Livro de registros · ${o.nome}`,24],[1,9,`DID: ${o.did}`,14],[1,9,`Período: ${o.periodo}`,14],
    [1,9,`Atos exportados: ${o.atos.length} de ${o.total}`,14],[2,10,integridadeTxt(o.conf),16],[1,9,`Gerado em ${o.gerado}.`,24]];
  const titulo=[4,8,`${pad('Nº',5)} ${pad('Data e hora',19)} ${pad('Tipo',14)} ${pad('Hash',12)} Texto`,14];
  const linhas=[];
  for(const e of o.atos){
    const partes=quebra(latin1(e.text),TX);
    partes.forEach((p,i)=>linhas.push([3,8,i?rec+p:`${pad(e.n,5)} ${pad(dataHora(e.at),19)} ${pad(atoNome(e.act),14)} ${pad(e.hash.slice(0,12),12)} ${p}`,i===partes.length-1?13:10]));
  }
  if(!linhas.length)linhas.push([1,9,'Nenhum ato no período escolhido.',14]);
  const paginas=[];let c='',y=0;
  const nova=()=>{if(c)paginas.push(c);c=pdfTxt(1,7,56,818,`${o.nome} · Livro de registros · página @@P@@`);y=790};
  const poe=([f,s,t,h])=>{c+=pdfTxt(f,s,56,y,t);y-=h};
  nova();cab.forEach(poe);poe(titulo);
  for(const l of linhas){if(y<50){nova();poe(titulo)}poe(l)}
  paginas.push(c);
  return pdfDoc(paginas.map((p,i)=>p.replace('@@P@@',`${i+1} de ${paginas.length}`)),`Livro de registros · ${o.nome}`);
}
// Excel (.xlsx): planilhas "Livro" (um ato por linha) e "Resumo"; cabeçalho em negrito e fixo.
const crc32=(()=>{const T=new Uint32Array(256);for(let n=0;n<256;n++){let c=n;for(let k=0;k<8;k++)c=c&1?0xEDB88320^(c>>>1):c>>>1;T[n]=c>>>0}
  return b=>{let c=~0;for(const x of b)c=T[(c^x)&255]^(c>>>8);return(~c)>>>0}})();
function zipSemCompressao(arquivos){
  const partes=[],central=[],d=new Date();let off=0;
  const tm=(d.getHours()<<11)|(d.getMinutes()<<5)|(d.getSeconds()>>1),dt=((d.getFullYear()-1980)<<9)|((d.getMonth()+1)<<5)|d.getDate();
  for(const[nomeTxt,texto]of arquivos){
    const nome=te.encode(nomeTxt),dados=te.encode(texto),crc=crc32(dados),n=dados.length;
    const h=new DataView(new ArrayBuffer(30));
    [[0,0x04034b50,4],[4,20,2],[6,0x0800,2],[8,0,2],[10,tm,2],[12,dt,2],[14,crc,4],[18,n,4],[22,n,4],[26,nome.length,2],[28,0,2]].forEach(([p,v,t])=>t===4?h.setUint32(p,v,true):h.setUint16(p,v,true));
    const c=new DataView(new ArrayBuffer(46));
    [[0,0x02014b50,4],[4,20,2],[6,20,2],[8,0x0800,2],[10,0,2],[12,tm,2],[14,dt,2],[16,crc,4],[20,n,4],[24,n,4],[28,nome.length,2],[42,off,4]].forEach(([p,v,t])=>t===4?c.setUint32(p,v,true):c.setUint16(p,v,true));
    partes.push(new Uint8Array(h.buffer),nome,dados);central.push(new Uint8Array(c.buffer),nome);
    off+=30+nome.length+n;
  }
  const tam=central.reduce((a,b)=>a+b.length,0),fim=new DataView(new ArrayBuffer(22));
  fim.setUint32(0,0x06054b50,true);fim.setUint16(8,arquivos.length,true);fim.setUint16(10,arquivos.length,true);fim.setUint32(12,tam,true);fim.setUint32(16,off,true);
  return cat(...partes,...central,new Uint8Array(fim.buffer));
}
const xmlEsc=s=>String(s).replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g,'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const XML='<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n',OOX='http://schemas.openxmlformats.org';
function folhaXlsx(linhas,larguras){
  const col=i=>{let s='';for(i++;i;i=Math.floor((i-1)/26))s=String.fromCharCode(65+(i-1)%26)+s;return s};
  const cel=(v,ref,neg)=>typeof v==='number'?`<c r="${ref}"${neg}><v>${v}</v></c>`:`<c r="${ref}" t="inlineStr"${neg}><is><t xml:space="preserve">${xmlEsc(v)}</t></is></c>`;
  const rows=linhas.map((l,r)=>`<row r="${r+1}">${l.map((v,c)=>cel(v,col(c)+(r+1),r===0?' s="1"':'')).join('')}</row>`).join('');
  return `${XML}<worksheet xmlns="${OOX}/spreadsheetml/2006/main"><sheetViews><sheetView workbookViewId="0"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews><cols>${larguras.map((w,i)=>`<col min="${i+1}" max="${i+1}" width="${w}" customWidth="1"/>`).join('')}</cols><sheetData>${rows}</sheetData></worksheet>`;
}
function livroXlsx(o){
  const livro=[['Nº','Data e hora','Tipo','Texto','Referência','Hash','Hash anterior','Assinatura'],
    ...o.atos.map(e=>[e.n,dataHora(e.at),atoNome(e.act),e.text,e.ref||'',e.hash,e.prev,e.sig])];
  const resumo=[['Campo','Valor'],['Livro de registros',o.nome],['DID',o.did],['Período',o.periodo],
    ['Atos exportados',`${o.atos.length} de ${o.total}`],['Integridade',integridadeTxt(o.conf)],['Gerado em',o.gerado]];
  const tipo=t=>`application/vnd.openxmlformats-officedocument.spreadsheetml.${t}+xml`,rel=t=>`${OOX}/officeDocument/2006/relationships/${t}`;
  return zipSemCompressao([
    ['[Content_Types].xml',`${XML}<Types xmlns="${OOX}/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="${tipo('sheet.main')}"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="${tipo('worksheet')}"/><Override PartName="/xl/worksheets/sheet2.xml" ContentType="${tipo('worksheet')}"/><Override PartName="/xl/styles.xml" ContentType="${tipo('styles')}"/></Types>`],
    ['_rels/.rels',`${XML}<Relationships xmlns="${OOX}/package/2006/relationships"><Relationship Id="rId1" Type="${rel('officeDocument')}" Target="xl/workbook.xml"/></Relationships>`],
    ['xl/workbook.xml',`${XML}<workbook xmlns="${OOX}/spreadsheetml/2006/main" xmlns:r="${OOX}/officeDocument/2006/relationships"><sheets><sheet name="Livro" sheetId="1" r:id="rId1"/><sheet name="Resumo" sheetId="2" r:id="rId2"/></sheets></workbook>`],
    ['xl/_rels/workbook.xml.rels',`${XML}<Relationships xmlns="${OOX}/package/2006/relationships"><Relationship Id="rId1" Type="${rel('worksheet')}" Target="worksheets/sheet1.xml"/><Relationship Id="rId2" Type="${rel('worksheet')}" Target="worksheets/sheet2.xml"/><Relationship Id="rId3" Type="${rel('styles')}" Target="styles.xml"/></Relationships>`],
    ['xl/styles.xml',`${XML}<styleSheet xmlns="${OOX}/spreadsheetml/2006/main"><fonts count="2"><font><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="11"/><name val="Calibri"/></font></fonts><fills count="2"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill></fills><borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="2"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/><xf numFmtId="0" fontId="1" fillId="0" borderId="0" xfId="0" applyFont="1"/></cellXfs><cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles></styleSheet>`],
    ['xl/worksheets/sheet1.xml',folhaXlsx(livro,[7,20,18,70,30,22,22,22])],
    ['xl/worksheets/sheet2.xml',folhaXlsx(resumo,[20,90])],
  ]);
}
async function exportarLivro(){
  if(!await reauth('Exportar livro'))return;
  openSheet(`<h3>Exportar livro</h3><p class="sub">O arquivo traz os atos do período escolhido e o resultado da conferência de integridade do livro inteiro.</p>
    <div class="seg" id="exF" style="--n:2"><span class="ind"></span><button aria-pressed="true" data-f="pdf">PDF</button><button aria-pressed="false" data-f="xlsx">Excel</button></div>
    <label class="f" style="margin-top:0"><span>Período</span><select id="exP">${Object.entries(PERIODOS).map(([k,v])=>`<option value="${k}">${v}</option>`).join('')}</select></label>
    <div id="exInt" hidden><label class="f"><span>De</span><input type="date" id="exDe"></label><label class="f"><span>Até</span><input type="date" id="exAte"></label></div>
    <p class="hint" id="exH"></p>
    <button class="btn" id="exGo">Baixar</button>`);
  let fmt='pdf';wireSeg($('#exF'),b=>{fmt=b.dataset.f});
  $('#exP').onchange=()=>{$('#exInt').hidden=$('#exP').value!=='int'};
  $('#exGo').onclick=async()=>{
    const per=periodoDe($('#exP').value,$('#exDe').value,$('#exAte').value);
    if(per.erro){$('#exH').textContent=per.erro;$('#exH').classList.add('bad');return}
    const d=new Date(),o={nome:$('#whoLabel').textContent,did:ses.did,periodo:per.txt,atos:st.book.filter(e=>e.at>=per.ini&&e.at<per.fim),
      total:st.book.length,conf:await checkBook(),gerado:dataHora(d.getTime())};
    const base=`livro-${fold(APP.label)}-${d.toISOString().slice(0,10)}`;
    if(fmt==='pdf')baixar(livroPdf(o),'application/pdf',base+'.pdf');
    else baixar(livroXlsx(o),'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',base+'.xlsx');
    closeSheet();toast(`Livro exportado: ${o.atos.length} ${o.atos.length===1?'ato':'atos'}`);
  };
}
