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
| `stk-governanca/tests/fila.spec.js` | Fila de pedidos da STK alimentada pela fila-solicitacao: Aguardando · Aprovados · Reprovados, vencido, bloqueio, resposta cifrada (1.1/1.2) |
| `compartilhado/tests/filas.spec.js` | Ciclo completo pelas filas nos 3 apps: identidade, aprovação de emissão, cartão no diretório, crachá e recusas (1.2); lista do Solicitar, cancelar, pedido vencido, Governança desativada (1.2.1) |
| `stk-servicos/tests/servicos.spec.js` | Recusas do serviço (1.2): aprovação de emissão falsa, de outro serviço, vencida ou repetida; pedido de crachá sem Identidade válida, repetido, vencido ou para outro serviço; um crachá ativo por app; portaria negando outro app, outro emissor, crachá revogado e prova reaproveitada |
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

## 3A. Firestore falso nos testes (1.2)

Os testes não usam o Firestore de verdade. `helpers.js` liga, em cada página preparada, um Firestore falso em memória (um por arquivo de teste) que responde à API REST (criar, gravar, ler, apagar, consulta por campo). `ultimoPedidoPara(page)` abre o último pedido enviado a quem tem a página; `buscarRespostas(page)` faz o mesmo que + › Buscar respostas; `receberPedido(gov, tok)` põe o pedido na fila da Governança, se ainda não está, e abre o cartão dele. As regras do Firestore foram conferidas no projeto real com `curl` (formato certo passa, lixo leva 403, `fila-emissao` não lista).

## 4. Situação da suíte completa (08/10/2026, código 1.2.1)

**231 passaram · 0 falharam · 1 pulado** (232 testes, ~12,5 min). As 4 falhas antigas (testes escritos para telas que mudaram depois deles) foram atualizadas para as telas atuais, sem mudar o app:

| Teste | O que mudou no teste |
|---|---|
| `identidades.spec.js` | Menu + com as quatro ações da 1.2; as identidades já enviadas saem da lista do Solicitar (1.2.1), então a nova Personalizada é criada como identidade nova e a aprovação usa o pedido guardado; o cartão é conferido na aba Credenciais |
| `dados-pessoais.spec.js` | Perfil padrão "Identidade"; o pedido Personalizado leva a chave de cifragem (`x`); a contagem do livro começa depois de receber o pedido (desde a 1.1, receber já é ato) |
| `governanca.spec.js` › aprovação de emissão | Cartão de Aprovar emissão, só o serviço (0.22); aprovar de novo renova |
| `servicos.spec.js` | Reescrito sobre as filas e Serviço › Apps (o caminho feliz já está em `emissao.spec.js`): ficaram as recusas de segurança — ver §2 |

Também ficou mais firme `filas.spec.js` › "crachá…": a busca automática (a cada 30 s) às vezes pegava o pedido antes do clique em Buscar; o teste confere a lista, não o aviso.

**Pulado (`test.fixme`):** `servicos.spec.js` › "a troca de chave da Governança é importada…". O botão Serviço › Governança › **Importar troca de chave** (`#sGovRot`) está sem ação desde a 0.22.0 — o handler saiu na reescrita do `app.js` do Serviços. O teste volta a valer quando o botão for religado.
