# 04 · Regras de Negócio

## 1. Princípios

- **A identidade define o usuário.** A Governança aprova identidades e serviços; cada serviço tem os seus apps e funcionalidades e dá acesso a eles.
- **As 12 palavras são a chave mestra** e ficam só com o dono. O código de recuperação STK1-… e o PDF de recuperação são outras formas de guardar a mesma chave. Ninguém recupera pelo dono, nem a Systekna.
- **Sem fé pública:** nenhum texto usa "cartório", "autenticar", "reconhecer firma" ou "lavrar".
- **Cada papel com a própria chave:** pessoa, Governança e cada serviço têm 12 palavras próprias.

## 2. Identidades (Carteira)

| ID | Regra |
|---|---|
| RN-01 | Todas as identidades saem da semente das 12 palavras; cada uma tem um número e um DID próprio. A nº 0 é a identidade de sempre (o DID não muda) |
| RN-02 | Cada identidade tem **nome** e **perfil**: Identidade, Profissional ou Personalizada (com o nome do perfil, ex.: Clube) |
| RN-03 | Pode haver quantas identidades a pessoa quiser, inclusive várias do mesmo perfil |
| RN-04 | Enquanto não aprovada, nome e perfil podem ser editados ao solicitar de novo; depois de aprovada, mudar exige aprovação nova |
| RN-05 | Um único PIN abre a carteira com todas as identidades |
| RN-06 | As identidades e as aprovações voltam pelo backup; com só as 12 palavras, os DIDs são recriáveis pelo número |

## 3. Aprovação de identidade (STK)

| ID | Regra |
|---|---|
| RN-10 | A STK só aprova pedido **assinado pelo DID** da identidade (prova de controle) |
| RN-11 | O pedido leva nome e perfil; vale 7 dias; é atendido ou recusado uma única vez |
| RN-12 | A aprovação leva **só o nome**; a validade é escolhida pela STK (30 dias, 1 ano — padrão —, 5 anos ou sem validade) |
| RN-13 | Uma identidade aprovada ativa por DID: aprovar de novo substitui a anterior (revogada no livro) |
| RN-14 | A recusa tem motivo e fica **só no livro** da STK; a carteira continua "aguardando" |

## 4. Aprovação de emissão (STK → Serviço)

| ID | Regra |
|---|---|
| RN-20 | O serviço só emite crachás com **aprovação de emissão válida do serviço** (0.22: a Governança aprova o serviço, não os apps) |
| RN-21 | O pedido leva só o nome do serviço; se o serviço já está aprovado, pedir de novo renova |
| RN-22 | ~~A STK pode desmarcar apps~~: deixou de existir na 0.22. Aprovações antigas que trazem apps valem para o serviço todo |
| RN-23 | **Várias aprovações podem ficar ativas** ao mesmo tempo; uma não revoga a outra; vale a de validade mais longa |
| RN-24 | A STK não aprova emissão para o próprio DID |
| RN-25 | A recusa tem motivo e fica no livro da STK; o serviço continua "aguardando" |
| RN-26 | A Governança é informada uma vez pelo serviço; trocar de Governança apaga as aprovações (com confirmação) |

## 4A. Apps e funcionalidades do serviço (0.22)

| ID | Regra |
|---|---|
| RN-27 | **Serviço › Apps › Funcionalidades**: o serviço (a organização ou o desenvolvedor) cadastra os apps (aplicativo, serviço ou ferramenta) e, em cada um, as funcionalidades (módulo, micro-serviço ou ferramenta). A Governança não aprova apps nem funcionalidades |
| RN-28 | Cada funcionalidade tem nome e **código**; o código é único no app, é o que vai no crachá e não muda |
| RN-29 | **Grupo** é só um atalho para marcar várias funcionalidades de uma vez ao aprovar um acesso. Grupo e plano **não** vão no crachá |
| RN-29a | Tirar uma funcionalidade a tira do app e dos grupos; crachás já emitidos continuam com ela até vencer ou ser trocados |
| RN-29b | O Cartão do serviço e o Cartão do app levam o catálogo (funcionalidades e grupos), assinado pelo serviço |

## 5. Acesso a apps e crachás (Serviço → Carteira)

| ID | Regra |
|---|---|
| RN-30 | A pessoa só pede acesso com **identidade aprovada**, e só a serviços aprovados pela **mesma Governança** que aprovou a identidade. Só aparecem os apps que o serviço pôs no cartão (o Cartão do app traz um só, já marcado) |
| RN-31 | O pedido sai assinado pela identidade escolhida e leva a aprovação dela; vale 7 dias e uso único |
| RN-32 | O serviço confere sozinho, sem consultar a STK: a identidade foi aprovada pela Governança dele, é da mesma pessoa, está válida |
| RN-33 | **Aprovar acesso:** um crachá (CV:KEY) por app marcado. As funcionalidades vêm **todas liberadas**; o serviço desmarca o que a pessoa não pode usar. App com funcionalidades precisa de ao menos uma marcada; app sem funcionalidades dá só a entrada no app |
| RN-34 | A validade do crachá é escolhida pelo serviço e **nunca passa a da aprovação de emissão do serviço** |
| RN-35 | O crachá leva dentro a aprovação de emissão do serviço, como prova, e os **códigos das funcionalidades liberadas** |
| RN-36 | Um crachá ativo por pessoa e app: o novo revoga o anterior |
| RN-37 | **Recusar pedido:** recusa **assinada** para o cliente, com motivo (Não é cliente, Dados não conferem, App não disponível, Outro), e registrada no livro; o pedido recusado não volta |
| RN-38 | O serviço pode revogar um crachá emitido, com motivo |

## 6. Uso (portaria)

| ID | Regra |
|---|---|
| RN-40 | Credencial sozinha não é prova: só vale a resposta assinada a um desafio novo |
| RN-41 | O desafio vale 10 minutos e uma única vez; a prova vale 5 minutos e é dirigida a quem desafiou |
| RN-42 | A portaria só libera se **todos** os pontos passarem: dono do crachá, desafio desta portaria, prazos, emitido por este serviço, app certo, funcionalidade liberada (quando o desafio é de uma funcionalidade), não revogado, validade, aprovação de emissão do serviço vigente |
| RN-44 | O desafio pode ser para **só a entrada no app** ou para **uma funcionalidade** do app (0.22) |
| RN-43 | Toda conferência (liberada ou negada) vai para o livro do serviço e, desde a 0.24, também para o registro do relatório de uso (app, funcionalidade, primeiro ponto que falhou) |
| RN-45 | O relatório de uso lê as conferências antigas do texto do livro, sem o motivo ("motivo não registrado"); a gestão do período vale para o serviço todo, mesmo com filtro de app |

## 7. Livro, revogação e confiança

| ID | Regra |
|---|---|
| RN-50 | O livro é somente acréscimo: cada ato referencia o hash do anterior e é assinado |
| RN-51 | Aprovação, recusa, revogação, mudança de confiança, de nome, de política e troca de chave são atos do livro |
| RN-52 | A revogação é irreversível e tem motivo; só quem revogou a enxerga |
| RN-53 | A troca de chave da STK gera um aviso assinado pela chave antiga e aceito pela nova; quem confia na antiga importa o aviso. Identidades e aprovações da chave antiga continuam valendo |

## 8. Acesso local

| ID | Regra |
|---|---|
| RN-60 | PIN de 6 dígitos, sem repetições nem sequências |
| RN-61 | Espera a partir do 5º erro; o 10º erro apaga os dados do aparelho |
| RN-62 | Biometria opcional, só com PRF; "usar só biometria" apaga o PIN |
| RN-63 | Recarregar sempre bloqueia; bloqueio automático configurável |
| RN-64 | O backup só abre com as 12 palavras da mesma identidade e no mesmo app |

## 8A. Recuperação (0.23)

| ID | Regra |
|---|---|
| RN-65 | A conta de cada app se recupera pelas **12 palavras** ou pelo **código de recuperação** `STK1-…`; os dois levam à mesma conta e ao mesmo DID |
| RN-66 | O código leva o idioma das palavras e uma conferência: com um caractere errado, é recusado e nada é aberto |
| RN-67 | Cada app tem as próprias 12 palavras, logo o próprio código e o próprio PDF |
| RN-68 | O **PDF de recuperação** traz o QR code do código, o código, as 12 palavras, o DID e o aviso "quem tiver este arquivo controla esta conta". Nos Ajustes, só sai depois do PIN ou da biometria; na criação, sai da tela das 12 palavras |
| RN-69 | A orientação é imprimir o PDF, guardar em lugar seguro e apagar o arquivo do aparelho, do e-mail e da nuvem |

## 9. Dados pessoais

| ID | Regra |
|---|---|
| RN-70 | Nenhuma credencial, livro ou registro leva CPF, RG, CNH, foto, endereço, filiação e afins |
| RN-71 | A identidade leva só o nome; o crachá, só serviço, app e os códigos das funcionalidades liberadas |
| RN-72 | O ambiente publicado é só para demonstração: sem identidades reais nem dados de clientes |
