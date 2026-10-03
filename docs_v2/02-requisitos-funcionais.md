# 02 · Requisitos Funcionais

> Convenção: **RF-XX-nn**. Atuais: `CM` comum aos dois apps, `CT` Carteira, `EM` Emissor. Alvo: `TR` transporte, `CT-A` Carteira, `GV` Governança, `SV` App Serviço. `F` futuro.
> Prioridade: **M** obrigatório · **D** desejável · **F** futuro. Status: ver legenda no [README](README.md).
> **Origem:** `d:` = `docs/` (v0), `v1:` = `docs_v1/`. Sem origem = novo nesta versão.

## 1. Comuns aos dois apps (núcleo `src/shared/nucleo.js`)

### 1.1 Ciclo de vida da identidade

| ID | Requisito | Prior. | Status | Origem |
|---|---|---|---|---|
| RF-CM-01 | Criar identidade gerando 128 bits de entropia e exibindo as **12 palavras BIP39**, em português ou inglês, veladas até tocar em "Mostrar palavras". | M | ✅ | d:RF-CM-01 · v1:RF-G01 |
| RF-CM-02 | Permitir gerar outro conjunto de palavras e trocar o idioma antes de confirmar. | D | 🟡 | d:RF-CM-02 |
| RF-CM-03 | Confirmar a anotação pedindo **3 palavras em posições sorteadas**; recusar se alguma não conferir. | M | ✅ | d:RF-CM-03 · v1:RF-G01 |
| RF-CM-04 | Criar **PIN de 6 dígitos**, digitado duas vezes, recusando PIN fraco. | M | ✅ | d:RF-CM-04 · v1:RF-G04 |
| RF-CM-05 | Recuperar pelas 12 palavras (PT ou EN, com ou sem acento e maiúsculas), informando quantidade errada, palavra fora da lista (com a posição) ou combinação que não fecha (checksum). | M | ✅ | d:RF-CM-05 · v1:RF-G03 |
| RF-CM-06 | Ao recuperar uma identidade **diferente** da que está no aparelho, pedir confirmação e apagar os dados, a biometria e o `meta` anteriores. | M | ✅ | d:RF-CM-06 |
| RF-CM-07 | Desbloquear com o PIN, com espera crescente a partir do 5º erro e apagamento no 10º. | M | ✅ | d:RF-CM-07 · v1:RF-G04 |
| RF-CM-08 | Bloquear manualmente ("Bloquear agora" e cadeado no topo), por inatividade (1, 3, 5, 10 ou 30 min) e ao recarregar a página. | M | ✅ | d:RF-CM-08 · v1:RF-G05 |
| RF-CM-09 | "Esqueci meu PIN" na tela de bloqueio leva à recuperação pelas 12 palavras. | M | 🟡 | d:RF-CM-09 |

### 1.2 Biometria (passkey com PRF)

| ID | Requisito | Prior. | Status | Origem |
|---|---|---|---|---|
| RF-CM-10 | Mostrar "Desbloqueio por biometria" só quando há autenticador de plataforma e o navegador não nega a extensão PRF. | M | ✅ | d:RF-CM-10 |
| RF-CM-11 | Ativar pedindo o PIN, criando uma passkey e guardando uma segunda cópia da entropia cifrada com o segredo PRF. | M | ✅ | d:RF-CM-11 |
| RF-CM-12 | Recusar a ativação e explicar quando o autenticador não entrega PRF. | M | ✅ | d:RF-CM-12 |
| RF-CM-13 | Desbloquear só com a biometria, pelo botão da tela de bloqueio. | M | ✅ | d:RF-CM-13 |
| RF-CM-14 | Desativar (com confirmação), apagando o registro e avisando o gerenciador de passkeys (`signalUnknownCredential`). | M | ✅ | d:RF-CM-14 |
| RF-CM-15 | **Usar só biometria**: apagar o PIN do aparelho depois de abrir de verdade pela biometria. | D | ✅ | d:RF-CM-15 |
| RF-CM-16 | No modo só biometria: esconder o teclado, ignorar dígitos, pedir biometria em "Ver as 12 palavras" e impedir desativar a biometria. | D | ✅ | d:RF-CM-16 |
| RF-CM-17 | Sair do modo só biometria criando um PIN novo (pede a biometria antes). | D | ✅ | d:RF-CM-17 |

### 1.3 Ajustes, backup e app

| ID | Requisito | Prior. | Status | Origem |
|---|---|---|---|---|
| RF-CM-18 | "Ver as 12 palavras" mediante PIN (ou biometria no modo só biometria), veladas por padrão. | M | ✅ | d:RF-CM-18 · v1:RF-G06 |
| RF-CM-19 | "Trocar PIN" mediante o PIN atual. | M | ✅ | d:RF-CM-19 · v1:RF-G06 |
| RF-CM-20 | Copiar **backup cifrado** `scb1.<iv>.<ct>`. | M | ✅ | d:RF-CM-20 · v1:RF-G11 |
| RF-CM-21 | Restaurar backup, recusando texto que não começa com `scb1`, backup de outra identidade ou alterado e backup de outro serviço. | M | ✅ | d:RF-CM-21 · v1:RF-G11 |
| RF-CM-22 | "Apagar tudo deste aparelho" com confirmação. | M | 🟡 | d:RF-CM-22 · v1:RF-C22 |
| RF-CM-23 | Alternar tema claro e escuro (padrão: preferência do sistema), lembrado no aparelho. | D | 🟡 | d:RF-CM-23 · v1:RF-G12 |
| RF-CM-24 | Instalar como app (PWA): botão quando o navegador oferece; no iPhone, passo a passo do Safari. | D | ✅ | d:RF-CM-24 |
| RF-CM-25 | Funcionar sem internet depois da primeira visita. | D | ✅ | d:RF-CM-25 |
| RF-CM-26 | Tela "Como funciona" com a explicação do serviço. | D | 🟡 | d:RF-CM-26 |
| RF-CM-27 | Avisar e bloquear criar e recuperar quando o navegador não tem Ed25519/X25519 ou não está em contexto seguro. | M | 🟡 | d:RF-CM-27 |
| RF-CM-28 | Sem IndexedDB, funcionar só em memória e avisar que os dados duram a sessão. | D | 🟡 | d:RF-CM-28 |
| RF-CM-29 | O endereço antigo `cartorio-systekna.html` leva ao `emissor-systekna.html`. | M | ✅ | d:RF-CM-29 |
| RF-CM-30 | Mostrar a **versão** do código (do `package.json`) nas boas-vindas, na tela do PIN e em Ajustes → Sobre. | M | ✅ | — |

## 2. Carteira de Identidade (`src/carteira/`)

| ID | Requisito | Prior. | Status | Origem |
|---|---|---|---|---|
| RF-CT-01 | **Pedir credencial**: gerar `pedido+jwt` assinado com nome (obrigatório), tipo desejado (Identidade ou Personalizada), DID do emissor (opcional, vira o `aud`), observação opcional e nonce, válido por 7 dias, com botão de copiar. | M | ✅ | d:RF-CT-01 |
| RF-CT-02 | **Receber credencial**: conferir assinatura, `typ = vc+jwt`, `sub` = DID da carteira, `exp`, `nbf` (folga de 60 s) e duplicidade (`jti`) antes de guardar cifrada. | M | ✅ | d:RF-CT-02 · v1:RF-C13 |
| RF-CT-03 | Listar credenciais como cartões, da mais nova para a mais antiga, com estado: "Sem validade", "Até <data>", "Vence em N dias" / "Vence amanhã" (perto do vencimento) ou "Vencida". | M | ✅ | d:RF-CT-03 · v1:RF-C14 |
| RF-CT-04 | Detalhar credencial: afirmações, emissor (nome e DID), data de emissão, estado e o JWT bruto. | M | 🟡 | d:RF-CT-04 |
| RF-CT-05 | Remover credencial da carteira, com confirmação (não revoga no emissor). | M | 🟡 | d:RF-CT-05 |
| RF-CT-06 | **Apresentar**: ler um `desafio+jwt`, conferir `typ`, assinatura e prazo, mostrar quem pede, para quê e o que exige, listar só credenciais não vencidas do tipo exigido e assinar um `vp+jwt` válido por 5 min. | M | ✅ | d:RF-CT-06 · v1:RF-C15 |
| RF-CT-07 | Mostrar "Nenhuma credencial serve" quando não houver credencial válida do tipo exigido. | M | ✅ | d:RF-CT-07 |
| RF-CT-08 | Mostrar os primeiros passos quando a carteira não tem credenciais. | D | 🟡 | d:RF-CT-08 |
| RF-CT-09 | **Identidade**: exibir DID, chave X25519 (`z6LS…`), data de criação e o documento DID (JSON), com cópia do DID e da chave. | M | 🟡 | d:RF-CT-15 · v1:RF-C01 |
| RF-CT-10 | **Cifrar mensagem** `smsg1` para uma chave X25519, inclusive para si mesmo ("A minha"). | D | ✅ | d:RF-CT-16 · v1:RF-C21 |
| RF-CT-11 | **Decifrar mensagem** `smsg1` endereçada à própria chave, explicando a falha. | D | ✅ | d:RF-CT-17 · v1:RF-C21 |
| RF-CT-12 | Ao abrir, apagar itens do tipo cartão (legado) e avisar a quantidade; manter intactos e ocultos os itens da versão avançada (cofre, contatos, emissores). | M | ✅ | d:RF-CT-14 |

## 3. Emissor de Credenciais (`src/emissor/`)

### 3.1 Painel e livro

| ID | Requisito | Prior. | Status | Origem |
|---|---|---|---|---|
| RF-EM-01 | Ao criar, abrir o livro com o ato nº 1 "abertura" e o nome padrão "Emissor de Credenciais Systekna". | M | ✅ | d:RF-CR-01 |
| RF-EM-02 | Painel com credenciais ativas, revogadas, emissores confiáveis, verificações, últimos 6 atos e veredito de integridade do livro. | M | ✅ | d:RF-CR-02 |
| RF-EM-03 | Ver o livro completo (com o hash de cada ato) e **conferir integridade**, apontando o primeiro ato quebrado. | M | ✅ | d:RF-CR-03 |

### 3.2 Emissão

| ID | Requisito | Prior. | Status | Origem |
|---|---|---|---|---|
| RF-EM-04 | **Conferir pedido**: `typ = pedido+jwt`, assinatura, `exp`, uso único (nonce) e destinatário (pedido endereçado a outro DID é recusado). | M | ✅ | d:RF-CR-04 |
| RF-EM-05 | Pré-preencher o tipo e o nome a partir do pedido; editar, adicionar e remover afirmações (`true`/`false` viram booleanos; espaços no nome do campo viram `_`). | M | 🟡 | d:RF-CR-05 |
| RF-EM-06 | Escolher a validade: 30 dias, 1 ano (padrão), 5 anos ou sem validade. | M | 🟡 | d:RF-CR-06 |
| RF-EM-07 | Recusar a emissão com dado pessoal (RN-51) e, na Identidade, exigir `kycValidado` booleano (padrão `false`). | M | ✅ | d:RN58, RN59 |
| RF-EM-08 | Emitir `vc+jwt` com `credentialStatus` (número sequencial), registrar no livro e no registro de emissões. Exige ao menos uma afirmação com valor. | M | ✅ | d:RF-CR-07 |

### 3.3 Verificação

| ID | Requisito | Prior. | Status | Origem |
|---|---|---|---|---|
| RF-EM-09 | **Gerar desafio** `desafio+jwt` com finalidade (padrão na tela: "Acesso ao serviço") e tipo exigido (ou qualquer), válido por 10 min. | M | ✅ | d:RF-CR-08 |
| RF-EM-10 | **Conferir apresentação** com o checklist de até 10 pontos (RN-18), mostrando ✓/✗ e explicação em cada um, mais as afirmações. | M | ✅ | d:RF-CR-09 |
| RF-EM-11 | Marcar o desafio como usado quando ele é válido para este emissor; registrar no livro toda verificação, aprovada ou recusada. | M | ✅ | d:RF-CR-10 |

### 3.4 Governança

| ID | Requisito | Prior. | Status | Origem |
|---|---|---|---|---|
| RF-EM-12 | Alterar o nome público do emissor (ato "nome"); o nome novo vai nas próximas credenciais. | M | 🟡 | d:RF-CR-14 |
| RF-EM-13 | Copiar o DID do emissor. | M | 🟡 | d:RF-CR-15 |
| RF-EM-14 | Adicionar emissor confiável (nome + `did:key` Ed25519 válido, sem duplicar nem incluir a si mesmo) e remover com confirmação. | M | ✅ | d:RF-CR-16 |
| RF-EM-15 | Alternar a política de **status não verificável** (recusar/aceitar), com confirmação ao aceitar. | M | ✅ | d:RF-CR-17 |
| RF-EM-16 | Listar as últimas 40 emissões com estado (Ativa, Expirada, Revogada) e detalhar cada uma. | M | 🟡 | d:RF-CR-18 |
| RF-EM-17 | **Revogar** com motivo (pedido do titular, dados incorretos, fim do vínculo, suspeita de fraude, outro), com confirmação. | M | ✅ | d:RF-CR-19 |

## 4. Alvo — transporte (todos os apps)

| ID | Requisito | Prior. | Status | Origem |
|---|---|---|---|---|
| RF-TR-01 | Mostrar pacotes como QR Code (fundo branco fixo, legível nos dois temas). | F | ⏸ adiado (DP-04) | v1:RF-G07 |
| RF-TR-02 | Ler pacotes pela câmera, pedindo permissão só na hora. | F | ⏸ adiado (DP-04) | v1:RF-G08 |
| RF-TR-03 | Copiar, colar e compartilhar pacotes como texto (alternativa ao QR). | M | ✅ | v1:RF-G09 |
| RF-TR-04 | Reconhecer o tipo do pacote lido e abrir a tela certa; recusar tipo inesperado explicando o motivo. | M | 🟡 (pelo `typ`) / ⬜ envelope `SYSTEKNA:<TIPO>:<JWT>` (DP-05) | v1:RF-G10 |
| RF-TR-05 | Pacote acima do limite de um QR: compressão ou QR em sequência `parte i/n`. | F | ⏸ adiado (DP-04) | v1:RT29a |

## 5. Alvo — Carteira

| ID | Requisito | Prior. | Status | Origem |
|---|---|---|---|---|
| RF-CT-20 | Cartão "Minha identidade" com DID, situação e validade da aprovação da Governança. | M | ⬜ | v1:RF-C01 |
| RF-CT-21 | Pedido de aprovação para a Governança, assinado, com o DID e o **nome** (DP-03). | M | ⬜ | v1:RF-C02 |
| RF-CT-22 | Ler a aprovação, conferir a assinatura com o DID da Governança e guardar só na carteira; recusar aprovação de outro DID. | M | ⬜ | v1:RF-C03 |
| RF-CT-23 | Avisar o vencimento da aprovação e permitir novo pedido. | M | ⬜ | v1:RF-C04 |
| RF-CT-24 | Ler o **Cartão do serviço** e conferir que ele é credenciado pela Governança; recusar pedir crachá a serviço sem credenciamento válido. | M | ⬜ | v1:RF-C10, C11 |
| RF-CT-25 | Pedido de crachá com o DID e a aprovação da Governança, sem dados pessoais. | M | ⬜ 📦 | v1:RF-C12 |
| RF-CT-26 | Receber o crachá, conferir assinatura e titular e guardar em "Meus crachás", com serviço, app e validade. | M | ⬜ 📦 | v1:RF-C13, C14 |
| RF-CT-27 | Ler o desafio da portaria, conferir a assinatura dele, escolher o crachá certo e mostrar a prova assinada com `aud` = DID do serviço. | M | ⬜ | v1:RF-C15 |
| RF-CT-28 | Crachá vencido: pedir outro ao serviço, sem voltar à Governança. | M | ⬜ | v1:RF-C16 |
| RF-CT-29 | Cofre (senhas, notas, documentos) cifrado, opcional. | D | ⬜ 📦 ❓DP-12 | v1:RF-C20 |

## 6. Alvo — Governança Systekna (STK)

| ID | Requisito | Prior. | Status | Origem |
|---|---|---|---|---|
| RF-GV-01 | Identidade própria; exibir o DID da Governança para publicação como âncora. | M | 🟡 (o emissor já tem DID) | v1:RF-S01 |
| RF-GV-02 | Ler pedidos de aprovação e conferir a assinatura do dono do DID. | M | ✅ (pedido atual) | v1:RF-S02 |
| RF-GV-03 | Registrar que a pessoa foi conferida fora do sistema, **sem guardar os dados conferidos**. | M | ⬜ ❓DP-01 | v1:RF-S03 |
| RF-GV-04 | Aprovar ou recusar pessoas e entregar a aprovação (texto e QR). | M | 🟡 (emite Identidade) | v1:RF-S04, S05 |
| RF-GV-05 | Ler pedidos de credenciamento de serviços e conferir a assinatura. | M | ⬜ 📦 | v1:RF-S06 |
| RF-GV-06 | Definir escopo (apps) e validade do credenciamento; credenciar ou recusar. | M | ⬜ 📦 | v1:RF-S07, S08 |
| RF-GV-07 | Descartar os pedidos depois de respondidos. | M | ⬜ ❓DP-01 | v1:RF-S09 |
| RF-GV-08 | Rotacionar a chave da Governança: assinar a passagem do DID antigo para o novo, aceita pelos apps que confiavam no antigo. | M | ⬜ (DP-09) | v1:RF-S10 |

## 7. Alvo — App Serviço (SRV)

| ID | Requisito | Prior. | Status | Origem |
|---|---|---|---|---|
| RF-SV-01 | Configurar o serviço: nome e apps que deseja proteger. | M | ⬜ | v1:RF-V01 |
| RF-SV-02 | Gerar o pedido de credenciamento, assinado pelo DID do serviço. | M | ⬜ 📦 | v1:RF-V02 |
| RF-SV-03 | Ler e guardar o credenciamento, mostrando escopo e validade; avisar perto do vencimento. | M | ⬜ 📦 | v1:RF-V03, V04 |
| RF-SV-04 | Exibir o **Cartão do serviço** (QR com DID, nome, escopo e credenciamento). | M | ⬜ | v1:RF-V05 |
| RF-SV-05 | Ler pedidos de crachá e conferir localmente: assinatura, aprovação assinada pela Governança, mesmo DID, validade. | M | ⬜ 📦 | v1:RF-V10, V11 |
| RF-SV-06 | Bloquear a emissão se o próprio credenciamento estiver vencido. | M | ⬜ 📦 | v1:RF-V12 |
| RF-SV-07 | Emitir crachá para um app do escopo, com validade que nunca passa a do credenciamento, levando o credenciamento junto. | M | ⬜ 📦 | v1:RF-V13, V14 |
| RF-SV-08 | Recusar pedidos. | M | ⬜ | v1:RF-V15 |
| RF-SV-09 | **Portaria**: gerar desafio de uso único para um app do escopo; ler a prova e conferir posse, assinatura, titular, credenciamento, escopo e validade; mostrar "Acesso liberado" ou "Acesso negado" com o motivo. | M | ⬜ | v1:RF-V20…V22 |
| RF-SV-10 | Funcionar sem rede e guardar os desafios em aberto só por poucos minutos, para impedir repetição. | M | ⬜ | v1:RF-V23, V24 |

## 8. Futuro (todos os apps)

| ID | Requisito | Prior. | Origem |
|---|---|---|---|
| RF-F-01 | Deep link entre os apps. | D | v1:RF-F01 |
| RF-F-02 | OpenID4VCI e OpenID4VP (mirar OpenID4VP 1.0 + HAIP 1.0). | F | v1:RF-F02 |
| RF-F-03 | W3C Verifiable Credentials 2.0. | F | v1:RF-F03 · ❓DP-10 |
| RF-F-04 | Revogação consultável por terceiros sem dados pessoais (lista de status ou livro público). | F | v1:RF-F04 · d:F7 |
| RF-F-05 | Divulgação seletiva (SD-JWT, RFC 9901). | F | d:RF-F-12 |
| RF-F-06 | Mensagens com remetente assinado (`smsg2`). | F | d:F4 |
| RF-F-07 | Login "Entrar com a carteira" (popup + `postMessage`). | F | d:F5 |
| RF-F-08 | Várias identidades na mesma carteira, derivadas das mesmas 12 palavras. | F | d:F8 |

## 9. Ambiente de demonstração do alvo (protótipo da v1)

| ID | Requisito | Situação |
|---|---|---|
| RF-X01 | Simular os três papéis num só app, com abas | Protótipo `identidade-simples.html` citado na v1 — **não está neste repositório** |
| RF-X02 | Diagrama da rede com o estado de cada ligação | Idem |
| RF-X03 | Próximo passo guiado, histórico e simulação de tempo | Idem |

## 10. Descartados

| Requisito | Decisão |
|---|---|
| Domínio próprio por serviço (F0) | ⏸ 01/10/2026: os apps seguem no GitHub Pages, só como demonstração |
| Recuperação com guardiões, Shamir *k* de *n* (F3) | ⏸ 01/10/2026: recuperação só pelas 12 palavras, anotadas em papel |
| Cofre com cartão de pagamento | ⏸ removido de propósito; não reintroduzir |
