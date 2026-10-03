# 07 · Estratégia de Testes

> Junta as regras de teste da v0 (E2E, que existem) e da v1 (unitários, que são alvo).
> Situação em 03/10/2026: **só há testes E2E** (Playwright). Os testes unitários são ⬜, e os casos que já são cobertos por E2E estão indicados.

## 1. Pirâmide de testes

| Nível | Ferramenta | O que cobre | Status |
|---|---|---|---|
| Unitário | Node 22+ (`node:test` ou Vitest), WebCrypto nativo | Funções puras do núcleo e regras de decisão | ⬜ |
| E2E | Playwright no Chrome do sistema | Fluxos completos nas páginas geradas, CSP, PWA, biometria com autenticador virtual | ✅ (106 testes) |
| Contra produção | Playwright com `BASE_URL` | O mesmo E2E no site publicado | ✅ (opcional) |

## 2. Testes E2E (atuais)

### 2.1 Arquivos

| Arquivo | Cobre | Critérios |
|---|---|---|
| `criterios-de-aceite.spec.js` | Fluxo principal: pedido, emissão, apresentação, revogação, livro | CA-01…12 |
| `fase1-correcoes.spec.js` | Contador do PIN, `nbf`, `typ`, validade, política, cartões e backup | CA-13…22 |
| `vetores-oficiais.spec.js` | BIP39, HKDF, Ed25519, X25519, base58, `did:key`, Node independente (nos dois apps) | CA-23…31 |
| `seguranca.spec.js` | Nenhuma requisição externa, CSP (nos dois apps) | CA-32…35 |
| `pwa.spec.js` | Manifesto, instalável, offline, botão de instalar (nos dois apps) | CA-36…39 |
| `biometria.spec.js` | Passkey com PRF, só biometria | CA-40…59 |
| `nome-emissor.spec.js` | Endereço antigo, sem "cartório", banco mantido | CA-60…62 |
| `dados-pessoais.spec.js` | `cpfOk`, `piiProblem`, `kycValidado`, trava na emissão | CA-63…70 |
| `versao.spec.js` | Versão nos apps e marcadores trocados | CA-71, CA-72 |
| `cobertura.spec.js` | Criação pela tela, PIN fraco, espera e apagamento, backups recusados, restauração do emissor, mensagens, bloqueio automático, confiança, prazos, duplicidade, aviso de vencimento, pedido endereçado | CA-73…89 |
| `helpers.js` | Passos comuns: `preparar`, `bloquearEDesbloquear`, `vigiarCsp`, `payloadDe` | — |
| `../fixtures/` | Listas BIP39 oficiais e `vetores-oficiais.json` | — |

### 2.2 Regras dos testes E2E

| ID | Regra |
|---|---|
| RTE-01 | Chrome do sistema (`channel:'chrome'`), 1 worker, em série: o fluxo é uma história contínua. |
| RTE-02 | Timeout de 120 s por teste e 20 s por `expect` (o PIN usa PBKDF2 com 600 mil iterações). |
| RTE-03 | Servidor local `python3 -m http.server 4173`, ou `BASE_URL` para o site publicado. |
| RTE-04 | Identidades fixas de teste: `abandon … about` (carteira), `zoo … wrong` (emissor), `legal winner … yellow` (outro emissor). PIN de teste `135790`. |
| RTE-05 | Biometria com o autenticador virtual do Chrome (CDP WebAuthn), inclusive sem PRF e com verificação recusada. |
| RTE-06 | Todo arquivo de fluxo vigia o console e termina com "nenhuma violação de CSP". |
| RTE-07 | Cada correção ganha um teste que falharia na versão anterior. |
| RTE-08 | `npm test` roda `build:check` antes: HTML ou `sw.js` desatualizados falham a suíte. |
| RTE-09 | Proibido usar dados pessoais reais. CPF de teste só com dígitos válidos gerados para teste. |

## 3. Testes unitários (alvo)

### 3.1 Escopo

| Entra | Fica no E2E |
|---|---|
| Funções puras do núcleo: BIP39, derivação, DID, base58, JWT, verificações, PIN, validade, `piiProblem` | Fluxo completo entre os apps |
| Regras de decisão: pode emitir, pode aprovar, pode liberar | Visual, tema, layout |
| Cifrar e decifrar registros, mensagens e backup | Armazenamento real do navegador |

### 3.2 Código testável

| ID | Regra |
|---|---|
| RTU-01 | Extrair o núcleo para módulos ES puros: `bip39.js`, `keys.js`, `did.js`, `base58.js`, `jwt.js`, `aead.js`, `pin.js`, `pii.js`, `rules.js`, `envelope.js`. Hoje tudo está em `src/shared/nucleo.js`. |
| RTU-02 | O build continua gerando **um HTML por app**, concatenando os módulos (RT-02, RT-03). |
| RTU-03 | As regras de cada papel ficam no app correspondente: `carteira/rules.js`, `emissor/rules.js` (e, no alvo, `governanca/rules.js`, `servico/rules.js`). |
| RTU-04 | Funções do núcleo não acessam `document`, `localStorage` nem `indexedDB`. |
| RTU-05 | **Relógio injetável:** toda função que usa tempo recebe `now` como parâmetro (`isValid(token, now)`). Hoje usa `now()` global. |
| RTU-06 | **Aleatoriedade injetável:** `nonce` e IV podem ser passados no teste; em produção vêm de `crypto.getRandomValues`. |
| RTU-07 | Armazenamento por interface (`get`, `set`, `del`), com implementação em memória para teste (já existe `DB._mem`). |

### 3.3 Ferramentas e organização

| ID | Regra |
|---|---|
| RTU-10 | Executor `node:test` (sem dependência nova) ou Vitest, em Node 22+, que tem WebCrypto com Ed25519 e X25519. |
| RTU-11 | Sem biblioteca criptográfica de terceiros nos testes: o mesmo WebCrypto da produção. |
| RTU-12 | Cobertura com `--experimental-test-coverage` (node) ou `@vitest/coverage-v8`. |
| RTU-13 | Um arquivo de teste por módulo: `tests/unit/core/jwt.test.js`, `tests/unit/emissor/emissao.test.js`. Nenhum teste de um app importa código de outro app. |
| RTU-14 | O nome do teste carrega o ID do critério: `TU-JWT-04: recusa token com iss diferente do kid`. |
| RTU-15 | Padrão Organizar · Agir · Verificar, uma regra por teste. |

### 3.4 Dados e comportamento

| ID | Regra |
|---|---|
| RTU-20 | Vetores oficiais sempre que existirem (já estão em `tests/fixtures/vetores-oficiais.json`). |
| RTU-21 | Chaves de teste só de 12 palavras conhecidas (RTE-04). |
| RTU-22 | Tempo fixo `NOW = 1790000000`, salvo quando o teste é sobre o relógio. |
| RTU-23 | Determinísticos, isolados, sem rede (chamada de rede falha o teste). |
| RTU-24 | Rápidos: cada teste < 200 ms, suíte < 30 s. PBKDF2 do PIN com iteração reduzida, e um único teste "lento" com 600.000. |
| RTU-25 | Para todo caso positivo, ao menos um negativo: token alterado, vencido, de outro DID, de outro emissor. |
| RTU-26 | Nenhum `skip` ou `only` no repositório. Teste que falha não é apagado sem registro do motivo. |
| RTU-27 | Bug encontrado gera primeiro o teste que o reproduz, depois a correção. |

### 3.5 Segurança e privacidade

| ID | Regra |
|---|---|
| RTU-30 | Todo verificador tem teste de assinatura adulterada (1 byte no payload e na assinatura). |
| RTU-31 | Todo artefato com `exp` tem teste de 1 segundo antes e 1 segundo depois. |
| RTU-32 | Todo pedido tem teste garantindo que o payload não leva `cpf`, `nascimento`, `endereco` (e `nome`, se a DP-03 for decidida assim). |
| RTU-33 | Funções que guardam dados têm teste garantindo que o texto original não aparece no que foi guardado. |
| RTU-34 | Testes de PIN cobrem todos os padrões fracos da RT-39. |

### 3.6 Cobertura mínima

| Módulo | Linhas | Ramos |
|---|---|---|
| `jwt.js`, `pii.js`, `envelope.js` e os `rules.js` | 100% | 100% |
| `bip39.js`, `did.js`, `base58.js`, `keys.js`, `aead.js` | ≥ 95% | ≥ 90% |
| `pin.js` | ≥ 95% | ≥ 95% |
| Núcleo total | ≥ 90% | ≥ 85% |

Cobertura abaixo do mínimo **bloqueia** a publicação (quando os unitários existirem).

## 4. Catálogo de testes unitários

> Coluna **E2E**: ✅ = o caso já é coberto hoje por um teste E2E; vazio = ainda sem teste nenhum.
> Os valores completos dos vetores estão em `tests/fixtures/vetores-oficiais.json`.

### 4.1 BIP39 — RT-10

| ID | Cenário | Esperado | E2E |
|---|---|---|---|
| TU-B01 | Entropia de 16 bytes zerados, lista EN | `abandon` ×11 + `about` | ✅ |
| TU-B02 | Semente de `abandon … about`, sem passphrase | começa com `5eb00bbddcf069084889a8ab9155568165f5c453` | ✅ |
| TU-B03 | Ida e volta: entropia → palavras → entropia, PT e EN | idêntica | |
| TU-B04 | 11 ou 13 palavras | erro `count` | |
| TU-B05 | 12ª palavra `zzz` | erro `word` com a posição 12 | |
| TU-B06 | Duas palavras válidas trocadas de posição | erro `checksum` | ✅ |
| TU-B07 | Maiúsculas, acentos, espaços extras | aceitas, iguais às normalizadas | |
| TU-B08 | 12 palavras PT válidas | idioma `pt` | |
| TU-B09 | Listas PT e EN | 2048 palavras cada, iguais às oficiais | ✅ |

### 4.2 Chaves — RT-11, RT-12

| ID | Cenário | Esperado | E2E |
|---|---|---|---|
| TU-K01 | Ed25519 RFC 8032, teste 1: pública | `d75a9801…07511a` | ✅ |
| TU-K02 | Ed25519 RFC 8032, teste 1: assinatura da mensagem vazia | `e5564300…7a100b` | ✅ |
| TU-K03 | X25519 RFC 7748 §6.1: pública de Alice | `8520f009…9b4e6a` | ✅ |
| TU-K04 | X25519: segredo compartilhado Alice × Bob | `4a5d9d5b…161742` | ✅ |
| TU-K05 | HKDF RFC 5869, casos 1 a 3 | OKM oficial | ✅ |
| TU-K06 | Mesmas 12 palavras duas vezes | mesmo DID e mesma X25519 | ✅ |
| TU-K07 | Uma semente | Ed25519, X25519 e AES diferentes entre si | |
| TU-K08 | Identidade derivada | chave privada com `extractable: false` | |

### 4.3 DID e base58 — RT-13, RT-24

| ID | Cenário | Esperado | E2E |
|---|---|---|---|
| TU-D01 | DID da pública do vetor RFC 8032 | `did:key:z6MktwupdmLXVVqTzCw4i46r4uGyosGXRnR3XjN4Zq7oMMsw` | ✅ |
| TU-D02 | DID → chave pública | os mesmos 32 bytes | ✅ |
| TU-D03 | Qualquer Ed25519 | começa com `did:key:z6Mk` | |
| TU-D04 | Qualquer X25519 | começa com `z6LS` | |
| TU-D05 | `did:web:exemplo.com` | erro "não usa did:key" | |
| TU-D06 | `did:key` com chave X25519 | erro "não é uma chave Ed25519" | |
| TU-D07 | Caractere `0`, `O`, `I` ou `l` em base58 | erro | |
| TU-D08 | Bytes `00 00 01` | codifica `112` e volta igual | |

### 4.4 JWT — RT-23…26

| ID | Cenário | Esperado | E2E |
|---|---|---|---|
| TU-JWT-01 | Assinar e verificar | `ok = true` | ✅ |
| TU-JWT-02 | Cabeçalho | `alg = EdDSA`, `kid = <did>#<edMb>`, `typ` do artefato | |
| TU-JWT-03 | 1 caractere trocado no payload | `ok = false` | |
| TU-JWT-04 | `iss` de outro DID | recusado | |
| TU-JWT-05 | Cabeçalho de A, assinatura de B | `ok = false` | |
| TU-JWT-06 | 2 partes ou texto aleatório | erro de formato, sem exceção não tratada | |
| TU-JWT-07 | `alg: none` ou `HS256` | recusado | |
| TU-JWT-08 | Payload com acentos | decodifica igual | |
| TU-JWT-09 | `typ` diferente do esperado | recusado com mensagem que diz o tipo | ✅ |

### 4.5 Cifra — RT-14, RT-19, RT-20

| ID | Cenário | Esperado | E2E |
|---|---|---|---|
| TU-AE01 | Cifrar e decifrar objeto JSON | idêntico | ✅ |
| TU-AE02 | Mesmo texto duas vezes | IVs e cifrados diferentes | |
| TU-AE03 | Cifrar "senha123" | o cifrado não contém "senha123" | |
| TU-AE04 | Decifrar com outra chave | erro | |
| TU-AE05 | 1 byte trocado | erro (autenticação GCM) | |
| TU-AE06 | AAD diferente (outro `id`) | erro | |
| TU-AE07 | `smsg1` para a X25519 de B, aberta por B | texto original | |
| TU-AE08 | `smsg1` para B, aberta por C | "não foi cifrada para a sua chave" | |
| TU-AE09 | Backup de outra identidade | "pertence a outra identidade ou foi alterado" | |

### 4.6 PIN — RT-35…39

| ID | Cenário | Esperado | E2E |
|---|---|---|---|
| TU-P01 | `271828` | aceito | |
| TU-P02 | Todos iguais (`000000` a `999999`) | recusado | |
| TU-P03 | `123456`, `456789`, `890123` | recusado | |
| TU-P04 | `654321`, `987654`, `210987` | recusado | |
| TU-P05 | `121212` | recusado | |
| TU-P06 | `123123` | recusado | |
| TU-P07 | PIN certo | devolve a entropia original | ✅ |
| TU-P08 | PIN errado | `PinError` | ✅ |
| TU-P09 | Sem `deviceKey` | erro diferente de `PinError` | |
| TU-P10 | Falhas 4, 5, 6, 7 | espera 0, 30, 60, 120 s | |
| TU-P11 | 10ª falha | dados apagados | |
| TU-P12 | PIN certo depois de falhas | contador volta a 0 | |
| TU-P13 | Valor real (lento) | `iter` gravado = 600000 | |

### 4.7 Dados pessoais — RN-51

| ID | Cenário | Esperado | E2E |
|---|---|---|---|
| TU-PII01 | CPF com dígitos válidos, com e sem pontuação | `cpfOk = true` | ✅ |
| TU-PII02 | `000.000.000-00`, dígito errado | `cpfOk = false` | ✅ |
| TU-PII03 | Campo `cpfTitular`, `numero_rg`, `nomeDaMae` | recusado | ✅ |
| TU-PII04 | CPF válido dentro de um texto | recusado | ✅ |
| TU-PII05 | Número de 11 dígitos dentro de hash ou chave | aceito | ✅ |

### 4.8 Regras do emissor atual

| ID | Cenário | Esperado | E2E |
|---|---|---|---|
| TU-EM01 | Pedido válido | pode emitir | ✅ |
| TU-EM02 | Pedido com nonce já atendido | recusado | ✅ |
| TU-EM03 | Pedido vencido | recusado | |
| TU-EM04 | Identidade sem `kycValidado` | sai `false` | ✅ |
| TU-EM05 | `kycValidado` = `"talvez"` | recusado | ✅ |
| TU-EM06 | Checklist com credencial revogada | "Não revogada" falha | ✅ |
| TU-EM07 | Checklist com credencial de outro emissor e política "recusar" | falha | ✅ |
| TU-EM08 | Desafio de outro emissor ou já usado | falha | ✅ |
| TU-EM09 | Livro com um ato alterado | `checkBook` aponta o ato | ✅ |

### 4.9 Alvo: envelopes, Cartão do serviço, portaria

> Status ⬜. Valem só depois das decisões DP-04 e DP-05.

| ID | Cenário | Esperado |
|---|---|---|
| TU-E01 | JWT + tipo `CRACHA` | `SYSTEKNA:CRACHA:<jwt>` lido como `CRACHA` e o mesmo JWT |
| TU-E02 | Os 9 tipos da RT-A04 | cada um reconhecido |
| TU-E03 | Texto sem `SYSTEKNA:` | "não é um pacote Systekna" |
| TU-E04 | `SYSTEKNA:XYZ:…` | erro de tipo |
| TU-E05 | `CRACHA` lido na tela de aprovação | recusado, explicando o tipo esperado |
| TU-E06 | `aud` de outro DID | recusado |
| TU-E07 | Pacote acima de 1.800 bytes | comprimido e descomprimido idêntico |
| TU-E08 | Pacote em `parte i/n` | remontado idêntico, em qualquer ordem |
| TU-S01 | Cartão do serviço válido | aceito, com nome, escopo e validade |
| TU-S02 | Credenciamento não assinado pela Governança | recusado |
| TU-S03 | Credenciamento de outro serviço | recusado |
| TU-S04 | Credenciamento vencido | recusado |
| TU-S05 | Cartão com escopo alterado | assinatura inválida |
| TU-DS01 | Desafio da portaria | assinado pelo serviço, `exp = iat + 120`, nonce único |
| TU-DS02 | Carteira recebe desafio válido | prova com `aud` = DID do serviço |
| TU-DS03 | Desafio com assinatura inválida | carteira não responde |
| TU-DS04 | Desafio vencido | carteira não responde |
| TU-R01 | Pedido de aprovação | só `iss`, `aud`, `kind`, `nonce`, `iat` |
| TU-R02 | Qualquer pedido | sem `nome`, `cpf`, `nascimento`, `endereco` |
| TU-R10…R13 | Governança pode aprovar / credenciar | conforme RT-A10 e payloads do doc 05 |
| TU-R20…R29 | Serviço pode emitir crachá | conforme RN-A20…A24 e RT-A10; decisão sem rede |
| TU-R30…R40 | Portaria libera | conforme RT-A11; recusa diz qual conferência falhou |
| TU-V01…V05 | Validade e relógio | 1 s antes vale, no `exp` não vale; relógio +25 h invalida o crachá; +1 ano invalida aprovação e credenciamento; crachá vencido orienta voltar ao serviço |

## 5. Critérios de aprovação da suíte unitária (alvo)

1. Todos os testes acima existem, com o ID no nome.
2. 100% passam em Node 22+.
3. Cobertura mínima da seção 3.6 atingida.
4. Nenhum teste usa rede, dado pessoal real, `skip` ou `only`.
5. Suíte completa em menos de 30 segundos.
6. Os vetores oficiais (TU-B01, B02, B09, K01…K05, D01) passam sem alteração.
