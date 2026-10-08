# 12 · Homologação

> Versão em homologação: **0.20.0**. Marque cada item ao homologar.
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

## 2. Roteiro de homologação (0.20.0)

Siga o [Manual de uso](10-manual-de-uso.md). Para cada passo, anote ✔ ou o problema encontrado.

| # | Verificar | Resultado |
|---|---|---|
| R-01 | Criar Carteira, STK e Serviços com 12 palavras diferentes; versão 0.20.0 nos três | |
| R-02 | Criar 3 identidades (Identidade, Profissional, Personalizada: Clube) e pedir aprovação de cada | |
| R-03 | STK aprova duas e recusa uma; a recusada continua "aguardando" na carteira | |
| R-04 | Cartões de identidade com perfil, nome, did:key (copiar), Governança + validade, cores certas | |
| R-05 | Serviços pede aprovação de emissão de 4 apps; STK aprova 3 (desmarca 1) | |
| R-06 | Serviços pede depois só o app que faltou; o Painel mostra 4 cartões de app | |
| R-07 | Carteira lê o Cartão do serviço e pede acesso a 2 apps com a identidade Profissional | |
| R-08 | Serviços aprova um app e, num pedido novo, recusa o outro | |
| R-09 | Carteira recebe o crachá (cartão verde com cv:key) e a recusa ("Recusado: motivo") | |
| R-10 | Portaria: desafio do app do crachá → Apresentar → **Acesso liberado** | |
| R-11 | Portaria: desafio de outro app com o mesmo crachá → **Acesso negado** (App certo) | |
| R-12 | Serviços revoga o crachá → nova tentativa → **Acesso negado** (Não revogado) | |
| R-13 | Bloquear e desbloquear (PIN e biometria) nos 3 apps; dados continuam | |
| R-14 | Backup e restauração da carteira em outro aparelho: identidades e crachás voltam | |
| R-15 | Instalar os 3 apps no celular e abrir sem internet | |

## 3. Pontos conhecidos durante a homologação

| Ponto | Situação |
|---|---|
| Transporte por copiar e colar | Esperado (QR adiado) |
| Os apps das organizações (Câmbio etc.) não leem o crachá; a conferência é na Portaria | Esperado (próximo passo) |
| DID da STK informado à mão no Serviços | Esperado até existir a STK de produção |
| STK ou Serviços criados antes da 0.16.0 mostram aviso de derivação antiga | Esperado; para testar do zero, "Apagar tudo deste aparelho" |
| Testes automatizados antigos ainda usam telas substituídas | Ver [07](07-testes.md) §4 |
