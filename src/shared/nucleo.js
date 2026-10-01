'use strict';
/* ================= ícones ================= */
const P={
 shield:'<path d="M12 3l7 3v5c0 4.5-3 8.3-7 10-4-1.7-7-5.5-7-10V6z"/><path d="M9 12l2 2 4-4"/>',
 lock:'<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/>',
 key:'<circle cx="8" cy="15" r="4"/><path d="M11 12l9-9M17 6l3 3M15 8l2 2"/>',
 note:'<path d="M6 3h9l4 4v14H6z"/><path d="M14 3v5h5M9 13h7M9 17h5"/>',
 id:'<rect x="3" y="5" width="18" height="14" rx="2"/><circle cx="9" cy="12" r="2.5"/><path d="M14 10h4M14 14h4"/>',
 vault:'<rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="12" cy="12" r="3.5"/><path d="M12 8.5V7M12 17v-1.5M15.5 12H17M7 12h1.5"/>',
 people:'<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>',
 user:'<circle cx="12" cy="8" r="4"/><path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6"/>',
 badge:'<path d="M12 3l2.4 1.8 3-.2.9 2.9 2.4 1.8-1 2.8 1 2.8-2.4 1.8-.9 2.9-3-.2L12 21l-2.4-1.8-3 .2-.9-2.9-2.4-1.8 1-2.8-1-2.8 2.4-1.8.9-2.9 3 .2z"/><path d="M8.5 12l2.5 2.5 4.5-5"/>',
 sliders:'<path d="M4 6h10M18 6h2M4 12h4M12 12h8M4 18h12"/><circle cx="16" cy="6" r="2"/><circle cx="10" cy="12" r="2"/><circle cx="18" cy="18" r="2"/>',
 plus:'<path d="M12 5v14M5 12h14"/>',
 copy:'<rect x="9" y="9" width="11" height="11" rx="2"/><path d="M5 15V5a2 2 0 0 1 2-2h8"/>',
 eye:'<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
 bksp:'<path d="M21 5H9l-6 7 6 7h12z"/><path d="M12 9l6 6M18 9l-6 6"/>',
 clock:'<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
 restore:'<path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5"/>',
 trash:'<path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/>',
 check:'<path d="M5 12l5 5 9-10"/>',
 x:'<path d="M6 6l12 12M18 6L6 18"/>',
 chev:'<path d="M9 5l7 7-7 7"/>',
 minus:'<path d="M5 12h14"/>',
 stamp:'<path d="M9 3h6v4l-1 3h4a2 2 0 0 1 2 2v3H4v-3a2 2 0 0 1 2-2h4L9 7z"/><path d="M4 19h16"/>',
 book:'<path d="M5 4h11a3 3 0 0 1 3 3v13H8a3 3 0 0 1-3-3z"/><path d="M5 17a3 3 0 0 1 3-3h11"/>',
 file:'<path d="M6 3h8l5 5v13H6z"/><path d="M14 3v5h5"/>',
 inbox:'<path d="M3 13h5l1 3h6l1-3h5"/><path d="M5 5h14l2 8v6H3v-6z"/>',
 send:'<path d="M21 3L3 10l7 3 3 7z"/><path d="M10 13L21 3"/>',
 scan:'<path d="M4 8V5a1 1 0 0 1 1-1h3M16 4h3a1 1 0 0 1 1 1v3M20 16v3a1 1 0 0 1-1 1h-3M8 20H5a1 1 0 0 1-1-1v-3"/><path d="M8 12h8"/>',
 home:'<path d="M3 11l9-7 9 7"/><path d="M5 10v10h14V10"/>',
 wallet:'<rect x="3" y="6" width="18" height="14" rx="2"/><path d="M3 10h18M16 15h2"/><path d="M6 6l9-3 1 3"/>',
 gov:'<path d="M3.85 8.62a4 4 0 0 1 4.78-4.77 4 4 0 0 1 6.74 0 4 4 0 0 1 4.78 4.78 4 4 0 0 1 0 6.74 4 4 0 0 1-4.77 4.78 4 4 0 0 1-6.75 0 4 4 0 0 1-4.78-4.77 4 4 0 0 1 0-6.76Z"/><path d="M9 12l2 2 4-4"/>',
 mail:'<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 7l9 6 9-6"/>',
 alert:'<path d="M12 3l9 16H3z"/><path d="M12 10v4M12 17v.5"/>'
};
const ic=n=>`<svg class="i" viewBox="0 0 24 24" aria-hidden="true">${P[n]||''}</svg>`;
const paintIcons=(root=document)=>root.querySelectorAll('[data-ic]').forEach(e=>e.innerHTML=ic(e.dataset.ic));
paintIcons();

/* ================= utilidades ================= */
const $=s=>document.querySelector(s);
const S=crypto.subtle, te=new TextEncoder(), td=new TextDecoder();
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const rnd=n=>crypto.getRandomValues(new Uint8Array(n));
const cat=(...a)=>{const o=new Uint8Array(a.reduce((x,y)=>x+y.length,0));let p=0;for(const x of a){o.set(x,p);p+=x.length}return o};
const hexB=h=>new Uint8Array(h.match(/../g).map(x=>parseInt(x,16)));
const hex=b=>[...new Uint8Array(b)].map(x=>x.toString(16).padStart(2,'0')).join('');
const now=()=>Math.floor(Date.now()/1000);
const b64u={
  enc(b){b=new Uint8Array(b);let s='';for(let i=0;i<b.length;i+=0x8000)s+=String.fromCharCode.apply(null,b.subarray(i,i+0x8000));return btoa(s).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'')},
  dec(s){s=String(s).replace(/-/g,'+').replace(/_/g,'/');while(s.length%4)s+='=';const bin=atob(s),u=new Uint8Array(bin.length);for(let i=0;i<bin.length;i++)u[i]=bin.charCodeAt(i);return u}
};
const B58='123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
function b58enc(bytes){let z=0;while(z<bytes.length&&bytes[z]===0)z++;let n=0n;for(const b of bytes)n=n*256n+BigInt(b);let s='';while(n>0n){s=B58[Number(n%58n)]+s;n/=58n}return '1'.repeat(z)+s}
function b58dec(str){let n=0n;for(const c of str){const i=B58.indexOf(c);if(i<0)throw new Error('Caractere inválido em base58.');n=n*58n+BigInt(i)}const out=[];while(n>0n){out.unshift(Number(n%256n));n/=256n}let z=0;while(str[z]==='1')z++;return new Uint8Array([...new Array(z).fill(0),...out])}
const shortDid=d=>d?d.slice(0,15)+'…'+d.slice(-6):'';
const fmtDate=t=>new Date(t).toLocaleDateString('pt-BR',{day:'2-digit',month:'short',year:'numeric'});
const fmtTime=t=>new Date(t).toLocaleString('pt-BR',{day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit'});
const APP_VERSION='{{versao}}';
const store={get(k){try{return localStorage.getItem(APP.db+':'+k)}catch{return null}},set(k,v){try{localStorage.setItem(APP.db+':'+k,v)}catch{}}};
const fold=s=>String(s||'').normalize('NFKD').replace(/[\u0300-\u036f]/g,'').toLowerCase();

/* ================= armazenamento (IndexedDB) ================= */
const DB={
  _db:null,_mem:null,
  async db(){if(this._db)return this._db;this._db=await new Promise((res,rej)=>{const r=indexedDB.open(APP.db,1);r.onupgradeneeded=()=>r.result.createObjectStore('kv');r.onsuccess=()=>res(r.result);r.onerror=()=>rej(r.error)});return this._db},
  async tx(mode,fn){const d=await this.db();return new Promise((res,rej)=>{const t=d.transaction('kv',mode);const r=fn(t.objectStore('kv'));t.oncomplete=()=>res(r&&r.result);t.onerror=()=>rej(t.error)})},
  get(k){return this._mem?this._mem.get(k):this.tx('readonly',s=>s.get(k))},
  set(k,v){if(this._mem){this._mem.set(k,v);return}return this.tx('readwrite',s=>s.put(v,k))},
  del(k){if(this._mem){this._mem.delete(k);return}return this.tx('readwrite',s=>s.delete(k))},
  clear(){if(this._mem){this._mem.clear();return}return this.tx('readwrite',s=>s.clear())}
};

/* ================= BIP39 ================= */
const WORDS={pt:'abacate abaixo abalar abater abduzir abelha aberto abismo abotoar abranger abreviar abrigar abrupto absinto absoluto absurdo abutre acabado acalmar acampar acanhar acaso aceitar acelerar acenar acervo acessar acetona achatar acidez acima acionado acirrar aclamar aclive acolhida acomodar acoplar acordar acumular acusador adaptar adega adentro adepto adequar aderente adesivo adeus adiante aditivo adjetivo adjunto admirar adorar adquirir adubo adverso advogado aeronave afastar aferir afetivo afinador afivelar aflito afluente afrontar agachar agarrar agasalho agenciar agilizar agiota agitado agora agradar agreste agrupar aguardar agulha ajoelhar ajudar ajustar alameda alarme alastrar alavanca albergue albino alcatra aldeia alecrim alegria alertar alface alfinete algum alheio aliar alicate alienar alinhar aliviar almofada alocar alpiste alterar altitude alucinar alugar aluno alusivo alvo amaciar amador amarelo amassar ambas ambiente ameixa amenizar amido amistoso amizade amolador amontoar amoroso amostra amparar ampliar ampola anagrama analisar anarquia anatomia andaime anel anexo angular animar anjo anomalia anotado ansioso anterior anuidade anunciar anzol apagador apalpar apanhado apego apelido apertada apesar apetite apito aplauso aplicada apoio apontar aposta aprendiz aprovar aquecer arame aranha arara arcada ardente areia arejar arenito aresta argiloso argola arma arquivo arraial arrebate arriscar arroba arrumar arsenal arterial artigo arvoredo asfaltar asilado aspirar assador assinar assoalho assunto astral atacado atadura atalho atarefar atear atender aterro ateu atingir atirador ativo atoleiro atracar atrevido atriz atual atum auditor aumentar aura aurora autismo autoria autuar avaliar avante avaria avental avesso aviador avisar avulso axila azarar azedo azeite azulejo babar babosa bacalhau bacharel bacia bagagem baiano bailar baioneta bairro baixista bajular baleia baliza balsa banal bandeira banho banir banquete barato barbado baronesa barraca barulho baseado bastante batata batedor batida batom batucar baunilha beber beijo beirada beisebol beldade beleza belga beliscar bendito bengala benzer berimbau berlinda berro besouro bexiga bezerro bico bicudo bienal bifocal bifurcar bigorna bilhete bimestre bimotor biologia biombo biosfera bipolar birrento biscoito bisneto bispo bissexto bitola bizarro blindado bloco bloquear boato bobagem bocado bocejo bochecha boicotar bolada boletim bolha bolo bombeiro bonde boneco bonita borbulha borda boreal borracha bovino boxeador branco brasa braveza breu briga brilho brincar broa brochura bronzear broto bruxo bucha budismo bufar bule buraco busca busto buzina cabana cabelo cabide cabo cabrito cacau cacetada cachorro cacique cadastro cadeado cafezal caiaque caipira caixote cajado caju calafrio calcular caldeira calibrar calmante calota camada cambista camisa camomila campanha camuflar canavial cancelar caneta canguru canhoto canivete canoa cansado cantar canudo capacho capela capinar capotar capricho captador capuz caracol carbono cardeal careca carimbar carneiro carpete carreira cartaz carvalho casaco casca casebre castelo casulo catarata cativar caule causador cautelar cavalo caverna cebola cedilha cegonha celebrar celular cenoura censo centeio cercar cerrado certeiro cerveja cetim cevada chacota chaleira chamado chapada charme chatice chave chefe chegada cheiro cheque chicote chifre chinelo chocalho chover chumbo chutar chuva cicatriz ciclone cidade cidreira ciente cigana cimento cinto cinza ciranda circuito cirurgia citar clareza clero clicar clone clube coado coagir cobaia cobertor cobrar cocada coelho coentro coeso cogumelo coibir coifa coiote colar coleira colher colidir colmeia colono coluna comando combinar comentar comitiva comover complexo comum concha condor conectar confuso congelar conhecer conjugar consumir contrato convite cooperar copeiro copiador copo coquetel coragem cordial corneta coronha corporal correio cortejo coruja corvo cosseno costela cotonete couro couve covil cozinha cratera cravo creche credor creme crer crespo criada criminal crioulo crise criticar crosta crua cruzeiro cubano cueca cuidado cujo culatra culminar culpar cultura cumprir cunhado cupido curativo curral cursar curto cuspir custear cutelo damasco datar debater debitar deboche debulhar decalque decimal declive decote decretar dedal dedicado deduzir defesa defumar degelo degrau degustar deitado deixar delator delegado delinear delonga demanda demitir demolido dentista depenado depilar depois depressa depurar deriva derramar desafio desbotar descanso desenho desfiado desgaste desigual deslize desmamar desova despesa destaque desviar detalhar detentor detonar detrito deusa dever devido devotado dezena diagrama dialeto didata difuso digitar dilatado diluente diminuir dinastia dinheiro diocese direto discreta disfarce disparo disquete dissipar distante ditador diurno diverso divisor divulgar dizer dobrador dolorido domador dominado donativo donzela dormente dorsal dosagem dourado doutor drenagem drible drogaria duelar duende dueto duplo duquesa durante duvidoso eclodir ecoar ecologia edificar edital educado efeito efetivar ejetar elaborar eleger eleitor elenco elevador eliminar elogiar embargo embolado embrulho embutido emenda emergir emissor empatia empenho empinado empolgar emprego empurrar emulador encaixe encenado enchente encontro endeusar endossar enfaixar enfeite enfim engajado engenho englobar engomado engraxar enguia enjoar enlatar enquanto enraizar enrolado enrugar ensaio enseada ensino ensopado entanto enteado entidade entortar entrada entulho envergar enviado envolver enxame enxerto enxofre enxuto epiderme equipar ereto erguido errata erva ervilha esbanjar esbelto escama escola escrita escuta esfinge esfolar esfregar esfumado esgrima esmalte espanto espelho espiga esponja espreita espumar esquerda estaca esteira esticar estofado estrela estudo esvaziar etanol etiqueta euforia europeu evacuar evaporar evasivo eventual evidente evoluir exagero exalar examinar exato exausto excesso excitar exclamar executar exemplo exibir exigente exonerar expandir expelir expirar explanar exposto expresso expulsar externo extinto extrato fabricar fabuloso faceta facial fada fadiga faixa falar falta familiar fandango fanfarra fantoche fardado farelo farinha farofa farpa fartura fatia fator favorita faxina fazenda fechado feijoada feirante felino feminino fenda feno fera feriado ferrugem ferver festejar fetal feudal fiapo fibrose ficar ficheiro figurado fileira filho filme filtrar firmeza fisgada fissura fita fivela fixador fixo flacidez flamingo flanela flechada flora flutuar fluxo focal focinho fofocar fogo foguete foice folgado folheto forjar formiga forno forte fosco fossa fragata fralda frango frasco fraterno freira frente fretar frieza friso fritura fronha frustrar fruteira fugir fulano fuligem fundar fungo funil furador furioso futebol gabarito gabinete gado gaiato gaiola gaivota galega galho galinha galocha ganhar garagem garfo gargalo garimpo garoupa garrafa gasoduto gasto gata gatilho gaveta gazela gelado geleia gelo gemada gemer gemido generoso gengiva genial genoma genro geologia gerador germinar gesso gestor ginasta gincana gingado girafa girino glacial glicose global glorioso goela goiaba golfe golpear gordura gorjeta gorro gostoso goteira governar gracejo gradual grafite gralha grampo granada gratuito graveto graxa grego grelhar greve grilo grisalho gritaria grosso grotesco grudado grunhido gruta guache guarani guaxinim guerrear guiar guincho guisado gula guloso guru habitar harmonia haste haver hectare herdar heresia hesitar hiato hibernar hidratar hiena hino hipismo hipnose hipoteca hoje holofote homem honesto honrado hormonal hospedar humorado iate ideia idoso ignorado igreja iguana ileso ilha iludido iluminar ilustrar imagem imediato imenso imersivo iminente imitador imortal impacto impedir implante impor imprensa impune imunizar inalador inapto inativo incenso inchar incidir incluir incolor indeciso indireto indutor ineficaz inerente infantil infestar infinito inflamar informal infrator ingerir inibido inicial inimigo injetar inocente inodoro inovador inox inquieto inscrito inseto insistir inspetor instalar insulto intacto integral intimar intocado intriga invasor inverno invicto invocar iogurte iraniano ironizar irreal irritado isca isento isolado isqueiro italiano janeiro jangada janta jararaca jardim jarro jasmim jato javali jazida jejum joaninha joelhada jogador joia jornal jorrar jovem juba judeu judoca juiz julgador julho jurado jurista juro justa labareda laboral lacre lactante ladrilho lagarta lagoa laje lamber lamentar laminar lampejo lanche lapidar lapso laranja lareira largura lasanha lastro lateral latido lavanda lavoura lavrador laxante lazer lealdade lebre legado legendar legista leigo leiloar leitura lembrete leme lenhador lentilha leoa lesma leste letivo letreiro levar leveza levitar liberal libido liderar ligar ligeiro limitar limoeiro limpador linda linear linhagem liquidez listagem lisura litoral livro lixa lixeira locador locutor lojista lombo lona longe lontra lorde lotado loteria loucura lousa louvar luar lucidez lucro luneta lustre lutador luva macaco macete machado macio madeira madrinha magnata magreza maior mais malandro malha malote maluco mamilo mamoeiro mamute manada mancha mandato manequim manhoso manivela manobrar mansa manter manusear mapeado maquinar marcador maresia marfim margem marinho marmita maroto marquise marreco martelo marujo mascote masmorra massagem mastigar matagal materno matinal matutar maxilar medalha medida medusa megafone meiga melancia melhor membro memorial menino menos mensagem mental merecer mergulho mesada mesclar mesmo mesquita mestre metade meteoro metragem mexer mexicano micro migalha migrar milagre milenar milhar mimado minerar minhoca ministro minoria miolo mirante mirtilo misturar mocidade moderno modular moeda moer moinho moita moldura moleza molho molinete molusco montanha moqueca morango morcego mordomo morena mosaico mosquete mostarda motel motim moto motriz muda muito mulata mulher multar mundial munido muralha murcho muscular museu musical nacional nadador naja namoro narina narrado nascer nativa natureza navalha navegar navio neblina nebuloso negativa negociar negrito nervoso neta neural nevasca nevoeiro ninar ninho nitidez nivelar nobreza noite noiva nomear nominal nordeste nortear notar noticiar noturno novelo novilho novo nublado nudez numeral nupcial nutrir nuvem obcecado obedecer objetivo obrigado obscuro obstetra obter obturar ocidente ocioso ocorrer oculista ocupado ofegante ofensiva oferenda oficina ofuscado ogiva olaria oleoso olhar oliveira ombro omelete omisso omitir ondulado oneroso ontem opcional operador oponente oportuno oposto orar orbitar ordem ordinal orfanato orgasmo orgulho oriental origem oriundo orla ortodoxo orvalho oscilar ossada osso ostentar otimismo ousadia outono outubro ouvido ovelha ovular oxidar oxigenar pacato paciente pacote pactuar padaria padrinho pagar pagode painel pairar paisagem palavra palestra palheta palito palmada palpitar pancada panela panfleto panqueca pantanal papagaio papelada papiro parafina parcial pardal parede partida pasmo passado pastel patamar patente patinar patrono paulada pausar peculiar pedalar pedestre pediatra pedra pegada peitoral peixe pele pelicano penca pendurar peneira penhasco pensador pente perceber perfeito pergunta perito permitir perna perplexo persiana pertence peruca pescado pesquisa pessoa petiscar piada picado piedade pigmento pilastra pilhado pilotar pimenta pincel pinguim pinha pinote pintar pioneiro pipoca piquete piranha pires pirueta piscar pistola pitanga pivete planta plaqueta platina plebeu plumagem pluvial pneu poda poeira poetisa polegada policiar poluente polvilho pomar pomba ponderar pontaria populoso porta possuir postal pote poupar pouso povoar praia prancha prato praxe prece predador prefeito premiar prensar preparar presilha pretexto prevenir prezar primata princesa prisma privado processo produto profeta proibido projeto prometer propagar prosa protetor provador publicar pudim pular pulmonar pulseira punhal punir pupilo pureza puxador quadra quantia quarto quase quebrar queda queijo quente querido quimono quina quiosque rabanada rabisco rachar racionar radial raiar rainha raio raiva rajada ralado ramal ranger ranhura rapadura rapel rapidez raposa raquete raridade rasante rascunho rasgar raspador rasteira rasurar ratazana ratoeira realeza reanimar reaver rebaixar rebelde rebolar recado recente recheio recibo recordar recrutar recuar rede redimir redonda reduzida reenvio refinar refletir refogar refresco refugiar regalia regime regra reinado reitor rejeitar relativo remador remendo remorso renovado reparo repelir repleto repolho represa repudiar requerer resenha resfriar resgatar residir resolver respeito ressaca restante resumir retalho reter retirar retomada retratar revelar revisor revolta riacho rica rigidez rigoroso rimar ringue risada risco risonho robalo rochedo rodada rodeio rodovia roedor roleta romano roncar rosado roseira rosto rota roteiro rotina rotular rouco roupa roxo rubro rugido rugoso ruivo rumo rupestre russo sabor saciar sacola sacudir sadio safira saga sagrada saibro salada saleiro salgado saliva salpicar salsicha saltar salvador sambar samurai sanar sanfona sangue sanidade sapato sarda sargento sarjeta saturar saudade saxofone sazonal secar secular seda sedento sediado sedoso sedutor segmento segredo segundo seiva seleto selvagem semanal semente senador senhor sensual sentado separado sereia seringa serra servo setembro setor sigilo silhueta silicone simetria simpatia simular sinal sincero singular sinopse sintonia sirene siri situado soberano sobra socorro sogro soja solda soletrar solteiro sombrio sonata sondar sonegar sonhador sono soprano soquete sorrir sorteio sossego sotaque soterrar sovado sozinho suavizar subida submerso subsolo subtrair sucata sucesso suco sudeste sufixo sugador sugerir sujeito sulfato sumir suor superior suplicar suposto suprimir surdina surfista surpresa surreal surtir suspiro sustento tabela tablete tabuada tacho tagarela talher talo talvez tamanho tamborim tampa tangente tanto tapar tapioca tardio tarefa tarja tarraxa tatuagem taurino taxativo taxista teatral tecer tecido teclado tedioso teia teimar telefone telhado tempero tenente tensor tentar termal terno terreno tese tesoura testado teto textura texugo tiara tigela tijolo timbrar timidez tingido tinteiro tiragem titular toalha tocha tolerar tolice tomada tomilho tonel tontura topete tora torcido torneio torque torrada torto tostar touca toupeira toxina trabalho tracejar tradutor trafegar trajeto trama trancar trapo traseiro tratador travar treino tremer trepidar trevo triagem tribo triciclo tridente trilogia trindade triplo triturar triunfal trocar trombeta trova trunfo truque tubular tucano tudo tulipa tupi turbo turma turquesa tutelar tutorial uivar umbigo unha unidade uniforme urologia urso urtiga urubu usado usina usufruir vacina vadiar vagaroso vaidoso vala valente validade valores vantagem vaqueiro varanda vareta varrer vascular vasilha vassoura vazar vazio veado vedar vegetar veicular veleiro velhice veludo vencedor vendaval venerar ventre verbal verdade vereador vergonha vermelho verniz versar vertente vespa vestido vetorial viaduto viagem viajar viatura vibrador videira vidraria viela viga vigente vigiar vigorar vilarejo vinco vinheta vinil violeta virada virtude visitar visto vitral viveiro vizinho voador voar vogal volante voleibol voltagem volumoso vontade vulto vuvuzela xadrez xarope xeque xeretar xerife xingar zangado zarpar zebu zelador zombar zoologia zumbido'.split(' '),en:'abandon ability able about above absent absorb abstract absurd abuse access accident account accuse achieve acid acoustic acquire across act action actor actress actual adapt add addict address adjust admit adult advance advice aerobic affair afford afraid again age agent agree ahead aim air airport aisle alarm album alcohol alert alien all alley allow almost alone alpha already also alter always amateur amazing among amount amused analyst anchor ancient anger angle angry animal ankle announce annual another answer antenna antique anxiety any apart apology appear apple approve april arch arctic area arena argue arm armed armor army around arrange arrest arrive arrow art artefact artist artwork ask aspect assault asset assist assume asthma athlete atom attack attend attitude attract auction audit august aunt author auto autumn average avocado avoid awake aware away awesome awful awkward axis baby bachelor bacon badge bag balance balcony ball bamboo banana banner bar barely bargain barrel base basic basket battle beach bean beauty because become beef before begin behave behind believe below belt bench benefit best betray better between beyond bicycle bid bike bind biology bird birth bitter black blade blame blanket blast bleak bless blind blood blossom blouse blue blur blush board boat body boil bomb bone bonus book boost border boring borrow boss bottom bounce box boy bracket brain brand brass brave bread breeze brick bridge brief bright bring brisk broccoli broken bronze broom brother brown brush bubble buddy budget buffalo build bulb bulk bullet bundle bunker burden burger burst bus business busy butter buyer buzz cabbage cabin cable cactus cage cake call calm camera camp can canal cancel candy cannon canoe canvas canyon capable capital captain car carbon card cargo carpet carry cart case cash casino castle casual cat catalog catch category cattle caught cause caution cave ceiling celery cement census century cereal certain chair chalk champion change chaos chapter charge chase chat cheap check cheese chef cherry chest chicken chief child chimney choice choose chronic chuckle chunk churn cigar cinnamon circle citizen city civil claim clap clarify claw clay clean clerk clever click client cliff climb clinic clip clock clog close cloth cloud clown club clump cluster clutch coach coast coconut code coffee coil coin collect color column combine come comfort comic common company concert conduct confirm congress connect consider control convince cook cool copper copy coral core corn correct cost cotton couch country couple course cousin cover coyote crack cradle craft cram crane crash crater crawl crazy cream credit creek crew cricket crime crisp critic crop cross crouch crowd crucial cruel cruise crumble crunch crush cry crystal cube culture cup cupboard curious current curtain curve cushion custom cute cycle dad damage damp dance danger daring dash daughter dawn day deal debate debris decade december decide decline decorate decrease deer defense define defy degree delay deliver demand demise denial dentist deny depart depend deposit depth deputy derive describe desert design desk despair destroy detail detect develop device devote diagram dial diamond diary dice diesel diet differ digital dignity dilemma dinner dinosaur direct dirt disagree discover disease dish dismiss disorder display distance divert divide divorce dizzy doctor document dog doll dolphin domain donate donkey donor door dose double dove draft dragon drama drastic draw dream dress drift drill drink drip drive drop drum dry duck dumb dune during dust dutch duty dwarf dynamic eager eagle early earn earth easily east easy echo ecology economy edge edit educate effort egg eight either elbow elder electric elegant element elephant elevator elite else embark embody embrace emerge emotion employ empower empty enable enact end endless endorse enemy energy enforce engage engine enhance enjoy enlist enough enrich enroll ensure enter entire entry envelope episode equal equip era erase erode erosion error erupt escape essay essence estate eternal ethics evidence evil evoke evolve exact example excess exchange excite exclude excuse execute exercise exhaust exhibit exile exist exit exotic expand expect expire explain expose express extend extra eye eyebrow fabric face faculty fade faint faith fall false fame family famous fan fancy fantasy farm fashion fat fatal father fatigue fault favorite feature february federal fee feed feel female fence festival fetch fever few fiber fiction field figure file film filter final find fine finger finish fire firm first fiscal fish fit fitness fix flag flame flash flat flavor flee flight flip float flock floor flower fluid flush fly foam focus fog foil fold follow food foot force forest forget fork fortune forum forward fossil foster found fox fragile frame frequent fresh friend fringe frog front frost frown frozen fruit fuel fun funny furnace fury future gadget gain galaxy gallery game gap garage garbage garden garlic garment gas gasp gate gather gauge gaze general genius genre gentle genuine gesture ghost giant gift giggle ginger giraffe girl give glad glance glare glass glide glimpse globe gloom glory glove glow glue goat goddess gold good goose gorilla gospel gossip govern gown grab grace grain grant grape grass gravity great green grid grief grit grocery group grow grunt guard guess guide guilt guitar gun gym habit hair half hammer hamster hand happy harbor hard harsh harvest hat have hawk hazard head health heart heavy hedgehog height hello helmet help hen hero hidden high hill hint hip hire history hobby hockey hold hole holiday hollow home honey hood hope horn horror horse hospital host hotel hour hover hub huge human humble humor hundred hungry hunt hurdle hurry hurt husband hybrid ice icon idea identify idle ignore ill illegal illness image imitate immense immune impact impose improve impulse inch include income increase index indicate indoor industry infant inflict inform inhale inherit initial inject injury inmate inner innocent input inquiry insane insect inside inspire install intact interest into invest invite involve iron island isolate issue item ivory jacket jaguar jar jazz jealous jeans jelly jewel job join joke journey joy judge juice jump jungle junior junk just kangaroo keen keep ketchup key kick kid kidney kind kingdom kiss kit kitchen kite kitten kiwi knee knife knock know lab label labor ladder lady lake lamp language laptop large later latin laugh laundry lava law lawn lawsuit layer lazy leader leaf learn leave lecture left leg legal legend leisure lemon lend length lens leopard lesson letter level liar liberty library license life lift light like limb limit link lion liquid list little live lizard load loan lobster local lock logic lonely long loop lottery loud lounge love loyal lucky luggage lumber lunar lunch luxury lyrics machine mad magic magnet maid mail main major make mammal man manage mandate mango mansion manual maple marble march margin marine market marriage mask mass master match material math matrix matter maximum maze meadow mean measure meat mechanic medal media melody melt member memory mention menu mercy merge merit merry mesh message metal method middle midnight milk million mimic mind minimum minor minute miracle mirror misery miss mistake mix mixed mixture mobile model modify mom moment monitor monkey monster month moon moral more morning mosquito mother motion motor mountain mouse move movie much muffin mule multiply muscle museum mushroom music must mutual myself mystery myth naive name napkin narrow nasty nation nature near neck need negative neglect neither nephew nerve nest net network neutral never news next nice night noble noise nominee noodle normal north nose notable note nothing notice novel now nuclear number nurse nut oak obey object oblige obscure observe obtain obvious occur ocean october odor off offer office often oil okay old olive olympic omit once one onion online only open opera opinion oppose option orange orbit orchard order ordinary organ orient original orphan ostrich other outdoor outer output outside oval oven over own owner oxygen oyster ozone pact paddle page pair palace palm panda panel panic panther paper parade parent park parrot party pass patch path patient patrol pattern pause pave payment peace peanut pear peasant pelican pen penalty pencil people pepper perfect permit person pet phone photo phrase physical piano picnic picture piece pig pigeon pill pilot pink pioneer pipe pistol pitch pizza place planet plastic plate play please pledge pluck plug plunge poem poet point polar pole police pond pony pool popular portion position possible post potato pottery poverty powder power practice praise predict prefer prepare present pretty prevent price pride primary print priority prison private prize problem process produce profit program project promote proof property prosper protect proud provide public pudding pull pulp pulse pumpkin punch pupil puppy purchase purity purpose purse push put puzzle pyramid quality quantum quarter question quick quit quiz quote rabbit raccoon race rack radar radio rail rain raise rally ramp ranch random range rapid rare rate rather raven raw razor ready real reason rebel rebuild recall receive recipe record recycle reduce reflect reform refuse region regret regular reject relax release relief rely remain remember remind remove render renew rent reopen repair repeat replace report require rescue resemble resist resource response result retire retreat return reunion reveal review reward rhythm rib ribbon rice rich ride ridge rifle right rigid ring riot ripple risk ritual rival river road roast robot robust rocket romance roof rookie room rose rotate rough round route royal rubber rude rug rule run runway rural sad saddle sadness safe sail salad salmon salon salt salute same sample sand satisfy satoshi sauce sausage save say scale scan scare scatter scene scheme school science scissors scorpion scout scrap screen script scrub sea search season seat second secret section security seed seek segment select sell seminar senior sense sentence series service session settle setup seven shadow shaft shallow share shed shell sheriff shield shift shine ship shiver shock shoe shoot shop short shoulder shove shrimp shrug shuffle shy sibling sick side siege sight sign silent silk silly silver similar simple since sing siren sister situate six size skate sketch ski skill skin skirt skull slab slam sleep slender slice slide slight slim slogan slot slow slush small smart smile smoke smooth snack snake snap sniff snow soap soccer social sock soda soft solar soldier solid solution solve someone song soon sorry sort soul sound soup source south space spare spatial spawn speak special speed spell spend sphere spice spider spike spin spirit split spoil sponsor spoon sport spot spray spread spring spy square squeeze squirrel stable stadium staff stage stairs stamp stand start state stay steak steel stem step stereo stick still sting stock stomach stone stool story stove strategy street strike strong struggle student stuff stumble style subject submit subway success such sudden suffer sugar suggest suit summer sun sunny sunset super supply supreme sure surface surge surprise surround survey suspect sustain swallow swamp swap swarm swear sweet swift swim swing switch sword symbol symptom syrup system table tackle tag tail talent talk tank tape target task taste tattoo taxi teach team tell ten tenant tennis tent term test text thank that theme then theory there they thing this thought three thrive throw thumb thunder ticket tide tiger tilt timber time tiny tip tired tissue title toast tobacco today toddler toe together toilet token tomato tomorrow tone tongue tonight tool tooth top topic topple torch tornado tortoise toss total tourist toward tower town toy track trade traffic tragic train transfer trap trash travel tray treat tree trend trial tribe trick trigger trim trip trophy trouble truck true truly trumpet trust truth try tube tuition tumble tuna tunnel turkey turn turtle twelve twenty twice twin twist two type typical ugly umbrella unable unaware uncle uncover under undo unfair unfold unhappy uniform unique unit universe unknown unlock until unusual unveil update upgrade uphold upon upper upset urban urge usage use used useful useless usual utility vacant vacuum vague valid valley valve van vanish vapor various vast vault vehicle velvet vendor venture venue verb verify version very vessel veteran viable vibrant vicious victory video view village vintage violin virtual virus visa visit visual vital vivid vocal voice void volcano volume vote voyage wage wagon wait walk wall walnut want warfare warm warrior wash wasp waste water wave way wealth weapon wear weasel weather web wedding weekend weird welcome west wet whale what wheat wheel when where whip whisper wide width wife wild will win window wine wing wink winner winter wire wisdom wise wish witness wolf woman wonder wood wool word work world worry worth wrap wreck wrestle wrist write wrong yard year yellow you young youth zebra zero zone zoo'.split(' ')};
const IDX={pt:new Map(WORDS.pt.map((w,i)=>[w,i])),en:new Map(WORDS.en.map((w,i)=>[w,i]))};
const sha256=async b=>new Uint8Array(await S.digest('SHA-256',b));
async function entropyToWords(ent,lang){
  const h=await sha256(ent);let bits='';
  for(const b of ent)bits+=b.toString(2).padStart(8,'0');
  bits+=h[0].toString(2).padStart(8,'0').slice(0,ent.length/4);
  const out=[];for(let i=0;i<bits.length;i+=11)out.push(WORDS[lang][parseInt(bits.slice(i,i+11),2)]);
  return out;
}
const normWords=t=>t.normalize('NFKD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z\s]/g,' ').trim().split(/\s+/).filter(Boolean);
async function wordsToEntropy(words){
  if(words.length!==12)throw{code:'count'};
  const langs=['pt','en'].filter(l=>words.every(w=>IDX[l].has(w)));
  if(!langs.length){
    const best=['pt','en'].sort((a,b)=>words.filter(w=>IDX[b].has(w)).length-words.filter(w=>IDX[a].has(w)).length)[0];
    throw{code:'word',bad:words.map((w,i)=>IDX[best].has(w)?-1:i+1).filter(i=>i>0)};
  }
  for(const lang of langs){
    let bits='';for(const w of words)bits+=IDX[lang].get(w).toString(2).padStart(11,'0');
    const ent=new Uint8Array(16);for(let i=0;i<16;i++)ent[i]=parseInt(bits.slice(i*8,i*8+8),2);
    const h=await sha256(ent);
    if(h[0].toString(2).padStart(8,'0').slice(0,4)===bits.slice(128))return{ent,lang};
  }
  throw{code:'checksum'};
}
async function wordsToSeed(words){
  const k=await S.importKey('raw',te.encode(words.join(' ').normalize('NFKD')),'PBKDF2',false,['deriveBits']);
  return new Uint8Array(await S.deriveBits({name:'PBKDF2',hash:'SHA-512',salt:te.encode('mnemonic'),iterations:2048},k,512));
}

/* ================= derivação de chaves ================= */
const PK8={ed:hexB('302e020100300506032b657004220420'),x:hexB('302e020100300506032b656e04220420')};
async function hkdf(ikm,info,salt=te.encode('systekna-cofre-v1'),len=256){
  const k=await S.importKey('raw',ikm,'HKDF',false,['deriveBits']);
  return new Uint8Array(await S.deriveBits({name:'HKDF',hash:'SHA-256',salt,info:typeof info==='string'?te.encode(info):info},k,len));
}
const multibase=(prefix,raw)=>'z'+b58enc(cat(new Uint8Array(prefix),raw));
async function deriveIdentity(seed){
  const edSeed=await hkdf(seed,'ssi/ed25519'),xSeed=await hkdf(seed,'ssi/x25519'),vBits=await hkdf(seed,'vault/aes-256-gcm');
  const pubOf=async(der,alg,use)=>b64u.dec((await S.exportKey('jwk',await S.importKey('pkcs8',der,{name:alg},true,use))).x);
  const edDer=cat(PK8.ed,edSeed),xDer=cat(PK8.x,xSeed);
  const edPub=await pubOf(edDer,'Ed25519',['sign']),xPub=await pubOf(xDer,'X25519',['deriveBits']);
  const id={
    edPriv:await S.importKey('pkcs8',edDer,{name:'Ed25519'},false,['sign']),
    xPriv:await S.importKey('pkcs8',xDer,{name:'X25519'},false,['deriveBits']),
    vaultKey:await S.importKey('raw',vBits,{name:'AES-GCM'},false,['encrypt','decrypt']),
    edPub,xPub,edMb:multibase([0xed,0x01],edPub),xMb:multibase([0xec,0x01],xPub)
  };
  id.did='did:key:'+id.edMb;
  [edSeed,xSeed,vBits,edDer,xDer].forEach(b=>b.fill(0));
  return id;
}

/* ================= AES-256-GCM ================= */
async function seal(key,data,aad){
  const iv=rnd(12),p={name:'AES-GCM',iv};if(aad)p.additionalData=te.encode(aad);
  const pt=data instanceof Uint8Array?data:te.encode(JSON.stringify(data));
  return{iv:b64u.enc(iv),ct:b64u.enc(await S.encrypt(p,key,pt))};
}
async function unseal(key,rec,aad,raw){
  const p={name:'AES-GCM',iv:b64u.dec(rec.iv)};if(aad)p.additionalData=te.encode(aad);
  const pt=new Uint8Array(await S.decrypt(p,key,b64u.dec(rec.ct)));
  return raw?pt:JSON.parse(td.decode(pt));
}

/* ================= PIN + chave do aparelho ================= */
const PIN_ITER=600000, MAX_FAILS=10, SOFT_FAILS=5;
async function pinKey(pin,salt,iter){
  const k=await S.importKey('raw',te.encode(pin),'PBKDF2',false,['deriveKey']);
  return S.deriveKey({name:'PBKDF2',hash:'SHA-256',salt,iterations:iter},k,{name:'AES-GCM',length:256},false,['encrypt','decrypt']);
}
async function deviceKey(create){
  let dk=await DB.get('deviceKey');
  if(!dk&&create){dk=await S.generateKey({name:'AES-GCM',length:256},false,['encrypt','decrypt']);await DB.set('deviceKey',dk)}
  return dk;
}
// Se há PIN neste aparelho ("usar só biometria" o apaga). Toda sessão começa por showLock ou writeLock, que o acertam.
let pinOn=true;
async function writeLock(ent,pin){
  const dk=await deviceKey(true);
  const inner=await seal(dk,ent,'device');
  const salt=rnd(16),outer=await seal(await pinKey(pin,salt,PIN_ITER),te.encode(JSON.stringify(inner)),'pin');
  await DB.set('lock',{v:1,salt:b64u.enc(salt),iter:PIN_ITER,...outer});pinOn=true;
}
class PinError extends Error{}
async function readLock(pin){
  const L=await DB.get('lock'),dk=await deviceKey(false);
  if(!L||!dk)throw new Error('missing');
  let inner;
  try{inner=JSON.parse(td.decode(await unseal(await pinKey(pin,b64u.dec(L.salt),L.iter),L,'pin',true)))}
  catch{throw new PinError()}
  return unseal(dk,inner,'device',true);
}
const getGuard=async()=>(await DB.get('guard'))||{fails:0,until:0};
/* A tentativa é contada antes de testar o PIN: fechar a aba durante a conferência não a devolve. */
async function unlockWithPin(pin){
  const g=await getGuard();
  if(Date.now()<g.until)return{wait:Math.ceil((g.until-Date.now())/1000)};
  g.fails++;
  if(g.fails>=SOFT_FAILS)g.until=Date.now()+30000*2**(g.fails-SOFT_FAILS);
  await DB.set('guard',g);
  try{const ent=await readLock(pin);await DB.set('guard',{fails:0,until:0});return{ent}}
  catch(e){
    if(!(e instanceof PinError))throw e;
    if(g.fails>=MAX_FAILS){await DB.clear();return{wiped:true}}
    return{fails:g.fails};
  }
}
/* ================= biometria (passkey com PRF) ================= */
// O autenticador do aparelho só entrega o segredo PRF depois da digital ou do rosto, e é esse
// segredo que abre a identidade. Sem PRF, a biometria seria um "sim" conferido em JavaScript e
// poderia ser burlada como o contador do PIN; por isso, sem PRF, a opção não é oferecida.
class BioError extends Error{constructor(code){super(code);this.code=code}}
async function bioAvailable(){
  try{
    if(!window.PublicKeyCredential||!await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable())return false;
    // getClientCapabilities pode ficar pendente no Chrome: espera no máximo 1 s. Sem resposta, a opção
    // aparece mesmo assim, porque a ativação confere a PRF de novo e explica se faltar.
    if(PublicKeyCredential.getClientCapabilities){
      const caps=await Promise.race([PublicKeyCredential.getClientCapabilities().catch(()=>null),new Promise(r=>setTimeout(()=>r(null),1000))]);
      if(caps&&caps['extension:prf']===false)return false;
    }
    return true;
  }catch{return false}
}
async function bioKey(prf,salt){return S.importKey('raw',await hkdf(new Uint8Array(prf),'unlock/webauthn-prf',salt),{name:'AES-GCM'},false,['encrypt','decrypt'])}
async function bioPrf(credId,salt){
  const a=await navigator.credentials.get({publicKey:{challenge:rnd(32),allowCredentials:[{type:'public-key',id:credId}],
    userVerification:'required',timeout:60000,extensions:{prf:{eval:{first:salt}}}}});
  const r=a.getClientExtensionResults().prf;
  if(!r||!r.results||!r.results.first)throw new BioError('prf');
  return r.results.first;
}
// Avisa o gerenciador de senhas que a passkey não vale mais (Chrome 132+). Nos outros, a pessoa remove à mão.
function forgetPasskey(credId){
  try{PublicKeyCredential.signalUnknownCredential&&PublicKeyCredential.signalUnknownCredential({rpId:location.hostname,credentialId:b64u.enc(new Uint8Array(credId))}).catch(()=>{})}catch{}
}
async function enableBio(ent){
  const salt=rnd(32);
  const c=await navigator.credentials.create({publicKey:{
    rp:{name:document.title},user:{id:rnd(16),name:`${APP.label} · ${shortDid(ses.did)}`,displayName:APP.label},
    challenge:rnd(32),pubKeyCredParams:[{type:'public-key',alg:-8},{type:'public-key',alg:-7},{type:'public-key',alg:-257}],
    authenticatorSelection:{authenticatorAttachment:'platform',residentKey:'preferred',userVerification:'required'},
    timeout:60000,extensions:{prf:{eval:{first:salt}}}}});
  const ext=c.getClientExtensionResults().prf;
  if(!ext||!ext.enabled){forgetPasskey(c.rawId);throw new BioError('noprf')}
  const prf=ext.results&&ext.results.first?ext.results.first:await bioPrf(c.rawId,salt);
  // Mesmas duas camadas do PIN: chave do aparelho por dentro, segredo da biometria por fora.
  const inner=await seal(await deviceKey(true),ent,'device');
  const outer=await seal(await bioKey(prf,salt),te.encode(JSON.stringify(inner)),'bio');
  await DB.set('bioLock',{v:1,cred:b64u.enc(new Uint8Array(c.rawId)),salt:b64u.enc(salt),...outer});
}
async function unlockWithBio(){
  const L=await DB.get('bioLock'),dk=await deviceKey(false);
  if(!L||!dk)throw new BioError('missing');
  const salt=b64u.dec(L.salt),prf=await bioPrf(b64u.dec(L.cred),salt);
  let inner;
  try{inner=JSON.parse(td.decode(await unseal(await bioKey(prf,salt),L,'bio',true)))}catch{throw new BioError('key')}
  const ent=await unseal(dk,inner,'device',true);
  await DB.set('guard',{fails:0,until:0});
  return ent;
}
// pin: se o PIN ainda existe como alternativa. Com "usar só biometria", a saída é a recuperação pelas 12 palavras.
const bioErrMsg=(e,pin=true)=>e&&e.name==='NotAllowedError'?`Biometria cancelada ou não reconhecida. Tente de novo${pin?' ou use o PIN':''}.`
  :e&&e.code==='missing'?'A chave deste aparelho sumiu. Recupere com as 12 palavras.'
  :e&&(e.code==='key'||e.code==='prf')?(pin?'A biometria deste aparelho mudou. Entre com o PIN e ative de novo nos Ajustes.':'A biometria deste aparelho mudou. Recupere com as 12 palavras.')
  :pin?'Não foi possível usar a biometria. Use o PIN.':'Não foi possível usar a biometria. Tente de novo ou recupere com as 12 palavras.';
const pinFailMsg=f=>{const left=MAX_FAILS-f;return f>=SOFT_FAILS?`PIN incorreto. Espere ${30*2**(f-SOFT_FAILS)} s. Mais ${left} ${left>1?'erros apagam':'erro apaga'} tudo.`:'PIN incorreto.'};
const weakPin=p=>/^(\d)\1{5}$/.test(p)||'0123456789012'.includes(p)||'9876543210987'.includes(p)||/^(\d\d)\1\1$/.test(p)||/^(\d{3})\1$/.test(p);
const WEAK_MSG='Evite números repetidos e sequências. Escolha outro PIN.';

/* ================= credenciais: vocabulário comum ================= */
const VC_TYPES={
  // kycValidado: o emissor diz se conferiu os documentos (KYC). Só o sim ou não; os dados nunca entram (RN58, RN59).
  IdentityCredential:{label:'Identidade',claims:[['nome',''],['kycValidado','false']]},
  AgeOver18Credential:{label:'Maioridade',claims:[['maiorDeIdade','true']]},
  EmploymentCredential:{label:'Vínculo profissional',claims:[['empresa',''],['cargo','']]},
  ResidenceCredential:{label:'Residência',claims:[['cidade',''],['uf','']]},
  DocumentRegistrationCredential:{label:'Registro de documento',claims:[]},
  // Uma por grupo de um emissor (F1). Leva a chave X25519 do titular, que vem no pedido, e sempre tem validade.
  MembroDoGrupo:{label:'Membro de grupo',claims:[['grupo',''],['nome',''],['apelido','']]},
  CustomCredential:{label:'Personalizada',claims:[['campo','']]}
};
/* ================= dados pessoais (RN59) ================= */
// Credencial, livro e log nunca levam CPF, RG, foto e afins. O nome do campo é lido palavra por palavra (cpfTitular, numero_rg, nomeDaMae).
const PII_WORDS=['cpf','rg','cnh','passaporte','pis','nis','sus','foto','selfie','biometria','nascimento','endereco','filiacao','mae','pai'];
const piiWords=k=>String(k).normalize('NFKD').replace(/[\u0300-\u036f]/g,'').replace(/([a-z])([A-Z])/g,'$1 $2').toLowerCase().split(/[^a-z0-9]+/).filter(Boolean);
function cpfOk(s){
  const d=String(s).replace(/\D/g,'');
  if(d.length!==11||/^(\d)\1{10}$/.test(d))return false;
  const dv=n=>{let t=0;for(let i=0;i<n;i++)t+=+d[i]*(n+1-i);return t*10%11%10};
  return dv(9)===+d[9]&&dv(10)===+d[10];
}
// CPF solto, com ou sem pontuação, e com dígitos verificadores válidos. Colado em letras ou dígitos (hash, chave) não conta.
const CPF_RE=/(?<![\dA-Za-z])\d{3}\.?\d{3}\.?\d{3}-?\d{2}(?![\dA-Za-z])/g;
function piiProblem(fields){
  for(const[k,v]of Object.entries(fields)){
    if(piiWords(k).some(w=>PII_WORDS.includes(w)))return`O campo “${k}” é dado pessoal e não entra em credencial.`;
    if(typeof v==='string'&&(v.match(CPF_RE)||[]).some(cpfOk))return`O campo “${k}” parece conter um CPF, que não entra em credencial.`;
  }
  return null;
}
const vcLabel=t=>(VC_TYPES[t]||{}).label||t;
const vcType=p=>((p.vc&&p.vc.type)||[]).find(t=>t!=='VerifiableCredential')||'CustomCredential';
const vcClaims=p=>Object.entries((p.vc&&p.vc.credentialSubject)||{}).filter(([k])=>k!=='id');
const vcIssuerName=p=>(p.vc&&p.vc.issuer&&p.vc.issuer.name)||shortDid(p.iss);
const fmtVal=v=>v===true?'sim':v===false?'não':String(v);
const VC_CONTEXT=['https://www.w3.org/2018/credentials/v1'];

/* ================= JWT EdDSA ================= */
async function signJWT(typ,payload){
  const header={alg:'EdDSA',typ,kid:`${ses.did}#${ses.edMb}`};
  const si=b64u.enc(te.encode(JSON.stringify(header)))+'.'+b64u.enc(te.encode(JSON.stringify(payload)));
  return si+'.'+b64u.enc(await S.sign({name:'Ed25519'},ses.edPriv,te.encode(si)));
}
function decodeJWT(tok){
  const p=String(tok).trim().split('.');
  if(p.length!==3)throw new Error('Um token JWT tem três partes separadas por ponto.');
  try{return{header:JSON.parse(td.decode(b64u.dec(p[0]))),payload:JSON.parse(td.decode(b64u.dec(p[1]))),parts:p}}
  catch{throw new Error('O conteúdo colado não é um JWT legível.')}
}
function didToEdKey(did){
  if(!/^did:key:z/.test(did))throw new Error('O assinante não usa did:key, então a chave não pode ser lida do próprio DID.');
  const b=b58dec(did.slice(9));
  if(b.length!==34||b[0]!==0xed||b[1]!==0x01)throw new Error('O did:key não é uma chave Ed25519.');
  return S.importKey('raw',b.slice(2),{name:'Ed25519'},false,['verify']);
}
async function verifyJWT(tok,typ){
  const{header,payload,parts}=decodeJWT(tok);
  if(header.alg!=='EdDSA')throw new Error(`Algoritmo ${header.alg} não suportado. Use EdDSA.`);
  if(typ&&header.typ!==typ)throw new Error(`O token é do tipo ${header.typ||'sem tipo'}, mas aqui se espera ${typ}.`);
  const did=String(header.kid||payload.iss||'').split('#')[0];
  if(payload.iss&&payload.iss!==did)throw new Error('O emissor declarado não confere com a chave que assinou.');
  const ok=await S.verify({name:'Ed25519'},await didToEdKey(did),b64u.dec(parts[2]),te.encode(parts[0]+'.'+parts[1]));
  return{ok,header,payload,did,tok:String(tok).trim()};
}

/* ================= mensagens (X25519 + AES-256-GCM) ================= */
function parseXKey(s){
  s=s.trim();let raw;
  if(s.startsWith('z')){const b=b58dec(s.slice(1));if(b.length!==34||b[0]!==0xec||b[1]!==0x01)throw new Error('Essa não é uma chave de cifragem X25519. Ela começa com z6LS.');raw=b.slice(2)}
  else raw=b64u.dec(s);
  if(raw.length!==32)throw new Error('A chave de cifragem tem tamanho inválido.');
  return raw;
}
async function msgKey(shared,ephPub,toPub){return S.importKey('raw',await hkdf(shared,'msg/aes-256-gcm',cat(ephPub,toPub)),{name:'AES-GCM'},false,['encrypt','decrypt'])}
async function sealFor(toMb,text){
  const toPub=parseXKey(toMb);
  const rp=await S.importKey('raw',toPub,{name:'X25519'},false,[]);
  const eph=await S.generateKey({name:'X25519'},true,['deriveBits']);
  const ephPub=new Uint8Array(await S.exportKey('raw',eph.publicKey));
  const shared=new Uint8Array(await S.deriveBits({name:'X25519',public:rp},eph.privateKey,256));
  const r=await seal(await msgKey(shared,ephPub,toPub),te.encode(text));shared.fill(0);
  return['smsg1',b64u.enc(ephPub),r.iv,r.ct].join('.');
}
async function openMsg(pkg){
  const p=pkg.trim().split('.');
  if(p.length!==4||p[0]!=='smsg1')throw new Error('Isso não parece uma mensagem cifrada. Ela começa com smsg1.');
  const ephPub=b64u.dec(p[1]);
  const shared=new Uint8Array(await S.deriveBits({name:'X25519',public:await S.importKey('raw',ephPub,{name:'X25519'},false,[])},ses.xPriv,256));
  try{return td.decode(await unseal(await msgKey(shared,ephPub,ses.xPub),{iv:p[2],ct:p[3]},null,true))}
  catch{throw new Error('Esta mensagem não foi cifrada para a sua chave, ou foi alterada.')}
  finally{shared.fill(0)}
}

/* ================= sessão ================= */
let ses=null, draft=null, activePad=null;
async function startSession(ent,lang){
  const words=await entropyToWords(ent,lang),seed=await wordsToSeed(words);
  const id=await deriveIdentity(seed);seed.fill(0);
  ses={...id,ent:new Uint8Array(ent),lang};
  const meta=await DB.get('meta');
  await DB.set('meta',{did:ses.did,lang,created:meta&&meta.did===ses.did?meta.created:Date.now()});
  await APP.load();
  touch();
}
let lastAct=Date.now();
const autoMin=()=>+(store.get('auto')||APP.autoDefault||3);
const touch=()=>{lastAct=Date.now()};
['pointerdown','keydown','scroll'].forEach(e=>addEventListener(e,touch,{passive:true}));
setInterval(()=>{if(ses&&Date.now()-lastAct>autoMin()*60000)lockNow('Bloqueado por inatividade.')},5000);
document.addEventListener('visibilitychange',()=>{if(!document.hidden&&ses&&Date.now()-lastAct>autoMin()*60000)lockNow('Bloqueado por inatividade.')});

/* ================= UI base ================= */
function show(id){
  document.querySelectorAll('.screen').forEach(s=>s.classList.toggle('on',s.id===id));
  document.body.dataset.screen=id;scrollTo(0,0);
  if(id!=='sPin'&&!$('#sheet').classList.contains('open'))activePad=null;
}
let toastT;
function toast(msg,bad){const t=$('#toast');t.querySelector('span').textContent=msg;t.classList.toggle('bad',!!bad);t.classList.add('show');clearTimeout(toastT);toastT=setTimeout(()=>t.classList.remove('show'),2800)}
let sheetClose=null;
function openSheet(html,onClose){
  const b=$('#sheetBody');b.onclick=null;b.innerHTML=html;sheetClose=onClose||null;paintIcons(b);
  $('#sheet').classList.add('open');$('#scrim').classList.add('open');$('#sheet').scrollTop=0;
}
function closeSheet(){
  $('#sheet').classList.remove('open');$('#scrim').classList.remove('open');
  const f=sheetClose;sheetClose=null;activePad=null;
  setTimeout(()=>{if(!$('#sheet').classList.contains('open'))$('#sheetBody').innerHTML=''},450);
  f&&f();
}
$('#scrim').onclick=closeSheet;
function confirmSheet(title,text,ok,danger){
  return new Promise(res=>{
    openSheet(`<h3>${title}</h3><p class="sub">${text}</p><div class="pair"><button class="btn ghost" id="cfNo">Cancelar</button><button class="btn ${danger?'danger':''}" id="cfOk">${ok}</button></div>`,()=>res(false));
    $('#cfNo').onclick=()=>closeSheet();
    $('#cfOk').onclick=()=>{sheetClose=null;closeSheet();res(true)};
  });
}
async function copy(text,label='Copiado'){
  try{await navigator.clipboard.writeText(text);toast(label)}
  catch{const t=document.createElement('textarea');t.value=text;t.style.cssText='position:fixed;opacity:0';document.body.appendChild(t);t.select();
    let ok=false;try{ok=document.execCommand('copy')}catch{}t.remove();toast(ok?label:'Não foi possível copiar. Selecione o texto e copie manualmente.',!ok)}
}
function setSeg(seg,i){seg.style.setProperty('--i',i);seg.querySelectorAll('button').forEach((b,j)=>b.setAttribute('aria-pressed',j===i))}
function wireSeg(seg,onPick){seg.onclick=e=>{const b=e.target.closest('button');if(!b)return;const i=[...seg.querySelectorAll('button')].indexOf(b);setSeg(seg,i);onPick(b,i)}}
const verdictHtml=(ok,title,text)=>`<div class="verdict glass flat ${ok?'ok':'no'}"><span class="badge">${ic(ok?'check':'x')}</span><div><b>${title}</b><small>${text}</small></div></div>`;
const shake=el=>{el.classList.remove('bad');void el.offsetWidth;el.classList.add('bad')};

function applyTheme(t){
  t=t||store.get('theme')||(matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light');
  document.documentElement.dataset.theme=t;$('#metaTheme').content=t==='dark'?'#0B1B33':'#DCEBFA';
}
$('#themeBtn').onclick=()=>{const t=document.documentElement.dataset.theme==='dark'?'light':'dark';store.set('theme',t);applyTheme(t)};

/* ================= teclado de PIN ================= */
function makePad(root,{onPin}){
  root.classList.add('pad');
  root.innerHTML=`<div class="dots">${'<i></i>'.repeat(6)}</div><p class="pmsg" role="status" aria-live="polite"></p><div class="keys">${[1,2,3,4,5,6,7,8,9].map(n=>`<button class="k" data-k="${n}">${n}</button>`).join('')}<button class="k fn" data-k="x"></button><button class="k" data-k="0">0</button><button class="k fn" data-k="del" aria-label="Apagar dígito">${ic('bksp')}</button></div>`;
  let v='',busy=false;
  const dotsEl=root.querySelector('.dots'),dots=[...dotsEl.children],msg=root.querySelector('.pmsg');
  const draw=()=>dots.forEach((d,i)=>d.classList.toggle('on',i<v.length));
  const api={
    async key(k){
      if(busy||k==='x')return;
      if(k==='del'){v=v.slice(0,-1);draw();return}
      if(v.length>=6)return;
      v+=k;draw();
      if(v.length===6){busy=true;root.classList.add('busy');const pin=v;await new Promise(r=>setTimeout(r,140));
        try{await onPin(pin,api)}catch(e){console.error(e);api.reset('Algo falhou. Tente de novo.',true)}}
    },
    reset(m,bad){v='';draw();busy=false;root.classList.remove('busy');msg.textContent=m||'';msg.classList.toggle('bad',!!bad);
      if(bad){dotsEl.classList.remove('shake');void dotsEl.offsetWidth;dotsEl.classList.add('shake')}},
    say(m){msg.textContent=m;msg.classList.remove('bad')}
  };
  root.onclick=e=>{const b=e.target.closest('.k');if(b)api.key(b.dataset.k)};
  activePad=api;return api;
}
addEventListener('keydown',e=>{
  if(!activePad||e.target.matches('input,textarea,select'))return;
  if(/^\d$/.test(e.key)){e.preventDefault();activePad.key(e.key)}
  else if(e.key==='Backspace'){e.preventDefault();activePad.key('del')}
});

/* ================= criação ================= */
document.querySelectorAll('[data-go]').forEach(b=>b.onclick=()=>show(b.dataset.go));
$('#goCreate').onclick=async()=>{draft={ent:rnd(16),lang:'pt'};setSeg($('#langSeg'),0);await drawWords();show('sWords')};
async function drawWords(){
  draft.words=await entropyToWords(draft.ent,draft.lang);
  $('#wordGrid').innerHTML=draft.words.map(w=>`<li>${w}</li>`).join('');
  $('#wordGrid').classList.add('veil');$('#toggleVeil').textContent='Mostrar palavras';
}
$('#toggleVeil').onclick=()=>{const g=$('#wordGrid');g.classList.toggle('veil');$('#toggleVeil').textContent=g.classList.contains('veil')?'Mostrar palavras':'Esconder palavras'};
wireSeg($('#langSeg'),async b=>{draft.lang=b.dataset.l;await drawWords()});
$('#wordsNew').onclick=async()=>{draft.ent=rnd(16);await drawWords();toast('Novas palavras geradas')};
$('#wordsDone').onclick=()=>{
  const pos=[];while(pos.length<3){const p=1+crypto.getRandomValues(new Uint32Array(1))[0]%12;if(!pos.includes(p))pos.push(p)}
  draft.check=pos.sort((a,b)=>a-b);
  $('#confirmFields').innerHTML=draft.check.map(p=>`<label class="f" data-p="${p}"><span>Palavra nº ${p}</span><input autocomplete="off" autocapitalize="none" autocorrect="off" spellcheck="false"></label>`).join('');
  $('#confirmHint').textContent='';show('sConfirm');$('#confirmFields input').focus();
};
$('#confirmGo').onclick=()=>{
  let ok=true;
  $('#confirmFields').querySelectorAll('.f').forEach(f=>{const good=normWords(f.querySelector('input').value)[0]===draft.words[f.dataset.p-1];f.classList.toggle('bad',!good);if(!good)ok=false});
  if(!ok){$('#confirmHint').textContent='Alguma palavra não confere. Volte e confira a anotação.';$('#confirmHint').classList.add('bad');return}
  pinSetup(draft.ent,draft.lang,'sConfirm');
};

/* ================= recuperação ================= */
function goRecover(from){$('#recWords').value='';$('#recHint').textContent='0 de 12 palavras';$('#recHint').classList.remove('bad');$('#recField').classList.remove('bad');$('#recBack').onclick=()=>from==='lock'?showLock():show('sWelcome');show('sRecover')}
$('#goRecover').onclick=()=>goRecover('welcome');
$('#recWords').oninput=()=>{const n=normWords($('#recWords').value).length;$('#recHint').textContent=`${n} de 12 palavras`;$('#recHint').classList.remove('bad');$('#recField').classList.remove('bad')};
$('#recGo').onclick=async()=>{
  const words=normWords($('#recWords').value),hint=$('#recHint');
  const fail=m=>{hint.textContent=m;hint.classList.add('bad');shake($('#recField'))};
  let r;
  try{r=await wordsToEntropy(words)}
  catch(e){
    if(e.code==='count')return fail(`São 12 palavras. Você digitou ${words.length}.`);
    if(e.code==='word')return fail(`${e.bad.length>1?'As palavras':'A palavra'} nº ${e.bad.join(', ')} não ${e.bad.length>1?'estão':'está'} na lista oficial. Confira a grafia.`);
    return fail('As palavras existem, mas a combinação não fecha. Confira a ordem.');
  }
  $('#recGo').disabled=true;
  try{
    const seed=await wordsToSeed(words),id=await deriveIdentity(seed);seed.fill(0);
    const meta=await DB.get('meta');
    if(meta&&meta.did!==id.did){
      const go=await confirmSheet('Outra identidade','Estas palavras pertencem a uma identidade diferente da que está neste aparelho. Os dados atuais não abrem com elas e serão apagados.','Substituir',true);
      if(!go)return;
      for(const k of APP.dataKeys)await DB.del(k);
      await DB.del('bioLock');
      await DB.del('meta');
    }
    pinSetup(r.ent,r.lang,'sRecover');
  }finally{$('#recGo').disabled=false}
};

/* ================= PIN ================= */
function pinSetup(ent,lang,from){
  show('sPin');$('#pinOrb').classList.remove('opening');
  $('#pinPad').classList.remove('nopin');$('#bioBtn').hidden=true;
  const T=$('#pinTitle');
  T.textContent='Crie um PIN de 6 dígitos';
  $('#pinSub').textContent='Ele só abre neste aparelho. A chave mestra continua sendo as 12 palavras.';
  $('#pinLink').textContent='Cancelar';$('#pinLink').onclick=()=>show(from);
  let first=null;
  makePad($('#pinPad'),{onPin:async(pin,a)=>{
    if(!first){if(weakPin(pin))return a.reset(WEAK_MSG,true);first=pin;T.textContent='Repita o PIN';return a.reset()}
    if(pin!==first){first=null;T.textContent='Crie um PIN de 6 dígitos';return a.reset('Os PINs não conferem. Comece de novo.',true)}
    a.say('Protegendo as chaves…');
    await writeLock(ent,pin);await DB.set('guard',{fails:0,until:0});
    // Sem isso, o navegador pode apagar os dados quando faltar espaço no aparelho.
    if(navigator.storage&&navigator.storage.persist)navigator.storage.persist().catch(()=>{});
    await startSession(ent,lang);draft=null;
    await openAnim();enterApp();toast(from==='sRecover'?'Identidade recuperada':APP.createdMsg);
  }});
}
async function showLock(msg){
  const meta=await DB.get('meta'),hasPin=pinOn=!!await DB.get('lock');
  show('sPin');$('#pinOrb').classList.remove('opening');
  $('#pinTitle').textContent=hasPin?'Digite seu PIN':'Use a biometria';
  $('#pinSub').textContent=meta?shortDid(meta.did):'';
  $('#pinLink').textContent=hasPin?'Esqueci meu PIN':'Recuperar com as 12 palavras';$('#pinLink').onclick=()=>goRecover('lock');
  const pad=makePad($('#pinPad'),{onPin:async(pin,a)=>{
    a.say('Abrindo…');
    let r;
    try{r=await unlockWithPin(pin)}
    catch{return a.reset('A chave deste aparelho sumiu. Recupere com as 12 palavras.',true)}
    if(r.wait)return a.reset(`Aguarde ${r.wait} s para tentar de novo.`,true);
    if(r.wiped){toast('Dados apagados após 10 tentativas erradas',true);return show('sWelcome')}
    if(!r.ent)return a.reset(pinFailMsg(r.fails),true);
    await startSession(r.ent,meta.lang);
    await openAnim();enterApp();
  }});
  // Só biometria: o teclado some e não recebe dígitos, mas a área de mensagens continua.
  $('#pinPad').classList.toggle('nopin',!hasPin);
  if(!hasPin)activePad=null;
  if(msg)pad.say(msg);
  const bio=$('#bioBtn');
  bio.hidden=!await DB.get('bioLock');
  bio.classList.toggle('ghost',hasPin);
  bio.onclick=async()=>{
    bio.disabled=true;pad.say('Confirme com a biometria…');
    let ent;
    try{ent=await unlockWithBio()}catch(e){bio.disabled=false;return pad.reset(bioErrMsg(e,hasPin),true)}
    bio.disabled=false;pad.say('Abrindo…');
    await startSession(ent,meta.lang);
    await openAnim();enterApp();
  };
}
function openAnim(){
  return new Promise(r=>{
    if(matchMedia('(prefers-reduced-motion: reduce)').matches)return r();
    const o=$('#pinOrb');o.classList.remove('opening');void o.offsetWidth;o.classList.add('opening');setTimeout(r,650);
  });
}
function lockNow(msg){
  if(!ses)return;
  if(ses.ent)ses.ent.fill(0);ses=null;
  if($('#sheet').classList.contains('open')){sheetClose=null;closeSheet()}
  APP.onLock();
  showLock(msg);
}
$('#lockBtn').onclick=()=>lockNow();

/* ================= navegação ================= */
function enterApp(){show('sApp');$('#didShort').textContent=shortDid(ses.did);APP.enter()}
function setView(v){
  document.querySelectorAll('.view').forEach(x=>x.classList.toggle('on',x.id===v));
  document.querySelectorAll('.dock [data-v]').forEach(b=>b.setAttribute('aria-current',b.dataset.v===v));
  scrollTo(0,0);APP.onView&&APP.onView(v);
}
document.querySelectorAll('.dock [data-v]').forEach(b=>b.onclick=()=>setView(b.dataset.v));

/* ================= ajustes comuns ================= */
function mountCommonSettings(el){
  el.innerHTML=`<div class="sec-h">Segurança</div>
  <div class="list glass flat">
    <button class="tx" data-cs="words"><span class="dot" data-ic="note"></span><span class="t"><b>Ver as 12 palavras</b><small id="csWordsHow">Pede o PIN</small></span>${ic('chev')}</button>
    <button class="tx" data-cs="pin"><span class="dot" data-ic="key"></span><span class="t"><b>Trocar PIN</b><small>Pede o PIN atual</small></span>${ic('chev')}</button>
    <button class="tx" data-cs="bio" hidden><span class="dot" data-ic="shield"></span><span class="t"><b>Desbloqueio por biometria</b><small>Digital ou rosto, pelo chip de segurança do aparelho</small></span><span class="rv" id="csBio"></span></button>
    <button class="tx" data-cs="bioOnly" hidden><span class="dot" data-ic="lock"></span><span class="t"><b>Usar só biometria</b><small>Apaga o PIN deste aparelho</small></span><span class="rv" id="csBioOnly"></span></button>
    <button class="tx" data-cs="auto"><span class="dot" data-ic="clock"></span><span class="t"><b>Bloqueio automático</b><small>Sem uso por este tempo, tudo fecha</small></span><span class="rv" id="csAuto"></span></button>
    <button class="tx" data-cs="lock"><span class="dot" data-ic="lock"></span><span class="t"><b>Bloquear agora</b></span></button>
  </div>
  <div class="sec-h">Backup</div>
  <div class="list glass flat">
    <button class="tx" data-cs="export"><span class="dot" data-ic="copy"></span><span class="t"><b>Copiar backup cifrado</b><small>Só abre com as 12 palavras</small></span>${ic('chev')}</button>
    <button class="tx" data-cs="import"><span class="dot" data-ic="restore"></span><span class="t"><b>Restaurar backup</b><small>${APP.importHint}</small></span>${ic('chev')}</button>
  </div>
  <div class="sec-h" data-install hidden>Aplicativo</div>
  <div class="list glass flat" data-install hidden>
    <button class="tx" data-cs="install"><span class="dot" data-ic="plus"></span><span class="t"><b>Instalar no celular</b><small>Abre como app, inclusive sem internet</small></span>${ic('chev')}</button>
  </div>
  <div class="sec-h">Sobre</div>
  <div class="list glass flat">
    <button class="tx" data-cs="how"><span class="dot" data-ic="shield"></span><span class="t"><b>Como funciona</b></span>${ic('chev')}</button>
    <button class="tx danger" data-cs="wipe"><span class="dot" style="background:rgba(194,65,47,.1);color:var(--out)" data-ic="trash"></span><span class="t"><b>Apagar tudo deste aparelho</b><small>Recuperável só com as 12 palavras e um backup</small></span></button>
  </div>
  <p class="ver" id="csVer">${APP.label} · versão ${APP_VERSION}</p>`;
  paintIcons(el);refreshInstall();refreshBio();
  $('#csAuto').textContent=autoMin()+' min';
  el.onclick=e=>{const b=e.target.closest('[data-cs]');if(b)CS[b.dataset.cs]()};
}
/* PIN pedido com a sessão aberta: usa o mesmo contador de tentativas do desbloqueio. */
async function sessionPin(pin,a){
  a.say('Conferindo…');
  let r;
  try{r=await unlockWithPin(pin)}catch{a.reset('A chave deste aparelho sumiu. Recupere com as 12 palavras.',true);return false}
  if(r.wait){a.reset(`Aguarde ${r.wait} s para tentar de novo.`,true);return false}
  if(r.wiped){
    closeSheet();if(ses&&ses.ent)ses.ent.fill(0);ses=null;APP.onLock();
    show('sWelcome');toast('Dados apagados após 10 tentativas erradas',true);return false;
  }
  if(!r.ent){a.reset(pinFailMsg(r.fails),true);return false}
  r.ent.fill(0);return true;
}
/* Confirma quem está usando: pelo PIN ou, sem PIN, pela biometria. A folha do PIN abre já no clique. */
async function reauth(title){
  if(!pinOn){
    try{(await unlockWithBio()).fill(0);return true}
    catch(e){toast(e&&e.name==='NotAllowedError'?'Biometria cancelada':bioErrMsg(e,false),true);return false}
  }
  return new Promise(res=>{
    openSheet(`<div style="text-align:center"><h3>${title}</h3><p class="sub">Confirme com seu PIN.</p><div id="raPad"></div></div>`,()=>res(false));
    makePad($('#raPad'),{onPin:async(pin,a)=>{if(await sessionPin(pin,a))res(true)}});
  });
}
async function refreshBio(){
  const row=document.querySelector('[data-cs="bio"]');if(!row)return;
  const on=!!await DB.get('bioLock'),pin=pinOn;
  row.hidden=!on&&!await bioAvailable();
  $('#csBio').textContent=on?'Ativado':'Desativado';
  document.querySelector('[data-cs="bioOnly"]').hidden=!on;
  $('#csBioOnly').textContent=pin?'Desativado':'Ativado';
  document.querySelector('[data-cs="pin"]').hidden=!pin;
  $('#csWordsHow').textContent=pin?'Pede o PIN':'Pede a biometria';
}
/* Novo PIN digitado duas vezes no teclado da folha; T é o título que acompanha os passos. */
function newPinSteps(T,onDone){
  let first=null;
  return async(pin,a)=>{
    if(!first){if(weakPin(pin))return a.reset(WEAK_MSG,true);first=pin;T.textContent='Repita o novo PIN';return a.reset()}
    if(pin!==first){first=null;T.textContent='Novo PIN';return a.reset('Os PINs não conferem. Digite o novo PIN de novo.',true)}
    a.say('Salvando…');await writeLock(ses.ent,pin);await DB.set('guard',{fails:0,until:0});onDone();
  };
}
const CS={
  async words(){
    if(!await reauth('Ver as 12 palavras'))return;
    const words=await entropyToWords(ses.ent,ses.lang);
    openSheet(`<h3>As 12 palavras</h3><p class="sub">Confira que ninguém está olhando a tela.</p><ol class="words glass veil" id="swGrid">${words.map(w=>`<li>${w}</li>`).join('')}</ol><div class="reveal"><button class="link" id="swT" style="margin:0">Mostrar palavras</button></div><button class="btn ghost" id="swClose">Fechar</button>`);
    $('#swT').onclick=()=>{const g=$('#swGrid');g.classList.toggle('veil');$('#swT').textContent=g.classList.contains('veil')?'Mostrar palavras':'Esconder palavras'};
    $('#swClose').onclick=closeSheet;
  },
  pin(){
    let next=null;
    openSheet(`<div style="text-align:center"><h3 id="cpT">Digite o PIN atual</h3><p class="sub" id="cpS">Para trocar, confirme quem você é.</p><div id="cpPad"></div></div>`);
    makePad($('#cpPad'),{onPin:async(pin,a)=>{
      if(next)return next(pin,a);
      if(!await sessionPin(pin,a))return;
      $('#cpT').textContent='Novo PIN';$('#cpS').textContent='Seis dígitos, sem sequências.';
      next=newPinSteps($('#cpT'),()=>{closeSheet();toast('PIN alterado')});a.reset();
    }});
  },
  auto(){const opts=[1,3,5,10,30],n=opts[(opts.indexOf(autoMin())+1)%opts.length];store.set('auto',n);$('#csAuto').textContent=n+' min';toast(`Bloqueia após ${n} min sem uso`)},
  lock(){lockNow()},
  async bio(){
    const L=await DB.get('bioLock');
    if(L){
      if(!pinOn)return toast('Sem PIN, a biometria é a única entrada. Desligue antes "Usar só biometria".',true);
      if(!await confirmSheet('Desativar biometria','O desbloqueio volta a ser só pelo PIN. A passkey pode ser removida no gerenciador de senhas do aparelho.','Desativar'))return;
      forgetPasskey(b64u.dec(L.cred));await DB.del('bioLock');refreshBio();toast('Biometria desativada');return;
    }
    if(!await reauth('Ativar biometria'))return;
    closeSheet();
    try{await enableBio(ses.ent)}
    catch(e){
      return toast(e&&e.code==='noprf'?'Este aparelho não oferece biometria com chave de cifragem. Continue usando o PIN.'
        :e&&e.name==='NotAllowedError'?'Biometria cancelada':'Não foi possível ativar a biometria',true);
    }
    refreshBio();toast('Biometria ativada');
  },
  /* Apagar o PIN tira do aparelho a cópia que um código no navegador poderia testar por força bruta. */
  async bioOnly(){
    if(pinOn){
      if(!await confirmSheet('Usar só biometria','O PIN deste aparelho é apagado e só a digital ou o rosto abrem os dados. Se a biometria do aparelho mudar ou falhar, a entrada passa a ser só pelas 12 palavras. Confira que elas estão anotadas.','Apagar o PIN',true))return;
      // Abre de verdade pela biometria antes de apagar o PIN: um registro que não abre deixaria a pessoa sem entrada.
      try{(await unlockWithBio()).fill(0)}
      catch(e){return toast(e&&e.name==='NotAllowedError'?'Biometria cancelada. O PIN continua ativo.':bioErrMsg(e,true),true)}
      await DB.del('lock');await DB.del('guard');pinOn=false;refreshBio();toast('PIN apagado. Só a biometria abre os dados');return;
    }
    if(!await reauth('Criar PIN'))return;
    openSheet(`<div style="text-align:center"><h3 id="cpT">Novo PIN</h3><p class="sub">O PIN volta a abrir os dados, junto com a biometria.</p><div id="cpPad"></div></div>`);
    makePad($('#cpPad'),{onPin:newPinSteps($('#cpT'),()=>{closeSheet();refreshBio();toast('PIN criado')})});
  },
  async export(){
    const b=await seal(ses.vaultKey,{v:1,app:APP.db,did:ses.did,at:Date.now(),data:await APP.exportData()},'backup');
    const txt=['scb1',b.iv,b.ct].join('.');
    openSheet(`<h3>Backup cifrado</h3><p class="sub">Guarde este texto onde quiser, como e-mail ou nuvem. Ele só abre com as 12 palavras desta identidade.</p><label class="f"><span>Backup</span><textarea class="mono" rows="6" readonly id="bkT">${txt}</textarea></label><button class="btn" id="bkC">Copiar backup</button>`);
    $('#bkC').onclick=()=>copy(txt,'Backup copiado');
  },
  import(){
    openSheet(`<h3>Restaurar backup</h3><p class="sub">${APP.importHint}.</p><label class="f" id="riF"><span>Backup</span><textarea class="mono" rows="6" id="riT" spellcheck="false" placeholder="scb1.…"></textarea></label><p class="hint" id="riH"></p><button class="btn" id="riGo">Restaurar</button>`);
    $('#riGo').onclick=async()=>{
      const p=$('#riT').value.trim().split('.'),H=$('#riH');
      const fail=m=>{H.textContent=m;H.classList.add('bad');shake($('#riF'))};
      if(p.length!==3||p[0]!=='scb1')return fail('Isso não parece um backup. Ele começa com scb1.');
      let d;try{d=await unseal(ses.vaultKey,{iv:p[1],ct:p[2]},'backup')}catch{return fail('Este backup pertence a outra identidade ou foi alterado.')}
      if(d.app&&d.app!==APP.db)return fail('Este backup é de outro serviço.');
      const msg=await APP.importData(d.data);closeSheet();toast(msg);
    };
  },
  install(){promptInstall()},
  how(){openSheet(`<h3>Como funciona</h3><div class="prose">${APP.howHtml}</div><button class="btn ghost" id="howClose">Entendi</button>`);$('#howClose').onclick=closeSheet},
  async wipe(){
    if(!await confirmSheet('Apagar tudo deste aparelho','A identidade, as chaves e todos os dados somem daqui. Para voltar, você precisará das 12 palavras e de um backup.','Apagar tudo',true))return;
    if(ses&&ses.ent)ses.ent.fill(0);ses=null;APP.onLock();await DB.clear();show('sWelcome');toast('Tudo apagado');
  }
};

/* ================= início ================= */
async function supports(){
  try{if(!window.isSecureContext||!S)return false;await S.generateKey({name:'Ed25519'},false,['sign','verify']);await S.generateKey({name:'X25519'},false,['deriveBits']);return true}catch{return false}
}
/* ================= app instalável (PWA) ================= */
let installEvt=null;
const isStandalone=()=>matchMedia('(display-mode: standalone)').matches||navigator.standalone===true;
const isIOS=()=>/iphone|ipad|ipod/i.test(navigator.userAgent)||(navigator.platform==='MacIntel'&&navigator.maxTouchPoints>1);
function refreshInstall(){
  const can=!isStandalone()&&(!!installEvt||isIOS());
  document.querySelectorAll('[data-install]').forEach(e=>e.hidden=!can);
}
addEventListener('beforeinstallprompt',e=>{e.preventDefault();installEvt=e;refreshInstall()});
addEventListener('appinstalled',()=>{installEvt=null;refreshInstall();toast('Aplicativo instalado')});
async function promptInstall(){
  if(installEvt){
    const e=installEvt;installEvt=null;
    await e.prompt();await e.userChoice.catch(()=>null);refreshInstall();return;
  }
  openSheet(`<h3>Instalar no iPhone ou iPad</h3><div class="prose">
    <p>1. No Safari, toque em <b>Compartilhar</b>, o quadrado com a seta para cima.</p>
    <p>2. Escolha <b>Adicionar à Tela de Início</b> e confirme.</p>
    <p>No iPhone, o app instalado guarda os dados separado do Safari. Crie ou recupere a identidade <b>dentro do app</b>, depois de instalar.</p></div>
    <button class="btn ghost" id="insClose">Entendi</button>`);
  $('#insClose').onclick=closeSheet;
}
$('#goInstall').onclick=promptInstall;
async function boot(){
  applyTheme();refreshInstall();
  if('serviceWorker' in navigator)navigator.serviceWorker.register('sw.js').catch(()=>{});
  if(!await supports()){$('#unsupported').hidden=false;$('#goCreate').disabled=true;$('#goRecover').disabled=true;return show('sWelcome')}
  try{await DB.db()}catch{DB._mem=new Map();toast('Armazenamento indisponível: os dados vão durar só esta sessão',true)}
  const meta=await DB.get('meta'),lock=await DB.get('lock')||await DB.get('bioLock');
  if(meta&&lock)showLock();else show('sWelcome');
}

