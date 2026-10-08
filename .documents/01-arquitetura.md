# 01 · Arquitetura

## 1. Princípios

| # | Princípio | Como aparece no desenho |
|---|---|---|
| P1 | **Soberania** | Toda identidade nasce no aparelho, de 12 palavras que só o dono tem. Ninguém guarda nem recupera as palavras |
| P2 | **Minimização** | Credenciais levam só o necessário: a identidade, só o nome; o crachá, só o serviço, o app e os códigos das funcionalidades liberadas. CPF, RG e afins são recusados |
| P3 | **Verificação local** | A chave pública vem dentro do DID (`did:key`): conferir é verificar assinaturas, sem servidor |
| P4 | **Posse comprovada** | Todo uso responde a um desafio novo, de uso único |
| P5 | **Papéis separados** | Carteira, Governança e Serviços são apps distintos, com chaves e armazenamento próprios |
| P6 | **Recuperável pelo dono** | As 12 palavras, ou o código de recuperação STK1-… equivalente, recriam as identidades; o backup cifrado devolve os dados |
| P7 | **Zero dependência** | Cada app é um HTML único: nada é carregado de fora do site |

## 2. Os três aplicativos

| App | Arquivo | Banco (IndexedDB) | Domínio de derivação | Papel |
|---|---|---|---|---|
| Carteira de Identidades Soberanas | `carteira-systekna.html` | `systekna-carteira` | nenhum (identidade nº 0) e `perfil/<n>` (demais identidades) | Titular |
| Governança Systekna (STK) | `governanca-systekna.html` | `systekna-cartorio` (nome antigo mantido para não perder dados) | `governanca` | Raiz de confiança |
| Serviços Systekna (SRV) | `servicos-systekna.html` | `systekna-servicos` | `servicos` | Organização que dá acesso |
| Página inicial | `index.html` | — | — | Links para os 3 apps |

## 3. Organização do código

Cada projeto tem a sua pasta, com o código-fonte (`src/`) e os testes (`tests/`). O que vale para os 3 fica em `compartilhado/`. Na raiz ficam as pastas dos projetos (`stk-carteira/`, `stk-governanca/`, `stk-servicos/`), `compartilhado/` (com `package.json`, `playwright.config.js`, `scripts/` e `node_modules`), `.documents/` e `.lixeira/` (antigos, só neste computador), e o que o site serve, porque o GitHub Pages publica a raiz da `main`: HTML gerados, `index.html`, `sw.js`, manifestos, `icons/` e `fonts/`.

```
compartilhado/
├─ src/
│  ├─ nucleo.js   cripto (BIP39, HKDF, Ed25519, X25519, AES-GCM), PIN, biometria, sessão,
│  │              JWT, envelope SYSTEKNA:<TIPO>:, cv:key, dados pessoais, UI base, PWA
│  ├─ recuperacao.js código de recuperação STK1-…, gerador de QR code, PDF de recuperação,
│  │              leitura do QR pela câmera (BarcodeDetector)
│  ├─ livro.js    livro de registros, registro de emissões, revogação, troca de chave
│  │              (usado pela Governança e pelos Serviços)
│  ├─ estilo.css  design Systekna Aero 2.0, cartões por perfil
│  ├─ telas.html  confirmação, recuperação (12 palavras ou código), PIN
│  └─ folha.html  folha deslizante e aviso (toast)
└─ tests/      testes que valem para os 3 apps, helpers.js e fixtures/ (vetores oficiais)
stk-carteira/      src/ (pagina.html + app.js: identidades, credenciais, crachás, pedidos, apresentação) · tests/
                   (pagina.html de cada app traz a tela das 12 palavras, com o botão do PDF)
stk-governanca/    src/ (aprovar identidade e emissão, verificar, governança) · tests/
stk-servicos/      src/ (aprovação de emissão, apps e funcionalidades, cartões, crachás, portaria, serviço) · tests/
compartilhado/scripts/build.js  monta um HTML por app na raiz (@inclui), versão, hash da CSP, cache do sw.js
```

Cada app implementa o contrato `APP` (`db`, `dominio`, `label`, `load`, `enter`, `onView`, `onLock`, `exportData`, `importData`…); o núcleo controla o ciclo de vida (boas-vindas → palavras → PIN → aberto → bloqueado).

## 4. Chaves e derivação

```
Entropia (128 bits) → 12 palavras BIP39 → semente (PBKDF2-SHA512, 2048)
                                              │
     HKDF-SHA256, sal "systekna-cofre-v1", rótulo = [domínio/] + uso
                                              │
   ┌──────────────────────────┬───────────────┴──────────────┬─────────────────────────┐
 Carteira nº 0             Carteira nº n                 Governança                 Serviços
 ssi/ed25519               perfil/n/ssi/ed25519          governanca/ssi/ed25519     servicos/ssi/ed25519
 → did:key:…A              → did:key:…B                  → did:key:…G               → did:key:…S
 (+ ssi/x25519, vault/aes-256-gcm com o mesmo prefixo)
```

- **Mesmas 12 palavras, DIDs diferentes** em cada app e em cada identidade; um DID não revela outro.
- O `meta.dom` guarda o domínio da identidade do aparelho. Governança e Serviços criados antes da 0.16.0 continuam com o DID antigo e mostram um aviso.
- Só a entropia é guardada, cifrada em duas camadas (chave do aparelho + PIN ou segredo PRF da biometria).
- **Código de recuperação (0.23):** `STK1-` + 32 caracteres (alfabeto sem 0, 1, O, I) = 20 bytes: versão e idioma (1), entropia (16) e conferência (3 primeiros bytes do SHA-256 dos 17 anteriores). É outra forma de escrever as 12 palavras: leva à mesma semente e ao mesmo DID. O idioma vai junto porque palavras em português e em inglês geram sementes diferentes.

## 5. Artefatos (o que passa entre os apps)

Todos são JWT EdDSA com `kid` = DID de quem assina e saem no envelope `SYSTEKNA:<TIPO>:<JWT>`.

| Artefato | `typ` | Envelope | Assinado por | Conteúdo principal | Validade |
|---|---|---|---|---|---|
| Pedido de aprovação de identidade | `pedido+jwt` | `PEDIDO-APROVACAO` | Identidade escolhida | nome, perfil, nome do perfil, nonce | 7 dias, uso único |
| **Aprovação de identidade** | `vc+jwt` | `APROVACAO` | STK | `IdentityCredential`: só `nome` | Escolhida pela STK (padrão 1 ano) |
| Pedido de aprovação de emissão | `pedido+jwt` | `PEDIDO-CREDENCIAMENTO` | Serviço | nome do serviço (sem apps desde a 0.22) | 7 dias, uso único |
| **Aprovação de emissão** | `vc+jwt` | `CREDENCIAMENTO` | STK | `ServiceAccreditationCredential`: só o serviço (aprovações antigas com apps valem para o serviço todo) | Escolhida pela STK |
| Cartão do serviço | `cartao+jwt` | `CARTAO-SERVICO` | Serviço | nome, apps, catálogo (funcionalidades e grupos de cada app), aprovação de emissão | Até a aprovação vencer |
| Cartão do app | `cartao+jwt` | `CARTAO-APP` | Serviço | o mesmo, com um app só (`app`) | Até a aprovação vencer |
| Pedido de acesso | `pedido+jwt` | `PEDIDO-CRACHA` | Identidade escolhida | apps, perfil, aprovação da identidade junto | 7 dias, uso único |
| **Crachá (CV:KEY)** | `vc+jwt` | `CRACHA` | Serviço | `BadgeCredential`: serviço, app, `funcionalidades` (códigos liberados; sem grupo nem plano) + aprovação de emissão do serviço (evidência) | Escolhida pelo serviço, limitada à aprovação do serviço |
| Recusa de acesso | `recusa+jwt` | `RECUSA` | Serviço | nonce do pedido, apps, motivo | — |
| Desafio | `desafio+jwt` | `DESAFIO` | STK ou portaria do serviço | nonce, finalidade, tipo/app exigido e, opcional, a funcionalidade (`funcao`) | 10 min, uso único |
| Prova (apresentação) | `vp+jwt` | `PROVA` | Identidade dona da credencial | credencial + nonce, `aud` = quem desafiou | 5 min |
| Aviso de troca de chave | `rotacao+jwt` | `ROTACAO` | Chave antiga da STK, com aceite da nova | DID novo | — |

## 6. Fluxos

```
F1 · Identidade
Carteira: + › Solicitar aprovação de identidade ─PEDIDO-APROVACAO─▶ STK: Aprovar identidade
Carteira: + › Receber aprovação de identidade   ◀────APROVACAO──── (ou recusa, só no livro da STK)

F2 · Aprovação de emissão
Serviços: + › Solicitar aprovação de emissão ─PEDIDO-CREDENCIAMENTO─▶ STK: Aprovar emissão (só o serviço)
Serviços: + › Receber aprovação de emissão   ◀──────CREDENCIAMENTO─── (ou recusa, só no livro da STK)

F3 · Acesso a um app
Serviços: Serviço › Apps (apps, funcionalidades, grupos)
Serviços: + › Cartão do serviço ──CARTAO-SERVICO──▶ Carteira: + › Solicitar acesso a um app
          Painel › cartão de um app ──CARTAO-APP──▶ (o app já vem marcado)
Carteira ──PEDIDO-CRACHA──▶ Serviços: Crachás › Aprovar acesso (marca as funcionalidades) | Recusar pedido
Carteira: + › Receber crachá de acesso ◀──CRACHA ou RECUSA──

F4 · Uso
Serviços: Portaria › Gerar desafio (app ou funcionalidade) ──DESAFIO──▶ Carteira: Apresentar
Carteira ──PROVA──▶ Portaria: Acesso liberado | Acesso negado

F5 · Recuperação (cada app)
Recuperar ◀── 12 palavras | código STK1-… | QR code do PDF (câmera, onde o navegador lê QR)
Ajustes › Salvar PDF de recuperação (PIN ou biometria) ──▶ PDF: QR + código + 12 palavras + DID
```

## 7. Dados guardados

**Carteira (`systekna-carteira`, chave `items`, cada item cifrado com AAD = id)**

| Tipo de item | Conteúdo |
|---|---|
| `cred` | Credencial: `vtype`, `jwt`, `jti`, `sub`, emissor, `iat`, `exp` (aprovações de identidade e crachás) |
| `perfil` | Identidade nº n: `nome`, `perfil` (identidade/profissional/personalizada), `rotulo`, pedido em andamento |
| `acesso` | Pedido de acesso: serviço, DID do serviço, apps, identidade, situação (aguardando/recusado), motivo |

**Governança (`systekna-cartorio`, um `state` cifrado):** nome, emissões (`issued`), emissores confiáveis, livro, desafios, recusas, chaves ao longo do tempo (`keys`), avisos de troca (`rotations`), política, contadores.

**Serviços (`systekna-servicos`, um `state` cifrado):** nome, catálogo (`catalogo`: apps, cada um com `funcoes` {id, nome, tipo} e `grupos` {id, nome, funcoes}), Governança (`gov.dids`, com o histórico de DIDs), aprovações de emissão (`aprovacoes`), pedidos aguardando (`pendentes`), crachás emitidos (`issued`), livro, desafios, recusas, contadores.

## 8. Implantação

- O site é a raiz da `main`, publicada pelo GitHub Pages. O código-fonte fica nas pastas `stk-*/` e `compartilhado/`, que o site também expõe, mas nenhuma página as usa.
- `sw.js` com cache `systekna-<versão>`: cada versão troca o cache e chega ao celular; rede primeiro, cópia guardada se offline.
- A versão (`package.json`) aparece nas boas-vindas, no PIN e em Ajustes → Sobre.
- Origem compartilhada no Pages: **somente demonstração**.

## 9. Decisões de arquitetura (ADR)

| # | Decisão | Motivo |
|---|---|---|
| ADR-01 | HTML único por app, sem servidor | Portátil, offline, sem custo |
| ADR-02 | `src/` + build por concatenação, sem bundler | Núcleo comum sem dependências |
| ADR-03 | CSP com hash do script, nada externo | Bloqueia XSS e terceiros |
| ADR-04 | `did:key` + JWT EdDSA | Verificação sem rede |
| ADR-05 | Derivação HKDF com **separação de domínio por app e por identidade** | Mesmas palavras, DIDs independentes |
| ADR-06 | Entropia em duas camadas; biometria só com PRF | Cópia do armazenamento não abre |
| ADR-07 | Livro encadeado e assinado na STK e nos Serviços | Auditoria e detecção de adulteração |
| ADR-08 | **Três apps separados** (Carteira, Governança, Serviços) | Cada papel com a própria chave |
| ADR-09 | Envelope `SYSTEKNA:<TIPO>:<JWT>` em todo pacote | O app sabe o que leu; tipo trocado é recusado |
| ADR-10 | Várias aprovações de emissão ativas por serviço | Renovar soma uma aprovação nova (até a 0.21, app novo pedia só ele) |
| ADR-11 | Crachá leva a aprovação de emissão do serviço | O verificador confere a autorização da STK |
| ADR-12 | Troca de chave da STK com aviso assinado pelas duas chaves | Rotação sem perder a confiança |
| ADR-13 | "Cartório Digital" → Emissor → **Governança Systekna** | Sem vocabulário de fé pública |
| ADR-14 | **Governança aprova o serviço; Serviço › Apps › Funcionalidades** (0.22) | Os apps são do serviço; o crachá leva só os códigos das funcionalidades, sem grupo nem plano |
| ADR-15 | Pastas por projeto (`stk-*`, `compartilhado/`) com o site na raiz (0.22.1) | Organização sem mudar o endereço do Pages |
| ADR-16 | **Código de recuperação e PDF com QR**, escritos à mão (0.23) | Recuperar sem digitar 12 palavras, sem biblioteca externa nem mudança na CSP |

## 10. Limites conhecidos

| Limite | Evolução possível |
|---|---|
| Copiar e colar entre apps (o QR existe só no PDF de recuperação) | QR Code entre os apps (adiado) |
| Apps das organizações não leem o crachá | "Entrar com a carteira" (login sem senha) |
| Revogação só visível a quem revogou | Lista pública de status |
| A apresentação revela todas as afirmações | SD-JWT |
| DID da Governança informado à mão (âncora vazia) | Pré-carregar o DID da STK de produção |
| Chaves no navegador | HSM / hardware seguro em produção |
| PDF de recuperação é uma cópia completa da conta | Senha no PDF (não feito); orientar imprimir e apagar |
| Ler QR pela câmera só onde há `BarcodeDetector` (Chrome do Android) | Leitor de QR próprio |
