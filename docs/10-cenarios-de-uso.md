# 10. Cenários de Uso

> Como usar o que existe **hoje** (versão 0.6.0, F1 entregue) e o que só passa a valer em fases futuras do [`plan.md`](../plan.md).
> Três pontos de vista: a Systekna como empresa (Parte 1), o usuário da carteira (Parte 2) e a empresa cliente da Systekna (Parte 3).
> Legenda: ✅ funciona hoje · 🔜 depende de uma fase futura (indicada) · 💡 proposta ainda não planejada.

Em todos os cenários o transporte é manual: copiar o texto assinado e colar pelo WhatsApp ou e-mail. Não há servidor nem QR Code.

## Resumo

| # | Quem | Cenário | Estado |
|---|---|---|---|
| E1 | Empresa | Cliente confere que está falando com a Systekna de verdade | ✅ |
| E2 | Empresa | Conferir o cliente antes de uma ação sensível | ✅ |
| E3 | Empresa | Equipe e prestadores com acesso por prazo | ✅ |
| E4 | Empresa | Registrar contrato, orçamento ou entrega | ✅ |
| E5 | Empresa | Enviar senha ou chave de acesso ao cliente | ✅ (sem provar o remetente: 🔜 F4) |
| E6 | Empresa | Trilha de auditoria do que foi emitido e revogado | ✅ |
| E7 | Empresa | Orçamento, aceite e quitação assinados | 🔜 F2 |
| E8 | Empresa | Login no portal do cliente sem senha | 🔜 F5 |
| E9 | Empresa | Cadastro de cliente com identidade conferida e dados lacrados | 🔜 F6 |
| U1 | Usuário | Contra o golpe do "troquei de número" | ✅ |
| U2 | Usuário | Entrar no grupo da família e confiar no emissor | ✅ |
| U3 | Usuário | Provar que é membro de um grupo ou cliente | ✅ |
| U4 | Usuário | Mandar um segredo cifrado para alguém | ✅ |
| U5 | Usuário | Cofre de senhas e notas sem nuvem | ✅ |
| U6 | Usuário | Ter à mão os números dos documentos da família | ✅ parcial (melhoria 💡) |
| U7 | Usuário | Guardar o certificado de um documento registrado | ✅ |
| U8 | Usuário | Trocar de celular sem perder nada | ✅ |
| C1 | Empresa cliente | Provar quem fala em nome da empresa | ✅ |
| C2 | Empresa cliente | Reaproveitar o KYC com outros parceiros | ✅ parcial (revogação pública: 🔜 F7) |
| C3 | Empresa cliente | Sócios exercerem os direitos da LGPD | 🔜 F4 / F6 |
| C4 | Empresa cliente | Exigir a base KYC da Systekna lacrada | 🔜 F6 |
| C5 | Empresa cliente | KYC dos próprios clientes pela Systekna | 💡 extensão da F6 |

---

## Parte 1. Eu como empresa (Emissor Systekna)

**Pré-requisito:** um emissor só da empresa, com 12 palavras próprias e separado do emissor pessoal (ver "Grupo de clientes" no `plan.md`). Os grupos sugeridos são Clientes, Equipe e Fornecedores.

### E1. O cliente confere que está falando com a Systekna ✅

- **Situação:** chega ao cliente uma mensagem "da Systekna" com um boleto ou pedindo um acesso. Pode ser golpe de falso fornecedor.
- **Como fazer:**
  1. No emissor, crie o grupo **Clientes** e gere o **convite do emissor**. Mande o convite ao cliente uma única vez, no começo da relação.
  2. O cliente importa o convite na carteira. A partir daí o emissor Systekna fica marcado como confiável.
  3. A Systekna (pela carteira profissional do atendente) manda o **cartão de contato**. O cliente guarda na agenda.
  4. Na dúvida, o cliente usa **Conferir pessoa** com o contato Systekna. Só quem tem a chave do DID consegue responder.
- **O que garante:** quem respondeu controla a chave da Systekna que o cliente já tinha guardado. Um número novo ou um e-mail parecido não passa.
- **Limite:** o cliente precisa ter a carteira e ter guardado o contato **antes** do golpe.

### E2. Conferir o cliente antes de uma ação sensível ✅

- **Situação:** "sou o João da empresa X, troque o e-mail de acesso" ou "mande a senha do servidor".
- **Como fazer:**
  - Pelo emissor: **Verificar → Gerar desafio** exigindo `MembroDoGrupo`. O cliente apresenta a credencial pela carteira, e o emissor confere os até 10 pontos (assinatura, desafio, emissor, titular, revogação, validade…).
  - Ou pela carteira profissional: **Conferir pessoa** com o contato do cliente.
- **O que garante:** quem apresentou é o dono da credencial, agora (uma cópia antiga não passa), e a credencial não foi revogada.
- **Onde usar:** troca de dados bancários, liberação de acesso, pedido de cancelamento, envio de backup.

### E3. Equipe e prestadores com acesso por prazo ✅

- **Situação:** um freelancer trabalha 3 meses num projeto.
- **Como fazer:** crie o grupo **Equipe** com validade de 1 ou 3 meses e emita a credencial pelo pedido da carteira dele. Antes de passar um acesso, peça a apresentação (E2). Quando o contrato acabar, **revogue** com o motivo "fim do vínculo".
- **O que garante:** a credencial vence sozinha, a revogação aparece em qualquer verificação feita pelo emissor e fica no livro.
- **Limite:** os sistemas da empresa ainda não leem a credencial. O login automático é da F5.

### E4. Registrar contrato, orçamento ou entrega ✅

- **Situação:** entregar ao cliente um contrato em PDF, um orçamento ou um pacote de código (zip) e poder provar depois que o arquivo é exatamente aquele.
- **Como fazer:** **Documentos → Registrar documento** com o arquivo, o nome do requerente e, de preferência, o DID do cliente. O emissor guarda só o SHA-256 e entrega um **certificado** (credencial assinada). O cliente guarda o certificado na carteira (U7).
- **Depois:** **Conferir documento** com o arquivo e o certificado. Se mudou um byte, aparece "Documento não confere".
- **O que garante:** integridade e data do registro, assinados pelo emissor. O arquivo em si não sai do computador.
- **Limite jurídico:** vale entre as partes se o contrato disser que elas aceitam esse meio (MP 2.200-2/2001, art. 10, § 2º). Confirmar com advogado antes do primeiro uso. Ver [Pesquisa de legislação](09-pesquisa-legislacao.md).

### E5. Enviar senha ou chave de acesso ao cliente ✅ / 🔜 F4

- **Situação:** entregar a senha de um painel, um token de API ou uma chave de servidor.
- **Como fazer hoje:** na carteira, **Mensagens → Cifrar** para a chave de cifragem do cliente (ela vem no cartão de contato ou na credencial de grupo). Mande o texto `smsg1.…` pelo WhatsApp. Só a carteira do cliente decifra.
- **O que garante hoje:** sigilo. Quem intercepta o WhatsApp não lê.
- **O que falta (F4):** provar quem enviou. Hoje o cliente sabe que só ele lê, mas não tem prova de que veio da Systekna.

### E6. Trilha de auditoria ✅

- **Situação:** saber quem recebeu credencial, quando, o que foi verificado e o que foi revogado.
- **Como fazer:** **Painel → Livro**. Cada ato é encadeado e assinado. **Conferir integridade** aponta o primeiro ato alterado, se houver.
- **Onde usar:** prestação de contas a sócio, resposta a cliente ("quando foi o acesso?") e registro de LGPD.

### E7 a E9. O que vem depois

| Cenário | Fase | Uso na empresa |
|---|---|---|
| E7. Orçamento, aceite e quitação assinados | 🔜 F2 | O cliente assina o aceite pela carteira; a quitação sai assinada pela empresa |
| E8. Login no portal do cliente | 🔜 F5 | O portal aceita só o grupo Clientes do Emissor Systekna, sem senha |
| E9. Cadastro com identidade conferida | 🔜 F6 | A empresa confere os documentos uma vez, emite "identidade conferida" e guarda os dados lacrados em envelope |

### Cuidados da empresa

- **LGPD:** a credencial de cliente leva só nome ou razão social e o grupo. Nada de CPF, endereço ou dados do contrato.
- **As 12 palavras do emissor** são o ativo mais sensível da empresa. Guarde-as em papel, num lugar seguro e separado das palavras pessoais.
- **Um aparelho por emissor:** o emissor vive no navegador onde foi criado. Faça backup cifrado depois de cada sessão de emissões.

---

## Parte 2. Eu como usuário da carteira, hoje

### U1. Contra o golpe do "troquei de número" ✅

- **Situação:** a mãe recebe "filho, troquei de número, me faz um PIX".
- **Como fazer:**
  1. Antes (uma vez): os dois trocam **cartões de contato** e guardam na agenda.
  2. Na hora: a mãe abre o contato do filho, **Conferir pessoa**, e manda o desafio pelo número novo.
  3. Se a resposta não voltar ou não conferir, é golpe.
- **O que garante:** só quem tem a chave do DID do filho responde. Trocar de chip não troca a chave.
- **É o cenário mais forte para apresentar a carteira à família.**

### U2. Entrar no grupo da família e confiar no emissor ✅

- **Como fazer:** a carteira gera um **pedido** assinado. O dono do emissor (ex.: Celso) emite `MembroDoGrupo` do grupo Família. A pessoa recebe a credencial e importa o **convite do emissor**. A credencial passa a aparecer com selo.
- **Para que serve:** é a base de U1, U3 e U4. Os contatos que mostram a credencial Família aparecem com selo na agenda.

### U3. Provar que é membro de um grupo ou cliente ✅

- **Situação:** alguém (a empresa, um amigo com emissor) pede "prove que você é do grupo X".
- **Como fazer:** cole o **desafio** recebido em **Apresentar**. A carteira mostra quem pede, para quê e o que exige, e só lista as credenciais que servem. Mande a apresentação de volta.
- **O que garante:** a prova vale por 5 minutos e só para aquele desafio.

### U4. Mandar um segredo cifrado para alguém ✅

- **Exemplos:** senha do Wi-Fi para um parente, senha do streaming, número de um documento para o contador.
- **Como fazer:** **Mensagens → Cifrar** para a chave de cifragem do contato e mande o `smsg1.…` por qualquer canal.
- **Limite:** como em E5, ainda não prova quem enviou (🔜 F4).

### U5. Cofre de senhas e notas sem nuvem ✅

- **Como usar:** guarde senhas (com gerador de 20 caracteres), códigos de recuperação de 2FA, senha do Wi-Fi e combinações. Tudo fica cifrado no aparelho, com busca e cópia por campo.
- **Diferença para um gerenciador comum:** nada sai do aparelho. O backup é um texto cifrado que só a sua identidade abre (U8).

### U6. Ter à mão os números dos documentos da família ✅ parcial

- **Situação:** recepção do hospital pede o cartão SUS da mãe, a escola pede o RG do filho, a reserva pede o passaporte.
- **Como fazer hoje:** item **Documento** no cofre, com o título dizendo de quem e qual é (ex.: "SUS — Mãe"), o número (mascarado) e o órgão. Use o botão de copiar.
- **Limites hoje:** o tipo é genérico, a validade é texto livre (não avisa do vencimento), o CPF não é conferido e não guarda foto.
- **É só uma anotação sua:** não é prova de identidade e nenhum verificador aceita como credencial.
- **Melhoria proposta 💡:** campos **Titular** e **Tipo** (RG, CPF, CNH, Passaporte, SUS, Título, Outro), **validade como data** com o mesmo aviso de vencimento das credenciais, máscara e conferência do CPF. Na F4, botão **Enviar cifrado para contato**. Se nada disso entrar no curto prazo, avaliar remover o tipo, como foi feito com o cartão.

### U7. Guardar o certificado de um documento registrado ✅

- **Situação:** você recebeu de uma empresa (E4) o certificado do contrato que assinou.
- **Como fazer:** guarde o certificado na carteira. Em caso de dúvida, peça ao emissor que confira o arquivo com o certificado, ou confira você mesmo num emissor que confie no emissor de origem.

### U8. Trocar de celular sem perder nada ✅

- **Como fazer:** **Ajustes → Exportar backup cifrado** (`scb1.…`) e guarde o texto. No aparelho novo, **recupere pelas 12 palavras** e **restaure o backup**.
- **Atenção:** sem as 12 palavras, nada se recupera. Ninguém, nem a Systekna, guarda essas palavras.

---

## Parte 3. Eu como empresa cliente da Systekna

**Situação:** a sua empresa é cliente da Systekna, e a Systekna guarda numa base de KYC os documentos dos sócios e representantes (RG, CPF e outros) e os da empresa (CNPJ, contrato social).

**O KYC é opcional (decisão de 2026-10-01):** ser cliente da Systekna exige só o pedido assinado pela carteira e o nome ou a razão social. O KYC lacrado é oferecido caso a caso, quando houver motivo concreto (RN58). Os cenários C2 a C5 valem só para quem optar por ele.

**Quem é o titular dos dados:** o RG e o CPF são dados pessoais de **cada sócio ou representante**, e é ele quem tem os direitos da LGPD sobre eles. A empresa tem a relação comercial e o CNPJ, que não é dado pessoal. A Systekna é controladora desses dados (ver [Pesquisa de legislação](09-pesquisa-legislacao.md), 9.1.2).

### C1. Provar quem fala em nome da empresa ✅

- **Situação:** "sou o financeiro da empresa X, mude a conta de pagamento" ou "aprove este orçamento em nome da empresa".
- **Como fazer:** como a Systekna já conferiu os documentos, ela emite para a carteira de cada sócio ou procurador uma credencial **Representante de [empresa]** com:
  - `empresa` (razão social) e `cnpj`;
  - `papel` (sócio-administrador, procurador, financeiro);
  - `poderes` (o que a pessoa pode autorizar);
  - validade igual à do mandato ou da procuração.
- **Na hora de agir:** a Systekna gera um desafio exigindo essa credencial, e só quem a apresenta consegue pedir troca de dados, aprovar orçamento, pedir acesso ou cancelar.
- **Quando o sócio sai ou a procuração vence:** a Systekna revoga com o motivo "fim do vínculo", e a revogação fica no livro.
- **O que vai na credencial:** só CNPJ, papel e nome. **Nunca o CPF ou o RG.**
- **Hoje:** dá para fazer com as afirmações livres da emissão (RF-CR-05) e a verificação por desafio (RF-CR-08…10). Um tipo próprio `RepresentanteDe` fica como melhoria 💡.

### C2. Reaproveitar o KYC com outros parceiros ✅ parcial

- **Situação:** um fornecedor ou parceiro pede "mande cópia do RG e do CPF do sócio".
- **Como fazer:** o sócio apresenta uma credencial **Identidade conferida pela Systekna**, com nível da conferência e data, sem nenhum dado pessoal (é a `IdentidadeConferida` da F6).
- **O que o parceiro precisa:** importar o convite do emissor Systekna e conferir a apresentação. Hoje isso exige que ele tenha um emissor. Com a F7, qualquer pessoa confere a revogação pelo livro público.
- **O que garante:** o parceiro sabe que a Systekna conferiu a identidade daquela pessoa sem receber cópias de documento.
- **Limite:** se o parceiro for **pessoa obrigada** (banco, câmbio, imóveis e outros; Lei 9.613/1998, art. 9º, e normas do Banco Central), a regra dele exige guardar os dados, e a credencial não substitui o KYC dele.
- **Para a Systekna:** isso a coloca no papel de quem atesta identidade para terceiros. Se a conferência falhar, a responsabilidade é dela. ⚖️ Precisa de contrato e revisão jurídica antes do primeiro uso.

### C3. Os sócios exercerem os direitos da LGPD 🔜 F4 / F6

- **Acesso:** cada sócio recebe a cópia dos próprios dados cifrada só para a chave da carteira dele (prevista na F6). Ele vê o que a Systekna guarda sem depender de e-mail.
- **Correção e descarte:** o sócio faz um pedido assinado pela carteira. Se saiu da sociedade, pede o descarte. O descarte é criptográfico: os custodiantes apagam as partes da chave, e o descarte vira ato no livro.
- **Transparência:** toda abertura do envelope gera um ato no livro, com motivo e quem autorizou. O titular é avisado, salvo ordem judicial que proíba.

### C4. Exigir a base KYC da Systekna lacrada 🔜 F6

- **Risco hoje:** se a base for um banco comum com RG e CPF abertos, um vazamento nela expõe os sócios de todos os clientes.
- **O que a F6 muda:** cada cadastro vira um envelope cifrado. Abrir exige 2 de 3 custodiantes, há data de descarte e a credencial não leva dado pessoal.
- **O que a empresa cliente pode pedir em contrato:**
  1. dados guardados lacrados, no esquema da F6;
  2. prazo de guarda definido e descarte ao fim do contrato;
  3. aviso de cada abertura, salvo ordem judicial que proíba;
  4. o próprio contrato registrado por hash (E4), com o certificado guardado na carteira (U7).

### C5. KYC dos próprios clientes pela Systekna 💡

- **Situação:** a sua empresa precisa conferir a identidade dos clientes dela, mas não quer guardar RG e CPF de ninguém.
- **Como seria:** a Systekna atua como **operadora** e a sua empresa como **controladora** (LGPD, art. 39). A Systekna confere os documentos, emite `IdentidadeConferida` no grupo "Clientes de [sua empresa]" e lacra o envelope. Uma das partes da chave pode ficar com a sua empresa.
- **O que a sua empresa ganha:** sabe que o cliente foi conferido sem manter a base de documentos, o que reduz muito o risco de LGPD.
- **O que falta:** a F6 pronta, um contrato de operador e a decisão de quem são os custodiantes em cada cliente. Está registrado como ideia na F6 do `plan.md`.

---

## Rastreabilidade

| Cenário | Requisitos |
|---|---|
| E1, U1 | Cartão de contato e conferir pessoa (F1.3), RF-CR-26 |
| E2, U3 | RF-CR-08…10, RF-CT-06, RF-CT-07 |
| E3 | RF-CR-19…24 |
| E4, U7 | RF-CR-11…13 |
| E5, U4 | RF-CT-16, RF-CT-17 |
| E6 | RF-CR-01…03 |
| U2 | RF-CT-01, RF-CT-01a, RF-CT-02, F1.2 (emissores confiáveis) |
| U5, U6 | RF-CT-09…13 |
| U8 | RF-CM-05, RF-CM-20, RF-CM-21 |
| C1 | RF-CR-05, RF-CR-07…10, RF-CR-19 |
| C2 | F6 (`IdentidadeConferida`), F7 (livro público), RF-CR-16 |
| C3, C4, C5 | F6 (envelope, abertura, descarte, cópia do titular) |
