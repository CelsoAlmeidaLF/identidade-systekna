/* ================= cofre (aba Identidade) ================= */
// Itens do tipo "cofre", cada um cifrado com a chave da carteira (AAD = id), como as credenciais. Só guarda: nada é
// gerado nem enviado. Tipos (kind): senha, anotação, cartão (crédito, débito ou outros) e conta bancária.
// Os campos marcados como segredo ficam velados na tela e são copiados sem aparecer.
const COFRE={
  senha:{nome:'Senha',ic:'key',campos:[['site','Site ou app'],['usuario','Usuário ou e-mail'],['senha','Senha',{seg:1}],['nota','Anotação',{area:1}]]},
  anotacao:{nome:'Anotação',ic:'note',campos:[['texto','Texto',{area:1,linhas:8}]]},
  cartao:{nome:'Cartão',ic:'wallet',campos:[['tipo','Tipo',{opcoes:['Crédito','Débito','Crédito e débito','Outro (plano de saúde, fidelidade…)']}],
    ['nomeCartao','Nome no cartão'],['numero','Número',{seg:1,num:1}],['validade','Validade (MM/AA)'],['cvv','Código de segurança (CVV)',{seg:1,num:1}],['nota','Anotação',{area:1}]]},
  conta:{nome:'Conta bancária',ic:'home',campos:[['banco','Banco'],['agencia','Agência',{num:1}],['conta','Conta',{num:1}],
    ['tipoConta','Tipo',{opcoes:['Corrente','Poupança','Pagamento','Salário']}],['titular','Titular'],['pix','Chave Pix'],['nota','Anotação',{area:1}]]},
};
const cofreItens=()=>ses.items.filter(i=>i.data.type==='cofre');
const soDig=s=>String(s||'').replace(/\D/g,'');
// Elo vem antes porque alguns cartões Elo começam com 4 ou 5.
const ELO=/^(4011|4312|4389|4514|4576|5041|5066|5067|509|6277|6362|6363|650|6516|6550)/;
const bandeiraDe=n=>{const d=soDig(n);return ELO.test(d)?'Elo':/^(606282|3841)/.test(d)?'Hipercard':/^4/.test(d)?'Visa':/^(5[1-5]|2[2-7])/.test(d)?'Mastercard':/^3[47]/.test(d)?'American Express':''};
const luhn=n=>{const d=soDig(n);if(d.length<12||d.length>19)return false;let s=0;for(let i=0;i<d.length;i++){let x=+d[d.length-1-i];if(i%2){x*=2;if(x>9)x-=9}s+=x}return s%10===0};
const finalCartao=n=>{const d=soDig(n);return d?'•••• '+d.slice(-4):''};
function resumoCofre(d){
  const c=d.campos||{};
  if(d.kind==='senha')return c.usuario||c.site||'Senha';
  if(d.kind==='anotacao')return(c.texto||'').split('\n')[0].slice(0,60)||'Anotação';
  if(d.kind==='cartao')return[c.tipo&&c.tipo.split(' (')[0],bandeiraDe(c.numero),finalCartao(c.numero)].filter(Boolean).join(' · ')||'Cartão';
  if(d.kind==='conta')return[c.banco,c.agencia&&`ag. ${c.agencia}`,c.conta&&`conta ${c.conta}`].filter(Boolean).join(' · ')||'Conta bancária';
  return '';
}
let cofreBusca='';
function renderCofre(){
  const box=$('#cfL');if(!box||!ses)return;
  const q=fold(cofreBusca),todos=cofreItens().sort((a,b)=>fold(a.data.titulo).localeCompare(fold(b.data.titulo)));
  // A busca olha o título e os campos que não são segredo.
  const casa=it=>{const t=COFRE[it.data.kind];return fold([it.data.titulo,t?t.nome:'',...(t?t.campos:[]).filter(c=>!(c[2]&&c[2].seg)).map(c=>(it.data.campos||{})[c[0]])].join(' ')).includes(q)};
  const lista=q?todos.filter(casa):todos;
  $('#cfN').textContent=todos.length?`${todos.length} ${todos.length===1?'item':'itens'}`:'';
  box.innerHTML=lista.length?lista.map(it=>{const t=COFRE[it.data.kind]||{nome:'Item',ic:'vault'};
    return `<button class="tx" data-cf="${esc(it.rec.id)}"><span class="dot">${ic(t.ic)}</span><span class="t"><b>${esc(it.data.titulo||t.nome)}</b><small>${esc(t.nome)} · ${esc(resumoCofre(it.data))}</small></span>${ic('chev')}</button>`}).join('')
    :`<div class="empty">${todos.length?'Nada encontrado.':'Cofre vazio. Toque em Novo item para guardar senhas, anotações, cartões e contas.'}</div>`;
}
$('#cfBusca').oninput=()=>{cofreBusca=$('#cfBusca').value;renderCofre()};
$('#cfNovo').onclick=()=>editarCofre();
$('#cfL').onclick=e=>{const b=e.target.closest('[data-cf]');if(b)verCofre(b.dataset.cf)};
// Copia um segredo sem mostrar e tenta limpar a área de transferência depois de 30 s.
async function copiarSegredo(v,rotulo){
  await copy(v,`${rotulo} copiado. Sai da área de transferência em 30 s`);
  setTimeout(()=>{try{navigator.clipboard.writeText('').catch(()=>{})}catch{}},30000);
}
function verCofre(id){
  const it=ses.items.find(i=>i.rec.id===id);if(!it)return;
  const d=it.data,t=COFRE[d.kind],c=d.campos||{};
  const linhas=t.campos.filter(([k])=>c[k]).map(([k,rot,o={}])=>{
    const v=String(c[k]),mostra=o.seg?(k==='numero'?finalCartao(v):'••••••'):v;
    return `<div class="kr"><div class="h"><small>${esc(rot)}</small><span>${o.seg?`<button class="mini sm" data-ver="${k}" aria-label="Mostrar ${esc(rot)}" data-ic="eye"></button> `:''}<button class="mini sm" data-cp="${k}" aria-label="Copiar ${esc(rot)}" data-ic="copy"></button></span></div><div class="v${o.seg||o.num?' mono':''}" id="cfv-${k}" style="white-space:pre-wrap">${esc(mostra)}</div></div>`}).join('');
  const extra=d.kind==='cartao'&&bandeiraDe(c.numero)?`<div class="kr"><div class="h"><small>Bandeira</small></div><div class="v">${esc(bandeiraDe(c.numero))}</div></div>`:'';
  openSheet(`<div class="dhead"><span class="dot">${ic(t.ic)}</span><div><h3>${esc(d.titulo||t.nome)}</h3><small>${esc(t.nome)} · atualizado em ${fmtDate(d.updated||d.created)}</small></div></div>
    <div class="list glass flat">${linhas+extra||'<div class="empty">Sem campos preenchidos.</div>'}</div>
    <div class="pair mt"><button class="btn ghost" id="cfEd">Editar</button><button class="btn ghost" id="cfDel" style="color:var(--out)">Apagar</button></div>`);
  $('#sheetBody').onclick=async e=>{
    const cp=e.target.closest('[data-cp]'),vr=e.target.closest('[data-ver]');
    if(cp){const k=cp.dataset.cp,o=(t.campos.find(x=>x[0]===k)||[])[2]||{},rot=t.campos.find(x=>x[0]===k)[1];o.seg?copiarSegredo(String(c[k]),rot):copy(String(c[k]),`${rot} copiado`)}
    if(vr){const k=vr.dataset.ver,el=$('#cfv-'+k),aberto=el.dataset.aberto==='1';
      el.textContent=aberto?(k==='numero'?finalCartao(c[k]):'••••••'):(k==='numero'?soDig(c[k]).replace(/(\d{4})(?=\d)/g,'$1 '):String(c[k]));el.dataset.aberto=aberto?'':'1'}
  };
  $('#cfEd').onclick=()=>editarCofre(id);
  $('#cfDel').onclick=async()=>{
    if(!await confirmSheet('Apagar do cofre',`${esc(d.titulo||t.nome)} sai deste aparelho. Se estiver num backup antigo, volta ao restaurar.`,'Apagar',true))return verCofre(id);
    ses.items=ses.items.filter(i=>i.rec.id!==id);await persistItems();renderCofre();toast('Item apagado');
  };
}
function editarCofre(id){
  const it=id&&ses.items.find(i=>i.rec.id===id),d=it?it.data:null;
  let kind=d?d.kind:'senha';
  const campo=([k,rot,o={}],v='')=>o.opcoes?`<label class="f"><span>${esc(rot)}</span><select data-k="${k}">${o.opcoes.map(x=>`<option${x===v?' selected':''}>${esc(x)}</option>`).join('')}</select></label>`
    :o.area?`<label class="f"><span>${esc(rot)}</span><textarea data-k="${k}" rows="${o.linhas||3}" autocomplete="off">${esc(v)}</textarea></label>`
    :`<label class="f" data-f="${k}"><span>${esc(rot)}</span><input data-k="${k}" value="${esc(v)}" autocomplete="off" autocapitalize="none" spellcheck="false"${o.seg?' type="password"':''}${o.num?' inputmode="numeric"':''}${o.seg?' class="mono"':''}></label>`;
  const desenha=()=>{$('#cfCampos').innerHTML=COFRE[kind].campos.map(c=>campo(c,d&&d.kind===kind?(d.campos||{})[c[0]]||'':'')).join('')};
  const kinds=Object.keys(COFRE);
  openSheet(`<h3>${d?'Editar item':'Novo item no cofre'}</h3><p class="sub">Fica cifrado neste aparelho e volta pelo backup. Ninguém mais vê.</p>
    ${d?'':`<div class="seg" id="cfKind" style="--n:${kinds.length}"><span class="ind"></span>${kinds.map((k,i)=>`<button aria-pressed="${i===0}" data-kind="${k}">${k==='conta'?'Conta':COFRE[k].nome}</button>`).join('')}</div>`}
    <label class="f" id="cfTF" style="margin-top:0"><span>Título</span><input id="cfT" value="${esc(d?d.titulo:'')}" autocomplete="off" placeholder="Ex.: E-mail pessoal, Cartão Nubank, Conta do Itaú"></label>
    <div id="cfCampos"></div><p class="hint" id="cfH"></p>
    <button class="btn" id="cfSalvar">Salvar</button>`);
  desenha();
  if(!d)wireSeg($('#cfKind'),b=>{kind=b.dataset.kind;desenha()});
  $('#cfSalvar').onclick=async()=>{
    const H=$('#cfH'),fail=(m,el)=>{H.textContent=m;H.classList.add('bad');if(el)shake(el)};
    const titulo=$('#cfT').value.trim();
    if(!titulo)return fail('Dê um título ao item.',$('#cfTF'));
    const campos={};document.querySelectorAll('#cfCampos [data-k]').forEach(el=>{const v=el.value.trim();if(v)campos[el.dataset.k]=v});
    if(kind==='cartao'&&campos.numero&&!/^Outro/.test(campos.tipo||'')&&!luhn(campos.numero))return fail('O número do cartão não confere. Confira os dígitos.',document.querySelector('[data-f="numero"]'));
    if(kind==='cartao'&&campos.validade&&!/^(0[1-9]|1[0-2])\/\d{2}$/.test(campos.validade))return fail('Validade no formato MM/AA, por exemplo 08/29.',document.querySelector('[data-f="validade"]'));
    if(!Object.keys(campos).length)return fail('Preencha ao menos um campo.');
    const ts=Date.now();
    await saveItem({type:'cofre',kind,titulo,campos,created:d?d.created:ts,updated:ts},id);
    closeSheet();renderCofre();toast(d?'Item atualizado':'Guardado no cofre');
  };
}
