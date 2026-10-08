# 12 · Homologação

> Versão homologada: **1.0.0** (08/10/2026). Os 3 apps foram pré-aprovados pelo responsável nesta versão.
> "Aprovado nos primeiros testes" = o responsável aprovou na versão indicada; a homologação final continua.

## 1. Aprovado nos primeiros testes

| # | Funcionalidade | App | Versão | Situação |
|---|---|---|---|---|
| H-01 | PIN para desbloquear | Todos | 0.18.3 | ✅ Aprovado |
| H-02 | 12 palavras como semente das identidades | Carteira | 0.18.3 | ✅ Aprovado |
| H-03 | Várias identidades e perfis (Identidade, Profissional, Personalizada) | Carteira | 0.18.3 | ✅ Aprovado |
| H-04 | Solicitar e aprovar identidade | Carteira + STK | 0.18.3 | ✅ Aprovado |
| H-05 | Layout da carteira (cartões, cores por perfil, did:key com copiar, rodapé com + no centro) | Carteira | 0.18.3 | ✅ Aprovado |
| H-06 | Solicitar e aprovar emissão de crachás (aprovação parcial, várias aprovações) | Serviços + STK | 0.19.0 | ✅ Aprovado |
| H-07 | Painel do Serviços com um cartão por app sob a organização | Serviços | 0.19.1 | ✅ Aprovado |
| H-08 | Pedir acesso a um app, aprovar ou recusar, cartão do crachá com cv:key | Carteira + Serviços | 0.20.0 | ✅ Aprovado ("todas as funcionalidades dos 3 apps aparentemente aprovadas") |
| H-09 | Cartão do app (um app só, já marcado na carteira) | Serviços + Carteira | 0.21.0 | ✅ Pré-aprovado na 1.0.0 |
| H-10 | Governança aprova só o serviço; Serviço › Apps › Funcionalidades e grupos; crachá com funcionalidades; portaria por funcionalidade | STK + Serviços + Carteira | 0.22.0 | ✅ Pré-aprovado na 1.0.0 |
| H-11 | Pastas reorganizadas, sem mudança nas telas | Todos | 0.22.1 | ✅ Publicado e conferido no Pages |
| H-13 | Relatório de uso no Painel do Serviços (acessos e gestão do período) | Serviços | 0.24.0 | ✅ Pré-aprovado na 1.0.0 |
| H-14 | Exportar o livro em PDF ou Excel, por período | STK + Serviços | 0.25.0 | ✅ Pré-aprovado na 1.0.0 |
| H-15 | Cofre: senhas, anotações, cartões e contas bancárias | Carteira | 0.26.0 | ❌ Reprovado: "não gostei do modelo"; substituído pela 0.28 |
| H-16 | Documentos com foto ou PDF, aviso de vencimento; backup como arquivo | Carteira (backup: todos) | 0.27.0 | ❌ Documentos retirados na 0.28; backup como arquivo segue para homologar |
| H-17 | Cofre só com anotações; backup como arquivo | Carteira (backup: todos) | 0.28.0 | ✅ Aprovado ("testei, está funcionando!") |
| H-18 | Mensagens cifradas (cifrar e abrir); cofre de anotações guarda as mensagens cifradas | Carteira | 0.28.1 | ✅ Pré-aprovado na 1.0.0 |
| H-19 | Emissão de credenciais (Governança) e de crachás pelos serviços; os 3 apps completos | Todos | 1.0.0 | ✅ Pré-aprovado ("os 3 apps foram homologados") |
| H-20 | Fila de pedidos na Governança: receber vários de uma vez; Aguardando · Aprovados · Reprovados; identidades e serviços na mesma fila | STK | 1.1.0 | ⬜ Falta homologar |
| H-21 | Filas: pedidos e respostas sem copiar e colar (identidade, aprovação de emissão, crachá); diretório de Governanças e serviços | Todos | 1.2.0 | ⬜ Falta homologar |
| H-22 | Lista do Solicitar sem as identidades aprovadas, reprovadas ou aguardando; cartão Aguardando com Cancelar; pedido vencido; Governança antiga fora da lista | Carteira + STK | 1.2.1 | ⬜ Falta homologar |
| H-12 | Recuperação pelo código STK1-… ou pelas 12 palavras; PDF com QR code, código e palavras | Todos | 0.23.0 | ✅ Aprovado ("testei aqui! Está funcionando!") |

## 2. Roteiro de homologação (1.0.0)

Siga o [Manual de uso](10-manual-de-uso.md). Para cada passo, anote ✔ ou o problema encontrado.

| # | Verificar | Resultado |
|---|---|---|
| R-01 | Criar Carteira, STK e Serviços com 12 palavras diferentes; versão 1.0.0 nos três | |
| R-02 | Criar 3 identidades (Identidade, Profissional, Personalizada: Clube) e pedir aprovação de cada | |
| R-03 | STK aprova duas e recusa uma; a recusada continua "aguardando" na carteira | |
| R-04 | Cartões de identidade com perfil, nome, did:key (copiar), Governança + validade, cores certas | |
| R-05 | Serviços pede aprovação de emissão; a STK vê só o serviço (sem apps) e aprova | |
| R-06 | Serviços cadastra 2 apps em Serviço › Apps, com funcionalidades e um grupo; o Painel mostra um cartão por app | |
| R-07 | Carteira lê o Cartão do serviço (vê funcionalidades e grupos) e pede acesso a 2 apps com a identidade Profissional; com o Cartão do app, o app já vem marcado | |
| R-08 | Serviços aprova um app liberando só parte das funcionalidades (usando o grupo) e, num pedido novo, recusa o outro | |
| R-09 | Carteira recebe o crachá (cartão verde com cv:key) e a recusa ("Recusado: motivo") | |
| R-10 | Portaria: desafio do app do crachá (só a entrada) → Apresentar → **Acesso liberado** | |
| R-11 | Portaria: desafio de uma funcionalidade liberada → **Acesso liberado**; de uma não liberada → **Acesso negado** (Funcionalidade liberada) | |
| R-12 | Portaria: desafio de outro app com o mesmo crachá → **Acesso negado** (App certo) | |
| R-13 | Serviços revoga o crachá → nova tentativa → **Acesso negado** (Não revogado) | |
| R-14 | Bloquear e desbloquear (PIN e biometria) nos 3 apps; dados continuam | |
| R-15 | Backup e restauração da carteira em outro aparelho: identidades e crachás voltam | |
| R-16 | Instalar os 3 apps no celular e abrir sem internet | |
| R-17 | Em cada app: Ajustes → Salvar PDF de recuperação; o PDF tem QR, código, 12 palavras e DID; o QR é lido pela câmera | ✔ (0.23.0) |
| R-18 | Recuperar cada app pelo código (e, no Android, pelo QR): abre o mesmo DID | ✔ (0.23.0) |

## 3. Pontos conhecidos durante a homologação

| Ponto | Situação |
|---|---|
| Transporte | Pelas filas desde a 1.2; a portaria (desafio e prova) ainda por copiar e colar. Sem internet, nada é enviado nem recebido |
| Filas sem login | Esperado (prova de conceito, sem faturamento): dá para gravar lixo ou apagar itens, não para forjar nem ler |
| PDF de recuperação é uma cópia completa da conta | Esperado e aceito: imprimir e apagar o arquivo |
| "Ler QR code" só aparece onde o navegador lê QR (Chrome do Android) | Esperado; no iPhone, ler com a câmera do aparelho e colar |
| Os apps das organizações (Câmbio etc.) não leem o crachá; a conferência é na Portaria | Esperado (próximo passo) |
| Governança escolhida na lista do diretório | Esperado até existir a STK de produção (DID pré-carregado) |
| STK ou Serviços criados antes da 0.16.0 mostram aviso de derivação antiga | Esperado; para testar do zero, "Apagar tudo deste aparelho" |
| Revisão de criptografia (08/10/2026): a carteira ainda não fixa o DID da Governança nem confere o emissor do crachá; PIN de 6 dígitos protegido só por JavaScript; mensagens cifradas sem remetente | Conhecido; próximos passos em [11](11-decisoes-e-roteiro.md) §4 |
| Testes automatizados antigos ainda usam telas substituídas | Ver [07](07-testes.md) §4 |
