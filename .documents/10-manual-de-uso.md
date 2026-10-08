# 10 · Manual de Uso

> Passo a passo nas telas, versão 0.20.0. Serve para uso e para a homologação ([12](12-homologacao.md)).
> Os pacotes passam de um app para o outro **copiando e colando** (WhatsApp, e-mail ou na mesma tela).

## Links

| App | Endereço |
|---|---|
| Carteira | https://celsoalmeidalf.github.io/identidade-systekna/carteira-systekna.html |
| Governança (STK) | https://celsoalmeidalf.github.io/identidade-systekna/governanca-systekna.html |
| Serviços | https://celsoalmeidalf.github.io/identidade-systekna/servicos-systekna.html |

Confira a versão no rodapé de cada app. Se aparecer uma versão anterior, feche e abra o app de novo.

## 0. Primeiro uso (cada app)

1. **Criar** (gera 12 palavras novas) ou **Recuperar com 12 palavras**.
2. Anote as 12 palavras **em papel**, na ordem. Confirme as 3 pedidas.
3. Crie o **PIN** de 6 dígitos (sem sequências nem repetições) e repita.
4. Opcional: Ajustes → **Desbloqueio por biometria**.

> Use **12 palavras diferentes** em cada app (Carteira, Governança, Serviços). Mesmo com as mesmas palavras, cada app gera um DID próprio, mas separar as palavras protege mais.

## 1. Identidade da pessoa (Carteira ↔ STK)

| Passo | Onde | O que fazer |
|---|---|---|
| 1 | Carteira → **+** → Solicitar aprovação de identidade | Escolha a identidade ou **+ Nova identidade** (nome, perfil e, na Personalizada, o nome do perfil). Toque em **Assinar pedido** e **Copiar pedido** |
| 2 | STK → **Aprovar** | Cole o pedido e toque em **Conferir pedido**. O cartão mostra nome, perfil e DID |
| 3 | STK | Escolha a validade e toque em **Aprovar identidade** e **Copiar**. Ou **Recusar pedido** com motivo (fica só no livro) |
| 4 | Carteira → **+** → Receber aprovação de identidade | Cole. Aparece o cartão: perfil · nome · did:key · Governança + validade |

## 2. Aprovação de emissão do serviço (Serviços ↔ STK)

| Passo | Onde | O que fazer |
|---|---|---|
| 1 | Serviços → **+** → Solicitar aprovação de emissão | Na 1ª vez, cole o DID da STK (STK → aba Governança → DID). Informe o nome da organização e adicione os apps. **Assinar pedido** e **Copiar** |
| 2 | STK → **Aprovar** | Cole e confira. O cartão mostra o serviço, o DID e os apps marcados (desmarque algum se quiser) |
| 3 | STK | Escolha a validade e toque em **Aprovar emissão** e **Copiar**. Ou **Recusar pedido** |
| 4 | Serviços → **+** → Receber aprovação de emissão | Cole. O Painel mostra a organização e um cartão por app |
| — | App novo depois | Solicite de novo, só com o app novo. As aprovações se somam |

## 3. Acesso a um app (Carteira ↔ Serviços)

| Passo | Onde | O que fazer |
|---|---|---|
| 1 | Serviços → **+** → Cartão do serviço | Copie o cartão e envie à pessoa |
| 2 | Carteira → **+** → Solicitar acesso a um app | Cole o cartão e toque em **Ler cartão**. Marque o(s) app(s), escolha a identidade aprovada, **Assinar pedido** e **Copiar**. Em Credenciais aparece "Acesso a … · Aguardando" |
| 3 | Serviços → **Crachás** | Cole o pedido e toque em **Conferir pedido**. O cartão de análise mostra nome, identidade, DID, apps e validade |
| 4 | Serviços | **Aprovar acesso** (gera um crachá por app; copie) ou **Recusar pedido** com motivo (gera a recusa assinada; copie) |
| 5 | Carteira → **+** → Receber crachá de acesso | Cole. Crachá: aparece o cartão verde **CRACHÁ: APP …** com a **cv:key**. Recusa: o pedido fica "Recusado: motivo" |

## 4. Usar o acesso (portaria)

| Passo | Onde | O que fazer |
|---|---|---|
| 1 | Serviços → **Portaria** | Escolha o app e toque em **Gerar desafio**; copie |
| 2 | Carteira → **Apresentar** (rodapé) | Cole o desafio, **Ler desafio**, escolha o crachá e **Assinar e apresentar**; copie |
| 3 | Serviços → Portaria | Cole a prova e toque em **Conferir acesso**: **Acesso liberado** ou **Acesso negado** com o motivo |

## 5. Outras tarefas

| Tarefa | Onde |
|---|---|
| Revogar um crachá | Serviços → aba Serviço → Crachás emitidos → toque no crachá → Revogar |
| Revogar uma identidade ou aprovação de emissão | STK → aba Governança → Credenciais emitidas → Revogar |
| Trocar a chave da STK | STK → aba Governança → **Trocar a chave**; depois **Copiar aviso de troca** e envie a quem confia |
| Importar a troca de chave da STK | Serviços → aba Serviço → Importar troca de chave · STK de terceiros → Emissores confiáveis → Importar troca de chave |
| Backup | Ajustes → Copiar backup cifrado / Restaurar backup |
| PDF de recuperação (0.23) | Ajustes → **Salvar PDF de recuperação** (pede o PIN) → Baixar PDF. Também na criação: tela das 12 palavras → **Salvar PDF de recuperação**. O PDF traz o QR code, o código STK1-… e as 12 palavras |
| Recuperar pelo código (0.23) | Recuperar → digite as 12 palavras **ou** o código STK1-… No Android, **Ler QR code** abre a câmera; no iPhone, leia o QR com a câmera do aparelho e cole o texto |
| Conferir o livro | Painel → Ver livro completo → Conferir integridade |

## 6. Se algo der errado

| Mensagem | O que fazer |
|---|---|
| "Um token JWT tem três partes…" | O texto colado está incompleto: copie de novo |
| "O pacote diz X, mas o conteúdo é Y" | Colou o pacote no lugar errado ou ele foi alterado |
| "Este pedido já foi atendido / recusado" | Peça um pedido novo |
| "Este serviço não tem apps aprovados pela mesma Governança da sua identidade" | A identidade e o serviço foram aprovados por Governanças diferentes |
| Aviso de "derivação antiga" na STK ou no Serviços | App criado antes da 0.16.0: STK → Trocar a chave; Serviços → apagar e recuperar |
