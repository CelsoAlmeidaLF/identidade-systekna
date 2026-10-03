# 06 · Critérios de Aceite

> Formato Dado / Quando / Então. Cada critério atual aponta o teste E2E que o cobre (`tests/e2e/`).
> Execução: `npm test` (confere o build e roda tudo) ou `npm run test:e2e`.
> Contra o site publicado: `BASE_URL=https://celsoalmeidalf.github.io/identidade-systekna npm run test:e2e`.
> Situação em 03/10/2026, versão 0.13.0: **106 testes passando** (alguns arquivos rodam nos dois apps).

## 1. Fluxo principal (`criterios-de-aceite.spec.js`)

| CA | Dado / Quando / Então | Regra |
|---|---|---|
| CA-01 | **Dado** um emissor novo, **quando** é criado, **então** o livro tem o ato de abertura e está íntegro. | RF-EM-01, RF-EM-02 |
| CA-02 | **Dado** um pedido válido da carteira, **quando** o emissor o confere, **então** mostra "Pedido conferido"; **e quando** o mesmo pedido volta depois da emissão, **então** é recusado. | RN-01, RN-02 |
| CA-03 | **Dado** uma credencial emitida para o DID da carteira, **quando** é colada em "Receber", **então** é guardada. | RN-10, RF-CT-02 |
| CA-04 | **Dado** um desafio do emissor, **quando** a carteira apresenta uma credencial válida, **então** a apresentação é aprovada em todos os pontos. | RN-18 |
| CA-05 | **Dado** uma apresentação já aprovada, **quando** é reenviada, **então** é recusada (desafio já usado). | RN-14 |
| CA-06 | **Dado** uma credencial colada sozinha, **quando** conferida como apresentação, **então** é recusada com explicação. | RN-16 |
| CA-07 | **Dado** um desafio que exige um tipo que a carteira não tem, **quando** ela o lê, **então** mostra "Nenhuma credencial serve". | RN-17 |
| CA-08 | **Dado** uma credencial revogada, **quando** é apresentada de novo, **então** a apresentação é recusada em "Não revogada". | RN-22 |
| CA-09 | *(retirado: registro de documento, só na `bkp/avancado`)* | — |
| CA-10 | *(retirado: certificado de documento na carteira, só na `bkp/avancado`)* | — |
| CA-11 | **Dado** um ato do livro adulterado no armazenamento, **quando** se confere a integridade, **então** o ato exato é apontado. | RN-27, RN-29 |
| CA-12 | **Dado** um emissor com atos, **quando** é bloqueado e desbloqueado, **então** todos os atos continuam lá. | RN-36 |

## 2. Correções da Fase 1 (`fase1-correcoes.spec.js`)

| CA | Critério | Regra |
|---|---|---|
| CA-13 | A tentativa de PIN é gravada **antes** de a conferência terminar: fechar a aba não a devolve. | RT-36 |
| CA-14 | PIN errado em "Ver as 12 palavras" gasta tentativa. | RN-33 |
| CA-15 | PIN atual errado em "Trocar PIN" gasta tentativa. | RN-33 |
| CA-16 | O emissor recusa credencial cujo `nbf` ainda não chegou. | RN-18 (10) |
| CA-17 | O emissor recusa apresentação que embute um token que não é `vc+jwt`. | RT-25 |
| CA-18 | A carteira recusa token com conteúdo de credencial e `typ` diferente de `vc+jwt`. | RN-11 |
| CA-19 | A carteira recusa credencial já vencida. | RN-11 |
| CA-20 | A carteira recusa credencial que ainda não entrou em vigor. | RN-11 |
| CA-21 | Status não verificável é **recusado por padrão** e aceito só com a política explícita. | RN-20 |
| CA-22 | Cartões antigos saem da carteira ao desbloquear e não voltam pelo backup; o backup restaura na mesma identidade. | RN-44, RN-42 |

## 3. Núcleo criptográfico (`vetores-oficiais.spec.js`, nos dois apps)

| CA | Critério | Regra |
|---|---|---|
| CA-23 | Listas BIP39 idênticas às oficiais (EN e PT). | RNF-19 |
| CA-24 | Entropia ↔ 12 palavras e semente conferem com os vetores Trezor. | RT-10 |
| CA-25 | Checksum BIP39 errado é recusado. | RF-CM-05 |
| CA-26 | HKDF-SHA256 confere com a RFC 5869 (casos 1 a 3). | RNF-20 |
| CA-27 | Ed25519 confere com a RFC 8032 §7.1 (pública, assinatura, verificação). | RNF-21 |
| CA-28 | X25519 confere com a RFC 7748 §6.1. | RNF-21 |
| CA-29 | base58btc codifica e decodifica conforme o draft. | RNF-22 |
| CA-30 | `did:key` Ed25519 dos exemplos da especificação: lê a chave e reconstrói o mesmo DID. | RT-13 |
| CA-31 | A identidade derivada das 12 palavras confere com uma implementação independente em Node. | RNF-24 |

## 4. Segurança da página (`seguranca.spec.js`, nos dois apps)

| CA | Critério | Regra |
|---|---|---|
| CA-32 | Nenhuma requisição sai do site e a fonte vem de `fonts/`. | RNF-01, RNF-09 |
| CA-33 | Script injetado na página não roda (CSP). | RNF-02 |
| CA-34 | A CSP traz o hash exato do script da página. | RT-03 |
| CA-35 | Nenhuma violação de CSP em nenhum dos fluxos testados. | RT-49 |

## 5. App instalável (`pwa.spec.js`, nos dois apps)

| CA | Critério | Regra |
|---|---|---|
| CA-36 | Manifesto válido para instalação, com ícones que carregam. | RNF-29 |
| CA-37 | O próprio Chrome considera o app instalável. | RNF-29 |
| CA-38 | O app abre sem internet depois da primeira visita. | RNF-30 |
| CA-39 | "Instalar no celular" aparece quando o navegador oferece a instalação. | RF-CM-24 |

## 6. Biometria (`biometria.spec.js`, autenticador virtual do Chrome)

| CA | Critério | Regra |
|---|---|---|
| CA-40 | Sem biometria ativada, o ajuste aparece "Desativado" e a tela do PIN não oferece biometria. | RF-CM-10 |
| CA-41 | Ativar pede o PIN e cria a passkey com PRF. | RN-34 |
| CA-42 | Desbloqueia só com a biometria, sem digitar o PIN. | RF-CM-13 |
| CA-43 | O PIN continua funcionando com a biometria ativada. | RN-34 |
| CA-44 | O registro guardado não abre sem o segredo do autenticador. | RNF-04 |
| CA-45 | Desativar apaga o registro e o botão some da tela do PIN. | RF-CM-14 |
| CA-46 | Recuperar outra identidade apaga a biometria da anterior. | RN-40 |
| CA-47 | Biometria não reconhecida mantém bloqueado e **não gasta** tentativa de PIN. | RN-34 |
| CA-48 | Aparelho sem PRF: não ativa e explica por quê. | RNF-07 |
| CA-49 | O emissor também desbloqueia com biometria. | RF-CM-13 |

### 6.1 Só biometria

| CA | Critério | Regra |
|---|---|---|
| CA-50 | A opção "Usar só biometria" só aparece com a biometria ativada. | RN-35 |
| CA-51 | Ativar confere a biometria e apaga o PIN do aparelho. | RN-35 |
| CA-52 | Tela de bloqueio sem teclado: dígitos são ignorados e a biometria abre. | RF-CM-16 |
| CA-53 | Recarregar a página volta para a tela da biometria. | RN-36 |
| CA-54 | "Ver as 12 palavras" pede a biometria no lugar do PIN. | RN-33, RN-35 |
| CA-55 | Não deixa desativar a biometria enquanto ela é a única entrada. | RN-35 |
| CA-56 | Desligar o modo pede a biometria e cria um PIN novo. | RF-CM-17 |
| CA-57 | Recuperar pelas 12 palavras no modo só biometria cria um PIN de novo. | RN-35 |
| CA-58 | Biometria recusada ao ativar o modo mantém o PIN. | RN-35 |
| CA-59 | No modo só biometria, recusa na tela de bloqueio **não** oferece o PIN. | RN-35 |

## 7. Nome do serviço (`nome-emissor.spec.js`)

| CA | Critério | Regra |
|---|---|---|
| CA-60 | **Dado** o endereço antigo `cartorio-systekna.html`, **quando** aberto, **então** leva ao Emissor de Credenciais. | RF-CM-29 |
| CA-61 | Nenhuma tela do emissor mostra a palavra "cartório", em nenhuma aba. | Princípios (doc 04 §1) |
| CA-62 | Os dados ficam no banco de antes (`systekna-cartorio`). | RN-60 |

## 8. Dados pessoais (`dados-pessoais.spec.js`)

| CA | Critério | Regra |
|---|---|---|
| CA-63 | `cpfOk` confere os dígitos verificadores. | RN-51 |
| CA-64 | `piiProblem` barra campos de dado pessoal pelo nome, palavra por palavra (`cpfTitular`, `numero_rg`, `nomeDaMae`). | RN-51 |
| CA-65 | `piiProblem` acha CPF válido no valor, mas não em hash, chave ou número qualquer. | RN-51 |
| CA-66 | A credencial Identidade traz `nome` e `kycValidado`, sem campo de documento. | RN-08, RN-50 |
| CA-67 | `kycValidado` sai como booleano, vira `false` se for removido e recusa outro valor. | RN-08 |
| CA-68 | Emissão com campo `cpf` é recusada e nada vai para o livro. | RN-51 |
| CA-69 | CPF escondido no valor de um campo comum também é recusado. | RN-51 |
| CA-70 | Nome do titular com CPF, vindo do pedido, é recusado. | RN-51 |

## 9. Versão (`versao.spec.js`)

| CA | Critério | Regra |
|---|---|---|
| CA-71 | Cada app mostra a versão do `package.json` nas boas-vindas, no PIN e em Sobre. | RF-CM-30, RN-62 |
| CA-72 | Nenhum marcador `{{versao}}` sobra nos HTML gerados. | RT-07 |

## 10. Cobertura complementar e correções de 03/10/2026 (`cobertura.spec.js`)

| CA | Critério | Regra |
|---|---|---|
| CA-73 | Criar pela tela: as 12 palavras aparecem veladas; a confirmação recusa palavra errada e aceita maiúsculas; PIN fraco é recusado na criação. | RF-CM-01, RF-CM-03, RN-30 |
| CA-74 | PIN fraco (`121212`, `123123`, `987654`, `789012`, `000000`) é recusado na troca de PIN. | RN-30, RT-39 |
| CA-75 | O 5º erro impõe espera de 30 s e avisa quantos erros faltam; durante a espera, nova tentativa é recusada; o 10º erro apaga tudo e volta às boas-vindas. | RN-31, RN-32 |
| CA-76 | Backup é recusado em outra identidade e, com a mesma identidade, no outro serviço. | RN-41 |
| CA-77 | Restaurar o emissor substitui o estado e o livro continua íntegro. | RN-43 |
| CA-78 | Backup do emissor sem livro é recusado. | RN-43 |
| CA-79 | Backup do emissor com um ato do livro alterado é recusado e nada muda no emissor. | RN-43 (correção) |
| CA-80 | Mensagem `smsg1` para a própria chave abre; adulterada ou para outra chave falha (e a outra chave abre). | RF-CT-10, RF-CT-11 |
| CA-81 | Depois do tempo sem uso, a carteira bloqueia sozinha e apaga a sessão. | RN-36 |
| CA-82 | Adicionar emissor confiável faz passar "Emissor confiável"; remover faz falhar. | RN-19, RF-EM-14 |
| CA-83 | Pedido vencido é recusado pelo emissor. | RN-03 |
| CA-84 | Desafio vencido é recusado pela carteira e pelo emissor. | RN-14 |
| CA-85 | A mesma credencial colada duas vezes é recusada. | RN-12 |
| CA-86 | Credencial perto do vencimento aparece como "Vence em N dias". | RF-CT-03 |
| CA-87 | A carteira recusa DID de emissor inválido no pedido. | RN-09 (correção) |
| CA-88 | Pedido endereçado a um DID: outro emissor recusa, o emissor certo confere. | RN-09 (correção) |
| CA-89 | Pedido sem DID continua valendo para qualquer emissor. | RN-09 |

Os critérios propostos CA-P01 a CA-P12 da versão anterior deste documento viraram CA-73 a CA-86.

---

## 11. Critérios do alvo (3 aplicativos)

> Origem: `docs_v1/06`. Status: ⬜. Viram critérios automatizados só depois das decisões indicadas.

### 11.1 Carteira

| CA | Dado / Quando / Então | Decisão |
|---|---|---|
| CA-A01 | **Dado** uma carteira sem aprovação, **quando** gera o pedido para a Governança, **então** o pacote contém só `iss` (DID), `aud`, `kind`, `nonce` e `iat`, assinado, e aparece como QR e texto. | ❓DP-03, DP-04 |
| CA-A02 | **Dado** uma aprovação emitida para este DID, **quando** a carteira a lê, **então** confere a assinatura com o DID da Governança e mostra "Aprovada até…". | ❓DP-08 |
| CA-A03 | **Dado** uma aprovação para outro DID, **quando** a carteira tenta guardá-la, **então** recusa com "Esta aprovação não é deste DID". | — |
| CA-A04 | **Dado** o Cartão de um serviço, **quando** a carteira o lê, **então** mostra nome, apps e "Credenciado pela Governança até…"; credenciamento inválido ou vencido bloqueia o pedido de crachá. | — |
| CA-A05 | **Dado** dois serviços credenciados, **quando** a pessoa recebe crachá dos dois, **então** "Meus crachás" mostra os dois, com serviço, app e validade. | — |
| CA-A06 | **Dado** um crachá válido e um desafio da portaria, **quando** a pessoa confirma, **então** a carteira mostra a prova assinada como QR, sem nenhum dado pessoal. | ❓DP-04 |

### 11.2 Governança

| CA | Dado / Quando / Então | Decisão |
|---|---|---|
| CA-A10 | **Dado** um pedido de aprovação, **quando** o operador confere a pessoa fora do sistema e aprova, **então** a aprovação aparece como QR e o pedido é descartado, sem registro. | ❓DP-01, DP-02 |
| CA-A11 | **Dado** um pedido alterado depois de assinado, **quando** lido pela Governança, **então** a assinatura falha e aprovar fica desabilitado. (Equivale ao CA-02 atual.) | — |
| CA-A12 | **Dado** um pedido de credenciamento, **quando** o operador define escopo e validade e credencia, **então** o credenciamento sai com `sub` = DID do serviço e o escopo definido. | — |
| CA-A13 | **Dado** várias aprovações e credenciamentos, **quando** o armazenamento da Governança é inspecionado, **então** só existe a chave da Governança. | ❓DP-01, DP-02 |

### 11.3 App Serviço

| CA | Dado / Quando / Então |
|---|---|
| CA-A20 | **Dado** um serviço configurado, **quando** gera o pedido de credenciamento, **então** o pacote é assinado pelo DID do serviço e mostra os apps pretendidos. |
| CA-A21 | **Dado** um serviço credenciado, **quando** abre "Cartão do serviço", **então** exibe um QR com DID, nome, escopo e credenciamento. |
| CA-A22 | **Dado** um pedido de crachá com aprovação válida, **quando** o serviço confere, **então** tudo passa sem comunicação com a Governança e o crachá é emitido. |
| CA-A23 | **Dado** um serviço com credenciamento vencido, **quando** recebe um pedido, **então** a emissão fica bloqueada com o motivo. |
| CA-A24 | **Dado** um pedido sem aprovação, vencida ou de outro DID, **quando** o serviço confere, **então** a emissão é bloqueada e mostra qual conferência falhou. |
| CA-A25 | **Dado** um crachá válido do próprio serviço, **quando** a portaria lê a prova, **então** confere posse, assinatura, titular, credenciamento, escopo e validade e mostra "Acesso liberado". |
| CA-A26 | **Dado** um crachá usado por quem não tem a chave do DID, **então** "Dono do DID" falha e o acesso é negado. |
| CA-A27 | **Dado** uma prova já aceita, **quando** apresentada de novo, **então** o acesso é negado (desafio já usado). |
| CA-A28 | **Dado** um crachá do APP X, **quando** apresentado na portaria do APP Y, **então** o acesso é negado por escopo. |

### 11.4 Ecossistema

| CA | Dado / Quando / Então | Decisão |
|---|---|---|
| CA-A30 | **Dado** os fluxos F1 a F4, **quando** todos os pacotes são inspecionados, **então** nenhum contém nome, CPF, nascimento ou endereço. | ❓DP-03 |
| CA-A31 | **Dado** os artefatos emitidos, **quando** vence o crachá, **então** a carteira orienta pedir outro ao serviço, sem a Governança; **quando** vencem aprovação e credenciamento, **então** é preciso voltar à Governança. | ❓DP-07 |
| CA-A32 | **Dado** os três apps em aparelhos diferentes, **quando** o fluxo completo é feito só por QR, **então** tudo funciona sem servidor e sem armazenamento compartilhado. | ❓DP-04, DP-06 |
| CA-A33 | **Dado** um crachá com o credenciamento anexado, **quando** exibido como QR, **então** é lido por câmera comum (compressão ou QR em sequência). | ❓DP-04 |

## 12. Definição de pronto (DoD)

1. `npm version` + `npm run build` executados; HTML e `sw.js` gerados commitados junto com `src/`.
2. `npm test` verde (build em dia + todos os E2E).
3. Toda correção ou regra nova com teste que falharia sem ela.
4. Nenhuma violação de CSP.
5. Esta pasta `docs_v2/` atualizada quando a regra mudar.
6. Versão nova citada na mensagem de publicação, para conferência no celular.
