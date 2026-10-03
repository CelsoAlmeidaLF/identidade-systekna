# 04 · Regras de Negócio

> Convenção: **RN-nn** para as regras atuais (0.13.0) e **RN-Ann** para as regras do alvo.
> Cada regra diz onde é aplicada e de onde veio (`d:` = `docs/`, `v1:` = `docs_v1/`). A numeração é nova; a origem permite achar a regra antiga.
> Regras do alvo **não valem** para o código enquanto a decisão indicada (❓) estiver aberta.

## 1. Princípios

- **Soberania:** a identidade nasce e vive no aparelho do titular. Nem o emissor nem a Systekna guardam ou recuperam as 12 palavras.
- **As 12 palavras são a chave mestra.** PIN e biometria são travas locais de conveniência.
- **Cada pessoa guarda as próprias 12 palavras**, em papel. Não há recuperação com ajuda de terceiros (F3 descartada).
- **Serviços independentes:** carteira e emissor não compartilham armazenamento; tudo o que passa entre eles é texto assinado.
- **Sem emissor central obrigatório:** cada pessoa ou empresa pode ter o próprio emissor. A confiança é local, explícita e não transitiva.
- **Sem fé pública:** o serviço se chama "Emissor de Credenciais". Nenhuma tela usa "cartório", "fé pública", "autenticar", "reconhecer firma" ou "lavrar".
- **A identidade define o usuário** (decisão de 02/10/2026): o app de identidade só aprova identidades; acessos e crachás são uma camada à parte.

## 2. Pedido e emissão

| ID | Regra | Onde | Status | Origem |
|---|---|---|---|---|
| RN-01 | O emissor só emite para quem enviar um **pedido assinado**. A assinatura prova o controle do DID. | Emissor › Emitir | ✅ | d:RN01 · v1:RN12, RN40 |
| RN-02 | Cada pedido é atendido **uma única vez**: nonce já presente no registro de emissões é recusado. | Emissor › Emitir | ✅ | d:RN02 · v1:RN41 |
| RN-03 | O pedido vale **7 dias**; pedido vencido é recusado. | Carteira gera; Emissor confere | ✅ | d:RN11 |
| RN-04 | O pedido exige o **nome** do titular. Tipo desejado e nome pré-preenchem a emissão, mas é o emissor quem decide as afirmações finais. | Ambos | 🟡 ❓DP-03 | d:RN12 |
| RN-05 | Uma credencial precisa de **ao menos uma afirmação** com valor. | Emissor › Emitir | 🟡 | d:RN13 |
| RN-06 | Validades permitidas: 30 dias, 1 ano (padrão), 5 anos ou sem validade. | Emissor › Emitir | 🟡 | d:RN14 |
| RN-07 | Toda emissão vira **ato do livro** e entra no registro de emissões com número de status sequencial. | Emissor | ✅ | d:RN15 |
| RN-09 | O pedido pode ser **endereçado a um emissor**: com o DID do emissor informado na carteira (validado como `did:key` Ed25519), o `aud` é esse DID e só esse emissor o atende. Sem DID, o `aud` é `emissor` e qualquer emissor atende. | Carteira › Pedir; Emissor › Emitir | ✅ | Correção de 03/10/2026 |
| RN-08 | Tipos de credencial na 0.13.0: **Identidade** (`nome` e `kycValidado`) e **Personalizada** (campos livres). Na Identidade, `kycValidado` é sempre booleano: se for removido, sai `false`; outro valor é recusado. | Emissor (`issue`) | ✅ ❓DP-03 | d:RN58 (versão de 01/10) |

## 3. Recebimento pela carteira

| ID | Regra | Onde | Status | Origem |
|---|---|---|---|---|
| RN-10 | A carteira só aceita credencial cujo `sub` é **o seu DID**. | Carteira › Receber | ✅ | d:RN04 |
| RN-11 | A carteira recusa credencial com assinatura inválida, `typ` diferente de `vc+jwt`, **vencida** ou que **ainda não entrou em vigor** (folga de 60 s). | Carteira › Receber | ✅ | d:RN17 |
| RN-12 | A mesma credencial (`jti`) não entra duas vezes. | Carteira › Receber | ✅ | d:RN18 |
| RN-13 | Remover uma credencial da carteira **não** a revoga no emissor. | Carteira | 🟡 | d:RN19 |

## 4. Verificação

| ID | Regra | Onde | Status | Origem |
|---|---|---|---|---|
| RN-14 | Cada desafio é aceito **uma única vez** e vale **10 minutos**. Desafios com mais de 24 h são descartados ao gerar um novo. | Emissor › Verificar | ✅ | d:RN03 · v1:RN45 |
| RN-15 | A apresentação vale **5 minutos** e é dirigida (`aud`) ao DID do emissor que gerou o desafio. | Carteira › Apresentar | ✅ | d:RN20 · v1:RN44 |
| RN-16 | **Credencial sozinha não é prova**: sem apresentação assinada pelo titular em resposta a um desafio, é recusada. | Emissor › Verificar | ✅ | d:RN21 · v1:RN32 |
| RN-17 | A carteira só oferece credenciais **não vencidas** e do **tipo exigido** pelo desafio. | Carteira › Apresentar | ✅ | d:RN22 |
| RN-18 | A apresentação é aprovada só se **todos** os pontos passarem: (1) formato `vp+jwt`; (2) assinatura do titular; (3) desafio deste emissor, `aud` correto e não usado; (4) prazos do desafio e da apresentação; (5) credencial presente e com `typ = vc+jwt`; (6) assinatura do emissor; (7) `vc.sub = vp.iss`; (8) emissor confiável; (9) não revogada; (10) `nbf` e `exp` da credencial; (11) tipo exigido, quando o desafio exige um. | Emissor › Verificar | ✅ | d:RN-V |
| RN-19 | Emissor confiável = o próprio emissor **ou** um DID da lista de confiança. | Emissor | ✅ | d:RN23 |
| RN-20 | Por padrão, o emissor **recusa** credencial de outro emissor cuja revogação não consegue conferir. Aceitar exige mudar a política, com confirmação. | Emissor › Governança | ✅ | d:RN09 |
| RN-21 | Toda verificação, aprovada ou recusada, vira ato do livro e soma no contador de verificações. | Emissor | ✅ | d:RN24 |

## 5. Revogação e confiança

| ID | Regra | Onde | Status | Origem |
|---|---|---|---|---|
| RN-22 | A revogação é **irreversível** e fica no livro **com o motivo**. | Emissor › Governança | ✅ ❓DP-02 | d:RN05 |
| RN-23 | Motivos: Pedido do titular, Dados incorretos, Fim do vínculo, Suspeita de fraude, Outro. | Emissor | 🟡 | d:RN25 |
| RN-24 | Mudanças de **confiança**, de **nome** e de **política** também são atos do livro. | Emissor | 🟡 | d:RN07 |
| RN-25 | O emissor não adiciona a si mesmo nem um DID já confiável; o DID precisa ser `did:key` Ed25519. | Emissor › Governança | 🟡 | d:RN27 |
| RN-26 | **Limite:** a revogação só vale nas verificações feitas pelo próprio emissor que revogou. Outros verificadores não a enxergam (por isso RN-20). | — | ✅ (limite conhecido) | d:RN84 |

## 6. Livro de registros

| ID | Regra | Onde | Status | Origem |
|---|---|---|---|---|
| RN-27 | O livro é **somente acréscimo**: cada ato referencia o hash do anterior e é assinado pelo emissor. | Emissor | ✅ ❓DP-02 | d:RN31 |
| RN-28 | Tipos de ato na 0.13.0: `abertura`, `emissao`, `verificacao`, `revogacao`, `confianca`, `nome` e `politica`. | Emissor | ✅ | d:RN32 |
| RN-29 | Qualquer alteração ou remoção de ato é detectada, e o **primeiro ato quebrado** é apontado; a orientação é restaurar um backup. | Emissor › Painel | ✅ | d:RN33 |

## 7. Acesso local (PIN, biometria, bloqueio)

| ID | Regra | Onde | Status | Origem |
|---|---|---|---|---|
| RN-30 | O PIN tem **6 dígitos** e recusa todos iguais, sequências (inclusive com volta, como `789012`), par repetido 3 vezes (`121212`) e trinca repetida (`123123`). | Ambos | ✅ | d:RN08 · v1:RN60 |
| RN-31 | O **10º erro consecutivo apaga** os dados locais. | Ambos | ✅ | d:RN08 · v1:RN62 |
| RN-32 | A partir do 5º erro, espera crescente (30 s, dobrando a cada erro); a mensagem diz quantos erros faltam para apagar. | Ambos | ✅ | d:RN34 · v1:RN61 |
| RN-33 | Ver as 12 palavras e trocar o PIN exigem o PIN (ou a biometria, no modo só biometria) e **gastam tentativa** se errados. | Ambos | ✅ | d:RN35 · v1:RN63 |
| RN-34 | Biometria é **opcional** e só é ativada com PRF. Ativar exige o PIN. Biometria recusada não gasta tentativa. | Ambos | ✅ | d:RN36 |
| RN-35 | **Só biometria:** exige biometria ativa; antes de apagar o PIN, a identidade precisa abrir de verdade pela biometria. Nesse modo, a biometria não pode ser desativada e voltar a ter PIN pede a biometria. Se a biometria do aparelho mudar, a entrada é pelas 12 palavras, que criam um PIN novo. | Ambos | ✅ | d:RN37 |
| RN-36 | Recarregar a página **sempre bloqueia**. Bloqueio por inatividade: padrão de 3 min na carteira e 10 min no emissor, configurável em 1, 3, 5, 10 ou 30 min. | Ambos | ✅ | d:RN38 |
| RN-37 | **A única forma de recuperar a identidade são as 12 palavras.** Anotar em papel, na ordem, e guardar em local seguro e privado; não fotografar, não guardar em nuvem, e-mail ou conversa, não entregar a ninguém. Perdeu as palavras e o aparelho, perdeu a identidade. Vale também para as palavras de cada emissor. | Ambos (orientação na criação) | 🟡 | d:RN57 · v1:RN02 |
| RN-38 | Emissor pessoal e emissor de empresa são **identidades separadas**, com 12 palavras próprias. | Operação | 🟡 | d:RN55 |
| RN-40 | Recuperar com palavras de **outra identidade** apaga, mediante confirmação, os dados e a biometria da anterior. | Ambos | ✅ | d:RN39 |

## 8. Backup

| ID | Regra | Onde | Status | Origem |
|---|---|---|---|---|
| RN-41 | O backup só abre com as 12 palavras **da mesma identidade** e só no **mesmo serviço**. | Ambos | ✅ | d:RN41 · v1:RN64 |
| RN-42 | Restaurar backup na **carteira** junta os itens ao que existe (mesmo `id` é substituído). | Carteira | ✅ | d:RN42 |
| RN-43 | Restaurar backup no **emissor** **substitui** todo o estado (livro, emissões, confiança, desafios). Backup sem livro, ou com o livro adulterado, é recusado antes de mexer em qualquer coisa. | Emissor | ✅ | d:RN43 |
| RN-44 | A carteira **não guarda cartões de pagamento**: itens desse tipo são apagados ao abrir e ignorados ao restaurar. Itens da versão avançada (cofre, contatos, emissores) são preservados e ficam ocultos. | Carteira | ✅ | d:RN10 |

## 9. Dados pessoais

| ID | Regra | Onde | Status | Origem |
|---|---|---|---|---|
| RN-50 | **Sem KYC na versão básica.** Nenhum cadastro pede CPF, RG ou foto. Na 0.13.0, a Identidade traz `kycValidado` (sim ou não), sem nenhum dado conferido; o padrão é `false`. A decisão de 02/10/2026 de **retirar** o `kycValidado` está só na `bkp/cracha`. | Emissor (`issue`) | ✅ ❓DP-03 | d:RN58 |
| RN-51 | Credencial, livro e registros **nunca** levam CPF, RG ou foto. A emissão recusa campo cujo nome tenha, palavra por palavra, `cpf`, `rg`, `cnh`, `passaporte`, `pis`, `nis`, `sus`, `foto`, `selfie`, `biometria`, `nascimento`, `endereco`, `filiacao`, `mae` ou `pai`, e valor com CPF válido (inclusive no nome do titular). Nada vai para o livro quando a emissão é recusada. **Limite:** RG e outros números sem formato fixo só são barrados pelo nome do campo. | `piiProblem` em `nucleo.js`, chamado por `issue` | ✅ | d:RN59 |
| RN-52 | Credencial de cliente leva só o necessário (nome ou razão social): nada de CPF, endereço ou dados de contrato. | Operação | 🟡 | d:RN54 |

## 10. Ambiente e nome

| ID | Regra | Status | Origem |
|---|---|---|---|
| RN-60 | Quem usava o nome antigo continua no **mesmo banco** (`systekna-cartorio`) e no mesmo livro; o endereço antigo redireciona. | ✅ | d:RN56 |
| RN-61 | O ambiente publicado é **só para demonstração**: não recebe identidades reais nem dados de clientes. | 🟡 | d:RN45 |
| RN-62 | Toda publicação sobe a versão do `package.json`, mostrada nos apps, para o usuário conferir que atualizou. | ✅ | — |

---

## 11. Regras do alvo (3 aplicativos)

> Origem: `docs_v1/04`. Nomenclatura: **STK** = Governança Systekna · **SRV** = cada serviço que usa o App Serviço · **Carteira**.
> Status de todas: ⬜. As marcadas 📦 têm um experimento na `bkp/cracha`.
> **Decisões de 03/10/2026 (doc 11):** os apps se chamam Carteira de Identidades Soberanas, Governança Systekna (STK) e Serviços Systekna (SRV). A Identidade leva só `nome`; livro, revogação e registro com nome continuam. As regras marcadas ⏸ abaixo deixaram de valer.

### 11.1 Princípios do alvo

| ID | Regra | Conflito |
|---|---|---|
| RN-A00 | ⏸ ~~O usuário nunca envia dados pessoais~~. Decidido: trafegam DID, assinaturas e o **nome** (DP-03). CPF, RG e afins continuam proibidos. | — |
| RN-A01 | **Nenhuma informação fica em servidor**: cada aprovação é entregue a quem foi aprovado, que a guarda. | — |
| RN-A02 | A identidade pertence ao usuário: só quem tem as 12 palavras controla o DID. | Igual à RN-37 |
| RN-A03 | O ecossistema tem **três aplicativos independentes** (Carteira, Governança, App Serviço), cada um com identidade própria e sem armazenamento compartilhado. | ❓DP-06 |
| RN-A04 | Os apps só se comunicam por **pacotes assinados** em texto, no envelope `SYSTEKNA:<TIPO>:<JWT>` (QR adiado, DP-04 e DP-05). | — |

### 11.2 Governança (STK)

| ID | Regra | Conflito |
|---|---|---|
| RN-A10 | Só a STK aprova identidades de pessoas. | — |
| RN-A11 | Só a STK credencia serviços como emissores de crachás. 📦 | — |
| RN-A12 | A STK só aprova pedidos assinados pelo dono do DID. | Igual à RN-01 |
| RN-A13 | ⏸ Decidido o contrário (DP-01): a STK mantém o registro do que emitiu, com nome. | — |
| RN-A14 | A aprovação (credencial Identidade) leva o DID e só o `nome`; a validade é opcional (DP-02, DP-03). | — |
| RN-A15 | A conferência da pessoa por trás do DID é feita sem guardar os dados conferidos (fontes oficiais: CIN, gov.br). | ❓DP-01 |

### 11.3 Serviços (SRV)

| ID | Regra |
|---|---|
| RN-A20 | Um serviço só emite crachás com credenciamento válido da STK. 📦 |
| RN-A21 | Só para os apps do seu escopo. 📦 |
| RN-A22 | Só para quem apresentar aprovação da STK válida e do mesmo DID. 📦 |
| RN-A23 | O serviço confere a aprovação **localmente**, sem consultar a STK. |
| RN-A24 | A validade do crachá nunca passa a do credenciamento. |
| RN-A25 | O serviço não guarda dados nem lista de usuários. |
| RN-A26 | Qualquer serviço pode instalar o App Serviço, mas só emite depois de credenciado. |
| RN-A27 | Escopo e validade do credenciamento são definidos pela STK, não pelo serviço. |
| RN-A28 | O serviço exibe publicamente o **Cartão do serviço** com o credenciamento. |
| RN-A29 | A portaria só aceita crachás emitidos pelo próprio serviço e para apps do seu escopo. |

### 11.4 Carteira e crachás

| ID | Regra |
|---|---|
| RN-A30 | A carteira guarda a aprovação da STK e todos os crachás, de qualquer serviço. |
| RN-A31 | Um mesmo DID pode ter crachás de vários serviços ao mesmo tempo. |
| RN-A32 | Todo uso de crachá exige uma prova de posse nova, com desafio de uso único (mesma ideia da RN-16). |
| RN-A33 | Crachá vencido exige novo pedido ao serviço, não à STK. |
| RN-A34 | Aprovação vencida exige novo pedido à STK. |
| RN-A35 | Um crachá só abre o app para o qual foi emitido. |
| RN-A36 | A carteira só pede crachá a serviço cujo Cartão traga credenciamento válido assinado pela STK. |

### 11.5 Pedidos

| ID | Regra |
|---|---|
| RN-A40 | Todo pedido (aprovação, credenciamento, crachá) é assinado por quem pede. |
| RN-A41 | Todo pedido é de uso único (`nonce`). |
| RN-A42 | Pedido recusado pode ser refeito. |
| RN-A43 | ⏸ Decidido (DP-01): o registro de emissões guarda o nonce do pedido atendido, para recusar repetição. |
| RN-A44 | Todo pacote leva `aud` com o DID do destinatário; pacote endereçado a outro app é recusado. |
| RN-A45 | Desafios da portaria valem poucos minutos (2 min no teste) e são aceitos uma única vez. |

### 11.6 Validade no lugar da revogação

| ID | Regra | Valor no teste | Conflito |
|---|---|---|---|
| RN-A50 | A aprovação da STK vence sozinha. | 1 ano | — |
| RN-A51 | O credenciamento vence sozinho. | 1 ano | — |
| RN-A52 | O crachá vence na data escolhida pelo serviço, nunca depois do credenciamento (DP-07). | Escolha do serviço | — |
| RN-A53 | ⏸ Decidido (DP-02): a revogação continua; a validade é opcional. | — | — |

### 11.7 Regras herdadas que o alvo suspende

| Regra atual | O que o alvo propõe | Decisão |
|---|---|---|
| Livro de atos encadeado e assinado (RN-27…29) | Suspender: conflita com RN-A01 | ❓DP-02 |
| Revogação pelo emissor (RN-22…26) | Substituir por validade curta (RN-A50…53) | ❓DP-02 |
| KYC com dados enviados cifrados ao emissor | Suspensa: conflita com RN-A00 | ⏸ (não está no código) |
