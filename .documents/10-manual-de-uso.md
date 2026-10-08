# 10 · Manual de Uso

> Passo a passo nas telas, versão **0.24.0**. Serve para uso e para a homologação ([12](12-homologacao.md)).
> Os pacotes passam de um app para o outro **copiando e colando** (WhatsApp, e-mail ou na mesma tela).

## Links

| App | Endereço |
|---|---|
| Carteira | https://celsoalmeidalf.github.io/identidade-systekna/carteira-systekna.html |
| Governança (STK) | https://celsoalmeidalf.github.io/identidade-systekna/governanca-systekna.html |
| Serviços | https://celsoalmeidalf.github.io/identidade-systekna/servicos-systekna.html |

Confira a versão no rodapé de cada app. Se aparecer uma versão anterior, feche e abra o app de novo.

## 0. Primeiro uso (cada app)

1. **Criar** (gera 12 palavras novas) ou **Recuperar** com as 12 palavras ou com o **código de recuperação** (STK1-…).
2. Anote as 12 palavras **em papel**, na ordem. Opcional: toque em **Salvar PDF de recuperação** para baixar o PDF com o QR code, o código e as palavras. Toque em **Já anotei** e confirme as 3 palavras pedidas.
3. Crie o **PIN** de 6 dígitos (sem sequências nem repetições) e repita.
4. Opcional: Ajustes → **Desbloqueio por biometria**.

> Use **12 palavras diferentes** em cada app (Carteira, Governança, Serviços). Mesmo com as mesmas palavras, cada app gera um DID próprio, mas separar as palavras protege mais. Cada app tem o próprio código e o próprio PDF.

## 1. Identidade da pessoa (Carteira ↔ STK)

| Passo | Onde | O que fazer |
|---|---|---|
| 1 | Carteira → **+** → Solicitar aprovação de identidade | Escolha a identidade ou **+ Nova identidade** (nome, perfil e, na Personalizada, o nome do perfil). Toque em **Assinar pedido** e **Copiar pedido** |
| 2 | STK → **Aprovar** | Cole o pedido e toque em **Conferir pedido**. O cartão mostra nome, perfil e DID |
| 3 | STK | Escolha a validade e toque em **Aprovar identidade** e **Copiar**. Ou **Recusar pedido** com motivo (fica só no livro) |
| 4 | Carteira → **+** → Receber aprovação de identidade | Cole. Aparece o cartão: perfil · nome · did:key · Governança + validade |

## 2. Aprovação do serviço (Serviços ↔ STK)

| Passo | Onde | O que fazer |
|---|---|---|
| 1 | Serviços → **+** → Solicitar aprovação de emissão | Na 1ª vez, cole o DID da STK (STK → aba Governança → DID). Informe o **nome do serviço**. **Assinar pedido** e **Copiar**. O pedido não leva apps |
| 2 | STK → **Aprovar** | Cole e confira. O cartão mostra o serviço e o DID, sem lista de apps (se já aprovado, avisa que aprovar de novo renova) |
| 3 | STK | Escolha a validade e toque em **Aprovar emissão** e **Copiar**. Ou **Recusar pedido** |
| 4 | Serviços → **+** → Receber aprovação de emissão | Cole. O serviço fica aprovado |

## 3. Apps e funcionalidades do serviço (Serviços)

| Passo | Onde | O que fazer |
|---|---|---|
| 1 | Serviços → aba **Serviço** → Apps → **Novo app** | Informe o nome do app (aplicativo, serviço ou ferramenta). A Governança não precisa aprovar |
| 2 | Serviço → Apps → toque no app | Em **Funcionalidade**, informe o nome; o **código** se preenche sozinho (pode trocar) e não muda depois. Escolha o **tipo** (módulo, micro-serviço ou ferramenta) e toque em **Adicionar funcionalidade** |
| 3 | Mesma tela | Em **Grupo**, dê um nome, marque as funcionalidades e toque em **Criar grupo**. O grupo é só um atalho para liberar várias de uma vez |
| — | Mesma tela | Para tirar uma funcionalidade ou um grupo, toque no **−** ao lado. Crachás já emitidos continuam até vencer |

## 4. Acesso a um app (Carteira ↔ Serviços)

| Passo | Onde | O que fazer |
|---|---|---|
| 1 | Serviços → **+** → Cartão do serviço (todos os apps) **ou** Painel → toque no cartão de um app (**Cartão do app**) | Copie o cartão e envie à pessoa |
| 2 | Carteira → **+** → Solicitar acesso a um app | Cole o cartão e toque em **Ler cartão**. Cada app mostra as funcionalidades e os grupos. Marque o(s) app(s) (no Cartão do app ele já vem marcado), escolha a identidade aprovada, **Assinar pedido** e **Copiar**. Em Credenciais aparece "Acesso a … · Aguardando" |
| 3 | Serviços → **Crachás** | Cole o pedido e toque em **Conferir pedido**. O cartão de análise mostra nome, identidade, DID, os apps e, em cada um, os grupos e as funcionalidades, **todas marcadas** |
| 4 | Serviços | Desmarque o que a pessoa não pode usar (tocar num grupo marca ou desmarca as funcionalidades dele). **Aprovar acesso** (um crachá por app, com as funcionalidades liberadas; copie) ou **Recusar pedido** com motivo (copie a recusa assinada) |
| 5 | Carteira → **+** → Receber crachá de acesso | Cole. Crachá: aparece o cartão verde **CRACHÁ: APP …** com a **cv:key**. Recusa: o pedido fica "Recusado: motivo" |

## 5. Usar o acesso (portaria)

| Passo | Onde | O que fazer |
|---|---|---|
| 1 | Serviços → **Portaria** | Escolha o app e, em **Funcionalidade**, "Só a entrada no app" ou uma funcionalidade. Toque em **Gerar desafio**; copie |
| 2 | Carteira → **Apresentar** (rodapé) | Cole o desafio, **Ler desafio**, escolha o crachá e **Assinar e apresentar**; copie |
| 3 | Serviços → Portaria | Cole a prova e toque em **Conferir acesso**: **Acesso liberado** ou **Acesso negado** com o motivo (ex.: a funcionalidade não está no crachá) |

## 5A. Relatório de uso (Serviços)

| Passo | Onde | O que fazer |
|---|---|---|
| 1 | Serviços → **Painel** → Relatório de uso | Escolha **7 dias** ou **30 dias** e, se quiser, um **app** |
| 2 | | Veja os acessos **liberados** (verde) e **negados** (vermelho) por dia, as listas **Por app**, **Por funcionalidade** e **Por que negou**, e a **Gestão no período** (crachás emitidos, pedidos recusados, crachás revogados) |

## 6. Recuperar a conta (cada app)

| Passo | Onde | O que fazer |
|---|---|---|
| 1 | Ajustes → **Salvar PDF de recuperação** | Confirme com o PIN (ou a biometria) e toque em **Baixar PDF**. Imprima e apague o arquivo do aparelho, do e-mail e da nuvem |
| 2 | Boas-vindas → **Recuperar** (ou "Esqueci meu PIN") | Digite as 12 palavras **ou** o código STK1-… (maiúsculas ou minúsculas, com ou sem hífens). No Android, **Ler QR code** abre a câmera; no iPhone, leia o QR com a câmera do aparelho e cole o texto |
| 3 | | Toque em **Validar** e crie o PIN. A conta volta com o mesmo DID; os dados voltam pelo backup |

## 7. Outras tarefas

| Tarefa | Onde |
|---|---|
| Revogar um crachá | Serviços → aba Serviço → Crachás emitidos → toque no crachá → Revogar |
| Revogar uma identidade ou aprovação de emissão | STK → aba Governança → Credenciais emitidas → Revogar |
| Trocar a chave da STK | STK → aba Governança → **Trocar a chave**; depois **Copiar aviso de troca** e envie a quem confia |
| Importar a troca de chave da STK | Serviços → aba Serviço → Importar troca de chave · STK de terceiros → Emissores confiáveis → Importar troca de chave |
| Backup | Ajustes → Copiar backup cifrado / Restaurar backup |
| Conferir o livro | Painel → Ver livro completo → Conferir integridade |

## 8. Se algo der errado

| Mensagem | O que fazer |
|---|---|
| "Um token JWT tem três partes…" | O texto colado está incompleto: copie de novo |
| "O pacote diz X, mas o conteúdo é Y" | Colou o pacote no lugar errado ou ele foi alterado |
| "Este pedido já foi atendido / recusado" | Peça um pedido novo |
| "Este serviço não foi aprovado pela mesma Governança da sua identidade" | A identidade e o serviço foram aprovados por Governanças diferentes |
| "Este serviço ainda não tem apps" | O serviço precisa cadastrar os apps em Serviço › Apps e gerar o cartão de novo |
| "Libere ao menos uma funcionalidade de …" | Ao aprovar o acesso, marque ao menos uma funcionalidade do app |
| "O código não confere. Confira letra por letra." | Um caractere do código de recuperação está errado. O código não usa 0, 1, O nem I |
| "O código tem 32 letras e números depois de STK1…" | Faltou ou sobrou parte do código |
| Aviso de "derivação antiga" na STK ou no Serviços | App criado antes da 0.16.0: STK → Trocar a chave; Serviços → apagar e recuperar |
