# 11 · Decisões e Roteiro

> Onde o código atual (0.13.0) e o alvo (3 aplicativos, `docs_v1/`) se contradizem, ou onde falta uma escolha do responsável pelo produto.
> **Todas as 13 decisões foram tomadas em 03/10/2026** pelo responsável pelo produto (coluna "Decisão"). A seção 1.1 resume o que muda. Onde os outros documentos ainda mostram ❓DP-nn, vale a decisão registrada aqui.

## 1. Decisões (pendentes até 03/10/2026)

| DP | Tema | Situação atual (0.13.0) | Alvo (`docs_v1`) | Recomendação | Afeta | Decisão |
|---|---|---|---|---|---|---|
| DP-01 | **Registro do que foi emitido** | O emissor guarda o registro de emissões (com nome do titular) e os desafios | A Governança não guarda cadastro nem pedidos: "assina e esquece" | Guardar só `jti`, DID, tipo, datas e estado (sem nome), para poder revogar e auditar; descartar o pedido | RN-07, RN-A13, RN-A43, RT-A21, CA-A10, CA-A13 | **03/10/2026: como hoje, com nome.** Governança e serviços guardam o registro de emissões com o nome do titular e as afirmações (RN-A13 e RN-A43 deixam de valer) |
| DP-02 | **Revogação e livro de registros** | Revogação irreversível com motivo e livro encadeado e assinado | Sem revogação (só validade curta) e livro suspenso | Manter o livro e a revogação no emissor/Governança **e** adotar validade curta. Sem livro, perde-se a auditoria (cenário H4) | RN-22…29, RN-A50…53, ADR-08, P5 | **03/10/2026: manter como hoje.** Livro encadeado e revogação continuam nos 3 apps; validade continua opcional, inclusive "sem validade" (RN-A50…53 deixam de valer) |
| DP-03 | **Dados na credencial de identidade** | Identidade leva `nome` e `kycValidado`; o pedido exige nome. Em 02/10/2026 decidiu-se tirar o `kycValidado` (só na `bkp/cracha`) | Aprovação só com o DID, sem nome nem dado pessoal | Escolher entre: (a) só DID; (b) só nome; (c) nome + `kycValidado`. Recomendado (b), seguindo a decisão de 02/10, até haver KYC de verdade | RN-04, RN-08, RN-50, RN-A00, RN-A14, CA-66, CA-67, CA-A01, CA-A30 | **03/10/2026: só o nome.** Sai o `kycValidado`; a Identidade leva só `nome` |
| DP-04 | **QR Code** | Só copiar e colar. QR foi adiado em 01/10/2026 e voltou a ser discutido depois, sem decisão | Meio principal de transporte | QR nos tokens pequenos (pedido, desafio, prova); texto como alternativa sempre; leitura por `BarcodeDetector` + leitor embutido no HTML (iPhone) | RF-TR-01…05, RNF-51…54, RT-A06, ADR-15 | **03/10/2026: só copiar e colar por enquanto.** QR adiado |
| DP-05 | **Envelope de transporte** | O tipo vai no `typ` do cabeçalho JWT (`pedido+jwt`, `vc+jwt`…) | `SYSTEKNA:<TIPO>:<JWT>` | Manter o `typ` (já impede trocar um token por outro) e usar o prefixo só no QR, para o app saber que tela abrir | RT-25, RT-A03, RT-A04, TU-E* | **03/10/2026: envelope sempre.** Todo pacote, em texto, vai como `SYSTEKNA:<TIPO>:<JWT>`, e o `typ` continua no cabeçalho |
| DP-06 | **Quantos aplicativos** | 2 apps: Carteira e Emissor | 3 apps: Carteira, Governança, App Serviço | Decidir entre 3 apps separados ou o Emissor com dois papéis (raiz e serviço), que a `bkp/cracha` testou e foi considerado errado. Recomendado: 3 apps, com núcleo comum | ADR-13, RN-A03, RT-A30, CA-A32 | **03/10/2026: 3 apps separados**, sobre o mesmo núcleo |
| DP-07 | **Validade do crachá** | Não existe crachá na main | 24 horas no teste | Definir por serviço (ex.: 24 h a 1 ano), sempre ≤ credenciamento; 24 h só para demonstração | RN-A52, CA-A31 | **03/10/2026: definida pelo serviço**, por crachá, nunca além do fim do credenciamento |
| DP-08 | **Âncora de confiança** | Lista de emissores confiáveis digitada à mão em cada emissor | DID da Governança fixo, embutido nos 3 apps | DID da Governança publicado e pré-carregado como confiável, com troca possível por atualização do app | RT-A13, CA-A02 | **03/10/2026: publicado e pré-carregado.** O DID da Governança vem configurado como confiável e pode ser trocado por atualização |
| DP-09 | **Rotação da chave da Governança** | Trocar a chave = trocar o DID; sem plano | Ponto em aberto | Plano escrito antes do primeiro cliente: novo DID, credenciamentos reemitidos, aviso pelos apps | RF-GV-08 | **03/10/2026: implementar a rotação já**, junto com os 3 apps |
| DP-10 | **Versão do modelo de credencial** | W3C VC 1.1 (`issuanceDate`) | VC 2.0 + OpenID4VC | Ficar em VC 1.1 no uso privado; migrar para VC 2.0 (`validFrom`, contexto v2) junto com a construção do alvo | RT-29, RNF-23, RF-F-03 | **03/10/2026: ficar em W3C VC 1.1.** Os 3 apps nascem na versão **1.0.0** do `package.json` |
| DP-11 | **Scripts e fontes externos** | Nada de fora da origem (CSP com hash, fonte local) | `docs_v1` previa Google Fonts e bibliotecas de QR de CDN | **Não** abrir a CSP: fonte local e leitor de QR embutido no HTML | RT-04, RT-45, RT-A08, RNF-54 | **03/10/2026: nada externo.** CSP fechada, fonte local |
| DP-12 | **Cofre na carteira** | Fora da main (📦 `bkp/avancado`); itens antigos preservados e ocultos | Cofre opcional (senhas, notas, documentos, cartões) | Se voltar, sem cartão de pagamento (removido de propósito) e como fase própria | RF-CT-29, RN-44 | **03/10/2026: fase própria, depois**, a partir da `bkp/avancado`, sem cartão de pagamento |
| DP-13 | **Nomes dos apps** | "Carteira de Identidade" e "Emissor de Credenciais" | "Carteira Soberana", "Governança Systekna", "App Serviço" | Qualquer nome, menos vocabulário cartorial. Manter os endereços e o banco `systekna-cartorio` para não perder dados | RN-60, RT-30, RT-A20 | **03/10/2026: "Carteira de Identidades Soberanas", "Governança Systekna" e "Serviços Systekna".** Endereços antigos redirecionam e o banco `systekna-cartorio` é preservado |

### 1.1 O que as decisões mudam

**Os 3 aplicativos (versão 1.0.0)**

| App | Arquivo sugerido | Banco | Papel |
|---|---|---|---|
| **Carteira de Identidades Soberanas** | `carteira-systekna.html` (mantido) | `systekna-carteira` (mantido) | Titular: identidade (DID:KEY), aprovação da Governança, crachás (CV:KEY) |
| **Governança Systekna** | `governanca-systekna.html` | `systekna-cartorio` (mantido, para não perder dados) | Aprova identidades e credencia serviços. O Emissor de Credenciais atual vira a Governança; `emissor-systekna.html` e `cartorio-systekna.html` redirecionam |
| **Serviços Systekna** | `servicos-systekna.html` | `systekna-servicos` | Pede credenciamento, emite crachás e confere o acesso (portaria) |

**Regras que passam a valer no alvo**

- **Identidade só com `nome`** (DP-03): qualquer outro campo é recusado, inclusive `kycValidado`. CPF, RG e afins continuam proibidos (RN-51).
- **Livro e revogação nos 3 apps** (DP-02): a Governança revoga identidades e credenciamentos; o serviço revoga crachás; tudo vira ato no livro de quem emitiu. A validade continua opcional.
- **Registro com nome** (DP-01): Governança e serviços guardam o que emitiram, com o nome do titular. ⚖️ Isso é tratamento de dados pessoais pela Systekna (controladora) e por cada serviço: exige base legal, política de privacidade e canal com o titular (doc 09).
- **Crachá com validade escolhida pelo serviço** (DP-07), nunca além do credenciamento. Credenciamento "sem validade" permite crachá sem validade.
- **Envelope em todo pacote** (DP-05): `SYSTEKNA:<TIPO>:<JWT>` no copiar e colar (DP-04: sem QR por enquanto). O app recusa tipo inesperado e explica.
- **Âncora pré-carregada** (DP-08): Carteira e Serviços já vêm com o DID da Governança na lista de confiança.
- **Rotação da chave da Governança** (DP-09): a Governança assina a passagem do DID antigo para o novo; os apps que confiam no antigo passam a confiar no novo ao ler esse aviso.
- **W3C VC 1.1** mantido (DP-10); **nada de fora do site** (DP-11); **cofre fica para depois** (DP-12).

**Regras do alvo da v1 que deixam de valer:** RN-A00 (passa a trafegar o nome), RN-A13 e RN-A43 (há registro), RN-A50…53 (há revogação), RT-A06 e RT-A08 (sem QR por enquanto).

**Pendente de confirmação:** a Identidade só com `nome` vale para os 3 apps novos. Na 0.13.0 publicada ela ainda leva `kycValidado` até a Carteira e a Governança novas substituírem os apps atuais.

### Decisões anteriores registradas nesta versão

| Data | Decisão | Onde |
|---|---|---|
| 01/10/2026 | "Cartório Digital" passa a se chamar "Emissor de Credenciais" | ADR-10 |
| 01/10/2026 | F0 (domínio próprio) descartada por enquanto: Pages só como demonstração | RF doc 02 §10 |
| 01/10/2026 | F3 (recuperação com guardiões) descartada: só 12 palavras em papel | RN-37 |
| 01/10/2026 | Cofre sem cartão de pagamento | RN-44 |
| 02/10/2026 | "A Identidade define o usuário": o app de identidade só aprova identidades; crachá é sistema separado | Princípios doc 04 |
| 02/10/2026 | Toda publicação sobe a versão do `package.json` | RN-62, RT-07a |
| 03/10/2026 | A main volta à versão básica (`basico`, f293543) como 0.13.0; acesso, emissores e crachá (0.9.0–0.12.3) ficam na `bkp/cracha` | ADR-12 |
| 03/10/2026 | As 13 decisões pendentes (DP-01 a DP-13), seção 1 | Doc 11 §1 |
| 03/10/2026 | Encarregado de dados não é obrigatório para agente de pequeno porte (corrige `docs_v1/10`) | Doc 09 §2.3 |

## 2. Branches

| Branch | Conteúdo | Situação |
|---|---|---|
| `main` | Versão básica 0.13.0 (`c979c1c`), publicada no Pages | Vigente |
| `basico` | Ponto de origem da 0.13.0 (f293543) | Referência |
| `bkp/avancado` | Cofre com documento, contatos, conferir pessoa, emissores confiáveis na carteira, grupos, convite, registro de documentos (f6043ee) | 📦 Não volta sem pedido |
| `bkp/cracha` | Acesso aos serviços, vários emissores no aparelho, credenciamento, crachá CV:KEY, correções 0.12.1–0.12.3 (09560df) | 📦 Não volta sem pedido; serve de referência para o alvo |

## 3. Roteiro

> Fases do `plan.md` (presente no commit `c979c1c`) e do alvo. Situação em 03/10/2026. **Nenhuma fase nova está aprovada.**

| Fase | Entrega | Situação |
|---|---|---|
| Base | Identidade, PIN, biometria, backup, credenciais, verificação, livro, PWA | ✅ 0.13.0 |
| F0 | Domínio próprio | ⏸ Descartada |
| F1 | Grupos, emissores confiáveis, agenda, conferir pessoa | 📦 `bkp/avancado` |
| F2 | Acordos assinados (proposta, aceite, quitação) | ⬜ |
| F3 | Recuperação com guardiões | ⏸ Descartada |
| F4 | Mensagens com remetente (`smsg2`) | ⬜ |
| F5 | Login nos serviços da casa | ⬜ |
| F6 | Cadastro KYC lacrado | ⬜ |
| F7 | Livro público encadeado (revogação consultável sem blockchain) | ⬜ ❓DP-02 |
| F8 | Várias identidades na carteira, das mesmas 12 palavras | ⬜ |
| F9 | Aprovação por uso (Individual ou Profissional) | ⬜ |
| F10 | Sistema de crachás separado | ⬜ → vira o **alvo de 3 apps** |

### Sequência sugerida para o alvo (depois das decisões)

| Etapa | O que | Depende de |
|---|---|---|
| 1 | ~~Decidir DP-01, DP-02, DP-03 e DP-06~~ (feito em 03/10/2026) | — |
| 2 | Extrair o núcleo em módulos ES e criar os testes unitários (doc 07) | — |
| 3 | Governança: aprovar identidade (só nome), credenciar serviço, rotação da chave, envelope | 🧪 Feito na branch `governanca` (03/10/2026), 127 testes passando; falta publicar |
| 4 | Serviços: pedido de credenciamento, Cartão do serviço, emissão de crachá com validade escolhida | — |
| 5 | Carteira: "Minha identidade", "Serviços", "Meus crachás" | Etapas 3 e 4 |
| 6 | Portaria (desafio e prova) | Etapa 4 |
| 7 | QR Code | Adiado (DP-04) |
| 8 | Piloto com um serviço real (controle de acesso) | Plano de conformidade (doc 09 §5) |

### Fora do plano por ora

SD-JWT, `did:web`, Bitstring Status List publicada, OpenID4VC, app nativo, HSM. Ficam como evolução (doc 01 §6).
