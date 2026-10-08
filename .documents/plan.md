# Plano: carteira para amigos, família e clientes

> **Documento histórico.** Descreve o projeto na época em que foi escrito e não é atualizado. A versão atual (0.23.0) está no [README da documentação](README.md).

Data: 2026-10-01

## Objetivo

Tornar a carteira útil no dia a dia dos círculos de confiança do Celso: amigos, família e clientes da Systekna. **O mesmo app serve aos dois ambientes, familiar e comercial**, sem misturar um com o outro. Ficam de fora os usos que dependem de lei ou de órgão externo (ICP-Brasil, gov.br, atos notariais, diplomas, meia-entrada).

## Modelo: emissores e grupos

Não existe um emissor central. **Cada pessoa que quiser pode ter o próprio emissor** e, nele, organizar grupos.

```
Emissor do Celso (DID do emissor do Celso)          Emissor do Amigo A (DID do emissor do A)
 ├─ grupo Família ── Mãe, Irmã, Celso                ├─ grupo Família ── ...
 ├─ grupo Amigos ─── Amigo A, Amigo B                └─ grupo Futebol ── Amigo B, Celso
 └─ grupo Trabalho ─ ...

A carteira do Amigo B guarda: "Amigos" (do emissor do Celso) + "Futebol" (do emissor do A)
```

- **Emissor** = a fonte de confiança de uma pessoa. Tem DID e nome próprios ("Emissor do Celso") e é independente dos outros.
- **Grupo** = uma divisão dentro do emissor (Família, Amigos, Futebol). Quem define os grupos é o dono do emissor.
- **Uma credencial por grupo** (`MembroDoGrupo`), e não uma credencial com a lista de grupos. Assim dá para revogar a pessoa de um grupo sem afetar os outros, e ela mostra só o grupo que interessa: provar "sou da Família" não revela que também é de "Trabalho".
- **Uma pessoa pode estar em grupos de vários emissores.** A carteira guarda credenciais de emissores diferentes e mostra cada uma com o nome do emissor e do grupo.
- **Ser emissor e titular ao mesmo tempo:** o Celso usa o emissor (DID de emissor) e também uma carteira (DID pessoal). São identidades separadas, com 12 palavras separadas. Assim, perder o celular pessoal não compromete o emissor.
- **A confiança é opcional e local.** Cada carteira decide em quais emissores confia. Confiar no emissor do Amigo A não faz ninguém confiar automaticamente nos emissores em que o A confia (sem confiança transitiva).
- **O transporte** é por copiar e colar pelo WhatsApp. O QR Code continua adiado.

### Grupo de clientes

Clientes entram como mais um grupo, mas a relação é comercial, e isso muda três coisas:

- **Emissor separado (recomendado):** um "Emissor Systekna", da empresa, diferente do emissor pessoal do Celso, cada um com as próprias 12 palavras. Os clientes confiam só no emissor da empresa, e a família só no pessoal. Se a chave de um vazar, o outro não é afetado, e a empresa pode passar o emissor a um sócio ou funcionário sem entregar a identidade pessoal do Celso.
- **LGPD:** aqui a Systekna é controladora dos dados. A credencial de cliente leva só o necessário (nome ou razão social e grupo). Nada de CPF, endereço ou dados do contrato.
- **Combinados com valor jurídico:** orçamentos e aceites assinados pela carteira podem valer entre as partes com base na MP 2.200-2/2001, art. 10, § 2º, desde que as partes aceitem o meio (a Lei 14.063/2020 trata de interações com órgãos públicos). Por isso o contrato com o cliente **precisa** dizer que as partes aceitam esse meio. Confirmar com um advogado antes do primeiro uso.

Usos com clientes, aproveitando as fases deste plano:

| Fase | Uso com clientes |
|---|---|
| F1 | Credencial "Cliente Systekna" e conferência de quem está falando (contra golpe de falso fornecedor ou falso cliente) |
| F2 | Orçamento proposto, aceite do cliente e quitação, todos assinados |
| F4 | Envio de senhas, chaves de acesso e documentos cifrados para o cliente certo |
| F5 | Login no portal do cliente sem senha, aceitando só o grupo "Clientes" do Emissor Systekna |

A F3 (recuperação com ajuda da família) não se aplica a clientes: ele recupera a carteira com a família dele, não com a Systekna.

**O que já existe:** o emissor tem DID próprio, emite credenciais, revoga e tem uma lista de emissores confiáveis (`st.trust` em `src/emissor/app.js`). **O que falta:** grupos dentro do emissor, e uma lista de emissores confiáveis na carteira, que hoje não confere quem emitiu.

## Uso familiar e comercial no mesmo app

O app é um só. A separação entre os dois ambientes vem de três camadas:

| Camada | Familiar | Comercial |
|---|---|---|
| **Emissor** | Emissor pessoal do Celso | Emissor Systekna (da empresa), com 12 palavras próprias |
| **Grupo** | Família, Amigos | Clientes, Fornecedores, Equipe |
| **Perfil na carteira** | Perfil "Pessoal" | Perfil "Profissional" |

**Perfis na carteira:** uma pessoa pode ter mais de uma identidade na mesma carteira, por exemplo "Pessoal" e "Profissional".

- **Um backup só:** todos os perfis saem das mesmas 12 palavras, por caminhos de derivação diferentes no HKDF. O perfil 0 mantém os rótulos atuais (`ssi/ed25519`, `ssi/x25519`), para que as identidades que já existem não mudem. Os outros perfis usam `perfil/<n>/ssi/ed25519` e assim por diante.
- **DIDs sem ligação entre si:** quem vê o DID profissional não descobre o pessoal, e vice-versa. Um cliente não fica sabendo dos grupos familiares de ninguém.
- **Tudo é separado por perfil:** credenciais, agenda, emissores confiáveis, combinados e mensagens. Trocar de perfil é como trocar de carteira.
- **Indicação visual sempre presente** do perfil ativo (nome e cor), para não mandar algo profissional pelo perfil pessoal.

**Requisitos extras do uso comercial:**
- Termos de uso e política de privacidade publicados, e um encarregado de dados indicado (LGPD, art. 41).
- Contratos com clientes que digam que as partes aceitam a assinatura da carteira (F2).
- Backup e guarda do emissor da empresa (ver as pendências transversais).
- Mais adiante: mais de um operador no emissor da empresa, cada um com a própria chave e com os atos assinados por quem os fez. Fica fora deste plano por enquanto.

## Regras de trabalho

- Uma fase de cada vez, só depois de aprovada.
- O código fica em `src/`. Os HTML da raiz são gerados por `npm run build` e nunca são editados à mão.
- Cada recurso ganha testes E2E em `tests/e2e/`. Cada correção ganha um teste que falha na versão anterior.
- Cada formato novo de token tem `typ` próprio, prazo e conferência de assinatura no núcleo (`src/shared/nucleo.js`).
- Ao fim de cada fase: atualizar `identidade-soberana-systekna-arquitetura.md` e `docs/`.

## Visão geral

| Fase | Entrega | Por que nessa ordem | Esforço |
|---|---|---|---|
| F0 | Domínio próprio para a carteira e o emissor | Sem isso, outros sites da conta alcançam os dados da família e dos clientes | Baixo |
| F1 | Grupos, emissores confiáveis e agenda de contatos | Base de todas as outras: saber quem é quem e de qual grupo | Médio |
| F2 | Recibos e combinados assinados | Útil logo e fácil de explicar à família | Baixo |
| F3 | Recuperação com ajuda da família | Precisa estar pronta antes de entregar a carteira a pessoas menos técnicas | Médio |
| F4 | Mensagens e arquivos cifrados com remetente | Já existe a cifragem; falta provar quem enviou | Médio |
| F5 | Login nos serviços da casa | Depende de um servidor; é o maior esforço | Médio |
| F6 | Cadastro KYC lacrado em envelope | Reaproveita a divisão de chave da F3 e a cifragem da F4 | Alto |

---

## F0. Domínio próprio

**Problema:** no GitHub Pages, a carteira e o emissor dividem a origem `celsoalmeidalf.github.io` com os outros sites da conta (cripto-sim, cambio-sim, systekna). O armazenamento do navegador é por origem, então um erro ou script em qualquer um desses sites alcança as identidades e os cofres da família e dos clientes.

**Entregas:**
1. Um subdomínio para cada serviço (por exemplo, `carteira.<domínio>` e `emissor.<domínio>`), com HTTPS.
2. Publicação automática a partir do `main`, como hoje no Pages.
3. O site atual do Pages continua como demonstração, com aviso de que não serve para identidades reais.

**Critérios de aceite:**
- [ ] A suíte E2E passa contra os endereços novos (`BASE_URL=<endereço> npm run test:e2e`).
- [ ] Carteira e emissor ficam em origens diferentes entre si e diferentes de qualquer outro site.

**Depende de:** escolher e registrar o domínio. Nenhuma carteira é entregue a outra pessoa, da família ou cliente, antes desta fase.

---

## F1. Grupos, emissores confiáveis e agenda de contatos

**Problema:** hoje o emissor não tem grupos, a carteira não sabe em quais emissores confiar e, para cifrar uma mensagem ou conferir alguém, é preciso colar a chave da pessoa toda vez.

**Entregas no emissor:**
1. **Nome do emissor** (já existe `st.name`, por exemplo "Emissor do Celso").
2. **Grupos:** criar, renomear e arquivar grupos, e ver quem está em cada um.
3. **Credencial `MembroDoGrupo`:** grupo, nome, apelido e a chave X25519 do titular (o emissor já vem no `iss`). Uma por grupo, com revogação individual e **validade obrigatória** (`exp`, padrão 6 meses, escolhido por grupo).
   - Sem lista de status publicada, a revogação só é vista pelo próprio emissor. A carteira e a agenda dos outros não sabem que alguém saiu do grupo (ou deixou de ser cliente). A validade curta é o que limita esse tempo.
   - **Renovação:** perto do vencimento, a carteira avisa e gera um pedido de renovação. O emissor renova com um toque, se a pessoa continua no grupo.
4. **Convite do emissor** (`emissor+jwt`, assinado pelo emissor): DID e nome do emissor, para quem quiser confiar nele.

**Entregas na carteira:**
5. **Emissores confiáveis:** importar um convite, ver os emissores aceitos e remover. Credenciais de emissores não aceitos ficam marcadas como "emissor desconhecido".
6. **Credenciais agrupadas por emissor e grupo:** "Emissor do Celso → Amigos", "Emissor do A → Futebol".
7. **Cartão de contato** (`contato+jwt`, assinado pelo dono): DID, chave X25519, apelido e as credenciais de grupo que a pessoa escolher mostrar.
8. **Agenda:** importar cartões, conferir a assinatura e mostrar os selos dos grupos (só de emissores confiáveis, com credencial no prazo e emitida **para o dono do cartão**: o `sub` da credencial tem de ser igual ao `iss` do cartão); renomear e remover contatos; filtrar por emissor e grupo.
9. **Conferir uma pessoa:** a partir da agenda, gerar um desafio e conferir a resposta. Serve contra o golpe do "troquei de número".
10. **Perfis:** criar, renomear e trocar de perfil ("Pessoal", "Profissional"), com a derivação descrita em "Uso familiar e comercial no mesmo app". Se a F1 ficar grande demais, os perfis podem virar uma fase própria antes dela.

**Guia de entrada:** dois roteiros curtos. "Quero entrar num grupo": instalar, criar a identidade, anotar as palavras, aceitar o convite do emissor e mandar o cartão. "Quero ter o meu emissor": abrir o emissor, anotar as palavras do emissor (separadas das pessoais), criar os grupos e mandar os convites.

**Arquivos:** `src/shared/nucleo.js` (tipos `emissor+jwt` e `contato+jwt`, conferência), `src/emissor/app.js` (grupos, `MembroDoGrupo`, convite), `src/carteira/app.js` e `src/shared/telas.html` (emissores confiáveis, agenda).

**Critérios de aceite:**
- [ ] O emissor cria grupos e emite uma credencial por grupo para a mesma pessoa.
- [ ] Revogar a pessoa do grupo "Amigos" não afeta a credencial dela em "Família".
- [ ] A carteira guarda credenciais de dois emissores diferentes e mostra cada uma no emissor e no grupo certos.
- [ ] Uma credencial de emissor não aceito aparece como "emissor desconhecido".
- [ ] Confiar no emissor A não faz confiar nos emissores em que A confia.
- [ ] Um cartão de contato mostra só os grupos que o dono escolheu.
- [ ] Um cartão com assinatura alterada é recusado.
- [ ] Um cartão que anexa a credencial de outra pessoa (`sub` diferente do `iss` do cartão) não ganha o selo.
- [ ] Uma credencial vencida perde o selo na agenda e aparece como "vencida" na carteira do titular.
- [ ] O emissor recusa emitir `MembroDoGrupo` sem validade.
- [ ] O perfil 0 continua com o mesmo DID de antes da mudança (identidades existentes não mudam).
- [ ] Dois perfis das mesmas 12 palavras têm DIDs diferentes, e recuperar as palavras devolve os dois.
- [ ] Credenciais, agenda e emissores confiáveis de um perfil não aparecem no outro.
- [ ] O desafio "conferir pessoa" é aprovado para o dono do DID e recusado para qualquer outro.
- [ ] Agenda e emissores confiáveis ficam cifrados no cofre e sobrevivem a bloquear e desbloquear.

---

## F2. Recibos e combinados assinados

**Problema:** empréstimos e acordos entre amigos ficam só na palavra ou numa conversa que pode ser apagada.

**Fluxo:**
```
A redige o combinado ──(proposta assinada por A)──▶ B
B confere e aceita ───(aceite assinado por B)─────▶ A
Mais tarde, quem tem a receber ──(quitação assinada)──▶ a outra parte
```

**Formatos:**
- `combinado+jwt`: `iss` = A, `partes` = [DID de A, DID de B], `credor` = DID de quem tem a receber (opcional; sem ele, o combinado não tem quitação), `titulo`, `texto`, `valor` (opcional), `vencimento` (opcional), `iat`, `jti`.
- `aceite+jwt`: `iss` = B, `ref` = SHA-256 da proposta, `iat`.
- `quitacao+jwt`: `iss` = o `credor` do combinado, `ref` = SHA-256 da proposta, `iat`, observação opcional.
- **`ref`** é o SHA-256, em base64url, do texto JWT exato da proposta (as três partes separadas por ponto, sem espaços). Qualquer mudança na proposta muda o `ref`.

**Entregas:**
1. Tela "Combinados" na carteira: novo, recebidos, aceitos e quitados.
2. Conferência completa: assinaturas, `ref` batendo com a proposta e assinantes iguais às partes.
3. **Pacote de prova:** proposta, aceite e quitação num único texto que qualquer carteira consegue conferir.
4. Uso da agenda da F1 para escolher a outra parte.

**Critérios de aceite:**
- [ ] Combinado proposto, aceito e quitado aparece como "quitado" nas duas carteiras.
- [ ] Um aceite que referencia outra proposta é recusado.
- [ ] Um aceite assinado por quem não é parte é recusado.
- [ ] Alterar uma letra do texto invalida o pacote de prova.
- [ ] A quitação só vale se assinada pelo `credor` do combinado.
- [ ] Um combinado sem `credor` não oferece quitação.
- [ ] Um combinado sem a cláusula de aceite do meio eletrônico não pode ser enviado.

**Nota (confirmar com um advogado):** a Lei 14.063/2020 trata de assinaturas em interações com órgãos públicos. Entre particulares, a base é a MP 2.200-2/2001, art. 10, § 2º, que admite outros meios de comprovar autoria e integridade quando as partes os aceitam. Por isso a cláusula "as partes aceitam este meio eletrônico de assinatura" é **obrigatória** no texto padrão, e não um extra.

---

## F3. Recuperação com ajuda da família

**Problema:** quem perde as 12 palavras perde a identidade. Para pessoas menos técnicas, esse é o maior risco.

**Proposta:** dividir a entropia de 128 bits das 12 palavras com **Shamir em GF(256)**, num esquema *k de n* (padrão 3 de 5). Cada parte é cifrada para a chave X25519 do guardião escolhido na agenda.

**Decisão a registrar:** formato próprio (`sparte1`) ou SLIP-39. O SLIP-39 é padrão e tem vetores oficiais, mas é bem mais complexo. Recomendação: formato próprio, mais simples, com índice, `k`, identificador do conjunto e soma de verificação. Ponto a confirmar antes de começar a F3.

**Entregas:**
1. Em Ajustes: "Configurar recuperação", com escolha dos guardiões na agenda, de *k* e de *n*.
2. Para cada guardião, uma mensagem cifrada que só ele abre, guardada na carteira dele (seção "Partes que guardo para outros").
3. Recuperação: a pessoa, num aparelho novo, pede as partes; cada guardião confere a identidade dela **por fora** (ligação ou pessoalmente) e devolve a parte; com *k* partes a identidade volta.
4. Refazer a divisão invalida as partes antigas (novo identificador de conjunto).

**Critérios de aceite:**
- [ ] Quaisquer *k* partes recuperam exatamente as mesmas 12 palavras e o mesmo DID.
- [ ] *k − 1* partes não recuperam nada e a tela explica quantas faltam.
- [ ] Partes de conjuntos diferentes não se misturam.
- [ ] Uma parte alterada é detectada pela soma de verificação.
- [ ] Teste de propriedade com muitas entropias aleatórias e todas as combinações de *k* em *n*.

**Riscos:**
- Engenharia social: alguém finge ser a pessoa para pegar as partes. Por isso a conferência por fora é obrigatória e o guia deve dizer isso com clareza.
- Guardiões que perdem a própria carteira: o *n* deve ter folga.

---

## F4. Mensagens e arquivos cifrados com remetente

**Situação atual:** `sealFor` e `openMsg` (formato `smsg1`) cifram para a chave X25519 do destinatário, mas **não dizem quem enviou**. Qualquer pessoa pode cifrar algo "em nome" de outra.

**Proposta, formato `smsg2`:**
- Assinar e depois cifrar: o remetente assina com Ed25519 um conteúdo que inclui o DID do destinatário (impede reencaminhar a mensagem a terceiros como se fosse para eles) e então cifra tudo.
- Ao abrir, a carteira mostra o remetente pelo apelido da agenda, ou "remetente desconhecido" com o DID.
- Arquivos: o mesmo envelope, gravado como **arquivo `.smsg` para baixar** e mandar como anexo (WhatsApp ou Google Drive). Colar como texto não serve: alguns MB em base64 passam do limite de uma mensagem do WhatsApp. Para abrir, a carteira lê o arquivo escolhido. O arquivo decifrado é baixado, nunca exibido inline. Limite inicial de 10 MB, conferido antes de cifrar.
- `smsg1` continua sendo aberto para compatibilidade.

**Critérios de aceite:**
- [ ] A mensagem aberta mostra o remetente correto.
- [ ] Uma mensagem reencaminhada para outra pessoa é recusada ("não foi escrita para você").
- [ ] Uma assinatura trocada é detectada.
- [ ] Um arquivo cifrado e decifrado volta idêntico, byte a byte.
- [ ] Um arquivo acima do limite é recusado antes de cifrar, com mensagem clara.
- [ ] Uma mensagem `smsg1` antiga continua abrindo.

---

## F5. Login nos serviços da casa

**Ideia:** "Entrar com carteira Systekna". O site gera um desafio (nonce, `aud` = domínio do site, prazo), a carteira mostra o domínio real de quem pede, a pessoa confirma com PIN ou biometria e a carteira devolve um `vp+jwt`. O servidor do site confere assinatura, nonce de uso único, `aud` e prazo, e abre a sessão com o DID como usuário. A conferência roda **no servidor**, nunca só na página.

**Entregas:**
1. Na carteira: a tela "Pedido de login", aberta por popup com o desafio na URL. Ela mostra o domínio real de quem pede, pede PIN ou biometria e devolve um `vp+jwt` por `postMessage` só para esse domínio.
2. Um site de exemplo com o botão "Entrar com carteira Systekna".
3. Um verificador em Node que reaproveita o núcleo e confere assinatura, nonce de uso único, `aud` e prazo. Cada serviço define quais emissores e grupos entram (por exemplo, só "Família" do emissor do Celso), usando a credencial `MembroDoGrupo` da F1.
4. Testes: login aprovado, nonce repetido, `aud` errado, desafio vencido e mensagem vinda de outro domínio.
5. Depois: redirecionamento no padrão OpenID4VP/SIOPv2 e a Digital Credentials API, para funcionar com outras carteiras.

**Depende de:** decidir onde os serviços da casa ficam hospedados (servidor próprio, VPS ou SHTTPS).

---

## F6. Cadastro KYC lacrado em envelope

**Ideia:** quando um cadastro exigir conferência de identidade (KYC), por exemplo de clientes, os dados pessoais nunca ficam guardados abertos. O emissor confere os documentos, emite uma **credencial verificável** dizendo só "identidade conferida" e guarda os dados num **envelope cifrado** que só pode ser aberto em hipóteses previstas (ordem judicial e outras a avaliar).

**Fluxo:**
```
1. Cliente manda os dados e documentos, cifrados para o emissor (formato da F4).
2. O operador confere na tela. Os dados abertos ficam só na memória e são apagados ao fim.
3. O emissor monta o envelope:
     dados  ──AES-256-GCM com uma chave aleatória (DEK)──▶ conteúdo cifrado
     DEK    ──Shamir k de n (F3)──▶ uma parte cifrada para cada custodiante
4. O emissor emite a credencial IdentidadeConferida para o cliente:
     grupo, nível da conferência, data, SHA-256 do envelope.
     Nenhum dado pessoal vai na credencial.
5. Ato no livro do emissor: "envelope lacrado", com o hash do envelope.
```

**Quem guarda as partes da chave (proposta de 2 de 3):**
- a Systekna (emissor da empresa);
- um custodiante independente (advogado ou contador);
- uma terceira parte a definir (outro sócio ou um cofre offline).

Nenhuma parte sozinha abre o envelope. Abrir exige duas pessoas concordando, e isso é o que garante, na prática, o "só em caso judicial".

**Abertura:**
1. Pedido registrado com motivo e base legal (ordem judicial, requisição de autoridade competente, defesa em processo, pedido do próprio titular e outras hipóteses a avaliar).
2. Cada custodiante confere o pedido e entrega a sua parte assinada.
3. Abrir gera um ato no livro do emissor (que já é encadeado por hash), com o motivo, quem autorizou, a data e o hash do envelope. O titular é avisado, salvo se a ordem judicial proibir.

**Direitos do titular (LGPD):**
- **Acesso:** o titular recebe uma cópia dos próprios dados, cifrada só para a chave dele. Ele não depende de abrir o envelope para ver o que a Systekna guardou.
- **Prazo de guarda:** cada envelope tem data de descarte. Vencido o prazo, os custodiantes apagam as suas partes da chave, o que torna o conteúdo irrecuperável (descarte criptográfico), e o descarte vira ato no livro.
- **Finalidade:** a credencial prova só "identidade conferida". Quem confere não vê os dados.

**Formatos:**
- `envelope-kyc` (`senv1`): versão, identificador, `k`, `n`, data de descarte, conteúdo cifrado e as partes cifradas para cada custodiante.
- Credencial `IdentidadeConferida`: `envelope` = SHA-256 do envelope, `nivel`, `conferidoEm`, `descarteEm`.
- `abertura+jwt`: pedido de abertura assinado, com o motivo e a referência ao envelope.

**Critérios de aceite:**
- [ ] O envelope não contém nenhum dado pessoal em claro, inclusive nos metadados.
- [ ] Uma parte da chave sozinha não abre o envelope; duas abrem.
- [ ] Alterar um byte do envelope faz o hash deixar de bater com a credencial.
- [ ] Toda abertura gera um ato no livro com motivo e autorizações; abrir sem esse registro não é possível pela interface.
- [ ] Depois do descarte das partes, o envelope não pode mais ser aberto.
- [ ] A cópia do titular abre só com a chave dele.

**Decisões a tomar antes da F6:**
- Quem serão os custodiantes, e se o esquema é 2 de 3 ou outro.
- Quais dados entram no cadastro (o mínimo necessário) e qual é o prazo de guarda.
- Política de abertura: lista fechada de hipóteses e quem decide os casos "a avaliar".
- Onde os envelopes ficam guardados (no emissor, em backup cifrado na nuvem, ou nos dois).
- Revisão jurídica da política. Se algum cliente for instituição financeira, a regra de KYC dele (Banco Central e Lei 9.613/1998) prevalece.

---

## Fora deste plano

- QR Code (adiado a pedido do Celso).
- Usos com exigência legal: governo, ICP-Brasil, atos notariais, diplomas, meia-entrada.
- Divulgação seletiva (SD-JWT), `did:web` e lista de status publicada. Voltam quando houver necessidade fora do círculo. Enquanto isso, a validade obrigatória da `MembroDoGrupo` (F1) limita o tempo em que uma revogação passa despercebida.

## Pendências transversais

- **Backup do emissor:** documentar como guardar as palavras do emissor, que é o ponto central da confiança da rede.
- **Emissor da empresa:** decidir se a Systekna terá um emissor próprio (recomendado) e onde ele roda. O ideal é um aparelho só para isso, com backup das palavras guardado na empresa.
- **Dados de saúde:** não colocar em credenciais até a F4 estar pronta.
