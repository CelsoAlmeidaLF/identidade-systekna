# 07 · Testes

## 1. Como rodar

| Comando | O que faz |
|---|---|
| `cd compartilhado && npm test` | Confere o build (`build:check`) e roda todos os testes E2E |
| `cd compartilhado && npm run test:e2e -- ../stk-carteira/tests` (ou `../stk-governanca/tests`, `../stk-servicos/tests`, `tests`) | Roda os testes de um projeto |
| `cd compartilhado && npm run test:e2e -- ../<projeto>/tests/<arquivo>.spec.js` | Roda um arquivo |
| `cd compartilhado && BASE_URL=https://celsoalmeidalf.github.io/identidade-systekna npm run test:e2e` | Roda contra o site publicado |

Os testes usam o Chrome do sistema, 1 worker, em série (cada arquivo é uma história contínua), 120 s por teste.

## 2. Arquivos

Cada teste fica na pasta do projeto que ele exercita; os que valem para os 3 apps ficam em `compartilhado/tests/` (com `helpers.js` e `fixtures/`).

| Arquivo | Cobre |
|---|---|
| `stk-carteira/tests/identidades.spec.js` | Várias identidades, perfis, solicitar/aprovar identidade, cartões, rodapé |
| `stk-servicos/tests/emissao.spec.js` | Aprovação do serviço (sem apps), Serviço › Apps › Funcionalidades e grupos, Cartão do app, crachá com funcionalidades, portaria por funcionalidade, migração da 0.21 |
| `stk-carteira/tests/cofre.spec.js` | Cofre de anotações: criar, buscar, copiar, editar, apagar, itens antigos ocultos, bloqueio, backup como arquivo (0.28) |
| `stk-servicos/tests/uso.spec.js` | Relatório de uso do Painel: períodos, filtro por app, registros antigos do livro, gestão (0.24) |
| `stk-carteira/tests/acesso.spec.js` | Acesso a apps: Cartão do serviço e do app, pedido, análise, crachá com cv:key, recusa assinada, portaria |
| `stk-governanca/tests/governanca.spec.js` | Envelope, uma identidade ativa por DID, regras da STK |
| `stk-governanca/tests/rotacao.spec.js` | Troca de chave da STK e importação do aviso |
| `stk-governanca/tests/fila.spec.js` | Fila de pedidos da STK: receber vários, Aguardando · Aprovados · Reprovados, vencido, bloqueio (1.1) |
| `stk-servicos/tests/servicos.spec.js` | Crachás e portaria (versão anterior das telas — ver §4) |
| `compartilhado/tests/dominio.spec.js` | Um DID por app a partir das mesmas 12 palavras |
| `stk-governanca/tests/criterios-de-aceite.spec.js` | Fluxo base: pedido, emissão, apresentação, revogação, livro |
| `compartilhado/tests/cobertura.spec.js` | PIN fraco, espera, apagamento, backups, mensagens, bloqueio, prazos |
| `compartilhado/tests/fase1-correcoes.spec.js` | Contador do PIN, `nbf`, `typ`, validade, política |
| `stk-governanca/tests/dados-pessoais.spec.js` | Trava de CPF/RG; identidade só com nome |
| `compartilhado/tests/biometria.spec.js` | Passkey com PRF, só biometria |
| `compartilhado/tests/vetores-oficiais.spec.js` | BIP39, HKDF, Ed25519, X25519, base58, did:key; DID de cada app contra o Node |
| `compartilhado/tests/recuperacao.spec.js` | Código de recuperação, QR (lido de volta pelo jsQR), PDF dos Ajustes e da criação, recuperar pelo código e pelo QR (0.23) |
| `compartilhado/tests/exportar-livro.spec.js` | Exportar o livro em PDF e Excel na Governança e no Serviços, períodos, livro adulterado (0.25) |
| `compartilhado/tests/seguranca`, `pwa`, `versao` · `stk-governanca/tests/nome-emissor` | CSP, instalação/offline, versão, nome da Governança e banco antigo |

## 3. Regras

| ID | Regra |
|---|---|
| RTE-01 | Cada entrega testa **só o que mudou**; merge só com o teste aprovado |
| RTE-02 | Teste aprovado = estável: em caso de dúvida, rodar mais de uma vez |
| RTE-03 | Ler o valor de um pacote só depois que ele aparece (a assinatura termina depois do clique) |
| RTE-04 | Identidades de teste só com frases BIP39 conhecidas; nunca dados reais |
| RTE-05 | Todo arquivo de fluxo termina conferindo que não houve violação de CSP |

## 4. Situação da suíte completa (08/10/2026, código 1.0.0)

**177 passaram · 4 falharam · 37 não rodaram** (dependiam dos que falharam, no mesmo arquivo), em 13,9 min. São as mesmas 4 falhas da 0.22.1; nenhuma nova. Na 0.22.1 eram 156 aprovados. Na 0.23.0, `recuperacao.spec.js` (9 testes) passou, e os arquivos afetados pela recuperação rodaram com 80 aprovados e só a falha antiga de `identidades.spec.js`.

As 4 falhas são de **testes antigos que esperam telas que mudaram depois deles** — os testes de cada entrega nova passaram:

| Teste | Por que falha |
|---|---|
| `identidades.spec.js` › "o menu + tem as três ações…" | Escrito na 0.18 (3 ações); a 0.20 tem 5 (o `acesso.spec.js` já confere as 5) |
| `dados-pessoais.spec.js` › "o pedido de identidade abre o cartão…" | Espera o perfil "Pessoal" da 0.17; desde a 0.18 o perfil é "Identidade" |
| `governanca.spec.js` › grupo "credenciamento de serviços" | Usa o formulário técnico da STK, substituído pelo cartão de Aprovar emissão na 0.19 (e, na 0.22, sem apps) |
| `servicos.spec.js` › "antes do credenciamento" (e os seguintes) | Usa os botões Pedir/Receber credenciamento da aba Serviço, que foram para o menu + na 0.19 |

**Ação pendente:** atualizar esses quatro pontos para as telas atuais (sem mudar o app). Até lá, rodar a suíte completa vai mostrar essas falhas.
