# 02 · Requisitos Funcionais

> Convenção: **RF-XX-nn** — `CM` comum aos 3 apps, `CT` Carteira, `GV` Governança, `SV` Serviços, `F` futuro.
> Situação: ✅ homologado pelo responsável (pré-aprovado na 1.0.0) · 🟢 com teste automatizado, ainda não homologado · 🟡 sem teste automatizado · ⬜ planejado · ⏸ adiado.
> Versão de referência: **1.2.2**.

## 1. Comuns aos 3 apps

| ID | Requisito | Sit. |
|---|---|---|
| RF-CM-01 | Criar a identidade do app com **12 palavras BIP39** (PT ou EN), veladas até "Mostrar palavras", e confirmar 3 delas | ✅ |
| RF-CM-02 | Recuperar pelas 12 palavras **ou pelo código de recuperação STK1-…** (o app reconhece qual foi digitado), explicando quantidade errada, palavra fora da lista, combinação inválida, código incompleto, letra que não existe no código ou código que não confere | ✅ (código: 0.23) |
| RF-CM-03 | **PIN de 6 dígitos**: recusa PIN fraco; espera crescente a partir do 5º erro; apaga tudo no 10º | ✅ |
| RF-CM-04 | Bloquear manualmente, por inatividade (1–30 min) e ao recarregar | ✅ |
| RF-CM-05 | **Biometria** (passkey com PRF), inclusive o modo "usar só biometria" | ✅ |
| RF-CM-06 | Ver as 12 palavras e trocar o PIN, com o PIN atual | ✅ |
| RF-CM-07 | **Backup cifrado** e restauração (só na mesma identidade e no mesmo app); desde a 0.27 também **baixar como arquivo** e **restaurar pelo arquivo**; backup grande (anexos) sai só como arquivo | ✅ (arquivo: ✅ 0.27) |
| RF-CM-08 | Apagar tudo do aparelho; tema claro/escuro; instalar no celular; funcionar offline | ✅ |
| RF-CM-09 | Mostrar a versão nas boas-vindas, no PIN e em Ajustes → Sobre | ✅ |
| RF-CM-10 | Todo pacote copiado sai no envelope `SYSTEKNA:<TIPO>:<JWT>`; tipo trocado é recusado | ✅ |
| RF-CM-11 | Cada app gera o **próprio DID** a partir das mesmas 12 palavras (separação de domínio) | ✅ |
| RF-CM-12 | **Código de recuperação** `STK1-XXXX-…` equivalente às 12 palavras: recupera a mesma conta, com o mesmo DID | ✅ (0.23) |
| RF-CM-13 | **PDF de recuperação**: QR code do código, o código, as 12 palavras numeradas, o DID, a data e o aviso de segurança. Em Ajustes (pede PIN ou biometria) e na tela das 12 palavras ao criar | ✅ (0.23) |
| RF-CM-15 | **Exportar o livro** (Governança e Serviços, 0.25): Ajustes → Exportar livro, pede o PIN; **PDF** (várias páginas, capa com DID, período, total e conferência de integridade) ou **Excel .xlsx** (planilhas Livro e Resumo); período: todo o livro, últimos 30 dias, este mês, mês passado ou intervalo de datas | ✅ |
| RF-CM-14 | **Ler QR code** na tela Recuperar, pela câmera, onde o navegador lê QR (Chrome do Android); nos outros, a câmera do aparelho lê e a pessoa cola o texto | ✅ (0.23) |

## 1A. Filas (1.2)

| ID | Requisito | Situação |
|---|---|---|
| RF-FL-01 | Pedidos (identidade, aprovação de emissão, crachá) vão pela **fila-solicitacao**, cifrados para a chave X25519 de quem atende | 🟢 (1.2) |
| RF-FL-02 | Respostas (aprovação, crachás, recusa) voltam pela **fila-emissao**, cifradas para a chave que veio no pedido; quem recebe apaga o item depois de ler | 🟢 (1.2) |
| RF-FL-03 | **Diretório**: a Governança e cada serviço publicam, assinados pela própria chave, o nome e a chave de cifragem (o serviço, também o cartão); a carteira e o serviço escolhem por ele | 🟢 (1.2) |
| RF-FL-04 | Busca ao abrir o app e a cada 30 segundos, enquanto desbloqueado; e pelo menu, na hora | 🟢 (1.2) |
| RF-FL-06 | Lista de Governanças com nome, DID curto e data; a publicada mais recentemente vem marcada. Governança que troca a chave ou apaga tudo se marca desativada (assinado pela chave que sai) e some da lista (1.2.1) | 🟢 (1.2.1) |
| RF-FL-05 | O copiar e colar sai dos três fluxos (identidade, aprovação de emissão, crachá); o Cartão do app colado dá lugar ao diretório | 🟢 (1.2) |

## 2. Carteira de Identidades Soberanas

### 2.1 Navegação

| ID | Requisito | Sit. |
|---|---|---|
| RF-CT-01 | Rodapé com 5 botões: **Credenciais · Identidade · ( + ) · Apresentar · Ajustes**, com o + no centro | ✅ |
| RF-CT-02 | Menu **+**: Solicitar aprovação de identidade, Solicitar acesso a um app, Buscar respostas, Apresentar credencial (1.2) | 🟢 (1.2) |
| RF-CT-03 | Aba Identidade: chaves públicas da identidade nº 0, documento DID e mensagens cifradas | ✅ |

### 2.2 Identidades

| ID | Requisito | Sit. |
|---|---|---|
| RF-CT-10 | **Várias identidades** das mesmas 12 palavras, cada uma com DID próprio (nº 0 é a de sempre) | ✅ |
| RF-CT-11 | Cada identidade tem **nome** e **perfil**: Identidade, Profissional ou Personalizada (com o nome do perfil editável, ex.: Clube) | ✅ |
| RF-CT-12 | Quantas quiser, inclusive várias do mesmo perfil | ✅ |
| RF-CT-13 | **Solicitar aprovação de identidade**: escolher uma identidade ou criar nova; o pedido sai assinado pelo DID dela, com nome e perfil | ✅ |
| RF-CT-17 | A lista do **Solicitar aprovação de identidade** mostra só quem ainda não foi validado: sem aprovação e pedido vencido, e + Nova identidade. Aprovadas (mesmo vencidas), reprovadas e aguardando ficam de fora (1.2.1) | 🟢 (1.2.1) |
| RF-CT-18 | Em Credenciais, cartão pontilhado da identidade **Aguardando** (com **Cancelar pedido**, que tira o pedido da fila), **Reprovada: motivo** ou **Pedido vencido** (com **Dispensar**, que só tira o aviso) (1.2.1) | 🟢 (1.2.1) |
| RF-CT-14 | **Receber aprovação de identidade** pela fila (1.2: sem colar): guarda na identidade certa pelo DID; só aceita da Governança a quem a identidade pediu; a recusa aparece como "reprovada: motivo" | 🟢 (1.2) |
| RF-CT-15 | Situação de cada identidade na lista: aprovada, aguardando, sem aprovação, aprovação vencida | ✅ |
| RF-CT-16 | Identidades criadas na 0.17.0 viram nome + perfil, com o mesmo DID | ✅ |

### 2.3 Cartões (tela Credenciais)

| ID | Requisito | Sit. |
|---|---|---|
| RF-CT-20 | **Cartão de identidade**: perfil · nome · did:key com copiar · emissora + validade | ✅ |
| RF-CT-21 | **Uma cor por perfil**: Identidade azul, Profissional roxo, Personalizada âmbar | ✅ |
| RF-CT-22 | **Cartão do crachá**: CRACHÁ: APP · organização · **cv:key** com copiar · identidade que usa · validade (verde) | ✅ |
| RF-CT-23 | Pedido de acesso em andamento ou recusado: cartão pontilhado "Acesso a … · Aguardando / Recusado: motivo" | ✅ |
| RF-CT-24 | Detalhe da credencial: afirmações, emissor, JWT, Apresentar, Remover | ✅ |

### 2.4 Acesso a apps

| ID | Requisito | Sit. |
|---|---|---|
| RF-CT-30 | **Solicitar acesso a um app**: ler o Cartão do serviço ou o **Cartão do app** (0.21, o app já vem marcado); conferir que o **serviço** foi aprovado pela mesma Governança da identidade (0.22); recusar cartão alterado | ✅ (0.21–0.22: ✅) |
| RF-CT-34 | Mostrar, em cada app do cartão, as **funcionalidades** e os **grupos** dele (0.22) | ✅ |
| RF-CT-31 | Escolher o(s) app(s) e a **identidade aprovada** que vai usar; o pedido leva a aprovação dela | ✅ |
| RF-CT-32 | **Receber crachá de acesso** pela fila (1.2): aceita o crachá (só do serviço a quem pediu) ou a recusa assinada | 🟢 (1.2) |
| RF-CT-33 | **Apresentar** (rodapé ou menu +): responde ao desafio com a credencial escolhida, assinando pelo DID dela | ✅ |

### 2.5 Outros

| ID | Requisito | Sit. |
|---|---|---|
| RF-CT-40 | Mensagens cifradas `smsg1` (cifrar e abrir); ao cifrar, o texto original sai da caixa (0.28.1) | ✅ |
| RF-CT-41 | Pedido endereçado a um DID de Governança (opcional) | ✅ |

### 2.6 Cofre de anotações (aba Identidade)

| ID | Requisito | Sit. |
|---|---|---|
| RF-CT-50 | **Cofre** na aba Identidade (o rodapé não muda): lista de anotações com contagem, busca e **Nova anotação** | ✅ (0.28) |
| RF-CT-51 | **Só anotações** (título e texto), cifradas no aparelho; ver, copiar o texto, editar e apagar com confirmação; a busca olha título e texto (0.28) | ✅ (0.28) |
| RF-CT-55 | O cofre vai no **backup cifrado** e volta ao restaurar | ✅ (0.28) |
| RF-CT-58 | ⏸ Senhas, cartões, contas bancárias e documentos com anexo (0.26 e 0.27) foram **retirados na 0.28** por decisão do PO; os itens já guardados ficam ocultos, sem ser apagados | ⏸ |

## 3. Governança Systekna (STK)

| ID | Requisito | Sit. |
|---|---|---|
| RF-GV-01 | Painel: **pedidos aguardando na fila** (toque abre a Fila, 1.1), credenciais ativas, revogadas, emissores confiáveis, verificações, últimos atos, integridade do livro | ✅ |
| RF-GV-02 | Livro completo com conferência de integridade (cada ato conferido com a chave da época) | ✅ |
| RF-GV-03 | Aba **Fila** (era Aprovar até a 1.0): os pedidos chegam pela **fila-solicitacao** (1.2), sozinhos ou por **Buscar pedidos agora**; cada um é conferido (assinatura, prazo, uso único, destinatário, já na fila, chave de resposta) e entra na fila; os que não entram mostram o motivo | 🟢 (1.2) |
| RF-GV-13 | **Fila única** de pedidos de identidade (did:key) e de serviço, com etiqueta **Identidade**, **Serviço** ou **Personalizada**; filtros **Aguardando · Aprovados · Reprovados** com contagem; cada cartão mostra nome, perfil, DID e quando chegou | 🟢 (1.1) |
| RF-GV-14 | Tocar num pedido **aguardando** abre o cartão de aprovação; num **aprovado**, mostra a aprovação para copiar de novo; pedido **vencido** na fila só pode ser reprovado | 🟢 (1.1) |
| RF-GV-15 | A fila fica **cifrada** com o estado da Governança: continua depois de bloquear e vai no backup; cada pedido recebido entra no livro | 🟢 (1.1) |
| RF-GV-04 | **Cartão de aprovação de identidade**: nome, perfil, DID, validade (padrão 1 ano), Aprovar identidade, Reprovar | ✅ |
| RF-GV-05 | **Cartão de aprovação de emissão**: serviço, DID, aviso de serviço já aprovado (aprovar de novo renova), validade, Aprovar emissão, Recusar. **Sem apps desde a 0.22**: os apps são do serviço | ✅ (0.22) |
| RF-GV-06 | Reprovação com motivo, **registrada no livro**; o pedido vai para Reprovados e não volta | ✅ |
| RF-GV-07 | Uma identidade ativa por DID (a nova substitui); **várias aprovações de emissão** ativas por serviço (a renovação soma uma nova) | ✅ |
| RF-GV-08 | Aba Verificar: desafio e conferência de apresentação em até 11 pontos | ✅ |
| RF-GV-09 | Governança: nome público, DID, emissores confiáveis, política de status não verificável, credenciais emitidas e revogação com motivo | ✅ |
| RF-GV-10 | **Trocar a chave**: 12 palavras novas, aviso de troca assinado pelas duas chaves; **importar troca** de outro emissor | ✅ |
| RF-GV-11 | Recusar pedido de crachá (é do serviço, não da STK) | ✅ |
| RF-GV-12 | Emissão de credencial Personalizada pelo formulário genérico | 🟡 (mantida, sem uso nos cenários) |

## 4. Serviços Systekna (SRV)

| ID | Requisito | Sit. |
|---|---|---|
| RF-SV-01 | Rodapé: **Painel · Crachás · ( + ) · Portaria · Serviço** | ✅ |
| RF-SV-02 | Menu **+**: Solicitar aprovação de emissão, Buscar respostas e pedidos, Cartão do serviço (publica no diretório) (1.2) | 🟢 (1.2) |
| RF-SV-13 | **Serviço › Apps** (0.22): cadastrar apps (aplicativo, serviço ou ferramenta); em cada um, **funcionalidades** (nome, código e tipo: módulo, micro-serviço ou ferramenta) e **grupos** de funcionalidades; tirar funcionalidade ou grupo; tudo no livro | ✅ |
| RF-SV-15 | **Relatório de uso** no Painel (0.24): 7 ou 30 dias, filtro por app; acessos liberados e negados por dia (barras), por app, por funcionalidade e por motivo de negação; gestão do período (crachás emitidos, pedidos recusados, crachás revogados) | ✅ |
| RF-SV-14 | **Cartão do app** (0.21): tocar no cartão de um app no Painel gera o cartão só daquele app; app sem aprovação válida avisa e não gera | ✅ |
| RF-SV-03 | **Solicitar aprovação de emissão**: nome do serviço; Governança informada uma vez; se já aprovado, pedir de novo renova. Sem apps desde a 0.22 | ✅ (0.22) |
| RF-SV-04 | **Receber aprovação de emissão** pela fila (1.2): confere a assinatura da Governança e guarda a aprovação; a recusa aparece no Painel | 🟢 (1.2) |
| RF-SV-05 | Painel: organização + "Ecossistema aprovado pela Governança Systekna" e **um cartão por app** do catálogo (App · did:key com copiar · aprovador + validade); pedidos aguardando | ✅ |
| RF-SV-06 | **Cartão do serviço** com os apps, o **catálogo** (funcionalidades e grupos) e a aprovação válida | ✅ (catálogo: ✅ 0.22) |
| RF-SV-07 | Aba **Crachás**: cartão de análise (nome, identidade, DID, apps marcáveis e, em cada app, os **grupos** como atalho e as **funcionalidades**, todas já marcadas; validade) | ✅ (funcionalidades: ✅ 0.22) |
| RF-SV-08 | **Aprovar acesso**: um crachá por app, com os **códigos das funcionalidades liberadas** (sem grupo nem plano); validade escolhida, limitada à aprovação do serviço; um crachá ativo por pessoa e app | ✅ (funcionalidades: ✅ 0.22) |
| RF-SV-09 | **Recusar pedido**: recusa assinada para o cliente, com motivo, e registrada no livro | ✅ |
| RF-SV-10 | **Portaria**: desafio para o app ou para **uma funcionalidade** (0.22); conferência em até 12 pontos (inclui "Funcionalidade liberada"); Acesso liberado ou negado, no livro | ✅ (funcionalidade: ✅) |
| RF-SV-11 | Aba Serviço: nome, DID, Governança (alterar, importar troca de chave), crachás emitidos e revogação | ✅ |
| RF-SV-12 | Serviço da 0.18 (credenciamento único) vira uma aprovação de emissão; serviço da 0.21 vira catálogo sozinho, sem perder aprovações nem crachás | ✅ |

## 5. Futuro

| ID | Requisito | Situação |
|---|---|---|
| RF-F-01 | DID da Governança de produção pré-carregado nos apps | ⬜ aguarda a STK de produção |
| RF-F-02 | Apps das organizações aceitarem o crachá direto ("Entrar com a carteira") | ⬜ |
| RF-F-03 | QR Code para os pacotes entre os apps | ⏸ substituído pelas filas na 1.2 (RF-FL); desafio e prova da portaria continuam por copiar e colar |
| RF-F-10 | Desafio e prova da portaria pelas filas | ⬜ |
| RF-F-11 | Login pelo DID nas filas (precisa do plano Blaze) | ⬜ adiado: sem faturamento |
| RF-F-08 | Senha no PDF de recuperação | ⬜ não pedido |
| RF-F-09 | Vários serviços por organização | ⬜ próximo passo combinado |
| RF-F-04 | Lista pública de revogação | ⬜ |
| RF-F-05 | Remover identidade da carteira | ⬜ não pedido |
| RF-F-06 | Cofre (senhas, notas, documentos) | ✅ só anotações (RF-CT-50 a 55); outros tipos retirados na 0.28 |
| RF-F-07 | Divulgação seletiva (SD-JWT), OpenID4VC, VC 2.0 | ⬜ |
