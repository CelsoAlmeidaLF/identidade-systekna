# 06 · Critérios de Aceite

> Formato Dado / Quando / Então. Cada grupo aponta o arquivo de teste que o cobre (em `<projeto>/tests/`; ver [07](07-testes.md)).

## 1. Identidades (`identidades.spec.js`)

| CA | Critério |
|---|---|
| CA-01 | O menu + tem as ações na ordem combinada; a aba Identidade não gerencia identidades |
| CA-02 | O rodapé tem 5 botões, com o + no centro; Apresentar abre o "Apresentar credencial" |
| CA-03 | **Dado** uma carteira nova, **quando** abre Solicitar, **então** a identidade nº 0 (DID de sempre) já está selecionada com perfil Identidade |
| CA-04 | **Dado** 12 palavras, **quando** cria identidades novas (inclusive 2 Profissionais e 1 Personalizada: Clube), **então** cada uma tem DID próprio e o mesmo número recria o mesmo DID |
| CA-05 | Personalizada exige o nome do perfil, que pode ser editado |
| CA-06 | **Dado** um pedido, **quando** a STK confere, **então** vê nome e perfil; **quando** aprova, **então** a aprovação leva só o nome e vale 1 ano; a carteira guarda na identidade certa |
| CA-07 | Cartão de identidade: perfil, nome, did:key (copiar sem abrir), emissora + validade; uma cor por perfil |
| CA-08 | Identidades continuam após bloquear e voltam pelo backup; as da 0.17.0 viram nome + perfil |

## 2. Aprovação de emissão e catálogo do serviço (`emissao.spec.js`, reescrito na 0.22)

| CA | Critério |
|---|---|
| CA-20 | Rodapé do Serviços com o + no centro; menu com 3 ações |
| CA-21 | **Dado** um serviço sem Governança, **quando** solicita, **então** informa o DID da STK uma vez (o próprio DID é recusado) e o nome do serviço; o pedido leva **só o serviço, sem apps**, e fica "Aguardando" |
| CA-22 | **Dado** o pedido, **quando** a STK confere, **então** vê o cartão do serviço **sem lista de apps**; **quando** aprova, **então** a aprovação leva só o serviço |
| CA-23 | ~~Sem nenhum app marcado a STK não aprova~~ (retirado na 0.22: a STK não vê apps) |
| CA-24 | O Painel mostra a organização e um cartão por app do catálogo (App, did:key com copiar, aprovador + validade) |
| CA-25 | **Dado** o serviço aprovado, **quando** cadastra em Serviço › Apps um app, funcionalidades (nome, código, tipo) e um grupo, **então** tudo aparece no app e vai para o livro |
| CA-26 | O **Cartão do app** leva só aquele app, com as funcionalidades, os grupos e a aprovação do serviço |
| CA-27 | Recusa da STK fica no livro com o motivo, que fala do serviço; o serviço continua aguardando |
| CA-28 | **Dado** um pedido de acesso, **quando** o serviço toca num grupo, **então** marca ou desmarca as funcionalidades dele; o crachá leva **só os códigos liberados**, sem grupo nem plano, e nunca passa da validade da aprovação do serviço |
| CA-29 | Portaria: desafio para uma funcionalidade liberada passa; para uma que não está no crachá é negado ("Funcionalidade liberada" falha) |
| CA-30 | Um serviço da 0.21 (apps aprovados pela Governança) vira catálogo sozinho, sem perder aprovações nem crachás |

## 3. Acesso a apps (`acesso.spec.js`)

| CA | Critério |
|---|---|
| CA-40 | O menu + da carteira tem as 5 ações |
| CA-41 | **Dado** o Cartão do serviço, **quando** a carteira lê, **então** mostra a organização, os apps do cartão com as funcionalidades e grupos, e só as identidades aprovadas |
| CA-41a | **Dado** o Cartão do app, **quando** a carteira lê, **então** mostra só aquele app, já marcado; Cartão do app alterado ou sem o app na lista é recusado |
| CA-42 | Cartão alterado é recusado; serviço aprovado por outra Governança é recusado; carteira sem identidade aprovada é avisada |
| CA-43 | O pedido sai assinado pela identidade escolhida, leva a aprovação dela e fica "Aguardando" |
| CA-44 | **Dado** o pedido, **quando** o Serviço confere, **então** vê o cartão de análise; **quando** aprova, **então** emite o crachá para o DID da identidade |
| CA-45 | A carteira recebe o crachá: cartão CRACHÁ: APP, organização, cv:key (copiar), identidade, validade; o pedido sai de "aguardando" |
| CA-46 | **Quando** o Serviço recusa, **então** gera a recusa assinada; a carteira mostra "Recusado: motivo"; o mesmo pedido não volta |
| CA-47 | **Dado** o crachá, **quando** a pessoa responde ao desafio da portaria, **então** "Acesso liberado" |

## 4. Governança (`governanca.spec.js`, `rotacao.spec.js`)

| CA | Critério |
|---|---|
| CA-60 | Pacotes saem no envelope do tipo certo; envelope trocado é recusado; JWT sem envelope ainda é aceito |
| CA-61 | Uma identidade ativa por DID: a nova revoga a anterior, no livro |
| CA-62 | A STK não credencia a si mesma e não atende pedido de crachá |
| CA-63 | Troca de chave: 12 palavras novas, PIN novo, livro íntegro com as duas chaves, credenciais antigas continuam válidas, aviso importável; aviso falso, alterado ou de quem não é confiável é recusado |

## 5. Base comum (`vetores-oficiais`, `seguranca`, `pwa`, `versao`, `biometria`, `fase1-correcoes`, `cobertura`, `dominio`, `dados-pessoais`, `criterios-de-aceite`, `nome-emissor`)

| CA | Critério |
|---|---|
| CA-80 | BIP39, HKDF, Ed25519, X25519, base58 e did:key conferem com os vetores oficiais; o DID de cada app confere com o Node |
| CA-81 | Nenhuma requisição externa; script injetado não roda; CSP com hash exato |
| CA-82 | Os 3 apps são instaláveis e abrem offline; a versão aparece nos 3 |
| CA-83 | PIN: tentativa gravada antes de conferir; espera no 5º erro; apaga no 10º; PIN fraco recusado |
| CA-84 | Biometria com PRF; "usar só biometria"; biometria recusada não gasta tentativa |
| CA-85 | As mesmas 12 palavras geram DIDs diferentes em cada app; apps antigos mantêm o DID |
| CA-86 | CPF, RG e afins são recusados em qualquer credencial |
| CA-87 | Backups: recusados em outra identidade; livro adulterado recusado |
| CA-88 | Nenhuma tela mostra "cartório"; o banco antigo (`systekna-cartorio`) é mantido. Os redirecionamentos dos endereços antigos foram retirados em 03/10/2026 (publicado na 0.22.1) |

## 5A. Relatório de uso (`stk-servicos/tests/uso.spec.js` e `emissao.spec.js`, 0.24)

| CA | Critério |
|---|---|
| CA-100 | **Dado** conferências na Portaria, **quando** abre o Painel, **então** vê liberados e negados por dia (7 e 30 dias), por app, por funcionalidade e os motivos de negação |
| CA-101 | As conferências antigas, só com o texto do livro, também entram, com "Motivo não registrado (antes da 0.24)"; o livro continua íntegro |
| CA-101a | O filtro por app muda os acessos; a gestão (emitidos, recusados, revogados) vale para o serviço todo |

## 5B. Exportar o livro (`compartilhado/tests/exportar-livro.spec.js`, 0.25)

| CA | Critério |
|---|---|
| CA-102 | **Quando** exporta o livro (com PIN) em PDF, **então** recebe várias páginas numeradas, a capa com o total e "Livro íntegro", e todos os atos |
| CA-102a | **Quando** exporta em Excel nos últimos 30 dias, **então** o .xlsx é um ZIP válido, todo XML é bem formado, a planilha tem só os atos do período e o Resumo traz a integridade |
| CA-103 | Livro adulterado sai no PDF como "NÃO CONFERE", com o ato onde a corrente se rompe |
| CA-103a | Intervalo sem datas é recusado; a Carteira não tem livro para exportar |

## 5C. Cofre (`stk-carteira/tests/cofre.spec.js`, 0.26)

| CA | Critério |
|---|---|
| CA-104 | Senha guardada fica cifrada no armazenamento, velada na tela e é copiada sem aparecer |
| CA-105 | Cartão com número errado ou validade fora de MM/AA é recusado; o certo mostra a bandeira e só o final; "Outro" não passa pela conferência |
| CA-105a | Conta bancária e anotação aparecem com o resumo; a busca não olha segredos; editar e apagar funcionam |
| CA-106 | Documento: anexo que não é foto nem PDF, ou maior que 2 MB, é recusado; validade antes da emissão é recusada; a foto aparece na tela e o anexo baixado é igual ao original |
| CA-106a | Documento perto de vencer (10 dias) e vencido (ontem) aparecem como aviso em Credenciais; tirar o anexo funciona |
| CA-107 | Backup com PDF anexo sai como arquivo (sem texto para copiar) e volta em outro aparelho pelo arquivo, com o anexo inteiro |
| CA-105b | Bloquear esconde o cofre; desbloquear traz de volta; o backup restaurado em outro aparelho traz todo o cofre |

## 6. Recuperação pelo código e PDF (`compartilhado/tests/recuperacao.spec.js`, 0.23)

| CA | Critério |
|---|---|
| CA-90 | Entropia → código → entropia volta igual, em português e em inglês; o código tem o formato `STK1-` + 8 blocos de 4 |
| CA-91 | O código é aceito em minúsculas, com espaços e sem o `STK1`; um caractere trocado é recusado ("não confere"), código curto é recusado (tamanho) e letra fora do alfabeto é recusada |
| CA-92 | O QR code gerado (versões 1 a 9) é lido de volta por um leitor independente (jsQR) |
| CA-93 | **Dado** um app aberto, **quando** salva o PDF em Ajustes (com PIN), **então** o PDF traz o QR (lido de volta = o código), o código, as 12 palavras numeradas, o DID e o título com o nome do app — nos 3 apps |
| CA-94 | **Dado** o código do PDF, **quando** outro aparelho recupera com ele, **então** abre a mesma conta, com o mesmo DID e as mesmas 12 palavras — nos 3 apps |
| CA-95 | **Na criação**, o PDF sai com as palavras da tela e o DID que a conta vai ter |
| CA-96 | Código errado na tela Recuperar mostra o motivo; sem leitor de QR no navegador, o botão Ler QR code não aparece |
| CA-97 | Com leitor de QR no navegador, Ler QR code lê o código e segue para criar o PIN, abrindo a conta certa |
