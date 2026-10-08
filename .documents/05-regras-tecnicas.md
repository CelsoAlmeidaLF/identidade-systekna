# 05 · Regras Técnicas

## 1. Código e build

| ID | Regra |
|---|---|
| RT-01 | Código-fonte em `<projeto>/src/` (`stk-carteira`, `stk-governanca`, `stk-servicos`) e `compartilhado/src/`; testes em `<projeto>/tests/`. `carteira-`, `governanca-` e `servicos-systekna.html` são gerados na raiz por `npm run build` (rodado dentro de `compartilhado/`) e commitados juntos |
| RT-02 | Inclusão por `<!-- @inclui caminho -->`; cada página tem exatamente 1 `<script>` inline, com o hash na CSP |
| RT-03 | Nada carregado de fora do site; sem `eval`, sem handler inline |
| RT-04 | Ordem do script: `compartilhado/src/nucleo.js` → `compartilhado/src/livro.js` (Governança e Serviços) → `<projeto>/src/app.js` |
| RT-05 | A versão vem do `package.json`; o build grava `systekna-<versão>` no `sw.js`; `build:check` acusa diferença |
| RT-06 | Toda publicação sobe a versão (`npm version x.y.z --no-git-tag-version` + `npm run build`) |

## 2. Criptografia e derivação

| ID | Regra |
|---|---|
| RT-10 | Só WebCrypto e `crypto.getRandomValues` |
| RT-11 | Entropia de 16 bytes → 12 palavras BIP39 → semente PBKDF2-SHA512 (sal `mnemonic`, 2048) |
| RT-12 | HKDF-SHA256, sal `systekna-cofre-v1`, rótulo = `[domínio/]` + `ssi/ed25519` · `ssi/x25519` · `vault/aes-256-gcm` |
| RT-13 | Domínios: Carteira nº 0 = nenhum; Carteira nº n = `perfil/<n>`; Governança = `governanca`; Serviços = `servicos` |
| RT-14 | `meta.dom` guarda o domínio; meta sem `dom` = identidade antiga, que continua com os rótulos originais |
| RT-15 | DID = `did:key:z` + base58btc(`0xed01` + pública Ed25519) |
| RT-16 | AES-256-GCM com IV de 12 bytes; AAD por contexto (`device`, `pin`, `bio`, `backup`, `state`, id do item) |
| RT-17 | Cadeado do PIN: PBKDF2-SHA256 600.000 → AES-GCM sobre a camada da chave do aparelho; cadeado da biometria: HKDF do segredo PRF |
| RT-18 | Livro: `hash = SHA-256({n, at, act, text, ref, prev})`, assinado; cada ato conferido com a chave da época (`st.keys`) |

## 3. Tokens

| ID | Regra |
|---|---|
| RT-20 | Cabeçalho `{alg:'EdDSA', typ, kid:'<did>#<chave>'}`; só EdDSA; chave lida do próprio DID |
| RT-21 | `typ` por artefato: `pedido+jwt`, `vc+jwt`, `desafio+jwt`, `vp+jwt`, `cartao+jwt`, `recusa+jwt`, `rotacao+jwt` |
| RT-22 | Envelope `SYSTEKNA:<TIPO>:<JWT>` na saída; na entrada, o tipo do envelope precisa bater com o conteúdo; JWT sem envelope ainda é aceito (versões anteriores) |
| RT-23 | Tipos do envelope: `PEDIDO-APROVACAO`, `APROVACAO`, `PEDIDO-CREDENCIAMENTO`, `CREDENCIAMENTO`, `PEDIDO-CRACHA`, `CRACHA`, `CARTAO-SERVICO`, `RECUSA`, `DESAFIO`, `PROVA`, `ROTACAO` (e `PEDIDO-CREDENCIAL`/`CREDENCIAL` da Personalizada) |
| RT-24 | Tempos em segundos Unix; folga de 60 s para `nbf` |
| RT-25 | `jti` = `urn:uuid:<UUID>`; `credentialStatus` com número sequencial |
| RT-26 | **cv:key** = `cv:key:z` + base58btc(16 bytes do UUID do `jti` do crachá) |
| RT-27 | W3C VC 1.1 (`https://www.w3.org/2018/credentials/v1`) |

### 3.1 Payloads de referência

```jsonc
// Pedido de aprovação de identidade (assinado pela identidade escolhida)
{"iss":"did:key:…P","sub":"did:key:…P","aud":"emissor","name":"Maria Silva","perfil":"profissional",
 "perfilNome":"","apelido":"Profissional","wanted":"IdentityCredential","nonce":"…","iat":0,"exp":0}

// Aprovação de emissão (STK → serviço)
{"iss":"did:key:…STK","sub":"did:key:…SRV","jti":"urn:uuid:…","exp":0,
 "vc":{"type":["VerifiableCredential","ServiceAccreditationCredential"],
       "credentialSubject":{"id":"did:key:…SRV","servico":"Meus Serviços Financeiros","apps":["Câmbio","Taxômetro"]}}}

// Cartão do serviço
{"iss":"did:key:…SRV","name":"Meus Serviços Financeiros","apps":["Câmbio","Taxômetro"],"aprovacoes":["<JWT>"],"iat":0,"exp":0}

// Pedido de acesso (assinado pela identidade escolhida)
{"iss":"did:key:…P","sub":"did:key:…P","aud":"did:key:…SRV","name":"Maria Silva","perfil":"Profissional",
 "wanted":"BadgeCredential","apps":["Câmbio"],"identidade":"<JWT da aprovação>","servico":"…","nonce":"…","iat":0,"exp":0}

// Crachá (CV:KEY)
{"iss":"did:key:…SRV","sub":"did:key:…P","jti":"urn:uuid:…","exp":0,
 "vc":{"type":["VerifiableCredential","BadgeCredential"],"credentialSubject":{"id":"did:key:…P","servico":"…","app":"Câmbio"},
       "evidence":[{"type":["CredenciamentoSystekna"],"credenciamento":"<JWT da aprovação de emissão do app>"}]}}

// Recusa de acesso
{"iss":"did:key:…SRV","sub":"did:key:…P","nonce":"<nonce do pedido>","apps":["Taxômetro"],"motivo":"Não é cliente","servico":"…","iat":0}
```

## 4. Armazenamento

| ID | Regra |
|---|---|
| RT-30 | IndexedDB, store `kv`: `meta`, `deviceKey`, `lock`, `bioLock`, `guard` e os dados do app |
| RT-31 | Carteira: `items` (cada item cifrado com AAD = id), tipos `cred`, `perfil`, `acesso`; tipos desconhecidos são mantidos; `cartao` é apagado |
| RT-32 | Governança e Serviços: um único `state` cifrado (AAD `state`) |
| RT-33 | Migrações ao abrir: identidades da 0.17 (apelido) → nome + perfil; Serviços da 0.18 (`cred`) → `aprovacoes` |
| RT-34 | `localStorage` só para tema e bloqueio automático |

## 5. PIN

| ID | Regra |
|---|---|
| RT-40 | `PIN_ITER = 600000`, `SOFT_FAILS = 5`, `MAX_FAILS = 10`; espera `30 s × 2^(falhas−5)` |
| RT-41 | Grava a tentativa antes de conferir; sucesso zera |
| RT-42 | PIN fraco: todos iguais, sequências (inclusive com volta), par ×3, trinca ×2 |

## 6. Interface

| ID | Regra |
|---|---|
| RT-50 | `esc()` em todo texto dinâmico; ações destrutivas com `confirmSheet` |
| RT-51 | Cartões: classe `cred` + `g-<tipo>` + `p-<perfil>` (cores); botão de copiar dentro do cartão não abre o detalhe |
| RT-52 | Rodapé em grade (`--n`), com o `+` (`#dockAdd`) no centro |
