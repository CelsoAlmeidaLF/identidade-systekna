# 12 · Homologação

> Versão em homologação: **0.27.0**. Marque cada item ao homologar.
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
| H-09 | Cartão do app (um app só, já marcado na carteira) | Serviços + Carteira | 0.21.0 | ⬜ Falta homologar |
| H-10 | Governança aprova só o serviço; Serviço › Apps › Funcionalidades e grupos; crachá com funcionalidades; portaria por funcionalidade | STK + Serviços + Carteira | 0.22.0 | ⬜ Falta homologar |
| H-11 | Pastas reorganizadas, sem mudança nas telas | Todos | 0.22.1 | ✅ Publicado e conferido no Pages |
| H-13 | Relatório de uso no Painel do Serviços (acessos e gestão do período) | Serviços | 0.24.0 | ⬜ Falta homologar |
| H-14 | Exportar o livro em PDF ou Excel, por período | STK + Serviços | 0.25.0 | ⬜ Falta homologar |
| H-15 | Cofre: senhas, anotações, cartões e contas bancárias | Carteira | 0.26.0 | ⬜ Falta homologar |
| H-16 | Documentos com foto ou PDF, aviso de vencimento; backup como arquivo | Carteira (backup: todos) | 0.27.0 | ⬜ Falta homologar |
| H-12 | Recuperação pelo código STK1-… ou pelas 12 palavras; PDF com QR code, código e palavras | Todos | 0.23.0 | ✅ Aprovado ("testei aqui! Está funcionando!") |

## 2. Roteiro de homologação (0.23.0)

Siga o [Manual de uso](10-manual-de-uso.md). Para cada passo, anote ✔ ou o problema encontrado.

| # | Verificar | Resultado |
|---|---|---|
| R-01 | Criar Carteira, STK e Serviços com 12 palavras diferentes; versão 0.23.0 nos três | |
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
| Transporte por copiar e colar | Esperado (QR entre os apps adiado; o QR existe só no PDF de recuperação) |
| PDF de recuperação é uma cópia completa da conta | Esperado e aceito: imprimir e apagar o arquivo |
| "Ler QR code" só aparece onde o navegador lê QR (Chrome do Android) | Esperado; no iPhone, ler com a câmera do aparelho e colar |
| Os apps das organizações (Câmbio etc.) não leem o crachá; a conferência é na Portaria | Esperado (próximo passo) |
| DID da STK informado à mão no Serviços | Esperado até existir a STK de produção |
| STK ou Serviços criados antes da 0.16.0 mostram aviso de derivação antiga | Esperado; para testar do zero, "Apagar tudo deste aparelho" |
| Testes automatizados antigos ainda usam telas substituídas | Ver [07](07-testes.md) §4 |
