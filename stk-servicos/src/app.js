/* ================= serviço ================= */
// Serviços Systekna: cada empresa ou serviço (SRV) tem a própria identidade e pede à Governança a aprovação de
// emissão do serviço. Os apps e as funcionalidades de cada app são do serviço: ele emite crachás (CV:KEY) com as
// funcionalidades liberadas para quem tem a Identidade aprovada e confere o acesso na portaria.
let st=null;
const APP={
  db:'systekna-servicos',dominio:'servicos',label:'Serviços',dataKeys:['state'],createdMsg:'Serviço criado',autoDefault:10,
  importHint:'Substitui o livro e os registros deste serviço',
  howHtml:`<p><b>Papel.</b> O serviço dá acesso aos apps dele (portaria, aulas, sistema) sem guardar cadastro: quem prova quem é a pessoa é a Identidade aprovada pela Governança, que fica na carteira dela.</p>
  <p><b>Aprovação de emissão.</b> A Governança aprova o serviço, até a data que ela define. Ela não vê os apps: eles são do serviço.</p>
  <p><b>Apps e funcionalidades.</b> Em Serviço › Apps, você cadastra os apps (aplicativo, serviço ou ferramenta) e, em cada um, as funcionalidades (módulo, micro-serviço ou ferramenta) e os grupos delas, para liberar várias de uma vez. O Cartão do serviço e o Cartão do app levam esse catálogo, para a pessoa ver o que pode pedir.</p>
  <p><b>Crachá.</b> A pessoa pede pela carteira, com a Identidade junto. O serviço confere, sem consultar a Governança, que a Identidade foi assinada por ela, é da mesma pessoa e está válida, e emite um crachá por app, com as funcionalidades liberadas e a validade, nunca além da aprovação do serviço. Cada funcionalidade confere o crachá sozinha. Cada pessoa tem um crachá ativo por app; para liberar outra funcionalidade, emita um crachá novo.</p>
  <p><b>Portaria.</b> O desafio é para um app ou para uma funcionalidade dele, vale 10 minutos e uma única vez. A portaria confere que quem responde é o dono do crachá, que o crachá foi emitido aqui, é do app certo, libera a funcionalidade pedida, não foi revogado e está válido, e que a aprovação do serviço continua vigente.</p>
  <p><b>Filas.</b> Pedidos e respostas passam pelo Firestore, sem copiar e colar: cada pedido vai cifrado para a chave de quem atende e cada resposta volta cifrada para quem pediu. O banco só transporta; quem confere a assinatura é este aparelho. Sem login (prova de conceito): alguém pode gravar lixo na fila, mas não forjar nem ler.</p>
  <p><b>Limite.</b> O serviço não enxerga revogações feitas pela Governança: a proteção é a validade da Identidade e da aprovação de emissão.</p>`,
  async load(){
    const r=await DB.get('state');
    st=r?await unseal(ses.vaultKey,r,'state'):null;
    if(!st){
      const gov=GOVERNANCA_PADRAO.did?{name:GOVERNANCA_PADRAO.name,dids:[GOVERNANCA_PADRAO.did]}:null;
      st={name:'',catalogo:[],gov,aprovacoes:[],pendentes:[],issued:[],book:[],challenges:[],seq:0,verifs:0,acessos:[]};
      await ato('abertura','Livro aberto e serviço criado',ses.did);await save();
    }
    // Até a 0.18: um único credenciamento (st.cred). Agora: várias aprovações de emissão.
    if(!st.aprovacoes){st.aprovacoes=st.cred?[st.cred]:[];delete st.cred;await save()}
    if(!st.pendentes)st.pendentes=[];
    // Até a 0.21: os apps eram nomes aprovados pela Governança. Agora são do serviço, com as funcionalidades deles.
    if(!st.catalogo){
      const nomes=[...new Set([...(st.apps||[]),...st.aprovacoes.flatMap(a=>a.apps||[])])];
      st.catalogo=nomes.map(nome=>({nome,funcoes:[],grupos:[]}));delete st.apps;
      st.pendentes=st.pendentes.map(({nonce,at})=>({nonce,at}));
      await save();
    }
    st.catalogo.forEach(a=>{if(!a.grupos)a.grupos=[]});
  },
  enter(){$('#whoLabel').textContent=nomeServico();mountCommonSettings($('#commonSet'));setView('vPanel');iniciarFilas(sincronizarSrv)},
  onView(v){if(v==='vPanel')renderPanel();if(v==='vSrv')renderSrv();if(v==='vGate')fillGateApps();if(v==='vBadge')renderEntrada()},
  onLock(){
    pararFilas();st=null;pedido=null;$('#cFilaV').hidden=false;
    ['#pCred','#pAprov','#pOrgN','#pOrgG','#cPessoa','#pAtos','#pBook','#cWho','#cApps','#cOk','#cList','#gaOut','#sIssued','#sApps','#cFila','#cqH'].forEach(s=>$(s).innerHTML='');
    ['#gaChalT','#gaPT'].forEach(s=>$(s).value='');
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
ATO_IC.credenciamento='badge';ATO_IC.pedido='send';ATO_IC.catalogo='sliders';
const CLOCK_SKEW=60;
const nomeServico=()=>st&&st.name||'Serviços Systekna';
// A Governança guarda todos os DIDs que já teve: Identidades da chave antiga continuam valendo.
const govDid=()=>st.gov&&st.gov.dids.at(-1);
const daGov=did=>!!st.gov&&st.gov.dids.includes(did);
// Aprovação de emissão: a Governança aprova o serviço inteiro. Vale a de validade mais longa (sem validade vale mais).
// Aprovações antigas, que listavam apps, valem para o serviço todo.
const valida=a=>!a.exp||a.exp>now();
const maisLonga=l=>l.slice().sort((x,y)=>(y.exp||Infinity)-(x.exp||Infinity))[0];
const aprovServico=()=>maisLonga(st.aprovacoes.filter(valida));
const credOk=()=>!!aprovServico();
// Catálogo do serviço: apps, cada um com funcionalidades {id,nome,tipo} e grupos delas {id,nome,funcoes:[id]}.
// O grupo é um atalho para liberar várias funcionalidades de uma vez: no crachá vão só as funcionalidades.
const appNomes=()=>st.catalogo.map(a=>a.nome);
const appDe=nome=>st.catalogo.find(a=>a.nome===nome);
const TIPOS_FN=['Módulo','Micro-serviço','Ferramenta'];
const codigo=t=>fold(t).replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'');
// O que vai no cartão público: nomes e códigos, sem o tipo (que é do desenvolvedor).
const catalogoPublico=a=>({nome:a.nome,funcoes:a.funcoes.map(f=>({id:f.id,nome:f.nome})),grupos:a.grupos.map(g=>({id:g.id,nome:g.nome,funcoes:g.funcoes.slice()}))});
const nomesFn=(a,ids)=>ids.map(id=>(a.funcoes.find(f=>f.id===id)||{nome:id}).nome);
const resumoApp=a=>[a.funcoes.length?`${a.funcoes.length} ${a.funcoes.length===1?'funcionalidade':'funcionalidades'}`:'Sem funcionalidades',a.grupos.length?`${a.grupos.length} ${a.grupos.length===1?'grupo':'grupos'}`:''].filter(Boolean).join(' · ');

function credResumo(){
  if(!st.gov)return verdictHtml(false,'Governança não escolhida','Toque em + › Solicitar aprovação de emissão e escolha a Governança.');
  if(!credOk())return verdictHtml(false,st.aprovacoes.length?'Aprovação de emissão vencida':'Sem aprovação de emissão','Toque em + › Solicitar aprovação de emissão. Sem ela, o serviço não emite crachás.');
  if(!st.catalogo.length)return verdictHtml(false,'Nenhum app ainda','Em Serviço › Apps, cadastre os apps e as funcionalidades do serviço.');
  return '';
}
// Um cartão por app do serviço: o app, quantas funcionalidades tem, o DID do serviço com copiar e a validade da
// aprovação do serviço. Todos ficam agrupados sob a organização (o serviço).
function cartaoApp(a){
  const ap=aprovServico()||maisLonga(st.aprovacoes),venc=!ap||!valida(ap),pill=!ap?'Sem aprovação':!ap.exp?'Sem validade':venc?'Vencida':'Até '+fmtDate(ap.exp*1000);
  return `<button class="cred g-ServiceAccreditationCredential ${venc?'dim':''}" data-app="${esc(a.nome)}" aria-label="Cartão do app ${esc(a.nome)}"><div class="r1"><b class="tipo">App: ${esc(a.nome)}</b>${ic('badge')}</div><div class="main">${esc(resumoApp(a))}</div><div class="did"><span class="mono" title="${esc(ses.did)}">${esc(shortDid(ses.did))}</span><span class="cp" role="button" tabindex="0" aria-label="Copiar DID" data-copydid="${esc(ses.did)}">${ic('copy')}</span></div><div class="r3"><span class="emissor">${esc(st.gov?st.gov.name:'Governança')}</span><span class="pill on-card">${pill}</span></div></button>`;
}
const cartaoPendente=p=>`<div class="glass flat card pend" data-pend="${esc(p.nonce)}"><div class="kr" style="padding:0"><div class="h"><small>Aprovação de emissão</small><span class="pill ${p.recusa?'no':'warn'}">${p.recusa?'Recusado: '+esc(p.recusa):'Aguardando aprovação'}</span></div><div class="v">${esc(nomeServico())}</div><div class="v sub" style="margin-top:4px">Pedido em ${fmtDate(p.at)}</div></div></div>`;
// Tocar no cartão do app abre o Cartão daquele app; o botão de copiar só copia o DID.
$('#pAprov').onclick=e=>{
  const c=e.target.closest('[data-copydid]');if(c){e.preventDefault();copy(c.dataset.copydid,'DID copiado');return}
  const b=e.target.closest('[data-app]');if(b)cartaoDoApp(b.dataset.app);
};
// Teclado: Enter ou espaço no copiar não abre o cartão.
$('#pAprov').addEventListener('keydown',e=>{const c=e.target.closest('[data-copydid]');if(c&&(e.key==='Enter'||e.key===' ')){e.preventDefault();e.stopPropagation();copy(c.dataset.copydid,'DID copiado')}});

/* ================= relatório de uso (Portaria e gestão) ================= */
// Cada conferência da Portaria fica em st.acessos, ligada ao ato do livro (n), com o app, a funcionalidade e o
// primeiro ponto que falhou. As de antes da 0.24 só têm o texto do livro: são lidas dele, sem o motivo.
let relDias=7,relApp='';
function acessosDoLivro(){
  const reg=new Map((st.acessos||[]).map(a=>[a.n,a]));
  return st.book.filter(e=>e.act==='verificacao').map(e=>{
    if(reg.has(e.n))return reg.get(e.n);
    const m=/^Acesso (liberado|negado)(?: a (.+?) em (.+?)| a (.+?))?(?: para .*)?$/.exec(e.text)||[];
    return{n:e.n,at:e.at,ok:m[1]==='liberado',app:m[3]||m[4]||'',fn:m[2]||'',motivo:''};
  });
}
const meiaNoite=t=>{const d=new Date(t);return new Date(d.getFullYear(),d.getMonth(),d.getDate()).getTime()};
function renderUso(){
  if(!st)return;
  const hoje=new Date(),dias=[...Array(relDias)].map((_,i)=>new Date(hoje.getFullYear(),hoje.getMonth(),hoje.getDate()-relDias+1+i).getTime()),ini=dias[0];
  const periodo=acessosDoLivro().filter(a=>a.at>=ini);
  const apps=[...new Set(appNomes().concat(periodo.map(a=>a.app).filter(Boolean)))].sort((x,y)=>x.localeCompare(y,'pt'));
  if(relApp&&!apps.includes(relApp))relApp='';
  $('#usoApp').innerHTML='<option value="">Todos os apps</option>'+apps.map(a=>`<option value="${esc(a)}"${a===relApp?' selected':''}>${esc(a)}</option>`).join('');
  const L=relApp?periodo.filter(a=>a.app===relApp):periodo,lib=L.filter(a=>a.ok).length,neg=L.length-lib;
  // Gestão do período: o que o serviço fez com os pedidos (vale para o serviço todo, não por app).
  const atos=st.book.filter(e=>e.at>=ini),conta=act=>atos.filter(e=>e.act===act).length;
  const porDia=new Map(dias.map(d=>[d,{l:0,n:0}]));
  L.forEach(a=>{const x=porDia.get(meiaNoite(a.at));if(x)a.ok?x.l++:x.n++});
  const max=Math.max(1,...[...porDia.values()].map(x=>x.l+x.n));
  const dm=t=>new Date(t).toLocaleDateString('pt-BR',{day:'2-digit',month:'2-digit'});
  const plural=(n,um,varios)=>`${n} ${n===1?um:varios}`;
  const agrupa=chave=>{const m=new Map();L.forEach(a=>{const k=chave(a);if(!k)return;const v=m.get(k)||{k,l:0,n:0};a.ok?v.l++:v.n++;m.set(k,v)});return[...m.values()].sort((x,y)=>y.l+y.n-x.l-x.n)};
  const linhas=(l,vazio)=>l.length?l.map(v=>`<div class="tx" data-uso="${esc(v.k)}"><span class="t"><b>${esc(v.k)}</b><small>${plural(v.l,'liberado','liberados')} · ${plural(v.n,'negado','negados')}</small></span><span class="rv">${v.l+v.n} · ${Math.round((v.l+v.n)/L.length*100)}%</span></div>`).join(''):`<div class="empty">${vazio}</div>`;
  const motivos=new Map();L.filter(a=>!a.ok).forEach(a=>{const k=a.motivo||'Motivo não registrado (antes da 0.24)';motivos.set(k,(motivos.get(k)||0)+1)});
  $('#pUso').innerHTML=`<div class="stats">
      <div class="stat glass flat"><small>Acessos liberados</small><b id="uLib">${lib}</b></div>
      <div class="stat glass flat"><small>Acessos negados</small><b id="uNeg">${neg}</b></div></div>
    <div class="glass flat mt" id="uBars" aria-label="Acessos por dia">
      <div class="uso-bars">${dias.map(d=>{const x=porDia.get(d);return `<div class="d" title="${dm(d)}: ${plural(x.l,'liberado','liberados')}, ${plural(x.n,'negado','negados')}" data-dia="${dm(d)}" data-l="${x.l}" data-n="${x.n}"><i class="l" style="height:${x.l/max*100}%"></i><i class="n" style="height:${x.n/max*100}%"></i></div>`}).join('')}</div>
      <div class="uso-eixo"><span>${dm(ini)}</span><span>hoje</span></div>
      <div class="uso-leg"><span><i style="background:var(--in)"></i>Liberados</span><span><i style="background:var(--out)"></i>Negados</span></div></div>
    <div class="sec-h">Por app</div><div class="list glass flat" id="uApps">${linhas(agrupa(a=>a.app),'Nenhuma conferência na Portaria neste período.')}</div>
    <div class="sec-h">Por funcionalidade</div><div class="list glass flat" id="uFns">${linhas(agrupa(a=>a.fn&&`${a.app} › ${a.fn}`),'Nenhum desafio de funcionalidade neste período.')}</div>
    <div class="sec-h">Por que negou</div><div class="list glass flat" id="uMot">${motivos.size?[...motivos].sort((x,y)=>y[1]-x[1]).map(([k,n])=>`<div class="tx"><span class="t"><b>${esc(k)}</b></span><span class="rv">${n}</span></div>`).join(''):'<div class="empty">Nenhum acesso negado neste período.</div>'}</div>
    <div class="sec-h">Gestão no período <small>todo o serviço</small></div>
    <div class="list glass flat" id="uGest">
      <div class="tx"><span class="t"><b>Crachás emitidos</b></span><span class="rv" id="uEmi">${conta('emissao')}</span></div>
      <div class="tx"><span class="t"><b>Pedidos recusados</b></span><span class="rv" id="uRec">${conta('recusa')}</span></div>
      <div class="tx"><span class="t"><b>Crachás revogados</b></span><span class="rv" id="uRev">${conta('revogacao')}</span></div></div>`;
}
wireSeg($('#usoSeg'),b=>{relDias=+b.dataset.d;renderUso()});
$('#usoApp').onchange=()=>{relApp=$('#usoApp').value;renderUso()};

/* ================= painel ================= */
async function renderPanel(){
  if(!st)return;
  $('#pName').textContent=nomeServico();
  $('#pCred').innerHTML=credResumo();if($('#pCred').firstElementChild)$('#pCred').firstElementChild.style.marginTop='0';
  $('#pOrg').hidden=!st.catalogo.length;
  $('#pOrgN').textContent=nomeServico();$('#pOrgG').textContent=credOk()?`Serviço aprovado pela ${st.gov?st.gov.name:'Governança'}`:'Serviço sem aprovação de emissão válida';
  $('#pAprov').innerHTML=st.pendentes.map(cartaoPendente).join('')+st.catalogo.map(cartaoApp).join('');
  const crachas=st.issued.filter(i=>i.type==='BadgeCredential');
  $('#sA').textContent=crachas.filter(i=>issStatus(i)[0]==='ok').length;
  $('#sR').textContent=crachas.filter(i=>i.revoked).length;
  $('#sP').textContent=st.catalogo.length;$('#sV').textContent=st.verifs;
  $('#pAtos').innerHTML=st.book.slice(-6).reverse().map(e=>atoRow(e)).join('');
  renderUso();
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
  $('#sApps').innerHTML=st.catalogo.length?st.catalogo.map(a=>`<button class="tx" data-app="${esc(a.nome)}"><span class="dot">${ic('badge')}</span><span class="t"><b>${esc(a.nome)}</b><small>${esc(resumoApp(a))}</small></span>${ic('chev')}</button>`).join('')
    :'<div class="empty">Nenhum app ainda. Toque em Novo app.</div>';
  const list=st.issued.slice().reverse();
  $('#sIssN').textContent=list.length?`${list.length} no total`:'';
  $('#sIssued').innerHTML=list.length?list.slice(0,40).map(i=>{const[c,l]=issStatus(i);return `<button class="tx" data-iss="${i.n}"><span class="dot">${ic('badge')}</span><span class="t"><b>${esc(i.claims.app)}</b><small>${esc(i.holderName||shortDid(i.sub))}, ${fmtDate(i.iat*1000)}</small></span><span class="pill ${c}">${l}</span></button>`}).join('')
    :'<div class="empty">Nenhum crachá emitido ainda.</div>';
}
$('#sIssued').onclick=e=>{const b=e.target.closest('[data-iss]');if(b)showIssued(+b.dataset.iss,renderSrv)};
$('#sApps').onclick=e=>{const b=e.target.closest('[data-app]');if(b)gerenciarApp(b.dataset.app)};
$('#sAppNovo').onclick=novoApp;
function novoApp(){
  openSheet(`<h3>Novo app</h3><p class="sub">O app (aplicativo, serviço ou ferramenta) é do serviço: a Governança não precisa aprovar. Depois de criar, cadastre as funcionalidades dele.</p>
    <label class="f" id="naF"><span>Nome do app</span><input id="naN" autocomplete="off" placeholder="Ex.: Gestão Financeira"></label><p class="hint" id="naH"></p>
    <button class="btn" id="naGo">Criar app</button>`);
  $('#naN').focus();
  $('#naGo').onclick=async()=>{
    const nome=$('#naN').value.trim(),H=$('#naH'),fail=m=>{H.textContent=m;H.classList.add('bad');shake($('#naF'))};
    if(!nome)return fail('Informe o nome do app.');
    if(st.catalogo.some(a=>fold(a.nome)===fold(nome)))return fail(`${nome} já existe.`);
    const pii=piiProblem({app:nome});if(pii)return fail(pii);
    st.catalogo.push({nome,funcoes:[],grupos:[]});
    await ato('catalogo',`App ${nome} criado`,null);await save();
    toast('App criado');renderSrv();gerenciarApp(nome);
  };
}
// Funcionalidades e grupos de um app. O código da funcionalidade é o que vai no crachá e não muda.
function gerenciarApp(nome){
  const a=appDe(nome);if(!a)return;
  openSheet(`<h3>App ${esc(a.nome)}</h3><p class="sub">Cada funcionalidade é liberada no crachá pelo código dela. Os grupos juntam funcionalidades para liberar de uma vez. Ao aprovar um acesso, você escolhe o que a pessoa pode usar.</p>
    <div class="sec-h">Funcionalidades</div><div class="list glass flat" id="fnL"></div>
    <label class="f" id="fnNF"><span>Funcionalidade</span><input id="fnN" autocomplete="off" placeholder="Ex.: Lançar despesas"></label>
    <label class="f" id="fnCF"><span>Código</span><input id="fnC" class="mono" autocomplete="off" autocapitalize="none" spellcheck="false" placeholder="Ex.: despesas"></label>
    <label class="f"><span>Tipo</span><select id="fnT">${TIPOS_FN.map(t=>`<option>${t}</option>`).join('')}</select></label>
    <button class="btn ghost" id="fnAdd">Adicionar funcionalidade</button><p class="hint" id="fnH"></p>
    <div class="sec-h">Grupos</div><div class="list glass flat" id="grL"></div>
    <label class="f" id="grNF"><span>Grupo</span><input id="grN" autocomplete="off" placeholder="Ex.: Básico"></label>
    <div class="list glass flat" id="grF"></div>
    <button class="btn ghost" id="grAdd">Criar grupo</button><p class="hint" id="grH"></p>`);
  const msg=(id,m,bad)=>{$(id).textContent=m;$(id).classList.toggle('bad',!!bad)},aviso=(m,bad)=>msg('#fnH',m,bad);
  const desenhar=()=>{
    $('#fnL').innerHTML=a.funcoes.length?a.funcoes.map(f=>`<div class="tx" data-fn="${esc(f.id)}"><span class="t"><b>${esc(f.nome)}</b><small><span class="mono">${esc(f.id)}</span> · ${esc(f.tipo)}</small></span><button class="mini sm" data-rmfn="${esc(f.id)}" aria-label="Tirar ${esc(f.nome)}">${ic('x')}</button></div>`).join('')
      :'<div class="empty">Nenhuma funcionalidade ainda.</div>';
    $('#grL').innerHTML=a.grupos.length?a.grupos.map(g=>`<div class="tx" data-gr="${esc(g.id)}"><span class="t"><b>${esc(g.nome)}</b><small>${esc(nomesFn(a,g.funcoes).join(' · ')||'Nenhuma funcionalidade')}</small></span><button class="mini sm" data-rmgr="${esc(g.id)}" aria-label="Tirar ${esc(g.nome)}">${ic('x')}</button></div>`).join('')
      :'<div class="empty">Nenhum grupo ainda.</div>';
    $('#grF').innerHTML=a.funcoes.length?a.funcoes.map(f=>`<button class="choice" data-fn="${esc(f.id)}" aria-pressed="false"><span class="rd"></span><span class="t"><b>${esc(f.nome)}</b></span></button>`).join('')
      :'<div class="empty">Cadastre funcionalidades para montar grupos.</div>';
  };
  desenhar();
  $('#fnN').oninput=()=>{if(!$('#fnC').dataset.mexido)$('#fnC').value=codigo($('#fnN').value)};
  $('#fnC').oninput=()=>{$('#fnC').dataset.mexido='1'};
  $('#fnAdd').onclick=async()=>{
    const fn=$('#fnN').value.trim(),id=codigo($('#fnC').value||fn),tipo=$('#fnT').value;
    if(!fn){shake($('#fnNF'));return aviso('Informe a funcionalidade.',true)}
    if(!id){shake($('#fnCF'));return aviso('O código usa letras, números e hífen.',true)}
    if(a.funcoes.some(f=>f.id===id))return aviso(`O código ${id} já existe neste app.`,true);
    if(a.funcoes.some(f=>fold(f.nome)===fold(fn)))return aviso(`${fn} já existe neste app.`,true);
    const pii=piiProblem({funcionalidade:fn,codigo:id});if(pii)return aviso(pii,true);
    a.funcoes.push({id,nome:fn,tipo});
    await ato('catalogo',`Funcionalidade ${fn} (${id}) criada no app ${a.nome}`,null);await save();
    $('#fnN').value='';$('#fnC').value='';delete $('#fnC').dataset.mexido;aviso('');desenhar();renderSrv();toast('Funcionalidade criada');
  };
  $('#fnL').onclick=async e=>{
    const b=e.target.closest('[data-rmfn]');if(!b)return;
    const f=a.funcoes.find(x=>x.id===b.dataset.rmfn);
    if(!await confirmSheet('Tirar funcionalidade',`${f.nome} sai do app e dos grupos. Os crachás já emitidos continuam com ela até vencerem ou serem trocados.`,'Tirar',true))return gerenciarApp(nome);
    a.funcoes=a.funcoes.filter(x=>x!==f);a.grupos.forEach(g=>g.funcoes=g.funcoes.filter(id=>id!==f.id));
    await ato('catalogo',`Funcionalidade ${f.nome} (${f.id}) tirada do app ${a.nome}`,null);await save();renderSrv();gerenciarApp(nome);
  };
  $('#grF').onclick=e=>{const b=e.target.closest('[data-fn]');if(b)b.setAttribute('aria-pressed',b.getAttribute('aria-pressed')!=='true')};
  $('#grAdd').onclick=async()=>{
    const gn=$('#grN').value.trim(),fns=[...$('#grF').querySelectorAll('[aria-pressed="true"]')].map(b=>b.dataset.fn),id=codigo(gn);
    if(!gn||!id){shake($('#grNF'));return msg('#grH','Informe o nome do grupo.',true)}
    if(a.grupos.some(g=>g.id===id))return msg('#grH',`O grupo ${gn} já existe.`,true);
    if(!fns.length)return msg('#grH','Marque ao menos uma funcionalidade.',true);
    const pii=piiProblem({grupo:gn});if(pii)return msg('#grH',pii,true);
    a.grupos.push({id,nome:gn,funcoes:fns});
    await ato('catalogo',`Grupo ${gn} criado no app ${a.nome}: ${nomesFn(a,fns).join(', ')}`,null);await save();
    $('#grN').value='';msg('#grH','');desenhar();renderSrv();toast('Grupo criado');
  };
  $('#grL').onclick=async e=>{
    const b=e.target.closest('[data-rmgr]');if(!b)return;
    const g=a.grupos.find(x=>x.id===b.dataset.rmgr);
    if(!await confirmSheet('Tirar grupo',`O grupo ${g.nome} sai do app. As funcionalidades continuam, e os crachás já emitidos não mudam.`,'Tirar',true))return gerenciarApp(nome);
    a.grupos=a.grupos.filter(x=>x!==g);
    await ato('catalogo',`Grupo ${g.nome} tirado do app ${a.nome}`,null);await save();renderSrv();gerenciarApp(nome);
  };
}
/* ================= menu +: solicitar e receber aprovação de emissão, cartão do serviço ================= */
$('#dockAdd').onclick=()=>{
  const row=(k,icn,t,d)=>`<button class="tx" data-act="${k}"><span class="dot">${ic(icn)}</span><span class="t"><b>${t}</b><small>${d}</small></span>${ic('chev')}</button>`;
  openSheet(`<h3>O que você quer fazer?</h3><div class="list glass flat" style="margin-top:12px">
    ${row('ask','send','Solicitar aprovação de emissão','Envia o pedido à Governança pela fila')}
    ${row('get','inbox','Buscar respostas e pedidos','Aprovação da Governança e pedidos de crachá que chegaram')}
    ${row('card','badge','Cartão do serviço','Publicado no diretório: é por ele que as carteiras encontram o serviço')}</div>`);
  $('#sheetBody').onclick=e=>{const b=e.target.closest('[data-act]');if(b)({ask:solicitarEmissao,get:buscarAgora,card:cartaoServico})[b.dataset.act]()};
};
// Solicitar: a Governança aprova o serviço, não os apps. O pedido leva só o nome do serviço.
function solicitarEmissao(){
  const ap=aprovServico();
  openSheet(`<h3>Solicitar aprovação de emissão</h3><p class="sub">A Governança aprova o serviço. Os apps e as funcionalidades são seus: cadastre em Serviço › Apps.</p>
    ${st.gov?`<div class="list glass flat"><div class="kr"><div class="h"><small>Governança</small></div><div class="v">${esc(st.gov.name)}</div><div class="v mono" style="margin-top:4px">${esc(shortDid(govDid()))}</div></div></div>`
      :`<label class="f" id="saGF"><span>Governança</span><select id="saG"><option value="">Buscando…</option></select></label><p class="hint">Escolhida uma vez, fica guardada.</p>`}
    <label class="f" id="saNF"><span>Nome do serviço</span><input id="saN" autocomplete="off" value="${esc(st.name)}" placeholder="Ex.: Academia Boa Forma"></label>
    ${ap?`<p class="note" id="saOk">O serviço já está aprovado${ap.exp?' até '+fmtDate(ap.exp*1000):', sem validade'}. Pedir de novo serve para renovar.</p>`:''}
    <p class="hint" id="saH"></p>
    <button class="btn" id="saGo">Enviar pedido</button>`);
  const H=$('#saH'),aviso=(m,bad)=>{H.textContent=m;H.classList.toggle('bad',!!bad)};
  let govs=[];
  lerDiretorio('governanca').then(l=>{
    govs=l;if(!$('#saG'))return;
    $('#saG').innerHTML=l.length?l.map(g=>`<option value="${esc(g.did)}">${esc(g.name||'Governança')} · ${esc(shortDid(g.did))}</option>`).join(''):'<option value="">Nenhuma Governança publicada</option>';
  }).catch(e=>aviso(e.message,true));
  $('#saGo').onclick=async()=>{
    const name=$('#saN').value.trim();
    if(!name){shake($('#saNF'));return $('#saN').focus()}
    const pii=piiProblem({nome:name});if(pii)return aviso(pii,true);
    // A chave de cifragem da Governança vem do diretório, assinada por ela.
    let gov;
    try{gov=st.gov?(await lerDiretorio('governanca')).find(g=>g.did===govDid()):govs.find(g=>g.did===$('#saG').value)}catch(e){return aviso(e.message,true)}
    if(!gov){if($('#saGF'))shake($('#saGF'));return aviso(st.gov?'A Governança deste serviço não está publicada no diretório.':'Escolha a Governança.',true)}
    if(minhas().includes(gov.did))return aviso('Este é o DID do próprio serviço.',true);
    const iat=now(),nonce=b64u.enc(rnd(16));
    const tok=await signJWT('pedido+jwt',{iss:ses.did,sub:ses.did,aud:gov.did,name,wanted:'ServiceAccreditationCredential',note:'',x:ses.xMb,nonce,iat,exp:iat+7*86400});
    $('#saGo').disabled=true;
    try{await enviarSolicitacao(gov,tok,nonce)}catch(e){$('#saGo').disabled=false;return aviso(e.message,true)}
    if(!st.gov){st.gov={name:gov.name||GOVERNANCA_PADRAO.name,dids:[gov.did]};await ato('confianca',`${st.gov.name} definida como Governança do serviço`,gov.did)}
    st.name=name;
    st.pendentes.push({nonce,at:Date.now()});
    await ato('pedido',`Aprovação de emissão pedida para o serviço ${name}`,nonce);await save();
    $('#whoLabel').textContent=name;aviso('');
    closeSheet();toast(`Pedido enviado à ${st.gov.name}`);renderPanel();
  };
}
// Aprovação de emissão que chegou pela fila (assinada pela Governança do serviço).
async function aceitarAprovacao(tok){
  const r=await verifyJWT(tok),p=r.payload;
  if(r.header.typ!=='vc+jwt'||!p.vc||vcType(p)!=='ServiceAccreditationCredential')throw new Error('Isto não é uma aprovação de emissão.');
  if(!r.ok)throw new Error('A assinatura não confere: a aprovação foi alterada.');
  if(p.sub!==ses.did)throw new Error('Esta aprovação é de outro serviço.');
  if(!st.gov)throw new Error('Escolha antes a Governança deste serviço.');
  if(!daGov(r.did))throw new Error('Esta aprovação não foi assinada pela Governança deste serviço.');
  if(st.aprovacoes.some(a=>a.jti===p.jti))throw new Error('Esta aprovação já está guardada.');
  const t0=now();
  if(p.exp&&p.exp<=t0)throw new Error(`Esta aprovação venceu em ${fmtDate(p.exp*1000)}.`);
  if(p.nbf&&p.nbf>t0+CLOCK_SKEW)throw new Error(`Esta aprovação só vale a partir de ${fmtDate(p.nbf*1000)}.`);
  const cs=p.vc.credentialSubject||{};
  st.aprovacoes.push({jwt:r.tok,jti:p.jti,iat:p.iat,exp:p.exp||0,servico:cs.servico||''});
  // A aprovação atende os pedidos em aberto: o serviço inteiro está aprovado.
  st.pendentes=[];
  await ato('credenciamento',`Aprovação de emissão recebida da ${st.gov.name}${p.exp?', até '+fmtDate(p.exp*1000):', sem validade'}`,p.jti);await save();
  return 'Aprovação de emissão guardada';
}
// Recusa da Governança a um pedido de aprovação de emissão: o pedido sai de "aguardando" com o motivo.
async function aceitarRecusaGov(tok){
  const r=await verifyJWT(tok,'recusa+jwt'),p=r.payload;
  if(!r.ok||!daGov(r.did)||p.sub!==ses.did)throw new Error('Recusa que não é da Governança deste serviço.');
  const pd=st.pendentes.find(x=>x.nonce===p.nonce);if(!pd)throw new Error('Não há pedido com este número.');
  pd.recusa=String(p.motivo||'Sem motivo');
  await ato('recusa',`Aprovação de emissão recusada pela ${st.gov.name}: ${pd.recusa}`,p.nonce);await save();
  return 'Recusa registrada';
}

/* ================= filas ================= */
// O cartão do serviço vai para o diretório sempre que muda (nome, apps, funcionalidades ou aprovação).
async function publicarSrv(forcar){
  const ap=aprovServico();
  if(!ap||!st.catalogo.length)return false;
  const pl={iss:ses.did,name:nomeServico(),apps:appNomes(),catalogo:st.catalogo.map(catalogoPublico),aprovacoes:[ap.jwt],iat:now()};
  if(ap.exp)pl.exp=ap.exp;
  const marca=JSON.stringify([pl.name,pl.apps,pl.catalogo,ap.jti]);
  if(st.publicado===marca&&!forcar)return true;
  await publicarDiretorio('servico',nomeServico(),{cartao:await signJWT('cartao+jwt',pl)});
  st.publicado=marca;await save();return true;
}
// Pedidos de crachá que chegaram: conferência leve aqui (assinatura e tipo); a completa é ao abrir o pedido.
async function sincronizarSrv(manual){
  if(!st)return;
  let n=0,resp=0;const erros=[];
  for(const pd of st.pendentes.filter(x=>!x.recusa)){
    const toks=await buscarEmissao(pd.nonce);if(!toks)continue;
    for(const t of toks){try{await(decodeJWT(t).header.typ==='recusa+jwt'?aceitarRecusaGov(t):aceitarAprovacao(t));resp++}catch(e){erros.push(e.message)}}
    await fsApagar('fila-emissao',pd.nonce);
  }
  for(const d of await buscarSolicitacoes()){
    if(!d.erro){
      try{
        const r=await verifyJWT(d.tok,'pedido+jwt'),p=r.payload;
        if(!r.ok)throw new Error('A assinatura do pedido não confere.');
        if(p.wanted!=='BadgeCredential')throw new Error('Este pedido não é de crachá.');
        if(typeof p.x!=='string')throw new Error('O pedido não traz a chave de cifragem de quem pediu.');
        parseXKey(p.x);
        if(!st.entrada)st.entrada=[];
        if(st.issued.some(i=>i.nonce===p.nonce))throw new Error('Este pedido já foi atendido. Peça um novo à pessoa.');
        if((st.recusas||[]).some(x=>x.nonce===p.nonce))throw new Error('Este pedido já foi recusado. A pessoa pode enviar um pedido novo.');
        if(!st.entrada.some(x=>x.nonce===p.nonce)){
          st.entrada.push({nonce:p.nonce,tok:r.tok,did:r.did,x:p.x,nome:String(p.name||''),perfil:String(p.perfil||''),apps:Array.isArray(p.apps)?p.apps.map(String):[],recebido:Date.now()});n++;
          await ato('pedido',`Pedido de crachá recebido: ${p.name||shortDid(r.did)}`,r.did);
        }
      }catch(e){erros.push(e.message)}
    }
    await fsApagar('fila-solicitacao',d.id);
  }
  if(n)await save();
  try{await publicarSrv()}catch{}
  const H=$('#cqH');
  if(manual||n||resp||erros.length){
    H.textContent=[n?`${n} ${n===1?'pedido novo':'pedidos novos'}.`:manual&&!erros.length?'Nenhum pedido novo.':'',...erros].filter(Boolean).join(' ');
    H.classList.toggle('bad',!!erros.length);
  }
  renderEntrada();if($('#vPanel').classList.contains('on'))renderPanel();
  if(n||resp)toast(resp?'Resposta da Governança recebida':n===1?'Pedido de crachá novo':`${n} pedidos de crachá novos`);
  return n+resp;
}
async function buscarAgora(){
  closeSheet();
  try{const n=await sincronizarSrv(true);if(!n)toast('Nada novo nas filas')}catch(e){toast(e.message,true)}
}
function renderEntrada(){
  if(!st)return;
  const l=(st.entrada||[]).slice().reverse();
  $('#cFila').innerHTML=l.length?l.map(x=>`<button class="tx" data-ent="${esc(x.nonce)}"><span class="dot">${ic('badge')}</span><span class="t"><b>${esc(x.nome||shortDid(x.did))}${x.perfil?' · '+esc(x.perfil):''}</b><small>${esc(x.apps.join(', ')||'Apps do serviço')} · ${fmtTime(x.recebido)}</small></span><span class="pill warn">Aguardando</span></button>`).join('')
    :'<div class="empty">Nenhum pedido de crachá aguardando.</div>';
}
$('#cqGo').onclick=()=>sincronizarSrv(true).catch(e=>{$('#cqH').textContent=e.message;$('#cqH').classList.add('bad')});
$('#cFila').onclick=e=>{const b=e.target.closest('[data-ent]');if(!b)return;const x=(st.entrada||[]).find(i=>i.nonce===b.dataset.ent);if(x)abrirPedido(x)};
function voltarEntrada(){pedido=null;$('#cForm').hidden=true;$('#cOut').hidden=true;$('#cFilaV').hidden=false;renderEntrada()}
$('#cBack').onclick=voltarEntrada;
// Tira o pedido da entrada e responde a quem pediu, cifrado para a chave que veio no pedido.
async function responderEntrada(nonce,toks){
  const x=(st.entrada||[]).find(i=>i.nonce===nonce);
  st.entrada=(st.entrada||[]).filter(i=>i.nonce!==nonce);await save();
  if(x)await enviarEmissao(x.did,x.x,x.nonce,toks);
}

// Cartão do serviço: os apps com as funcionalidades e a aprovação do serviço pela Governança.
async function cartaoServico(){
  const ap=aprovServico();
  if(!ap)return toast('Sem aprovação de emissão válida, o serviço não tem cartão.',true);
  if(!st.catalogo.length)return toast('O serviço ainda não tem apps. Crie em Serviço › Apps.',true);
  closeSheet();
  try{await publicarSrv(true);toast('Cartão do serviço publicado no diretório')}catch(e){toast(e.message,true)}
}
// Cartão do app: o que a carteira vê do app (funcionalidades e grupos) quando escolhe o serviço no diretório.
function cartaoDoApp(app){
  const a=appDe(app);if(!a)return;
  openSheet(`<h3>App ${esc(app)}</h3><p class="sub">Publicado no diretório com o cartão do serviço: a carteira escolhe o serviço, vê os apps e pede o crachá.</p>
    <div class="list glass flat">${a.funcoes.map(f=>`<div class="kr"><div class="v">${esc(f.nome)}</div><div class="h"><small class="mono">${esc(f.id)}</small></div></div>`).join('')||'<div class="empty">Acesso ao app, sem funcionalidades.</div>'}</div>`);
}

/* ================= crachás ================= */
let pedido=null;
async function abrirPedido(x){
  const H=$('#cqH'),fail=m=>{H.textContent=m;H.classList.add('bad');voltarEntrada()};
  H.textContent='';H.classList.remove('bad');$('#cOut').hidden=true;$('#cForm').hidden=true;$('#cWho').innerHTML='';
  let r;try{r=await verifyJWT(x.tok)}catch(e){return fail(e.message)}
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
  const pedidos=Array.isArray(p.apps)?p.apps.map(String):[],fora=pedidos.filter(a=>!appDe(a));
  $('#cWho').innerHTML=verdictHtml(true,'Pedido conferido',`${esc(nome)} tem a Identidade aprovada pela ${esc(st.gov.name)} e controla ${esc(shortDid(r.did))}.${fora.length?' O serviço não tem: '+esc(fora.join(', '))+'.':''}`);
  // Um app por linha e, embaixo, os grupos (atalhos) e as funcionalidades, todas liberadas; desmarque o que a
  // pessoa não vai usar. Tocar num grupo marca ou desmarca as funcionalidades dele.
  $('#cApps').innerHTML=st.catalogo.map(a=>`<div class="appFn" data-appfn="${esc(a.nome)}"><button class="choice" data-app="${esc(a.nome)}" aria-pressed="${!pedidos.length||pedidos.includes(a.nome)}"><span class="rd"></span><span class="t"><b>${esc(a.nome)}</b><small>${esc(a.funcoes.length?'Funcionalidades liberadas abaixo':'Acesso ao app')}</small></span></button>${a.grupos.map(g=>`<button class="choice" data-gr="${esc(g.id)}" aria-pressed="true" style="padding-left:48px"><span class="rd"></span><span class="t"><b>Grupo ${esc(g.nome)}</b><small>${esc(nomesFn(a,g.funcoes).join(', '))}</small></span></button>`).join('')}${a.funcoes.map(f=>`<button class="choice sub-fn" data-fn="${esc(f.id)}" aria-pressed="true" style="padding-left:48px"><span class="rd"></span><span class="t"><b>${esc(f.nome)}</b></span></button>`).join('')}</div>`).join('')
    ||'<div class="empty">O serviço ainda não tem apps.</div>';
  // Cartão de análise: quem pede (nome e perfil da identidade aprovada) e o DID.
  $('#cPessoa').innerHTML=`<div class="list glass flat mt">
    <div class="kr"><div class="h"><small>Nome</small></div><div class="v" id="cNome">${esc(nome)}</div></div>
    <div class="kr"><div class="h"><small>Identidade</small></div><div class="v" id="cPerfil">${esc(p.perfil||'Identidade')}</div></div>
    <div class="kr"><div class="h"><small>DID</small></div><div class="v mono">${esc(r.did)}</div></div></div>`;
  $('#cFilaV').hidden=true;$('#cForm').hidden=false;
}
// Recusa: assinada pelo serviço e entregue ao cliente (a carteira mostra "Recusado: motivo"); fica também no livro.
$('#cRec').onclick=()=>{
  if(!pedido)return;
  const pd=pedido,p=pd.r.payload;
  openSheet(`<h3>Recusar pedido</h3><p class="sub">A recusa volta assinada pela fila para a pessoa, com o motivo, e fica registrada no livro.</p>
    <label class="f"><span>Motivo</span><select id="rxM"><option>Não é cliente</option><option>Dados não conferem</option><option>App não disponível</option><option>Outro</option></select></label>
    <button class="btn danger" id="rxGo">Recusar</button>`);
  $('#rxGo').onclick=async()=>{
    const motivo=$('#rxM').value,iat=now();
    const tok=await signJWT('recusa+jwt',{iss:ses.did,sub:pd.r.did,nonce:p.nonce,apps:Array.isArray(p.apps)?p.apps:[],motivo,servico:nomeServico(),iat});
    st.recusas=[...(st.recusas||[]),{nonce:p.nonce,sub:pd.r.did,nome:pd.nome,motivo,at:Date.now()}];
    await ato('recusa',`Acesso de ${pd.nome||shortDid(pd.r.did)} recusado: ${motivo}`,pd.r.did);await save();
    closeSheet();pedido=null;$('#cForm').hidden=true;
    let env='A recusa foi enviada pela fila: ela aparece na carteira como recusada.';
    try{await responderEntrada(p.nonce,[tok])}catch(e){env=`A recusa não foi enviada: ${esc(e.message)}`}
    $('#cOk').innerHTML=verdictHtml(false,'Pedido recusado',`${esc(motivo)}. ${env}`);
    $('#cList').innerHTML='';
    $('#cOut').hidden=false;toast('Pedido recusado');
  };
};
$('#cApps').onclick=e=>{
  const b=e.target.closest('[data-app],[data-fn],[data-gr]');if(!b)return;
  const box=b.closest('[data-appfn]'),a=appDe(box.dataset.appfn),fnBtn=id=>box.querySelector(`[data-fn="${CSS.escape(id)}"]`);
  if(b.dataset.gr){
    const g=a.grupos.find(x=>x.id===b.dataset.gr),liga=b.getAttribute('aria-pressed')!=='true';
    g.funcoes.forEach(id=>{const f=fnBtn(id);if(f)f.setAttribute('aria-pressed',liga)});
  }else b.setAttribute('aria-pressed',b.getAttribute('aria-pressed')!=='true');
  // O grupo aparece marcado quando todas as funcionalidades dele estão liberadas.
  a.grupos.forEach(g=>{const gb=box.querySelector(`[data-gr="${CSS.escape(g.id)}"]`);if(gb)gb.setAttribute('aria-pressed',g.funcoes.every(id=>{const f=fnBtn(id);return f&&f.getAttribute('aria-pressed')==='true'}))});
};
// O crachá leva as funcionalidades liberadas (os códigos): cada funcionalidade confere o crachá sozinha, sem
// perguntar ao serviço. App sem funcionalidades: o crachá dá só a entrada no app.
async function emitirCracha(sub,app,iat,exp,nome,nonce,funcionalidades){
  const n=++st.seq,jti='urn:uuid:'+crypto.randomUUID(),claims={servico:nomeServico(),app,...(funcionalidades.length?{funcionalidades}:{})};
  const payload={iss:ses.did,sub,iat,nbf:iat,jti,vc:{'@context':VC_CONTEXT,type:['VerifiableCredential','BadgeCredential'],issuer:{id:ses.did,name:nomeServico()},issuanceDate:new Date(iat*1000).toISOString(),
    credentialSubject:{id:sub,...claims},credentialStatus:{id:`${ses.did}#status-${n}`,type:'SysteknaStatusRegistry',statusListIndex:n},
    // A aprovação de emissão do serviço vai junto, como prova de que a Governança autorizou o serviço.
    evidence:[{type:['CredenciamentoSystekna'],credenciamento:aprovServico().jwt}]}};
  if(exp)payload.exp=exp;
  const jwt=await signJWT('vc+jwt',payload);
  const antigos=st.issued.filter(i=>i.sub===sub&&i.type==='BadgeCredential'&&i.claims.app===app&&!i.revoked&&!(i.exp&&i.exp<iat));
  st.issued.push({n,jti,sub,type:'BadgeCredential',claims,iat,exp,holderName:nome,nonce,revoked:false});
  await ato('emissao',`Crachá ${app}${funcionalidades.length?' ('+nomesFn(appDe(app),funcionalidades).join(', ')+')':''} emitido para ${nome||shortDid(sub)}`,jti);
  for(const a of antigos){
    a.revoked=true;a.revokedAt=Date.now();a.reason='Substituído por novo crachá';
    await ato('revogacao',`Crachá ${app} nº ${a.n} de ${a.holderName||shortDid(a.sub)} revogado: substituído por novo crachá`,a.jti);
  }
  return jwt;
}
$('#cGo').onclick=async()=>{
  if(!pedido)return;
  const apps=[...$('#cApps').querySelectorAll('[data-app][aria-pressed="true"]')].map(b=>b.dataset.app);
  if(!apps.length)return toast('Escolha ao menos um app',true);
  const ap=aprovServico();
  if(!ap)return toast('A aprovação de emissão do serviço venceu. Peça de novo à Governança.',true);
  const fnsDe=app=>[...$('#cApps').querySelectorAll(`[data-appfn="${CSS.escape(app)}"] [data-fn][aria-pressed="true"]`)].map(b=>b.dataset.fn);
  const vazio=apps.find(app=>appDe(app).funcoes.length&&!fnsDe(app).length);
  if(vazio)return toast(`Libere ao menos uma funcionalidade de ${vazio}`,true);
  const days=+$('#cDays').value,iat=now(),pedido_=days?iat+days*86400:0;
  // A validade escolhida nunca passa a da aprovação de emissão do serviço (DP-07).
  const exp=ap.exp?(pedido_?Math.min(pedido_,ap.exp):ap.exp):pedido_;
  const toks=[];
  for(const app of apps)toks.push([app,await emitirCracha(pedido.r.did,app,iat,exp,pedido.nome,pedido.r.payload.nonce,fnsDe(app))]);
  await save();
  let env='Enviados pela fila: a carteira recebe sozinha.';
  try{await responderEntrada(pedido.r.payload.nonce,toks.map(t=>t[1]))}catch(e){env=`Não foi possível enviar agora: ${esc(e.message)}`}
  $('#cOk').innerHTML=verdictHtml(true,apps.length>1?'Crachás emitidos':'Crachá emitido',`${esc(apps.join(', '))} para ${esc(pedido.nome||shortDid(pedido.r.did))}${exp?', até '+fmtDate(exp*1000):', sem validade'}. ${env}`);
  $('#cList').innerHTML=toks.map(([app,t],i)=>`<textarea class="mono" hidden readonly data-cracha="${i}">${t}</textarea>`).join('');
  $('#cForm').hidden=true;$('#cOut').hidden=false;pedido=null;toast(apps.length>1?'Crachás emitidos':'Crachá emitido');
};
$('#cNew').onclick=()=>{$('#cqH').textContent='';voltarEntrada()};

/* ================= portaria ================= */
// A portaria confere a entrada no app ou uma funcionalidade dele (ela tem de estar liberada no crachá).
function fillGateApps(){
  if(!st)return;
  const apps=appNomes();
  $('#gaApp').innerHTML=apps.length?apps.map(a=>`<option>${esc(a)}</option>`).join(''):'<option value="">Nenhum app</option>';
  fillGateFns();
}
function fillGateFns(){
  const a=appDe($('#gaApp').value);
  $('#gaFn').innerHTML=`<option value="">Só a entrada no app</option>`+(a?a.funcoes.map(f=>`<option value="${esc(f.id)}">${esc(f.nome)}</option>`).join(''):'');
}
$('#gaApp').onchange=fillGateFns;
$('#gaGen').onclick=async()=>{
  const app=$('#gaApp').value,a=appDe(app);
  if(!a)return toast('Crie um app em Serviço › Apps',true);
  if(!credOk())return toast('Sem aprovação de emissão válida para o serviço',true);
  const f=a.funcoes.find(x=>x.id===$('#gaFn').value);
  const nonce=b64u.enc(rnd(18)),iat=now(),purpose=f?`${f.nome} em ${app}`:`Acesso a ${app}`;
  $('#gaChalT').value=embrulhar(await signJWT('desafio+jwt',{iss:ses.did,name:nomeServico(),nonce,purpose,accept:'BadgeCredential',app,...(f?{funcao:f.id}:{}),iat,exp:iat+600}));
  st.challenges=st.challenges.filter(c=>c.exp>iat-86400);
  st.challenges.push({nonce,type:'BadgeCredential',app,...(f?{funcao:f.id,funcaoNome:f.nome}:{}),purpose,iat,exp:iat+600,used:false});await save();
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
  if(ch&&ch.funcao){
    const tem=Array.isArray(cs.funcionalidades)&&cs.funcionalidades.includes(ch.funcao);
    add(tem,'Funcionalidade liberada',`O crachá ${tem?'libera':'não libera'} ${esc(ch.funcaoNome||ch.funcao)}.`);
  }
  const rec=meu?st.issued.find(i=>i.jti===q.jti):null;
  add(!!rec&&!rec.revoked,'Não revogado',!rec?'Não consta nos crachás emitidos aqui.':rec.revoked?`Revogado em ${fmtDate(rec.revokedAt)}: ${esc(rec.reason)}.`:'Ativo nos crachás emitidos.');
  const t0=now(),early=q.nbf&&q.nbf>t0+CLOCK_SKEW,late=q.exp&&q.exp<=t0;
  add(!early&&!late,'Dentro da validade',early?`Só vale a partir de ${fmtDate(q.nbf*1000)}.`:q.exp?(late?`Venceu em ${fmtDate(q.exp*1000)}.`:`Válido até ${fmtDate(q.exp*1000)}.`):'Sem data de validade.');
  const ap=aprovServico();
  add(!!ap,'Aprovação de emissão vigente',ap?`A Governança aprovou o serviço${ap.exp?' até '+fmtDate(ap.exp*1000):''}.`:'O serviço não tem aprovação de emissão válida.');
  return{checks,ch,chOk,holder:vp.did,app:cs.app,fn:ch&&ch.funcao?ch.funcaoNome||ch.funcao:'',nome:rec&&rec.holderName};
}
const chkRow=c=>`<div class="chk ${c.ok===true?'ok':c.ok===false?'no':'na'}"><span class="ci">${ic(c.ok===true?'check':c.ok===false?'x':'minus')}</span><div><b>${c.label}</b><small>${c.detail}</small></div></div>`;
$('#gaGo').onclick=async()=>{
  if(!$('#gaPT').value.trim()){shake($('#gaF'));return}
  const r=await checkProva($('#gaPT').value),ok=r.checks.every(c=>c.ok===true);
  if(r.chOk)r.ch.used=true;
  $('#gaOut').innerHTML=verdictHtml(ok,ok?'Acesso liberado':'Acesso negado',ok?`${esc(r.nome||shortDid(r.holder))} pode ${r.fn?'usar '+esc(r.fn)+' em':'entrar em'} ${esc(r.app)}. Conferido em ${r.checks.length} pontos.`:'Veja abaixo o que não passou.')
    +`<div class="list glass flat mt">${r.checks.map(chkRow).join('')}</div>`;
  st.verifs++;
  await ato('verificacao',`Acesso ${ok?'liberado':'negado'}${r.fn?' a '+r.fn+' em':''}${r.app?(r.fn?' ':' a ')+r.app:''}${r.nome?' para '+r.nome:''}`,r.holder||null);
  // Registro estruturado para o relatório de uso: o app e a funcionalidade do desafio e o primeiro ponto que falhou.
  const e=st.book[st.book.length-1],falhou=r.checks.find(c=>c.ok!==true);
  (st.acessos=st.acessos||[]).push({n:e.n,at:e.at,ok,app:(r.ch&&r.ch.app)||r.app||'',fn:r.fn||'',motivo:ok?'':(falhou?falhou.label:'')});
  await save();
};

boot();
