# 05 · Regras Técnicas

> Regras que o código **deve** respeitar. Quebrar uma delas é bug, mesmo que a interface pareça funcionar.
> Convenção: **RT-nn** (atuais, 0.13.0) e **RT-Ann** (alvo). Constantes citadas estão em `src/shared/nucleo.js`, salvo indicação.

## 1. Código, build e publicação

| ID | Regra |
|---|---|
| RT-01 | Editar só `src/`. `carteira-systekna.html` e `emissor-systekna.html` são gerados por `npm run build` e commitados junto com a mudança em `src/`. |
| RT-02 | Inclusão por `<!-- @inclui caminho -->` (linha inteira, caminho relativo à página). Inclusão circular ou arquivo inexistente quebra o build. |
| RT-03 | Cada página tem **exatamente 1** `<script>` inline; o build calcula o SHA-256 dele e troca `{{hash-do-script}}` na CSP. Proibido: `onclick=` no HTML, `eval`, `new Function`, script externo. |
| RT-04 | Nada é carregado de fora da origem: fontes, imagens, scripts e `fetch`. |
| RT-05 | JavaScript sem framework e sem bundler, `'use strict'`. O núcleo comum é concatenado antes do `app.js` de cada serviço, que define o objeto `APP`. |
| RT-06 | Contrato `APP` (cada serviço implementa): `db`, `label`, `dataKeys`, `createdMsg`, `autoDefault`, `importHint`, `howHtml`, `load()`, `enter()`, `onView(v)`, `onLock()`, `exportData()`, `importData(d)`. |
| RT-07 | A versão vem **só** do `package.json` (formato `x.y.z`). O build troca `{{versao}}` nos HTML e grava `const VERSAO = 'systekna-<versão>'` no `sw.js`; `build:check` acusa diferença. |
| RT-07a | Toda publicação na `main` sobe a versão: `npm version x.y.z --no-git-tag-version` e `npm run build`. Patch para correção, minor para funcionalidade. |
| RT-08 | Ao mudar a lista de arquivos essenciais do `sw.js`, manter `cartorio-systekna.html` nela (endereço antigo). |

## 2. Criptografia

| ID | Regra |
|---|---|
| RT-09 | Usar **somente WebCrypto** (`crypto.subtle`) e `crypto.getRandomValues`. Nenhum algoritmo próprio além de codificações (base58, base64url, BIP39). |
| RT-10 | Entropia de 16 bytes → 12 palavras BIP39. Semente: PBKDF2-SHA512, sal `"mnemonic"`, 2048 iterações, palavras normalizadas em NFKD, sem passphrase. |
| RT-11 | Derivação: HKDF-SHA256, sal `systekna-cofre-v1`, `info` = `ssi/ed25519`, `ssi/x25519`, `vault/aes-256-gcm` (32 bytes cada). Mudar sal ou `info` **muda todas as identidades** e exige migração. |
| RT-12 | Chaves privadas importadas por PKCS#8 a partir da semente derivada, como **não extraíveis**. |
| RT-13 | DID = `did:key:z` + base58btc(`0xed 0x01` + pública Ed25519). Chave X25519 publicada como `z` + base58btc(`0xec 0x01` + pública), começando por `z6LS`. |
| RT-14 | AES-256-GCM com IV aleatório de 12 bytes por cifragem; registro `{iv, ct}` em base64url. AAD obrigatório por contexto: `device`, `pin`, `bio`, `backup`, `state` (emissor), `id` do item (carteira). |
| RT-15 | Cadeado do PIN (`lock`): `{v:1, salt (16 B), iter: 600000, iv, ct}`. Por fora PBKDF2-SHA256(PIN) → AES-GCM (AAD `pin`); por dentro, a chave do aparelho (AAD `device`). |
| RT-16 | Chave do aparelho: AES-256-GCM gerada com `extractable:false` e guardada como `CryptoKey` no IndexedDB (`deviceKey`). Nunca exportar. |
| RT-17 | Cadeado da biometria (`bioLock`): `{v:1, cred, salt (32 B), iv, ct}`; chave = HKDF(PRF, info `unlock/webauthn-prf`, sal = salt) → AES-GCM (AAD `bio`); por dentro, a mesma chave do aparelho. |
| RT-18 | Passkey: `authenticatorAttachment:'platform'`, `userVerification:'required'`, `residentKey:'preferred'`, algoritmos `-8`, `-7`, `-257`, timeout 60 s, extensão `prf.eval.first = salt`. Sem `prf.enabled`: apagar a passkey criada e falhar com `noprf`. |
| RT-19 | Mensagens `smsg1.<ephPub>.<iv>.<ct>`: X25519 efêmero → segredo → HKDF(info `msg/aes-256-gcm`, sal = ephPub ‖ toPub) → AES-GCM. |
| RT-20 | Backup `scb1.<iv>.<ct>`: AES-GCM com a chave do cofre, AAD `backup`, conteúdo `{v:1, app, did, at, data}`. |
| RT-21 | Livro do emissor: `hash = SHA-256(JSON.stringify({n, at, act, text, ref, prev}))` nessa ordem de campos; `prev` do 1º ato = 64 zeros; `sig = Ed25519(hash em hex)`. |
| RT-22 | Zerar com `fill(0)` sementes, segredos compartilhados e a entropia da sessão ao bloquear ou apagar. |

## 3. Tokens (JWT)

| ID | Regra |
|---|---|
| RT-23 | Cabeçalho sempre `{alg:'EdDSA', typ, kid:'<did>#<edMb>'}`. Qualquer outro `alg` (inclusive `none` e `HS256`) é recusado. |
| RT-24 | A chave de verificação é lida do **próprio DID** (`kid` ou `iss`); só `did:key` Ed25519 é aceito. `payload.iss` diferente do DID do `kid` é recusado. |
| RT-25 | Toda verificação informa o `typ` esperado: `pedido+jwt`, `vc+jwt`, `desafio+jwt`, `vp+jwt`. Token de `typ` errado é recusado com mensagem que diz o que ele é. Formato novo = `typ` próprio, prazo e conferência no núcleo. |
| RT-26 | Tempos em segundos Unix (`now()`); folga de relógio de **60 s** (`CLOCK_SKEW`) para `nbf`. |
| RT-27 | `jti` da credencial = `urn:uuid:<randomUUID>`; `credentialStatus = {id:'<did>#status-<n>', type:'SysteknaStatusRegistry', statusListIndex:n}`, com `n` sequencial (`st.seq`); `nbf = iat`; `issuanceDate` em ISO 8601. |
| RT-28 | Nonce do pedido: 16 bytes; nonce do desafio: 18 bytes (base64url). |
| RT-29 | `@context` da credencial e da apresentação: `https://www.w3.org/2018/credentials/v1` (VC 1.1). ❓DP-10 |

### 3.1 Payloads de referência (0.13.0)

```json
// Pedido (typ pedido+jwt)
{"iss":"did:key:z6Mk…","sub":"did:key:z6Mk…","aud":"emissor | did:key:z6Mk…EMISSOR","name":"Maria",
 "wanted":"IdentityCredential","note":"","nonce":"…","iat":0,"exp":0}

// Credencial (typ vc+jwt)
{"iss":"did:key:z6Mk…EMISSOR","sub":"did:key:z6Mk…TITULAR","iat":0,"nbf":0,"exp":0,"jti":"urn:uuid:…",
 "vc":{"@context":["https://www.w3.org/2018/credentials/v1"],
       "type":["VerifiableCredential","IdentityCredential"],
       "issuer":{"id":"did:key:z6Mk…EMISSOR","name":"Emissor de Credenciais Systekna"},
       "issuanceDate":"2026-10-03T12:00:00.000Z",
       "credentialSubject":{"id":"did:key:z6Mk…TITULAR","nome":"Maria","kycValidado":false},
       "credentialStatus":{"id":"did:key:z6Mk…EMISSOR#status-1","type":"SysteknaStatusRegistry","statusListIndex":1}}}

// Desafio (typ desafio+jwt)
{"iss":"did:key:z6Mk…EMISSOR","name":"Emissor…","nonce":"…","purpose":"Acesso ao serviço",
 "accept":"IdentityCredential","iat":0,"exp":0}   // exp = iat + 600

// Apresentação (typ vp+jwt)
{"iss":"did:key:z6Mk…TITULAR","sub":"did:key:z6Mk…TITULAR","aud":"did:key:z6Mk…EMISSOR","nonce":"…",
 "iat":0,"exp":0,   // exp = iat + 300
 "vp":{"@context":["https://www.w3.org/2018/credentials/v1"],"type":["VerifiablePresentation"],
       "holder":"did:key:z6Mk…TITULAR","verifiableCredential":["<JWT da credencial>"]}}
```

## 4. Armazenamento

| ID | Regra |
|---|---|
| RT-30 | IndexedDB, banco `systekna-carteira` ou `systekna-cartorio`, versão 1, object store `kv`. O banco do emissor **mantém o nome antigo** de propósito: renomear apagaria, na prática, os dados de quem já usava. |
| RT-31 | Chaves: `meta` `{did, lang, created}`, `deviceKey`, `lock`, `bioLock`, `guard` `{fails, until}` e os dados do serviço (`items` na carteira; `state` no emissor). |
| RT-31a | A carteira só exibe e conta itens do tipo `cred`; itens de outros tipos são mantidos sem alteração no `items` e no backup. Itens `cartao` são apagados. |
| RT-32 | `localStorage` só para preferências não sensíveis, prefixadas com o nome do banco: `theme`, `auto`. Todo acesso dentro de `try/catch`. |
| RT-33 | Falha ao abrir o IndexedDB → `DB._mem` (Map em memória) e aviso ao usuário. |
| RT-34 | O estado do emissor é **um único registro cifrado** (`state`) com `{name, issued[], trust[], book[], challenges[], seq, verifs, acceptUnverifiable?}`. |

## 5. PIN e tentativas

| ID | Regra |
|---|---|
| RT-35 | Constantes: `PIN_ITER = 600000`, `SOFT_FAILS = 5`, `MAX_FAILS = 10`. |
| RT-36 | Ordem obrigatória: ler `guard` → se em espera, recusar → **incrementar e gravar** `guard` → conferir o PIN. Sucesso zera o `guard`. |
| RT-37 | Espera a partir da 5ª falha: `30 s × 2^(falhas − 5)` (30, 60, 120, 240, 480 s). Na 10ª falha: `DB.clear()`. |
| RT-38 | O mesmo contador vale para desbloqueio, "Ver as 12 palavras", "Trocar PIN" e reautenticação. Biometria bem-sucedida zera o contador; biometria recusada não conta. |
| RT-39 | PIN fraco (`weakPin`): 6 dígitos iguais; sequência crescente ou decrescente, inclusive com volta (`789012`, `210987`); par repetido 3 vezes (`121212`); trinca repetida 2 vezes (`123123`). |

## 6. Interface

| ID | Regra |
|---|---|
| RT-40 | Todo texto vindo de token, arquivo ou usuário passa por `esc()` antes de ir para `innerHTML`. |
| RT-41 | Ações destrutivas (apagar, revogar, remover emissor ou credencial, substituir identidade, aceitar política permissiva, usar só biometria) usam `confirmSheet` com botão de perigo. |
| RT-42 | Inatividade conferida a cada 5 s e ao voltar a aba visível; atividade = `pointerdown`, `keydown`, `scroll`. |
| RT-43 | Ao bloquear: zerar a entropia, `ses = null`, fechar a folha aberta e chamar `APP.onLock()`, que limpa todo campo com dado sensível. |
| RT-44 | Tokens de cor em `:root`, tema escuro por `prefers-color-scheme` e `data-theme`; `viewport-fit=cover` e `env(safe-area-inset-*)`. |
| RT-45 | Fonte Open Sans servida de `fonts/` (latin e latin-ext), com pilha de reserva. **Não** usar Google Fonts (ver RT-04). |

## 7. Testes

| ID | Regra |
|---|---|
| RT-46 | E2E com Playwright no **Chrome do sistema** (`channel:'chrome'`), 1 worker, em série (o fluxo é uma história contínua), timeout de 120 s por teste. |
| RT-47 | Servidor local: `python3 -m http.server 4173`; ou `BASE_URL` para o site publicado. |
| RT-48 | Biometria testada com o **autenticador virtual** do Chrome (CDP WebAuthn), inclusive sem PRF e com verificação recusada. |
| RT-49 | Todo arquivo de teste de fluxo termina conferindo que **não houve violação de CSP**. |
| RT-50 | Identidades de teste só com frases BIP39 conhecidas (`abandon … about`, `zoo … wrong`, `legal winner … yellow`), nunca com palavras ou dados reais. |

Regras completas de teste, inclusive os testes unitários do alvo, no [documento 07](07-estrategia-de-testes.md).

---

## 8. Regras técnicas do alvo

> Origem: `docs_v1/05`. Status: ⬜. Conflitos marcados com ❓.

### 8.1 Tokens e envelopes

| ID | Regra | Conflito |
|---|---|---|
| RT-A01 | Campos obrigatórios: `iss`, `iat`; credenciais também `sub`, `jti`, `exp`. | Hoje a credencial pode não ter `exp` (sem validade) ❓DP-02 |
| RT-A02 | Pedidos levam `aud` com o DID do destinatário e `nonce` de 72 bits ou mais. | Hoje o DID do emissor é opcional no pedido (RN-09); no alvo, obrigatório |
| RT-A03 | Todo pacote trafega como `SYSTEKNA:<TIPO>:<JWT>`. | Hoje o tipo vai no `typ` do cabeçalho ❓DP-05 |
| RT-A04 | Tipos: `PEDIDO-APROVACAO`, `APROVACAO`, `PEDIDO-CREDENCIAMENTO`, `CREDENCIAMENTO`, `CARTAO-SERVICO`, `PEDIDO-CRACHA`, `CRACHA`, `DESAFIO`, `PROVA`. | ❓DP-05 |
| RT-A05 | O app recusa tipo que não espera naquela tela e explica o motivo. | Já vale para o `typ` (RT-25) |
| RT-A06 | QR em modo byte, correção de erro nível M; acima de ~1.800 bytes, comprimir (`deflate-raw` + base64url) ou dividir em QR sequenciais `parte i/n`. | ❓DP-04 |
| RT-A07 | Sempre oferecer a alternativa em texto. | — |
| RT-A08 | Leitura pela câmera com `BarcodeDetector` quando existir, e leitor embutido no próprio HTML como reserva. | `docs_v1` previa biblioteca de CDN: conflita com RT-04 ❓DP-11 |

> **Nota:** `docs_v1/05` propunha `typ:"JWT"` no cabeçalho. A v2 mantém o `typ` específico por artefato (RT-25), que já impede usar um token no lugar de outro.

### 8.2 Payloads de referência do alvo

```json
// Aprovação da Governança
{"iss":"did:key:z6Mk…STK","sub":"did:key:z6Mk…USER","jti":"…","iat":0,"exp":0,
 "tipo":"AprovacaoGovernanca","aprovado":true}

// Credenciamento
{"iss":"did:key:z6Mk…STK","sub":"did:key:z6Mk…SRV1","jti":"…","iat":0,"exp":0,
 "tipo":"EmissorCredenciado","servico":"SRV1","escopo":["APP X"]}

// Cartão do serviço (público)
{"iss":"did:key:z6Mk…SRV1","iat":0,"tipo":"CartaoServico","nome":"SRV1",
 "escopo":["APP X"],"credenciamento":"<JWT do credenciamento>"}

// Crachá
{"iss":"did:key:z6Mk…SRV1","sub":"did:key:z6Mk…USER","jti":"…","iat":0,"exp":0,
 "servico":"SRV1","app":"APP X","credenciamento":"<JWT do credenciamento>"}

// Desafio da portaria
{"iss":"did:key:z6Mk…SRV1","app":"APP X","nonce":"…","iat":0,"exp":0}   // exp = iat + 120

// Prova de posse
{"iss":"did:key:z6Mk…USER","aud":"did:key:z6Mk…SRV1","nonce":"…","iat":0,"cracha":"<JWT>"}
```

### 8.3 Verificação

| ID | Regra |
|---|---|
| RT-A10 | Emissão de crachá: conferir a assinatura do pedido, a assinatura da STK na aprovação, `sub` da aprovação = `iss` do pedido, `exp` futuro e o próprio credenciamento válido. |
| RT-A11 | Uso de crachá: conferir a prova com o `nonce` atual, a assinatura do SRV, `sub` = DID da prova, o credenciamento assinado pela STK com `sub` = SRV, o app no `escopo` e `exp` futuro. |
| RT-A12 | Qualquer falha nega a operação e informa qual verificação falhou (mesma prática do checklist atual). |
| RT-A13 | O DID da Governança é conhecido e publicado (âncora). ❓DP-08: embutido nos apps ou importado como emissor confiável. |
| RT-A14 | Ao ler um Cartão do serviço, a carteira confere a assinatura do serviço e o credenciamento assinado pela STK com `sub` = DID do cartão e validade. |
| RT-A15 | A carteira confere a assinatura do desafio antes de responder (já faz hoje), e a prova leva `aud` = DID do serviço que desafiou. |

### 8.4 Armazenamento do alvo

| ID | Regra |
|---|---|
| RT-A20 | Cada app com seu banco: `systekna-carteira`, `systekna-governanca` (❓ ou manter `systekna-cartorio`, RT-30), `systekna-servico`, com `deviceKey`, `lock`, `meta`, `guard` e os dados do papel. |
| RT-A21 | Governança e App Serviço não persistem pedidos depois de respondidos. ❓DP-01 |
| RT-A22 | O App Serviço guarda os desafios em aberto só em memória, por no máximo 2 minutos. |

### 8.5 Build do alvo

| ID | Regra |
|---|---|
| RT-A30 | Três builds, um HTML por app, todos a partir do mesmo núcleo (`APPS` em `scripts/build.js` ganha os apps novos). |
| RT-A31 | Núcleo em módulos ES puros, sem acesso a `document`, `localStorage` ou `indexedDB`, para os testes unitários (doc 07). |
