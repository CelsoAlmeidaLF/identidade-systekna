/* ================= cofre (aba Identidade) ================= */
// Anotações de texto, cada uma cifrada com a chave da carteira (tipo "cofre", AAD = id), como as credenciais.
// Desde a 0.28 o cofre guarda só anotações (título e texto). Itens de outros tipos criados na 0.26 e na 0.27
// (senha, cartão, conta, documento) ficam intactos no aparelho e no backup, mas não aparecem.
const cofreItens=()=>ses.items.filter(i=>i.data.type==='cofre'&&i.data.kind==='anotacao');
const textoDe=d=>(d.campos&&d.campos.texto)||'';
let cofreBusca='';
function renderCofre(){
  const box=$('#cfL');if(!box||!ses)return;
  const q=fold(cofreBusca),todos=cofreItens().sort((a,b)=>(b.data.updated||0)-(a.data.updated||0));
  const lista=q?todos.filter(it=>fold(`${it.data.titulo} ${textoDe(it.data)}`).includes(q)):todos;
  $('#cfN').textContent=todos.length?`${todos.length} ${todos.length===1?'anotação':'anotações'}`:'';
  box.innerHTML=lista.length?lista.map(it=>`<button class="tx" data-cf="${esc(it.rec.id)}"><span class="dot">${ic('note')}</span><span class="t"><b>${esc(it.data.titulo)}</b><small>${esc(textoDe(it.data).split('\n')[0].slice(0,70)||'Sem texto')}</small></span>${ic('chev')}</button>`).join('')
    :`<div class="empty">${todos.length?'Nada encontrado.':'Cofre vazio. Toque em Nova anotação para guardar um texto cifrado.'}</div>`;
}
$('#cfBusca').oninput=()=>{cofreBusca=$('#cfBusca').value;renderCofre()};
$('#cfNovo').onclick=()=>editarCofre();
$('#cfL').onclick=e=>{const b=e.target.closest('[data-cf]');if(b)verCofre(b.dataset.cf)};
function verCofre(id){
  const it=ses.items.find(i=>i.rec.id===id);if(!it)return;
  const d=it.data;
  openSheet(`<div class="dhead"><span class="dot">${ic('note')}</span><div><h3>${esc(d.titulo)}</h3><small>Anotação · atualizada em ${fmtDate(d.updated||d.created)}</small></div></div>
    <div class="list glass flat"><div class="kr"><div class="h"><small>Texto</small><span><button class="mini sm" id="cfCp" aria-label="Copiar texto" data-ic="copy"></button></span></div><div class="v" id="cfTexto" style="white-space:pre-wrap">${esc(textoDe(d))}</div></div></div>
    <div class="pair mt"><button class="btn ghost" id="cfEd">Editar</button><button class="btn ghost" id="cfDel" style="color:var(--out)">Apagar</button></div>`);
  $('#cfCp').onclick=()=>copy(textoDe(d),'Texto copiado');
  $('#cfEd').onclick=()=>editarCofre(id);
  $('#cfDel').onclick=async()=>{
    if(!await confirmSheet('Apagar anotação',`${esc(d.titulo)} sai deste aparelho. Se estiver num backup antigo, volta ao restaurar.`,'Apagar',true))return verCofre(id);
    ses.items=ses.items.filter(i=>i.rec.id!==id);await persistItems();renderCofre();toast('Anotação apagada');
  };
}
function editarCofre(id){
  const it=id&&ses.items.find(i=>i.rec.id===id),d=it?it.data:null;
  openSheet(`<h3>${d?'Editar anotação':'Nova anotação'}</h3><p class="sub">Fica cifrada neste aparelho e volta pelo backup. Ninguém mais vê.</p>
    <label class="f" id="cfTF" style="margin-top:0"><span>Título</span><input id="cfT" value="${esc(d?d.titulo:'')}" autocomplete="off" placeholder="Ex.: Lembretes, Ideias, Endereços"></label>
    <label class="f" id="cfXF"><span>Texto</span><textarea id="cfX" rows="10" autocomplete="off">${esc(d?textoDe(d):'')}</textarea></label>
    <p class="hint" id="cfH"></p>
    <button class="btn" id="cfSalvar">Salvar</button>`);
  $('#cfSalvar').onclick=async()=>{
    const H=$('#cfH'),fail=(m,el)=>{H.textContent=m;H.classList.add('bad');shake(el)};
    const titulo=$('#cfT').value.trim(),texto=$('#cfX').value.replace(/\s+$/,'');
    if(!titulo)return fail('Dê um título à anotação.',$('#cfTF'));
    if(!texto.trim())return fail('Escreva o texto da anotação.',$('#cfXF'));
    const ts=Date.now();
    await saveItem({type:'cofre',kind:'anotacao',titulo,campos:{texto},created:d?d.created:ts,updated:ts},id);
    closeSheet();renderCofre();toast(d?'Anotação atualizada':'Anotação guardada');
  };
}
