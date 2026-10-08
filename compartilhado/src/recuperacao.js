/* ================= código de recuperação ================= */
// O código é a mesma entropia das 12 palavras, escrita de forma curta: quem tem um tem o outro.
// 20 bytes = versão e idioma (1) + entropia (16) + conferência (3, do SHA-256 dos 17 primeiros),
// em 32 caracteres de um alfabeto sem 0, 1, O e I, depois de "STK1".
// O idioma vai junto porque as palavras em português e em inglês geram sementes diferentes.
const REC_ALF='23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
async function entropyToCode(ent,lang){
  const p=new Uint8Array(20);
  p[0]=0x10|(lang==='en'?1:0);p.set(ent,1);p.set((await sha256(p.slice(0,17))).slice(0,3),17);
  let bits='';for(const b of p)bits+=b.toString(2).padStart(8,'0');
  let s='';for(let i=0;i<160;i+=5)s+=REC_ALF[parseInt(bits.slice(i,i+5),2)];
  return 'STK1-'+s.match(/.{4}/g).join('-');
}
const limpaCodigo=t=>String(t||'').toUpperCase().replace(/[\s-]/g,'').replace(/^STK1/,'');
// Texto com cara de código: começa com STK1 ou são 32 letras e números do alfabeto, com ou sem separadores.
const isRecCode=t=>/^\s*stk1/i.test(t)||/^[2-9a-hj-np-z]{32}$/i.test(String(t||'').replace(/[\s-]/g,''));
async function codeToEntropy(t){
  const s=limpaCodigo(t);
  if(s.length!==32)throw{code:'codeLen',n:s.length};
  const bad=[...s].filter(c=>!REC_ALF.includes(c));
  if(bad.length)throw{code:'codeChar',bad:[...new Set(bad)]};
  let bits='';for(const c of s)bits+=REC_ALF.indexOf(c).toString(2).padStart(5,'0');
  const p=new Uint8Array(20);for(let i=0;i<20;i++)p[i]=parseInt(bits.slice(i*8,i*8+8),2);
  const h=await sha256(p.slice(0,17));
  if(p[0]>>4!==1||(p[0]&15)>1||h[0]!==p[17]||h[1]!==p[18]||h[2]!==p[19])throw{code:'codeSum'};
  return{ent:p.slice(1,17),lang:p[0]&1?'en':'pt'};
}

/* ================= QR code ================= */
// Modo byte, correção M, versões 1 a 9 (até 180 bytes): o código de recuperação cabe na versão 3.
// Segue a norma ISO/IEC 18004; devolve a matriz de módulos (true = escuro), sem a margem.
function qrMatrix(text){
  const data=te.encode(text);
  const ECC=[0,10,16,26,18,24,16,18,22,22],BLK=[0,1,1,1,2,2,4,4,4,5];
  const raw=v=>{let r=(16*v+128)*v+64;if(v>=2){const n=Math.floor(v/7)+2;r-=(25*n-10)*n-55;if(v>=7)r-=36}return r};
  let ver=1;
  while(ver<=9&&Math.floor(raw(ver)/8)-ECC[ver]*BLK[ver]<data.length+2)ver++;
  if(ver>9)throw new Error('Texto grande demais para o QR code');
  const size=ver*4+17,total=Math.floor(raw(ver)/8),cap=total-ECC[ver]*BLK[ver];
  // Dados: modo 0100, tamanho em 8 bits, bytes, terminador e preenchimento.
  const bb=[];const put=(v,n)=>{for(let i=n-1;i>=0;i--)bb.push(v>>>i&1)};
  put(4,4);put(data.length,8);for(const b of data)put(b,8);
  put(0,Math.min(4,cap*8-bb.length));while(bb.length%8)bb.push(0);
  const cw=[];for(let i=0;i<bb.length;i+=8)cw.push(parseInt(bb.slice(i,i+8).join(''),2));
  for(let p=0xEC;cw.length<cap;p^=0xEC^0x11)cw.push(p);
  // Reed-Solomon em GF(256), polinômio 0x11D.
  const mul=(x,y)=>{let z=0;for(let i=7;i>=0;i--){z=(z<<1)^((z>>>7)*0x11D);z^=(y>>>i&1)*x}return z};
  const eccLen=ECC[ver],div=new Array(eccLen).fill(0);div[eccLen-1]=1;
  for(let i=0,root=1;i<eccLen;i++){for(let j=0;j<eccLen;j++){div[j]=mul(div[j],root);if(j+1<eccLen)div[j]^=div[j+1]}root=mul(root,2)}
  const rem=d=>{const r=new Array(eccLen).fill(0);for(const b of d){const f=b^r.shift();r.push(0);div.forEach((c,i)=>r[i]^=mul(c,f))}return r};
  // Blocos e intercalação.
  const nb=BLK[ver],nShort=nb-total%nb,shortLen=Math.floor(total/nb),blocks=[];
  for(let i=0,k=0;i<nb;i++){const d=cw.slice(k,k+shortLen-eccLen+(i<nShort?0:1));k+=d.length;const e=rem(d);if(i<nShort)d.push(null);blocks.push(d.concat(e))}
  const all=[];for(let i=0;i<blocks[0].length;i++)blocks.forEach(b=>{if(b[i]!==null)all.push(b[i])});
  // Padrões fixos.
  const M=[...Array(size)].map(()=>new Array(size).fill(false)),F=[...Array(size)].map(()=>new Array(size).fill(false));
  const set=(x,y,v)=>{M[y][x]=v;F[y][x]=true};
  for(let i=0;i<size;i++){set(6,i,i%2===0);set(i,6,i%2===0)}
  const finder=(cx,cy)=>{for(let dy=-4;dy<=4;dy++)for(let dx=-4;dx<=4;dx++){const d=Math.max(Math.abs(dx),Math.abs(dy)),x=cx+dx,y=cy+dy;if(x>=0&&x<size&&y>=0&&y<size)set(x,y,d!==2&&d!==4)}};
  finder(3,3);finder(size-4,3);finder(3,size-4);
  if(ver>1){
    const n=Math.floor(ver/7)+2,step=Math.ceil((ver*4+4)/(n*2-2))*2,pos=[6];
    for(let p=size-7;pos.length<n;p-=step)pos.splice(1,0,p);
    pos.forEach((x,i)=>pos.forEach((y,j)=>{if(!(i===0&&j===0||i===0&&j===n-1||i===n-1&&j===0))
      for(let dy=-2;dy<=2;dy++)for(let dx=-2;dx<=2;dx++)set(x+dx,y+dy,Math.max(Math.abs(dx),Math.abs(dy))!==1)}));
  }
  const format=mask=>{
    const d=mask;let r=d;for(let i=0;i<10;i++)r=(r<<1)^((r>>>9)*0x537);
    const bits=(d<<10|r)^0x5412,b=i=>(bits>>>i&1)===1;
    for(let i=0;i<=5;i++)set(8,i,b(i));
    set(8,7,b(6));set(8,8,b(7));set(7,8,b(8));
    for(let i=9;i<15;i++)set(14-i,8,b(i));
    for(let i=0;i<8;i++)set(size-1-i,8,b(i));
    for(let i=8;i<15;i++)set(8,size-15+i,b(i));
    set(8,size-8,true);
  };
  format(0);
  if(ver>=7){
    let r=ver;for(let i=0;i<12;i++)r=(r<<1)^((r>>>11)*0x1F25);
    const bits=ver<<12|r;
    for(let i=0;i<18;i++){const v=(bits>>>i&1)===1,a=size-11+i%3,b=Math.floor(i/3);set(a,b,v);set(b,a,v)}
  }
  // Dados em zigue-zague, de baixo para cima, duas colunas por vez.
  let i=0;
  for(let right=size-1;right>=1;right-=2){
    if(right===6)right=5;
    for(let v=0;v<size;v++)for(let j=0;j<2;j++){
      const x=right-j,y=((right+1)&2)===0?size-1-v:v;
      if(!F[y][x]&&i<all.length*8){M[y][x]=(all[i>>>3]>>>(7-(i&7))&1)===1;i++}
    }
  }
  // Máscara: escolhe a de menor penalidade (regras N1 a N4 da norma).
  const MASK=[(x,y)=>(x+y)%2===0,(x,y)=>y%2===0,x=>x%3===0,(x,y)=>(x+y)%3===0,(x,y)=>(Math.floor(x/3)+Math.floor(y/2))%2===0,
    (x,y)=>x*y%2+x*y%3===0,(x,y)=>(x*y%2+x*y%3)%2===0,(x,y)=>((x+y)%2+x*y%3)%2===0];
  const applyMask=m=>{for(let y=0;y<size;y++)for(let x=0;x<size;x++)if(!F[y][x]&&MASK[m](x,y))M[y][x]=!M[y][x]};
  const penalty=()=>{
    let p=0,dark=0;
    const line=get=>{
      let run=1;
      for(let k=1;k<=size;k++){if(k<size&&get(k)===get(k-1))run++;else{if(run>=5)p+=run-2;run=1}}
      const s=[];for(let k=0;k<size;k++)s.push(get(k)?1:0);
      const t='0000'+s.join('')+'0000';
      for(const pat of['00001011101','10111010000'])for(let k=t.indexOf(pat);k>=0;k=t.indexOf(pat,k+1))p+=40;
    };
    for(let y=0;y<size;y++)line(x=>M[y][x]);
    for(let x=0;x<size;x++)line(y=>M[y][x]);
    for(let y=0;y<size-1;y++)for(let x=0;x<size-1;x++){const c=M[y][x];if(c===M[y][x+1]&&c===M[y+1][x]&&c===M[y+1][x+1])p+=3}
    for(const r of M)for(const c of r)if(c)dark++;
    return p+Math.floor(Math.abs(dark*20-size*size*10)/(size*size))*10;
  };
  let best=0,min=Infinity;
  for(let m=0;m<8;m++){applyMask(m);format(m);const p=penalty();if(p<min){min=p;best=m}applyMask(m)}
  applyMask(best);format(best);
  return M;
}

/* ================= PDF de recuperação ================= */
// PDF 1.4 de uma página A4, escrito à mão: fontes padrão (Helvetica e Courier, WinAnsi) e o QR em retângulos.
function recoveryPdf({app,did,code,words,date}){
  const esc=s=>s.replace(/[\\()]/g,m=>'\\'+m);
  const txt=(font,size,x,y,s)=>`BT /${font} ${size} Tf ${x} ${y} Td (${esc(s)}) Tj ET\n`;
  let c='';
  c+=txt('F2',20,56,780,`Recuperação · ${app}`);
  c+=txt('F1',10,56,762,`Gerado em ${date}. Sistema de Identidade Soberana Systekna.`);
  c+=txt('F1',9,56,746,'DID:');c+=txt('F3',8,78,746,did);
  // QR com margem de 4 módulos, centralizado.
  const M=qrMatrix(code),n=M.length,side=200,mod=side/(n+8),x0=(595-side)/2,yTop=725;
  c+='0 0 0 rg\n';
  M.forEach((row,y)=>row.forEach((on,x)=>{if(on)c+=`${(x0+(x+4)*mod).toFixed(3)} ${(yTop-(y+5)*mod).toFixed(3)} ${mod.toFixed(3)} ${mod.toFixed(3)} re f\n`}));
  let y=yTop-side-26;
  c+=txt('F2',12,56,y,'Código de recuperação');
  c+=txt('F4',15,56,y-22,code);
  y-=62;
  c+=txt('F2',12,56,y,'As 12 palavras');
  words.forEach((w,i)=>{c+=txt('F3',13,i<6?72:310,y-24-(i%6)*20,`${String(i+1).padStart(2,' ')}. ${w}`)});
  y-=24+6*20+16;
  ['Atenção: quem tiver este papel ou este arquivo controla esta conta.',
   'O código e as 12 palavras são equivalentes: qualquer um dos dois recupera a conta.',
   'Imprima, guarde em lugar seguro e apague o arquivo do aparelho, do e-mail e da nuvem.',
   'Para recuperar: abra o app, toque em Recuperar e digite o código ou as 12 palavras,',
   'ou leia o QR code com a câmera.']
    .forEach((l,i)=>{c+=txt(i?'F1':'F2',10,56,y-i*15,l)});
  const fonts=['Helvetica','Helvetica-Bold','Courier','Courier-Bold'];
  const objs=['<< /Type /Catalog /Pages 2 0 R >>','<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << ${fonts.map((_,i)=>`/F${i+1} ${5+i} 0 R`).join(' ')} >> >> /Contents 4 0 R >>`,
    `<< /Length ${c.length} >>\nstream\n${c}endstream`,
    ...fonts.map(f=>`<< /Type /Font /Subtype /Type1 /BaseFont /${f} /Encoding /WinAnsiEncoding >>`),
    `<< /Title (${esc(`Recuperação · ${app}`)}) /Producer (Systekna) >>`];
  let pdf='%PDF-1.4\n%\xE2\xE3\xCF\xD3\n';const off=[];
  objs.forEach((o,i)=>{off.push(pdf.length);pdf+=`${i+1} 0 obj\n${o}\nendobj\n`});
  const xref=pdf.length;
  pdf+=`xref\n0 ${objs.length+1}\n0000000000 65535 f \n${off.map(o=>String(o).padStart(10,'0')+' 00000 n \n').join('')}`;
  pdf+=`trailer\n<< /Size ${objs.length+1} /Root 1 0 R /Info ${objs.length} 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
  // Cada caractere vira um byte (Latin-1, que coincide com o WinAnsi nos acentos do português).
  const out=new Uint8Array(pdf.length);
  for(let i=0;i<pdf.length;i++){const k=pdf.charCodeAt(i);if(k>255)throw new Error('Caractere fora do Latin-1 no PDF');out[i]=k}
  return out;
}
async function saveRecoveryPdf(ent,lang,did){
  const words=await entropyToWords(ent,lang),code=await entropyToCode(ent,lang);
  const d=new Date(),date=d.toLocaleDateString('pt-BR'),iso=d.toISOString().slice(0,10);
  const bytes=recoveryPdf({app:APP.label,did,code,words,date});
  const url=URL.createObjectURL(new Blob([bytes],{type:'application/pdf'}));
  const a=document.createElement('a');a.href=url;a.download=`recuperacao-${fold(APP.label)}-${iso}.pdf`;
  document.body.appendChild(a);a.click();a.remove();
  setTimeout(()=>URL.revokeObjectURL(url),60000);
  words.fill('');
}

/* ================= leitura do QR pela câmera ================= */
// Só onde o navegador lê QR (BarcodeDetector, como o Chrome do Android). Nos outros, a câmera do aparelho lê e a pessoa cola.
const qrReaderOn=()=>'BarcodeDetector' in window&&!!(navigator.mediaDevices&&navigator.mediaDevices.getUserMedia);
async function scanQr(){
  let stream;
  try{stream=await navigator.mediaDevices.getUserMedia({video:{facingMode:'environment'}})}
  catch{toast('Sem acesso à câmera. Leia o QR com a câmera do aparelho e cole o código.',true);return null}
  return new Promise(res=>{
    let done=false;
    const stop=v=>{if(done)return;done=true;stream.getTracks().forEach(t=>t.stop());res(v)};
    openSheet(`<h3>Ler QR code</h3><p class="sub">Aponte a câmera para o QR code do PDF de recuperação.</p><video id="qrVid" playsinline muted style="width:100%;border-radius:14px;background:#000"></video><button class="btn ghost" id="qrStop">Cancelar</button>`,()=>stop(null));
    const v=$('#qrVid');v.srcObject=stream;v.play().catch(()=>{});
    $('#qrStop').onclick=()=>closeSheet();
    const det=new BarcodeDetector({formats:['qr_code']});
    const tick=async()=>{
      if(done)return;
      try{const r=await det.detect(v);const hit=r.find(x=>isRecCode(x.rawValue));if(hit){sheetClose=null;closeSheet();return stop(hit.rawValue)}}catch{}
      setTimeout(tick,300);
    };
    tick();
  });
}
