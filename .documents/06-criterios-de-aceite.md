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

## 2. Aprovação de emissão (`emissao.spec.js`)

| CA | Critério |
|---|---|
| CA-20 | Rodapé do Serviços com o + no centro; menu com 3 ações |
| CA-21 | **Dado** um serviço sem Governança, **quando** solicita, **então** informa o DID da STK uma vez (o próprio DID é recusado), nome e apps (repetido recusado) e fica "Aguardando" |
| CA-22 | **Dado** o pedido, **quando** a STK confere, **então** vê o cartão com apps marcados; **quando** desmarca um e aprova, **então** a aprovação leva só os marcados |
| CA-23 | Sem nenhum app marcado a STK não aprova |
| CA-24 | O Painel mostra a organização e um cartão por app (App, did:key com copiar, aprovador + validade) |
| CA-25 | **Dado** um app aprovado, **quando** o serviço pede outro, **então** pede só o novo e as duas aprovações ficam ativas |
| CA-26 | A STK avisa quando um app do pedido já tem aprovação ativa |
| CA-27 | Recusa da STK fica no livro com o motivo; o serviço continua aguardando |
| CA-28 | O crachá de cada app leva a aprovação dele e nunca passa da validade dela; a portaria confere a aprovação do app |
| CA-29 | O Cartão do serviço leva todas as aprovações válidas; serviço da 0.18 vira uma aprovação |

## 3. Acesso a apps (`acesso.spec.js`)

| CA | Critério |
|---|---|
| CA-40 | O menu + da carteira tem as 5 ações |
| CA-41 | **Dado** o Cartão do serviço, **quando** a carteira lê, **então** mostra a organização, os apps aprovados e só as identidades aprovadas |
| CA-42 | Cartão alterado é recusado; cartão com apps de outra Governança é recusado; carteira sem identidade aprovada é avisada |
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
| CA-88 | Nenhuma tela mostra "cartório"; o banco antigo (`systekna-cartorio`) é mantido. Os redirecionamentos dos endereços antigos foram retirados em 03/10/2026 |
